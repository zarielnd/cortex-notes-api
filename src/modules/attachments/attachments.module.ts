import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Attachment } from 'src/entities/attachment.entity';
import { Note } from 'src/entities/note.entity';
import { SelectionMember } from 'src/entities/selection-member.entity';
import { CaslModule } from 'src/infrastructure/casl/casl.module';
import { StorageModule } from '../storage/storage.module';
import { STORAGE_QUEUE } from './attachments.constants';
import { AttachmentsService } from './attachments.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Attachment, Note, SelectionMember]),
    BullModule.registerQueue({ name: STORAGE_QUEUE }),
    StorageModule,
    CaslModule,
  ],
  providers: [AttachmentsService],
  exports: [AttachmentsService],
})
export class AttachmentsModule {}
