import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private readonly configService: ConfigService) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID') || 'ID_НЕ_ЗНАЙДЕНО',
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET') || 'СЕКРЕТ_НЕ_ЗНАЙДЕНО',
      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL') || 'КАЛБЕК_НЕ_ЗНАЙДЕНО',
      scope: ['email', 'profile'],
    });
  }

  validate(accessToken: string, refreshToken: string, profile: any, done: VerifyCallback): void {
    const { name, emails, id } = profile;

    // Формуємо об'єкт користувача з даних, які віддав Google
    const user = {
      googleId: id,
      email: emails[0].value,
      firstName: name?.givenName || '',
      lastName: name?.familyName || '',
    };

    done(null, user);
  }
}
