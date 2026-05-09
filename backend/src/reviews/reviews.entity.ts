import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Check,
} from 'typeorm';
import { UsersEntity } from '../users/users.entity';
import { ProductsEntity } from '../products/products.entity';

@Entity('reviews')
@Check(`"rating" >= 1 AND "rating" <= 5`)
export class ReviewsEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('int')
  rating!: number;

  @Column('text', { nullable: true })
  comment!: string;

  @ManyToOne(() => UsersEntity, { onDelete: 'CASCADE' })
  user!: UsersEntity;

  @ManyToOne(() => ProductsEntity, (product) => product.reviews, { onDelete: 'CASCADE' })
  product!: ProductsEntity;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
