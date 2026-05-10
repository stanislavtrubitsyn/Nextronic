import { IsString, IsInt, Min, Max, IsUUID, IsOptional, IsEnum } from 'class-validator';
import { ReviewType } from './reviews.entity';

export class CreateReviewDto {
  @IsUUID()
  productId!: string;

  @IsEnum(ReviewType)
  type!: ReviewType;

  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  rating?: number;

  @IsString()
  comment!: string;

  @IsUUID()
  @IsOptional()
  parentId?: string;
}

export class UpdateReviewDto {
  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  rating?: number;

  @IsString()
  @IsOptional()
  comment?: string;
}
