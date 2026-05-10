import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { CategoriesEntity } from './categories.entity';
import { CreateCategoriesDto, UpdateCategoriesDto } from './categories.dto';
import { CATEGORIES_I18N, CategoryLangType } from './categories.i18n';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(CategoriesEntity)
    private readonly categoryRepo: Repository<CategoriesEntity>,
  ) {}

  async create(dto: CreateCategoriesDto, lang: CategoryLangType = 'ua'): Promise<CategoriesEntity> {
    const existing = await this.categoryRepo.findOne({ where: { slug: dto.slug } });
    if (existing) throw new BadRequestException(CATEGORIES_I18N[lang].slugExists);

    const newCategory = this.categoryRepo.create({
      ...dto,
      catalog: { id: dto.catalogId },
    });

    return await this.categoryRepo.save(newCategory);
  }

  async findAll(): Promise<CategoriesEntity[]> {
    return await this.categoryRepo.find({
      relations: ['catalog'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, lang: CategoryLangType = 'ua'): Promise<CategoriesEntity> {
    const category = await this.categoryRepo.findOne({
      where: { id },
      relations: ['catalog'],
    });
    if (!category) throw new NotFoundException(CATEGORIES_I18N[lang].notFound);
    return category;
  }

  async update(
    id: string,
    dto: UpdateCategoriesDto,
    lang: CategoryLangType = 'ua',
  ): Promise<CategoriesEntity> {
    const category = await this.findOne(id, lang);

    if (dto.slug) {
      const conflict = await this.categoryRepo.findOne({ where: { slug: dto.slug, id: Not(id) } });
      if (conflict) throw new BadRequestException(CATEGORIES_I18N[lang].slugInUse);
    }

    const { catalogId, ...rest } = dto;

    const updated = this.categoryRepo.merge(category, {
      ...rest,
      catalog: catalogId ? { id: catalogId } : category.catalog,
    });

    return await this.categoryRepo.save(updated);
  }

  async remove(id: string, lang: CategoryLangType = 'ua'): Promise<{ success: boolean }> {
    const result = await this.categoryRepo.delete(id);
    if (result.affected === 0) throw new NotFoundException(CATEGORIES_I18N[lang].notFound);
    return { success: true };
  }
}
