import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WishlistsEntity } from './wishlists.entity';
import { WishlistItemEntity } from './wishlist-item.entity';
import { WishlistService } from './wishlists.service';
import { WishlistController } from './wishlists.controller';
import { ProductsEntity } from '../products/products.entity';
@Module({
  imports: [TypeOrmModule.forFeature([WishlistsEntity, WishlistItemEntity, ProductsEntity])],
  controllers: [WishlistController],
  providers: [WishlistService],
})
export class WishlistModule {}
