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
  Req,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CategoriesEntity } from './categories.entity';
import { CreateCategoriesDto, UpdateCategoriesDto } from './categories.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/users.entity';
import { CategoryLangType } from './categories.i18n';
import { Request } from 'express';

interface RequestWithUser extends Request {
  user?: {
    userId: string;
    role: UserRole;
  };
}

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  async getAllCategories(): Promise<any[]> {
    return await this.categoriesService.findAll();
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('lang') lang: CategoryLangType = 'ua',
  ): Promise<CategoriesEntity> {
    return this.categoriesService.findOne(id, lang);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  create(
    @Body() body: CreateCategoriesDto,
    @Req() req: RequestWithUser,
    @Query('lang') lang: CategoryLangType = 'ua',
  ): Promise<CategoriesEntity> {
    return this.categoriesService.create(body, req.user!.userId, lang);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateCategoriesDto,
    @Req() req: RequestWithUser,
    @Query('lang') lang: CategoryLangType = 'ua',
  ): Promise<CategoriesEntity> {
    return this.categoriesService.update(id, body, req.user!.userId, lang);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  toggleStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: RequestWithUser,
    @Query('lang') lang: CategoryLangType = 'ua',
  ): Promise<CategoriesEntity> {
    return this.categoriesService.toggleStatus(id, req.user!.userId, lang);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: RequestWithUser,
    @Query('lang') lang: CategoryLangType = 'ua',
  ): Promise<{ success: boolean }> {
    return this.categoriesService.remove(id, req.user!.userId, lang);
  }
}
