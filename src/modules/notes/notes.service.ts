import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { NoteVersion } from 'src/entities/note-version.entity';
import { Note } from 'src/entities/note.entity';
import { SelectionMember } from 'src/entities/selection-member.entity';
import { User } from 'src/entities/user.entity';
import {
  Action,
  CaslAbilityFactory,
} from 'src/infrastructure/casl/casl-ability.factory';
import {
  RedisKeys,
  RedisTtl,
} from 'src/infrastructure/redis/redis-key.constant';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';

@Injectable()
export class NotesService {
  constructor(
    @InjectRepository(Note)
    private readonly noteRepository: Repository<Note>,
    @InjectRepository(NoteVersion)
    private readonly versionRepository: Repository<NoteVersion>,
    @InjectRepository(SelectionMember)
    private readonly memberRepository: Repository<SelectionMember>,
    private readonly caslAbilityFactory: CaslAbilityFactory,
    private readonly redisService: RedisService,
    private readonly dataSource: DataSource,
  ) {}

  private async invalidateNoteCache(id: string): Promise<void> {
    await this.redisService.del(RedisKeys.note(id));
  }

  private async getNoteCached(id: string): Promise<Note | null> {
    const cacheKey = RedisKeys.note(id);
    const cached = await this.redisService.get(cacheKey);
    if (cached) return JSON.parse(cached) as Note;

    const note = await this.noteRepository.findOne({
      where: { id },
      relations: ['creator', 'lastEditor', 'selection', 'attachments'],
    });

    if (note) {
      await this.redisService.set(
        cacheKey,
        JSON.stringify(note),
        RedisTtl.NOTE,
      );
    }

    return note;
  }

  async findBySelection(selectionId: string, user: User): Promise<Note[]> {
    const ability = await this.caslAbilityFactory.createForUserInSelection(
      user,
      selectionId,
    );

    if (!ability.can(Action.Read, Note)) {
      throw new ForbiddenException('No access to this selection');
    }

    return this.noteRepository.find({
      where: { selectionId },
      relations: ['creator', 'lastEditor', 'attachments'],
      order: { updatedAt: 'DESC' },
    });
  }

  async findOne(id: string, user: User): Promise<Note> {
    const note = await this.getNoteCached(id);
    if (!note) throw new NotFoundException('Note not found');

    const ability = await this.caslAbilityFactory.createForUserInSelection(
      user,
      note.selectionId,
    );

    if (!ability.can(Action.Read, note)) {
      throw new ForbiddenException('No access to this note');
    }

    return note;
  }

  async create(dto: CreateNoteDto, user: User): Promise<Note> {
    const ability = await this.caslAbilityFactory.createForUserInSelection(
      user,
      dto.selectionId,
    );

    if (!ability.can(Action.Create, Note)) {
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

    const ability = await this.caslAbilityFactory.createForUserInSelection(
      user,
      note.selectionId,
    );

    if (!ability.can(Action.Update, note)) {
      throw new ForbiddenException(
        'You need editor or owner access to update this note',
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const latestVersion = await this.versionRepository.findOne({
        where: { noteId: id },
        order: { versionNumber: 'DESC' },
      });

      const nextVersionNumber = (latestVersion?.versionNumber ?? 0) + 1;

      const version = manager.create(NoteVersion, {
        noteId: id,
        editedBy: user.id,
        title: dto.title ?? note.title,
        content: dto.content ?? note.content,
        versionNumber: nextVersionNumber,
        changeSummary: dto.changeSummary ?? `Version ${nextVersionNumber}`,
      });

      await manager.save(NoteVersion, version);

      if (dto.title !== undefined) note.title = dto.title;
      if (dto.content !== undefined) note.content = dto.content;
      note.lastEditedBy = user.id;

      await manager.save(Note, note);
      await this.invalidateNoteCache(id);

      return manager.findOneOrFail(Note, {
        where: { id },
        relations: ['creator', 'lastEditor'],
      });
    });
  }

  async remove(id: string, user: User): Promise<{ message: string }> {
    const note = await this.noteRepository.findOne({ where: { id } });
    if (!note) throw new NotFoundException('Note not found');

    const ability = await this.caslAbilityFactory.createForUserInSelection(
      user,
      note.selectionId,
    );

    // Fix 2 — CASL subject instance check: editor can delete their own note
    if (!ability.can(Action.Delete, note)) {
      throw new ForbiddenException(
        'You can only delete notes you created (editors) or all notes (owners/admins)',
      );
    }

    await this.noteRepository.softDelete(id);
    await this.invalidateNoteCache(id);

    return { message: 'Note deleted successfully' };
  }

  async getVersionHistory(id: string, user: User): Promise<NoteVersion[]> {
    const note = await this.noteRepository.findOne({ where: { id } });
    if (!note) throw new NotFoundException('Note not found');

    const ability = await this.caslAbilityFactory.createForUserInSelection(
      user,
      note.selectionId,
    );

    if (!ability.can(Action.Read, note)) {
      throw new ForbiddenException('No access to this note');
    }

    return this.versionRepository.find({
      where: { noteId: id },
      relations: ['editor'],
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

    const ability = await this.caslAbilityFactory.createForUserInSelection(
      user,
      note.selectionId,
    );

    if (!ability.can(Action.Read, note)) {
      throw new ForbiddenException('No access to this note');
    }

    const version = await this.versionRepository.findOne({
      where: { id: versionId, noteId },
      relations: ['editor'],
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

    const ability = await this.caslAbilityFactory.createForUserInSelection(
      user,
      note.selectionId,
    );

    if (!ability.can(Action.Update, note)) {
      throw new ForbiddenException(
        'You need editor or owner access to restore versions',
      );
    }

    const version = await this.versionRepository.findOne({
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
