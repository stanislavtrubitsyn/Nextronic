import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { CatalogsEntity } from './catalogs.entity';
import { CreateCatalogDto, UpdateCatalogDto } from './catalogs.dto';
import { CATALOGS_I18N, CatalogLangType } from './catalogs.i18n';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-log.entity';
import { ProductsEntity } from '../products/products.entity';

interface LocalizedString {
  ua: string;
  en: string;
}

interface MenuLink {
  label: LocalizedString;
  filters: Record<string, string>;
}

interface MenuGroup {
  id: string;
  label: LocalizedString;
  categorySlug: string;
  categoryId: string;
  filters: Record<string, string>;
  links: MenuLink[];
}

interface ModelCandidate {
  value: string;
  releaseYear: number;
  createdAt: number;
}

interface OverviewProduct {
  id: string;
  sku: string;
  name: LocalizedString;
  slug: string;
  price: number;
  oldPrice?: number | null;
  stock: number;
  images: string[];
  category: {
    id: string;
    name: LocalizedString;
  };
}

interface OverviewModelCard {
  id: string;
  label: LocalizedString;
  image: string | null;
  productSlug: string;
  filters: Record<string, string>;
  totalProducts: number;
  releaseYear: number;
  createdAt: number;
}

export interface CatalogOverviewSection {
  id: string;
  type: 'category' | 'model_group';
  label: LocalizedString;
  categoryId: string;
  categorySlug: string;
  filters: Record<string, string>;
  totalItems: number;
  products?: OverviewProduct[];
  models?: OverviewModelCard[];
}

@Injectable()
export class CatalogsService {
  constructor(
    @InjectRepository(CatalogsEntity)
    private readonly catalogRepo: Repository<CatalogsEntity>,
    @InjectRepository(ProductsEntity)
    private readonly productRepo: Repository<ProductsEntity>,
    private readonly auditService: AuditService,
  ) {}

  async create(
    dto: CreateCatalogDto,
    adminId: string,
    lang: CatalogLangType = 'ua',
  ): Promise<CatalogsEntity> {
    const existing = await this.catalogRepo.findOne({ where: { slug: dto.slug } });
    if (existing) throw new BadRequestException(CATALOGS_I18N[lang].slugExists);

    const newCatalog = this.catalogRepo.create({
      ...dto,
      isActive: dto.isActive ?? true,
    });
    const savedCatalog = await this.catalogRepo.save(newCatalog);

    await this.auditService.logAction(
      adminId,
      AuditAction.CREATE,
      'CatalogsEntity',
      savedCatalog.id,
      null,
      savedCatalog,
    );

    return savedCatalog;
  }

  async findAll(): Promise<CatalogsEntity[]> {
    return await this.catalogRepo.find({
      relations: ['categories'],
      order: { createdAt: 'ASC' },
    });
  }

  async findOne(id: string, lang: CatalogLangType = 'ua'): Promise<CatalogsEntity> {
    const catalog = await this.catalogRepo.findOne({ where: { id }, relations: ['categories'] });
    if (!catalog) throw new NotFoundException(CATALOGS_I18N[lang].notFound);
    return catalog;
  }

  async getMenuWithTopProducts() {
    const catalogs = await this.catalogRepo.find({
      where: { isActive: true },
      relations: ['categories'],
      order: { createdAt: 'ASC' },
    });

    for (const catalog of catalogs) {
      catalog.categories = (catalog.categories || [])
        .filter((category) => category.isActive)
        .sort((a, b) => this.compareLocalizedStrings(a.name, b.name));

      const menuGroups: MenuGroup[] = [];

      for (const category of catalog.categories) {
        const products = await this.productRepo.find({
          where: {
            catalog: { id: catalog.id },
            category: { id: category.id },
            isActive: true,
          },
          select: ['id', 'name', 'filters', 'createdAt'],
          order: { createdAt: 'DESC' },
          take: 200,
        });

        const groups = this.buildVirtualGroupsForCategory(
          category.id,
          category.slug,
          category.name,
          products,
        );

        menuGroups.push(...groups);
        (category as any).menuLinks = this.buildCategoryFallbackLinks(products);
      }

      (catalog as any).menuGroups = menuGroups
        .sort((a, b) => this.compareLocalizedStrings(a.label, b.label))
        .slice(0, 24);
    }

    return catalogs;
  }

