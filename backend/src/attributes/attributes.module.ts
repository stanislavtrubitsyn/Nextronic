import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttributesController } from './attributes.controller';
import { AttributesService } from './attributes.service';
import { AttributeDefinitionEntity } from './attribute-definition.entity';
import { CategoryAttributeEntity } from './category-attribute.entity';
import { ProductAttributeValueEntity } from './product-attribute-value.entity';
import { CategoriesEntity } from '../categories/categories.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AttributeDefinitionEntity,
      CategoryAttributeEntity,
      ProductAttributeValueEntity,
      CategoriesEntity,
    ]),
    AuthModule,
  ],
  controllers: [AttributesController],
  providers: [AttributesService],
  exports: [AttributesService, TypeOrmModule],
})
export class AttributesModule {}
