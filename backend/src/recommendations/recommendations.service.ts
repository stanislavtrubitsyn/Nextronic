import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In } from 'typeorm';
import { UserActivityEntity, ActivityAction } from './user-activity.entity';
import { ProductsEntity } from '../products/products.entity';
import { OrderItemEntity } from '../orders/order-item.entity';

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

  // --- 1. ТРЕКІНГ АКТИВНОСТІ ---

  private readonly weights = {
    [ActivityAction.VIEW]: 1,
    [ActivityAction.SEARCH]: 2,
    [ActivityAction.COMPARE]: 3,
    [ActivityAction.WISHLIST]: 4,
    [ActivityAction.REVIEW]: 5,
    [ActivityAction.ORDER]: 10,
  };

  async logActivity(userId: string, categoryId: string, action: ActivityAction) {
    if (!userId || !categoryId) return;

    const activity = this.activityRepo.create({
      user: { id: userId },
      category: { id: categoryId },
      action,
      weight: this.weights[action],
    });

    await this.activityRepo.save(activity);
  }

  // --- 2. СПЕЦІАЛЬНО ДЛЯ ВАС (Персоналізовані) ---

  async getPersonalized(userId: string, limit: number = 10) {
    // Рахуємо загальну вагу кожної категорії для користувача
    const topCategories = await this.activityRepo
      .createQueryBuilder('activity')
      .select('activity.categoryId', 'categoryId')
      .addSelect('SUM(activity.weight)', 'totalScore')
      .where('activity.userId = :userId', { userId })
      .groupBy('activity.categoryId')
      .orderBy('"totalScore"', 'DESC')
      .limit(3) // Беремо ТОП-3 улюблені категорії
      .getRawMany();

    if (!topCategories.length) {
      // Якщо юзер новий і історії немає - показуємо популярні товари загалом
      return await this.productRepo.find({
        where: { isActive: true },
        relations: ['category'],
        take: limit,
        // order: { views: 'DESC' } // Можеш додати сортування за переглядами
      });
    }

    const categoryIds = topCategories.map((c: { categoryId: string }) => c.categoryId);

    // Повертаємо товари з улюблених категорій
    return await this.productRepo.find({
      where: {
        category: { id: In(categoryIds) },
        isActive: true,
      },
      relations: ['category'],
      take: limit,
    });
  }

  // --- 3. СХОЖІ ТОВАРИ (Контентні) ---

  async getSimilar(productId: string, limit: number = 8) {
    const product = await this.productRepo.findOne({
      where: { id: productId },
      relations: ['category'],
    });

    if (!product) return [];

    return await this.productRepo.find({
      where: {
        category: { id: product.category.id },
        id: Not(product.id), // Не показуємо цей самий товар
        isActive: true,
      },
      relations: ['category'],
      take: limit,
      // order: { price: 'ASC' } - можна сортувати за ціною
    });
  }

  // --- 4. З ЦИМ КУПУЮТЬ (Колаборативні) ---

  async getBoughtTogether(productId: string, limit: number = 5) {
    // SQL: Знайти всі товари, які є в тих самих замовленнях, що й поточний товар
    const boughtTogether = await this.orderItemRepo
      .createQueryBuilder('targetItem')
      .innerJoin(OrderItemEntity, 'otherItem', 'targetItem.orderId = otherItem.orderId')
      .innerJoinAndSelect('targetItem.product', 'product')
      .where('otherItem.productId = :productId', { productId })
      .andWhere('targetItem.productId != :productId', { productId })
      .select(['product.id', 'product.name', 'product.slug', 'product.price', 'product.images'])
      .addSelect('COUNT(targetItem.productId)', 'frequency')
      .groupBy('product.id')
      .orderBy('frequency', 'DESC')
      .limit(limit)
      .getRawAndEntities();

    // Якщо до цього товару ще нічого в пару не купували (новий товар),
    // можна повернути аксесуари з БД як fallback.
    return boughtTogether.entities;
  }
}
