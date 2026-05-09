import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReviewsEntity } from './reviews.entity';
import { CreateReviewDto, UpdateReviewDto } from './reviews.dto';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(ReviewsEntity)
    private readonly reviewRepo: Repository<ReviewsEntity>,
  ) {}

  async create(userId: string, dto: CreateReviewDto) {
    // Перевірка на дублікат відгуку від цього юзера
    const existing = await this.reviewRepo.findOne({
      where: { user: { id: userId }, product: { id: dto.productId } },
    });

    if (existing) {
      throw new ConflictException('You have already reviewed this product');
    }

    const review = this.reviewRepo.create({
      ...dto,
      user: { id: userId },
      product: { id: dto.productId },
    });

    return await this.reviewRepo.save(review);
  }

  async getProductReviews(productId: string) {
    return await this.reviewRepo.find({
      where: { product: { id: productId } },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async update(userId: string, id: string, dto: UpdateReviewDto) {
    const review = await this.reviewRepo.findOne({
      where: { id, user: { id: userId } },
    });

    if (!review) throw new NotFoundException('Review not found or access denied');

    // Оновлюємо лише ті поля, що прийшли
    Object.assign(review, dto);

    return await this.reviewRepo.save(review);
  }

  async remove(userId: string, id: string) {
    const review = await this.reviewRepo.findOne({
      where: { id, user: { id: userId } },
    });

    if (!review) throw new NotFoundException('Review not found');

    return await this.reviewRepo.remove(review);
  }
}
