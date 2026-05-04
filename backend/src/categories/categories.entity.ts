import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CatalogsEntity } from '../catalogs/catalogs.entity';

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

  @ManyToOne(() => CatalogsEntity, (catalog) => catalog.categories, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  catalog!: CatalogsEntity;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
