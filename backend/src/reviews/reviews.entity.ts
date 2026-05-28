import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UsersEntity } from '../users/users.entity';
import { ProductsEntity } from '../products/products.entity';

export enum ReviewType {
  REVIEW = 'review',
  QUESTION = 'question',
  REPLY = 'reply',
}

@Entity('reviews')
export class ReviewsEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'enum', enum: ReviewType, default: ReviewType.REVIEW })
  type!: ReviewType;

  @Column({ type: 'int', nullable: true })
  rating?: number | null;

  @Column('text')
  comment!: string;

  @Column({ type: 'text', nullable: true })
  advantages?: string | null;

  @Column({ type: 'text', nullable: true })
  disadvantages?: string | null;

  @Column({ type: 'jsonb', default: [] })
  photos!: string[];

  @Column({ type: 'jsonb', default: [] })
  likedUserIds!: string[];

  @Column({ type: 'jsonb', default: [] })
  dislikedUserIds!: string[];

  @Column({ default: false })
  isVerifiedPurchase!: boolean;

  @ManyToOne(() => UsersEntity, { onDelete: 'CASCADE' })
  user!: UsersEntity;

  @ManyToOne(() => ProductsEntity, (product) => product.reviews, { onDelete: 'CASCADE' })
  product!: ProductsEntity;

  @ManyToOne(() => ReviewsEntity, (review) => review.replies, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  parent?: ReviewsEntity | null;

  @OneToMany(() => ReviewsEntity, (review) => review.parent)
  replies!: ReviewsEntity[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
