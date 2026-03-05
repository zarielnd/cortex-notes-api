import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { Attachment, AttachmentType } from 'src/entities/attachment.entity';
import { Note } from 'src/entities/note.entity';
import { SelectionMember } from 'src/entities/selection-member.entity';
import { User } from 'src/entities/user.entity';
import {
  Action,
  CaslAbilityFactory,
} from 'src/infrastructure/casl/casl-ability.factory';
import { Repository } from 'typeorm';
import {
  PresignedDownloadUrl,
  PresignedUploadUrl,
  StorageService,
} from '../storage/storage.service';
import { DELETE_S3_OBJECT_JOB, STORAGE_QUEUE } from './attachments.constants';
import { ConfirmUploadDto } from './dto/confirm-upload.dto';
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

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

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
    @InjectQueue(STORAGE_QUEUE)
    private readonly storageQueue: Queue,
    private readonly storageService: StorageService,
    private readonly caslAbilityFactory: CaslAbilityFactory,
  ) {}

  private async getNoteOrFail(noteId: string): Promise<Note> {
    const note = await this.noteRepository.findOne({ where: { id: noteId } });
    if (!note) throw new NotFoundException('Note not found');
    return note;
  }

  // ─── Server-side upload (existing flow) ──────────────────────────────────────

  async uploadToNote(
    noteId: string,
    files: Express.Multer.File[],
    user: User,
  ): Promise<Attachment[]> {
    const note = await this.getNoteOrFail(noteId);
    const ability = await this.caslAbilityFactory.createForUserInSelection(
      user,
      note.selectionId,
    );

    if (!ability.can(Action.Create, Note)) {
      throw new ForbiddenException('Editor or owner access required to upload');
    }

    if (!files || files.length === 0)
      throw new BadRequestException('No files provided');

    for (const file of files) {
      if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
        throw new BadRequestException(
          `File type "${file.mimetype}" is not allowed`,
        );
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        throw new BadRequestException(
          `File "${file.originalname}" exceeds the 50 MB limit`,
        );
      }
    }

    const uploaded: Attachment[] = [];

    for (const file of files) {
      // Fix 17 — correct s3Key pattern: attachments/{selectionId}/{noteId}/{uuid}-{fileName}
      const result = await this.storageService.uploadFile(
        file,
        `attachments/${note.selectionId}/${noteId}`,
      );

      const attachment = this.attachmentRepository.create({
        noteId,
        uploadedBy: user.id,
        originalName: result.originalName,
        mimeType: result.mimeType,
        s3Key: result.s3Key,
        s3Url: result.s3Url,
        sizeBytes: result.sizeBytes,
        type: resolveAttachmentType(result.mimeType),
      });

      uploaded.push(await this.attachmentRepository.save(attachment));
    }

    return uploaded;
  }

  // ─── Fix 3 — Presigned upload URL ────────────────────────────────────────────

  async getPresignedUploadUrl(
    noteId: string,
    dto: PresignUploadRequestDto,
    user: User,
  ): Promise<PresignedUploadUrl> {
    const note = await this.getNoteOrFail(noteId);
    const ability = await this.caslAbilityFactory.createForUserInSelection(
      user,
      note.selectionId,
    );

    if (!ability.can(Action.Create, Note)) {
      throw new ForbiddenException('Editor or owner access required to upload');
    }

    if (!ALLOWED_MIME_TYPES.has(dto.mimeType)) {
      throw new BadRequestException(
        `File type "${dto.mimeType}" is not allowed`,
      );
    }

    // Fix 17 — correct s3Key pattern
    return this.storageService.getPresignedUploadUrl(
      `attachments/${note.selectionId}/${noteId}`,
      dto.originalName,
      dto.mimeType,
    );
  }

  // ─── Fix 3 — Confirm upload (create DB record after client PUT to S3) ────────

  async confirmUpload(
    noteId: string,
    dto: ConfirmUploadDto,
    user: User,
  ): Promise<Attachment> {
    const note = await this.getNoteOrFail(noteId);
    const ability = await this.caslAbilityFactory.createForUserInSelection(
      user,
      note.selectionId,
    );

    if (!ability.can(Action.Create, Note)) {
      throw new ForbiddenException('Editor or owner access required');
    }

    if (!ALLOWED_MIME_TYPES.has(dto.mimeType)) {
      throw new BadRequestException(
        `File type "${dto.mimeType}" is not allowed`,
      );
    }

    if (dto.sizeBytes > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException('File size exceeds the 50 MB limit');
    }

    // Ensure the s3Key is scoped to this note (prevent spoofing other keys)
    const expectedPrefix = `attachments/${note.selectionId}/${noteId}/`;
    if (!dto.s3Key.startsWith(expectedPrefix)) {
      throw new BadRequestException('Invalid s3Key for this note');
    }

    const s3Url = this.storageService.buildPublicUrl(dto.s3Key);

    const attachment = this.attachmentRepository.create({
      noteId,
      uploadedBy: user.id,
      originalName: dto.originalName,
      mimeType: dto.mimeType,
      s3Key: dto.s3Key,
      s3Url,
      sizeBytes: dto.sizeBytes,
      type: resolveAttachmentType(dto.mimeType),
    });

    return this.attachmentRepository.save(attachment);
  }

  // ─── Presigned download URL ───────────────────────────────────────────────────

  async getPresignedDownloadUrl(
    noteId: string,
    attachmentId: string,
    user: User,
  ): Promise<PresignedDownloadUrl> {
    const note = await this.getNoteOrFail(noteId);
    const ability = await this.caslAbilityFactory.createForUserInSelection(
      user,
      note.selectionId,
    );

    if (!ability.can(Action.Read, Note)) {
      throw new ForbiddenException('No access to this note');
    }

    const attachment = await this.attachmentRepository.findOne({
      where: { id: attachmentId, noteId },
    });

    if (!attachment) throw new NotFoundException('Attachment not found');

    return this.storageService.getPresignedDownloadUrl(attachment.s3Key);
  }

  // ─── List ─────────────────────────────────────────────────────────────────────

  async findByNote(noteId: string, user: User): Promise<Attachment[]> {
    const note = await this.getNoteOrFail(noteId);
    const ability = await this.caslAbilityFactory.createForUserInSelection(
      user,
      note.selectionId,
    );

    if (!ability.can(Action.Read, Note)) {
      throw new ForbiddenException('No access to this note');
    }

    return this.attachmentRepository.find({
      where: { noteId },
      relations: ['uploader'],
      order: { createdAt: 'DESC' },
    });
  }

  // ─── Fix 4 + Fix 6 — Delete: editors allowed, S3 deletion async via queue ────

  async remove(
    noteId: string,
    attachmentId: string,
    user: User,
  ): Promise<{ message: string }> {
    const note = await this.getNoteOrFail(noteId);
    const ability = await this.caslAbilityFactory.createForUserInSelection(
      user,
      note.selectionId,
    );

    // Fix 4 — editors CAN delete attachments (doc §6.1)
    if (!ability.can(Action.Update, Note)) {
      throw new ForbiddenException(
        'Editor or owner access required to delete attachments',
      );
    }

    const attachment = await this.attachmentRepository.findOne({
      where: { id: attachmentId, noteId },
    });

    if (!attachment) throw new NotFoundException('Attachment not found');

    // Soft-delete the DB record immediately
    await this.attachmentRepository.softDelete(attachmentId);

    // Fix 6 — enqueue async S3 deletion instead of awaiting it directly
    await this.storageQueue.add(
      DELETE_S3_OBJECT_JOB,
      { s3Key: attachment.s3Key },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    );

    return { message: 'Attachment deleted successfully' };
  }
}
