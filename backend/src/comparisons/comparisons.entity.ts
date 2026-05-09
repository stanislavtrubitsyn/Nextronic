import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
} from 'typeorm';
import { UsersEntity } from '../users/users.entity';
import { ComparisonItemEntity } from './comparison-item.entity';
import { CategoriesEntity } from '../categories/categories.entity';

@Entity('comparisons')
export class ComparisonsEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'jsonb' })
  name!: { ua: string; en: string };

  @ManyToOne(() => UsersEntity, { onDelete: 'CASCADE' })
  user!: UsersEntity;

  @ManyToOne(() => CategoriesEntity, { onDelete: 'CASCADE' })
  category!: CategoriesEntity;

  @OneToMany(() => ComparisonItemEntity, (item) => item.comparison, { cascade: true })
  items!: ComparisonItemEntity[];

  @CreateDateColumn()
  createdAt!: Date;
}
