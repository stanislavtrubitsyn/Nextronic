import { Controller, Post, Get, Patch, Body, Param, Req, UseGuards, Query } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateOrderDto, UpdateOrderStatusDto } from './orders.dto';
import { Request } from 'express';
import { OrderLangType } from './orders.i18n';

interface RequestWithUser extends Request {
  user: {
    userId: string;
  };
}

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  async create(
    @Req() req: RequestWithUser,
    @Body() dto: CreateOrderDto,
    @Query('lang') lang: OrderLangType = 'ua',
  ) {
    return await this.ordersService.createOrder(req.user.userId, dto, lang);
  }

  @Get('my')
  async getMyOrders(@Req() req: RequestWithUser) {
    return await this.ordersService.getMyOrders(req.user.userId);
  }

  @Get('admin/all')
  async getAllOrders() {
    return await this.ordersService.findAllOrders();
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @Query('lang') lang: OrderLangType = 'ua',
  ) {
    return await this.ordersService.updateStatus(id, dto, lang);
  }
}
