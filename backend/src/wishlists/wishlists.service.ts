import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { WishlistsEntity } from './wishlists.entity';
import { WishlistItemEntity } from './wishlist-item.entity';
import { CreateWishlistDto, AddToWishlistDto, MoveWishlistItemDto } from './wishlists.dto';
import { WISHLISTS_I18N, WishlistLangType } from './wishlists.i18n';
import { ProductsEntity } from '../products/products.entity';
import { RecommendationsService } from '../recommendations/recommendations.service';
import { ActivityAction } from '../recommendations/user-activity.entity';

@Injectable()
export class WishlistService {
  constructor(
    @InjectRepository(WishlistsEntity)
    private readonly wishlistRepo: Repository<WishlistsEntity>,
    @InjectRepository(WishlistItemEntity)
    private readonly itemRepo: Repository<WishlistItemEntity>,
    @InjectRepository(ProductsEntity)
    private readonly productRepo: Repository<ProductsEntity>,
    private readonly recommendationsService: RecommendationsService,
  ) {}

  async createWishlist(userId: string, dto: CreateWishlistDto, lang: WishlistLangType = 'ua') {
    const name = dto.name || WISHLISTS_I18N[lang].defaultName;
    const wishlist = this.wishlistRepo.create({ name, user: { id: userId } });
    return await this.wishlistRepo.save(wishlist);
  }

  async getMyWishlists(userId: string, search?: string) {
    return await this.wishlistRepo.find({
      where: {
        user: { id: userId },
        ...(search ? { name: ILike(`%${search}%`) } : {}),
      },
      relations: ['items', 'items.product', 'items.product.category', 'items.product.reviews'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(userId: string, id: string, lang: WishlistLangType = 'ua') {
    const wishlist = await this.wishlistRepo.findOne({
      where: { id, user: { id: userId } },
      relations: ['items', 'items.product', 'items.product.category', 'items.product.reviews'],
    });

    if (!wishlist) {
      throw new NotFoundException(WISHLISTS_I18N[lang].notFound);
    }

    return wishlist;
  }

  async addItem(
    userId: string,
    wishlistId: string,
    dto: AddToWishlistDto,
    lang: WishlistLangType = 'ua',
  ) {
    const t = WISHLISTS_I18N[lang];

    //Шукаємо товар
    const product = await this.productRepo.findOne({
      where: { id: dto.productId },
      relations: ['category'],
    });

    //
    if (!product) throw new NotFoundException(t.productNotFound);

    //Тепер Typescript знає, що product точно існує, і помилки не буде
    await this.recommendationsService.logActivity(
      userId,
      product.category.id,
      ActivityAction.WISHLIST,
    );

    //Перевіряємо сам список бажаного
    const wishlist = await this.wishlistRepo.findOne({
      where: { id: wishlistId },
      relations: ['user'],
    });

    if (!wishlist) throw new NotFoundException(t.notFound);
    if (wishlist.user.id !== userId) throw new ForbiddenException(t.notYourWishlist);

    const existingItem = await this.itemRepo.findOne({
      where: {
        wishlist: { id: wishlistId },
        product: { id: dto.productId },
      },
    });

    if (existingItem) return existingItem;

    //Зберігаємо
    const item = this.itemRepo.create({
      wishlist: { id: wishlistId },
      product: { id: dto.productId },
    });
    return await this.itemRepo.save(item);
  }

  async moveItem(userId: string, dto: MoveWishlistItemDto, lang: WishlistLangType = 'ua') {
    const t = WISHLISTS_I18N[lang];

    if (dto.fromWishlistId === dto.toWishlistId) {
      const existingItem = await this.itemRepo.findOne({
        where: {
          wishlist: { id: dto.fromWishlistId },
          product: { id: dto.productId },
        },
      });

      if (!existingItem) throw new NotFoundException(t.productNotFound);
      return existingItem;
    }

    const [fromWishlist, toWishlist] = await Promise.all([
      this.wishlistRepo.findOne({
        where: { id: dto.fromWishlistId, user: { id: userId } },
      }),
      this.wishlistRepo.findOne({
        where: { id: dto.toWishlistId, user: { id: userId } },
      }),
    ]);

    if (!fromWishlist || !toWishlist) throw new NotFoundException(t.notFound);

    const sourceItem = await this.itemRepo.findOne({
      where: {
        wishlist: { id: dto.fromWishlistId },
        product: { id: dto.productId },
      },
      relations: ['product'],
    });

    if (!sourceItem) throw new NotFoundException(t.productNotFound);

    const existingTargetItem = await this.itemRepo.findOne({
      where: {
        wishlist: { id: dto.toWishlistId },
        product: { id: dto.productId },
      },
    });

    if (existingTargetItem) {
      await this.itemRepo.remove(sourceItem);
      return existingTargetItem;
    }

    sourceItem.wishlist = toWishlist;
    return await this.itemRepo.save(sourceItem);
  }

  async removeItemByProductId(
    userId: string,
    wishlistId: string,
    productId: string,
    lang: WishlistLangType = 'ua',
  ) {
    const t = WISHLISTS_I18N[lang];
    const wishlist = await this.wishlistRepo.findOne({
      where: { id: wishlistId, user: { id: userId } },
    });
    if (!wishlist) throw new NotFoundException(t.notFound);

    const item = await this.itemRepo.findOne({
      where: {
        wishlist: { id: wishlistId },
        product: { id: productId },
      },
    });
    if (!item) throw new NotFoundException(t.productNotFound);

    return await this.itemRepo.remove(item);
  }

  async updateWishlist(
    userId: string,
    id: string,
    dto: CreateWishlistDto,
    lang: WishlistLangType = 'ua',
  ) {
    const wishlist = await this.wishlistRepo.findOne({
      where: { id, user: { id: userId } },
    });

    if (!wishlist) {
      throw new NotFoundException(WISHLISTS_I18N[lang].notFound);
    }

    wishlist.name = dto.name ?? wishlist.name;
    return await this.wishlistRepo.save(wishlist);
  }

  async removeWishlist(userId: string, id: string, lang: WishlistLangType = 'ua') {
    const wishlist = await this.wishlistRepo.findOne({
      where: { id, user: { id: userId } },
    });
    if (!wishlist) throw new NotFoundException(WISHLISTS_I18N[lang].notFound);
    return await this.wishlistRepo.remove(wishlist);
  }
}
