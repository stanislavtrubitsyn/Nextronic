import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersEntity } from './users.entity';
import { ProfilesEntity } from './profiles.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  imports: [TypeOrmModule.forFeature([UsersEntity, ProfilesEntity])],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService], // Експортуємо для модуля автентифікації
})
export class UsersModule {}
