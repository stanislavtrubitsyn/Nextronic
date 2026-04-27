import { IsNotEmpty, IsString, IsUUID, IsOptional } from 'class-validator';

export class CreateCategoriesDto {
  @IsNotEmpty({ message: 'Name is required and cannot be empty' })
  @IsString({ message: 'Name must be a string' })
  name!: string;

  @IsNotEmpty({ message: 'Slug is required for SEO-friendly URLs' })
  @IsString({ message: 'Slug must be a string' })
  slug!: string;

  @IsNotEmpty({ message: 'Catalog ID is mandatory to link the category' })
  @IsUUID('4', { message: 'Catalog ID must be a valid UUID' })
  catalogId!: string;

  @IsOptional()
  @IsString({ message: 'Icon must be a string (URL or name)' })
  icon?: string;
}

export class UpdateCategoriesDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsUUID('4')
  catalogId?: string;

  @IsOptional()
  @IsString()
  icon?: string;
}