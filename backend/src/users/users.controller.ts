import {
  Controller,
  Get,
  Param,
  Patch,
  Delete,
  Body,
  Req,
  ParseUUIDPipe,
  NotFoundException,
  UseGuards,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole, UsersEntity } from './users.entity';
import { ProfilesEntity } from './profiles.entity';
import { UserLangType, USERS_I18N } from './users.i18n';
import { Request } from 'express';

interface RequestWithUser extends Request {
  user: { userId: string };
}

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile/me')
  async getMyProfile(@Req() req: RequestWithUser) {
    return await this.usersService.findOne(req.user.userId);
  }

  @Patch('profile/me')
  async updateMyProfile(
    @Req() req: RequestWithUser,
    @Body() updateData: Partial<ProfilesEntity>,
    @Query('lang') lang: UserLangType = 'ua',
  ) {
    return await this.usersService.update(req.user.userId, updateData, lang);
  }

  @Patch('profile/me/password')
  async updateMyPassword(
    @Req() req: RequestWithUser,
    @Body() body: { oldPassword?: string; newPassword: string },
    @Query('lang') lang: UserLangType = 'ua',
  ) {
    return await this.usersService.updatePassword(
      req.user.userId,
      body.newPassword,
      body.oldPassword,
      lang,
    );
  }

  @Delete('profile/me')
  async deleteMyAccount(
    @Req() req: RequestWithUser,
    @Body() body: { password?: string },
    @Query('lang') lang: UserLangType = 'ua',
  ) {
    const isValid = await this.usersService.verifyPassword(req.user.userId, body.password);
    if (!isValid) throw new BadRequestException('Невірний пароль для підтвердження');

    await this.usersService.remove(req.user.userId, req.user.userId, lang);
    return { success: true, message: USERS_I18N[lang].accountDeleted };
  }

  @Get()
  @Roles(UserRole.ADMIN)
  async getAllUsers() {
    return await this.usersService.findAll();
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  async getProfile(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('lang') lang: UserLangType = 'ua',
  ) {
    const user = await this.usersService.findOne(id);
    if (!user) throw new NotFoundException(USERS_I18N[lang].notFound);
    return user;
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  async adminUpdateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateData: { role?: UserRole; profile?: Partial<ProfilesEntity> },
    @Req() req: RequestWithUser,
    @Query('lang') lang: UserLangType = 'ua',
  ): Promise<UsersEntity> {
    return await this.usersService.adminUpdate(id, updateData, req.user.userId, lang);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  async removeUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: RequestWithUser,
    @Query('lang') lang: UserLangType = 'ua',
  ) {
    await this.usersService.remove(id, req.user.userId, lang);
    return { success: true };
  }
}
