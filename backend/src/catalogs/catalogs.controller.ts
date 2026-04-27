import { Controller, Get, Post, Body, Patch, Param, Delete, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { CatalogsEntity } from './catalogs.entity';
import { CreateCatalogDto, UpdateCatalogDto } from './catalogs.dto';
import { validate as isUuid } from 'uuid';

@Controller('catalogs')
export class CatalogsController {
  constructor(
    @InjectRepository(CatalogsEntity)
    private readonly catalogRepo: Repository<CatalogsEntity>,
  ) {}

  @Post()
  async create(@Body() body: CreateCatalogDto) {
  // Перевіряємо, чи існує такий slug или name
  const existing = await this.catalogRepo.findOne({
    where: [{ name: body.name }, { slug: body.slug }]
  });

  if (existing) {
    // 409 Conflict або 400 Bad Request
    throw new BadRequestException('Catalog with this name or slug already exists');
  }

  const newCatalog = this.catalogRepo.create(body);
  return await this.catalogRepo.save(newCatalog);
  }

  @Get()
  findAll() {
    // Повертає всі каталоги, відсортовані за ім'ям, 
    // разом із масивом категорій, що до них належать
    return this.catalogRepo.find({ 
      relations: ['categories'], 
      order: { name: 'ASC' } 
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    // 1. Валідація формату UUID
    if (!isUuid(id)) {
      throw new BadRequestException(`Invalid ID format. UUID expected.`);
    }

    // 2. Пошук каталогу разом із його категоріями
    const catalog = await this.catalogRepo.findOne({ 
      where: { id },
      relations: ['categories'] 
    });

    // 3. Перевірка на існування
    if (!catalog) {
      throw new NotFoundException(`Catalog with ID "${id}" not found`);
    }

    return catalog;
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: UpdateCatalogDto) {
  if (!isUuid(id)) {
    throw new BadRequestException(`Invalid ID format`);
  }

  // 1. Спочатку перевіряємо, чи існує взагалі цей каталог
  const catalog = await this.catalogRepo.findOne({ where: { id } });
  if (!catalog) {
    throw new NotFoundException(`Cannot update. Catalog with ID "${id}" not found`);
  }

  // 2. Якщо користувач намагається змінити name або slug, перевіряємо на дублікати
  if (body.name || body.slug) {
    const conflict = await this.catalogRepo.findOne({
      where: [
        { name: body.name, id: Not(id) }, // Шукаємо таке ж ім'я, але НЕ в цього запису
        { slug: body.slug, id: Not(id) }  // Шукаємо такий же slug, але НЕ в цього запису
      ],
    });

    if (conflict) {
      throw new BadRequestException('Another catalog already uses this name or slug');
    }
  }

  // 3. Оновлюємо
  await this.catalogRepo.update(id, body);
  
  // Повертаємо вже оновлений об'єкт
  return this.catalogRepo.findOne({ where: { id } });
}

  @Delete(':id')
  async remove(@Param('id') id: string) {
    if (!isUuid(id)) {
      throw new BadRequestException(`Invalid ID format`);
    }

    const result = await this.catalogRepo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Cannot delete. Catalog with ID "${id}" not found`);
    }

    return { message: `Catalog "${id}" deleted successfully` };
  }
}