import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../users/users.entity';
import { CreateReviewDto, ReviewReactionDto, UpdateReviewDto } from './reviews.dto';
import { ReviewType } from './reviews.entity';
import { ReviewLangType } from './reviews.i18n';
import { ReviewsService } from './reviews.service';

interface RequestWithUser extends Request {
  user: { userId: string; role: UserRole };
}

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Req() req: RequestWithUser,
    @Body() dto: CreateReviewDto,
    @Query('lang') lang: ReviewLangType = 'ua',
  ) {
    return await this.reviewsService.create(req.user.userId, dto, lang);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  async getMyReviews(
    @Req() req: RequestWithUser,
    @Query('page') page = '1',
    @Query('limit') limit = '8',
    @Query('type') type: 'all' | ReviewType = 'all',
  ) {
    const allowedTypes = new Set<string>([
      'all',
      ReviewType.REVIEW,
      ReviewType.QUESTION,
      ReviewType.REPLY,
    ]);
    const normalizedType = allowedTypes.has(type) ? type : 'all';

    return await this.reviewsService.getMyReviews(req.user.userId, {
      page: Number(page),
      limit: Number(limit),
      type: normalizedType,
    });
  }

  @Get('product/:productId')
  async findByProduct(@Param('productId', ParseUUIDPipe) productId: string) {
    return await this.reviewsService.getProductReviews(productId);
  }

  @Post(':id/reaction')
  @UseGuards(JwtAuthGuard)
  async react(
    @Req() req: RequestWithUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewReactionDto,
    @Query('lang') lang: ReviewLangType = 'ua',
  ) {
    return await this.reviewsService.toggleReaction(req.user.userId, id, dto.reaction, lang);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Req() req: RequestWithUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReviewDto,
    @Query('lang') lang: ReviewLangType = 'ua',
  ) {
    return await this.reviewsService.update(req.user.userId, id, dto, lang);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  async remove(
    @Req() req: RequestWithUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('lang') lang: ReviewLangType = 'ua',
  ) {
    return await this.reviewsService.remove(id, req.user.userId, req.user.role, lang);
  }
}
