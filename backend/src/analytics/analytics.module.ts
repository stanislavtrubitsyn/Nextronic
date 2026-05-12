import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';

import { UsersEntity } from '../users/users.entity';
import { OrderEntity } from '../orders/orders.entity';
import { OrderItemEntity } from '../orders/order-item.entity';
import { ViewedProductEntity } from '../products/viewed-products.entity';
import { ProductsEntity } from '../products/products.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UsersEntity,
      OrderEntity,
      OrderItemEntity,
      ViewedProductEntity,
      ProductsEntity,
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
