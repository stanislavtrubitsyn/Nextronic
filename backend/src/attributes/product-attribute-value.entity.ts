import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProductsEntity } from '../products/products.entity';
import { CategoriesEntity } from '../categories/categories.entity';
import { AttributeDefinitionEntity, LocalizedString } from './attribute-definition.entity';

@Entity('product_attribute_values')
@Index(['product', 'code'], { unique: true })
export class ProductAttributeValueEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => ProductsEntity, (product) => product.attributeValues, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  product!: ProductsEntity;

  @ManyToOne(() => CategoriesEntity, { onDelete: 'CASCADE', nullable: false })
  category!: CategoriesEntity;

  @ManyToOne(() => AttributeDefinitionEntity, (attribute) => attribute.productValues, {
    onDelete: 'CASCADE',
    nullable: false,
    eager: true,
  })
  attribute!: AttributeDefinitionEntity;

  @Column()
  code!: string;

  @Column({ type: 'text', nullable: true })
  valueString?: string | null;

  @Column({ type: 'decimal', precision: 14, scale: 4, nullable: true })
  valueNumber?: number | null;

  @Column({ type: 'boolean', nullable: true })
  valueBoolean?: boolean | null;

  @Column({ type: 'jsonb', nullable: true })
  valueJson?: unknown;

  @Column({ type: 'jsonb' })
  displayValue!: LocalizedString;

  @Column({ nullable: true })
  filterValue?: string;

  @Column({ default: true })
  filterable!: boolean;

  @Column({ default: true })
  comparable!: boolean;

  @Column({ default: 0 })
  sortOrder!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
