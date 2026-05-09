import { Controller, Get, Patch, Param, Req, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

interface RequestWithUser extends Request {
  user: { userId: string };
}

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async getMyNotifications(@Req() req: RequestWithUser) {
    return await this.notificationsService.getUserNotifications(req.user.userId);
  }

  @Patch(':id/read')
  async markAsRead(@Param('id') id: string) {
    return await this.notificationsService.markAsRead(id);
  }
}
