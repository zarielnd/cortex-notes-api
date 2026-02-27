import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Note } from './note.entity';
import { SelectionMember } from './selection-member.entity';
import { User } from './user.entity';

@Entity('selections')
export class Selection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ nullable: true, type: 'varchar', length: 1000 })
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
