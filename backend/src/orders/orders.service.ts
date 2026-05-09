import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { OrderEntity, OrderStatus } from './orders.entity';
import { OrderItemEntity } from './order-item.entity';
import { CartService } from '../cart/cart.service';
import { CreateOrderDto, UpdateOrderStatusDto } from './orders.dto';
import { BonusService } from '../bonus/bonus.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(OrderEntity)
    private readonly orderRepo: Repository<OrderEntity>,
    private readonly cartService: CartService,
    private readonly dataSource: DataSource,
    private readonly bonusService: BonusService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // Словник локалізації для замовлень
  private readonly i18n = {
    ua: {
      cartEmpty: 'Кошик порожній',
      orderNotFound: 'Замовлення не знайдено',
      insufficientBonuses: (available: number) => `Недостатньо бонусів. Доступно: ${available}`,
      orderCreatedTitle: 'Замовлення прийнято',
      orderCreatedBody: (num: string, amount: number) =>
        `Ваше замовлення №${num} на суму ${amount} грн успішно створено.`,
      orderCancelledTitle: 'Замовлення скасовано',
      orderCancelledBody: (num: string) =>
        `Замовлення №${num} скасовано. Бонуси повернуто (якщо були використані).`,
    },
    en: {
      cartEmpty: 'Cart is empty',
      orderNotFound: 'Order not found',
      insufficientBonuses: (available: number) => `Not enough bonuses. Available: ${available}`,
      orderCreatedTitle: 'Order Accepted',
      orderCreatedBody: (num: string, amount: number) =>
        `Your order #${num} for ${amount} UAH has been successfully created.`,
      orderCancelledTitle: 'Order Cancelled',
      orderCancelledBody: (num: string) =>
        `Order #${num} has been cancelled. Bonuses refunded (if any were used).`,
    },
  };

  //Створення нового замовлення
  async createOrder(userId: string, dto: CreateOrderDto, lang: 'ua' | 'en' = 'ua') {
    const t = this.i18n[lang];

    const cartItems = await this.cartService.getMyCart(userId);
    if (cartItems.length === 0) {
      throw new BadRequestException(t.cartEmpty);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const baseAmount = cartItems.reduce(
        (sum, item) => sum + Number(item.product.price) * item.quantity,
        0,
      );

      let finalAmount = baseAmount;
      let bonusesToUse = dto.usedBonuses || 0;

      if (bonusesToUse > 0) {
        const availableBalance = await this.bonusService.getBalance(userId);

        if (bonusesToUse > availableBalance) {
          throw new BadRequestException(t.insufficientBonuses(availableBalance));
        }

        const maxDiscount = baseAmount * 0.5;
        if (bonusesToUse > maxDiscount) {
          bonusesToUse = Math.floor(maxDiscount);
        }

        finalAmount = baseAmount - bonusesToUse;

        // Списання бонусів
        await this.bonusService.spendBonuses(userId, bonusesToUse, lang, queryRunner.manager);
      }

      const order = queryRunner.manager.create(OrderEntity, {
        ...dto,
        user: { id: userId },
        totalAmount: finalAmount,
        usedBonuses: bonusesToUse,
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

      // Сповіщення про створення
      await this.notificationsService.createNotification(
        userId,
        t.orderCreatedTitle,
        t.orderCreatedBody(savedOrder.orderNumber, finalAmount),
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

  // Оновлення статусу замовлення
  async updateStatus(id: string, dto: UpdateOrderStatusDto, lang: 'ua' | 'en' = 'ua') {
    const t = this.i18n[lang];

    const order = await this.orderRepo.findOne({
      where: { id },
      relations: ['user', 'items', 'items.product'],
    });

    if (!order) {
      throw new NotFoundException(t.orderNotFound);
    }

    const oldStatus = order.status;
    order.status = dto.status;
    const savedOrder = await this.orderRepo.save(order);

    // Доставлено: нараховуємо бонуси
    if (dto.status === OrderStatus.DELIVERED && oldStatus !== OrderStatus.DELIVERED) {
      const firstItem = order.items?.[0];
      const nameObj = firstItem?.product?.name;

      const productName =
        typeof nameObj === 'object'
          ? nameObj[lang]
          : nameObj || (lang === 'ua' ? 'Товар' : 'Product');

      await this.bonusService.addBonuses(
        order.user.id,
        Number(order.totalAmount),
        productName,
        lang,
      );
    }

    // Скасовано: повертаємо бонуси
    if (dto.status === OrderStatus.CANCELLED && oldStatus !== OrderStatus.CANCELLED) {
      if (Number(order.usedBonuses) > 0) {
        await this.bonusService.refundBonuses(order.user.id, Number(order.usedBonuses), lang);
      }

      await this.notificationsService.createNotification(
        order.user.id,
        t.orderCancelledTitle,
        t.orderCancelledBody(order.orderNumber),
      );
    }

    return savedOrder;
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

  async findOne(id: string, lang: 'ua' | 'en' = 'ua') {
    const order = await this.orderRepo.findOne({
      where: { id },
      relations: ['user', 'items', 'items.product'],
    });
    if (!order) {
      throw new NotFoundException(this.i18n[lang].orderNotFound);
    }
    return order;
  }
}
