import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CreateOrderDto } from '../orders/orders.dto';

@Entity('payment_sessions')
export class PaymentSessionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'jsonb' })
  orderPayload!: CreateOrderDto;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount!: number;

  @Column({ type: 'varchar', length: 50, default: 'liqpay' })
  provider!: string;

  @Column({ type: 'varchar', length: 50, default: 'prepared' })
  status!: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  paymentTransactionId?: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  liqpayOrderId?: string | null;

  @Column({ type: 'jsonb', nullable: true })
  paymentPayload?: Record<string, unknown> | null;

  @Column({ type: 'uuid', nullable: true })
  orderId?: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
