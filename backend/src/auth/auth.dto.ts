import { IsEmail, IsString, MinLength, Matches, IsOptional } from 'class-validator';

export class AuthDto {
  @IsEmail({}, { message: 'Incorrect email format' })
  email!: string;

  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long.' })
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: 'Password is too weak (requires a capital letter, number, or special character)',
  })
  password!: string;

  @IsOptional()
  @Matches(/^\+?[1-9]\d{1,14}$/, { message: 'Incorrect phone number format' })
  phone?: string;
}