  async getCatalogOverview(slug: string, lang: CatalogLangType = 'ua') {
    const catalog = await this.catalogRepo.findOne({
      where: { slug, isActive: true },
      relations: ['categories'],
    });

    if (!catalog) throw new NotFoundException(CATALOGS_I18N[lang].notFound);

    const categories = (catalog.categories || [])
      .filter((category) => category.isActive)
      .sort((a, b) => this.compareLocalizedStrings(a.name, b.name));

    const products = await this.productRepo.find({
      where: {
        catalog: { id: catalog.id },
        isActive: true,
      },
      relations: ['category'],
      order: { createdAt: 'DESC' },
    });

    const productsByCategory = new Map<string, ProductsEntity[]>();

    for (const product of products) {
      if (!product.category?.id) continue;
      if (!product.category.isActive) continue;

      if (!productsByCategory.has(product.category.id)) {
        productsByCategory.set(product.category.id, []);
      }

      productsByCategory.get(product.category.id)!.push(product);
    }

    const sections: CatalogOverviewSection[] = [];
    const CATEGORY_PRODUCTS_LIMIT = 9;

    for (const category of categories) {
      const categoryProducts = productsByCategory.get(category.id) || [];

      sections.push({
        id: `category:${category.id}`,
        type: 'category',
        label: category.name,
        categoryId: category.id,
        categorySlug: category.slug,
        filters: {},
        totalItems: categoryProducts.length,
        products: categoryProducts
          .slice(0, CATEGORY_PRODUCTS_LIMIT)
          .map((product) => this.mapOverviewProduct(product)),
      });

      sections.push(...this.buildOverviewModelSections(category, categoryProducts));
    }

    return {
      catalog: {
        id: catalog.id,
        slug: catalog.slug,
        name: catalog.name,
      },
      categories: categories.map((category) => ({
        id: category.id,
        slug: category.slug,
        name: category.name,
        totalProducts: productsByCategory.get(category.id)?.length || 0,
      })),
      sections,
    };
  }

  private buildOverviewModelSections(
    category: { id: string; slug: string; name: LocalizedString },
    products: ProductsEntity[],
  ): CatalogOverviewSection[] {
    if (products.length === 0) return [];

    const groupKeys = ['brand', 'manufacturer', 'compatible_brand', 'accessory_type'];
    const selectedGroupKey = groupKeys.find((key) =>
      products.some((product) => this.getFilterValue(product, key)),
    );

    if (!selectedGroupKey) return [];

    const byGroup = new Map<string, ProductsEntity[]>();

    for (const product of products) {
      const groupValue = this.getFilterValue(product, selectedGroupKey);
      if (!groupValue) continue;

      if (!byGroup.has(groupValue)) {
        byGroup.set(groupValue, []);
      }

      byGroup.get(groupValue)!.push(product);
    }

    return Array.from(byGroup.entries())
      .map(([groupValue, groupedProducts]) => {
        const groupLabel = this.formatMenuLinkLabel(groupValue);
        const filters = { [selectedGroupKey]: groupValue };
        const models = this.buildOverviewModelCards(groupedProducts, filters);
        const totalItems = this.countUniqueModels(groupedProducts);

        return {
          id: `model-group:${category.id}:${selectedGroupKey}:${groupValue}`,
          type: 'model_group' as const,
          label: {
            ua: `${category.name.ua} ${groupLabel}`,
            en: `${category.name.en} ${groupLabel}`,
          },
          categoryId: category.id,
          categorySlug: category.slug,
          filters,
          totalItems,
          models,
        };
      })
      .filter((section) => (section.models?.length || 0) > 0)
      .sort((a, b) => this.compareLocalizedStrings(a.label, b.label));
  }

