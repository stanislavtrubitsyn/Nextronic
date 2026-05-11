import { Controller, Get, Param, Req, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { RecommendationsService } from './recommendations.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Request } from 'express';

interface RequestWithUser extends Request {
  user: { userId: string };
}

@Controller('recommendations')
export class RecommendationsController {
  constructor(private readonly recommendationsService: RecommendationsService) {}

  // "Спеціально для Вас" (тільки для авторизованих)
  @Get('personal')
  @UseGuards(JwtAuthGuard)
  async getPersonalized(@Req() req: RequestWithUser) {
    return await this.recommendationsService.getPersonalized(req.user.userId);
  }

  // "Схожі товари" (публічний)
  @Get(':productId/similar')
  async getSimilar(@Param('productId', ParseUUIDPipe) productId: string) {
    return await this.recommendationsService.getSimilar(productId);
  }

  // "З цим також купують" (публічний)
  @Get(':productId/bought-together')
  async getBoughtTogether(@Param('productId', ParseUUIDPipe) productId: string) {
    return await this.recommendationsService.getBoughtTogether(productId);
  }
}
