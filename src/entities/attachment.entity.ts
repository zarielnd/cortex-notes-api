import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Note } from './note.entity';
import { User } from './user.entity';

export enum AttachmentType {
  IMAGE = 'image',
  FILE = 'file',
  VIDEO = 'video',
}

@Entity('attachments')
export class Attachment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'note_id' })
  noteId: string;

  @Column({ name: 'uploaded_by' })
  uploadedBy: string;

  @Column({ length: 255 })
  originalName: string;

  @Column({ length: 255 })
  mimeType: string;

  @Column({ type: 'nvarchar', length: 'max' })
  s3Key: string;

  @Column({ type: 'nvarchar', length: 'max' })
  s3Url: string;

  @Column({ type: 'bigint' })
  sizeBytes: number;

  @Column({
    type: 'nvarchar',
    length: 20,
    default: AttachmentType.FILE,
  })
  type: AttachmentType;

  @ManyToOne(() => Note, (note) => note.attachments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'note_id' })
  note: Note;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'uploaded_by', referencedColumnName: 'id' })
  uploader: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}