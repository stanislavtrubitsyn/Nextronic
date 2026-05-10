import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn } from 'typeorm';
import { UsersEntity } from '../users/users.entity';

@Entity('notifications')
export class NotificationsEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  titleKey!: string;

  @Column()
  messageKey!: string;

  @Column({ type: 'jsonb', nullable: true })
  params!: any;

  @Column({ default: false })
  isRead!: boolean;

  @ManyToOne(() => UsersEntity, { onDelete: 'CASCADE' })
  user!: UsersEntity;

  @CreateDateColumn()
  createdAt!: Date;
}
