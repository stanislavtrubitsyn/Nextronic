import {
  IsString,
  IsNotEmpty,
  IsPhoneNumber,
  IsEnum,
  IsOptional,
  IsNumber,
  Min,
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
