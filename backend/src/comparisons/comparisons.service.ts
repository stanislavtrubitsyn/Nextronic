import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ComparisonsEntity } from './comparisons.entity';
import { ComparisonItemEntity } from './comparison-item.entity';
import { ProductsEntity } from '../products/products.entity';

@Injectable()
export class ComparisonService {
  constructor(
    @InjectRepository(ComparisonsEntity) private readonly compRepo: Repository<ComparisonsEntity>,
    @InjectRepository(ComparisonItemEntity)
    private readonly itemRepo: Repository<ComparisonItemEntity>,
    @InjectRepository(ProductsEntity) private readonly productRepo: Repository<ProductsEntity>,
  ) {}

  async addToComparison(userId: string, productId: string) {
    const product = await this.productRepo.findOne({
      where: { id: productId },
      relations: ['category'],
    });
    if (!product) throw new NotFoundException('Product not found');

    const category = product.category;

    // Шукаємо, чи є вже список порівняння для цієї категорії у цього юзера
    let comparison = await this.compRepo.findOne({
      where: { user: { id: userId }, category: { id: category.id } },
    });

    // Якщо немає — створюємо новий
    if (!comparison) {
      comparison = this.compRepo.create({
        name: category.name,
        user: { id: userId },
        category: { id: category.id },
      });
      await this.compRepo.save(comparison);
    }

    // Перевіряємо, чи товар уже є в цьому списку
    const exists = await this.itemRepo.findOne({
      where: { comparison: { id: comparison.id }, product: { id: productId } },
    });
    if (exists) throw new BadRequestException('Product already in comparison');

    const item = this.itemRepo.create({ comparison, product });
    return await this.itemRepo.save(item);
  }

  async getMyComparisons(userId: string) {
    return await this.compRepo.find({
      where: { user: { id: userId } },
      relations: ['items', 'items.product', 'items.product.category'],
    });
  }

  async removeItem(userId: string, productId: string) {
    const item = await this.itemRepo.findOne({
      where: { product: { id: productId }, comparison: { user: { id: userId } } },
    });
    if (!item) throw new NotFoundException('Item not found in your comparisons');

    await this.itemRepo.remove(item);
    return { message: 'Removed successfully' };
  }

  async removeComparison(userId: string, id: string) {
    const comp = await this.compRepo.findOne({ where: { id, user: { id: userId } } });
    if (!comp) throw new NotFoundException('Comparison list not found');
    return await this.compRepo.remove(comp);
  }
}
