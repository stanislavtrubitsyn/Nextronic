import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, timingSafeEqual } from 'crypto';
import { Repository } from 'typeorm';
import { CreateOrderDto } from '../orders/orders.dto';
import { PaymentMethod } from '../orders/orders.entity';
import { OrderLangType } from '../orders/orders.i18n';
import { OrdersService } from '../orders/orders.service';
import { PaymentSessionEntity } from './payment-session.entity';
import { LiqPayCallbackDto } from './payments.dto';

type LiqPayLanguage = 'uk' | 'en';
type LiqPaySignatureAlgorithm = 'sha3-256' | 'sha1';

type LiqPayCheckoutData = {
  version: 7;
  public_key: string;
  action: 'pay';
  amount: number;
  currency: 'UAH';
  description: string;
  order_id: string;
  language: LiqPayLanguage;
  paytypes: string;
  result_url: string;
  server_url: string;
  sandbox?: 1;
};

type LiqPayCallbackPayload = {
  action?: string;
  amount?: number | string;
  currency?: string;
  description?: string;
  err_code?: string;
  err_description?: string;
  liqpay_order_id?: string;
  order_id?: string;
  payment_id?: number | string;
  paytype?: string;
  public_key?: string;
  status?: string;
};

export type LiqPayCheckoutResponse = {
  checkoutUrl: string;
  data: string;
  signature: string;
  paymentId: string;
  amount: number;
  currency: 'UAH';
  devMode: boolean;
};

const LIQPAY_CHECKOUT_URL = 'https://www.liqpay.ua/api/3/checkout';
const SUCCESS_PAYMENT_STATUSES = new Set(['success', 'sandbox']);
const FAILED_PAYMENT_STATUSES = new Set(['error', 'failure', 'reversed']);

@Injectable()
export class PaymentsService {
  constructor(
    private readonly configService: ConfigService,
    private readonly ordersService: OrdersService,
    @InjectRepository(PaymentSessionEntity)
    private readonly paymentSessionRepo: Repository<PaymentSessionEntity>,
  ) {}

  async createLiqPayCheckout(
    dto: CreateOrderDto,
    userId: string,
    lang: OrderLangType = 'ua',
  ): Promise<LiqPayCheckoutResponse> {
    const publicKey = this.getLiqPayPublicKey();
    this.getLiqPayPrivateKey();

    const amount = await this.ordersService.previewOnlineOrderAmount(userId, dto, lang);

    if (amount <= 0) {
      throw new BadRequestException(
        lang === 'ua'
          ? 'Сума онлайн-оплати має бути більшою за 0.'
          : 'Online payment amount must be greater than 0.',
      );
    }

    const session = await this.paymentSessionRepo.save(
      this.paymentSessionRepo.create({
        userId,
        orderPayload: {
          ...dto,
          paymentMethod: PaymentMethod.CARD,
        },
        amount,
        provider: 'liqpay',
        status: 'prepared',
      }),
    );

    const checkoutData: LiqPayCheckoutData = {
      version: 7,
      public_key: publicKey,
      action: 'pay',
      amount,
      currency: 'UAH',
      description:
        lang === 'ua'
          ? `Оплата замовлення Nextronic ${session.id}`
          : `Nextronic order payment ${session.id}`,
      order_id: session.id,
      language: this.getLiqPayLanguage(lang),
      paytypes: 'apay,gpay,card,privat24,qr',
      result_url: this.buildResultUrl(lang),
      server_url: this.buildServerUrl(),
      ...(this.isSandboxEnabled() ? { sandbox: 1 } : {}),
    };

    const data = this.encodeData(checkoutData);
    const signature = this.createSignature(data);

    return {
      checkoutUrl: LIQPAY_CHECKOUT_URL,
      data,
      signature,
      paymentId: session.id,
      amount,
      currency: 'UAH',
      devMode: this.isDevModeEnabled(),
    };
  }

