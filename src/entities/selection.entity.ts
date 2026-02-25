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
import { SelectionMember } from './selection-member.entity';
import { Note } from './note.entity';

@Entity('selections')
export class Selection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ nullable: true, type: 'nvarchar', length: 1000 })
  description: string;

  @Column({ name: 'created_by' })
  createdBy: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by', referencedColumnName: 'id' })
  creator: User;

  @OneToMany(() => SelectionMember, (member) => member.selection, {
    cascade: true,
  })
  members: SelectionMember[];

  @OneToMany(() => Note, (note) => note.selection)
  notes: Note[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
