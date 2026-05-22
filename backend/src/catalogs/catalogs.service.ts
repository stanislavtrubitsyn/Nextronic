import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, DataSource } from 'typeorm';
import { CatalogsEntity } from './catalogs.entity';
import { CreateCatalogDto, UpdateCatalogDto } from './catalogs.dto';
import { CATALOGS_I18N, CatalogLangType } from './catalogs.i18n';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-log.entity';
import { ProductsEntity } from '../products/products.entity';

@Injectable()
export class CatalogsService {
  constructor(
    @InjectRepository(CatalogsEntity)
    private readonly catalogRepo: Repository<CatalogsEntity>,
    private readonly auditService: AuditService,
    private readonly dataSource: DataSource,
  ) {}

  // Додали adminId
  async create(
    dto: CreateCatalogDto,
    adminId: string,
    lang: CatalogLangType = 'ua',
  ): Promise<CatalogsEntity> {
    const existing = await this.catalogRepo.findOne({ where: { slug: dto.slug } });
    if (existing) throw new BadRequestException(CATALOGS_I18N[lang].slugExists);

    const newCatalog = this.catalogRepo.create({
      ...dto,
      isActive: dto.isActive ?? true,
    });
    const savedCatalog = await this.catalogRepo.save(newCatalog);

    //ЗАПИСУЄМО В АУДИТ
    await this.auditService.logAction(
      adminId,
      AuditAction.CREATE,
      'CatalogsEntity', // Точна назва сутності для відновлення
      savedCatalog.id,
      null,
      savedCatalog,
    );

    return savedCatalog;
  }

  async findAll(): Promise<CatalogsEntity[]> {
    return await this.catalogRepo.find({
      relations: ['categories'],
      order: { createdAt: 'ASC' },
    });
  }

  async findOne(id: string, lang: CatalogLangType = 'ua'): Promise<CatalogsEntity> {
    const catalog = await this.catalogRepo.findOne({ where: { id }, relations: ['categories'] });
    if (!catalog) throw new NotFoundException(CATALOGS_I18N[lang].notFound);
    return catalog;
  }

  async getMenuWithTopProducts() {
    const catalogs = await this.catalogRepo.find({
      relations: ['categories'],
      order: { createdAt: 'ASC' },
    });

    for (const catalog of catalogs) {
      for (const category of catalog.categories) {
        // Шукаємо ТОП-5 товарів для поточної категорії
        const products = await this.dataSource
          .getRepository(ProductsEntity)
          .createQueryBuilder('product')
          .where('product.category.id = :categoryId', { categoryId: category.id })
          .andWhere('product.isActive = :isActive', { isActive: true })
          .orderBy('product.createdAt', 'DESC') // Сортуємо за новизною (можна змінити на популярність)
          .limit(5) // Беремо рівно 5
          .getMany();

        // Додаємо їх до об'єкта категорії
        (category as any).topProducts = products;
      }
    }
    return catalogs;
  }
  // Додали adminId
  async update(
    id: string,
    dto: UpdateCatalogDto,
    adminId: string,
    lang: CatalogLangType = 'ua',
  ): Promise<CatalogsEntity> {
    const oldCatalog = await this.findOne(id, lang); //Зберігаємо старий стан

    if (dto.slug) {
      const conflict = await this.catalogRepo.findOne({ where: { slug: dto.slug, id: Not(id) } });
      if (conflict) throw new BadRequestException(CATALOGS_I18N[lang].slugInUse);
    }

    const updated = this.catalogRepo.merge(oldCatalog, dto);
    const savedCatalog = await this.catalogRepo.save(updated);

    //ЗАПИСУЄМО В АУДИТ
    await this.auditService.logAction(
      adminId,
      AuditAction.UPDATE,
      'CatalogsEntity',
      savedCatalog.id,
      oldCatalog, // Старий стан (для відкату)
      savedCatalog, // Новий стан
    );

    return savedCatalog;
  }

  // Додали adminId
  async remove(
    id: string,
    adminId: string,
    lang: CatalogLangType = 'ua',
  ): Promise<{ success: boolean }> {
    const oldCatalog = await this.findOne(id, lang); //Зберігаємо старий стан перед видаленням

    await this.catalogRepo.remove(oldCatalog);

    //ЗАПИСУЄМО В АУДИТ
    await this.auditService.logAction(
      adminId,
      AuditAction.DELETE,
      'CatalogsEntity',
      id,
      oldCatalog, // Старий стан
      null,
    );

    return { success: true };
  }
}
