import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsEntity } from './products.entity';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { CategoriesEntity } from '../categories/categories.entity';
import { ViewedProductEntity } from './viewed-products.entity';
import { ViewedProductsService } from './viewed-products.service';
import { AuthModule } from '../auth/auth.module';
import { AttributesModule } from '../attributes/attributes.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProductsEntity, CategoriesEntity, ViewedProductEntity]),
    AuthModule,
    AttributesModule,
  ],
  controllers: [ProductsController],
  providers: [ProductsService, ViewedProductsService],
  exports: [ProductsService, ViewedProductsService],
})
export class ProductsModule {}
