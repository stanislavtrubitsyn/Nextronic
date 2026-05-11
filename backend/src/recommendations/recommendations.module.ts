import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserActivityEntity } from './user-activity.entity';
import { RecommendationsService } from './recommendations.service';
import { RecommendationsController } from './recommendations.controller';
import { ProductsEntity } from '../products/products.entity';
import { OrderItemEntity } from '../orders/order-item.entity';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([UserActivityEntity, ProductsEntity, OrderItemEntity])],
  controllers: [RecommendationsController],
  providers: [RecommendationsService],
  exports: [RecommendationsService],
})
export class RecommendationsModule {}
