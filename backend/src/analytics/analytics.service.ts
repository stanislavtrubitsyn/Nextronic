import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, LessThanOrEqual, Repository } from 'typeorm';
import { UsersEntity } from '../users/users.entity';
import { OrderEntity, OrderStatus } from '../orders/orders.entity';
import { OrderItemEntity } from '../orders/order-item.entity';
import { ViewedProductEntity } from '../products/viewed-products.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-log.entity';
import { ReviewType, ReviewsEntity } from '../reviews/reviews.entity';
import { WishlistItemEntity } from '../wishlists/wishlist-item.entity';

type DashboardPeriod = '24h' | 'week' | 'month' | 'year' | 'all' | 'custom';

export interface LocalizedString {
  ua?: string;
  en?: string;
}
interface DashboardDateRange {
  startDate: Date;
  endDate: Date;
  prevStartDate: Date;
  prevEndDate: Date;
}

interface RawRevenueResult {
  total?: string | number | null;
}

interface RawChartPoint {
  date: string;
  value: string | number | null;
}

interface RawCategoryShare {
  id: string | number;
  name: unknown;
  slug?: string | null;
  sales: string | number | null;
}

interface RawCategoryMetric {
  id: string | number;
  name: unknown;
  slug?: string | null;
  value: string | number | null;
}

interface NormalizedCategoryShare {
  id: string;
  name: unknown;
  slug: string;
  sales: number;
}

interface RawProductTop {
  id: string | number;
  name: unknown;
  slug?: string | null;
  images?: unknown;
  price?: string | number | null;
  oldPrice?: string | number | null;
  stock?: string | number | null;
  count?: string | number | null;
}

interface AuditProfileLike {
  firstName?: string | null;
  lastName?: string | null;
}

interface AuditAdminLike {
  email?: string | null;
  role?: string | null;
  profile?: AuditProfileLike | null;
}

interface AuditLogLike {
  id: string;
  action: AuditAction;
  entityName: string;
  entityId?: string | null;
  oldValues?: unknown;
  newValues?: unknown;
  createdAt: Date | string;
  admin?: AuditAdminLike | null;
}

