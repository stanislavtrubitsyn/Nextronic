import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CategoriesEntity } from '../categories/categories.entity';
import { CatalogsEntity } from '../catalogs/catalogs.entity';

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

  @Column({ default: true })
  isActive!: boolean;

  // Зв'язки
  @ManyToOne(() => CatalogsEntity, { onDelete: 'CASCADE', nullable: false })
  catalog!: CatalogsEntity;

  @ManyToOne(() => CategoriesEntity, { onDelete: 'CASCADE', nullable: false })
  category!: CategoriesEntity;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