  async getLiqPayPaymentStatus(paymentId: string, userId: string, lang: OrderLangType = 'ua') {
    const session = await this.paymentSessionRepo.findOne({
      where: { id: paymentId, userId },
    });

    if (!session) {
      throw new NotFoundException(
        lang === 'ua' ? 'Платіжну сесію не знайдено.' : 'Payment session was not found.',
      );
    }

    return {
      paymentId: session.id,
      status: session.status,
      orderId: session.orderId || null,
      isPaid: SUCCESS_PAYMENT_STATUSES.has(session.status) && Boolean(session.orderId),
      devMode: this.isDevModeEnabled(),
    };
  }

  async simulateSuccessfulLiqPayPayment(
    paymentId: string,
    userId: string,
    lang: OrderLangType = 'ua',
  ) {
    if (!this.isDevModeEnabled()) {
      throw new BadRequestException(
        lang === 'ua'
          ? 'Локальний dev-режим LiqPay вимкнений.'
          : 'Local LiqPay dev mode is disabled.',
      );
    }

    const session = await this.paymentSessionRepo.findOne({
      where: { id: paymentId, userId },
    });
    if (!session) {
      throw new NotFoundException(
        lang === 'ua' ? 'Платіжну сесію не знайдено.' : 'Payment session was not found.',
      );
    }

    if (session.orderId) {
      return await this.ordersService.findOne(session.orderId, lang);
    }

    const timestamp = Date.now();
    const payload: LiqPayCallbackPayload & {
      devMode: true;
      simulatedAt: string;
    } = {
      action: 'pay',
      amount: Number(session.amount || 0),
      currency: 'UAH',
      description:
        lang === 'ua'
          ? `Тестова оплата сесії ${session.id}`
          : `Test payment for session ${session.id}`,
      order_id: session.id,
      payment_id: `dev-${timestamp}`,
      liqpay_order_id: `dev-liqpay-${timestamp}`,
      public_key: this.getLiqPayPublicKey(),
      paytype: 'dev',
      status: 'success',
      devMode: true,
      simulatedAt: new Date().toISOString(),
    };

    const order = await this.ordersService.createPaidOnlineOrder(userId, session.orderPayload, {
      provider: 'liqpay',
      status: 'success',
      paymentTransactionId: String(payload.payment_id),
      liqpayOrderId: payload.liqpay_order_id || null,
      rawPayload: payload,
      lang,
    });

    session.status = 'success';
    session.paymentTransactionId = String(payload.payment_id);
    session.liqpayOrderId = payload.liqpay_order_id || null;
    session.paymentPayload = payload;
    session.orderId = order.id;
    await this.paymentSessionRepo.save(session);

    return order;
  }

  async handleLiqPayCallback(dto: LiqPayCallbackDto) {
    if (!this.isValidSignature(dto.data, dto.signature)) {
      throw new UnauthorizedException('Invalid LiqPay signature');
    }

    const payload = this.decodeCallbackPayload(dto.data);
    const paymentId = payload.order_id;

    if (!paymentId) {
      throw new BadRequestException('LiqPay callback does not contain order_id');
    }

    const session = await this.paymentSessionRepo.findOne({
      where: { id: paymentId },
    });
    if (!session) {
      throw new NotFoundException('Payment session was not found');
    }

    const status = String(payload.status || 'unknown').toLowerCase();

    session.status = status;
    session.paymentTransactionId = payload.payment_id ? String(payload.payment_id) : null;
    session.liqpayOrderId = payload.liqpay_order_id || null;
    session.paymentPayload = payload;

    if (SUCCESS_PAYMENT_STATUSES.has(status)) {
      if (!session.orderId) {
        const order = await this.ordersService.createPaidOnlineOrder(
          session.userId,
          session.orderPayload,
          {
            provider: 'liqpay',
            status,
            paymentTransactionId: payload.payment_id ? String(payload.payment_id) : null,
            liqpayOrderId: payload.liqpay_order_id || null,
            rawPayload: payload,
            lang: 'ua',
          },
        );
        session.orderId = order.id;
      }

      await this.paymentSessionRepo.save(session);
      return { result: 'ok', orderId: session.orderId };
    }

    if (FAILED_PAYMENT_STATUSES.has(status)) {
      await this.paymentSessionRepo.save(session);
      return { result: 'failed', status };
    }

    await this.paymentSessionRepo.save(session);
    return { result: 'pending', status };
  }

