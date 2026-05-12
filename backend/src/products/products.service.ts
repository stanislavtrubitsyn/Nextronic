import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { ProductsEntity } from './products.entity';
import { CreateProductDto, UpdateProductDto } from './products.dto';
import { CategoriesEntity } from '../categories/categories.entity';
import { PRODUCTS_I18N, ProductLangType } from './products.i18n';
import { RecommendationsService } from '../recommendations/recommendations.service';
import { ActivityAction } from '../recommendations/user-activity.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(ProductsEntity)
    private readonly productRepo: Repository<ProductsEntity>,
    @InjectRepository(CategoriesEntity)
    private readonly categoryRepo: Repository<CategoriesEntity>,
    private readonly recommendationsService: RecommendationsService,
  ) {}

  private generateSKU(): string {
    const randomDigits = Math.floor(100000 + Math.random() * 900000);
    return `NX-${randomDigits}`;
  }

  async create(dto: CreateProductDto, lang: ProductLangType = 'ua'): Promise<ProductsEntity> {
    const t = PRODUCTS_I18N[lang];

    const existingSlug = await this.productRepo.findOne({ where: { slug: dto.slug } });
    if (existingSlug) throw new BadRequestException(t.slugExists);

    const category = await this.categoryRepo.findOne({
      where: { id: dto.categoryId },
      relations: ['catalog'],
    });

    if (!category) throw new NotFoundException(t.categoryNotFound);

    const finalCatalogId = dto.catalogId || (category.catalog ? category.catalog.id : null);
    if (!finalCatalogId) throw new BadRequestException(t.catalogError);

    let sku = this.generateSKU();
    let isSkuUnique = false;
    while (!isSkuUnique) {
      const existingSku = await this.productRepo.findOne({ where: { sku } });
      if (!existingSku) {
        isSkuUnique = true;
      } else {
        sku = this.generateSKU();
      }
    }

    const product = this.productRepo.create({
      ...dto,
      sku,
      catalog: { id: finalCatalogId },
      category: { id: dto.categoryId },
    });

    return await this.productRepo.save(product);
  }

  async findOne(id: string, lang: ProductLangType = 'ua'): Promise<ProductsEntity> {
    const product = await this.productRepo.findOne({
      where: { id },
      relations: ['catalog', 'category'],
    });
    if (!product) throw new NotFoundException(PRODUCTS_I18N[lang].productNotFound);
    return product;
  }

  async update(
    id: string,
    dto: UpdateProductDto,
    lang: ProductLangType = 'ua',
  ): Promise<ProductsEntity> {
    const t = PRODUCTS_I18N[lang];
    const product = await this.findOne(id, lang);

    if (dto.slug) {
      const conflict = await this.productRepo.findOne({ where: { slug: dto.slug, id: Not(id) } });
      if (conflict) throw new BadRequestException(t.slugExists);
    }

    const { catalogId, categoryId, ...rest } = dto;

    let finalCatalogId = catalogId;
    if (categoryId && !catalogId) {
      const category = await this.categoryRepo.findOne({
        where: { id: categoryId },
        relations: ['catalog'],
      });
      if (category && category.catalog) finalCatalogId = category.catalog.id;
    }

    const updated = this.productRepo.merge(product, {
      ...rest,
      catalog: finalCatalogId ? { id: finalCatalogId } : product.catalog,
      category: categoryId ? { id: categoryId } : product.category,
    });

    return await this.productRepo.save(updated);
  }

  async remove(id: string, lang: ProductLangType = 'ua'): Promise<{ success: boolean }> {
    const result = await this.productRepo.delete(id);
    if (result.affected === 0) throw new NotFoundException(PRODUCTS_I18N[lang].productNotFound);
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
      relations: ['catalog', 'category'],
      order: { createdAt: 'DESC' },
    });
  }

  //МЕТОД ПОШУКУ ТА ФІЛЬТРАЦІЇ ПО JSONB
  async searchProducts(params: {
    query?: string;
    categoryId?: string;
    filters?: Record<string, any>;
    userId?: string;
    minPrice?: number;
    maxPrice?: number;
    inStock?: boolean;
    sort?: string;
  }) {
    const { query, categoryId, filters, userId, minPrice, maxPrice, inStock, sort } = params;

    // Логіка рекомендацій
    if (userId && categoryId) {
      await this.recommendationsService.logActivity(userId, categoryId, ActivityAction.SEARCH);
    }

    // Базовий пошук у БД
    const qb = this.productRepo
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.catalog', 'catalog')
      .where('product.isActive = :isActive', { isActive: true });

    if (query) {
      qb.andWhere("(product.name->>'ua' ILIKE :query OR product.name->>'en' ILIKE :query)", {
        query: `%${query}%`,
      });
    }

    if (categoryId) {
      qb.andWhere('category.id = :categoryId', { categoryId });
    }

    //Фільтр по ціні
    if (minPrice !== undefined) {
      qb.andWhere('product.price >= :minPrice', { minPrice });
    }
    if (maxPrice !== undefined) {
      qb.andWhere('product.price <= :maxPrice', { maxPrice });
    }

    //Фільтр по наявності
    if (inStock) {
      qb.andWhere('product.stock > 0');
    }

    // ДИНАМІЧНА ФІЛЬТРАЦІЯ ПО JSONB
    if (filters && Object.keys(filters).length > 0) {
      for (const [key, value] of Object.entries(filters)) {
        if (Array.isArray(value)) {
          qb.andWhere(`product.filters ->> :key${key} IN (:...values${key})`, {
            [`key${key}`]: key,
            [`values${key}`]: value,
          });
        } else {
          qb.andWhere(`product.filters ->> :key${key} = :value${key}`, {
            [`key${key}`]: key,
            [`value${key}`]: value,
          });
        }
      }
    }

    //Сортування
    switch (sort) {
      case 'price_asc':
        qb.orderBy('product.price', 'ASC');
        break;
      case 'price_desc':
        qb.orderBy('product.price', 'DESC');
        break;
      // Тут можна додати сортування за рейтингом, коли виведеш його в окрему колонку
      default:
        qb.orderBy('product.createdAt', 'DESC'); // За замовчуванням найновіші
        break;
    }

    return await qb.getMany();
  }
}
