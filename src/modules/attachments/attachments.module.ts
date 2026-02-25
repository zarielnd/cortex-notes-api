import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttachmentsService } from './attachments.service';
import { StorageModule } from '../storage/storage.module';
import { Attachment } from 'src/entities/attachment.entity';
import { Note } from 'src/entities/note.entity';
import { SelectionMember } from 'src/entities/selection-member.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Attachment, Note, SelectionMember]),
    StorageModule,
  ],
  providers: [AttachmentsService],
  exports: [AttachmentsService],
})
export class AttachmentsModule {}
