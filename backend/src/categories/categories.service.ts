import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { CategoriesEntity } from './categories.entity';
import { CreateCategoriesDto, UpdateCategoriesDto } from './categories.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(CategoriesEntity)
    private readonly categoryRepo: Repository<CategoriesEntity>,
  ) {}

  async create(dto: CreateCategoriesDto): Promise<CategoriesEntity> {
    const existing = await this.categoryRepo.findOne({ where: { slug: dto.slug } });
    if (existing) throw new BadRequestException('Category with this slug already exists');

    // Створюємо об'єкт сутності, явно вказуючи зв'язок через ID каталогу
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

  async findOne(id: string): Promise<CategoriesEntity> {
    const category = await this.categoryRepo.findOne({
      where: { id },
      relations: ['catalog'],
    });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async update(id: string, dto: UpdateCategoriesDto): Promise<CategoriesEntity> {
    const category = await this.findOne(id);

    if (dto.slug) {
      const conflict = await this.categoryRepo.findOne({ where: { slug: dto.slug, id: Not(id) } });
      if (conflict) throw new BadRequestException('Slug already in use');
    }

    // Якщо прийшов новий catalogId, TypeORM merge правильно його обробить
    const updated = this.categoryRepo.merge(category, {
      ...dto,
      catalog: dto.catalogId ? { id: dto.catalogId } : category.catalog,
    });

    return await this.categoryRepo.save(updated);
  }

  async remove(id: string): Promise<{ success: boolean }> {
    const result = await this.categoryRepo.delete(id);
    if (result.affected === 0) throw new NotFoundException('Category not found');
    return { success: true };
  }
}
