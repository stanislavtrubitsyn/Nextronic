import { IsString, IsNotEmpty, IsPhoneNumber } from 'class-validator';

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  customerName!: string;

  @IsPhoneNumber('UA')
  customerPhone!: string;

  @IsString()
  @IsNotEmpty()
  shippingAddress!: string;
}
