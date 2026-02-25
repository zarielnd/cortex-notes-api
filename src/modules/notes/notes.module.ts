import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotesController } from './notes.controller';
import { NotesService } from './notes.service';
import { AttachmentsModule } from '../attachments/attachments.module';
import { Note } from 'src/entities/note.entity';
import { NoteVersion } from 'src/entities/note-version.entity';
import { SelectionMember } from 'src/entities/selection-member.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Note, NoteVersion, SelectionMember]),
    AttachmentsModule,
  ],
  controllers: [NotesController],
  providers: [NotesService],
  exports: [NotesService],
})
export class NotesModule {}