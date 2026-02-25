import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Selection } from './selection.entity';
import { NoteVersion } from './note-version.entity';
import { Attachment } from './attachment.entity';

@Entity('notes')
export class Note {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 500 })
  title: string;

  @Column({ type: 'text', nullable: true })
  content: string;

  @Column({ name: 'selection_id' })
  selectionId: string;

  @Column({ name: 'created_by' })
  createdBy: string;

  @Column({ name: 'last_edited_by', nullable: true })
  lastEditedBy: string;

  @ManyToOne(() => Selection, (selection) => selection.notes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'selection_id' })
  selection: Selection;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by', referencedColumnName: 'id' })
  creator: User;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'last_edited_by', referencedColumnName: 'id' })
  lastEditor: User;

  @OneToMany(() => NoteVersion, (version) => version.note, {
    cascade: true,
  })
  versions: NoteVersion[];

  @OneToMany(() => Attachment, (attachment) => attachment.note)
  attachments: Attachment[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
