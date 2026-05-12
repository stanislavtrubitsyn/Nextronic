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
  Req,
  Query,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { ViewedProductsService } from './viewed-products.service';
import { ProductsEntity } from './products.entity';
import { CreateProductDto, UpdateProductDto } from './products.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/users.entity';
import { RecommendationsService } from '../recommendations/recommendations.service';
import { ActivityAction } from '../recommendations/user-activity.entity';
import { Request } from 'express';

interface RequestWithUser extends Request {
  user?: {
    userId: string;
    role: UserRole;
  };
}

@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly viewedProductsService: ViewedProductsService,
    private readonly recommendationsService: RecommendationsService,
  ) {}

  @Get()
  findAll(): Promise<ProductsEntity[]> {
    return this.productsService.findAll();
  }

  //ЕНДПОІНТ ПОШУКУ ТА ФІЛЬТРАЦІЇ
  @Get('search')
  async search(
    @Query('q') query?: string,
    @Query('categoryId') categoryId?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('inStock') inStock?: string,
    @Query('sort') sort?: string,
    @Query() allQueryParams?: Record<string, any>,
    @Req() req?: RequestWithUser,
  ) {
    const userId = req?.user?.userId;

    // Відділяємо системні параметри від динамічних фільтрів
    const filters: Record<string, any> = {};
    if (allQueryParams) {
      const systemKeys = ['q', 'categoryId', 'lang', 'minPrice', 'maxPrice', 'inStock', 'sort'];
      for (const [key, value] of Object.entries(allQueryParams)) {
        if (!systemKeys.includes(key)) {
          filters[key] = value;
        }
      }
    }

    return await this.productsService.searchProducts({
      query,
      categoryId,
      filters,
      userId,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      inStock: inStock === 'true',
      sort,
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ProductsEntity> {
    return this.productsService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  create(@Body() body: CreateProductDto): Promise<ProductsEntity> {
    return this.productsService.create(body);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateProductDto,
  ): Promise<ProductsEntity> {
    return this.productsService.update(id, body);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<{ success: boolean }> {
    return this.productsService.remove(id);
  }

  @Post(':id/view')
  @UseGuards(JwtAuthGuard)
  async recordView(@Param('id', ParseUUIDPipe) productId: string, @Req() req: RequestWithUser) {
    const product = await this.productsService.findOne(productId);

    // Логуємо активність для рекомендацій
    await this.recommendationsService.logActivity(
      req.user!.userId,
      product.category.id,
      ActivityAction.VIEW,
    );

    return await this.viewedProductsService.addView(req.user!.userId, productId);
  }

  @Get('history/recent')
  @UseGuards(JwtAuthGuard)
  async getMyViewHistory(@Req() req: RequestWithUser) {
    return await this.viewedProductsService.getHistory(req.user!.userId);
  }

  @Delete('history/clear')
  @UseGuards(JwtAuthGuard)
  async clearMyHistory(@Req() req: RequestWithUser) {
    return await this.viewedProductsService.clearHistory(req.user!.userId);
  }

  @Delete('history/:productId')
  @UseGuards(JwtAuthGuard)
  async removeProductFromHistory(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Req() req: RequestWithUser,
  ) {
    return await this.viewedProductsService.removeView(req.user!.userId, productId);
  }
}
