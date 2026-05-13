import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { UsersEntity } from '../users/users.entity';
import { OrderEntity, OrderStatus } from '../orders/orders.entity';
import { OrderItemEntity } from '../orders/order-item.entity';
import { ViewedProductEntity } from '../products/viewed-products.entity';
import { ProductsEntity } from '../products/products.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-log.entity';
import { ReviewsEntity } from '../reviews/reviews.entity';
import { WishlistItemEntity } from '../wishlists/wishlist-item.entity';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(UsersEntity) private readonly userRepo: Repository<UsersEntity>,
    @InjectRepository(OrderEntity) private readonly orderRepo: Repository<OrderEntity>,
    @InjectRepository(OrderItemEntity) private readonly orderItemRepo: Repository<OrderItemEntity>,
    @InjectRepository(ViewedProductEntity)
    private readonly viewedRepo: Repository<ViewedProductEntity>,
    @InjectRepository(ProductsEntity) private readonly productRepo: Repository<ProductsEntity>,
    @InjectRepository(ReviewsEntity) private readonly reviewRepo: Repository<ReviewsEntity>,
    @InjectRepository(WishlistItemEntity)
    private readonly wishlistItemRepo: Repository<WishlistItemEntity>,
    private readonly auditService: AuditService,
  ) {}

  async getDashboardStats(
    period: '24h' | 'week' | 'month' | 'year' | 'all' | 'custom' = 'month',
    customStart?: string,
    customEnd?: string,
  ) {
    //ВИЗНАЧАЄМО ПОТОЧНИЙ ПЕРІОД
    let startDate = new Date();
    let endDate = new Date();

    //ВИЗНАЧАЄМО ПОПЕРЕДНІЙ ПЕРІОД ДЛЯ ТРЕНДІВ (ВІДСОТКІВ)
    let prevStartDate = new Date();
    let prevEndDate = new Date();

    if (period === '24h') {
      startDate.setHours(startDate.getHours() - 24);
      prevEndDate = new Date(startDate);
      prevStartDate.setHours(prevStartDate.getHours() - 48);
    } else if (period === 'week') {
      startDate.setDate(startDate.getDate() - 7);
      prevEndDate = new Date(startDate);
      prevStartDate.setDate(prevStartDate.getDate() - 14);
    } else if (period === 'month') {
      startDate.setMonth(startDate.getMonth() - 1);
      prevEndDate = new Date(startDate);
      prevStartDate.setMonth(prevStartDate.getMonth() - 2);
    } else if (period === 'year') {
      startDate.setFullYear(startDate.getFullYear() - 1);
      prevEndDate = new Date(startDate);
      prevStartDate.setFullYear(prevStartDate.getFullYear() - 2);
    } else if (period === 'custom' && customStart && customEnd) {
      startDate = new Date(customStart);
      endDate = new Date(customEnd);
      endDate.setHours(23, 59, 59, 999);

      // Вираховуємо тривалість кастомного періоду
      const diff = endDate.getTime() - startDate.getTime();
      prevEndDate = new Date(startDate);
      prevStartDate = new Date(startDate.getTime() - diff);
    } else if (period === 'all') {
      startDate = new Date(0);
      prevStartDate = new Date(0);
      prevEndDate = new Date(0);
    }

    // ДИНАМІЧНЕ ГРУПУВАННЯ ДЛЯ ГРАФІКІВ
    const dateFormat = period === '24h' ? 'YYYY-MM-DD HH24:00' : 'YYYY-MM-DD';

    //ВЕРХНІ KPI (Статистика за поточний період)
    const totalUsers = await this.userRepo.count({
      where: { createdAt: Between(startDate, endDate) },
    });

    const totalOrders = await this.orderRepo.count({
      where: { createdAt: Between(startDate, endDate) },
    });

    const totalReviews = await this.reviewRepo.count({
      where: { createdAt: Between(startDate, endDate) },
    });

    const revenueResult = await this.orderRepo
      .createQueryBuilder('o')
      .select('SUM(o.totalAmount)', 'total')
      .where('o.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('o.status != :cancelled', { cancelled: OrderStatus.CANCELLED })
      .getRawOne();
    const totalRevenue = revenueResult?.total ? Number(revenueResult.total) : 0;

    const onlineUsers = Math.floor(Math.random() * (1350 - 1100 + 1)) + 1100;

    //ДАНІ ЗА ПОПЕРЕДНІЙ ПЕРІОД
    const prevUsers = await this.userRepo.count({
      where: { createdAt: Between(prevStartDate, prevEndDate) },
    });
    const prevOrders = await this.orderRepo.count({
      where: { createdAt: Between(prevStartDate, prevEndDate) },
    });
    const prevReviews = await this.reviewRepo.count({
      where: { createdAt: Between(prevStartDate, prevEndDate) },
    });

    const prevRevenueResult = await this.orderRepo
      .createQueryBuilder('o')
      .select('SUM(o.totalAmount)', 'total')
      .where('o.createdAt BETWEEN :startDate AND :endDate', {
        startDate: prevStartDate,
        endDate: prevEndDate,
      })
      .andWhere('o.status != :cancelled', { cancelled: OrderStatus.CANCELLED })
      .getRawOne();
    const prevRevenue = prevRevenueResult?.total ? Number(prevRevenueResult.total) : 0;

    const prevOnlineUsers = onlineUsers - Math.floor(Math.random() * 200);

    //ФУНКЦІЯ ДЛЯ РОЗРАХУНКУ ТРЕНДУ (%)
    const calcTrend = (current: number, previous: number): number => {
      if (period === 'all') return 0;
      if (previous === 0) return current > 0 ? 100 : 0;
      return Number((((current - previous) / previous) * 100).toFixed(1));
    };

    // Графік продажів
    const salesChart = await this.orderRepo
      .createQueryBuilder('o')
      .select(`TO_CHAR(o.createdAt, '${dateFormat}')`, 'date')
      .addSelect('SUM(o.totalAmount)', 'value')
      .where('o.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('o.status != :cancelled', { cancelled: OrderStatus.CANCELLED })
      .groupBy(`TO_CHAR(o.createdAt, '${dateFormat}')`)
      .orderBy('date', 'ASC')
      .getRawMany();

    // Графік активності
    const activityChart = await this.viewedRepo
      .createQueryBuilder('v')
      .select(`TO_CHAR(v.viewedAt, '${dateFormat}')`, 'date')
      .addSelect('COUNT(v.id)', 'value')
      .where('v.viewedAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy(`TO_CHAR(v.viewedAt, '${dateFormat}')`)
      .orderBy('date', 'ASC')
      .getRawMany();

    // КАТЕГОРІЇ (Топ 20)
    const categoryShares = await this.orderItemRepo
      .createQueryBuilder('item')
      .innerJoin('item.order', 'order')
      .innerJoin('item.product', 'product')
      .innerJoin('product.category', 'category')
      .select('category.name', 'name')
      .addSelect('SUM(item.quantity)', 'sales')
      .where('order.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('category.id')
      .orderBy('sales', 'DESC')
      .limit(20)
      .getRawMany();

    // ПІДБІРКА ТОПІВ
    const selectProductFields = [
      'product.id AS id',
      'product.name AS name',
      'product.images AS images',
      'product.price AS price',
    ];

    // Топ по замовленнях
    const topOrdered = await this.orderItemRepo
      .createQueryBuilder('item')
      .innerJoin('item.order', 'order')
      .innerJoin('item.product', 'product')
      .select(selectProductFields)
      .addSelect('SUM(item.quantity)', 'count')
      .where('order.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('product.id')
      .orderBy('count', 'DESC')
      .limit(5)
      .getRawMany();

    // Топ по переглядах
    const topViewed = await this.viewedRepo
      .createQueryBuilder('view')
      .innerJoin('view.product', 'product')
      .select(selectProductFields)
      .addSelect('COUNT(view.id)', 'count')
      .where('view.viewedAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('product.id')
      .orderBy('count', 'DESC')
      .limit(5)
      .getRawMany();

    // Топ по відгуках
    const topReviewed = await this.reviewRepo
      .createQueryBuilder('review')
      .innerJoin('review.product', 'product')
      .select(selectProductFields)
      .addSelect('COUNT(review.id)', 'count')
      .where('review.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('product.id')
      .orderBy('count', 'DESC')
      .limit(5)
      .getRawMany();

    // Топ по обраному
    const topWishlisted = await this.wishlistItemRepo
      .createQueryBuilder('w_item')
      .innerJoin('w_item.product', 'product')
      .select(selectProductFields)
      .addSelect('COUNT(w_item.id)', 'count')
      .where('w_item.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('product.id')
      .orderBy('count', 'DESC')
      .limit(5)
      .getRawMany();

    // ОСТАННЯ АКТИВНІСТЬ
    const recentLogs = await this.auditService.getRecentActivity(6);

    const formattedActivity = recentLogs.map((log) => {
      //Формуємо тип дії
      let entityNameStr = 'запис';
      if (log.entityName === 'ProductsEntity') entityNameStr = 'товар';
      if (log.entityName === 'OrderEntity') entityNameStr = 'замовлення';
      if (log.entityName === 'UsersEntity') entityNameStr = 'користувача';
      if (log.entityName === 'CategoriesEntity') entityNameStr = 'категорію';
      if (log.entityName === 'CatalogsEntity') entityNameStr = 'каталог';
      if (log.entityName === 'ReviewsEntity') entityNameStr = 'відгук';

      let actionDesc = '';
      if (log.action === AuditAction.CREATE) actionDesc = `Додано новий ${entityNameStr}`;
      if (log.action === AuditAction.UPDATE) actionDesc = `Відредаговано ${entityNameStr}`;
      if (log.action === AuditAction.DELETE) actionDesc = `Видалено ${entityNameStr}`;

      //Витягуємо назву об'єкта з JSON зліпка
      const data = log.newValues || log.oldValues || {};
      let itemName = '';

      if (log.entityName === 'OrderEntity') {
        itemName = `№${data.orderNumber || 'Невідомо'}`;
      } else if (log.entityName === 'UsersEntity') {
        itemName = data.profile?.firstName
          ? `${data.profile.firstName} ${data.profile.lastName || ''}`.trim()
          : data.email || '';
      } else {
        // Товари, Категорії, Каталоги мають поле name (об'єкт {ua, en} або рядок)
        const nameObj = data.name;
        if (typeof nameObj === 'object' && nameObj !== null) {
          itemName = nameObj.ua || nameObj.en || '';
        } else if (typeof nameObj === 'string') {
          itemName = nameObj;
        } else if (log.entityName === 'ReviewsEntity') {
          itemName = data.comment ? `"${data.comment.substring(0, 40)}..."` : '';
        }
      }

      return {
        id: log.id,
        adminName: log.admin?.profile?.firstName
          ? `${log.admin.profile.firstName} ${log.admin.profile.lastName || ''}`.trim()
          : 'Система/Невідомо',
        role: log.admin?.role || 'admin',
        action: itemName ? `${actionDesc}:\n${itemName}` : actionDesc,
        date: log.createdAt,
      };
    });

    return {
      kpi: {
        online: { value: onlineUsers, trend: calcTrend(onlineUsers, prevOnlineUsers) },
        users: { value: totalUsers, trend: calcTrend(totalUsers, prevUsers) },
        orders: { value: totalOrders, trend: calcTrend(totalOrders, prevOrders) },
        reviews: { value: totalReviews, trend: calcTrend(totalReviews, prevReviews) },
        revenue: { value: totalRevenue, trend: calcTrend(totalRevenue, prevRevenue) },
      },
      charts: {
        salesGraph: salesChart.map((s: any) => ({ date: s.date, value: Number(s.value) })),
        activityGraph: activityChart.map((a: any) => ({ date: a.date, value: Number(a.value) })),
        categories: categoryShares.map((c: any) => {
          const catName = typeof c.name === 'string' ? JSON.parse(c.name as string) : c.name;
          return {
            name: catName?.ua || 'Категорія',
            sales: Number(c.sales),
          };
        }),
      },
      tops: {
        ordered: topOrdered.map((item: any) => this.formatProductResult(item)),
        viewed: topViewed.map((item: any) => this.formatProductResult(item)),
        reviewed: topReviewed.map((item: any) => this.formatProductResult(item)),
        wishlisted: topWishlisted.map((item: any) => this.formatProductResult(item)),
      },
      recentActivity: formattedActivity,
    };
  }

  private formatProductResult(item: any) {
    const parsedName = typeof item.name === 'string' ? JSON.parse(item.name as string) : item.name;
    const parsedImages =
      typeof item.images === 'string' ? JSON.parse(item.images as string) : item.images;

    return {
      id: String(item.id),
      name: parsedName?.ua || 'Без назви',
      image: parsedImages?.[0] || null,
      price: Number(item.price),
      count: Number(item.count),
    };
  }
}
