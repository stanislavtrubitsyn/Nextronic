import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm'; // Додаємо ILike для пошуку
import { WishlistsEntity } from './wishlists.entity';
import { WishlistItemEntity } from './wishlist-item.entity';
import { CreateWishlistDto, AddToWishlistDto } from './wishlists.dto';

@Injectable()
export class WishlistService {
  constructor(
    @InjectRepository(WishlistsEntity) private readonly wishlistRepo: Repository<WishlistsEntity>,
    @InjectRepository(WishlistItemEntity) private readonly itemRepo: Repository<WishlistItemEntity>,
  ) {}

  async createWishlist(userId: string, dto: CreateWishlistDto) {
    const wishlist = this.wishlistRepo.create({ ...dto, user: { id: userId } });
    return await this.wishlistRepo.save(wishlist);
  }

  async getMyWishlists(userId: string, search?: string) {
    return await this.wishlistRepo.find({
      where: {
        user: { id: userId },
        ...(search ? { name: ILike(`%${search}%`) } : {}),
      },
      relations: ['items', 'items.product'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(userId: string, id: string) {
    const wishlist = await this.wishlistRepo.findOne({
      where: { id, user: { id: userId } },
      relations: ['items', 'items.product'],
    });

    if (!wishlist) {
      throw new NotFoundException('Wishlist not found or access denied');
    }

    return wishlist;
  }

  async addItem(userId: string, wishlistId: string, dto: AddToWishlistDto) {
    const wishlist = await this.wishlistRepo.findOne({
      where: { id: wishlistId },
      relations: ['user'],
    });

    if (!wishlist) throw new NotFoundException('Wishlist not found');
    if (wishlist.user.id !== userId) throw new ForbiddenException('Not your wishlist');

    const item = this.itemRepo.create({
      wishlist: { id: wishlistId },
      product: { id: dto.productId },
    });
    return await this.itemRepo.save(item);
  }

  async removeItemByProductId(userId: string, wishlistId: string, productId: string) {
    const wishlist = await this.wishlistRepo.findOne({
      where: { id: wishlistId, user: { id: userId } },
    });
    if (!wishlist) throw new NotFoundException('Wishlist not found');

    const item = await this.itemRepo.findOne({
      where: {
        wishlist: { id: wishlistId },
        product: { id: productId },
      },
    });
    if (!item) throw new NotFoundException('Product not found in this wishlist');

    return await this.itemRepo.remove(item);
  }

  async updateWishlist(userId: string, id: string, dto: CreateWishlistDto) {
    const wishlist = await this.wishlistRepo.findOne({
      where: { id, user: { id: userId } },
    });

    if (!wishlist) {
      throw new NotFoundException('Wishlist not found or access denied');
    }

    wishlist.name = dto.name ?? wishlist.name;
    return await this.wishlistRepo.save(wishlist);
  }

  async removeWishlist(userId: string, id: string) {
    const wishlist = await this.wishlistRepo.findOne({ where: { id, user: { id: userId } } });
    if (!wishlist) throw new NotFoundException('Wishlist not found');
    return await this.wishlistRepo.remove(wishlist);
  }
}