  private buildOverviewModelCards(
    products: ProductsEntity[],
    baseFilters: Record<string, string>,
  ): OverviewModelCard[] {
    const MODEL_PREVIEW_LIMIT = 9;
    const modelsByValue = new Map<
      string,
      {
        modelValue: string;
        representative: ProductsEntity;
        totalProducts: number;
        releaseYear: number;
        createdAt: number;
      }
    >();

    for (const product of products) {
      const modelValue = this.getProductModelValue(product);
      if (!modelValue) continue;

      const uniqueKey = modelValue.toLowerCase();
      const releaseYear = this.getNumericFilterValue(product, 'release_year');
      const createdAt = this.getProductTimestamp(product);
      const existing = modelsByValue.get(uniqueKey);

      if (!existing) {
        modelsByValue.set(uniqueKey, {
          modelValue,
          representative: product,
          totalProducts: 1,
          releaseYear,
          createdAt,
        });
        continue;
      }

      existing.totalProducts += 1;

      if (
        releaseYear > existing.releaseYear ||
        (releaseYear === existing.releaseYear && createdAt > existing.createdAt)
      ) {
        existing.representative = product;
        existing.releaseYear = releaseYear;
        existing.createdAt = createdAt;
      }
    }

    return Array.from(modelsByValue.values())
      .sort((a, b) =>
        this.compareModelCandidates(
          {
            value: a.modelValue,
            releaseYear: a.releaseYear,
            createdAt: a.createdAt,
          },
          {
            value: b.modelValue,
            releaseYear: b.releaseYear,
            createdAt: b.createdAt,
          },
        ),
      )
      .slice(0, MODEL_PREVIEW_LIMIT)
      .map((item) => ({
        id: `${item.representative.id}:${item.modelValue}`,
        label: {
          ua: this.formatMenuLinkLabel(item.modelValue),
          en: this.formatMenuLinkLabel(item.modelValue),
        },
        image: item.representative.images?.[0] || null,
        productSlug: item.representative.slug,
        filters: {
          ...baseFilters,
          [this.getProductModelFilterKey(item.representative)]: item.modelValue,
        },
        totalProducts: item.totalProducts,
        releaseYear: item.releaseYear,
        createdAt: item.createdAt,
      }));
  }

  private countUniqueModels(products: ProductsEntity[]): number {
    const modelValues = new Set<string>();

    for (const product of products) {
      const modelValue = this.getProductModelValue(product);
      if (modelValue) modelValues.add(modelValue.toLowerCase());
    }

    return modelValues.size;
  }

  private getProductModelValue(product: ProductsEntity): string | null {
    return (
      this.getFilterValue(product, 'model') ||
      this.getFilterValue(product, 'compatible_model') ||
      null
    );
  }

  private getProductModelFilterKey(product: ProductsEntity): string {
    return this.getFilterValue(product, 'model') ? 'model' : 'compatible_model';
  }

  private mapOverviewProduct(product: ProductsEntity): OverviewProduct {
    return {
      id: product.id,
      sku: product.sku,
      name: product.name,
      slug: product.slug,
      price: Number(product.price),
      oldPrice:
        product.oldPrice === null || product.oldPrice === undefined
          ? null
          : Number(product.oldPrice),
      stock: product.stock,
      images: product.images || [],
      category: {
        id: product.category.id,
        name: product.category.name,
      },
    };
  }

