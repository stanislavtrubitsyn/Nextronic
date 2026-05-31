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
import { CreateProductDto, DuplicateProductDto, UpdateProductDto } from './products.dto';
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

  @Get('search/resolve')
  async resolveSearch(@Query('q') query?: string, @Query('lang') lang?: 'ua' | 'en') {
    return await this.productsService.resolveSearchNavigation({
      query,
      lang: lang || 'ua',
    });
  }

  @Get('search')
  async search(
    @Query('q') query?: string,
    @Query('catalog') catalogSlug?: string,
    @Query('category') categorySlug?: string,
    @Query('categoryId') categoryId?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('inStock') inStock?: string,
    @Query('sort') sort?: string,
    @Query() allQueryParams?: Record<string, unknown>,
    @Req() req?: RequestWithUser,
  ) {
    const userId = req?.user?.userId;

    const filters: Record<string, unknown> = {};
    const systemKeys = [
      'q',
      'catalog',
      'category',
      'categoryId',
      'lang',
      'minPrice',
      'maxPrice',
      'inStock',
      'sort',
    ];

    for (const [key, value] of Object.entries(allQueryParams || {})) {
      if (!systemKeys.includes(key)) {
        filters[key] = value;
      }
    }

    return await this.productsService.searchProducts({
      query,
      catalogSlug,
      categorySlug,
      categoryId,
      filters,
      userId,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      inStock: inStock === 'true',
      sort,
    });
  }

  @Get('category/:slug')
  async getCategoryProducts(
    @Param('slug') categorySlug: string,
    @Query('q') query?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('sort') sort?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('lang') lang?: 'ua' | 'en',
    @Query() allQueryParams?: Record<string, unknown>,
  ) {
    const filters: Record<string, unknown> = {};
    const systemKeys = [
      'q',
      'catalog',
      'category',
      'categoryId',
      'lang',
      'minPrice',
      'maxPrice',
      'sort',
      'page',
      'limit',
    ];

    for (const [key, value] of Object.entries(allQueryParams || {})) {
      if (!systemKeys.includes(key)) {
        filters[key] = value;
      }
    }

    return await this.productsService.getCategoryPageProducts({
      categorySlug,
      query,
      filters,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      sort,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      lang: lang || 'ua',
    });
  }

  @Get('slug/:slug')
  async findBySlug(@Param('slug') slug: string, @Query('lang') lang?: 'ua' | 'en') {
    return await this.productsService.getProductPageBySlug(slug, lang || 'ua');
  }

  @Get('history/recent')
  @UseGuards(JwtAuthGuard)
  async getMyViewHistory(
    @Req() req: RequestWithUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const normalizedLimit = this.parsePositiveInteger(limit, page ? 5 : 20, 50);

    if (page) {
      return await this.viewedProductsService.getHistory(req.user!.userId, {
        page: this.parsePositiveInteger(page, 1),
        limit: normalizedLimit,
      });
    }

    return await this.viewedProductsService.getHistory(req.user!.userId, normalizedLimit);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ProductsEntity> {
    return this.productsService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  create(@Body() body: CreateProductDto, @Req() req: RequestWithUser): Promise<ProductsEntity> {
    return this.productsService.create(body, req.user!.userId);
  }

  @Post(':id/duplicate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  duplicate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: DuplicateProductDto,
    @Req() req: RequestWithUser,
  ): Promise<ProductsEntity> {
    return this.productsService.duplicate(id, body, req.user!.userId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateProductDto,
    @Req() req: RequestWithUser,
  ): Promise<ProductsEntity> {
    return this.productsService.update(id, body, req.user!.userId);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  toggleStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: RequestWithUser,
  ): Promise<ProductsEntity> {
    return this.productsService.toggleStatus(id, req.user!.userId);
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

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: RequestWithUser,
  ): Promise<{ success: boolean }> {
    return this.productsService.remove(id, req.user!.userId);
  }

  @Post(':id/view')
  @UseGuards(JwtAuthGuard)
  async recordView(@Param('id', ParseUUIDPipe) productId: string, @Req() req: RequestWithUser) {
    const product = await this.productsService.findOne(productId);
    await this.recommendationsService.logActivity(
      req.user!.userId,
      product.category.id,
      ActivityAction.VIEW,
    );
    return await this.viewedProductsService.addView(req.user!.userId, productId);
  }

  private parsePositiveInteger(value: string | undefined, fallback: number, max?: number): number {
    const parsed = Number(value);

    if (!Number.isFinite(parsed) || parsed < 1) return fallback;

    const normalized = Math.trunc(parsed);
    return typeof max === 'number' ? Math.min(normalized, max) : normalized;
  }
}
