import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { NoteVersion } from 'src/entities/note-version.entity';
import { Note } from 'src/entities/note.entity';
import { SelectionMember } from 'src/entities/selection-member.entity';
import { User } from 'src/entities/user.entity';
import { DataSource, Repository } from 'typeorm';
import { SelectionMemberRole } from '../selections/enums/selection-member-role.enum';
import {
  canDeleteSelection,
  canEditSelection,
  canViewSelection,
} from '../selections/helpers/selection-policy.helper';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';

@Injectable()
export class NotesService {
  constructor(
    @InjectRepository(Note)
    private readonly noteRepository: Repository<Note>,
    @InjectRepository(NoteVersion)
    private readonly noteVersionRepository: Repository<NoteVersion>,
    @InjectRepository(SelectionMember)
    private readonly selectionMemberRepository: Repository<SelectionMember>,
    private readonly dataSource: DataSource,
  ) {}
  //Permissions helpers
  private isSystemAdmin(user: User): boolean {
    return user.roles.some((r) =>
      r.permissions.some((p) => p.name === 'all:manage'),
    );
  }

  private async getMemberContext(
    selectionId: string,
    user: User,
  ): Promise<{ role: SelectionMemberRole | null; isSystemAdmin: boolean }> {
    const member = await this.selectionMemberRepository.findOne({
      where: { selectionId, userId: user.id },
    });

    return {
      role: (member?.role ?? null) as SelectionMemberRole,
      isSystemAdmin: this.isSystemAdmin(user),
    };
  }
  // CRUD
  async findBySelection(selectionId: string, user: User): Promise<Note[]> {
    const ctx = await this.getMemberContext(selectionId, user);

    if (!canViewSelection(ctx)) {
      throw new ForbiddenException('No access to this selection');
    }

    return this.noteRepository.find({
      where: { selectionId },
      relations: { creator: true, lastEditor: true, attachments: true },
      order: { updatedAt: 'DESC' },
    });
  }

  async findOne(id: string, user: User): Promise<Note> {
    const note = await this.noteRepository
      .createQueryBuilder('note')
      .leftJoinAndSelect('note.creator', 'creator')
      .leftJoinAndSelect('note.lastEditor', 'lastEditor')
      .leftJoinAndSelect('note.selection', 'selection')
      .leftJoinAndSelect('note.attachments', 'attachments')
      .where('note.id = :id', { id })
      .getOne();

    if (!note) throw new NotFoundException('Note not found');

    const ctx = await this.getMemberContext(note.selectionId, user);

    if (!canViewSelection(ctx)) {
      throw new ForbiddenException('No access to this note');
    }

    return note;
  }

  async create(dto: CreateNoteDto, user: User): Promise<Note> {
    const ctx = await this.getMemberContext(dto.selectionId, user);

    if (!canEditSelection(ctx)) {
      throw new ForbiddenException(
        'You need editor or owner access to create notes',
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const note = manager.create(Note, {
        selectionId: dto.selectionId,
        title: dto.title,
        content: dto.content ?? '',
        createdBy: user.id,
        lastEditedBy: user.id,
      });

      const savedNote = await manager.save(Note, note);

      // Create initial version
      const version = manager.create(NoteVersion, {
        noteId: savedNote.id,
        editedBy: user.id,
        title: savedNote.title,
        content: savedNote.content,
        versionNumber: 1,
        changeSummary: 'Initial version',
      });

      await manager.save(NoteVersion, version);

      return manager.findOneOrFail(Note, {
        where: { id: savedNote.id },
        relations: ['creator', 'lastEditor'],
      });
    });
  }

  async update(id: string, dto: UpdateNoteDto, user: User): Promise<Note> {
    const note = await this.noteRepository.findOne({
      where: { id },
      relations: ['creator'],
    });

    if (!note) throw new NotFoundException('Note not found');

    const ctx = await this.getMemberContext(note.selectionId, user);

    if (!canEditSelection(ctx)) {
      throw new ForbiddenException(
        'You need editor or owner access to update notes',
      );
    }

    return this.dataSource.transaction(async (manager) => {
      // Snapshot current version before applying changes
      const latestVersion = await this.noteVersionRepository.findOne({
        where: { noteId: id },
        order: { versionNumber: 'DESC' },
      });

      const nextVersionNumber = (latestVersion?.versionNumber ?? 0) + 1;

      // Create version record for the CURRENT state (before update)
      const version = manager.create(NoteVersion, {
        noteId: id,
        editedBy: user.id,
        title: dto.title ?? note.title,
        content: dto.content ?? note.content,
        versionNumber: nextVersionNumber,
        changeSummary: dto.changeSummary ?? `Version ${nextVersionNumber}`,
      });

      await manager.save(NoteVersion, version);

      // Apply updates
      if (dto.title !== undefined) note.title = dto.title;
      if (dto.content !== undefined) note.content = dto.content;
      note.lastEditedBy = user.id;

      await manager.save(Note, note);

      return manager.findOneOrFail(Note, {
        where: { id },
        relations: ['creator', 'lastEditor'],
      });
    });
  }

  async remove(id: string, user: User): Promise<{ message: string }> {
    const note = await this.noteRepository.findOne({ where: { id } });

    if (!note) throw new NotFoundException('Note not found');

    const ctx = await this.getMemberContext(note.selectionId, user);

    if (!canDeleteSelection(ctx)) {
      throw new ForbiddenException('Only owners and admins can delete notes');
    }

    await this.noteRepository.softDelete(id);

    return { message: 'Note deleted successfully' };
  }
  // Version
  async getVersionHistory(id: string, user: User): Promise<NoteVersion[]> {
    const note = await this.noteRepository.findOne({ where: { id } });

    if (!note) throw new NotFoundException('Note not found');

    const ctx = await this.getMemberContext(note.selectionId, user);

    if (!canViewSelection(ctx)) {
      throw new ForbiddenException('No access to this note');
    }

    return this.noteVersionRepository.find({
      where: { noteId: id },
      relations: { editor: true },
      order: { versionNumber: 'DESC' },
    });
  }

  async getVersion(
    noteId: string,
    versionId: string,
    user: User,
  ): Promise<NoteVersion> {
    const note = await this.noteRepository.findOne({ where: { id: noteId } });

    if (!note) throw new NotFoundException('Note not found');

    const ctx = await this.getMemberContext(note.selectionId, user);

    if (!canViewSelection(ctx)) {
      throw new ForbiddenException('No access to this note');
    }

    const version = await this.noteVersionRepository.findOne({
      where: { id: versionId, noteId },
      relations: { editor: true },
    });

    if (!version) throw new NotFoundException('Version not found');

    return version;
  }

  async restoreVersion(
    noteId: string,
    versionId: string,
    user: User,
  ): Promise<Note> {
    const note = await this.noteRepository.findOne({ where: { id: noteId } });

    if (!note) throw new NotFoundException('Note not found');

    const ctx = await this.getMemberContext(note.selectionId, user);

    if (!canEditSelection(ctx)) {
      throw new ForbiddenException(
        'You need editor or owner access to restore versions',
      );
    }

    const version = await this.noteVersionRepository.findOne({
      where: { id: versionId, noteId },
    });

    if (!version) throw new NotFoundException('Version not found');

    return this.update(
      noteId,
      {
        title: version.title,
        content: version.content,
        changeSummary: `Restored from version ${version.versionNumber}`,
      },
      user,
    );
  }
}
