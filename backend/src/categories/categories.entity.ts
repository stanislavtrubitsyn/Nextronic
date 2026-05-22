import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CatalogsEntity } from '../catalogs/catalogs.entity';
import { ProductsEntity } from '../products/products.entity';

@Entity('categories')
export class CategoriesEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'jsonb', nullable: false })
  name!: { ua: string; en: string };

  @Column({ unique: true, nullable: false })
  slug!: string;

  @Column({ nullable: true })
  icon?: string;

  @Column({ type: 'jsonb', nullable: true })
  description?: { ua: string; en: string };

  @Column({ default: true })
  isActive!: boolean;

  @ManyToOne(() => CatalogsEntity, (catalog) => catalog.categories, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  catalog!: CatalogsEntity;

  @OneToMany(() => ProductsEntity, (product) => product.category)
  products!: ProductsEntity[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
