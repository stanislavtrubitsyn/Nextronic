import { IsNotEmpty, IsString, IsOptional, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/mapped-types';

class LocalizationDto {
  @IsString()
  @IsNotEmpty()
  ua!: string;

  @IsString()
  @IsNotEmpty()
  en!: string;
}

export class CreateCatalogDto {
  @IsObject()
  @ValidateNested()
  @Type(() => LocalizationDto)
  @IsNotEmpty({ message: 'Catalog name object is required' })
  name!: LocalizationDto;

  @IsNotEmpty({ message: 'Slug is required for catalog URLs' })
  @IsString({ message: 'Slug must be a string' })
  slug!: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => LocalizationDto)
  description?: LocalizationDto;
}

export class UpdateCatalogDto extends PartialType(CreateCatalogDto) {}
