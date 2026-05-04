import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  IsBoolean,
  IsUUID,
  IsObject,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/mapped-types';

class LocalizationDto {
  @IsString() @IsNotEmpty() ua!: string;
  @IsString() @IsNotEmpty() en!: string;
}

export class CreateProductDto {
  @IsObject()
  @ValidateNested()
  @Type(() => LocalizationDto)
  name!: LocalizationDto;

  @IsString()
  @IsNotEmpty()
  slug!: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => LocalizationDto)
  description?: LocalizationDto;

  @IsNumber()
  @Min(0)
  price!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  oldPrice?: number;

  @IsNumber()
  @Min(0)
  stock!: number;

  @IsArray()
  @IsString({ each: true })
  images!: string[];

  @IsOptional()
  @IsNotEmpty()
  catalogId!: string;

  @IsUUID()
  @IsNotEmpty()
  categoryId!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateProductDto extends PartialType(CreateProductDto) {}
