import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { OrderEntity, OrderStatus } from './orders.entity';
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

        await this.bonusService.spendBonuses(userId, bonusesToUse, queryRunner.manager);
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

      //Логіка рекомендацій
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
        {
          num: savedOrder.orderNumber,
          amount: finalAmount,
        },
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
    order.status = dto.status;
    const savedOrder = await this.orderRepo.save(order);

    if (dto.status === OrderStatus.DELIVERED && oldStatus !== OrderStatus.DELIVERED) {
      const firstItem = order.items?.[0];
      const nameObj = firstItem?.product?.name;

      const productName = typeof nameObj === 'object' ? nameObj['ua'] : nameObj || 'Product';

      await this.bonusService.addBonuses(order.user.id, Number(order.totalAmount), productName);
    }

    if (dto.status === OrderStatus.CANCELLED && oldStatus !== OrderStatus.CANCELLED) {
      if (Number(order.usedBonuses) > 0) {
        await this.bonusService.refundBonuses(order.user.id, Number(order.usedBonuses));
      }

      await this.notificationsService.createNotification(
        order.user.id,
        'orderCancelledTitle',
        'orderCancelledBody',
        { num: order.orderNumber },
      );
    }

    return savedOrder;
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
