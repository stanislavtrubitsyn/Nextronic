import { Entity, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn } from 'typeorm';
import { UsersEntity } from '../users/users.entity';
import { ProductsEntity } from './products.entity';

@Entity('viewed_products')
export class ViewedProductEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => UsersEntity, { onDelete: 'CASCADE' })
  user!: UsersEntity;

  @ManyToOne(() => ProductsEntity, { onDelete: 'CASCADE' })
  product!: ProductsEntity;

  @CreateDateColumn()
  viewedAt!: Date;
}
