import { IsEmail, IsString, MinLength } from 'class-validator';

export class AuthDto {
  @IsEmail({}, { message: 'Некоректний формат email' })
  email!: string;

  @IsString()
  @MinLength(6, { message: 'Пароль має бути не менше 6 символів' })
  password!: string;
}
