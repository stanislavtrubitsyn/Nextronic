import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UsersEntity } from '../users/users.entity';
import { ProductsEntity } from '../products/products.entity';

@Entity('cart_items')
export class CartEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'int', default: 1 })
  quantity!: number;

  @ManyToOne(() => UsersEntity, (user) => user.id, { onDelete: 'CASCADE' })
  user!: UsersEntity;

  @ManyToOne(() => ProductsEntity, (product) => product.id, { onDelete: 'CASCADE' })
  product!: ProductsEntity;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
