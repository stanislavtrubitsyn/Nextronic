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
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-log.entity';

type MarkPaymentPreparedPayload = {
  provider: string;
  status: string;
};

type MarkOnlinePaymentResultPayload = {
  provider: string;
  status: string;
  isPaid: boolean;
  targetOrderStatus?: OrderStatus;
  paymentTransactionId?: string | null;
  liqpayOrderId?: string | null;
  rawPayload?: Record<string, unknown> | null;
};

export type PaymentBasketDiscount = {
  type: 'discount' | 'extra';
  mode: 'value' | 'percent';
  value: number;
};

export type PaymentBasketItem = {
  name: string;
  qty: number;
  sum: number;
  total: number;
  code: string;
  unit: string;
  tax: number[];
};

export type OnlinePaymentPreview = {
  amount: number;
  amountInMinorUnits: number;
  basketOrder: PaymentBasketItem[];
  discounts: PaymentBasketDiscount[];
};

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
    private readonly auditService: AuditService,
  ) {}

  async createOrder(userId: string, dto: CreateOrderDto, lang: OrderLangType = 'ua') {
    const t = ORDERS_I18N[lang];

    const cartData = await this.cartService.getMyCart(userId);
    const cartItems = cartData.items;
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
        if (item.product.stock < item.quantity) {
          const nameObj = item.product.name;
          const productName = typeof nameObj === 'object' ? nameObj[lang] : t.defaultProductName;
          throw new BadRequestException(t.outOfStock(productName));
        }

        item.product.stock -= item.quantity;
        await queryRunner.manager.save(item.product);

        const currentPrice = Number(item.product.price);
        const originalPrice = item.product.oldPrice ? Number(item.product.oldPrice) : currentPrice;

        baseAmount += originalPrice * item.quantity;
        discountAmount += (originalPrice - currentPrice) * item.quantity;
      }

      let finalAmount = baseAmount - discountAmount;
      let bonusesToUse = dto.usedBonuses || 0;

      if (bonusesToUse > 0) {
        const availableBalance = await this.bonusService.getBalance(userId);

        if (bonusesToUse > availableBalance) {
          throw new BadRequestException(t.insufficientBonuses(availableBalance));
        }

        const maxDiscount = finalAmount * 0.5;
        if (bonusesToUse > maxDiscount) {
          bonusesToUse = Math.floor(maxDiscount);
        }

        finalAmount -= bonusesToUse;
        await this.bonusService.spendBonuses(userId, bonusesToUse, queryRunner.manager);
      }

      const estimatedDeliveryDate = new Date();
      estimatedDeliveryDate.setDate(estimatedDeliveryDate.getDate() + 3);

      const paymentMethod = dto.paymentMethod || PaymentMethod.CASH;
      const isCardPayment = paymentMethod === PaymentMethod.CARD;

      const order = queryRunner.manager.create(OrderEntity, {
        ...dto,
        user: { id: userId },
        paymentMethod,
        isPaid: false,
        paymentProvider: isCardPayment ? 'liqpay' : null,
        paymentStatus: isCardPayment ? 'created' : null,
        baseAmount,
        discountAmount,
        totalAmount: finalAmount,
        usedBonuses: bonusesToUse,
        estimatedDeliveryDate,
        orderNumber: `NX-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        status: isCardPayment ? OrderStatus.PENDING : OrderStatus.PROCESSING,
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

  async previewOnlineOrderAmount(userId: string, dto: CreateOrderDto, lang: OrderLangType = 'ua') {
    return (await this.buildOnlinePaymentPreview(userId, dto, lang)).amount;
  }

  async buildOnlinePaymentPreview(
    userId: string,
    dto: CreateOrderDto,
    lang: OrderLangType = 'ua',
  ): Promise<OnlinePaymentPreview> {
    const t = ORDERS_I18N[lang];
    const cartData = await this.cartService.getMyCart(userId);
    const cartItems = cartData.items;

    if (cartItems.length === 0) {
      throw new BadRequestException(t.cartEmpty);
    }

    let baseAmount = 0;
    let discountAmount = 0;
    const basketOrder: PaymentBasketItem[] = [];

    for (const item of cartItems) {
      if (item.product.stock < item.quantity) {
        const nameObj = item.product.name;
        const productName = typeof nameObj === 'object' ? nameObj[lang] : t.defaultProductName;
        throw new BadRequestException(t.outOfStock(productName));
      }

      const currentPrice = Number(item.product.price);
      const originalPrice = item.product.oldPrice ? Number(item.product.oldPrice) : currentPrice;
      const quantity = Number(item.quantity || 1);
      const itemTotal = currentPrice * quantity;

      baseAmount += originalPrice * quantity;
      discountAmount += Math.max(0, originalPrice - currentPrice) * quantity;

      const localizedName =
        typeof item.product.name === 'object'
          ? item.product.name[lang] || item.product.name.ua || item.product.name.en
          : t.defaultProductName;

      basketOrder.push({
        name: localizedName || t.defaultProductName,
        qty: quantity,
        sum: Math.round(currentPrice * 100),
        total: Math.round(itemTotal * 100),
        code: item.product.sku || item.product.id,
        unit: 'шт.',
        tax: [0],
      });
    }

    let finalAmount = baseAmount - discountAmount;
    let bonusesToUse = dto.usedBonuses || 0;

    if (bonusesToUse > 0) {
      const availableBalance = await this.bonusService.getBalance(userId);

      if (bonusesToUse > availableBalance) {
        throw new BadRequestException(t.insufficientBonuses(availableBalance));
      }

      const maxDiscount = finalAmount * 0.5;
      if (bonusesToUse > maxDiscount) {
        bonusesToUse = Math.floor(maxDiscount);
      }

      finalAmount -= bonusesToUse;
    }

    const discounts: PaymentBasketDiscount[] =
      bonusesToUse > 0
        ? [
            {
              type: 'discount',
              mode: 'value',
              value: Math.round(bonusesToUse * 100),
            },
          ]
        : [];

    const amount = Number(Number(finalAmount).toFixed(2));

    return {
      amount,
      amountInMinorUnits: Math.max(0, Math.round(amount * 100)),
      basketOrder,
      discounts,
    };
  }

  async createPaidOnlineOrder(
    userId: string,
    dto: CreateOrderDto,
    payment: {
      provider: string;
      status: string;
      paymentTransactionId?: string | null;
      liqpayOrderId?: string | null;
      rawPayload?: Record<string, unknown> | null;
      lang?: OrderLangType;
    },
  ) {
    const lang = payment.lang || 'ua';
    const t = ORDERS_I18N[lang];

    const cartData = await this.cartService.getMyCart(userId);
    const cartItems = cartData.items;
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
        if (item.product.stock < item.quantity) {
          const nameObj = item.product.name;
          const productName = typeof nameObj === 'object' ? nameObj[lang] : t.defaultProductName;
          throw new BadRequestException(t.outOfStock(productName));
        }

        item.product.stock -= item.quantity;
        await queryRunner.manager.save(item.product);

        const currentPrice = Number(item.product.price);
        const originalPrice = item.product.oldPrice ? Number(item.product.oldPrice) : currentPrice;

        baseAmount += originalPrice * item.quantity;
        discountAmount += (originalPrice - currentPrice) * item.quantity;
      }

      let finalAmount = baseAmount - discountAmount;
      let bonusesToUse = dto.usedBonuses || 0;

      if (bonusesToUse > 0) {
        const availableBalance = await this.bonusService.getBalance(userId);

        if (bonusesToUse > availableBalance) {
          throw new BadRequestException(t.insufficientBonuses(availableBalance));
        }

        const maxDiscount = finalAmount * 0.5;
        if (bonusesToUse > maxDiscount) {
          bonusesToUse = Math.floor(maxDiscount);
        }

        finalAmount -= bonusesToUse;
        await this.bonusService.spendBonuses(userId, bonusesToUse, queryRunner.manager);
      }

      const estimatedDeliveryDate = new Date();
      estimatedDeliveryDate.setDate(estimatedDeliveryDate.getDate() + 3);

      const order = queryRunner.manager.create(OrderEntity, {
        ...dto,
        user: { id: userId },
        paymentMethod: PaymentMethod.CARD,
        isPaid: true,
        paidAt: new Date(),
        paymentProvider: payment.provider,
        paymentStatus: payment.status,
        paymentTransactionId: payment.paymentTransactionId || null,
        liqpayOrderId: payment.liqpayOrderId || null,
        paymentPayload: payment.rawPayload || null,
        baseAmount,
        discountAmount,
        totalAmount: finalAmount,
        usedBonuses: bonusesToUse,
        estimatedDeliveryDate,
        orderNumber: `NX-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        status: OrderStatus.CONFIRMED,
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

      await this.notificationsService.createNotification(
        userId,
        'orderPaidTitle',
        'orderPaidBody',
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

  async updateStatus(
    id: string,
    dto: UpdateOrderStatusDto,
    adminId: string,
    lang: OrderLangType = 'ua',
  ) {
    const t = ORDERS_I18N[lang];

    const order = await this.orderRepo.findOne({
      where: { id },
      relations: ['user', 'items', 'items.product'],
    });

    if (!order) {
      throw new NotFoundException(t.orderNotFound);
    }

    const oldStatus = order.status;
    if (oldStatus === dto.status) return order;

    // Робимо зліпок старого стану замовлення до будь-яких змін
    const oldOrderSnapshot = JSON.parse(JSON.stringify(order));

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      order.status = dto.status;

      if (dto.status === OrderStatus.DELIVERED) {
        order.deliveryDate = new Date();
        order.isPaid = true;

        const firstItem = order.items?.[0];
        const nameObj = firstItem?.product?.name;
        const productName = typeof nameObj === 'object' ? nameObj['ua'] : nameObj || 'Product';
        await this.bonusService.addBonuses(order.user.id, Number(order.totalAmount), productName);
      }

      if (dto.status === OrderStatus.CANCELLED) {
        if (Number(order.usedBonuses) > 0) {
          await this.bonusService.refundBonuses(order.user.id, Number(order.usedBonuses));
        }

        for (const item of order.items) {
          if (item.product) {
            const product = await queryRunner.manager.findOne(ProductsEntity, {
              where: { id: item.product.id },
            });
            if (product) {
              product.stock += item.quantity;
              await queryRunner.manager.save(product);
            }
          }
        }

        await this.notificationsService.createNotification(
          order.user.id,
          'orderCancelledTitle',
          'orderCancelledBody',
          { num: order.orderNumber },
        );
      }

      const savedOrder = await queryRunner.manager.save(order);

      //ЗАПИСУЄМО В АУДИТ ПЕРЕД КОМІТОМ
      await this.auditService.logAction(
        adminId,
        AuditAction.UPDATE,
        'OrderEntity',
        savedOrder.id,
        oldOrderSnapshot, // Старий стан (щоб знати, з якого статусу перейшли)
        savedOrder, // Новий стан
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

  async getOrderForOnlinePayment(id: string, userId: string, lang: OrderLangType = 'ua') {
    const t = ORDERS_I18N[lang];
    const order = await this.orderRepo.findOne({
      where: { id, user: { id: userId } },
      relations: ['user'],
    });

    if (!order) {
      throw new NotFoundException(t.orderNotFound);
    }

    if (order.paymentMethod !== PaymentMethod.CARD) {
      throw new BadRequestException(t.onlinePaymentOnly);
    }

    if (order.isPaid) {
      throw new BadRequestException(t.orderAlreadyPaid);
    }

    return order;
  }

  async markPaymentPrepared(id: string, payload: MarkPaymentPreparedPayload) {
    const order = await this.orderRepo.findOne({ where: { id } });

    if (!order) {
      throw new NotFoundException(ORDERS_I18N.ua.orderNotFound);
    }

    order.paymentProvider = payload.provider;
    order.paymentStatus = payload.status;

    return await this.orderRepo.save(order);
  }

  async markOnlinePaymentResult(id: string, payload: MarkOnlinePaymentResultPayload) {
    const order = await this.orderRepo.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!order) {
      throw new NotFoundException(ORDERS_I18N.ua.orderNotFound);
    }

    const wasPaid = order.isPaid;

    order.paymentProvider = payload.provider;
    order.paymentStatus = payload.status;
    order.paymentTransactionId = payload.paymentTransactionId || order.paymentTransactionId || null;
    order.liqpayOrderId = payload.liqpayOrderId || order.liqpayOrderId || null;
    order.paymentPayload = payload.rawPayload || order.paymentPayload || null;

    if (payload.isPaid) {
      order.isPaid = true;
      order.paidAt = order.paidAt || new Date();
      order.status = payload.targetOrderStatus || OrderStatus.CONFIRMED;

      if (!wasPaid) {
        await this.notificationsService.createNotification(
          order.user.id,
          'orderPaidTitle',
          'orderPaidBody',
          { num: order.orderNumber, amount: Number(order.totalAmount) },
        );
      }
    }

    return await this.orderRepo.save(order);
  }

  // ЗАГЛУШКА ДЛЯ ОПЛАТИ ОНЛАЙН - залишено для сумісності зі старим frontend/admin flow
  async mockPayOrder(id: string, userId: string, lang: OrderLangType = 'ua') {
    const order = await this.orderRepo.findOne({
      where: { id, user: { id: userId } },
    });

    if (!order) {
      throw new NotFoundException(ORDERS_I18N[lang].orderNotFound);
    }
    if (order.isPaid) {
      throw new BadRequestException(ORDERS_I18N[lang].orderAlreadyPaid);
    }

    order.isPaid = true;
    order.paidAt = new Date();
    order.paymentStatus = 'mock_success';

    // Якщо замовлення було тільки створене (PENDING), переводимо його в "Підтверджено"
    if (order.status === OrderStatus.PENDING) {
      order.status = OrderStatus.CONFIRMED;
    }

    return await this.orderRepo.save(order);
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
