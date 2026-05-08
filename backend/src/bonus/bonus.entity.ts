import { Entity, Column, PrimaryGeneratedColumn, OneToOne, JoinColumn } from 'typeorm';
import { UsersEntity } from '../users/users.entity';

@Entity('bonus_accounts')
export class BonusAccountEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'int', default: 0 })
  balance!: number;

  @OneToOne(() => UsersEntity, { onDelete: 'CASCADE' })
  @JoinColumn()
  user!: UsersEntity;
}
