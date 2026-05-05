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
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from './users.entity';
import { ProfilesEntity } from './profiles.entity';
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // 1. Отримати свій профіль
  @Get('profile/me')
  async getMyProfile(@Req() req: { user: { userId: string } }) {
    // Явно вказуємо структуру
    return this.usersService.findOne(req.user.userId);
  }

  // 2. Оновити свій профіль (доступно будь-якому авторизованому юзеру)
  @Patch('profile/me')
  async updateMyProfile(
    @Req() req: { user: { userId: string } }, // Явно вказуємо структуру
    @Body() updateData: Partial<ProfilesEntity>,
  ) {
    return this.usersService.update(req.user.userId, updateData);
  }

  // 3. Адмінські методи (те, що було + видалення)
  @Get()
  @Roles(UserRole.ADMIN)
  async getAllUsers() {
    return await this.usersService.findAll();
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  async removeUser(@Param('id', ParseUUIDPipe) id: string) {
    await this.usersService.remove(id);
    return { success: true };
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  async getProfile(@Param('id', ParseUUIDPipe) id: string) {
    const user = await this.usersService.findOne(id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
}
