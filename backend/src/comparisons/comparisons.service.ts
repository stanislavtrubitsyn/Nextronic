import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ComparisonsEntity } from './comparisons.entity';
import { ComparisonItemEntity } from './comparison-item.entity';
import { ProductsEntity } from '../products/products.entity';
import { COMPARISONS_I18N, ComparisonLangType } from './comparisons.i18n';
import { RecommendationsService } from '../recommendations/recommendations.service';
import { ActivityAction } from '../recommendations/user-activity.entity';

@Injectable()
export class ComparisonService {
  constructor(
    @InjectRepository(ComparisonsEntity) private readonly compRepo: Repository<ComparisonsEntity>,
    @InjectRepository(ComparisonItemEntity)
    private readonly itemRepo: Repository<ComparisonItemEntity>,
    @InjectRepository(ProductsEntity) private readonly productRepo: Repository<ProductsEntity>,
    private readonly recommendationsService: RecommendationsService,
  ) {}

  async addToComparison(userId: string, productId: string, lang: ComparisonLangType = 'ua') {
    const t = COMPARISONS_I18N[lang];

    const product = await this.productRepo.findOne({
      where: { id: productId },
      relations: ['category'],
    });
    if (!product) throw new NotFoundException(t.productNotFound);

    //Логіка рекомендацій
    await this.recommendationsService.logActivity(
      userId,
      product.category.id,
      ActivityAction.COMPARE,
    );

    const category = product.category;

    let comparison = await this.compRepo.findOne({
      where: { user: { id: userId }, category: { id: category.id } },
    });

    if (!comparison) {
      comparison = this.compRepo.create({
        name: category.name,
        user: { id: userId },
        category: { id: category.id },
      });
      await this.compRepo.save(comparison);
    }

    const exists = await this.itemRepo.findOne({
      where: { comparison: { id: comparison.id }, product: { id: productId } },
    });
    if (exists) throw new BadRequestException(t.alreadyInComparison);

    const item = this.itemRepo.create({ comparison, product });
    return await this.itemRepo.save(item);
  }

  async removeItem(userId: string, productId: string, lang: ComparisonLangType = 'ua') {
    const item = await this.itemRepo.findOne({
      where: { product: { id: productId }, comparison: { user: { id: userId } } },
    });
    if (!item) throw new NotFoundException(COMPARISONS_I18N[lang].itemNotFound);

    await this.itemRepo.remove(item);
    return { message: COMPARISONS_I18N[lang].removedSuccess };
  }

  async removeComparison(userId: string, id: string, lang: ComparisonLangType = 'ua') {
    const comp = await this.compRepo.findOne({ where: { id, user: { id: userId } } });
    if (!comp) throw new NotFoundException(COMPARISONS_I18N[lang].listNotFound);
    return await this.compRepo.remove(comp);
  }

  async getMyComparisons(userId: string) {
    return await this.compRepo.find({
      where: { user: { id: userId } },
      relations: [
        'category',
        'items',
        'items.product',
        'items.product.category',
        'items.product.reviews',
        'items.product.attributeValues',
        'items.product.attributeValues.attribute',
      ],
      order: { createdAt: 'DESC' },
    });
  }
}