  private getLiqPayPublicKey(): string {
    const value = this.configService.get<string>('LIQPAY_PUBLIC_KEY')?.trim();

    if (value) return value;
    if (this.isDevModeEnabled()) return 'liqpay-dev-public-key';

    throw new InternalServerErrorException('LIQPAY_PUBLIC_KEY is not configured');
  }

  private getLiqPayPrivateKey(): string {
    const value = this.configService.get<string>('LIQPAY_PRIVATE_KEY')?.trim();

    if (value) return value;
    if (this.isDevModeEnabled()) return 'liqpay-dev-private-key';

    throw new InternalServerErrorException('LIQPAY_PRIVATE_KEY is not configured');
  }

  private getLiqPayLanguage(lang: OrderLangType): LiqPayLanguage {
    return lang === 'en' ? 'en' : 'uk';
  }

  private buildResultUrl(lang: OrderLangType): string {
    const explicitResultUrl = this.configService.get<string>('LIQPAY_RESULT_URL')?.trim();
    if (explicitResultUrl) return explicitResultUrl;

    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL')?.trim() || 'http://localhost:3000';

    return `${frontendUrl.replace(/\/$/, '')}/${lang}/profile/orders`;
  }

  private buildServerUrl(): string {
    const explicitServerUrl = this.configService.get<string>('LIQPAY_SERVER_URL')?.trim();
    if (explicitServerUrl) return explicitServerUrl;

    const backendPublicUrl =
      this.configService.get<string>('BACKEND_PUBLIC_URL')?.trim() ||
      this.configService.get<string>('API_PUBLIC_URL')?.trim() ||
      `http://localhost:${this.configService.get<string>('PORT') || '3000'}`;

    return `${backendPublicUrl.replace(/\/$/, '')}/payments/liqpay/callback`;
  }

  private isSandboxEnabled(): boolean {
    const value = this.configService.get<string>('LIQPAY_SANDBOX')?.trim().toLowerCase();
    return value === '1' || value === 'true' || value === 'yes';
  }

  private isDevModeEnabled(): boolean {
    const value = this.configService.get<string>('LIQPAY_DEV_MODE')?.trim().toLowerCase();
    return value === '1' || value === 'true' || value === 'yes';
  }

  private getSignatureAlgorithm(): LiqPaySignatureAlgorithm {
    const value = this.configService
      .get<string>('LIQPAY_SIGNATURE_ALGORITHM')
      ?.trim()
      .toLowerCase();

    return value === 'sha1' ? 'sha1' : 'sha3-256';
  }

  private encodeData(payload: LiqPayCheckoutData): string {
    return Buffer.from(JSON.stringify(payload)).toString('base64');
  }

  private createSignature(data: string): string {
    const privateKey = this.getLiqPayPrivateKey();
    const rawSignature = createHash(this.getSignatureAlgorithm())
      .update(`${privateKey}${data}${privateKey}`)
      .digest();

    return Buffer.from(rawSignature).toString('base64');
  }

  private isValidSignature(data: string, receivedSignature: string): boolean {
    const expectedSignature = this.createSignature(data);
    const expectedBuffer = Buffer.from(expectedSignature);
    const receivedBuffer = Buffer.from(receivedSignature);

    if (expectedBuffer.length !== receivedBuffer.length) return false;

    return timingSafeEqual(expectedBuffer, receivedBuffer);
  }

  private decodeCallbackPayload(data: string): LiqPayCallbackPayload {
    try {
      const decoded = Buffer.from(data, 'base64').toString('utf8');
      const parsed: unknown = JSON.parse(decoded);

      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Callback payload is not an object');
      }

      return parsed;
    } catch {
      throw new BadRequestException('Invalid LiqPay callback data');
    }
  }
}
