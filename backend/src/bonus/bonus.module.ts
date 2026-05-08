import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BonusAccountEntity } from './bonus.entity';
import { BonusService } from './bonus.service';
import { BonusController } from './bonus.controller';

@Module({
  imports: [TypeOrmModule.forFeature([BonusAccountEntity])],
  controllers: [BonusController],
  providers: [BonusService],
  exports: [BonusService],
})
export class BonusModule {}