  private buildVirtualGroupsForCategory(
    categoryId: string,
    categorySlug: string,
    categoryName: LocalizedString,
    products: ProductsEntity[],
  ): MenuGroup[] {
    const groupKeys = ['brand', 'manufacturer', 'compatible_brand', 'accessory_type'];

    const selectedGroupKey = groupKeys.find((key) =>
      products.some((product) => this.getFilterValue(product, key)),
    );

    if (!selectedGroupKey) {
      return [
        {
          id: `${categoryId}:all`,
          label: categoryName,
          categoryId,
          categorySlug,
          filters: {},
          links: this.buildCategoryFallbackLinks(products),
        },
      ];
    }

    const byGroup = new Map<string, ProductsEntity[]>();
    for (const product of products) {
      const value = this.getFilterValue(product, selectedGroupKey);
      if (!value) continue;
      if (!byGroup.has(value)) byGroup.set(value, []);
      byGroup.get(value)!.push(product);
    }

    return Array.from(byGroup.entries())
      .map(([groupValue, groupedProducts]) => {
        const labelValue = this.formatMenuLinkLabel(groupValue);
        const filters = { [selectedGroupKey]: groupValue };

        return {
          id: `${categoryId}:${selectedGroupKey}:${groupValue}`,
          label: {
            ua: `${categoryName.ua} ${labelValue}`,
            en: `${categoryName.en} ${labelValue}`,
          },
          categoryId,
          categorySlug,
          filters,
          links: this.buildModelLinks(groupedProducts, filters),
        };
      })
      .sort((a, b) => this.compareLocalizedStrings(a.label, b.label))
      .slice(0, 12);
  }

  private buildModelLinks(
    products: ProductsEntity[],
    baseFilters: Record<string, string>,
  ): MenuLink[] {
    const modelsByValue = new Map<string, ModelCandidate>();

    for (const product of products) {
      const value = this.getFilterValue(product, 'model');
      if (!value) continue;

      const uniqueKey = value.toLowerCase();
      const releaseYear = this.getNumericFilterValue(product, 'release_year');
      const createdAt = this.getProductTimestamp(product);
      const existing = modelsByValue.get(uniqueKey);

      if (
        !existing ||
        releaseYear > existing.releaseYear ||
        (releaseYear === existing.releaseYear && createdAt > existing.createdAt)
      ) {
        modelsByValue.set(uniqueKey, { value, releaseYear, createdAt });
      }
    }

    return Array.from(modelsByValue.values())
      .sort((a, b) => this.compareModelCandidates(a, b))
      .slice(0, 5)
      .map((model) => ({
        label: {
          ua: this.formatMenuLinkLabel(model.value),
          en: this.formatMenuLinkLabel(model.value),
        },
        filters: { ...baseFilters, model: model.value },
      }));
  }

  private buildCategoryFallbackLinks(products: ProductsEntity[]): MenuLink[] {
    const modelsByValue = new Map<string, ModelCandidate>();

    for (const product of products) {
      const value = this.getFilterValue(product, 'model');
      if (!value) continue;

      const uniqueKey = value.toLowerCase();
      const releaseYear = this.getNumericFilterValue(product, 'release_year');
      const createdAt = this.getProductTimestamp(product);
      const existing = modelsByValue.get(uniqueKey);

      if (
        !existing ||
        releaseYear > existing.releaseYear ||
        (releaseYear === existing.releaseYear && createdAt > existing.createdAt)
      ) {
        modelsByValue.set(uniqueKey, { value, releaseYear, createdAt });
      }
    }

    return Array.from(modelsByValue.values())
      .sort((a, b) => this.compareModelCandidates(a, b))
      .slice(0, 5)
      .map((model) => ({
        label: {
          ua: this.formatMenuLinkLabel(model.value),
          en: this.formatMenuLinkLabel(model.value),
        },
        filters: { model: model.value },
      }));
  }

  private getFilterValue(product: ProductsEntity, key: string): string | null {
    const value = product.filters?.[key];
    if (Array.isArray(value)) return value[0] ? String(value[0]) : null;
    if (value === undefined || value === null) return null;
    const normalized = String(value).trim();
    return normalized || null;
  }

