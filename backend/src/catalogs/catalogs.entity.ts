import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { CategoriesEntity } from '../categories/categories.entity';
@Entity('catalogs')
export class CatalogsEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ nullable: true })
  icon?: string; // Тут буде або назва іконки MUI, або шлях до файлу .svg

  @Column({ unique: true, nullable: false })
  name!: string; // Назва. Наприклад "Електроніка"

  @Column({ unique: true, nullable: false })
  slug!: string; // Наприклад "electronics" для гарних посилань в браузері

  @Column({ nullable: true })
  description?: string; // Короткий опис

  @OneToMany(() => CategoriesEntity, (category) => category.catalog)
  categories!: CategoriesEntity[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}