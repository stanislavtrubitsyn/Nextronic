import { Controller, Post, Get, Body, Req, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateOrderDto } from './orders.dto';

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
  async create(@Req() req: RequestWithUser, @Body() dto: CreateOrderDto) {
    return await this.ordersService.createOrder(req.user.userId, dto);
  }

  @Get('my')
  async getMyOrders(@Req() req: RequestWithUser) {
    return await this.ordersService.getMyOrders(req.user.userId);
  }
}
