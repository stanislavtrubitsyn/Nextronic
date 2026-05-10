import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AddToCartDto, UpdateCartItemDto } from './cart.dto';

interface RequestWithUser extends Request {
  user: {
    userId: string;
  };
}

@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  async getMyCart(@Req() req: RequestWithUser) {
    return await this.cartService.getMyCart(req.user.userId);
  }

  @Post()
  async addToCart(@Req() req: RequestWithUser, @Body() dto: AddToCartDto) {
    return await this.cartService.addToCart(req.user.userId, dto);
  }

  @Patch(':id')
  async updateQuantity(
    @Req() req: RequestWithUser,
    @Param('id', ParseUUIDPipe) itemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return await this.cartService.updateQuantity(req.user.userId, itemId, dto.quantity);
  }

  @Delete(':id')
  async removeItem(@Req() req: RequestWithUser, @Param('id', ParseUUIDPipe) itemId: string) {
    await this.cartService.removeItem(req.user.userId, itemId);
    return { success: true };
  }

  @Delete()
  async clearMyCart(@Req() req: RequestWithUser) {
    await this.cartService.clearCart(req.user.userId);
    return { success: true };
  }
}
