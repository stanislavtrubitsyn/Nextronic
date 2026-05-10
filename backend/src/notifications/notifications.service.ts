import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationsEntity } from './notifications.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(NotificationsEntity)
    private readonly notificationRepo: Repository<NotificationsEntity>,
  ) {}

  async createNotification(userId: string, titleKey: string, messageKey: string, params: any = {}) {
    const notification = this.notificationRepo.create({
      titleKey,
      messageKey,
      params,
      user: { id: userId },
    });
    return await this.notificationRepo.save(notification);
  }

  async getUserNotifications(userId: string) {
    return await this.notificationRepo.find({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' },
    });
  }

  async markAsRead(id: string) {
    return await this.notificationRepo.update(id, { isRead: true });
  }
}
