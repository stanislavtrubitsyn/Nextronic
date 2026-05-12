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

export enum PaymentMethod {
  CASH = 'cash',
  CARD = 'card',
}

@Entity('orders')
export class OrderEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  orderNumber!: string;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status!: OrderStatus;

  //ФІНАНСИ
  @Column({ type: 'enum', enum: PaymentMethod, default: PaymentMethod.CASH })
  paymentMethod!: PaymentMethod;

  @Column({ default: false })
  isPaid!: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  baseAmount!: number; // Вартість товарів без знижок

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discountAmount!: number; // Скільки зекономлено (різниця oldPrice - price)

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  usedBonuses!: number; // Сума використаних бонусів

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalAmount!: number; // Кінцева сума до сплати (вже зі знижкою та бонусами)

  //ДАНІ КОРИСТУВАЧА
  @Column()
  customerName!: string;

  @Column()
  customerPhone!: string;

  @Column()
  shippingAddress!: string;

  //ДАТИ ДОСТАВКИ
  @Column({ type: 'timestamp', nullable: true })
  estimatedDeliveryDate?: Date; // Запланована дата

  @Column({ type: 'timestamp', nullable: true })
  deliveryDate?: Date; // Фактична дата отримання

  //ЗВ'ЯЗКИ
  @ManyToOne(() => UsersEntity, { onDelete: 'CASCADE' })
  user!: UsersEntity;

  @OneToMany(() => OrderItemEntity, (item) => item.order, { cascade: true })
  items!: OrderItemEntity[];

  @CreateDateColumn()
  createdAt!: Date;
}
