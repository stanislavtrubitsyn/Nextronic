import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { OrderEntity } from './orders.entity';
import { ProductsEntity } from '../products/products.entity';

@Entity('order_items')
export class OrderItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'int' })
  quantity!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  priceAtPurchase!: number;

  @ManyToOne(() => OrderEntity, (order) => order.items, { onDelete: 'CASCADE' })
  order!: OrderEntity;

  @ManyToOne(() => ProductsEntity)
  product!: ProductsEntity;
}
