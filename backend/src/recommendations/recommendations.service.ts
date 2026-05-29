import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { ProductsEntity } from '../products/products.entity';
import { OrderItemEntity } from '../orders/order-item.entity';
import { ReviewType } from '../reviews/reviews.entity';
import { UserActivityEntity, ActivityAction } from './user-activity.entity';

export type LocalizedText = {
  ua?: string;
  en?: string;
};

export interface ProductRecommendationItem {
  id: string;
  sku?: string;
  name: LocalizedText;
  slug: string;
  price: number;
  oldPrice: number | null;
  stock: number;
  images: string[];
  rating: number;
  reviewsCount: number;
  category?: {
    id: string;
    slug: string;
    name: LocalizedText;
  };
}

type ProductFilterValue = string | number | boolean | string[] | number[] | boolean[] | null;

type ProductFilterMap = Record<string, ProductFilterValue>;

type CategoryScoreRow = {
  categoryId: string;
  totalScore: string;
};

type ProductIdFrequencyRow = {
  productId: string;
  frequency: string;
};

@Injectable()
export class RecommendationsService {
  constructor(
    @InjectRepository(UserActivityEntity)
    private readonly activityRepo: Repository<UserActivityEntity>,
    @InjectRepository(ProductsEntity)
    private readonly productRepo: Repository<ProductsEntity>,
    @InjectRepository(OrderItemEntity)
    private readonly orderItemRepo: Repository<OrderItemEntity>,
  ) {}

  private readonly weights: Record<ActivityAction, number> = {
    [ActivityAction.VIEW]: 1,
    [ActivityAction.SEARCH]: 2,
    [ActivityAction.COMPARE]: 3,
    [ActivityAction.WISHLIST]: 4,
    [ActivityAction.REVIEW]: 5,
    [ActivityAction.ORDER]: 10,
  };

  private readonly similarPriorityCodes = [
    'brand',
    'series',
    'product_line',
    'model',
    'storage',
    'ram',
    'screen_size',
    'screen_type',
    'processor_model',
    'main_camera',
    'battery_capacity',
    'color',
    'main_color',
    'color_manufacturer',
  ];

  private readonly accessoryCategoryPattern =
    /access|accessor|аксесуар|чохол|кейс|скло|плівк|кабель|заряд|адаптер|навуш|гарнітур|power.?bank|павербанк|holder|mount|case|cover|glass|film|charger|cable|earphone|headphone/i;

  async logActivity(userId: string, categoryId: string, action: ActivityAction): Promise<void> {
    if (!userId || !categoryId) return;

    const activity = this.activityRepo.create({
      user: { id: userId },
      category: { id: categoryId },
      action,
      weight: this.weights[action],
    });

    await this.activityRepo.save(activity);
  }

  async getPersonalized(
    userId: string,
    limit = 12,
    excludeIds: string[] = [],
  ): Promise<ProductRecommendationItem[]> {
    const safeLimit = this.normalizeLimit(limit);
    const excluded = this.uniqueIds(excludeIds);

    const topCategories = await this.activityRepo
      .createQueryBuilder('activity')
      .innerJoin('activity.category', 'category')
      .select('category.id', 'categoryId')
      .addSelect('SUM(activity.weight)', 'totalScore')
      .where('activity.userId = :userId', { userId })
      .groupBy('category.id')
      .orderBy('SUM(activity.weight)', 'DESC')
      .limit(6)
      .getRawMany<CategoryScoreRow>();

    if (!topCategories.length) {
      return await this.getFallbackProducts(safeLimit, excluded);
    }

    const categoryIds = topCategories.map((item) => item.categoryId).filter(Boolean);
    const products = await this.productRepo.find({
      where: {
        category: { id: In(categoryIds) },
        ...(excluded.length ? { id: Not(In(excluded)) } : {}),
        isActive: true,
      },
      relations: ['category', 'reviews'],
      order: { createdAt: 'DESC' },
      take: safeLimit * 3,
    });

    const scoreByCategoryId = new Map(
      topCategories.map((item) => [item.categoryId, Number(item.totalScore) || 0]),
    );

    const sortedProducts = products
      .map((product) => ({
        product,
        score: scoreByCategoryId.get(product.category?.id || '') || 0,
      }))
      .sort((left, right) => right.score - left.score)
      .map((item) => item.product);

    return this.mapUniqueProducts(sortedProducts, safeLimit, excluded);
  }

