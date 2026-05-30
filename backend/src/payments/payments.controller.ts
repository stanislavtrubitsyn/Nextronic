import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateOrderDto } from '../orders/orders.dto';
import { OrderLangType } from '../orders/orders.i18n';
import { LiqPayCallbackDto } from './payments.dto';
import { PaymentsService } from './payments.service';

interface RequestWithUser extends Request {
  user: {
    userId: string;
  };
}

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('liqpay/checkout')
  @UseGuards(JwtAuthGuard)
  async createLiqPayCheckout(
    @Body() body: CreateOrderDto,
    @Req() req: RequestWithUser,
    @Query('lang') lang: OrderLangType = 'ua',
  ) {
    return await this.paymentsService.createLiqPayCheckout(body, req.user.userId, lang);
  }

  @Post('liqpay/callback')
  async handleLiqPayCallback(@Body() body: LiqPayCallbackDto) {
    await this.paymentsService.handleLiqPayCallback(body);
    return { result: 'ok' };
  }

  @Get('liqpay/status/:paymentId')
  @UseGuards(JwtAuthGuard)
  async getLiqPayPaymentStatus(
    @Param('paymentId') paymentId: string,
    @Req() req: RequestWithUser,
    @Query('lang') lang: OrderLangType = 'ua',
  ) {
    return await this.paymentsService.getLiqPayPaymentStatus(paymentId, req.user.userId, lang);
  }

  @Post('liqpay/dev-success/:paymentId')
  @UseGuards(JwtAuthGuard)
  async simulateSuccessfulLiqPayPayment(
    @Param('paymentId') paymentId: string,
    @Req() req: RequestWithUser,
    @Query('lang') lang: OrderLangType = 'ua',
  ) {
    return await this.paymentsService.simulateSuccessfulLiqPayPayment(
      paymentId,
      req.user.userId,
      lang,
    );
  }
}
