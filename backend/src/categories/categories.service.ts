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

  async create(
    dto: CreateCategoriesDto,
    adminId: string,
    lang: CategoryLangType = 'ua',
  ): Promise<CategoriesEntity> {
    const existing = await this.categoryRepo.findOne({ where: { slug: dto.slug } });
    if (existing) throw new BadRequestException(CATEGORIES_I18N[lang].slugExists);

    const newCategory = this.categoryRepo.create({
      ...dto,
      isActive: dto.isActive ?? true,
      catalog: { id: dto.catalogId },
    });
    const savedCategory = await this.categoryRepo.save(newCategory);

    await this.auditService.logAction(
      adminId,
      AuditAction.CREATE,
      'CategoriesEntity',
      savedCategory.id,
      null,
      savedCategory,
    );
    return savedCategory;
  }

  async findAll(): Promise<any[]> {
    return await this.categoryRepo
      .createQueryBuilder('category')
      .leftJoinAndSelect('category.catalog', 'catalog')
      .loadRelationCountAndMap('category.productCount', 'category.products')
      .orderBy('category.createdAt', 'DESC')
      .getMany();
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
    adminId: string,
    lang: CategoryLangType = 'ua',
  ): Promise<CategoriesEntity> {
    const oldCategory = await this.findOne(id, lang);

    if (dto.slug) {
      const conflict = await this.categoryRepo.findOne({ where: { slug: dto.slug, id: Not(id) } });
      if (conflict) throw new BadRequestException(CATEGORIES_I18N[lang].slugInUse);
    }

    const { catalogId, ...rest } = dto;
    const updated = this.categoryRepo.merge(oldCategory, {
      ...rest,
      isActive: dto.isActive !== undefined ? dto.isActive : oldCategory.isActive,
      catalog: catalogId ? { id: catalogId } : oldCategory.catalog,
    });
    const savedCategory = await this.categoryRepo.save(updated);

    await this.auditService.logAction(
      adminId,
      AuditAction.UPDATE,
      'CategoriesEntity',
      savedCategory.id,
      oldCategory,
      savedCategory,
    );
    return savedCategory;
  }

  async toggleStatus(
    id: string,
    adminId: string,
    lang: CategoryLangType = 'ua',
  ): Promise<CategoriesEntity> {
    const category = await this.findOne(id, lang);
    const oldSnapshot = { ...category };
    category.isActive = !category.isActive;
    const saved = await this.categoryRepo.save(category);

    await this.auditService.logAction(
      adminId,
      AuditAction.UPDATE,
      'CategoriesEntity',
      saved.id,
      oldSnapshot,
      saved,
    );
    return saved;
  }

  async remove(
    id: string,
    adminId: string,
    lang: CategoryLangType = 'ua',
  ): Promise<{ success: boolean }> {
    const oldCategory = await this.findOne(id, lang);
    const result = await this.categoryRepo.delete(id);
    if (result.affected === 0) throw new NotFoundException(CATEGORIES_I18N[lang].notFound);

    await this.auditService.logAction(
      adminId,
      AuditAction.DELETE,
      'CategoriesEntity',
      id,
      oldCategory,
      null,
    );
    return { success: true };
  }
}