interface ActivityObjectData {
  orderNumber?: unknown;
  profile?: AuditProfileLike | null;
  email?: unknown;
  comment?: unknown;
  name?: unknown;
  title?: unknown;
  slug?: unknown;
}

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(UsersEntity) private readonly userRepo: Repository<UsersEntity>,
    @InjectRepository(OrderEntity) private readonly orderRepo: Repository<OrderEntity>,
    @InjectRepository(OrderItemEntity) private readonly orderItemRepo: Repository<OrderItemEntity>,
    @InjectRepository(ViewedProductEntity)
    private readonly viewedRepo: Repository<ViewedProductEntity>,
    @InjectRepository(ReviewsEntity) private readonly reviewRepo: Repository<ReviewsEntity>,
    @InjectRepository(WishlistItemEntity)
    private readonly wishlistItemRepo: Repository<WishlistItemEntity>,
    private readonly auditService: AuditService,
  ) {}

  async getDashboardStats(
    period: DashboardPeriod = 'month',
    customStart?: string,
    customEnd?: string,
  ) {
    const { startDate, endDate, prevStartDate, prevEndDate } = this.getDateRange(
      period,
      customStart,
      customEnd,
    );

    const dateFormat = period === '24h' ? 'YYYY-MM-DD HH24:00' : 'YYYY-MM-DD';

    const totalUsers =
      period === 'all'
        ? await this.userRepo.count()
        : await this.userRepo.count({ where: { createdAt: LessThanOrEqual(endDate) } });

    const currentUsersRegistered = await this.userRepo.count({
      where: { createdAt: Between(startDate, endDate) },
    });

    const previousUsersRegistered = await this.userRepo.count({
      where: { createdAt: Between(prevStartDate, prevEndDate) },
    });

    const totalOrders = await this.orderRepo.count({
      where: { createdAt: Between(startDate, endDate) },
    });

    const totalReviews = await this.reviewRepo.count({
      where: { createdAt: Between(startDate, endDate), type: ReviewType.REVIEW },
    });

    const totalRevenue = await this.getRevenueBetween(startDate, endDate);
    const onlineUsers = this.getPseudoOnlineUsers();

    const prevOrders = await this.orderRepo.count({
      where: { createdAt: Between(prevStartDate, prevEndDate) },
    });

    const prevReviews = await this.reviewRepo.count({
      where: { createdAt: Between(prevStartDate, prevEndDate), type: ReviewType.REVIEW },
    });

    const prevRevenue = await this.getRevenueBetween(prevStartDate, prevEndDate);
    const prevOnlineUsers = Math.max(0, onlineUsers - Math.floor(Math.random() * 200));

    const salesChart = await this.orderRepo
      .createQueryBuilder('o')
      .select(`TO_CHAR(o.createdAt, '${dateFormat}')`, 'date')
      .addSelect('COUNT(o.id)', 'value')
      .where('o.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('o.status != :cancelled', { cancelled: OrderStatus.CANCELLED })
      .groupBy(`TO_CHAR(o.createdAt, '${dateFormat}')`)
      .orderBy('date', 'ASC')
      .getRawMany<RawChartPoint>();

    const activityChart = await this.viewedRepo
      .createQueryBuilder('v')
      .select(`TO_CHAR(v.viewedAt, '${dateFormat}')`, 'date')
      .addSelect('COUNT(v.id)', 'value')
      .where('v.viewedAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy(`TO_CHAR(v.viewedAt, '${dateFormat}')`)
      .orderBy('date', 'ASC')
      .getRawMany<RawChartPoint>();

    const categoryShares = await this.getCategoryHighlights(startDate, endDate);

    const topOrdered = await this.getTopOrderedProducts(startDate, endDate);
    const topViewed = await this.getTopViewedProducts(startDate, endDate);
    const topReviewed = await this.getTopReviewedProducts(startDate, endDate);
    const topWishlisted = await this.getTopWishlistedProducts(startDate, endDate);

    const recentLogs = (await this.auditService.getRecentActivity(20)) as unknown as AuditLogLike[];
    const totalCategorySales = categoryShares.reduce(
      (sum, category) => sum + Number(category.sales || 0),
      0,
    );

    return {
      period,
      range: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      kpi: {
        online: { value: onlineUsers, trend: this.calcTrend(onlineUsers, prevOnlineUsers, period) },
        users: {
          value: totalUsers,
          trend: this.calcTrend(currentUsersRegistered, previousUsersRegistered, period),
        },
        orders: { value: totalOrders, trend: this.calcTrend(totalOrders, prevOrders, period) },
        reviews: { value: totalReviews, trend: this.calcTrend(totalReviews, prevReviews, period) },
        revenue: { value: totalRevenue, trend: this.calcTrend(totalRevenue, prevRevenue, period) },
      },
      charts: {
        salesGraph: this.normalizeChartData(salesChart, period, startDate, endDate),
        activityGraph: this.normalizeChartData(activityChart, period, startDate, endDate),
        categories: categoryShares.map((item) => {
          const sales = Number(item.sales || 0);

          return {
            id: String(item.id),
            name: this.parseLocalizedValue(item.name),
            slug: item.slug ? String(item.slug) : '',
            sales,
            percent:
              totalCategorySales > 0 ? Number(((sales / totalCategorySales) * 100).toFixed(1)) : 0,
          };
        }),
      },
      tops: {
        ordered: topOrdered.map((item) => this.formatProductResult(item)),
        viewed: topViewed.map((item) => this.formatProductResult(item)),
        reviewed: topReviewed.map((item) => this.formatProductResult(item)),
        wishlisted: topWishlisted.map((item) => this.formatProductResult(item)),
      },
      recentActivity: recentLogs.map((log) => this.formatActivityLog(log)),
    };
  }

  private getDateRange(
    period: DashboardPeriod,
    customStart?: string,
    customEnd?: string,
  ): DashboardDateRange {
    let startDate = new Date();
    let endDate = new Date();
    let prevStartDate = new Date();
    let prevEndDate = new Date();

    if (period === '24h') {
      startDate.setHours(startDate.getHours() - 24);
      prevEndDate = new Date(startDate);
      prevStartDate = new Date(startDate);
      prevStartDate.setHours(prevStartDate.getHours() - 24);
    } else if (period === 'week') {
      startDate.setDate(startDate.getDate() - 7);
      prevEndDate = new Date(startDate);
      prevStartDate = new Date(startDate);
      prevStartDate.setDate(prevStartDate.getDate() - 7);
    } else if (period === 'month') {
      startDate.setMonth(startDate.getMonth() - 1);
      prevEndDate = new Date(startDate);
      prevStartDate = new Date(startDate);
      prevStartDate.setMonth(prevStartDate.getMonth() - 1);
    } else if (period === 'year') {
      startDate.setFullYear(startDate.getFullYear() - 1);
      prevEndDate = new Date(startDate);
      prevStartDate = new Date(startDate);
      prevStartDate.setFullYear(prevStartDate.getFullYear() - 1);
    } else if (period === 'custom' && customStart && customEnd) {
      startDate = new Date(customStart);
      endDate = new Date(customEnd);
      endDate.setHours(23, 59, 59, 999);

      const diff = endDate.getTime() - startDate.getTime();
      prevEndDate = new Date(startDate);
      prevStartDate = new Date(startDate.getTime() - diff);
    } else if (period === 'all') {
      startDate = new Date(0);
      prevStartDate = new Date(0);
      prevEndDate = new Date(0);
    }

    return { startDate, endDate, prevStartDate, prevEndDate };
  }

  private async getRevenueBetween(startDate: Date, endDate: Date): Promise<number> {
    const result = await this.orderRepo
      .createQueryBuilder('o')
      .select('SUM(o.totalAmount)', 'total')
      .where('o.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('o.status != :cancelled', { cancelled: OrderStatus.CANCELLED })
      .getRawOne<RawRevenueResult>();

    return result?.total ? Number(result.total) : 0;
  }

  private getPseudoOnlineUsers(): number {
    return Math.floor(Math.random() * (1350 - 1100 + 1)) + 1100;
  }

  private calcTrend(current: number, previous: number, period: DashboardPeriod): number {
    if (period === 'all') return 0;
    if (previous === 0) return current > 0 ? 100 : 0;

    return Number((((current - previous) / previous) * 100).toFixed(1));
  }

  private getProductSelectFields(): string[] {
    return [
      'product.id AS id',
      'product.name AS name',
      'product.slug AS slug',
      'product.images AS images',
      'product.price AS price',
      'product.oldPrice AS "oldPrice"',
      'product.stock AS stock',
    ];
  }

  private normalizeChartData(
    rows: RawChartPoint[],
    period: DashboardPeriod,
    startDate: Date,
    endDate: Date,
  ) {
    if (period === 'all') {
      return rows.map((item) => ({ date: item.date, value: Number(item.value || 0) }));
    }

    const byDate = new Map(rows.map((item) => [item.date, Number(item.value || 0)]));
    const result: Array<{ date: string; value: number }> = [];
    const cursor = new Date(startDate);
    const end = new Date(endDate);

    if (period === '24h') {
      cursor.setMinutes(0, 0, 0);
      end.setMinutes(0, 0, 0);

      while (cursor <= end) {
        const key = this.formatChartDateKey(cursor, true);
        result.push({ date: key, value: byDate.get(key) || 0 });
        cursor.setHours(cursor.getHours() + 1);
      }

      return result;
    }

    cursor.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    while (cursor <= end) {
      const key = this.formatChartDateKey(cursor, false);
      result.push({ date: key, value: byDate.get(key) || 0 });
      cursor.setDate(cursor.getDate() + 1);
    }

    return result;
  }

  private formatChartDateKey(date: Date, withHour: boolean): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    if (!withHour) return `${year}-${month}-${day}`;

    const hour = String(date.getHours()).padStart(2, '0');
    return `${year}-${month}-${day} ${hour}:00`;
  }

  private async getCategoryHighlights(startDate: Date, endDate: Date): Promise<RawCategoryShare[]> {
    const [orderedRows, viewedRows, reviewedRows, wishlistedRows] = await Promise.all([
      this.orderItemRepo
        .createQueryBuilder('item')
        .innerJoin('item.order', 'order')
        .innerJoin('item.product', 'product')
        .innerJoin('product.category', 'category')
        .select('category.id', 'id')
        .addSelect('category.name', 'name')
        .addSelect('category.slug', 'slug')
        .addSelect('SUM(item.quantity)', 'value')
        .where('order.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
        .andWhere('order.status != :cancelled', { cancelled: OrderStatus.CANCELLED })
        .groupBy('category.id')
        .orderBy('value', 'DESC')
        .getRawMany<RawCategoryMetric>(),
      this.viewedRepo
        .createQueryBuilder('view')
        .innerJoin('view.product', 'product')
        .innerJoin('product.category', 'category')
        .select('category.id', 'id')
        .addSelect('category.name', 'name')
        .addSelect('category.slug', 'slug')
        .addSelect('COUNT(view.id)', 'value')
        .where('view.viewedAt BETWEEN :startDate AND :endDate', { startDate, endDate })
        .groupBy('category.id')
        .orderBy('value', 'DESC')
        .getRawMany<RawCategoryMetric>(),
      this.reviewRepo
        .createQueryBuilder('review')
        .innerJoin('review.product', 'product')
        .innerJoin('product.category', 'category')
        .select('category.id', 'id')
        .addSelect('category.name', 'name')
        .addSelect('category.slug', 'slug')
        .addSelect('COUNT(review.id)', 'value')
        .where('review.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
        .andWhere('review.type = :reviewType', { reviewType: ReviewType.REVIEW })
        .groupBy('category.id')
        .orderBy('value', 'DESC')
        .getRawMany<RawCategoryMetric>(),
      this.wishlistItemRepo
        .createQueryBuilder('wishlistItem')
        .innerJoin('wishlistItem.product', 'product')
        .innerJoin('product.category', 'category')
        .select('category.id', 'id')
        .addSelect('category.name', 'name')
        .addSelect('category.slug', 'slug')
        .addSelect('COUNT(wishlistItem.id)', 'value')
        .where('wishlistItem.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
        .groupBy('category.id')
        .orderBy('value', 'DESC')
        .getRawMany<RawCategoryMetric>(),
    ]);

    const categoryScores = new Map<string, NormalizedCategoryShare>();

    const addRows = (rows: RawCategoryMetric[], weight: number) => {
      for (const row of rows) {
        const id = String(row.id);
        const current = categoryScores.get(id) || {
          id,
          name: row.name,
          slug: row.slug || '',
          sales: 0,
        };

        current.sales += Number(row.value || 0) * weight;
        categoryScores.set(id, current);
      }
    };

    addRows(orderedRows, 5);
    addRows(wishlistedRows, 3);
    addRows(reviewedRows, 2);
    addRows(viewedRows, 1);

    return Array.from(categoryScores.values())
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 20)
      .map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        sales: category.sales,
      }));
  }

  private async getTopOrderedProducts(startDate: Date, endDate: Date): Promise<RawProductTop[]> {
    return await this.orderItemRepo
      .createQueryBuilder('item')
      .innerJoin('item.order', 'order')
      .innerJoin('item.product', 'product')
      .select(this.getProductSelectFields())
      .addSelect('SUM(item.quantity)', 'count')
      .where('order.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('order.status != :cancelled', { cancelled: OrderStatus.CANCELLED })
      .groupBy('product.id')
      .orderBy('count', 'DESC')
      .limit(5)
      .getRawMany<RawProductTop>();
  }

  private async getTopViewedProducts(startDate: Date, endDate: Date): Promise<RawProductTop[]> {
    return await this.viewedRepo
      .createQueryBuilder('view')
      .innerJoin('view.product', 'product')
      .select(this.getProductSelectFields())
      .addSelect('COUNT(view.id)', 'count')
      .where('view.viewedAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('product.id')
      .orderBy('count', 'DESC')
      .limit(5)
      .getRawMany<RawProductTop>();
  }

  private async getTopReviewedProducts(startDate: Date, endDate: Date): Promise<RawProductTop[]> {
    return await this.reviewRepo
      .createQueryBuilder('review')
      .innerJoin('review.product', 'product')
      .select(this.getProductSelectFields())
      .addSelect('COUNT(review.id)', 'count')
      .where('review.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('review.type = :reviewType', { reviewType: ReviewType.REVIEW })
      .groupBy('product.id')
      .orderBy('count', 'DESC')
      .limit(5)
      .getRawMany<RawProductTop>();
  }

  private async getTopWishlistedProducts(startDate: Date, endDate: Date): Promise<RawProductTop[]> {
    return await this.wishlistItemRepo
      .createQueryBuilder('wishlistItem')
      .innerJoin('wishlistItem.product', 'product')
      .select(this.getProductSelectFields())
      .addSelect('COUNT(wishlistItem.id)', 'count')
      .where('wishlistItem.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('product.id')
      .orderBy('count', 'DESC')
      .limit(5)
      .getRawMany<RawProductTop>();
  }

  private formatProductResult(item: RawProductTop) {
    const images = this.parseImages(item.images);

    return {
      id: String(item.id),
      name: this.parseLocalizedValue(item.name),
      slug: item.slug ? String(item.slug) : '',
      image: images[0] || null,
      images,
      price: Number(item.price || 0),
      oldPrice:
        item.oldPrice !== null && item.oldPrice !== undefined ? Number(item.oldPrice) : null,
      stock: Number(item.stock || 0),
      count: Number(item.count || 0),
    };
  }

  private formatActivityLog(log: AuditLogLike) {
    const entityName = log.entityName || '';
    const data = this.toActivityObjectData(log.newValues || log.oldValues);
    const adminName = log.admin?.profile?.firstName
      ? `${log.admin.profile.firstName} ${log.admin.profile.lastName || ''}`.trim()
      : log.admin?.email || 'Система/Невідомо';

    const actionTitle = this.getActivityActionTitle(log.action, entityName);
    const itemName = this.extractActivityItemName(entityName, data);
    const entityId = log.entityId || undefined;

    return {
      id: log.id,
      adminName,
      initials: this.getInitials(adminName),
      role: log.admin?.role || 'admin',
      actionType: log.action,
      actionTitle,
      itemName,
      action: itemName ? `${actionTitle}:\n${itemName}` : actionTitle,
      entityName,
      entityId: entityId || null,
      viewUrl: this.getEntityViewUrl(entityName, entityId),
      date: log.createdAt,
    };
  }

  private getActivityActionTitle(action: AuditAction, entityName: string): string {
    const entityNameStr = this.getEntityReadableName(entityName);

    if (action === AuditAction.CREATE) return `Додано новий ${entityNameStr}`;
    if (action === AuditAction.UPDATE) return `Відредаговано ${entityNameStr}`;
    if (action === AuditAction.DELETE) return `Видалено ${entityNameStr}`;

    return 'Оновлено запис';
  }

  private getEntityReadableName(entityName: string): string {
    const names: Record<string, string> = {
      ProductsEntity: 'товар',
      OrderEntity: 'замовлення',
      UsersEntity: 'користувача',
      CategoriesEntity: 'категорію',
      CatalogsEntity: 'каталог',
      ReviewsEntity: 'відгук',
    };

    return names[entityName] || 'запис';
  }

  private extractActivityItemName(entityName: string, data: ActivityObjectData): string {
    if (entityName === 'OrderEntity') {
      const orderNumber = this.toSafeString(data.orderNumber);
      return orderNumber ? `${orderNumber}` : 'Невідоме замовлення';
    }

    if (entityName === 'UsersEntity') {
      const firstName = data.profile?.firstName || '';
      const lastName = data.profile?.lastName || '';
      const profileName = `${firstName} ${lastName}`.trim();
      const email = this.toSafeString(data.email);

      return profileName || email || 'Невідомий користувач';
    }

    if (entityName === 'ReviewsEntity') {
      const comment = this.toSafeString(data.comment);
      return comment ? `"${comment.substring(0, 70)}"` : 'Відгук';
    }

    const name = this.parseLocalizedValue(data.name);
    const title = this.toSafeString(data.title);
    const slug = this.toSafeString(data.slug);

    return name.ua || name.en || title || slug || 'Без назви';
  }

  private getEntityViewUrl(entityName: string, entityId?: string): string | null {
    const urls: Record<string, string> = {
      ProductsEntity: '/admin/products',
      OrderEntity: '/admin/orders',
      UsersEntity: '/admin/users',
      CategoriesEntity: '/admin/categories',
      CatalogsEntity: '/admin/catalogs',
      ReviewsEntity: '/admin/products',
    };

    const baseUrl = urls[entityName] || '';
    return baseUrl ? `${baseUrl}${entityId ? `?highlight=${entityId}` : ''}` : null;
  }

  private parseLocalizedValue(value: unknown): LocalizedString {
    if (value === null || value === undefined) return { ua: '', en: '' };

    if (this.isLocalizedString(value)) {
      return {
        ua: value.ua || value.en || '',
        en: value.en || value.ua || '',
      };
    }

    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value) as unknown;

        if (this.isLocalizedString(parsed)) {
          return {
            ua: parsed.ua || parsed.en || value,
            en: parsed.en || parsed.ua || value,
          };
        }
      } catch {
        return { ua: value, en: value };
      }

      return { ua: value, en: value };
    }

    return { ua: '', en: '' };
  }

  private parseImages(value: unknown): string[] {
    if (Array.isArray(value))
      return value.filter((image): image is string => typeof image === 'string');

    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value) as unknown;
        return Array.isArray(parsed)
          ? parsed.filter((image): image is string => typeof image === 'string')
          : [];
      } catch {
        return value ? [value] : [];
      }
    }

    return [];
  }

  private getInitials(name: string): string {
    return (
      name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('') || 'AD'
    );
  }

  private toActivityObjectData(value: unknown): ActivityObjectData {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return value;
  }
  private isLocalizedString(value: unknown): value is LocalizedString {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;

    const record = value as Record<string, unknown>;
    return (
      (record.ua === undefined || typeof record.ua === 'string') &&
      (record.en === undefined || typeof record.en === 'string') &&
      (typeof record.ua === 'string' || typeof record.en === 'string')
    );
  }

  private toSafeString(value: unknown): string {
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    return '';
  }
}
