import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ViewedProductEntity } from './viewed-products.entity';

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

  // Видалити один товар з історії
  async removeView(userId: string, productId: string) {
    const result = await this.viewedRepo.delete({
      user: { id: userId },
      product: { id: productId },
    });

    if (result.affected === 0) throw new NotFoundException('View record not found');
    return { success: true };
  }

  // Очистити всю історію користувача
  async clearHistory(userId: string) {
    await this.viewedRepo.delete({ user: { id: userId } });
    return { success: true };
  }
}
