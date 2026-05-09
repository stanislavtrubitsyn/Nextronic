import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { BonusEntity } from './bonus.entity';
import { BonusService } from './bonus.service';
import { BonusController } from './bonus.controller';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ProfilesEntity } from '../users/profiles.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([BonusEntity, ProfilesEntity]),
    ScheduleModule.forRoot(),
    AuthModule,
    NotificationsModule,
  ],
  controllers: [BonusController],
  providers: [BonusService],
  exports: [BonusService],
})
export class BonusModule {}
