import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { CatalogsEntity } from './catalogs.entity';
import { CreateCatalogDto, UpdateCatalogDto } from './catalogs.dto';

@Injectable()
export class CatalogsService {
  constructor(
    @InjectRepository(CatalogsEntity)
    private readonly catalogRepo: Repository<CatalogsEntity>,
  ) {}

  // Створення нового каталогу
  async create(dto: CreateCatalogDto): Promise<CatalogsEntity> {
    // Перевірка унікальності slug
    const existing = await this.catalogRepo.findOne({ where: { slug: dto.slug } });
    if (existing) throw new BadRequestException('Catalog with this slug already exists');

    const newCatalog = this.catalogRepo.create(dto);
    return await this.catalogRepo.save(newCatalog);
  }

  // Отримання всіх каталогів
  async findAll(): Promise<CatalogsEntity[]> {
    return await this.catalogRepo.find({
      relations: ['categories'],
      order: { createdAt: 'ASC' },
    });
  }

  // Пошук одного каталогу за ID
  async findOne(id: string): Promise<CatalogsEntity> {
    const catalog = await this.catalogRepo.findOne({ where: { id }, relations: ['categories'] });
    if (!catalog) throw new NotFoundException(`Catalog not found`);
    return catalog;
  }

  // Оновлення каталогу
  async update(id: string, dto: UpdateCatalogDto): Promise<CatalogsEntity> {
    // Перевіряємо чи існує такий каталог
    const catalog = await this.findOne(id);

    if (dto.slug) {
      const conflict = await this.catalogRepo.findOne({ where: { slug: dto.slug, id: Not(id) } });
      if (conflict) throw new BadRequestException('Slug already in use');
    }

    // Об'єднуємо існуючі дані з новими з DTO
    const updated = this.catalogRepo.merge(catalog, dto);
    return await this.catalogRepo.save(updated);
  }

  // Видалення каталогу
  async remove(id: string): Promise<{ success: boolean }> {
    const result = await this.catalogRepo.delete(id);
    if (result.affected === 0) throw new NotFoundException(`Catalog not found`);
    return { success: true };
  }
}
