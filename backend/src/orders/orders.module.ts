import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderEntity } from './orders.entity';
import { OrderItemEntity } from './order-item.entity';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { CartModule } from '../cart/cart.module';
import { BonusModule } from '../bonus/bonus.module';

@Module({
  imports: [TypeOrmModule.forFeature([OrderEntity, OrderItemEntity]), CartModule, BonusModule],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrderModule {}
