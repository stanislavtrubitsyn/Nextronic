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
  Query,
} from '@nestjs/common';
import { CatalogsEntity } from './catalogs.entity';
import { CatalogsService } from './catalogs.service';
import { CreateCatalogDto, UpdateCatalogDto } from './catalogs.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/users.entity';
import { CatalogLangType } from './catalogs.i18n';

@Controller('catalogs')
export class CatalogsController {
  constructor(private readonly catalogsService: CatalogsService) {}

  @Get()
  findAll(): Promise<CatalogsEntity[]> {
    return this.catalogsService.findAll();
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('lang') lang: CatalogLangType = 'ua',
  ): Promise<CatalogsEntity> {
    return this.catalogsService.findOne(id, lang);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  create(
    @Body() body: CreateCatalogDto,
    @Query('lang') lang: CatalogLangType = 'ua',
  ): Promise<CatalogsEntity> {
    return this.catalogsService.create(body, lang);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateCatalogDto,
    @Query('lang') lang: CatalogLangType = 'ua',
  ): Promise<CatalogsEntity> {
    return this.catalogsService.update(id, body, lang);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('lang') lang: CatalogLangType = 'ua',
  ): Promise<{ success: boolean }> {
    return this.catalogsService.remove(id, lang);
  }
}
