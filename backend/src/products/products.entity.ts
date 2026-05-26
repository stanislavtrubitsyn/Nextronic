import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { CategoriesEntity } from '../categories/categories.entity';
import { CatalogsEntity } from '../catalogs/catalogs.entity';
import { ReviewsEntity } from '../reviews/reviews.entity';
import { ProductAttributeValueEntity } from '../attributes/product-attribute-value.entity';
import type { ProductCharacteristicGroup, ProductFilters } from '../attributes/attributes.service';

@Entity('products')
export class ProductsEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true, nullable: false })
  sku!: string;

  @Column({ type: 'jsonb', nullable: false })
  name!: { ua: string; en: string };

  @Column({ unique: true, nullable: false })
  slug!: string;

  @Column({ type: 'jsonb', nullable: true })
  description?: { ua: string; en: string };

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  price!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  oldPrice?: number;

  @Column({ default: 0 })
  stock!: number;

  @Column({ type: 'text', array: true, default: [] })
  images!: string[];

  @Column({ type: 'jsonb', default: [] })
  characteristics!: ProductCharacteristicGroup[];

  @Column({ type: 'jsonb', default: {} })
  filters!: ProductFilters;

  @Column({ default: true })
  isActive!: boolean;

  @ManyToOne(() => CatalogsEntity, { onDelete: 'CASCADE', nullable: false })
  catalog!: CatalogsEntity;

  @ManyToOne(() => CategoriesEntity, { onDelete: 'CASCADE', nullable: false })
  category!: CategoriesEntity;

  @OneToMany(() => ReviewsEntity, (review) => review.product)
  reviews!: ReviewsEntity[];

  @OneToMany(() => ProductAttributeValueEntity, (value) => value.product)
  attributeValues!: ProductAttributeValueEntity[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
