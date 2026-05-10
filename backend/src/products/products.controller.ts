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
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { ViewedProductsService } from './viewed-products.service';
import { ProductsEntity } from './products.entity';
import { CreateProductDto, UpdateProductDto } from './products.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/users.entity';

@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly viewedProductsService: ViewedProductsService,
  ) {}

  @Get()
  findAll(): Promise<ProductsEntity[]> {
    return this.productsService.findAll();
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
  async recordView(@Param('id', ParseUUIDPipe) productId: string, @Req() req: any) {
    return await this.viewedProductsService.addView(req.user.userId, productId);
  }

  @Get('history/recent')
  @UseGuards(JwtAuthGuard)
  async getMyViewHistory(@Req() req: any) {
    return await this.viewedProductsService.getHistory(req.user.userId);
  }

  @Delete('history/clear')
  @UseGuards(JwtAuthGuard)
  async clearMyHistory(@Req() req: any) {
    return await this.viewedProductsService.clearHistory(req.user.userId);
  }

  @Delete('history/:productId')
  @UseGuards(JwtAuthGuard)
  async removeProductFromHistory(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Req() req: any,
  ) {
    return await this.viewedProductsService.removeView(req.user.userId, productId);
  }
}
