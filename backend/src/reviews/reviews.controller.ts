import { Controller, Post, Get, Patch, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateReviewDto, UpdateReviewDto } from './reviews.dto';
import { Request } from 'express';

interface RequestWithUser extends Request {
  user: { userId: string };
}

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Req() req: RequestWithUser, @Body() dto: CreateReviewDto) {
    return await this.reviewsService.create(req.user.userId, dto);
  }

  @Get('product/:productId')
  async findByProduct(@Param('productId') productId: string) {
    return await this.reviewsService.getProductReviews(productId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(@Req() req: RequestWithUser, @Param('id') id: string, @Body() dto: UpdateReviewDto) {
    return await this.reviewsService.update(req.user.userId, id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(@Req() req: RequestWithUser, @Param('id') id: string) {
    return await this.reviewsService.remove(req.user.userId, id);
  }
}
