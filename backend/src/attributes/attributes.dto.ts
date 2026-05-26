import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AttributeType } from './attribute-definition.entity';

export class LocalizedStringDto {
  @IsString()
  @IsNotEmpty()
  ua!: string;

  @IsString()
  @IsNotEmpty()
  en!: string;
}

export class AttributeOptionDto {
  @IsObject()
  @ValidateNested()
  @Type(() => LocalizedStringDto)
  label!: LocalizedStringDto;

  @IsString()
  @IsNotEmpty()
  value!: string;
}

export class AttributeDefinitionInputDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsObject()
  @ValidateNested()
  @Type(() => LocalizedStringDto)
  name!: LocalizedStringDto;

  @IsObject()
  @ValidateNested()
  @Type(() => LocalizedStringDto)
  group!: LocalizedStringDto;

  @IsIn(Object.values(AttributeType))
  type!: AttributeType;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttributeOptionDto)
  options?: AttributeOptionDto[];

  @IsOptional()
  @IsBoolean()
  filterable?: boolean;

  @IsOptional()
  @IsBoolean()
  comparable?: boolean;

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class ReplaceCategoryAttributesDto {
  @IsUUID()
  categoryId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttributeDefinitionInputDto)
  attributes!: AttributeDefinitionInputDto[];
}

export class ProductAttributeInputDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsOptional()
  value?: string | number | boolean | string[] | number[] | null;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => LocalizedStringDto)
  displayValue?: LocalizedStringDto;
}
