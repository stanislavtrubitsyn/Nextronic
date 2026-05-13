import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { UsersEntity } from '../users/users.entity';
import { OrderEntity } from '../orders/orders.entity';
import { OrderItemEntity } from '../orders/order-item.entity';
import { ViewedProductEntity } from '../products/viewed-products.entity';
import { ProductsEntity } from '../products/products.entity';
import { ReviewsEntity } from '../reviews/reviews.entity';
import { WishlistItemEntity } from '../wishlists/wishlist-item.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UsersEntity,
      OrderEntity,
      OrderItemEntity,
      ViewedProductEntity,
      ProductsEntity,
      ReviewsEntity,
      WishlistItemEntity,
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
