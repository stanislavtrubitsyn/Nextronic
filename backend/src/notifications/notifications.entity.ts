import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn } from 'typeorm';
import { UsersEntity } from '../users/users.entity';

@Entity('notifications')
export class NotificationsEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  title!: string;

  @Column('text')
  message!: string;

  @Column({ default: false })
  isRead!: boolean;

  @ManyToOne(() => UsersEntity, { onDelete: 'CASCADE' })
  user!: UsersEntity;

  @CreateDateColumn()
  createdAt!: Date;
}
