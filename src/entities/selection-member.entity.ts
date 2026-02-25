import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Selection } from './selection.entity';
import { SelectionMemberRole } from 'src/modules/selections/enums/selection-member-role.enum';
import { User } from './user.entity';

@Entity('selection_members')
@Unique(['selectionId', 'userId'])
export class SelectionMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'selection_id' })
  selectionId: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({
    type: 'nvarchar',
    length: 20,
    default: SelectionMemberRole.VIEWER,
  })
  role: SelectionMemberRole;

  @ManyToOne(() => Selection, (selection) => selection.members, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'selection_id' })
  selection: Selection;

  @ManyToOne(() => User, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
