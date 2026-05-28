import { IsArray, IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { ReviewType } from './reviews.entity';

export enum ReviewReactionType {
  LIKE = 'like',
  DISLIKE = 'dislike',
}

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

  @IsString()
  @IsOptional()
  advantages?: string;

  @IsString()
  @IsOptional()
  disadvantages?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  photos?: string[];

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

  @IsString()
  @IsOptional()
  advantages?: string | null;

  @IsString()
  @IsOptional()
  disadvantages?: string | null;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  photos?: string[];
}

export class ReviewReactionDto {
  @IsEnum(ReviewReactionType)
  reaction!: ReviewReactionType;
}
