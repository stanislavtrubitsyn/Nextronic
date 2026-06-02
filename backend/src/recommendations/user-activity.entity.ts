import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UsersEntity } from '../users/users.entity';
import { CategoriesEntity } from '../categories/categories.entity';
import { ProductsEntity } from '../products/products.entity';

export enum ActivityAction {
  VIEW = 'view',
  SEARCH = 'search',
  CATEGORY_VIEW = 'category_view',
  ADD_TO_CART = 'add_to_cart',
  WISHLIST = 'wishlist',
  COMPARE = 'compare',
  QUESTION = 'question',
  REPLY = 'reply',
  REVIEW = 'review',
  RATING = 'rating',
  ORDER = 'order',
}

@Entity('user_activities')
@Index(['user', 'createdAt'])
@Index(['category', 'createdAt'])
@Index(['product', 'createdAt'])
export class UserActivityEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => UsersEntity, { onDelete: 'CASCADE' })
  user!: UsersEntity;

  @ManyToOne(() => CategoriesEntity, { onDelete: 'SET NULL', nullable: true })
  category?: CategoriesEntity | null;

  @ManyToOne(() => ProductsEntity, { onDelete: 'SET NULL', nullable: true })
  product?: ProductsEntity | null;

  @Column({ type: 'enum', enum: ActivityAction })
  action!: ActivityAction;

  @Column({ type: 'int', default: 1 })
  weight!: number;

  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, unknown>;

  @CreateDateColumn()
  createdAt!: Date;
}
