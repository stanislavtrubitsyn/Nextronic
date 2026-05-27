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
import { ProductAttributeInputDto } from '../attributes/attributes.dto';
import { ProductFilters } from '../attributes/attributes.service';
import { AttributeType } from '../attributes/attribute-definition.entity';

class LocalizationDto {
  @IsString()
  @IsNotEmpty()
  ua!: string;

  @IsString()
  @IsNotEmpty()
  en!: string;
}

class CharacteristicItemDto {
  @IsString()
  @IsOptional()
  code?: string;

  @IsObject()
  @ValidateNested()
  @Type(() => LocalizationDto)
  name!: LocalizationDto;

  @IsObject()
  @ValidateNested()
  @Type(() => LocalizationDto)
  value!: LocalizationDto;

  @IsOptional()
  @IsString()
  type?: AttributeType;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsBoolean()
  filterable?: boolean;

  @IsOptional()
  @IsBoolean()
  comparable?: boolean;
}

class CharacteristicGroupDto {
  @IsObject()
  @ValidateNested()
  @Type(() => LocalizationDto)
  group!: LocalizationDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CharacteristicItemDto)
  items!: CharacteristicItemDto[];
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

  // Генерується бекендом із attributeValues. Залишено для сумісності зі старими товарами.
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CharacteristicGroupDto)
  characteristics?: CharacteristicGroupDto[];

  // Генерується бекендом із attributeValues. Не треба дублювати вручну на фронтенді.
  @IsOptional()
  @IsObject()
  filters?: ProductFilters;

  // Новий правильний формат заповнення товару.
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductAttributeInputDto)
  attributeValues?: ProductAttributeInputDto[];

  @IsOptional()
  @IsUUID()
  catalogId?: string;

  @IsUUID()
  @IsNotEmpty()
  categoryId!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateProductDto extends PartialType(CreateProductDto) {}
export class DuplicateProductDto extends PartialType(CreateProductDto) {}
