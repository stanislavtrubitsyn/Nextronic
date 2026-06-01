import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './auth.dto';
import { AuthGuard } from '@nestjs/passport';
import { Response, Request } from 'express';
import { ConfigService } from '@nestjs/config';

interface GoogleRequest extends Request {
  user?: {
    email: string;
    googleId: string;
    firstName?: string;
    lastName?: string;
  };
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('register')
  async register(@Body() body: RegisterDto) {
    return this.authService.register(body);
  }

  @Post('login')
  async login(@Body() body: LoginDto) {
    return this.authService.login(body);
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // Цей метод нічого не робить, AuthGuard автоматично перенаправить на сторінку Google
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req: GoogleRequest, @Res() res: Response) {
    if (!req.user) {
      throw new UnauthorizedException('Не вдалося отримати дані про користувача від Google');
    }

    const tokenData = await this.authService.googleLogin(req.user);

    const frontendUrl = this.configService.get<string>('FRONTEND_URL');

    // Редірект
    return res.redirect(`${frontendUrl}/login/success?token=${tokenData.access_token}`);
  }
}
