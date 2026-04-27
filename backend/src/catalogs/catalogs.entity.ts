import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('catalogs')
export class CatalogsEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ nullable: true })
  icon?: string; // Тут буде або назва іконки MUI, або шлях до файлу .svg

  @Column({ unique: true })
  name!: string; // Назва. Наприклад "Електроніка"

  @Column({ unique: true })
  slug!: string; // Наприклад "electronics" для гарних посилань в браузері

  @Column({ nullable: true })
  description?: string; // Короткий опис

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}