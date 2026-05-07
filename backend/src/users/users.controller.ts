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
import { UserRole, UsersEntity } from './users.entity';
import { ProfilesEntity } from './profiles.entity';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile/me')
  async getMyProfile(@Req() req: { user: { userId: string } }) {
    return await this.usersService.findOne(req.user.userId);
  }

  @Patch('profile/me')
  async updateMyProfile(
    @Req() req: { user: { userId: string } },
    @Body() updateData: Partial<ProfilesEntity>,
  ) {
    return await this.usersService.update(req.user.userId, updateData);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  async adminUpdateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateData: { role?: UserRole; profile?: Partial<ProfilesEntity> },
  ): Promise<UsersEntity> {
    return await this.usersService.adminUpdate(id, updateData);
  }

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

  @Delete('profile/me')
  async deleteMyAccount(@Req() req: { user: { userId: string } }) {
    await this.usersService.remove(req.user.userId);
    return { success: true, message: 'Account deleted' };
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  async getProfile(@Param('id', ParseUUIDPipe) id: string) {
    const user = await this.usersService.findOne(id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
}
