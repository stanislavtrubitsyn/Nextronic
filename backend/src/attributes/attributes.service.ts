import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  AttributeDefinitionEntity,
  AttributeOption,
  AttributeType,
  LocalizedString,
} from './attribute-definition.entity';
import { CategoryAttributeEntity } from './category-attribute.entity';
import { ProductAttributeValueEntity } from './product-attribute-value.entity';
import { CategoriesEntity } from '../categories/categories.entity';
import { ProductsEntity } from '../products/products.entity';
import { AttributeDefinitionInputDto, ProductAttributeInputDto } from './attributes.dto';
import {
  AttributeTemplate,
  getDefaultTemplatesForCategory,
} from './default-category-attribute-templates';

export type ProductFilterValue = string | string[] | number | boolean;
export type ProductFilters = Record<string, ProductFilterValue>;

export interface ProductCharacteristicItem {
  code: string;
  name: LocalizedString;
  value: LocalizedString;
  type: AttributeType;
  unit?: string;
  filterable: boolean;
  comparable: boolean;
}

export interface ProductCharacteristicGroup {
  group: LocalizedString;
  items: ProductCharacteristicItem[];
}

export interface PreparedProductAttribute {
  code: string;
  definition: AttributeDefinitionEntity;
  valueString?: string | null;
  valueNumber?: number | null;
  valueBoolean?: boolean | null;
  valueJson?: unknown;
  displayValue: LocalizedString;
  filterValue?: string;
  filterable: boolean;
  comparable: boolean;
  sortOrder: number;
}

export interface PreparedProductAttributesResult {
  filters: ProductFilters;
  characteristics: ProductCharacteristicGroup[];
  values: PreparedProductAttribute[];
}

@Injectable()
export class AttributesService {
  constructor(
    @InjectRepository(AttributeDefinitionEntity)
    private readonly definitionRepo: Repository<AttributeDefinitionEntity>,
    @InjectRepository(CategoryAttributeEntity)
    private readonly categoryAttributeRepo: Repository<CategoryAttributeEntity>,
    @InjectRepository(ProductAttributeValueEntity)
    private readonly productAttributeValueRepo: Repository<ProductAttributeValueEntity>,
    @InjectRepository(CategoriesEntity)
    private readonly categoryRepo: Repository<CategoriesEntity>,
  ) {}

  async getCategoryFormSchema(categoryId: string) {
    const category = await this.categoryRepo.findOne({
      where: { id: categoryId },
      relations: ['catalog'],
    });
    if (!category) throw new NotFoundException('Категорію не знайдено');

    await this.ensureDefaultCategoryAttributes(category);

    const categoryAttributes = await this.categoryAttributeRepo.find({
      where: { category: { id: categoryId }, attribute: { isActive: true } },
      relations: ['attribute'],
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });

    const attributes = categoryAttributes.map((item) => ({
      id: item.attribute.id,
      code: item.attribute.code,
      name: item.attribute.name,
      group: item.attribute.group,
      type: item.attribute.type,
      unit: item.attribute.unit,
      options: item.attribute.options || [],
      required: item.required,
      filterable: item.filterable,
      comparable: item.comparable,
      visibleInProduct: item.visibleInProduct,
      sortOrder: item.sortOrder,
    }));

    return {
      category: {
        id: category.id,
        slug: category.slug,
        name: category.name,
        catalog: category.catalog
          ? { id: category.catalog.id, slug: category.catalog.slug, name: category.catalog.name }
          : null,
      },
      attributes,
    };
  }

  async replaceCategoryAttributes(categoryId: string, attributes: AttributeDefinitionInputDto[]) {
    const category = await this.categoryRepo.findOne({ where: { id: categoryId } });
    if (!category) throw new NotFoundException('Категорію не знайдено');

    await this.categoryAttributeRepo.delete({ category: { id: categoryId } });

    const savedCategoryAttributes: CategoryAttributeEntity[] = [];

    for (const [index, attributeInput] of attributes.entries()) {
      const definition = await this.upsertDefinition({
        ...attributeInput,
        code: this.normalizeCode(attributeInput.code),
        sortOrder: attributeInput.sortOrder ?? index,
      });

      const categoryAttribute = this.categoryAttributeRepo.create({
        category: { id: category.id },
        attribute: definition,
        required: attributeInput.required ?? definition.required,
        filterable: attributeInput.filterable ?? definition.filterable,
        comparable: attributeInput.comparable ?? definition.comparable,
        visibleInProduct: true,
        sortOrder: attributeInput.sortOrder ?? index,
      });

      savedCategoryAttributes.push(await this.categoryAttributeRepo.save(categoryAttribute));
    }

    return savedCategoryAttributes;
  }

