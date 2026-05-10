import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CartEntity } from './cart.entity';
import { AddToCartDto } from './cart.dto';
import { CART_I18N, CartLangType } from './cart.i18n';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(CartEntity)
    private readonly cartRepo: Repository<CartEntity>,
  ) {}

  async getMyCart(userId: string) {
    return await this.cartRepo.find({
      where: { user: { id: userId } },
      relations: ['product'],
      order: { createdAt: 'DESC' },
    });
  }

  async addToCart(userId: string, dto: AddToCartDto) {
    let item = await this.cartRepo.findOne({
      where: { user: { id: userId }, product: { id: dto.productId } },
    });

    if (item) {
      item.quantity += dto.quantity || 1;
    } else {
      item = this.cartRepo.create({
        user: { id: userId },
        product: { id: dto.productId },
        quantity: dto.quantity,
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
    const item = await this.cartRepo.findOne({
      where: { id: itemId, user: { id: userId } },
    });

    if (!item) {
      throw new NotFoundException(CART_I18N[lang].itemNotFound);
    }

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

  async clearCart(userId: string) {
    return await this.cartRepo.delete({ user: { id: userId } });
  }
}
