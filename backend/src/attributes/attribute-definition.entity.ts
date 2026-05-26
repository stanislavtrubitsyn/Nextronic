import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CategoryAttributeEntity } from './category-attribute.entity';
import { ProductAttributeValueEntity } from './product-attribute-value.entity';

export type LocalizedString = {
  ua: string;
  en: string;
};

export enum AttributeType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  ENUM = 'enum',
  MULTI_ENUM = 'multi_enum',
}

export type AttributeOption = {
  label: LocalizedString;
  value: string;
};

@Entity('attribute_definitions')
export class AttributeDefinitionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  code!: string;

  @Column({ type: 'jsonb' })
  name!: LocalizedString;

  @Column({ type: 'jsonb' })
  group!: LocalizedString;

  @Column({ type: 'enum', enum: AttributeType, default: AttributeType.STRING })
  type!: AttributeType;

  @Column({ nullable: true })
  unit?: string;

  @Column({ type: 'jsonb', default: [] })
  options!: AttributeOption[];

  @Column({ default: true })
  filterable!: boolean;

  @Column({ default: true })
  comparable!: boolean;

  @Column({ default: false })
  required!: boolean;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ default: 0 })
  sortOrder!: number;

  @OneToMany(() => CategoryAttributeEntity, (categoryAttribute) => categoryAttribute.attribute)
  categoryAttributes!: CategoryAttributeEntity[];

  @OneToMany(() => ProductAttributeValueEntity, (value) => value.attribute)
  productValues!: ProductAttributeValueEntity[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
