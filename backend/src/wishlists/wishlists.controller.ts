import {
  Controller,
  Post,
  Patch,
  Get,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  Query,
} from '@nestjs/common';
import { WishlistService } from './wishlists.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateWishlistDto, AddToWishlistDto } from './wishlists.dto';

interface RequestWithUser extends Request {
  user: { userId: string };
}

@Controller('wishlists')
@UseGuards(JwtAuthGuard)
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Post()
  async create(@Req() req: RequestWithUser, @Body() dto: CreateWishlistDto) {
    return await this.wishlistService.createWishlist(req.user.userId, dto);
  }

  @Get()
  async findAll(@Req() req: RequestWithUser, @Query('search') search?: string) {
    return await this.wishlistService.getMyWishlists(req.user.userId, search);
  }

  @Get(':id')
  async findOne(@Req() req: RequestWithUser, @Param('id') id: string) {
    return await this.wishlistService.findOne(req.user.userId, id);
  }

  @Post(':id/items')
  async addItem(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Body() dto: AddToWishlistDto,
  ) {
    return await this.wishlistService.addItem(req.user.userId, id, dto);
  }

  @Patch(':id')
  async update(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Body() dto: CreateWishlistDto,
  ) {
    return await this.wishlistService.updateWishlist(req.user.userId, id, dto);
  }

  @Delete(':id/items')
  async removeItem(
    @Req() req: RequestWithUser,
    @Param('id') wishlistId: string,
    @Body() dto: AddToWishlistDto,
  ) {
    return await this.wishlistService.removeItemByProductId(
      req.user.userId,
      wishlistId,
      dto.productId,
    );
  }

  @Delete(':id')
  async remove(@Req() req: RequestWithUser, @Param('id') id: string) {
    return await this.wishlistService.removeWishlist(req.user.userId, id);
  }
}
