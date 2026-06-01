import { IsEmail, IsOptional, IsString, Matches, MinLength, ValidateIf } from 'class-validator';
import { AUTH_I18N } from './auth.i18n';

const t = AUTH_I18N.ua;

const PHONE_PATTERN = /^\+?[\d\s()-]{7,25}$/;

export class RegisterDto {
  @IsEmail({}, { message: t.emailFormat })
  email!: string;

  @IsString()
  @MinLength(6, { message: t.passwordLength })
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: t.passwordWeak,
  })
  password!: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @Matches(PHONE_PATTERN, { message: t.phoneFormat })
  phone?: string;
}

export class LoginDto {
  @ValidateIf((dto: LoginDto) => !dto.phone)
  @IsEmail({}, { message: t.emailFormat })
  email?: string;

  @ValidateIf((dto: LoginDto) => !dto.email)
  @Matches(PHONE_PATTERN, { message: t.phoneFormat })
  phone?: string;

  @IsString()
  @MinLength(6, { message: t.passwordLength })
  password!: string;
}

export class AuthDto extends RegisterDto {}
