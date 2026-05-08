import { IsUUID, IsInt, Min, IsOptional } from 'class-validator';

export class AddToCartDto {
  @IsUUID()
  productId!: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  quantity?: number = 1;
}

export class UpdateCartItemDto {
  @IsInt()
  @Min(1)
  quantity!: number;
}
