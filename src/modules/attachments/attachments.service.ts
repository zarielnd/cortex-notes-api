import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Attachment, AttachmentType } from 'src/entities/attachment.entity';
import { Note } from 'src/entities/note.entity';
import { SelectionMember } from 'src/entities/selection-member.entity';
import { User } from 'src/entities/user.entity';
import { Repository } from 'typeorm';
import { SelectionMemberRole } from '../selections/enums/selection-member-role.enum';
import {
  canDeleteSelection,
  canEditSelection,
  canViewSelection,
} from '../selections/helpers/selection-policy.helper';
import {
  PresignedDownloadUrl,
  PresignedUploadUrl,
  StorageService,
} from '../storage/storage.service';
import { PresignUploadRequestDto } from './dto/presign-upload-request.dto';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
  'video/mp4',
  'video/webm',
]);

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

function resolveAttachmentType(mimeType: string): AttachmentType {
  if (mimeType.startsWith('image/')) return AttachmentType.IMAGE;
  if (mimeType.startsWith('video/')) return AttachmentType.VIDEO;
  return AttachmentType.FILE;
}

@Injectable()
export class AttachmentsService {
  constructor(
    @InjectRepository(Attachment)
    private readonly attachmentRepository: Repository<Attachment>,
    @InjectRepository(Note)
    private readonly noteRepository: Repository<Note>,
    @InjectRepository(SelectionMember)
    private readonly memberRepository: Repository<SelectionMember>,
    private readonly storageService: StorageService,
  ) {}

  private isSystemAdmin(user: User): boolean {
    return user.roles.some((r) =>
      r.permissions.some((p) => p.name === 'all:manage'),
    );
  }

  private async getMemberContext(
    selectionId: string,
    user: User,
  ): Promise<{ role: SelectionMemberRole | null; isSystemAdmin: boolean }> {
    const member = await this.memberRepository.findOne({
      where: { selectionId, userId: user.id },
    });

    return {
      role: (member?.role ?? null) as SelectionMemberRole | null,
      isSystemAdmin: this.isSystemAdmin(user),
    };
  }

  private async getNoteOrFail(noteId: string): Promise<Note> {
    const note = await this.noteRepository.findOne({
      where: { id: noteId },
    });

    if (!note) throw new NotFoundException('Note not found');

    return note;
  }

  async uploadToNote(
    noteId: string,
    files: Express.Multer.File[],
    user: User,
  ): Promise<Attachment[]> {
    const note = await this.getNoteOrFail(noteId);
    const ctx = await this.getMemberContext(note.selectionId, user);

    if (!canEditSelection(ctx)) {
      throw new ForbiddenException('Editor or owner access required to upload');
    }

    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    for (const file of files) {
      if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
        throw new BadRequestException(
          `File type "${file.mimetype}" is not allowed`,
        );
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        throw new BadRequestException(
          `File "${file.originalname}" exceeds 50MB limit`,
        );
      }
    }

    const uploaded: Attachment[] = [];

    for (const file of files) {
      const uploadResult = await this.storageService.uploadFile(
        file,
        `notes/${noteId}`,
      );

      const attachment = this.attachmentRepository.create({
        noteId,
        uploadedBy: user.id,
        originalName: uploadResult.originalName,
        mimeType: uploadResult.mimeType,
        s3Key: uploadResult.s3Key,
        s3Url: uploadResult.s3Url,
        sizeBytes: uploadResult.sizeBytes,
        type: resolveAttachmentType(uploadResult.mimeType),
      });

      uploaded.push(await this.attachmentRepository.save(attachment));
    }

    return uploaded;
  }

  async findByNote(noteId: string, user: User): Promise<Attachment[]> {
    const note = await this.getNoteOrFail(noteId);
    const ctx = await this.getMemberContext(note.selectionId, user);

    if (!canViewSelection(ctx)) {
      throw new ForbiddenException('No access to this note');
    }

    return this.attachmentRepository.find({
      where: { noteId },
      relations: ['uploader'],
      order: { createdAt: 'DESC' },
    });
  }

  async remove(
    noteId: string,
    attachmentId: string,
    user: User,
  ): Promise<{ message: string }> {
    const note = await this.getNoteOrFail(noteId);
    const ctx = await this.getMemberContext(note.selectionId, user);

    if (!canDeleteSelection(ctx)) {
      throw new ForbiddenException(
        'Only owners and admins can delete attachments',
      );
    }

    const attachment = await this.attachmentRepository.findOne({
      where: { id: attachmentId, noteId },
    });

    if (!attachment) throw new NotFoundException('Attachment not found');

    await this.storageService.deleteFile(attachment.s3Key);
    await this.attachmentRepository.softDelete(attachmentId);

    return { message: 'Attachment deleted successfully' };
  }
  /**
   *
   * @deprecated
   */
  async getPresignedUrl(
    noteId: string,
    attachmentId: string,
    user: User,
  ): Promise<{ url: string; expiresIn: number }> {
    const note = await this.getNoteOrFail(noteId);
    const ctx = await this.getMemberContext(note.selectionId, user);

    if (!canViewSelection(ctx)) {
      throw new ForbiddenException('No access to this note');
    }

    const attachment = await this.attachmentRepository.findOne({
      where: { id: attachmentId, noteId },
    });

    if (!attachment) throw new NotFoundException('Attachment not found');

    const expiresIn = 3600;
    const url = await this.storageService.getPresignedUrl(
      attachment.s3Key,
      expiresIn,
    );

    return { url, expiresIn };
  }
  async getPresignedUploadUrl(
    noteId: string,
    dto: PresignUploadRequestDto,
    user: User,
  ): Promise<PresignedUploadUrl> {
    const note = await this.getNoteOrFail(noteId);
    const ctx = await this.getMemberContext(note.selectionId, user);

    if (!canEditSelection(ctx)) {
      throw new ForbiddenException('Editor or owner access required to upload');
    }

    if (!ALLOWED_MIME_TYPES.has(dto.mimeType)) {
      throw new BadRequestException(
        `File type "${dto.mimeType}" is not allowed`,
      );
    }

    return this.storageService.getPresignedUploadUrl(
      `notes/${noteId}`,
      dto.originalName,
      dto.mimeType,
    );
  }
  async getPresignedDownloadUrl(
    noteId: string,
    attachmentId: string,
    user: User,
  ): Promise<PresignedDownloadUrl> {
    const note = await this.getNoteOrFail(noteId);
    const ctx = await this.getMemberContext(note.selectionId, user);

    if (!canViewSelection(ctx)) {
      throw new ForbiddenException('No access to this note');
    }

    const attachment = await this.attachmentRepository.findOne({
      where: { id: attachmentId, noteId },
    });

    if (!attachment) throw new NotFoundException('Attachment not found');

    return this.storageService.getPresignedDownloadUrl(attachment.s3Key);
  }
}
