import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Note } from './note.entity';
import { User } from './user.entity';

@Entity('note_versions')
export class NoteVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'note_id' })
  noteId: string;

  @Column({ name: 'edited_by' })
  editedBy: string;

  @Column({ length: 500 })
  title: string;

  @Column({ type: 'text', nullable: true })
  content: string;

  @Column({ type: 'int' })
  versionNumber: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  changeSummary: string;

  @ManyToOne(() => Note, (note) => note.versions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'note_id' })
  note: Note;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'edited_by', referencedColumnName: 'id' })
  editor: User;

  @CreateDateColumn()
  createdAt: Date;
}
