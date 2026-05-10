import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { ReviewsEntity, ReviewType } from './reviews.entity';
import { CreateReviewDto, UpdateReviewDto } from './reviews.dto';
import { OrderEntity, OrderStatus } from '../orders/orders.entity';
import { UserRole } from '../users/users.entity';
import { REVIEWS_I18N, ReviewLangType } from './reviews.i18n';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(ReviewsEntity)
    private readonly reviewRepo: Repository<ReviewsEntity>,
    @InjectRepository(OrderEntity)
    private readonly orderRepo: Repository<OrderEntity>,
  ) {}

  async create(userId: string, dto: CreateReviewDto, lang: ReviewLangType = 'ua') {
    const t = REVIEWS_I18N[lang];

    if (dto.type === ReviewType.REVIEW && !dto.rating) {
      throw new BadRequestException(t.ratingRequired);
    }

    if (dto.type === ReviewType.REVIEW) {
      const existing = await this.reviewRepo.findOne({
        where: {
          user: { id: userId },
          product: { id: dto.productId },
          type: ReviewType.REVIEW,
        },
      });
      if (existing) throw new ConflictException(t.alreadyLeft);
    }

    // Перевірка "Придбано" (тільки якщо замовлення доставлено)
    const purchase = await this.orderRepo.findOne({
      where: {
        user: { id: userId },
        status: OrderStatus.DELIVERED, // Тепер враховуємо тільки статус "Доставлено"
        items: { product: { id: dto.productId } },
      },
    });

    const review = this.reviewRepo.create({
      ...dto,
      user: { id: userId },
      product: { id: dto.productId },
      parent: dto.parentId ? { id: dto.parentId } : undefined,
      isVerifiedPurchase: !!purchase,
    });

    return await this.reviewRepo.save(review);
  }

  async update(userId: string, id: string, dto: UpdateReviewDto, lang: ReviewLangType = 'ua') {
    const review = await this.reviewRepo.findOne({
      where: { id, user: { id: userId } },
    });
    if (!review) throw new NotFoundException(REVIEWS_I18N[lang].notFound);

    Object.assign(review, dto);
    return await this.reviewRepo.save(review);
  }

  async remove(id: string, userId: string, role: UserRole, lang: ReviewLangType = 'ua') {
    const t = REVIEWS_I18N[lang];
    const review = await this.reviewRepo.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!review) throw new NotFoundException(t.notFound);

    if (role !== UserRole.ADMIN && review.user.id !== userId) {
      throw new ForbiddenException(t.accessDenied);
    }

    await this.reviewRepo.remove(review);
    return { success: true };
  }

  async getProductReviews(productId: string) {
    return await this.reviewRepo.find({
      where: {
        product: { id: productId },
        parent: IsNull(),
      },
      relations: ['user', 'replies', 'replies.user'],
      order: { createdAt: 'DESC' },
    });
  }
}
