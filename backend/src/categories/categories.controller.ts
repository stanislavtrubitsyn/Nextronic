import { Controller, Get, Post, Body, Patch, Param, Delete, ParseUUIDPipe } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CategoriesEntity } from './categories.entity';
import { CreateCategoriesDto, UpdateCategoriesDto } from './categories.dto';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  create(@Body() body: CreateCategoriesDto): Promise<CategoriesEntity> {
    return this.categoriesService.create(body);
  }

  @Get()
  findAll(): Promise<CategoriesEntity[]> {
    return this.categoriesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<CategoriesEntity> {
    return this.categoriesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateCategoriesDto,
  ): Promise<CategoriesEntity> {
    return this.categoriesService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<{ success: boolean }> {
    return this.categoriesService.remove(id);
  }
}
