import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogsEntity } from './catalogs.entity';
import { CatalogsController } from './catalogs.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CatalogsEntity])],
  controllers: [CatalogsController],
})
export class CatalogsModule {}