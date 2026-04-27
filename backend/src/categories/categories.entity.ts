import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { CatalogsEntity } from '../catalogs/catalogs.entity';

@Entity('categories')
export class CategoriesEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true, nullable: false })
  name!: string;

  @Column({ unique: true, nullable: false })
  slug!: string;

  @Column({ nullable: true })
  icon?: string;

  // Зв'язок: Багато категорій належать до одного каталогу
  @ManyToOne(() => CatalogsEntity, (catalog) => catalog.id, {
    onDelete: 'CASCADE',
    nullable: false
  })
  catalog!: CatalogsEntity;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}