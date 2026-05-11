import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { UsersEntity } from '../users/users.entity';
import { CategoriesEntity } from '../categories/categories.entity';

export enum ActivityAction {
  VIEW = 'view',
  SEARCH = 'search',
  WISHLIST = 'wishlist',
  COMPARE = 'compare',
  REVIEW = 'review',
  ORDER = 'order',
}

@Entity('user_activities')
export class UserActivityEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => UsersEntity, { onDelete: 'CASCADE' })
  user!: UsersEntity;

  @ManyToOne(() => CategoriesEntity, { onDelete: 'CASCADE', nullable: true })
  category!: CategoriesEntity;

  @Column({ type: 'enum', enum: ActivityAction })
  action!: ActivityAction;

  @Column({ type: 'int', default: 1 })
  weight!: number;

  @CreateDateColumn()
  createdAt!: Date;
}
