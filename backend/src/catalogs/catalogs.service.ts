import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { CatalogsEntity } from './catalogs.entity';
import { CreateCatalogDto, UpdateCatalogDto } from './catalogs.dto';
import { CATALOGS_I18N, CatalogLangType } from './catalogs.i18n';

@Injectable()
export class CatalogsService {
  constructor(
    @InjectRepository(CatalogsEntity)
    private readonly catalogRepo: Repository<CatalogsEntity>,
  ) {}

  async create(dto: CreateCatalogDto, lang: CatalogLangType = 'ua'): Promise<CatalogsEntity> {
    const existing = await this.catalogRepo.findOne({ where: { slug: dto.slug } });
    if (existing) throw new BadRequestException(CATALOGS_I18N[lang].slugExists);

    const newCatalog = this.catalogRepo.create(dto);
    return await this.catalogRepo.save(newCatalog);
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

  async update(
    id: string,
    dto: UpdateCatalogDto,
    lang: CatalogLangType = 'ua',
  ): Promise<CatalogsEntity> {
    const catalog = await this.findOne(id, lang);

    if (dto.slug) {
      const conflict = await this.catalogRepo.findOne({ where: { slug: dto.slug, id: Not(id) } });
      if (conflict) throw new BadRequestException(CATALOGS_I18N[lang].slugInUse);
    }

    const updated = this.catalogRepo.merge(catalog, dto);
    return await this.catalogRepo.save(updated);
  }

  async remove(id: string, lang: CatalogLangType = 'ua'): Promise<{ success: boolean }> {
    const catalog = await this.findOne(id, lang);
    await this.catalogRepo.remove(catalog);
    return { success: true };
  }
}