  async prepareProductAttributes(
    categoryId: string,
    inputValues: ProductAttributeInputDto[] = [],
  ): Promise<PreparedProductAttributesResult> {
    const schema = await this.getCategoryFormSchema(categoryId);
    const inputByCode = new Map(
      inputValues.map((item) => [this.normalizeCode(item.code), item] as const),
    );

    const filters: ProductFilters = {
      product_type: schema.category.slug,
      category: schema.category.slug,
    };

    const grouped = new Map<string, ProductCharacteristicGroup>();
    const preparedValues: PreparedProductAttribute[] = [];

    for (const schemaAttribute of schema.attributes) {
      const code = this.normalizeCode(schemaAttribute.code);
      const input = inputByCode.get(code);
      const hasValue = this.hasMeaningfulValue(input?.value);

      if (!hasValue) {
        if (schemaAttribute.required) {
          throw new BadRequestException(
            `Обов'язкова характеристика не заповнена: ${schemaAttribute.name.ua}`,
          );
        }
        continue;
      }

      const normalized = this.normalizeAttributeValue(
        schemaAttribute.type,
        input!.value,
        schemaAttribute.unit,
        input!.displayValue,
        schemaAttribute.options || [],
      );

      if (schemaAttribute.filterable && normalized.filterValue !== undefined) {
        filters[code] = normalized.filterValue;
      }

      preparedValues.push({
        code,
        definition: { id: schemaAttribute.id } as AttributeDefinitionEntity,
        valueString: normalized.valueString,
        valueNumber: normalized.valueNumber,
        valueBoolean: normalized.valueBoolean,
        valueJson: normalized.valueJson,
        displayValue: normalized.displayValue,
        filterValue: normalized.filterValue,
        filterable: schemaAttribute.filterable,
        comparable: schemaAttribute.comparable,
        sortOrder: schemaAttribute.sortOrder,
      });

      const groupKey = `${schemaAttribute.group.ua}|${schemaAttribute.group.en}`;
      if (!grouped.has(groupKey)) {
        grouped.set(groupKey, {
          group: schemaAttribute.group,
          items: [],
        });
      }

      grouped.get(groupKey)!.items.push({
        code,
        name: schemaAttribute.name,
        value: normalized.displayValue,
        type: schemaAttribute.type,
        unit: schemaAttribute.unit,
        filterable: schemaAttribute.filterable,
        comparable: schemaAttribute.comparable,
      });
    }

    return {
      filters,
      characteristics: Array.from(grouped.values()).filter((item) => item.items.length > 0),
      values: preparedValues,
    };
  }

  async replaceProductAttributeValues(
    product: ProductsEntity,
    category: CategoriesEntity,
    values: PreparedProductAttribute[],
  ) {
    await this.productAttributeValueRepo.delete({ product: { id: product.id } });

    if (values.length === 0) return [];

    const entities = values.map((value) =>
      this.productAttributeValueRepo.create({
        product: { id: product.id },
        category: { id: category.id },
        attribute: { id: value.definition.id },
        code: value.code,
        valueString: value.valueString,
        valueNumber: value.valueNumber,
        valueBoolean: value.valueBoolean,
        valueJson: value.valueJson,
        displayValue: value.displayValue,
        filterValue: value.filterValue,
        filterable: value.filterable,
        comparable: value.comparable,
        sortOrder: value.sortOrder,
      }),
    );

    // definition у preparedValues має тільки id. Для стабільного code підтягнемо definitions одним запитом.
    const definitionIds = values.map((value) => value.definition.id);
    const definitions = await this.definitionRepo.find({ where: { id: In(definitionIds) } });
    const codeById = new Map(definitions.map((definition) => [definition.id, definition.code]));

    entities.forEach((entity, index) => {
      entity.code = codeById.get(values[index].definition.id) || values[index].code;
    });

    return await this.productAttributeValueRepo.save(entities);
  }

  async getFilterableCodes(categoryId?: string, categorySlug?: string) {
    if (categoryId || categorySlug) {
      const category = categoryId
        ? await this.categoryRepo.findOne({ where: { id: categoryId } })
        : await this.categoryRepo.findOne({ where: { slug: categorySlug! } });
      if (category) {
        await this.ensureDefaultCategoryAttributes(category);
        const categoryAttributes = await this.categoryAttributeRepo.find({
          where: {
            category: { id: category.id },
            filterable: true,
            attribute: { isActive: true },
          },
          relations: ['attribute'],
        });
        return new Set([
          'category',
          'catalog',
          'product_type',
          ...categoryAttributes.map((item) => item.attribute.code),
        ]);
      }
    }

    const definitions = await this.definitionRepo.find({
      where: { isActive: true, filterable: true },
    });
    return new Set([
      'category',
      'catalog',
      'product_type',
      ...definitions.map((item) => item.code),
    ]);
  }

