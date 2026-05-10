import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ViewedProductEntity } from './viewed-products.entity';
import { PRODUCTS_I18N, ProductLangType } from './products.i18n';

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

  async getHistory(userId: string, limit: number = 20) {
    return await this.viewedRepo.find({
      where: { user: { id: userId } },
      relations: ['product'],
      order: { viewedAt: 'DESC' },
      take: limit,
    });
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
}
