import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn } from 'typeorm';
import { UsersEntity } from '../users/users.entity';

export enum BonusSource {
  PURCHASE = 'purchase',
  BIRTHDAY = 'birthday',
  REFUND = 'refund',
  SPENT = 'spent',
  ADMIN = 'admin',
}

@Entity('bonuses')
export class BonusEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount!: number;

  @Column({ type: 'enum', enum: BonusSource })
  source!: BonusSource;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt!: Date;

  @Column({ default: false })
  isExpired!: boolean;

  @ManyToOne(() => UsersEntity, (user) => user.bonuses, { onDelete: 'CASCADE' })
  user!: UsersEntity;

  @CreateDateColumn()
  createdAt!: Date;
}
