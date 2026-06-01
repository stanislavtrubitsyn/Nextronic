import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { AuditAction } from '../audit/audit-log.entity';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { OrderEntity, OrderStatus } from '../orders/orders.entity';
import { ProductsEntity } from '../products/products.entity';
import { ActivityAction } from '../recommendations/user-activity.entity';
import { RecommendationsService } from '../recommendations/recommendations.service';
import { UserRole } from '../users/users.entity';
import { CreateReviewDto, ReviewReactionType, UpdateReviewDto } from './reviews.dto';
import { ReviewsEntity, ReviewType } from './reviews.entity';
import { REVIEWS_I18N, ReviewLangType } from './reviews.i18n';

type ProfileReviewsFilter = 'all' | ReviewType;

type GetMyReviewsOptions = {
  page?: number;
  limit?: number;
  type?: ProfileReviewsFilter;
};

type ProfileReviewCounterRow = {
  type: ReviewType;
  count: string;
};

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(ReviewsEntity)
    private readonly reviewRepo: Repository<ReviewsEntity>,
    @InjectRepository(OrderEntity)
    private readonly orderRepo: Repository<OrderEntity>,
    @InjectRepository(ProductsEntity)
    private readonly productRepo: Repository<ProductsEntity>,
    private readonly recommendationsService: RecommendationsService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(userId: string, dto: CreateReviewDto, lang: ReviewLangType = 'ua') {
    const t = REVIEWS_I18N[lang];

    const product = await this.productRepo.findOne({
      where: { id: dto.productId },
      relations: ['category'],
    });

    if (!product) {
      throw new NotFoundException(t.productNotFound);
    }

    const parentReview = dto.parentId
      ? await this.reviewRepo.findOne({
          where: { id: dto.parentId },
          relations: ['user', 'product'],
        })
      : null;

    const type = dto.parentId ? ReviewType.REPLY : dto.type;

    if (dto.parentId && !parentReview) {
      throw new NotFoundException(t.parentNotFound);
    }

    if (parentReview && parentReview.type === ReviewType.REPLY) {
      throw new BadRequestException(t.invalidReplyType);
    }

    if (type === ReviewType.REVIEW && !dto.rating) {
      throw new BadRequestException(t.ratingRequired);
    }

    if (type === ReviewType.REVIEW) {
      const existing = await this.reviewRepo.findOne({
        where: {
          user: { id: userId },
          product: { id: dto.productId },
          type: ReviewType.REVIEW,
          parent: IsNull(),
        },
      });

      if (existing) {
        throw new ConflictException(t.alreadyLeft);
      }
    }

    const isVerifiedPurchase = await this.hasVerifiedPurchase(userId, dto.productId);

    const review = this.reviewRepo.create({
      type,
      rating: type === ReviewType.REVIEW ? dto.rating : null,
      comment: dto.comment,
      advantages: type === ReviewType.REVIEW ? dto.advantages || null : null,
      disadvantages: type === ReviewType.REVIEW ? dto.disadvantages || null : null,
      photos: dto.photos || [],
      likedUserIds: [],
      dislikedUserIds: [],
      user: { id: userId },
      product: { id: dto.productId },
      parent: parentReview ? { id: parentReview.id } : undefined,
      isVerifiedPurchase,
    });

    const savedReview = await this.reviewRepo.save(review);

    if (parentReview && parentReview.user.id !== userId) {
      const nameObj = parentReview.product?.name;
      const productName =
        typeof nameObj === 'object' ? nameObj[lang] || nameObj.ua || 'Товар' : 'Товар';

      await this.notificationsService.createNotification(
        parentReview.user.id,
        'replyTitle',
        'replyBody',
        { product: productName },
      );
    }

    if (product.category) {
      await this.recommendationsService.logActivity(
        userId,
        product.category.id,
        ActivityAction.REVIEW,
      );
    }

    return savedReview;
  }

  async update(userId: string, id: string, dto: UpdateReviewDto, lang: ReviewLangType = 'ua') {
    const review = await this.reviewRepo.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!review) {
      throw new NotFoundException(REVIEWS_I18N[lang].notFound);
    }

    if (review.user.id !== userId) {
      throw new ForbiddenException(REVIEWS_I18N[lang].accessDenied);
    }

    if (review.type === ReviewType.REVIEW) {
      if (dto.rating !== undefined) review.rating = dto.rating;
      if (dto.advantages !== undefined) review.advantages = dto.advantages || null;
      if (dto.disadvantages !== undefined) review.disadvantages = dto.disadvantages || null;
      if (dto.photos !== undefined) review.photos = dto.photos || [];
    }

    if (dto.comment !== undefined) {
      review.comment = dto.comment;
    }

    return await this.reviewRepo.save(review);
  }

  async toggleReaction(
    userId: string,
    id: string,
    reaction: ReviewReactionType,
    lang: ReviewLangType = 'ua',
  ) {
    const review = await this.reviewRepo.findOne({ where: { id } });

    if (!review) {
      throw new NotFoundException(REVIEWS_I18N[lang].notFound);
    }

    const likedUserIds = new Set(review.likedUserIds || []);
    const dislikedUserIds = new Set(review.dislikedUserIds || []);

    if (reaction === ReviewReactionType.LIKE) {
      if (likedUserIds.has(userId)) {
        likedUserIds.delete(userId);
      } else {
        likedUserIds.add(userId);
        dislikedUserIds.delete(userId);
      }
    }

    if (reaction === ReviewReactionType.DISLIKE) {
      if (dislikedUserIds.has(userId)) {
        dislikedUserIds.delete(userId);
      } else {
        dislikedUserIds.add(userId);
        likedUserIds.delete(userId);
      }
    }

    review.likedUserIds = Array.from(likedUserIds);
    review.dislikedUserIds = Array.from(dislikedUserIds);

    const saved = await this.reviewRepo.save(review);

    return {
      id: saved.id,
      likesCount: saved.likedUserIds.length,
      dislikesCount: saved.dislikedUserIds.length,
      userReaction: saved.likedUserIds.includes(userId)
        ? ReviewReactionType.LIKE
        : saved.dislikedUserIds.includes(userId)
          ? ReviewReactionType.DISLIKE
          : null,
    };
  }

  async remove(id: string, userId: string, role: UserRole, lang: ReviewLangType = 'ua') {
    const t = REVIEWS_I18N[lang];
    const review = await this.reviewRepo.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!review) throw new NotFoundException(t.notFound);

    if (
      role !== UserRole.OWNER &&
      role !== UserRole.ADMIN &&
      role !== UserRole.MODERATOR &&
      review.user.id !== userId
    ) {
      throw new ForbiddenException(t.accessDenied);
    }

    const oldReviewSnapshot = JSON.parse(JSON.stringify(review));

    await this.reviewRepo.remove(review);

    if (role === UserRole.OWNER || role === UserRole.ADMIN || role === UserRole.MODERATOR) {
      await this.auditService.logAction(
        userId,
        AuditAction.DELETE,
        'ReviewsEntity',
        id,
        oldReviewSnapshot,
        null,
      );
    }

    return { success: true };
  }

  async getProductReviews(productId: string) {
    const rootItems = await this.reviewRepo.find({
      where: {
        product: { id: productId },
        parent: IsNull(),
      },
      relations: ['user', 'user.profile', 'replies', 'replies.user', 'replies.user.profile'],
      order: { createdAt: 'DESC' },
    });

    const summary = this.buildReviewSummary(rootItems);

    return {
      rating: summary,
      reviews: this.mapProductReviews(rootItems, ReviewType.REVIEW),
      questions: this.mapProductReviews(rootItems, ReviewType.QUESTION),
    };
  }

  async getMyReviews(userId: string, options: GetMyReviewsOptions = {}) {
    const page = Number.isFinite(options.page) ? Math.max(1, Math.trunc(options.page || 1)) : 1;
    const limit = Number.isFinite(options.limit)
      ? Math.min(Math.max(1, Math.trunc(options.limit || 8)), 60)
      : 8;

    const type =
      options.type === ReviewType.REVIEW ||
      options.type === ReviewType.QUESTION ||
      options.type === ReviewType.REPLY
        ? options.type
        : 'all';

    const query = this.reviewRepo
      .createQueryBuilder('review')
      .innerJoin('review.user', 'user', 'user.id = :userId', { userId })
      .leftJoinAndSelect('review.product', 'product')
      .leftJoinAndSelect('review.parent', 'parent')
      .orderBy('review.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (type !== 'all') {
      query.andWhere('review.type = :type', { type });
    }

    const [items, total] = await query.getManyAndCount();

    const rawCounters = await this.reviewRepo
      .createQueryBuilder('review')
      .innerJoin('review.user', 'user', 'user.id = :userId', { userId })
      .select('review.type', 'type')
      .addSelect('COUNT(review.id)', 'count')
      .groupBy('review.type')
      .getRawMany<ProfileReviewCounterRow>();

    const counters = rawCounters.reduce(
      (acc, item) => {
        const count = Number(item.count) || 0;
        acc.all += count;

        if (item.type === ReviewType.REVIEW) acc.review = count;
        if (item.type === ReviewType.QUESTION) acc.question = count;
        if (item.type === ReviewType.REPLY) acc.reply = count;

        return acc;
      },
      {
        all: 0,
        review: 0,
        question: 0,
        reply: 0,
      },
    );

    return {
      items: items.map((item) => this.mapProfileReview(item)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        hasMore: page * limit < total,
      },
      counters,
    };
  }

  private mapProfileReview(review: ReviewsEntity): Record<string, unknown> {
    const product = review.product;
    const parent = review.parent || null;

    return {
      id: review.id,
      type: review.type,
      rating: review.rating || null,
      comment: review.comment,
      advantages: review.advantages || null,
      disadvantages: review.disadvantages || null,
      photos: review.photos || [],
      isVerifiedPurchase: review.isVerifiedPurchase,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
      product: product
        ? {
            id: product.id,
            slug: product.slug,
            name: product.name,
            images: product.images || [],
          }
        : null,
      parent: parent
        ? {
            id: parent.id,
            type: parent.type,
            comment: parent.comment,
          }
        : null,
    };
  }

  private async hasVerifiedPurchase(userId: string, productId: string) {
    const deliveredOrder = await this.orderRepo
      .createQueryBuilder('order')
      .innerJoin('order.user', 'user')
      .innerJoin('order.items', 'item')
      .innerJoin('item.product', 'product')
      .where('user.id = :userId', { userId })
      .andWhere('product.id = :productId', { productId })
      .andWhere('order.status = :status', { status: OrderStatus.DELIVERED })
      .getOne();

    return Boolean(deliveredOrder);
  }

  private buildReviewSummary(rootItems: ReviewsEntity[]) {
    const reviews = rootItems.filter((review) => review.type === ReviewType.REVIEW);

    const distribution = [5, 4, 3, 2, 1].reduce<Record<number, number>>((acc, value) => {
      acc[value] = reviews.filter((review) => review.rating === value).length;
      return acc;
    }, {});

    const ratingSum = reviews.reduce((sum, review) => sum + (review.rating || 0), 0);
    const averageRating = reviews.length > 0 ? Number((ratingSum / reviews.length).toFixed(1)) : 0;

    return {
      averageRating,
      reviewsCount: reviews.length,
      questionsCount: rootItems.filter((review) => review.type === ReviewType.QUESTION).length,
      totalActivity: rootItems.length,
      distribution,
    };
  }

  private mapProductReviews(rootItems: ReviewsEntity[], type: ReviewType) {
    return rootItems
      .filter((review) => review.type === type)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((review) => this.mapReview(review));
  }

  private mapReview(review: ReviewsEntity): Record<string, unknown> {
    return {
      id: review.id,
      type: review.type,
      rating: review.rating || null,
      comment: review.comment,
      advantages: review.advantages || null,
      disadvantages: review.disadvantages || null,
      photos: review.photos || [],
      isVerifiedPurchase: review.isVerifiedPurchase,
      likesCount: (review.likedUserIds || []).length,
      dislikesCount: (review.dislikedUserIds || []).length,
      userReaction: null,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
      author: this.mapReviewAuthor(review.user),
      replies: (review.replies || [])
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        .map((reply) => this.mapReview(reply)),
    };
  }

  private mapReviewAuthor(user: any) {
    const profile = user?.profile;
    const name = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ').trim();

    return {
      id: user?.id || '',
      name: name || user?.email || 'Користувач',
    };
  }
}
