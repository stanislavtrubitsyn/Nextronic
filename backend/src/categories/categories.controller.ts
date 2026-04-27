import { Controller, Get, Post, Body, Patch, Param, Delete, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryDeepPartialEntity } from 'typeorm';
import { CategoriesEntity } from './categories.entity';
import { CreateCategoriesDto, UpdateCategoriesDto } from './categories.dto';
import { validate as isUuid } from 'uuid';

@Controller('categories')
export class CategoriesController {
  constructor(
    @InjectRepository(CategoriesEntity)
    private readonly categoryRepo: Repository<CategoriesEntity>,
  ) {}

  @Post()
  async create(@Body() body: CreateCategoriesDto) {
    const newCategory = this.categoryRepo.create({
      name: body.name,
      slug: body.slug,
      icon: body.icon,
      catalog: { id: body.catalogId },
    });
    return await this.categoryRepo.save(newCategory);
  }

  @Get()
  findAll() {
    return this.categoryRepo.find({
      relations: ['catalog'],
      order: { createdAt: 'DESC' }
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    // 1. Перевірка на валідність UUID (щоб не було 500 помилки)
    if (!isUuid(id)) {
      throw new BadRequestException(`Invalid ID format. Expected UUID, got "${id}"`);
    }

    const category = await this.categoryRepo.findOne({
      where: { id },
      relations: ['catalog']
    });

    // 2. Якщо не знайдено — повертаємо 404 замість порожнечі
    if (!category) {
      throw new NotFoundException(`Category with ID "${id}" not found`);
    }

    return category;
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: UpdateCategoriesDto) {
    if (!isUuid(id)) {
      throw new BadRequestException(`Invalid ID format`);
    }

    // Перевіряємо чи існує запис перед оновленням
    const category = await this.categoryRepo.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException(`Cannot update category. ID "${id}" not found`);
    }

    const updateData: QueryDeepPartialEntity<CategoriesEntity> = {
      name: body.name,
      slug: body.slug,
      icon: body.icon,
    };

    if (body.catalogId) {
      updateData.catalog = { id: body.catalogId };
    }

    await this.categoryRepo.update(id, updateData);
    
    return this.categoryRepo.findOne({ where: { id }, relations: ['catalog'] });
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    if (!isUuid(id)) {
      throw new BadRequestException(`Invalid ID format`);
    }

    const result = await this.categoryRepo.delete(id);
    
    if (result.affected === 0) {
      throw new NotFoundException(`Cannot delete. Category with ID "${id}" not found`);
    }

    return {
      message: `Category with ID ${id} was deleted successfully`,
    };
  }
}