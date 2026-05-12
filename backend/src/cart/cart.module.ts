import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CartEntity } from './cart.entity';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { ProductsEntity } from '../products/products.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CartEntity, ProductsEntity])],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