  private getNumericFilterValue(product: ProductsEntity, key: string): number {
    const value = this.getFilterValue(product, key);
    if (!value) return 0;

    const parsed = Number(String(value).replace(',', '.'));
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  private getProductTimestamp(product: ProductsEntity): number {
    const timestamp = product.createdAt ? new Date(product.createdAt).getTime() : 0;
    return Number.isNaN(timestamp) ? 0 : timestamp;
  }

  private compareLocalizedStrings(a: LocalizedString, b: LocalizedString): number {
    const uaCompare = (a.ua || '').localeCompare(b.ua || '', 'uk', {
      sensitivity: 'base',
      numeric: true,
    });

    if (uaCompare !== 0) return uaCompare;

    return (a.en || '').localeCompare(b.en || '', 'en', {
      sensitivity: 'base',
      numeric: true,
    });
  }

  private compareModelCandidates(a: ModelCandidate, b: ModelCandidate): number {
    if (a.releaseYear !== b.releaseYear) {
      return b.releaseYear - a.releaseYear;
    }

    const semanticCompare = this.compareModelValues(a.value, b.value);
    if (semanticCompare !== 0) return semanticCompare;

    if (b.createdAt !== a.createdAt) {
      return b.createdAt - a.createdAt;
    }

    return this.formatMenuLinkLabel(a.value).localeCompare(
      this.formatMenuLinkLabel(b.value),
      'uk',
      {
        sensitivity: 'base',
        numeric: true,
      },
    );
  }

  private compareModelValues(a: string, b: string): number {
    const aScore = this.getModelSortScore(a);
    const bScore = this.getModelSortScore(b);

    if (aScore.generation !== bScore.generation) {
      return bScore.generation - aScore.generation;
    }

    if (aScore.variant !== bScore.variant) {
      return bScore.variant - aScore.variant;
    }

    return 0;
  }

  private getModelSortScore(value: string): { generation: number; variant: number } {
    const normalized = this.formatMenuLinkLabel(value).toLowerCase();

    const numbers = normalized
      .match(/\d+(?:[.,]\d+)?/g)
      ?.map((item) => Number(item.replace(',', '.')))
      .filter((item) => !Number.isNaN(item));

    const generation = numbers?.length ? Math.max(...numbers) : 0;

    let variant = 0;
    if (/pro[\s-]*max/.test(normalized)) variant = 100;
    else if (/\bultra\b/.test(normalized)) variant = 95;
    else if (/\bpro\b/.test(normalized)) variant = 90;
    else if (/\bplus\b/.test(normalized)) variant = 80;
    else if (/\bair\b/.test(normalized)) variant = 75;
    else if (/\bmax\b/.test(normalized)) variant = 70;
    else if (/\bmini\b/.test(normalized)) variant = 60;
    else if (/\bfe\b/.test(normalized)) variant = 50;

    return { generation, variant };
  }

  private formatMenuLinkLabel(value: string): string {
    const cleaned = value.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (!cleaned) return value;

    return cleaned
      .split(' ')
      .map((word) => {
        const lowerWord = word.toLowerCase();
        if (
          ['iphone', 'ipad', 'macbook', 'oled', 'amoled', 'ips', 'ssd', 'hdd'].includes(lowerWord)
        ) {
          return lowerWord === 'iphone' ? 'iPhone' : lowerWord.toUpperCase();
        }
        return word ? word[0].toUpperCase() + word.slice(1) : word;
      })
      .join(' ');
  }

  async update(
    id: string,
    dto: UpdateCatalogDto,
    adminId: string,
    lang: CatalogLangType = 'ua',
  ): Promise<CatalogsEntity> {
    const oldCatalog = await this.findOne(id, lang);

    if (dto.slug) {
      const conflict = await this.catalogRepo.findOne({ where: { slug: dto.slug, id: Not(id) } });
      if (conflict) throw new BadRequestException(CATALOGS_I18N[lang].slugInUse);
    }

    const updated = this.catalogRepo.merge(oldCatalog, dto);
    const savedCatalog = await this.catalogRepo.save(updated);

    await this.auditService.logAction(
      adminId,
      AuditAction.UPDATE,
      'CatalogsEntity',
      savedCatalog.id,
      oldCatalog,
      savedCatalog,
    );

    return savedCatalog;
  }

  async remove(
    id: string,
    adminId: string,
    lang: CatalogLangType = 'ua',
  ): Promise<{ success: boolean }> {
    const oldCatalog = await this.findOne(id, lang);

    await this.catalogRepo.remove(oldCatalog);

    await this.auditService.logAction(
      adminId,
      AuditAction.DELETE,
      'CatalogsEntity',
      id,
      oldCatalog,
      null,
    );

    return { success: true };
  }
}
