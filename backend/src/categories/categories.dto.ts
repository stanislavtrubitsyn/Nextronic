import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsObject,
  ValidateNested,
} from 'class-validator';
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

export class CreateCategoriesDto {
  @IsObject()
  @ValidateNested()
  @Type(() => LocalizationDto)
  @IsNotEmpty({ message: 'Name object (ua/en) is required' })
  name!: LocalizationDto;

  @IsNotEmpty({ message: 'Slug is required' })
  @IsString()
  slug!: string;

  @IsNotEmpty()
  @IsUUID('4', { message: 'Catalog ID must be a valid UUID' })
  catalogId!: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => LocalizationDto)
  description?: LocalizationDto;
}

export class UpdateCategoriesDto extends PartialType(CreateCategoriesDto) {}
