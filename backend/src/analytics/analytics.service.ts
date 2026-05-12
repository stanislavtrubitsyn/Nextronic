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
    // Визначаємо початкову та кінцеву дати для фільтрації
    let startDate = new Date();
    let endDate = new Date();

    if (period === '24h') startDate.setHours(startDate.getHours() - 24);
    else if (period === 'week') startDate.setDate(startDate.getDate() - 7);
    else if (period === 'month') startDate.setMonth(startDate.getMonth() - 1);
    else if (period === 'year') startDate.setFullYear(startDate.getFullYear() - 1);
    else if (period === 'custom' && customStart && customEnd) {
      startDate = new Date(customStart);
      endDate = new Date(customEnd);
      endDate.setHours(23, 59, 59, 999);
    } else if (period === 'all') startDate = new Date(0); // Від початку часів

    // ВЕРХНІ KPI (Статистика)
    const totalUsers = await this.userRepo.count({
      where: { createdAt: Between(startDate, endDate) },
    });

    const totalOrders = await this.orderRepo.count({
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

    // ЛІНІЙНІ ГРАФІКИ (Динаміка по днях)

    // Графік продажів
    const salesChart = await this.orderRepo
      .createQueryBuilder('o')
      .select("TO_CHAR(o.createdAt, 'YYYY-MM-DD')", 'date')
      .addSelect('SUM(o.totalAmount)', 'value')
      .where('o.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('o.status != :cancelled', { cancelled: OrderStatus.CANCELLED })
      .groupBy("TO_CHAR(o.createdAt, 'YYYY-MM-DD')")
      .orderBy('date', 'ASC')
      .getRawMany();

    // Графік активності (перегляди товарів як індикатор активності)
    const activityChart = await this.viewedRepo
      .createQueryBuilder('v')
      .select("TO_CHAR(v.viewedAt, 'YYYY-MM-DD')", 'date')
      .addSelect('COUNT(v.id)', 'value')
      .where('v.viewedAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy("TO_CHAR(v.viewedAt, 'YYYY-MM-DD')")
      .orderBy('date', 'ASC')
      .getRawMany();

    // КАТЕГОРІЇ (Кругова діаграма продажів)
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
      .limit(5)
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

    // Топ по обраному (Wishlists)
    const topWishlisted = await this.wishlistItemRepo
      .createQueryBuilder('w_item')
      .innerJoin('w_item.product', 'product')
      .select(selectProductFields)
      .addSelect('COUNT(w_item.id)', 'count')
      .groupBy('product.id')
      .orderBy('count', 'DESC')
      .limit(5)
      .getRawMany();

    // ОСТАННЯ АКТИВНІСТЬ (Логи аудиту)
    const recentLogs = await this.auditService.getRecentActivity(6);

    const formattedActivity = recentLogs.map((log) => {
      let actionType = 'Змінено';
      if (log.action === AuditAction.CREATE) actionType = 'Створено';
      if (log.action === AuditAction.UPDATE) actionType = 'Оновлено';
      if (log.action === AuditAction.DELETE) actionType = 'Видалено';

      let entityName = log.entityName;
      if (entityName === 'ProductsEntity') entityName = 'Товар';
      if (entityName === 'OrderEntity') entityName = 'Замовлення';
      if (entityName === 'UsersEntity') entityName = 'Користувач';
      if (entityName === 'CategoriesEntity') entityName = 'Категорія';
      if (entityName === 'CatalogsEntity') entityName = 'Каталог';

      return {
        id: log.id,
        adminName: log.admin?.profile?.firstName
          ? `${log.admin.profile.firstName} ${log.admin.profile.lastName}`
          : 'Система/Невідомо',
        role: log.admin?.role || 'admin',
        action: `${actionType} запис: ${entityName}`,
        date: log.createdAt,
      };
    });

    return {
      kpi: {
        online: onlineUsers,
        users: totalUsers,
        orders: totalOrders,
        revenue: totalRevenue,
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