  normalizeFilterValue(value: unknown): string {
    if (Array.isArray(value)) return value.map((item) => this.normalizeFilterValue(item)).join(',');
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'number') return String(value);
    return this.toSlug(this.valueToString(value));
  }

  private async ensureDefaultCategoryAttributes(category: CategoriesEntity) {
    const templates = getDefaultTemplatesForCategory(category.slug);
    if (templates.length === 0) return;

    const existingCategoryAttributes = await this.categoryAttributeRepo.find({
      where: { category: { id: category.id } },
      relations: ['attribute'],
    });
    const existingByCode = new Map(
      existingCategoryAttributes.map((item) => [item.attribute.code, item]),
    );

    const categoryAttributesToSave: CategoryAttributeEntity[] = [];

    for (const template of templates) {
      const definition = await this.upsertDefinition(template);
      const existing = existingByCode.get(definition.code);

      if (existing) {
        existing.attribute = definition;
        existing.required = template.required ?? definition.required;
        existing.filterable = template.filterable ?? definition.filterable;
        existing.comparable = template.comparable ?? definition.comparable;
        existing.visibleInProduct = true;
        existing.sortOrder = template.sortOrder;
        categoryAttributesToSave.push(existing);
        continue;
      }

      categoryAttributesToSave.push(
        this.categoryAttributeRepo.create({
          category: { id: category.id },
          attribute: definition,
          required: template.required ?? false,
          filterable: template.filterable ?? true,
          comparable: template.comparable ?? true,
          visibleInProduct: true,
          sortOrder: template.sortOrder,
        }),
      );
    }

    if (categoryAttributesToSave.length > 0) {
      await this.categoryAttributeRepo.save(categoryAttributesToSave);
    }
  }

  private async upsertDefinition(input: AttributeTemplate | AttributeDefinitionInputDto) {
    const code = this.normalizeCode(input.code);
    const existing = await this.definitionRepo.findOne({ where: { code } });

    const payload = {
      code,
      name: input.name,
      group: input.group,
      type: input.type,
      unit: input.unit,
      options: input.options || [],
      filterable: input.filterable ?? true,
      comparable: input.comparable ?? true,
      required: input.required ?? false,
      sortOrder: input.sortOrder ?? 0,
      isActive: true,
    };

    if (existing) {
      return await this.definitionRepo.save(this.definitionRepo.merge(existing, payload));
    }

    return await this.definitionRepo.save(this.definitionRepo.create(payload));
  }

  private normalizeAttributeValue(
    type: AttributeType,
    value: unknown,
    unit?: string,
    displayValue?: LocalizedString,
    options: AttributeOption[] = [],
  ) {
    if (type === AttributeType.NUMBER) {
      const rawValue = this.valueToString(value).trim();
      const valueNumber = Number(rawValue.replace(',', '.'));
      if (Number.isNaN(valueNumber)) {
        throw new BadRequestException('Числова характеристика має містити число');
      }

      const fallback = `${rawValue}${unit ? ` ${unit}` : ''}`;
      return {
        valueNumber,
        displayValue: displayValue || { ua: fallback, en: fallback },
        filterValue: String(valueNumber),
      };
    }

    if (type === AttributeType.BOOLEAN) {
      const normalized = this.valueToString(value).trim().toLowerCase();
      const valueBoolean =
        value === true ||
        normalized === 'true' ||
        normalized === '1' ||
        normalized === 'yes' ||
        normalized === 'так' ||
        normalized === 'є';

      return {
        valueBoolean,
        displayValue: displayValue || {
          ua: valueBoolean ? 'Так' : 'Ні',
          en: valueBoolean ? 'Yes' : 'No',
        },
        filterValue: valueBoolean ? 'true' : 'false',
      };
    }

    if (type === AttributeType.MULTI_ENUM) {
      const rawValues = Array.isArray(value)
        ? value.map((item) => this.valueToString(item).trim()).filter(Boolean)
        : this.valueToString(value)
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);
      const normalizedValues = rawValues.map((item) => this.toSlug(item));
      const labels = rawValues.map((item) => this.getOptionLabel(item, options));

      return {
        valueJson: normalizedValues,
        displayValue: displayValue || {
          ua: labels.map((item) => item.ua).join(', '),
          en: labels.map((item) => item.en).join(', '),
        },
        filterValue: normalizedValues.join(','),
      };
    }

    const rawValue = this.valueToString(value).trim();
    const optionLabel = this.getOptionLabel(rawValue, options);
    const fallback = displayValue || optionLabel || { ua: rawValue, en: rawValue };

    return {
      valueString: rawValue,
      displayValue: fallback,
      filterValue: this.toSlug(rawValue),
    };
  }

  private getOptionLabel(value: string, options: AttributeOption[]): LocalizedString {
    const normalized = this.toSlug(value);
    const found = options.find((item) => this.toSlug(item.value) === normalized);
    return found?.label || { ua: value, en: value };
  }

  private hasMeaningfulValue(value: unknown): boolean {
    if (Array.isArray(value))
      return value.length > 0 && value.some((item) => this.hasMeaningfulValue(item));
    if (typeof value === 'boolean') return true;
    if (typeof value === 'number') return !Number.isNaN(value);
    return this.valueToString(value).trim().length > 0;
  }

  private valueToString(value: unknown): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return String(value);
    if (typeof value === 'boolean') return value ? 'true' : 'false';

    if (Array.isArray(value)) {
      return value.map((item) => this.valueToString(item)).join(', ');
    }

    try {
      const json = JSON.stringify(value);
      return json ?? '';
    } catch {
      return '';
    }
  }

  private normalizeCode(code: string) {
    return code
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  private toSlug(value: string) {
    return value
      .trim()
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[ʼ'`]/g, '')
      .replace(/[^a-zа-яіїєґ0-9]+/gi, '-')
      .replace(/^-+|-+$/g, '');
  }
}
