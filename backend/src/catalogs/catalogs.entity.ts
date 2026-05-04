import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { CategoriesEntity } from '../categories/categories.entity';

@Entity('catalogs')
export class CatalogsEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ nullable: true })
  icon?: string;

  @Column({ type: 'jsonb', nullable: false })
  name!: { ua: string; en: string };

  @Column({ unique: true, nullable: false })
  slug!: string;

  @Column({ type: 'jsonb', nullable: true })
  description?: { ua: string; en: string };

  @OneToMany(() => CategoriesEntity, (category) => category.catalog)
  categories!: CategoriesEntity[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
