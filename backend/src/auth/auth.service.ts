import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AUTH_I18N, AuthLangType } from './auth.i18n';
import { LoginDto, RegisterDto } from './auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(data: RegisterDto, lang: AuthLangType = 'ua') {
    const t = AUTH_I18N[lang];
    const phone = this.normalizePhone(data.phone);

    if (data.phone && !phone) {
      throw new BadRequestException(t.phoneFormat);
    }

    const user = await this.usersService.create(
      data.email.trim().toLowerCase(),
      data.password,
      undefined,
      phone,
      lang,
      {
        firstName: data.firstName?.trim() || undefined,
        lastName: data.lastName?.trim() || undefined,
      },
    );

    return this.generateToken(user);
  }

  async login(data: LoginDto, lang: AuthLangType = 'ua') {
    const t = AUTH_I18N[lang];
    const email = data.email?.trim().toLowerCase();
    const phone = data.phone ? this.normalizePhone(data.phone) : undefined;
    const identifier = email || phone;

    if (data.phone && !phone && !email) {
      throw new BadRequestException(t.phoneFormat);
    }

    if (!identifier) {
      throw new BadRequestException(t.invalidAuth);
    }

    const user = await this.usersService.findByIdentifier(identifier);

    if (!user || !user.password) {
      throw new UnauthorizedException(t.invalidAuth);
    }

    const isMatch = await bcrypt.compare(data.password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException(t.invalidAuth);
    }

    return this.generateToken(user);
  }

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

  private normalizePhone(phone?: string): string | undefined {
    if (!phone) return undefined;

    const digits = phone.replace(/\D/g, '');
    if (!digits) return undefined;

    if (digits.length === 12 && digits.startsWith('380')) {
      return `+${digits}`;
    }

    if (digits.length === 10 && digits.startsWith('0')) {
      return `+38${digits}`;
    }

    if (digits.length === 9) {
      return `+380${digits}`;
    }

    if (digits.length === 13 && digits.startsWith('0380')) {
      return `+${digits.slice(1)}`;
    }

    return undefined;
  }

  private generateToken(user: any) {
    const payload = { email: user.email, sub: user.id, role: user.role };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        phone: user.phone || user.profile?.phone,
        firstName: user.profile?.firstName,
        lastName: user.profile?.lastName,
        patronymic: user.profile?.middleName,
      },
    };
  }
}
