import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, DataSource } from 'typeorm';
import { CatalogsEntity } from './catalogs.entity';
import { CreateCatalogDto, UpdateCatalogDto } from './catalogs.dto';
import { CATALOGS_I18N, CatalogLangType } from './catalogs.i18n';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-log.entity';
import { ProductsEntity } from '../products/products.entity';

interface MenuLink {
  label: string;
  filterKey: string;
  filterValue: string;
}

@Injectable()
export class CatalogsService {
  constructor(
    @InjectRepository(CatalogsEntity)
    private readonly catalogRepo: Repository<CatalogsEntity>,
    private readonly auditService: AuditService,
    private readonly dataSource: DataSource,
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

    const productRepo = this.dataSource.getRepository(ProductsEntity);

    for (const catalog of catalogs) {
      catalog.categories = (catalog.categories || [])
        .filter((category) => category.isActive)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

      for (const category of catalog.categories) {
        const products = await productRepo
          .createQueryBuilder('product')
          .leftJoin('product.category', 'category')
          .where('category.id = :categoryId', { categoryId: category.id })
          .andWhere('product.isActive = :isActive', { isActive: true })
          .select(['product.id', 'product.filters'])
          .getMany();

        (category as any).menuLinks = this.buildMenuLinksFromFilters(products);
      }
    }

    return catalogs;
  }

  private buildMenuLinksFromFilters(products: ProductsEntity[]): MenuLink[] {
    const preferredKeys = [
      'model',
      'series',
      'line',
      'brand',
      'manufacturer',
      'type',
      'formFactor',
    ];

    const result: MenuLink[] = [];
    const added = new Set<string>();

    const addValue = (filterKey: string, rawValue: unknown) => {
      const values = Array.isArray(rawValue) ? rawValue : [rawValue];

      for (const value of values) {
        if (typeof value !== 'string') continue;

        const normalizedValue = value.trim();
        if (!normalizedValue) continue;

        const label = this.formatMenuLinkLabel(normalizedValue);
        const uniqueKey = `${filterKey}:${normalizedValue}`.toLowerCase();

        if (added.has(uniqueKey)) continue;

        added.add(uniqueKey);
        result.push({
          label,
          filterKey,
          filterValue: normalizedValue,
        });

        if (result.length >= 5) return;
      }
    };

    for (const key of preferredKeys) {
      for (const product of products) {
        if (result.length >= 5) return result;
        addValue(key, product.filters?.[key]);
      }
    }

    for (const product of products) {
      if (result.length >= 5) return result;
      const filters = product.filters || {};

      for (const [key, value] of Object.entries(filters)) {
        if (result.length >= 5) return result;
        if (preferredKeys.includes(key)) continue;
        addValue(key, value);
      }
    }

    return result;
  }

  private formatMenuLinkLabel(value: string): string {
    const cleaned = value.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();

    if (!cleaned) return value;

    const hasLowerCase = /[a-zа-яіїєґ]/.test(cleaned);
    const hasUpperCase = /[A-ZА-ЯІЇЄҐ]/.test(cleaned);

    if (hasLowerCase && hasUpperCase) {
      return cleaned;
    }

    return cleaned
      .split(' ')
      .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
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
