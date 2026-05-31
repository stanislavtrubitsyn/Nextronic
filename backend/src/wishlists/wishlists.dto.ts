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

export class MoveWishlistItemDto {
  @IsUUID()
  productId!: string;

  @IsUUID()
  fromWishlistId!: string;

  @IsUUID()
  toWishlistId!: string;
}
