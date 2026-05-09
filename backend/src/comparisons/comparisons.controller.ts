import { Controller, Post, Get, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { ComparisonService } from './comparisons.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AddToComparisonDto } from './comparisons.dto';
import { Request } from 'express';

interface RequestWithUser extends Request {
  user: {
    userId: string;
    email: string;
  };
}

@Controller('comparisons')
@UseGuards(JwtAuthGuard)
export class ComparisonController {
  constructor(private readonly compService: ComparisonService) {}

  @Post()
  async add(@Req() req: RequestWithUser, @Body() dto: AddToComparisonDto) {
    return await this.compService.addToComparison(req.user.userId, dto.productId);
  }

  @Get()
  async findAll(@Req() req: RequestWithUser) {
    return await this.compService.getMyComparisons(req.user.userId);
  }

  @Delete('product/:productId')
  async removeProduct(@Req() req: RequestWithUser, @Param('productId') productId: string) {
    return await this.compService.removeItem(req.user.userId, productId);
  }

  @Delete(':id')
  async removeList(@Req() req: RequestWithUser, @Param('id') id: string) {
    return await this.compService.removeComparison(req.user.userId, id);
  }
}
