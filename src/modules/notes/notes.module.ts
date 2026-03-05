import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NoteVersion } from 'src/entities/note-version.entity';
import { Note } from 'src/entities/note.entity';
import { SelectionMember } from 'src/entities/selection-member.entity';
import { CaslModule } from 'src/infrastructure/casl/casl.module';
import { AttachmentsModule } from '../attachments/attachments.module';
import { NotesController } from './notes.controller';
import { NotesService } from './notes.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Note, NoteVersion, SelectionMember]),
    AttachmentsModule,
    CaslModule,
  ],
  controllers: [NotesController],
  providers: [NotesService],
  exports: [NotesService],
})
export class NotesModule {}
