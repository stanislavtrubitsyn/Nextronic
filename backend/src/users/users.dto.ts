import { IsEmail, IsString, MinLength, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { Transform, TransformFnParams } from 'class-transformer';
import { UserRole } from './users.entity';

export class CreateUserAdminDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsEnum(UserRole)
  role!: UserRole;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  middleName?: string;

  @IsOptional()
  @Transform(({ value }: TransformFnParams): string | undefined => {
    if (value === '' || value === null) return undefined;
    if (typeof value === 'string') return value;
    return undefined;
  })
  @IsDateString()
  birthday?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
