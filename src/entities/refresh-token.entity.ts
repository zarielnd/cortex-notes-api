import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'nvarchar', length: 500 })
  tokenHash: string;

  @Column({ type: 'nvarchar', length: 255 })
  @Index()
  jti: string; // JWT ID — unique per token

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ type: 'nvarchar', length: 255, nullable: true })
  userAgent: string;

  @Column({ type: 'nvarchar', length: 50, nullable: true })
  ipAddress: string;

  @Column({ type: 'datetime2' })
  expiresAt: Date;

  @Column({ default: false })
  isRevoked: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
