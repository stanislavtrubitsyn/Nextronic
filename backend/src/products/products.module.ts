import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsEntity } from './products.entity';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { CategoriesEntity } from '../categories/categories.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ProductsEntity, CategoriesEntity])],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
