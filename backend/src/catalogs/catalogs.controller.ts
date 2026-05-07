import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { CatalogsEntity } from './catalogs.entity';
import { CatalogsService } from './catalogs.service';
import { CreateCatalogDto, UpdateCatalogDto } from './catalogs.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/users.entity';

@Controller('catalogs')
export class CatalogsController {
  constructor(private readonly catalogsService: CatalogsService) {}

  @Get()
  findAll(): Promise<CatalogsEntity[]> {
    return this.catalogsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<CatalogsEntity> {
    return this.catalogsService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  create(@Body() body: CreateCatalogDto): Promise<CatalogsEntity> {
    return this.catalogsService.create(body);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateCatalogDto,
  ): Promise<CatalogsEntity> {
    return this.catalogsService.update(id, body);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN) // Тільки адмін може видаляти каталоги
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<{ success: boolean }> {
    return this.catalogsService.remove(id);
  }
}