  async getSimilar(
    productId: string,
    limit = 12,
    excludeIds: string[] = [],
  ): Promise<ProductRecommendationItem[]> {
    const safeLimit = this.normalizeLimit(limit);
    const currentProduct = await this.productRepo.findOne({
      where: { id: productId, isActive: true },
      relations: ['catalog', 'category'],
    });

    if (!currentProduct?.category?.id) return [];

    const excluded = this.uniqueIds([productId, ...excludeIds]);
    const candidates = await this.productRepo.find({
      where: {
        category: { id: currentProduct.category.id },
        ...(excluded.length ? { id: Not(In(excluded)) } : {}),
        isActive: true,
      },
      relations: ['category', 'reviews'],
      order: { createdAt: 'DESC' },
      take: safeLimit * 6,
    });

    const sortedCandidates = candidates
      .map((candidate) => ({
        product: candidate,
        score: this.getSimilarityScore(currentProduct, candidate),
      }))
      .sort((left, right) => right.score - left.score)
      .map((item) => item.product);

    return this.mapUniqueProducts(sortedCandidates, safeLimit, excluded);
  }

  async getAccessories(
    productId: string,
    limit = 12,
    excludeIds: string[] = [],
  ): Promise<ProductRecommendationItem[]> {
    const safeLimit = this.normalizeLimit(limit);
    const currentProduct = await this.productRepo.findOne({
      where: { id: productId, isActive: true },
      relations: ['catalog', 'category'],
    });

    if (!currentProduct?.catalog?.id) return [];

    const excluded = this.uniqueIds([productId, ...excludeIds]);
    const catalogProducts = await this.productRepo.find({
      where: {
        catalog: { id: currentProduct.catalog.id },
        ...(excluded.length ? { id: Not(In(excluded)) } : {}),
        isActive: true,
      },
      relations: ['category', 'reviews'],
      order: { createdAt: 'DESC' },
      take: safeLimit * 8,
    });

    const accessories = catalogProducts.filter((product) => this.isAccessoryProduct(product));

    // Важливо: якщо реальних аксесуарів у БД немає, повертаємо порожній масив,
    // а не підміняємо блок смартфонами з тієї ж категорії або каталогу.
    return this.mapUniqueProducts(accessories, safeLimit, excluded);
  }

  async getBoughtTogether(
    productId: string,
    limit = 12,
    excludeIds: string[] = [],
  ): Promise<ProductRecommendationItem[]> {
    const safeLimit = this.normalizeLimit(limit);
    const excluded = this.uniqueIds([productId, ...excludeIds]);

    const rows = await this.orderItemRepo
      .createQueryBuilder('sourceItem')
      .innerJoin('sourceItem.product', 'sourceProduct')
      .innerJoin('sourceItem.order', 'sourceOrder')
      .innerJoin(OrderItemEntity, 'candidateItem', '1=1')
      .innerJoin('candidateItem.order', 'candidateOrder')
      .innerJoin('candidateItem.product', 'candidateProduct')
      .select('candidateProduct.id', 'productId')
      .addSelect('COUNT(candidateProduct.id)', 'frequency')
      .where('sourceProduct.id = :productId', { productId })
      .andWhere('candidateOrder.id = sourceOrder.id')
      .andWhere('candidateProduct.isActive = :isActive', { isActive: true })
      .andWhere(excluded.length ? 'candidateProduct.id NOT IN (:...excluded)' : '1=1', {
        excluded,
      })
      .groupBy('candidateProduct.id')
      .orderBy('COUNT(candidateProduct.id)', 'DESC')
      .limit(safeLimit)
      .getRawMany<ProductIdFrequencyRow>();

    const productIds = rows.map((row) => row.productId).filter(Boolean);
    if (!productIds.length) return [];

    const products = await this.productRepo.find({
      where: { id: In(productIds), isActive: true },
      relations: ['category', 'reviews'],
    });

    const productById = new Map(products.map((product) => [product.id, product]));
    const sortedProducts = productIds
      .map((id) => productById.get(id))
      .filter((product): product is ProductsEntity => Boolean(product));

    return this.mapUniqueProducts(sortedProducts, safeLimit, excluded);
  }

