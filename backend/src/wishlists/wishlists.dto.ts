import { IsString, IsNotEmpty, IsUUID, IsOptional } from 'class-validator';

export class CreateWishlistDto {
  @IsString()
  @IsOptional()
  @IsNotEmpty()
  name?: string;
}

export class AddToWishlistDto {
  @IsUUID()
  productId!: string;
}
