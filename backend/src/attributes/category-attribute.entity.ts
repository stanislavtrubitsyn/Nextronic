import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CategoriesEntity } from '../categories/categories.entity';
import { AttributeDefinitionEntity } from './attribute-definition.entity';

@Entity('category_attributes')
export class CategoryAttributeEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => CategoriesEntity, { onDelete: 'CASCADE', nullable: false })
  category!: CategoriesEntity;

  @ManyToOne(() => AttributeDefinitionEntity, (attribute) => attribute.categoryAttributes, {
    onDelete: 'CASCADE',
    nullable: false,
    eager: true,
  })
  attribute!: AttributeDefinitionEntity;

  @Column({ default: false })
  required!: boolean;

  @Column({ default: true })
  filterable!: boolean;

  @Column({ default: true })
  comparable!: boolean;

  @Column({ default: true })
  visibleInProduct!: boolean;

  @Column({ default: 0 })
  sortOrder!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
