import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { OrderEntity, OrderStatus, PaymentMethod } from './orders.entity';
import { OrderItemEntity } from './order-item.entity';
import { CartService } from '../cart/cart.service';
import { CreateOrderDto, UpdateOrderStatusDto } from './orders.dto';
import { BonusService } from '../bonus/bonus.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ORDERS_I18N, OrderLangType } from './orders.i18n';
import { RecommendationsService } from '../recommendations/recommendations.service';
import { ActivityAction } from '../recommendations/user-activity.entity';
import { ProductsEntity } from '../products/products.entity';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(OrderEntity)
    private readonly orderRepo: Repository<OrderEntity>,
    private readonly cartService: CartService,
    private readonly dataSource: DataSource,
    private readonly bonusService: BonusService,
    private readonly notificationsService: NotificationsService,
    private readonly recommendationsService: RecommendationsService,
  ) {}

  async createOrder(userId: string, dto: CreateOrderDto, lang: OrderLangType = 'ua') {
    const t = ORDERS_I18N[lang];

    const cartItems = await this.cartService.getMyCart(userId);
    if (cartItems.length === 0) {
      throw new BadRequestException(t.cartEmpty);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let baseAmount = 0;
      let discountAmount = 0;

      for (const item of cartItems) {
        //КОНТРОЛЬ ЗАЛИШКІВ
        if (item.product.stock < item.quantity) {
          const nameObj = item.product.name;
          const productName = typeof nameObj === 'object' ? nameObj[lang] : 'Товар';
          throw new BadRequestException(t.outOfStock(productName));
        }

        //СПИСАННЯ ЗІ СКЛАДУ
        item.product.stock -= item.quantity;
        await queryRunner.manager.save(item.product);

        //РОЗРАХУНОК ФІНАНСІВ
        const currentPrice = Number(item.product.price);
        const originalPrice = item.product.oldPrice ? Number(item.product.oldPrice) : currentPrice;

        baseAmount += originalPrice * item.quantity;
        discountAmount += (originalPrice - currentPrice) * item.quantity;
      }

      let finalAmount = baseAmount - discountAmount;
      let bonusesToUse = dto.usedBonuses || 0;

      //ЗАСТОСУВАННЯ БОНУСІВ
      if (bonusesToUse > 0) {
        const availableBalance = await this.bonusService.getBalance(userId);

        if (bonusesToUse > availableBalance) {
          throw new BadRequestException(t.insufficientBonuses(availableBalance));
        }

        // Макс. знижка - 50% ВІД КІНЦЕВОЇ СУМИ ТОВАРІВ
        const maxDiscount = finalAmount * 0.5;
        if (bonusesToUse > maxDiscount) {
          bonusesToUse = Math.floor(maxDiscount);
        }

        finalAmount -= bonusesToUse;
        await this.bonusService.spendBonuses(userId, bonusesToUse, queryRunner.manager);
      }

      // Запланована дата доставки
      const estimatedDeliveryDate = new Date();
      estimatedDeliveryDate.setDate(estimatedDeliveryDate.getDate() + 3);

      const order = queryRunner.manager.create(OrderEntity, {
        ...dto,
        user: { id: userId },
        paymentMethod: dto.paymentMethod || PaymentMethod.CASH,
        isPaid: false,
        baseAmount,
        discountAmount,
        totalAmount: finalAmount,
        usedBonuses: bonusesToUse,
        estimatedDeliveryDate,
        orderNumber: `NX-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        status: OrderStatus.PENDING,
      });

      const savedOrder = await queryRunner.manager.save(order);

      const orderItems = cartItems.map((cartItem) => {
        return queryRunner.manager.create(OrderItemEntity, {
          order: savedOrder,
          product: cartItem.product,
          quantity: cartItem.quantity,
          priceAtPurchase: cartItem.product.price,
        });
      });

      await queryRunner.manager.save(orderItems);
      await this.cartService.clearCart(userId);

      // Логіка рекомендацій
      for (const item of cartItems) {
        const productWithCategory = await queryRunner.manager.findOne(ProductsEntity, {
          where: { id: item.product.id },
          relations: ['category'],
        });

        if (productWithCategory && productWithCategory.category) {
          await this.recommendationsService.logActivity(
            userId,
            productWithCategory.category.id,
            ActivityAction.ORDER,
          );
        }
      }

      await this.notificationsService.createNotification(
        userId,
        'orderCreatedTitle',
        'orderCreatedBody',
        { num: savedOrder.orderNumber, amount: finalAmount },
      );

      await queryRunner.commitTransaction();
      return savedOrder;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async updateStatus(id: string, dto: UpdateOrderStatusDto, lang: OrderLangType = 'ua') {
    const t = ORDERS_I18N[lang];

    const order = await this.orderRepo.findOne({
      where: { id },
      relations: ['user', 'items', 'items.product'],
    });

    if (!order) {
      throw new NotFoundException(t.orderNotFound);
    }

    const oldStatus = order.status;
    if (oldStatus === dto.status) return order; // Якщо статус не змінився, нічого не робимо

    // Відкриваємо транзакцію для безпечного оновлення
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      order.status = dto.status;

      // Якщо ДОСТАВЛЕНО
      if (dto.status === OrderStatus.DELIVERED) {
        order.deliveryDate = new Date();
        order.isPaid = true; // Ставимо оплачено

        // Нарахування бонусів
        const firstItem = order.items?.[0];
        const nameObj = firstItem?.product?.name;
        const productName = typeof nameObj === 'object' ? nameObj['ua'] : nameObj || 'Product';
        await this.bonusService.addBonuses(order.user.id, Number(order.totalAmount), productName);
      }

      // Якщо СКАСОВАНО
      if (dto.status === OrderStatus.CANCELLED) {
        // Повертаємо бонуси
        if (Number(order.usedBonuses) > 0) {
          await this.bonusService.refundBonuses(order.user.id, Number(order.usedBonuses));
        }

        // ПОВЕРТАЄМО ТОВАРИ НА СКЛАД
        for (const item of order.items) {
          if (item.product) {
            // Завантажуємо актуальний товар, щоб не перезаписати інший сейв
            const product = await queryRunner.manager.findOne(ProductsEntity, {
              where: { id: item.product.id },
            });
            if (product) {
              product.stock += item.quantity;
              await queryRunner.manager.save(product);
            }
          }
        }

        // Сповіщення
        await this.notificationsService.createNotification(
          order.user.id,
          'orderCancelledTitle',
          'orderCancelledBody',
          { num: order.orderNumber },
        );
      }

      const savedOrder = await queryRunner.manager.save(order);
      await queryRunner.commitTransaction();
      return savedOrder;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async findOne(id: string, lang: OrderLangType = 'ua') {
    const order = await this.orderRepo.findOne({
      where: { id },
      relations: ['user', 'items', 'items.product'],
    });
    if (!order) {
      throw new NotFoundException(ORDERS_I18N[lang].orderNotFound);
    }
    return order;
  }

  async getMyOrders(userId: string) {
    return await this.orderRepo.find({
      where: { user: { id: userId } },
      relations: ['items', 'items.product'],
      order: { createdAt: 'DESC' },
    });
  }

  async findAllOrders() {
    return await this.orderRepo.find({
      relations: ['user', 'items', 'items.product'],
      order: { createdAt: 'DESC' },
    });
  }
}
