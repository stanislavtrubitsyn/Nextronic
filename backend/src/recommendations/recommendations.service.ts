import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { ProductsEntity } from '../products/products.entity';
import { OrderItemEntity } from '../orders/order-item.entity';
import { OrderStatus } from '../orders/orders.entity';
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

export interface HomeRecommendationsResponse {
  specialOffers: ProductRecommendationItem[];
  newArrivals: ProductRecommendationItem[];
  topSelling: ProductRecommendationItem[];
  smartphones: ProductRecommendationItem[];
  laptops: ProductRecommendationItem[];
  refrigerators: ProductRecommendationItem[];
}

type ProductFilterValue = string | number | boolean | string[] | number[] | boolean[] | null;

type ProductFilterMap = Record<string, ProductFilterValue>;

type ProductIdFrequencyRow = {
  productId: string;
  frequency: string;
};

export type RecommendationActivityMetadata = Record<string, unknown>;

export interface LogActivityOptions {
  productId?: string | null;
  rating?: number | null;
  quantity?: number | null;
  metadata?: RecommendationActivityMetadata;
  weight?: number;
}

type RankedProduct = {
  product: ProductsEntity;
  score: number;
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
    [ActivityAction.CATEGORY_VIEW]: 2,
    [ActivityAction.ADD_TO_CART]: 6,
    [ActivityAction.COMPARE]: 5,
    [ActivityAction.WISHLIST]: 8,
    [ActivityAction.QUESTION]: 4,
    [ActivityAction.REPLY]: 2,
    [ActivityAction.REVIEW]: 7,
    [ActivityAction.RATING]: 7,
    [ActivityAction.ORDER]: 14,
  };

  private readonly similarPriorityCodes = [
    'brand',
    'series',
    'product_line',
    'line_model',
    'model',
    'storage',
    'memory',
    'ram',
    'screen_size',
    'screen_type',
    'refresh_rate',
    'processor_model',
    'main_camera',
    'battery_capacity',
    'operating_system',
    'color',
    'main_color',
    'color_manufacturer',
  ];

  private readonly accessoryCategoryPattern =
    /access|accessor|аксесуар|чохол|кейс|скло|плівк|кабель|заряд|адаптер|навуш|гарнітур|power.?bank|павербанк|holder|mount|case|cover|glass|film|charger|cable|earphone|headphone/i;

  async logActivity(
    userId: string,
    categoryId: string | undefined | null,
    action: ActivityAction,
    options: LogActivityOptions = {},
  ): Promise<void> {
    if (!userId || (!categoryId && !options.productId)) return;

    const baseWeight = Number(options.weight ?? this.weights[action] ?? 1);
    const quantity = this.normalizeQuantity(options.quantity);
    const metadata: RecommendationActivityMetadata = {
      ...(options.metadata || {}),
      ...(options.rating !== undefined && options.rating !== null
        ? { rating: this.normalizeRating(options.rating) }
        : {}),
      ...(quantity > 1 ? { quantity } : {}),
    };

    const activity = this.activityRepo.create({
      user: { id: userId },
      category: categoryId ? { id: categoryId } : undefined,
      product: options.productId ? { id: options.productId } : undefined,
      action,
      weight: Math.max(1, Math.round(baseWeight * quantity)),
      metadata,
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

    const activities = await this.activityRepo.find({
      where: { user: { id: userId } },
      relations: ['category', 'product', 'product.catalog', 'product.category', 'product.reviews'],
      order: { createdAt: 'DESC' },
      take: 250,
    });

    if (!activities.length) {
      return [];
    }

    const categoryScores = this.buildCategoryScores(activities);
    const positiveCategoryIds = Array.from(categoryScores.entries())
      .filter(([, score]) => score > 0)
      .sort((left, right) => right[1] - left[1])
      .map(([categoryId]) => categoryId);

    if (!positiveCategoryIds.length) {
      return [];
    }

    const interactedProductIds = this.uniqueIds(
      activities.map((activity) => activity.product?.id || '').filter(Boolean),
    );
    const candidateExcluded = this.uniqueIds([...excluded, ...interactedProductIds]);

    const candidates = await this.productRepo.find({
      where: {
        category: { id: In(positiveCategoryIds) },
        ...(candidateExcluded.length ? { id: Not(In(candidateExcluded)) } : {}),
        isActive: true,
      },
      relations: ['catalog', 'category', 'reviews'],
      order: { createdAt: 'DESC' },
      take: safeLimit * 30,
    });

    const rankedProducts = this.rankPersonalizedProducts(candidates, activities, categoryScores)
      .filter((item) => item.score > 0)
      .map((item) => item.product);

    if (rankedProducts.length < safeLimit) {
      const fillerProducts = await this.getPositiveCategoryFallbackProducts(
        positiveCategoryIds,
        safeLimit * 3,
        this.uniqueIds([...candidateExcluded, ...rankedProducts.map((product) => product.id)]),
      );

      rankedProducts.push(...fillerProducts);
    }

    return this.mapUniqueProducts(rankedProducts, safeLimit, candidateExcluded);
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
      relations: ['catalog', 'category', 'reviews'],
      order: { createdAt: 'DESC' },
      take: safeLimit * 8,
    });

    const sortedCandidates = candidates
      .map((candidate) => ({
        product: candidate,
        score:
          this.getSimilarityScore(currentProduct, candidate) + this.getPopularityScore(candidate),
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
      relations: ['catalog', 'category', 'reviews'],
      order: { createdAt: 'DESC' },
      take: safeLimit * 8,
    });

    const accessories = catalogProducts
      .filter((product) => this.isAccessoryProduct(product))
      .map((product) => ({
        product,
        score: this.getSimilarityScore(currentProduct, product) + this.getPopularityScore(product),
      }))
      .sort((left, right) => right.score - left.score)
      .map((item) => item.product);

    // Якщо реальних аксесуарів у БД немає, повертаємо порожній масив,
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
      relations: ['catalog', 'category', 'reviews'],
    });

    const productById = new Map(products.map((product) => [product.id, product]));
    const sortedProducts = productIds
      .map((id) => productById.get(id))
      .filter((product): product is ProductsEntity => Boolean(product));

    return this.mapUniqueProducts(sortedProducts, safeLimit, excluded);
  }

  async getHomeSections(limit = 12): Promise<HomeRecommendationsResponse> {
    const safeLimit = this.normalizeLimit(limit);
    const activeProducts = await this.getActiveProducts(safeLimit * 20);

    const specialOffers = this.mapUniqueProducts(
      this.sortProductsByDiscount(activeProducts),
      safeLimit,
    );
    const newArrivals = this.mapUniqueProducts(
      this.sortProductsByNewest(activeProducts),
      safeLimit,
    );
    const topSelling = await this.getTopSellingProducts(safeLimit, activeProducts);
    const smartphones = this.mapUniqueProducts(
      this.filterProductsByKeywords(activeProducts, [
        'smartphone',
        'phone',
        'telefon',
        'iphone',
        'айфон',
        'смартфон',
        'телефон',
        'мобільн',
      ]),
      safeLimit,
    );
    const laptops = this.mapUniqueProducts(
      this.filterProductsByKeywords(activeProducts, [
        'laptop',
        'notebook',
        'noutbuk',
        'macbook',
        'lenovo loq',
        'ноутбук',
        'компьютер',
        "комп'ютер",
        'компʼютер',
      ]),
      safeLimit,
    );
    const refrigerators = this.mapUniqueProducts(
      this.filterProductsByKeywords(activeProducts, [
        'refrigerator',
        'fridge',
        'holodylnyk',
        'холодильник',
        'холодильн',
      ]),
      safeLimit,
    );

    return {
      specialOffers,
      newArrivals,
      topSelling,
      smartphones,
      laptops,
      refrigerators,
    };
  }

  private buildCategoryScores(activities: UserActivityEntity[]): Map<string, number> {
    const scores = new Map<string, number>();

    for (const activity of activities) {
      const categoryId = activity.category?.id || activity.product?.category?.id;
      if (!categoryId) continue;

      const currentScore = scores.get(categoryId) || 0;
      scores.set(categoryId, currentScore + this.getActivityPower(activity));
    }

    return scores;
  }

  private rankPersonalizedProducts(
    candidates: ProductsEntity[],
    activities: UserActivityEntity[],
    categoryScores: Map<string, number>,
  ): RankedProduct[] {
    return candidates
      .map((candidate) => ({
        product: candidate,
        score: this.getPersonalizedScore(candidate, activities, categoryScores),
      }))
      .sort((left, right) => {
        const scoreCompare = right.score - left.score;
        if (scoreCompare !== 0) return scoreCompare;

        return this.getTime(right.product.createdAt) - this.getTime(left.product.createdAt);
      });
  }

  private getPersonalizedScore(
    candidate: ProductsEntity,
    activities: UserActivityEntity[],
    categoryScores: Map<string, number>,
  ): number {
    const categoryId = candidate.category?.id;
    const categoryAffinity = categoryId ? Math.max(0, categoryScores.get(categoryId) || 0) : 0;
    let score = Math.min(categoryAffinity, 120) * 0.6;

    for (const activity of activities) {
      const power = this.getActivityPower(activity);
      if (power === 0) continue;

      const recencyMultiplier = this.getActivityRecencyMultiplier(activity.createdAt);
      const activityProduct = activity.product;

      if (activityProduct?.id && activityProduct.id !== candidate.id) {
        const similarityScore = this.getSimilarityScore(activityProduct, candidate);
        if (similarityScore > 0) {
          score += similarityScore * (power / 10) * recencyMultiplier;
        }
      }

      const searchTokens = this.getSearchTokensFromActivity(activity);
      if (searchTokens.length) {
        score +=
          this.getSearchMatchScore(candidate, searchTokens) *
          Math.max(0, power / 5) *
          recencyMultiplier;
      }
    }

    score += this.getPopularityScore(candidate);

    if (Number(candidate.stock || 0) <= 0) score -= 12;

    return Number(score.toFixed(4));
  }

  private getActivityPower(activity: UserActivityEntity): number {
    const baseWeight = Number(activity.weight || this.weights[activity.action] || 1);
    const rating = this.getMetadataNumber(activity.metadata, 'rating');
    const multiplier = this.getRatingPreferenceMultiplier(activity.action, rating);

    return baseWeight * multiplier;
  }

  private getRatingPreferenceMultiplier(action: ActivityAction, rating?: number): number {
    if (rating === undefined || ![ActivityAction.REVIEW, ActivityAction.RATING].includes(action)) {
      return 1;
    }

    if (rating >= 5) return 1.35;
    if (rating >= 4) return 1.1;
    if (rating >= 3) return 0.25;
    if (rating >= 2) return -0.5;
    return -0.85;
  }

  private getActivityRecencyMultiplier(createdAt?: Date): number {
    const createdAtTime = this.getTime(createdAt);
    if (!createdAtTime) return 0.5;

    const ageDays = Math.max(0, (Date.now() - createdAtTime) / (1000 * 60 * 60 * 24));

    if (ageDays <= 1) return 1.25;
    if (ageDays <= 7) return 1;
    if (ageDays <= 30) return 0.75;
    if (ageDays <= 90) return 0.45;

    return 0.25;
  }

  private async getPositiveCategoryFallbackProducts(
    categoryIds: string[],
    limit: number,
    excludeIds: string[],
  ): Promise<ProductsEntity[]> {
    if (!categoryIds.length) return [];

    const products = await this.productRepo.find({
      where: {
        category: { id: In(categoryIds) },
        ...(excludeIds.length ? { id: Not(In(excludeIds)) } : {}),
        isActive: true,
      },
      relations: ['catalog', 'category', 'reviews'],
      order: { createdAt: 'DESC' },
      take: limit,
    });

    return this.sortProductsByPopularity(products);
  }

  private async getActiveProducts(take: number): Promise<ProductsEntity[]> {
    return await this.productRepo.find({
      where: { isActive: true },
      relations: ['catalog', 'category', 'reviews'],
      order: { createdAt: 'DESC' },
      take,
    });
  }

  private sortProductsByDiscount(products: ProductsEntity[]): ProductsEntity[] {
    return products
      .filter((product) => this.getDiscountAmount(product) > 0)
      .sort((left, right) => {
        const discountCompare = this.getDiscountAmount(right) - this.getDiscountAmount(left);
        if (discountCompare !== 0) return discountCompare;

        return this.getTime(right.createdAt) - this.getTime(left.createdAt);
      });
  }

  private sortProductsByNewest(products: ProductsEntity[]): ProductsEntity[] {
    return [...products].sort(
      (left, right) => this.getTime(right.createdAt) - this.getTime(left.createdAt),
    );
  }

  private async getTopSellingProducts(
    limit: number,
    fallbackProducts: ProductsEntity[] = [],
  ): Promise<ProductRecommendationItem[]> {
    const rows = await this.orderItemRepo
      .createQueryBuilder('item')
      .innerJoin('item.product', 'product')
      .innerJoin('item.order', 'order')
      .select('product.id', 'productId')
      .addSelect('SUM(item.quantity)', 'soldCount')
      .where('product.isActive = :isActive', { isActive: true })
      .andWhere('order.status != :cancelled', { cancelled: OrderStatus.CANCELLED })
      .groupBy('product.id')
      .orderBy('SUM(item.quantity)', 'DESC')
      .limit(limit)
      .getRawMany<{ productId: string; soldCount: string }>();

    const productIds = rows.map((row) => row.productId).filter(Boolean);

    if (productIds.length) {
      const products = await this.productRepo.find({
        where: { id: In(productIds), isActive: true },
        relations: ['catalog', 'category', 'reviews'],
      });

      const productById = new Map(products.map((product) => [product.id, product]));
      const sortedProducts = productIds
        .map((id) => productById.get(id))
        .filter((product): product is ProductsEntity => Boolean(product));

      return this.mapUniqueProducts(sortedProducts, limit);
    }

    // Для локальної розробки блок не буде зникати повністю, навіть якщо ще немає реальних продажів.
    // Коли з'являться order items, вище автоматично повернеться реальний топ продажів.
    return this.mapUniqueProducts(this.sortProductsByPopularity(fallbackProducts), limit);
  }

  private sortProductsByPopularity(products: ProductsEntity[]): ProductsEntity[] {
    return [...products].sort((left, right) => {
      const rightScore = this.getPopularityScore(right);
      const leftScore = this.getPopularityScore(left);
      const scoreCompare = rightScore - leftScore;

      if (scoreCompare !== 0) return scoreCompare;

      return this.getTime(right.createdAt) - this.getTime(left.createdAt);
    });
  }

  private getPopularityScore(product: ProductsEntity): number {
    const stats = this.getReviewStats(product);
    const stockBonus = Number(product.stock || 0) > 0 ? 1.5 : 0;
    const discountBonus = this.getDiscountAmount(product) > 0 ? 1 : 0;

    return stats.reviewsCount * 0.3 + stats.averageRating * 1.4 + stockBonus + discountBonus;
  }

  private filterProductsByKeywords(
    products: ProductsEntity[],
    keywords: string[],
  ): ProductsEntity[] {
    const normalizedKeywords = keywords.map((keyword) => this.normalizeValue(keyword));

    return products.filter((product) => {
      const haystack = this.getProductSearchText(product);
      return normalizedKeywords.some((keyword) => keyword && haystack.includes(keyword));
    });
  }

  private getProductSearchText(product: ProductsEntity): string {
    const values = [
      product.slug,
      product.sku,
      product.name?.ua,
      product.name?.en,
      product.category?.slug,
      product.category?.name?.ua,
      product.category?.name?.en,
      product.catalog?.slug,
      product.catalog?.name?.ua,
      product.catalog?.name?.en,
      ...Object.values(product.filters || {}).map((value) => this.valueToString(value)),
    ];

    return values.map((value) => this.normalizeValue(this.valueToString(value))).join(' ');
  }

  private getSearchTokensFromActivity(activity: UserActivityEntity): string[] {
    if (![ActivityAction.SEARCH, ActivityAction.CATEGORY_VIEW].includes(activity.action)) {
      return [];
    }

    const metadata = activity.metadata || {};
    const values: unknown[] = [metadata.query];

    const filters = metadata.filters;
    if (filters && typeof filters === 'object') {
      values.push(...Object.values(filters as Record<string, unknown>));
    }

    values.push(metadata.minPrice, metadata.maxPrice, metadata.sort);

    return this.uniqueIds(
      values
        .flatMap((value) => this.valueToString(value).split(/[\s,;|]+/g))
        .map((value) => this.normalizeValue(value))
        .filter((value) => value.length >= 2),
    );
  }

  private getSearchMatchScore(product: ProductsEntity, searchTokens: string[]): number {
    if (!searchTokens.length) return 0;

    const haystack = this.getProductSearchText(product);
    const matchedCount = searchTokens.filter((token) => haystack.includes(token)).length;

    return matchedCount * 4;
  }

  private getDiscountAmount(product: ProductsEntity): number {
    const oldPrice = Number(product.oldPrice || 0);
    const price = Number(product.price || 0);

    return oldPrice > price ? oldPrice - price : 0;
  }

  private getTime(value?: Date): number {
    const date = value ? new Date(value) : null;
    const time = date?.getTime() ?? 0;

    return Number.isNaN(time) ? 0 : time;
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
      relations: ['catalog', 'category', 'reviews'],
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

    if (baseProduct.category?.id && baseProduct.category.id === candidate.category?.id) {
      score += 16;
    }

    if (baseProduct.catalog?.id && baseProduct.catalog.id === candidate.catalog?.id) {
      score += 4;
    }

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
      brand: 24,
      series: 18,
      product_line: 18,
      line_model: 18,
      model: 10,
      storage: 9,
      memory: 9,
      ram: 9,
      screen_size: 6,
      screen_type: 5,
      refresh_rate: 5,
      processor_model: 5,
      main_camera: 4,
      battery_capacity: 4,
      operating_system: 4,
      color: 2,
      main_color: 2,
      color_manufacturer: 2,
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

  private normalizeQuantity(value: unknown): number {
    const parsed = Number(value || 1);
    if (!Number.isFinite(parsed)) return 1;

    return Math.max(1, Math.min(10, Math.floor(parsed)));
  }

  private normalizeRating(value: unknown): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 0;

    return Math.max(1, Math.min(5, Math.round(parsed)));
  }

  private getMetadataNumber(metadata: RecommendationActivityMetadata | undefined, key: string) {
    const value = metadata?.[key];
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : undefined;
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
