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

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(ReviewsEntity)
    private readonly reviewRepo: Repository<ReviewsEntity>,
    @InjectRepository(OrderEntity)
    private readonly orderRepo: Repository<OrderEntity>,
  ) {}

  async create(userId: string, dto: CreateReviewDto) {
    //Валідація рейтингу для відгуків
    if (dto.type === ReviewType.REVIEW && !dto.rating) {
      throw new BadRequestException('Rating is required for reviews');
    }

    //Перевірка на дублікат відгуку
    if (dto.type === ReviewType.REVIEW) {
      const existing = await this.reviewRepo.findOne({
        where: {
          user: { id: userId },
          product: { id: dto.productId },
          type: ReviewType.REVIEW,
        },
      });
      if (existing) throw new ConflictException('You already left a review');
    }

    //Перевірка "Придбано"
    const purchase = await this.orderRepo.findOne({
      where: {
        user: { id: userId },
        status: OrderStatus.DELIVERED,
        items: { product: { id: dto.productId } },
      },
    });

    //Створення запису
    // Використовуємо undefined замість null, щоб уникнути помилок типізації
    const review = this.reviewRepo.create({
      ...dto,
      user: { id: userId },
      product: { id: dto.productId },
      parent: dto.parentId ? { id: dto.parentId } : undefined,
      isVerifiedPurchase: !!purchase,
    });

    return await this.reviewRepo.save(review);
  }

  async getProductReviews(productId: string) {
    // Використовуємо IsNull() для коректного фільтра
    return await this.reviewRepo.find({
      where: {
        product: { id: productId },
        parent: IsNull(),
      },
      relations: ['user', 'replies', 'replies.user'],
      order: { createdAt: 'DESC' },
    });
  }

  async update(userId: string, id: string, dto: UpdateReviewDto) {
    const review = await this.reviewRepo.findOne({
      where: { id, user: { id: userId } },
    });
    if (!review) throw new NotFoundException('Review not found or access denied');

    Object.assign(review, dto);
    return await this.reviewRepo.save(review);
  }

  async remove(id: string, userId: string, role: UserRole) {
    const review = await this.reviewRepo.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!review) throw new NotFoundException('Review not found');

    if (role !== UserRole.ADMIN && review.user.id !== userId) {
      throw new ForbiddenException('Access denied');
    }

    await this.reviewRepo.remove(review);
    return { success: true };
  }
}
