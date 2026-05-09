import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ComparisonsEntity } from './comparisons.entity';
import { ComparisonItemEntity } from './comparison-item.entity';
import { ProductsEntity } from '../products/products.entity';
import { ComparisonService } from './comparisons.service';
import { ComparisonController } from './comparisons.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ComparisonsEntity, ComparisonItemEntity, ProductsEntity])],
  controllers: [ComparisonController],
  providers: [ComparisonService],
})
export class ComparisonModule {}
