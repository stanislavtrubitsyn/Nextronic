import { Controller, Get, Post, Body, Patch, Param, Delete, ParseUUIDPipe } from '@nestjs/common';
import { CatalogsEntity } from './catalogs.entity';
import { CatalogsService } from './catalogs.service';
import { CreateCatalogDto, UpdateCatalogDto } from './catalogs.dto';

@Controller('catalogs')
export class CatalogsController {
  constructor(private readonly catalogsService: CatalogsService) {}

  @Post()
  create(@Body() body: CreateCatalogDto): Promise<CatalogsEntity> {
    return this.catalogsService.create(body);
  }

  @Get()
  findAll(): Promise<CatalogsEntity[]> {
    return this.catalogsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<CatalogsEntity> {
    return this.catalogsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateCatalogDto,
  ): Promise<CatalogsEntity> {
    return this.catalogsService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<{ success: boolean }> {
    return this.catalogsService.remove(id);
  }
}
