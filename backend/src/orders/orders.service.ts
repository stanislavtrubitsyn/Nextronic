import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { OrderEntity } from './orders.entity';
import { OrderItemEntity } from './order-item.entity';
import { CartService } from '../cart/cart.service';
import { CreateOrderDto } from './orders.dto';
import { BonusService } from '../bonus/bonus.service';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(OrderEntity) private readonly orderRepo: Repository<OrderEntity>,
    private readonly cartService: CartService,
    private readonly dataSource: DataSource,
    private readonly bonusService: BonusService,
  ) {}

  async createOrder(userId: string, dto: CreateOrderDto) {
    const cartItems = await this.cartService.getMyCart(userId);
    if (cartItems.length === 0) throw new BadRequestException('Cart is empty');

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const totalAmount = cartItems.reduce(
        (sum, item) => sum + Number(item.product.price) * item.quantity,
        0,
      );

      const order = queryRunner.manager.create(OrderEntity, {
        ...dto,
        user: { id: userId },
        totalAmount,
        orderNumber: `NX-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
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

      await this.bonusService.addBonuses(userId, totalAmount);

      await queryRunner.commitTransaction();
      return savedOrder;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async getMyOrders(userId: string) {
    return await this.orderRepo.find({
      where: { user: { id: userId } },
      relations: ['items', 'items.product'],
      order: { createdAt: 'DESC' },
    });
  }
}
