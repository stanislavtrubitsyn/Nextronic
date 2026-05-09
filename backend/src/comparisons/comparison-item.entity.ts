import { Entity, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { ComparisonsEntity } from './comparisons.entity';
import { ProductsEntity } from '../products/products.entity';

@Entity('comparison_items')
export class ComparisonItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => ComparisonsEntity, (comp) => comp.items, { onDelete: 'CASCADE' })
  comparison!: ComparisonsEntity;

  @ManyToOne(() => ProductsEntity, { onDelete: 'CASCADE' })
  product!: ProductsEntity;
}
