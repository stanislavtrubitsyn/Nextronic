import { IsUUID, IsInt, Min, Max, IsOptional } from 'class-validator';

export class AddToCartDto {
  @IsUUID()
  productId!: string;

  @IsInt()
  @Min(1)
  @Max(10)
  @IsOptional()
  quantity?: number = 1;
}

export class UpdateCartItemDto {
  @IsInt()
  @Min(1)
  @Max(10)
  quantity!: number;
}
