import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CatalogsEntity } from './catalogs.entity';

@Controller('catalogs')
export class CatalogsController {
  constructor(
    @InjectRepository(CatalogsEntity)
    private readonly catalogRepo: Repository<CatalogsEntity>,
  ) {}

  // 1. Створення (Create)
  @Post()
  create(@Body() body: { name: string; slug: string; icon?: string; description?: string }) {
    const newCatalog = this.catalogRepo.create(body);
    return this.catalogRepo.save(newCatalog);
  }

  // 2. Отримання всіх (Read All)
  @Get()
  findAll() {
    return this.catalogRepo.find();
  }

  // 3. Отримання одного за ID (Read One)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.catalogRepo.findOneBy({ id });
  }

  // 4. Оновлення (Update)
  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: Partial<CatalogsEntity>) {
    await this.catalogRepo.update(id, body);
    return this.catalogRepo.findOneBy({ id });
  }

  // 5. Видалення (Delete)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.catalogRepo.delete(id);
    return { message: `Catalog with ID ${id} deleted successfully` };
  }
}