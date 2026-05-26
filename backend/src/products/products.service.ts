import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { ProductsEntity } from './products.entity';
import { CreateProductDto, UpdateProductDto } from './products.dto';
import { CategoriesEntity } from '../categories/categories.entity';
import { PRODUCTS_I18N, ProductLangType } from './products.i18n';
import { RecommendationsService } from '../recommendations/recommendations.service';
import { ActivityAction } from '../recommendations/user-activity.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-log.entity';
import {
  AttributesService,
  PreparedProductAttributesResult,
} from '../attributes/attributes.service';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(ProductsEntity)
    private readonly productRepo: Repository<ProductsEntity>,
    @InjectRepository(CategoriesEntity)
    private readonly categoryRepo: Repository<CategoriesEntity>,
    private readonly recommendationsService: RecommendationsService,
    private readonly auditService: AuditService,
    private readonly attributesService: AttributesService,
  ) {}

  private generateSKU(): string {
    const randomDigits = Math.floor(100000 + Math.random() * 900000);
    return `NX-${randomDigits}`;
  }

  async create(
    dto: CreateProductDto,
    adminId: string,
    lang: ProductLangType = 'ua',
  ): Promise<ProductsEntity> {
    const t = PRODUCTS_I18N[lang];

    const existingSlug = await this.productRepo.findOne({ where: { slug: dto.slug } });
    if (existingSlug) throw new BadRequestException(t.slugExists);

    const category = await this.categoryRepo.findOne({
      where: { id: dto.categoryId },
      relations: ['catalog'],
    });
    if (!category) throw new NotFoundException(t.categoryNotFound);

    const finalCatalogId = dto.catalogId || category.catalog?.id;
    if (!finalCatalogId) throw new BadRequestException(t.catalogError);

    let sku = this.generateSKU();
    while (await this.productRepo.findOne({ where: { sku } })) {
      sku = this.generateSKU();
    }

    const preparedAttributes = await this.attributesService.prepareProductAttributes(
      category.id,
      dto.attributeValues || [],
    );

    const product = this.productRepo.create({
      name: dto.name,
      slug: dto.slug,
      description: dto.description,
      price: dto.price,
      oldPrice: dto.oldPrice,
      stock: dto.stock,
      images: dto.images || [],
      isActive: dto.isActive ?? true,
      characteristics:
        dto.attributeValues !== undefined
          ? preparedAttributes.characteristics
          : dto.characteristics || [],
      filters:
        dto.attributeValues !== undefined
          ? preparedAttributes.filters
          : {
              category: category.slug,
              product_type: category.slug,
              ...(dto.filters || {}),
            },
      sku,
      catalog: { id: finalCatalogId },
      category: { id: category.id },
    });

    const savedProduct = await this.productRepo.save(product);

    if (dto.attributeValues !== undefined) {
      await this.attributesService.replaceProductAttributeValues(
        savedProduct,
        category,
        preparedAttributes.values,
      );
    }

    await this.auditService.logAction(
      adminId,
      AuditAction.CREATE,
      'ProductsEntity',
      savedProduct.id,
      null,
      savedProduct,
    );

    return await this.findOne(savedProduct.id);
  }

  async findOne(id: string, lang: ProductLangType = 'ua'): Promise<ProductsEntity> {
    const product = await this.productRepo.findOne({
      where: { id },
      relations: ['catalog', 'category', 'attributeValues', 'attributeValues.attribute'],
    });
    if (!product) throw new NotFoundException(PRODUCTS_I18N[lang].productNotFound);
    return product;
  }

  async update(
    id: string,
    dto: UpdateProductDto,
    adminId: string,
    lang: ProductLangType = 'ua',
  ): Promise<ProductsEntity> {
    const t = PRODUCTS_I18N[lang];
    const oldProduct = await this.findOne(id, lang);

    if (dto.slug) {
      const conflict = await this.productRepo.findOne({ where: { slug: dto.slug, id: Not(id) } });
      if (conflict) throw new BadRequestException(t.slugExists);
    }

    const targetCategoryId = dto.categoryId || oldProduct.category.id;
    const category = await this.categoryRepo.findOne({
      where: { id: targetCategoryId },
      relations: ['catalog'],
    });
    if (!category) throw new NotFoundException(t.categoryNotFound);

    const finalCatalogId = dto.catalogId || category.catalog?.id || oldProduct.catalog.id;

    let generatedCharacteristics = oldProduct.characteristics;
    let generatedFilters = oldProduct.filters;
    let preparedValues: PreparedProductAttributesResult | null = null;

    if (dto.attributeValues !== undefined) {
      preparedValues = await this.attributesService.prepareProductAttributes(
        category.id,
        dto.attributeValues,
      );
      generatedCharacteristics = preparedValues.characteristics;
      generatedFilters = preparedValues.filters;
    } else if (dto.characteristics !== undefined || dto.filters !== undefined) {
      // Backward compatibility for старі форми. Для нової форми це не використовується.
      generatedCharacteristics = (dto.characteristics as any) || oldProduct.characteristics || [];
      generatedFilters = {
        category: category.slug,
        product_type: category.slug,
        ...(oldProduct.filters || {}),
        ...(dto.filters || {}),
      };
    }

    const updated = this.productRepo.merge(oldProduct, {
      name: dto.name ?? oldProduct.name,
      slug: dto.slug ?? oldProduct.slug,
      description: dto.description ?? oldProduct.description,
      price: dto.price ?? oldProduct.price,
      oldPrice: dto.oldPrice !== undefined ? dto.oldPrice : oldProduct.oldPrice,
      stock: dto.stock ?? oldProduct.stock,
      images: dto.images ?? oldProduct.images,
      isActive: dto.isActive !== undefined ? dto.isActive : oldProduct.isActive,
      characteristics: generatedCharacteristics,
      filters: generatedFilters,
      catalog: { id: finalCatalogId },
      category: { id: category.id },
    });

    const savedProduct = await this.productRepo.save(updated);

    if (preparedValues) {
      await this.attributesService.replaceProductAttributeValues(
        savedProduct,
        category,
        preparedValues.values,
      );
    }

    await this.auditService.logAction(
      adminId,
      AuditAction.UPDATE,
      'ProductsEntity',
      savedProduct.id,
      oldProduct,
      savedProduct,
    );

    return await this.findOne(savedProduct.id);
  }

  async toggleStatus(
    id: string,
    adminId: string,
    lang: ProductLangType = 'ua',
  ): Promise<ProductsEntity> {
    const product = await this.findOne(id, lang);
    const oldSnapshot = { ...product };
    product.isActive = !product.isActive;
    const saved = await this.productRepo.save(product);

    await this.auditService.logAction(
      adminId,
      AuditAction.UPDATE,
      'ProductsEntity',
      saved.id,
      oldSnapshot,
      saved,
    );
    return saved;
  }

  async remove(
    id: string,
    adminId: string,
    lang: ProductLangType = 'ua',
  ): Promise<{ success: boolean }> {
    const oldProduct = await this.findOne(id, lang);

    const result = await this.productRepo.delete(id);
    if (result.affected === 0) throw new NotFoundException(PRODUCTS_I18N[lang].productNotFound);

    await this.auditService.logAction(
      adminId,
      AuditAction.DELETE,
      'ProductsEntity',
      id,
      oldProduct,
      null,
    );

    return { success: true };
  }

  async getProductWithRating(id: string, lang: ProductLangType = 'ua') {
    const product = await this.productRepo.findOne({
      where: { id },
      relations: ['reviews'],
    });

    if (!product) throw new NotFoundException(PRODUCTS_I18N[lang].productNotFound);

    const reviewsWithRating = product.reviews.filter(
      (rev) => rev.rating !== null && rev.rating !== undefined,
    );

    const totalReviews = reviewsWithRating.length;
    const averageRating =
      totalReviews > 0
        ? reviewsWithRating.reduce((sum, rev) => sum + (rev.rating || 0), 0) / totalReviews
        : 0;

    return {
      ...product,
      averageRating: Number(averageRating.toFixed(1)),
      totalReviews,
      totalActivity: product.reviews.length,
    };
  }

  async findAll(): Promise<ProductsEntity[]> {
    return await this.productRepo.find({
      relations: ['catalog', 'category', 'attributeValues', 'attributeValues.attribute'],
      order: { createdAt: 'DESC' },
    });
  }

  async searchProducts(params: {
    query?: string;
    catalogSlug?: string;
    categorySlug?: string;
    categoryId?: string;
    filters?: Record<string, unknown>;
    userId?: string;
    minPrice?: number;
    maxPrice?: number;
    inStock?: boolean;
    sort?: string;
  }) {
    const {
      query,
      catalogSlug,
      categorySlug,
      categoryId,
      filters,
      userId,
      minPrice,
      maxPrice,
      inStock,
      sort,
    } = params;

    let activityCategoryId = categoryId;
    if (!activityCategoryId && categorySlug) {
      const category = await this.categoryRepo.findOne({ where: { slug: categorySlug } });
      activityCategoryId = category?.id;
    }

    if (userId && activityCategoryId) {
      await this.recommendationsService.logActivity(
        userId,
        activityCategoryId,
        ActivityAction.SEARCH,
      );
    }

    const qb = this.productRepo
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.catalog', 'catalog')
      .where('product.isActive = :isActive', { isActive: true });

    if (query?.trim()) {
      qb.andWhere("(product.name->>'ua' ILIKE :query OR product.name->>'en' ILIKE :query)", {
        query: `%${query.trim()}%`,
      });
    }

    if (catalogSlug) {
      qb.andWhere('catalog.slug = :catalogSlug', { catalogSlug });
    }

    if (categorySlug) {
      qb.andWhere('category.slug = :categorySlug', { categorySlug });
    }

    if (categoryId) {
      qb.andWhere('category.id = :categoryId', { categoryId });
    }

    if (minPrice !== undefined && !Number.isNaN(minPrice)) {
      qb.andWhere('product.price >= :minPrice', { minPrice });
    }
    if (maxPrice !== undefined && !Number.isNaN(maxPrice)) {
      qb.andWhere('product.price <= :maxPrice', { maxPrice });
    }

    if (inStock) {
      qb.andWhere('product.stock > 0');
    }

    const allowedFilterCodes = await this.attributesService.getFilterableCodes(
      categoryId,
      categorySlug,
    );

    let filterIndex = 0;
    for (const [rawKey, rawValue] of Object.entries(filters || {})) {
      const key = this.normalizeFilterKey(rawKey);
      if (!key || !allowedFilterCodes.has(key)) continue;

      const values = Array.isArray(rawValue) ? rawValue : String(rawValue).split(',');
      const normalizedValues = values
        .map((value) => this.attributesService.normalizeFilterValue(value))
        .filter(Boolean);

      if (normalizedValues.length === 0) continue;

      const paramName = `filter_${filterIndex}`;
      const clauses = normalizedValues.map(
        (_value, valueIndex) =>
          `CONCAT(',', COALESCE(product.filters ->> '${key}', ''), ',') ILIKE :${paramName}_${valueIndex}`,
      );
      const params = normalizedValues.reduce<Record<string, string>>((acc, value, valueIndex) => {
        acc[`${paramName}_${valueIndex}`] = `%,${value},%`;
        return acc;
      }, {});

      qb.andWhere(`(${clauses.join(' OR ')})`, params);
      filterIndex += 1;
    }

    switch (sort) {
      case 'price_asc':
        qb.orderBy('product.price', 'ASC');
        break;
      case 'price_desc':
        qb.orderBy('product.price', 'DESC');
        break;
      case 'name_asc':
        qb.orderBy("product.name->>'ua'", 'ASC');
        break;
      case 'name_desc':
        qb.orderBy("product.name->>'ua'", 'DESC');
        break;
      default:
        qb.orderBy('product.createdAt', 'DESC');
        break;
    }

    return await qb.getMany();
  }

  private normalizeFilterKey(key: string) {
    return key
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }
}
