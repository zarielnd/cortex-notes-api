import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { Attachment } from 'src/entities/attachment.entity';
import { NoteVersion } from 'src/entities/note-version.entity';
import { Note } from 'src/entities/note.entity';
import { User } from 'src/entities/user.entity';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AttachmentsService } from '../attachments/attachments.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { NotesService } from './notes.service';

@ApiBearerAuth()
@Controller('notes')
@UseGuards(JwtAuthGuard)
export class NotesController {
  constructor(
    private readonly notesService: NotesService,
    private readonly attachmentsService: AttachmentsService,
  ) {}

  @Get()
  findBySelection(
    @Query('selectionId', ParseUUIDPipe) selectionId: string,
    @CurrentUser() user: User,
  ): Promise<Note[]> {
    return this.notesService.findBySelection(selectionId, user);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<Note> {
    return this.notesService.findOne(id, user);
  }

  @Post()
  create(@Body() dto: CreateNoteDto, @CurrentUser() user: User): Promise<Note> {
    return this.notesService.create(dto, user);
  }

  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateNoteDto,
    @CurrentUser() user: User,
  ): Promise<Note> {
    return this.notesService.update(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<{ message: string }> {
    return this.notesService.remove(id, user);
  }

  // ─── Versioning ───────────────────────────────────────────────────────────

  @Get(':id/versions')
  getVersionHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<NoteVersion[]> {
    return this.notesService.getVersionHistory(id, user);
  }

  @Get(':id/versions/:versionId')
  getVersion(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @CurrentUser() user: User,
  ): Promise<NoteVersion> {
    return this.notesService.getVersion(id, versionId, user);
  }

  @Post(':id/versions/:versionId/restore')
  restoreVersion(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @CurrentUser() user: User,
  ): Promise<Note> {
    return this.notesService.restoreVersion(id, versionId, user);
  }

  // ─── Attachments ─────────────────────────────────────────────────────────

  @Post(':id/attachments')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  })
  @UseInterceptors(FilesInterceptor('files', 10, { storage: memoryStorage() }))
  uploadAttachments(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() user: User,
  ): Promise<Attachment[]> {
    return this.attachmentsService.uploadToNote(id, files, user);
  }

  @Get(':id/attachments')
  getAttachments(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<Attachment[]> {
    return this.attachmentsService.findByNote(id, user);
  }

  @Delete(':id/attachments/:attachmentId')
  @HttpCode(HttpStatus.OK)
  deleteAttachment(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
    @CurrentUser() user: User,
  ): Promise<{ message: string }> {
    return this.attachmentsService.remove(id, attachmentId, user);
  }

  @Get(':id/attachments/:attachmentId/presign')
  getPresignedUrl(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
    @CurrentUser() user: User,
  ): Promise<{ url: string; expiresIn: number }> {
    return this.attachmentsService.getPresignedUrl(id, attachmentId, user);
  }
}
