import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { CategoriesEntity } from './categories.entity';
import { CreateCategoriesDto, UpdateCategoriesDto } from './categories.dto';
import { CATEGORIES_I18N, CategoryLangType } from './categories.i18n';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-log.entity';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(CategoriesEntity)
    private readonly categoryRepo: Repository<CategoriesEntity>,
    private readonly auditService: AuditService,
  ) {}

  // Додали adminId
  async create(
    dto: CreateCategoriesDto,
    adminId: string,
    lang: CategoryLangType = 'ua',
  ): Promise<CategoriesEntity> {
    const existing = await this.categoryRepo.findOne({ where: { slug: dto.slug } });
    if (existing) throw new BadRequestException(CATEGORIES_I18N[lang].slugExists);

    const newCategory = this.categoryRepo.create({
      ...dto,
      catalog: { id: dto.catalogId },
    });

    const savedCategory = await this.categoryRepo.save(newCategory);

    // ЗАПИСУЄМО В АУДИТ
    await this.auditService.logAction(
      adminId,
      AuditAction.CREATE,
      'CategoriesEntity',
      savedCategory.id,
      null, // Старого стану немає
      savedCategory, // Новий стан
    );

    return savedCategory;
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

  // Додали adminId
  async update(
    id: string,
    dto: UpdateCategoriesDto,
    adminId: string,
    lang: CategoryLangType = 'ua',
  ): Promise<CategoriesEntity> {
    const oldCategory = await this.findOne(id, lang); // Зберігаємо старий стан для відкату

    if (dto.slug) {
      const conflict = await this.categoryRepo.findOne({ where: { slug: dto.slug, id: Not(id) } });
      if (conflict) throw new BadRequestException(CATEGORIES_I18N[lang].slugInUse);
    }

    const { catalogId, ...rest } = dto;

    const updated = this.categoryRepo.merge(oldCategory, {
      ...rest,
      catalog: catalogId ? { id: catalogId } : oldCategory.catalog,
    });

    const savedCategory = await this.categoryRepo.save(updated);

    // ЗАПИСУЄМО В АУДИТ
    await this.auditService.logAction(
      adminId,
      AuditAction.UPDATE,
      'CategoriesEntity',
      savedCategory.id,
      oldCategory, // Старий стан
      savedCategory, // Новий стан
    );

    return savedCategory;
  }

  // Додали adminId
  async remove(
    id: string,
    adminId: string,
    lang: CategoryLangType = 'ua',
  ): Promise<{ success: boolean }> {
    const oldCategory = await this.findOne(id, lang); // Зберігаємо старий стан перед видаленням

    const result = await this.categoryRepo.delete(id);
    if (result.affected === 0) throw new NotFoundException(CATEGORIES_I18N[lang].notFound);

    //ЗАПИСУЄМО В АУДИТ
    await this.auditService.logAction(
      adminId,
      AuditAction.DELETE,
      'CategoriesEntity',
      id,
      oldCategory, // Старий стан для можливості відновлення
      null,
    );

    return { success: true };
  }
}
