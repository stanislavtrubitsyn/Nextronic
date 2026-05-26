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
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

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

      (catalog as any).menuGroups = menuGroups.slice(0, 24);
    }

    return catalogs;
  }

  private buildVirtualGroupsForCategory(
    categoryId: string,
    categorySlug: string,
    categoryName: LocalizedString,
    products: ProductsEntity[],
  ): MenuGroup[] {
    const groupKeys = ['brand', 'manufacturer', 'compatible_brand', 'accessory_type'];
    const modelKeys = ['model', 'series', 'line', 'compatible_model'];

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
      .slice(0, 12)
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
          links: this.buildModelLinks(groupedProducts, modelKeys, filters),
        };
      });
  }

  private buildModelLinks(
    products: ProductsEntity[],
    modelKeys: string[],
    baseFilters: Record<string, string>,
  ): MenuLink[] {
    const result: MenuLink[] = [];
    const added = new Set<string>();

    for (const key of modelKeys) {
      for (const product of products) {
        if (result.length >= 5) return result;

        const value = this.getFilterValue(product, key);
        if (!value) continue;

        const uniqueKey = `${key}:${value}`.toLowerCase();
        if (added.has(uniqueKey)) continue;

        added.add(uniqueKey);
        result.push({
          label: { ua: this.formatMenuLinkLabel(value), en: this.formatMenuLinkLabel(value) },
          filters: { ...baseFilters, [key]: value },
        });
      }
    }

    return result;
  }

  private buildCategoryFallbackLinks(products: ProductsEntity[]): MenuLink[] {
    const preferredKeys = [
      'model',
      'series',
      'line',
      'brand',
      'manufacturer',
      'type',
      'accessory_type',
    ];
    const result: MenuLink[] = [];
    const added = new Set<string>();

    for (const key of preferredKeys) {
      for (const product of products) {
        if (result.length >= 5) return result;
        const value = this.getFilterValue(product, key);
        if (!value) continue;

        const uniqueKey = `${key}:${value}`.toLowerCase();
        if (added.has(uniqueKey)) continue;

        added.add(uniqueKey);
        result.push({
          label: { ua: this.formatMenuLinkLabel(value), en: this.formatMenuLinkLabel(value) },
          filters: { [key]: value },
        });
      }
    }

    return result;
  }

  private getFilterValue(product: ProductsEntity, key: string): string | null {
    const value = product.filters?.[key];
    if (Array.isArray(value)) return value[0] ? String(value[0]) : null;
    if (value === undefined || value === null) return null;
    const normalized = String(value).trim();
    return normalized || null;
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
