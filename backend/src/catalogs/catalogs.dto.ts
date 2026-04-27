import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreateCatalogDto {
  @IsNotEmpty({ message: 'Catalog name is required' })
  @IsString({ message: 'Catalog name must be a string' })
  name!: string;

  @IsNotEmpty({ message: 'Slug is required for catalog URLs' })
  @IsString({ message: 'Slug must be a string' })
  slug!: string;

  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  description?: string;
}

export class UpdateCatalogDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string;
}