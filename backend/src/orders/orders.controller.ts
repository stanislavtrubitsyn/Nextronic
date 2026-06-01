import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  AdminOrdersStatusFilter,
  AdminOrdersSortBy,
  AdminOrdersSortOrder,
  MyOrdersStatusFilter,
  OrdersService,
} from './orders.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateOrderDto, UpdateOrderDetailsDto, UpdateOrderStatusDto } from './orders.dto';
import { Request } from 'express';
import { OrderLangType } from './orders.i18n';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/users.entity';

interface RequestWithUser extends Request {
  user: {
    userId: string;
    role?: UserRole;
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
  async getMyOrders(
    @Req() req: RequestWithUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: MyOrdersStatusFilter,
  ) {
    const hasPaginationQuery = Boolean(page || limit || status);

    if (!hasPaginationQuery) {
      return await this.ordersService.getMyOrders(req.user.userId);
    }

    return await this.ordersService.getMyOrders(req.user.userId, {
      page: Number(page),
      limit: Number(limit),
      status,
      paginated: true,
    });
  }

  @Get('admin/all')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  async getAllOrders(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: AdminOrdersStatusFilter,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: AdminOrdersSortBy,
    @Query('sortOrder') sortOrder?: AdminOrdersSortOrder,
  ) {
    const hasQuery = Boolean(page || limit || status || search || sortBy || sortOrder);

    if (!hasQuery) {
      return await this.ordersService.findAllOrders();
    }

    return await this.ordersService.findAllOrders({
      page: Number(page),
      limit: Number(limit),
      status,
      search,
      sortBy,
      sortOrder,
      paginated: true,
    });
  }

  @Get('admin/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  async getAdminOrder(@Param('id') id: string, @Query('lang') lang: OrderLangType = 'ua') {
    return await this.ordersService.findOne(id, lang);
  }

  @Patch('admin/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  async updateOrderDetails(
    @Param('id') id: string,
    @Body() dto: UpdateOrderDetailsDto,
    @Req() req: RequestWithUser,
    @Query('lang') lang: OrderLangType = 'ua',
  ) {
    return await this.ordersService.updateOrderDetails(id, dto, req.user.userId, lang);
  }

  @Delete('admin/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  async deleteOrder(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
    @Query('lang') lang: OrderLangType = 'ua',
  ) {
    return await this.ordersService.deleteOrder(id, req.user.userId, lang);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @Req() req: RequestWithUser,
    @Query('lang') lang: OrderLangType = 'ua',
  ) {
    return await this.ordersService.updateStatus(id, dto, req.user.userId, lang);
  }

  @Patch(':id/pay')
  async payOrder(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
    @Query('lang') lang: OrderLangType = 'ua',
  ) {
    return await this.ordersService.mockPayOrder(id, req.user.userId, lang);
  }
}
