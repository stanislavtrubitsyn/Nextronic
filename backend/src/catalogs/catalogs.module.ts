import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogsEntity } from './catalogs.entity';
import { CatalogsController } from './catalogs.controller';
import { CatalogsService } from './catalogs.service';
import { AuthModule } from '../auth/auth.module';
import { ProductsEntity } from '../products/products.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CatalogsEntity, ProductsEntity]), AuthModule],
  controllers: [CatalogsController],
  providers: [CatalogsService],
  exports: [CatalogsService],
})
export class CatalogsModule {}
