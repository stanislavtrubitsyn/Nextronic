import {
  IsString,
  IsNotEmpty,
  IsPhoneNumber,
  IsEnum,
  IsOptional,
  IsNumber,
  Min,
  IsBoolean,
  IsDateString,
} from 'class-validator';
import { OrderStatus, PaymentMethod } from './orders.entity';

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  customerName!: string;

  @IsPhoneNumber('UA')
  customerPhone!: string;

  @IsString()
  @IsNotEmpty()
  shippingAddress!: string;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsNumber()
  @Min(0)
  usedBonuses?: number;
}

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  status!: OrderStatus;
}

export class UpdateOrderDetailsDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  customerName?: string;

  @IsOptional()
  @IsPhoneNumber('UA')
  customerPhone?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  shippingAddress?: string;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsBoolean()
  isPaid?: boolean;

  @IsOptional()
  @IsString()
  paymentProvider?: string | null;

  @IsOptional()
  @IsString()
  paymentStatus?: string | null;

  @IsOptional()
  @IsString()
  paymentTransactionId?: string | null;

  @IsOptional()
  @IsString()
  liqpayOrderId?: string | null;

  @IsOptional()
  @IsDateString()
  estimatedDeliveryDate?: string | null;

  @IsOptional()
  @IsDateString()
  deliveryDate?: string | null;
}
