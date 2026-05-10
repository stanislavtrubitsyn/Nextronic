import { IsEmail, IsString, MinLength, Matches, IsOptional } from 'class-validator';
import { AUTH_I18N } from './auth.i18n';

const t = AUTH_I18N.ua;

export class AuthDto {
  @IsEmail({}, { message: t.emailFormat })
  email!: string;

  @IsString()
  @MinLength(6, { message: t.passwordLength })
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: t.passwordWeak,
  })
  password!: string;

  @IsOptional()
  @Matches(/^\+?[1-9]\d{1,14}$/, { message: t.phoneFormat })
  phone?: string;
}
