import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ViewedProductEntity } from './viewed-products.entity';
import { PRODUCTS_I18N, ProductLangType } from './products.i18n';

export interface ViewedProductsPaginationOptions {
  page: number;
  limit: number;
}

export interface ViewedProductsPaginatedHistory {
  items: ViewedProductEntity[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

@Injectable()
export class ViewedProductsService {
  constructor(
    @InjectRepository(ViewedProductEntity)
    private readonly viewedRepo: Repository<ViewedProductEntity>,
  ) {}

  async addView(userId: string, productId: string) {
    const existingView = await this.viewedRepo.findOne({
      where: { user: { id: userId }, product: { id: productId } },
    });

    if (existingView) {
      existingView.viewedAt = new Date();
      return await this.viewedRepo.save(existingView);
    }

    const newView = this.viewedRepo.create({
      user: { id: userId },
      product: { id: productId },
    });
    return await this.viewedRepo.save(newView);
  }

  async getHistory(userId: string, limit?: number): Promise<ViewedProductEntity[]>;
  async getHistory(
    userId: string,
    options: ViewedProductsPaginationOptions,
  ): Promise<ViewedProductsPaginatedHistory>;
  async getHistory(
    userId: string,
    limitOrOptions: number | ViewedProductsPaginationOptions = 20,
  ): Promise<ViewedProductEntity[] | ViewedProductsPaginatedHistory> {
    if (typeof limitOrOptions === 'number') {
      return await this.viewedRepo.find({
        where: {
          user: { id: userId },
          product: { isActive: true },
        },
        relations: ['product', 'product.category', 'product.reviews'],
        order: { viewedAt: 'DESC' },
        take: this.normalizeLimit(limitOrOptions),
      });
    }

    const page = this.normalizePage(limitOrOptions.page);
    const limit = this.normalizeLimit(limitOrOptions.limit);
    const skip = (page - 1) * limit;

    const [items, total] = await this.viewedRepo.findAndCount({
      where: {
        user: { id: userId },
        product: { isActive: true },
      },
      relations: ['product', 'product.category', 'product.reviews'],
      order: { viewedAt: 'DESC' },
      take: limit,
      skip,
    });

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
    };
  }

  async removeView(userId: string, productId: string, lang: ProductLangType = 'ua') {
    const result = await this.viewedRepo.delete({
      user: { id: userId },
      product: { id: productId },
    });

    if (result.affected === 0) throw new NotFoundException(PRODUCTS_I18N[lang].viewNotFound);
    return { success: true };
  }

  async clearHistory(userId: string) {
    await this.viewedRepo.delete({ user: { id: userId } });
    return { success: true };
  }

  private normalizePage(page: number) {
    if (!Number.isFinite(page) || page < 1) return 1;
    return Math.trunc(page);
  }

  private normalizeLimit(limit: number) {
    if (!Number.isFinite(limit) || limit < 1) return 20;
    return Math.min(Math.trunc(limit), 50);
  }
}
