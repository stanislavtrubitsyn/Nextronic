import { Controller, Get, Param, ParseUUIDPipe, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  HomeRecommendationsResponse,
  ProductRecommendationItem,
  RecommendationsService,
} from './recommendations.service';

interface RequestWithUser extends Request {
  user?: { userId: string };
}

@Controller('recommendations')
export class RecommendationsController {
  constructor(private readonly recommendationsService: RecommendationsService) {}

  @Get('home')
  async getHomeSections(@Query('limit') limit?: string): Promise<HomeRecommendationsResponse> {
    return await this.recommendationsService.getHomeSections(this.parseLimit(limit));
  }

  @Get('personal')
  @UseGuards(JwtAuthGuard)
  async getPersonalized(
    @Req() req: RequestWithUser,
    @Query('limit') limit?: string,
    @Query('excludeIds') excludeIds?: string,
  ): Promise<ProductRecommendationItem[]> {
    return await this.recommendationsService.getPersonalized(
      req.user!.userId,
      this.parseLimit(limit),
      this.parseIds(excludeIds),
    );
  }

  @Get(':productId/similar')
  async getSimilar(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Query('limit') limit?: string,
    @Query('excludeIds') excludeIds?: string,
  ): Promise<ProductRecommendationItem[]> {
    return await this.recommendationsService.getSimilar(
      productId,
      this.parseLimit(limit),
      this.parseIds(excludeIds),
    );
  }

  @Get(':productId/accessories')
  async getAccessories(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Query('limit') limit?: string,
    @Query('excludeIds') excludeIds?: string,
  ): Promise<ProductRecommendationItem[]> {
    return await this.recommendationsService.getAccessories(
      productId,
      this.parseLimit(limit),
      this.parseIds(excludeIds),
    );
  }

  @Get(':productId/bought-together')
  async getBoughtTogether(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Query('limit') limit?: string,
    @Query('excludeIds') excludeIds?: string,
  ): Promise<ProductRecommendationItem[]> {
    return await this.recommendationsService.getBoughtTogether(
      productId,
      this.parseLimit(limit),
      this.parseIds(excludeIds),
    );
  }

  private parseLimit(value?: string): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 12;
    return Math.max(1, Math.min(24, Math.floor(parsed)));
  }

  private parseIds(value?: string): string[] {
    if (!value) return [];

    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
}