  private async getFallbackProducts(
    limit: number,
    excludeIds: string[],
  ): Promise<ProductRecommendationItem[]> {
    const products = await this.productRepo.find({
      where: {
        ...(excludeIds.length ? { id: Not(In(excludeIds)) } : {}),
        isActive: true,
      },
      relations: ['category', 'reviews'],
      order: { createdAt: 'DESC' },
      take: limit,
    });

    return this.mapUniqueProducts(products, limit, excludeIds);
  }

  private mapUniqueProducts(
    products: ProductsEntity[],
    limit: number,
    excludeIds: string[] = [],
  ): ProductRecommendationItem[] {
    const excluded = new Set(excludeIds);
    const used = new Set<string>();
    const result: ProductRecommendationItem[] = [];

    for (const product of products) {
      if (!product.id || used.has(product.id) || excluded.has(product.id)) continue;

      used.add(product.id);
      result.push(this.mapProduct(product));

      if (result.length >= limit) break;
    }

    return result;
  }

  private mapProduct(product: ProductsEntity): ProductRecommendationItem {
    const reviewStats = this.getReviewStats(product);

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
      stock: Number(product.stock || 0),
      images: product.images || [],
      rating: reviewStats.averageRating,
      reviewsCount: reviewStats.reviewsCount,
      category: product.category
        ? {
            id: product.category.id,
            slug: product.category.slug,
            name: product.category.name,
          }
        : undefined,
    };
  }

  private getReviewStats(product: ProductsEntity) {
    const reviews = (product.reviews || []).filter(
      (review) => review.type === ReviewType.REVIEW && typeof review.rating === 'number',
    );

    const reviewsCount = reviews.length;
    const averageRating = reviewsCount
      ? Number(
          (
            reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviewsCount
          ).toFixed(1),
        )
      : 0;

    return { averageRating, reviewsCount };
  }

  private getSimilarityScore(baseProduct: ProductsEntity, candidate: ProductsEntity): number {
    let score = 0;

    for (const code of this.similarPriorityCodes) {
      const baseValues = this.getFilterValues(baseProduct.filters || {}, code);
      const candidateValues = this.getFilterValues(candidate.filters || {}, code);

      if (!baseValues.length || !candidateValues.length) continue;

      const hasMatch = baseValues.some((value) => candidateValues.includes(value));
      if (hasMatch) score += this.getFilterWeight(code);
    }

    const basePrice = Number(baseProduct.price || 0);
    const candidatePrice = Number(candidate.price || 0);

    if (basePrice > 0 && candidatePrice > 0) {
      const differenceRatio = Math.abs(basePrice - candidatePrice) / basePrice;

      if (differenceRatio <= 0.1) score += 8;
      else if (differenceRatio <= 0.2) score += 5;
      else if (differenceRatio <= 0.35) score += 2;
    }

    return score;
  }

  private getFilterWeight(code: string): number {
    const weights: Record<string, number> = {
      brand: 18,
      series: 14,
      product_line: 14,
      model: 8,
      storage: 8,
      ram: 8,
      screen_size: 6,
      screen_type: 5,
      processor_model: 5,
      main_camera: 4,
      battery_capacity: 4,
      color: 1,
      main_color: 1,
      color_manufacturer: 1,
    };

    return weights[code] ?? 2;
  }

  private getFilterValues(filters: ProductFilterMap, code: string): string[] {
    const value = filters[code];
    if (value === undefined || value === null) return [];

    const values = Array.isArray(value) ? value : this.valueToString(value).split(',');

    return values.map((item) => this.normalizeValue(this.valueToString(item))).filter(Boolean);
  }

  private isAccessoryProduct(product: ProductsEntity): boolean {
    const category = product.category;
    if (!category) return false;

    const haystack = [
      category.slug,
      category.name?.ua,
      category.name?.en,
      product.name?.ua,
      product.name?.en,
    ]
      .map((value) => this.valueToString(value))
      .join(' ');

    return this.accessoryCategoryPattern.test(haystack);
  }

  private normalizeLimit(limit: number): number {
    return Math.max(1, Math.min(24, Math.floor(Number.isFinite(limit) ? limit : 12)));
  }

  private uniqueIds(ids: string[]): string[] {
    return Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean)));
  }

  private normalizeValue(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[ʼ'`]/g, '')
      .replace(/[^a-zа-яіїєґ0-9]+/gi, '-')
      .replace(/^-+|-+$/g, '');
  }

  private valueToString(value: unknown): string {
    if (value === undefined || value === null) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);

    try {
      return JSON.stringify(value) ?? '';
    } catch {
      return '';
    }
  }
}
