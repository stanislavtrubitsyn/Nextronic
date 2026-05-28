import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, SelectQueryBuilder } from 'typeorm';
import { ProductsEntity } from './products.entity';
import { CreateProductDto, DuplicateProductDto, UpdateProductDto } from './products.dto';
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
import { ReviewType } from '../reviews/reviews.entity';

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

  private async generateUniqueSKU(): Promise<string> {
    const maxAttempts = 30;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const sku = this.generateSKU();
      const existing = await this.productRepo.findOne({ where: { sku } });

      if (!existing) {
        return sku;
      }
    }

    return `NX-${Date.now()}`;
  }

  private async generateUniqueSlug(baseSlug: string): Promise<string> {
    const normalizedBase = baseSlug
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9а-яіїєґ-]+/gi, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');

    let candidate = normalizedBase || `product-copy-${Date.now()}`;
    let counter = 2;

    while (await this.productRepo.findOne({ where: { slug: candidate } })) {
      candidate = `${normalizedBase}-${counter}`;
      counter += 1;
    }

    return candidate;
  }

  private buildCopyName(name: { ua: string; en: string }) {
    return {
      ua: `${name.ua} (копія)`,
      en: `${name.en} (copy)`,
    };
  }

  private mapExistingAttributeValues(product: ProductsEntity) {
    return (product.attributeValues || []).map((item) => ({
      code: item.code,
      value:
        item.valueNumber !== null && item.valueNumber !== undefined
          ? Number(item.valueNumber)
          : item.valueBoolean !== null && item.valueBoolean !== undefined
            ? item.valueBoolean
            : item.valueString !== null && item.valueString !== undefined
              ? item.valueString
              : Array.isArray(item.valueJson)
                ? (item.valueJson as string[])
                : '',
      displayValue: item.displayValue,
    }));
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

    const sku = await this.generateUniqueSKU();

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

  async duplicate(
    id: string,
    dto: DuplicateProductDto,
    adminId: string,
    lang: ProductLangType = 'ua',
  ): Promise<ProductsEntity> {
    const t = PRODUCTS_I18N[lang];
    const originalProduct = await this.findOne(id, lang);

    const targetCategoryId = dto.categoryId || originalProduct.category.id;
    const category = await this.categoryRepo.findOne({
      where: { id: targetCategoryId },
      relations: ['catalog'],
    });
    if (!category) throw new NotFoundException(t.categoryNotFound);

    const finalCatalogId = dto.catalogId || category.catalog?.id || originalProduct.catalog.id;
    if (!finalCatalogId) throw new BadRequestException(t.catalogError);

    const slug = dto.slug || (await this.generateUniqueSlug(`${originalProduct.slug}-copy`));
    const existingSlug = await this.productRepo.findOne({ where: { slug } });
    if (existingSlug) throw new BadRequestException(t.slugExists);

    const attributeValues =
      dto.attributeValues !== undefined
        ? dto.attributeValues
        : this.mapExistingAttributeValues(originalProduct);

    const preparedAttributes = await this.attributesService.prepareProductAttributes(
      category.id,
      attributeValues,
    );

    const product = this.productRepo.create({
      name: dto.name || this.buildCopyName(originalProduct.name),
      slug,
      description: dto.description !== undefined ? dto.description : originalProduct.description,
      price: dto.price !== undefined ? dto.price : Number(originalProduct.price),
      oldPrice:
        dto.oldPrice !== undefined
          ? dto.oldPrice
          : originalProduct.oldPrice !== undefined
            ? Number(originalProduct.oldPrice)
            : undefined,
      stock: dto.stock !== undefined ? dto.stock : 0,
      images: dto.images !== undefined ? dto.images : originalProduct.images || [],
      isActive: dto.isActive ?? originalProduct.isActive,
      characteristics: preparedAttributes.characteristics,
      filters: preparedAttributes.filters,
      sku: await this.generateUniqueSKU(),
      catalog: { id: finalCatalogId },
      category: { id: category.id },
    });

    const savedProduct = await this.productRepo.save(product);

    await this.attributesService.replaceProductAttributeValues(
      savedProduct,
      category,
      preparedAttributes.values,
    );

    await this.auditService.logAction(
      adminId,
      AuditAction.CREATE,
      'ProductsEntity',
      savedProduct.id,
      originalProduct,
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

  async getCategoryPageProducts(params: {
    categorySlug: string;
    query?: string;
    filters?: Record<string, unknown>;
    minPrice?: number;
    maxPrice?: number;
    sort?: string;
    page?: number;
    limit?: number;
    lang?: 'ua' | 'en';
  }) {
    const {
      categorySlug,
      query,
      filters = {},
      minPrice,
      maxPrice,
      sort,
      page = 1,
      limit = 20,
      lang = 'ua',
    } = params;

    const category = await this.categoryRepo.findOne({
      where: { slug: categorySlug, isActive: true },
      relations: ['catalog'],
    });

    if (!category) {
      throw new NotFoundException(PRODUCTS_I18N[lang].categoryNotFound);
    }

    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(Math.max(1, Number(limit) || 20), 60);

    const allowedFilterCodes = await this.attributesService.getFilterableCodes(
      category.id,
      category.slug,
    );
    const schema = await this.attributesService.getCategoryFormSchema(category.id);

    const baseProducts = await this.productRepo.find({
      where: {
        category: { id: category.id },
        isActive: true,
      },
      relations: ['category', 'catalog'],
      order: { createdAt: 'DESC' },
    });

    const qb = this.productRepo
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.catalog', 'catalog')
      .where('product.isActive = :isActive', { isActive: true })
      .andWhere('category.id = :categoryId', { categoryId: category.id });

    if (query?.trim()) {
      qb.andWhere("(product.name->>'ua' ILIKE :query OR product.name->>'en' ILIKE :query)", {
        query: `%${query.trim()}%`,
      });
    }

    if (minPrice !== undefined && !Number.isNaN(minPrice)) {
      qb.andWhere('product.price >= :minPrice', { minPrice });
    }

    if (maxPrice !== undefined && !Number.isNaN(maxPrice)) {
      qb.andWhere('product.price <= :maxPrice', { maxPrice });
    }

    this.applyProductFacetFilters(qb, filters, allowedFilterCodes);

    const total = await qb.clone().getCount();

    this.applyCategorySort(qb, sort);

    const products = await qb
      .skip((safePage - 1) * safeLimit)
      .take(safeLimit)
      .getMany();

    const totalPages = Math.max(1, Math.ceil(total / safeLimit));

    return {
      category: {
        id: category.id,
        slug: category.slug,
        name: category.name,
      },
      catalog: category.catalog
        ? {
            id: category.catalog.id,
            slug: category.catalog.slug,
            name: category.catalog.name,
          }
        : null,
      products: products.map((product) => this.mapCategoryPageProduct(product)),
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages,
        hasMore: safePage < totalPages,
      },
      priceRange: this.buildPriceRange(baseProducts),
      filters: this.buildCategoryFilterGroups(schema.attributes || [], baseProducts, filters, lang),
      appliedFilters: this.buildAppliedFilterChips(
        schema.attributes || [],
        filters,
        minPrice,
        maxPrice,
      ),
    };
  }

  async getProductPageBySlug(slug: string, lang: ProductLangType = 'ua') {
    const product = await this.productRepo.findOne({
      where: { slug, isActive: true },
      relations: [
        'catalog',
        'category',
        'attributeValues',
        'attributeValues.attribute',
        'reviews',
        'reviews.user',
        'reviews.user.profile',
        'reviews.replies',
        'reviews.replies.user',
        'reviews.replies.user.profile',
      ],
    });

    if (!product) throw new NotFoundException(PRODUCTS_I18N[lang].productNotFound);

    const reviewSummary = this.buildProductReviewSummary(product);
    const recommendations = await this.buildProductPageRecommendations(product);
    const variants = await this.buildProductVariantGroups(product);

    return {
      product: {
        ...this.mapProductSummary(product, reviewSummary.averageRating, reviewSummary.reviewsCount),
        sku: product.sku,
        description: product.description || null,
        catalog: product.catalog
          ? {
              id: product.catalog.id,
              slug: product.catalog.slug,
              name: product.catalog.name,
            }
          : null,
        category: product.category
          ? {
              id: product.category.id,
              slug: product.category.slug,
              name: product.category.name,
            }
          : null,
        filters: product.filters || {},
        characteristics: product.characteristics || [],
        attributeValues: this.mapProductAttributeValues(product),
        shortCharacteristics: this.buildShortCharacteristics(product),
      },
      variants,
      rating: reviewSummary,
      reviews: this.mapProductReviews(product, ReviewType.REVIEW),
      questions: this.mapProductReviews(product, ReviewType.QUESTION),
      recommendations,
    };
  }

  private mapProductSummary(product: ProductsEntity, rating = 0, reviewsCount = 0) {
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
      rating,
      reviewsCount,
      category: product.category
        ? {
            id: product.category.id,
            slug: product.category.slug,
            name: product.category.name,
          }
        : undefined,
    };
  }

  private buildProductReviewSummary(product: ProductsEntity) {
    const rootReviews = (product.reviews || []).filter((review) => !review.parent);
    const reviews = rootReviews.filter((review) => review.type === ReviewType.REVIEW);
    const questions = rootReviews.filter((review) => review.type === ReviewType.QUESTION);

    const distribution = [5, 4, 3, 2, 1].reduce<Record<number, number>>((acc, value) => {
      acc[value] = reviews.filter((review) => review.rating === value).length;
      return acc;
    }, {});

    const ratingSum = reviews.reduce((sum, review) => sum + (review.rating || 0), 0);
    const averageRating = reviews.length > 0 ? Number((ratingSum / reviews.length).toFixed(1)) : 0;

    return {
      averageRating,
      reviewsCount: reviews.length,
      questionsCount: questions.length,
      totalActivity: reviews.length + questions.length,
      distribution,
    };
  }

  private mapProductReviews(product: ProductsEntity, type: ReviewType) {
    return (product.reviews || [])
      .filter((review) => !review.parent && review.type === type)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((review) => this.mapProductReview(review));
  }

  private mapProductReview(review: any): Record<string, unknown> {
    return {
      id: review.id,
      type: review.type,
      rating: review.rating || null,
      comment: review.comment,
      advantages: review.advantages || null,
      disadvantages: review.disadvantages || null,
      photos: review.photos || [],
      isVerifiedPurchase: review.isVerifiedPurchase,
      likesCount: (review.likedUserIds || []).length,
      dislikesCount: (review.dislikedUserIds || []).length,
      userReaction: null,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
      author: this.mapReviewAuthor(review.user),
      replies: (review.replies || [])
        .slice()
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        .map((reply) => this.mapProductReview(reply)),
    };
  }

  private mapReviewAuthor(user: any) {
    const profile = user?.profile;
    const name = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ').trim();

    return {
      id: user?.id || '',
      name: name || profile?.email || user?.email || 'Користувач',
    };
  }

  private mapProductAttributeValues(product: ProductsEntity) {
    return (product.attributeValues || [])
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((value) => ({
        code: value.code,
        name: value.attribute?.name || { ua: value.code, en: value.code },
        group: value.attribute?.group || { ua: 'Характеристики', en: 'Specifications' },
        value: value.displayValue,
        filterValue: value.filterValue || null,
        sortOrder: value.sortOrder,
      }));
  }

  private buildShortCharacteristics(product: ProductsEntity) {
    const priorityCodes = [
      'screen_size',
      'screen_type',
      'processor_model',
      'main_camera',
      'storage',
      'ram',
    ];

    const values = new Map((product.attributeValues || []).map((value) => [value.code, value]));

    return priorityCodes
      .map((code) => values.get(code))
      .filter((value): value is NonNullable<typeof value> => Boolean(value))
      .slice(0, 4)
      .map((value) => ({
        code: value.code,
        name: value.attribute?.name || { ua: value.code, en: value.code },
        value: value.displayValue,
      }));
  }

  private async buildProductVariantGroups(product: ProductsEntity) {
    const sameModelVariantCodes = ['color_manufacturer', 'color', 'main_color', 'storage'];
    const productFilters = product.filters || {};
    const brand = productFilters.brand;
    const model = productFilters.model;
    const productLine = productFilters.product_line;
    const series = productFilters.series;

    const sameModelQb = this.productRepo
      .createQueryBuilder('variant')
      .leftJoinAndSelect('variant.category', 'category')
      .leftJoinAndSelect('variant.attributeValues', 'attributeValues')
      .leftJoinAndSelect('attributeValues.attribute', 'attribute')
      .where('variant.isActive = :isActive', { isActive: true })
      .andWhere('category.id = :categoryId', { categoryId: product.category.id });

    if (brand) {
      sameModelQb.andWhere("variant.filters ->> 'brand' = :brand", { brand: String(brand) });
    }

    if (model) {
      sameModelQb.andWhere("variant.filters ->> 'model' = :model", { model: String(model) });
    }

    const sameModelVariants = await sameModelQb.orderBy('variant.createdAt', 'DESC').getMany();

    const variantGroups = sameModelVariantCodes
      .map((code) => this.buildVariantGroupFromProducts(code, sameModelVariants, product))
      .filter((group): group is NonNullable<typeof group> => Boolean(group));

    const lineModelGroup = await this.buildLineModelVariantGroup(product, {
      brand: brand === undefined || brand === null ? undefined : String(brand),
      productLine:
        productLine === undefined || productLine === null ? undefined : String(productLine),
      series: series === undefined || series === null ? undefined : String(series),
      model: model === undefined || model === null ? undefined : String(model),
    });

    if (lineModelGroup) {
      const colorGroupIndex = variantGroups.findIndex((group) =>
        ['color_manufacturer', 'color', 'main_color'].includes(group.code),
      );
      const insertIndex = colorGroupIndex >= 0 ? colorGroupIndex + 1 : 0;
      variantGroups.splice(insertIndex, 0, lineModelGroup);
    }

    return variantGroups;
  }

  private buildVariantGroupFromProducts(
    code: string,
    variants: ProductsEntity[],
    currentProduct: ProductsEntity,
  ) {
    const optionsByValue = new Map<
      string,
      {
        value: string;
        label: { ua: string; en: string };
        slug: string;
        selected: boolean;
        image: string | null;
      }
    >();

    for (const variant of variants) {
      const attributeValue = (variant.attributeValues || []).find((item) => item.code === code);
      if (!attributeValue?.filterValue) continue;

      const existingOption = optionsByValue.get(attributeValue.filterValue);
      const optionImage = variant.images?.[0] || null;

      if (!existingOption) {
        optionsByValue.set(attributeValue.filterValue, {
          value: attributeValue.filterValue,
          label: attributeValue.displayValue,
          slug: variant.slug,
          selected: variant.id === currentProduct.id,
          image: optionImage,
        });
        continue;
      }

      if (!existingOption.image && optionImage) {
        existingOption.image = optionImage;
      }

      if (variant.id === currentProduct.id) {
        existingOption.slug = variant.slug;
        existingOption.selected = true;
        existingOption.image = optionImage || existingOption.image;
      }
    }

    const options = Array.from(optionsByValue.values());
    if (options.length <= 1) return null;

    const sourceAttribute = variants
      .flatMap((variant) => variant.attributeValues || [])
      .find((item) => item.code === code)?.attribute;

    return {
      code,
      label: sourceAttribute?.name || { ua: code, en: code },
      options,
    };
  }

  private async buildLineModelVariantGroup(
    product: ProductsEntity,
    filters: {
      brand?: string;
      productLine?: string;
      series?: string;
      model?: string;
    },
  ) {
    const lineFilterCode = filters.productLine ? 'product_line' : filters.series ? 'series' : null;
    const lineFilterValue = filters.productLine || filters.series;

    if (!filters.brand || !lineFilterCode || !lineFilterValue) return null;

    const qb = this.productRepo
      .createQueryBuilder('variant')
      .leftJoinAndSelect('variant.category', 'category')
      .leftJoinAndSelect('variant.attributeValues', 'attributeValues')
      .leftJoinAndSelect('attributeValues.attribute', 'attribute')
      .where('variant.isActive = :isActive', { isActive: true })
      .andWhere('category.id = :categoryId', { categoryId: product.category.id })
      .andWhere("variant.filters ->> 'brand' = :brand", { brand: filters.brand })
      .andWhere(`variant.filters ->> '${lineFilterCode}' = :lineFilterValue`, { lineFilterValue });

    const variants = await qb.orderBy('variant.createdAt', 'DESC').getMany();
    const optionsByModel = new Map<
      string,
      {
        value: string;
        label: { ua: string; en: string };
        slug: string;
        selected: boolean;
        image: string | null;
      }
    >();

    for (const variant of variants) {
      const modelValue = (variant.attributeValues || []).find((item) => item.code === 'model');
      if (!modelValue?.filterValue) continue;

      const existingOption = optionsByModel.get(modelValue.filterValue);
      const optionImage = variant.images?.[0] || null;
      const selected = modelValue.filterValue === filters.model;

      if (!existingOption) {
        optionsByModel.set(modelValue.filterValue, {
          value: modelValue.filterValue,
          label: modelValue.displayValue,
          slug: selected ? product.slug : variant.slug,
          selected,
          image: selected ? product.images?.[0] || optionImage : optionImage,
        });
        continue;
      }

      if (!existingOption.image && optionImage) {
        existingOption.image = optionImage;
      }

      if (selected) {
        existingOption.slug = product.slug;
        existingOption.selected = true;
        existingOption.image = product.images?.[0] || optionImage || existingOption.image;
      }
    }

    const options = Array.from(optionsByModel.values());
    if (options.length <= 1) return null;

    return {
      code: 'line_model',
      label: { ua: 'Модель', en: 'Model' },
      options,
    };
  }

  private async buildProductPageRecommendations(product: ProductsEntity) {
    const [similar, catalogProducts, personal] = await Promise.all([
      this.productRepo.find({
        where: {
          category: { id: product.category.id },
          id: Not(product.id),
          isActive: true,
        },
        relations: ['category'],
        order: { createdAt: 'DESC' },
        take: 12,
      }),
      this.productRepo.find({
        where: {
          catalog: { id: product.catalog.id },
          id: Not(product.id),
          isActive: true,
        },
        relations: ['category'],
        order: { createdAt: 'DESC' },
        take: 12,
      }),
      this.productRepo.find({
        where: {
          id: Not(product.id),
          isActive: true,
        },
        relations: ['category'],
        order: { createdAt: 'DESC' },
        take: 12,
      }),
    ]);

    const accessoryProducts = catalogProducts.filter((item) => {
      const slug = item.category?.slug || '';
      const nameUa = item.category?.name?.ua || '';
      const nameEn = item.category?.name?.en || '';
      return /access|аксесуар|чохол|кабель|навуш/i.test(`${slug} ${nameUa} ${nameEn}`);
    });

    return {
      accessories: (accessoryProducts.length ? accessoryProducts : catalogProducts).map((item) =>
        this.mapProductSummary(item),
      ),
      similar: similar.map((item) => this.mapProductSummary(item)),
      personal: personal.map((item) => this.mapProductSummary(item)),
    };
  }

  private applyProductFacetFilters(
    qb: SelectQueryBuilder<ProductsEntity>,
    filters: Record<string, unknown>,
    allowedFilterCodes: Set<string>,
  ) {
    let filterIndex = 0;

    for (const [rawKey, rawValue] of Object.entries(filters || {})) {
      const key = this.normalizeFilterKey(rawKey);
      if (!key) continue;

      const values = Array.isArray(rawValue) ? rawValue : String(rawValue).split(',');
      const normalizedValues = values
        .map((value) => this.attributesService.normalizeFilterValue(value))
        .filter(Boolean);

      if (normalizedValues.length === 0) continue;

      if (key === 'availability') {
        const hasInStock = normalizedValues.includes('in-stock');
        const hasOutOfStock = normalizedValues.includes('out-of-stock');

        if (hasInStock && !hasOutOfStock) {
          qb.andWhere('product.stock > 0');
        }

        if (hasOutOfStock && !hasInStock) {
          qb.andWhere('product.stock <= 0');
        }

        continue;
      }

      if (!allowedFilterCodes.has(key)) continue;

      const paramName = `category_filter_${filterIndex}`;
      const clauses = normalizedValues.map(
        (_value, valueIndex) =>
          `CONCAT(',', COALESCE(product.filters ->> '${key}', ''), ',') ILIKE :${paramName}_${valueIndex}`,
      );
      const queryParams = normalizedValues.reduce<Record<string, string>>(
        (acc, value, valueIndex) => {
          acc[`${paramName}_${valueIndex}`] = `%,${value},%`;
          return acc;
        },
        {},
      );

      qb.andWhere(`(${clauses.join(' OR ')})`, queryParams);
      filterIndex += 1;
    }
  }

  private applyCategorySort(qb: SelectQueryBuilder<ProductsEntity>, sort?: string) {
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
      case 'newest':
        qb.orderBy('product.createdAt', 'DESC');
        break;
      case 'popular':
      default:
        qb.orderBy('product.createdAt', 'DESC');
        break;
    }
  }

  private mapCategoryPageProduct(product: ProductsEntity) {
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
      rating: 0,
      reviewsCount: 0,
      category: product.category
        ? {
            id: product.category.id,
            name: product.category.name,
          }
        : undefined,
    };
  }

  private buildPriceRange(products: ProductsEntity[]) {
    if (products.length === 0) {
      return { min: 0, max: 0 };
    }

    const prices = products
      .map((product) => Number(product.price))
      .filter((price) => !Number.isNaN(price));

    if (prices.length === 0) {
      return { min: 0, max: 0 };
    }

    return {
      min: Math.floor(Math.min(...prices)),
      max: Math.ceil(Math.max(...prices)),
    };
  }

  private buildCategoryFilterGroups(
    schemaAttributes: Array<{
      code: string;
      name: { ua: string; en: string };
      type: string;
      unit?: string;
      options?: Array<{ label: { ua: string; en: string }; value: string }>;
      filterable: boolean;
      sortOrder: number;
    }>,
    products: ProductsEntity[],
    activeFilters: Record<string, unknown>,
    lang: 'ua' | 'en',
  ) {
    const groups: Array<{
      code: string;
      label: { ua: string; en: string };
      type: 'checkbox' | 'chip';
      sortOrder: number;
      options: Array<{
        value: string;
        label: { ua: string; en: string };
        count: number;
        selected: boolean;
      }>;
    }> = [];

    const availabilityOptions = [
      {
        value: 'in-stock',
        label: { ua: 'Є в наявності', en: 'In stock' },
        count: products.filter((product) => product.stock > 0).length,
        selected: this.getSelectedFilterValues(activeFilters.availability).includes('in-stock'),
      },
      {
        value: 'out-of-stock',
        label: { ua: 'Немає в наявності', en: 'Out of stock' },
        count: products.filter((product) => product.stock <= 0).length,
        selected: this.getSelectedFilterValues(activeFilters.availability).includes('out-of-stock'),
      },
    ].filter((option) => option.count > 0);

    for (const attribute of schemaAttributes) {
      const code = this.normalizeFilterKey(attribute.code);
      if (!attribute.filterable || !code) continue;
      if (['category', 'catalog', 'product_type'].includes(code)) continue;

      const counts = new Map<string, number>();

      for (const product of products) {
        const values = this.getProductFilterValues(product, code);
        for (const value of values) {
          counts.set(value, (counts.get(value) || 0) + 1);
        }
      }

      if (counts.size === 0) continue;

      const selectedValues = this.getSelectedFilterValues(activeFilters[code]);
      const options = Array.from(counts.entries())
        .map(([value, count]) => ({
          value,
          label: this.buildFilterOptionLabel(value, attribute),
          count,
          selected: selectedValues.includes(value),
        }))
        .sort((a, b) => {
          const selectedDiff = Number(b.selected) - Number(a.selected);
          if (selectedDiff !== 0) return selectedDiff;
          const countDiff = b.count - a.count;
          if (countDiff !== 0 && ['brand', 'series', 'model'].includes(code)) return countDiff;
          return (a.label[lang] || a.label.ua).localeCompare(
            b.label[lang] || b.label.ua,
            lang === 'ua' ? 'uk' : 'en',
            {
              sensitivity: 'base',
              numeric: true,
            },
          );
        });

      groups.push({
        code,
        label: attribute.name,
        type: this.getFilterDisplayType(code),
        sortOrder: this.getFilterSortOrder(code, attribute.sortOrder),
        options,
      });
    }

    if (availabilityOptions.length > 0) {
      groups.push({
        code: 'availability',
        label: { ua: 'Наявність', en: 'Availability' },
        type: 'checkbox',
        sortOrder: 35,
        options: availabilityOptions,
      });
    }

    return groups.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  private buildAppliedFilterChips(
    schemaAttributes: Array<{
      code: string;
      name: { ua: string; en: string };
      unit?: string;
      options?: Array<{ label: { ua: string; en: string }; value: string }>;
    }>,
    activeFilters: Record<string, unknown>,
    minPrice?: number,
    maxPrice?: number,
  ) {
    const chips: Array<{
      code: string;
      value: string;
      label: { ua: string; en: string };
    }> = [];

    const attributesByCode = new Map(
      schemaAttributes.map((attribute) => [this.normalizeFilterKey(attribute.code), attribute]),
    );

    for (const [rawCode, rawValue] of Object.entries(activeFilters || {})) {
      const code = this.normalizeFilterKey(rawCode);
      if (!code) continue;

      const values = this.getSelectedFilterValues(rawValue);
      if (values.length === 0) continue;

      if (code === 'availability') {
        for (const value of values) {
          chips.push({
            code,
            value,
            label:
              value === 'in-stock'
                ? { ua: 'Наявність: Є в наявності', en: 'Availability: In stock' }
                : { ua: 'Наявність: Немає в наявності', en: 'Availability: Out of stock' },
          });
        }
        continue;
      }

      const attribute = attributesByCode.get(code);
      if (!attribute) continue;

      for (const value of values) {
        const optionLabel = this.buildFilterOptionLabel(value, attribute);
        chips.push({
          code,
          value,
          label: {
            ua: `${attribute.name.ua}: ${optionLabel.ua}`,
            en: `${attribute.name.en}: ${optionLabel.en}`,
          },
        });
      }
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      const min =
        minPrice !== undefined && !Number.isNaN(minPrice) ? this.formatNumber(minPrice) : '';
      const max =
        maxPrice !== undefined && !Number.isNaN(maxPrice) ? this.formatNumber(maxPrice) : '';
      chips.push({
        code: 'price',
        value: 'price',
        label: {
          ua: `Ціна: ${min ? `від ${min} ₴` : ''}${min && max ? ' до ' : ''}${max ? `${max} ₴` : ''}`,
          en: `Price: ${min ? `from ${min} ₴` : ''}${min && max ? ' to ' : ''}${max ? `${max} ₴` : ''}`,
        },
      });
    }

    return chips;
  }

  private getProductFilterValues(product: ProductsEntity, code: string): string[] {
    const rawValue = product.filters?.[code];
    if (rawValue === undefined || rawValue === null) return [];

    const rawValues = Array.isArray(rawValue)
      ? rawValue
      : this.stringifyFilterInput(rawValue).split(',');

    return rawValues
      .map((value) => this.attributesService.normalizeFilterValue(value))
      .filter(Boolean);
  }

  private getSelectedFilterValues(value: unknown): string[] {
    if (value === undefined || value === null) return [];
    const rawValues = Array.isArray(value) ? value : this.stringifyFilterInput(value).split(',');
    return rawValues
      .map((item) => this.attributesService.normalizeFilterValue(item))
      .filter(Boolean);
  }

  private stringifyFilterInput(value: unknown): string {
    if (value === undefined || value === null) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return `${value}`;
    if (typeof value === 'boolean') return value ? 'true' : 'false';

    try {
      return JSON.stringify(value) ?? '';
    } catch {
      return '';
    }
  }

  private buildFilterOptionLabel(
    value: string,
    attribute: {
      code: string;
      name?: { ua: string; en: string };
      unit?: string;
      options?: Array<{ label: { ua: string; en: string }; value: string }>;
    },
  ) {
    const normalizedValue = this.attributesService.normalizeFilterValue(value);
    const option = (attribute.options || []).find(
      (item) => this.attributesService.normalizeFilterValue(item.value) === normalizedValue,
    );

    if (option) return option.label;

    const label = this.formatFilterValueLabel(value, attribute.unit);
    return { ua: label, en: label };
  }

  private formatFilterValueLabel(value: string, unit?: string): string {
    const cleaned = value.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
    const knownUnits: Record<string, string> = {
      ГБ: 'ГБ',
      МБ: 'МБ',
      ТБ: 'ТБ',
      Гц: 'Гц',
      Вт: 'Вт',
      мАг: 'мАг',
      ядер: 'ядер',
      г: 'г',
      мм: 'мм',
    };

    const formatted = cleaned
      .split(' ')
      .map((word) => {
        const lowerWord = word.toLowerCase();
        if (['iphone', 'ipad', 'macbook'].includes(lowerWord))
          return lowerWord === 'iphone' ? 'iPhone' : word;
        if (
          ['oled', 'amoled', 'ips', 'ssd', 'hdd', 'ram', 'usb', 'nfc', 'gps', 'ai'].includes(
            lowerWord,
          )
        )
          return word.toUpperCase();
        return word ? word[0].toUpperCase() + word.slice(1) : word;
      })
      .join(' ');

    const shouldAppendUnit =
      unit &&
      !formatted.toLowerCase().includes(unit.toLowerCase()) &&
      /^\d+(?:[.,]\d+)?$/.test(cleaned);

    return shouldAppendUnit ? `${formatted} ${knownUnits[unit] || unit}` : formatted;
  }

  private getFilterDisplayType(code: string): 'checkbox' | 'chip' {
    if (['storage', 'ram', 'screen_size', 'refresh_rate'].includes(code)) return 'chip';
    return 'checkbox';
  }

  private getFilterSortOrder(code: string, fallback: number): number {
    const priority: Record<string, number> = {
      brand: 10,
      series: 20,
      model: 25,
      availability: 35,
      storage: 40,
      ram: 50,
      sim_count: 60,
      wireless_technologies: 70,
      ai_integrated: 80,
      body_protection: 90,
      protection_class: 100,
      battery_capacity: 110,
      charging_power: 120,
      processor_model: 130,
      screen_size: 140,
      sim_size: 150,
      esim_support: 160,
      operating_system: 170,
      screen_type: 180,
      refresh_rate: 190,
      front_camera: 200,
      stabilization: 210,
      memory_expansion: 220,
      color: 230,
      main_color: 230,
      cpu_cores: 240,
      body_material: 250,
    };

    return priority[code] ?? fallback + 1000;
  }

  private formatNumber(value: number): string {
    return new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 0 }).format(value);
  }

  private normalizeFilterKey(key: string) {
    return key
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }
}
