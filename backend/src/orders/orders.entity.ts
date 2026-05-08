import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
} from 'typeorm';
import { UsersEntity } from '../users/users.entity';
import { OrderItemEntity } from './order-item.entity';

export enum OrderStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

@Entity('orders')
export class OrderEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  orderNumber!: string;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status!: OrderStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalAmount!: number;

  @Column()
  customerName!: string;

  @Column()
  customerPhone!: string;

  @Column()
  shippingAddress!: string;

  @ManyToOne(() => UsersEntity, { onDelete: 'CASCADE' })
  user!: UsersEntity;

  @OneToMany(() => OrderItemEntity, (item) => item.order, { cascade: true })
  items!: OrderItemEntity[];

  @CreateDateColumn()
  createdAt!: Date;
}
