import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AUTH_I18N, AuthLangType } from './auth.i18n';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(email: string, password: string) {
    const user = await this.usersService.create(email, password);
    return this.generateToken(user);
  }

  async login(identifier: string, pass: string, lang: AuthLangType = 'ua') {
    const user = await this.usersService.findByIdentifier(identifier);
    const t = AUTH_I18N[lang];

    if (!user || !user.password) {
      throw new UnauthorizedException(t.invalidAuth);
    }

    const isMatch = await bcrypt.compare(pass, user.password);
    if (!isMatch) {
      throw new UnauthorizedException(t.invalidAuth);
    }

    return this.generateToken(user);
  }

  // МЕТОД ДЛЯ GOOGLE АВТОРИЗАЦІЇ
  // Замінили any на чітко описану структуру
  async googleLogin(googleUser: {
    email: string;
    googleId: string;
    firstName?: string;
    lastName?: string;
  }) {
    if (!googleUser) {
      throw new UnauthorizedException('Дані від Google не отримано');
    }

    const user = await this.usersService.findOrCreateGoogleUser(googleUser);

    return this.generateToken(user);
  }

  private generateToken(user: any) {
    const payload = { email: user.email, sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }
}
