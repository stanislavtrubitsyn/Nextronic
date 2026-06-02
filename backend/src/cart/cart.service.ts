import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CartEntity } from './cart.entity';
import { AddToCartDto } from './cart.dto';
import { CART_I18N, CartLangType } from './cart.i18n';
import { ProductsEntity } from '../products/products.entity';
import { RecommendationsService } from '../recommendations/recommendations.service';
import { ActivityAction } from '../recommendations/user-activity.entity';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(CartEntity)
    private readonly cartRepo: Repository<CartEntity>,
    @InjectRepository(ProductsEntity)
    private readonly productRepo: Repository<ProductsEntity>,
    private readonly recommendationsService: RecommendationsService,
  ) {}

  async getMyCart(userId: string) {
    const items = await this.cartRepo.find({
      where: { user: { id: userId } },
      relations: ['product', 'product.category'],
      order: { createdAt: 'DESC' },
    });

    // РОЗРАХУНОК МАТЕМАТИКИ ДЛЯ ФРОНТЕНДУ
    let baseAmount = 0;
    let discountAmount = 0;

    for (const item of items) {
      const currentPrice = Number(item.product.price);
      const originalPrice = item.product.oldPrice ? Number(item.product.oldPrice) : currentPrice;

      baseAmount += originalPrice * item.quantity;
      discountAmount += (originalPrice - currentPrice) * item.quantity;
    }

    const totalAmount = baseAmount - discountAmount;

    return {
      items,
      summary: {
        totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
        baseAmount,
        discountAmount,
        totalAmount,
      },
    };
  }

  async addToCart(userId: string, dto: AddToCartDto, lang: CartLangType = 'ua') {
    const t = CART_I18N[lang];

    const product = await this.productRepo.findOne({
      where: { id: dto.productId },
      relations: ['category'],
    });
    if (!product) throw new NotFoundException('Product not found');

    let item = await this.cartRepo.findOne({
      where: { user: { id: userId }, product: { id: dto.productId } },
    });

    const requestedQty = dto.quantity || 1;
    const currentQty = item ? item.quantity : 0;
    const newQty = currentQty + requestedQty;

    // Перевірка ліміту 10 одиниць
    if (newQty > 10) throw new BadRequestException(t.maxLimitReached);

    // Перевірка наявності на складі
    if (newQty > product.stock) throw new BadRequestException(t.outOfStock);

    if (product.category) {
      await this.recommendationsService.logActivity(
        userId,
        product.category.id,
        ActivityAction.ADD_TO_CART,
        {
          productId: product.id,
          quantity: requestedQty,
          metadata: { source: 'cart' },
        },
      );
    }

    if (item) {
      item.quantity = newQty;
    } else {
      item = this.cartRepo.create({
        user: { id: userId },
        product: { id: dto.productId },
        quantity: requestedQty,
      });
    }
    return await this.cartRepo.save(item);
  }

  async updateQuantity(
    userId: string,
    itemId: string,
    quantity: number,
    lang: CartLangType = 'ua',
  ) {
    const t = CART_I18N[lang];
    const item = await this.cartRepo.findOne({
      where: { id: itemId, user: { id: userId } },
      relations: ['product'], // Обов'язково завантажуємо продукт для перевірки stock
    });

    if (!item) {
      throw new NotFoundException(t.itemNotFound);
    }

    // Перевірки
    if (quantity > 10) throw new BadRequestException(t.maxLimitReached);
    if (quantity > item.product.stock) throw new BadRequestException(t.outOfStock);

    item.quantity = quantity;
    return await this.cartRepo.save(item);
  }

  async removeItem(userId: string, itemId: string, lang: CartLangType = 'ua') {
    const item = await this.cartRepo.findOne({
      where: { id: itemId, user: { id: userId } },
    });

    if (!item) {
      throw new NotFoundException(CART_I18N[lang].itemNotFound);
    }
    return await this.cartRepo.remove(item);
  }

  async removeProductsFromCart(userId: string, productIds: string[]) {
    const uniqueProductIds = Array.from(new Set(productIds.filter(Boolean)));

    if (uniqueProductIds.length === 0) return { affected: 0 };

    return await this.cartRepo.delete({
      user: { id: userId },
      product: { id: In(uniqueProductIds) },
    });
  }

  async clearCart(userId: string) {
    return await this.cartRepo.delete({ user: { id: userId } });
  }
}
