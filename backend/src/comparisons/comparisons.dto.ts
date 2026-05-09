import { IsUUID } from 'class-validator';

export class AddToComparisonDto {
  @IsUUID()
  productId!: string;
}
