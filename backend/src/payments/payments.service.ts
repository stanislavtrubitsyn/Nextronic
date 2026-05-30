import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, createVerify, timingSafeEqual } from 'crypto';
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

type MonobankBasketDiscount = {
  type: 'discount' | 'extra';
  mode: 'value' | 'percent';
  value: number;
};

type MonobankBasketItem = {
  name: string;
  qty: number;
  sum: number;
  total: number;
  code: string;
  unit?: string;
  tax?: number[];
  discounts?: MonobankBasketDiscount[];
};

type MonobankInvoiceCreatePayload = {
  amount: number;
  ccy: 980;
  merchantPaymInfo: {
    reference: string;
    destination: string;
    comment: string;
    basketOrder: MonobankBasketItem[];
    discounts?: MonobankBasketDiscount[];
  };
  redirectUrl: string;
  webHookUrl: string;
  validity: number;
  paymentType: 'debit';
  displayType: 'iframe';
};

type MonobankInvoiceCreateResponse = {
  invoiceId?: string;
  pageUrl?: string;
};

type MonobankInvoiceStatusPayload = {
  invoiceId?: string;
  status?: string;
  amount?: number;
  ccy?: number;
  finalAmount?: number;
  createdDate?: string;
  modifiedDate?: string;
  reference?: string;
  destination?: string;
  errCode?: string;
  failureReason?: string;
  paymentInfo?: Record<string, unknown>;
  cancelList?: unknown[];
  [key: string]: unknown;
};

type MonobankPubKeyResponse = {
  key?: string;
};

export type MonobankCheckoutResponse = {
  paymentId: string;
  invoiceId: string;
  pageUrl: string;
  amount: number;
  currency: 'UAH';
  devMode: boolean;
};

const LIQPAY_CHECKOUT_URL = 'https://www.liqpay.ua/api/3/checkout';
const SUCCESS_PAYMENT_STATUSES = new Set(['success', 'sandbox']);
const FAILED_PAYMENT_STATUSES = new Set(['error', 'failure', 'reversed']);

const MONOBANK_SUCCESS_STATUSES = new Set(['success']);
const MONOBANK_FAILED_STATUSES = new Set(['failure', 'reversed', 'expired']);
const MONOBANK_PENDING_STATUSES = new Set(['created', 'processing', 'hold']);

@Injectable()
export class PaymentsService {
  private monobankPublicKeyCache: {
    key: string;
    expiresAt: number;
  } | null = null;

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
      server_url: this.buildLiqPayServerUrl(),
      ...(this.isLiqPaySandboxEnabled() ? { sandbox: 1 } : {}),
    };

    const data = this.encodeLiqPayData(checkoutData);
    const signature = this.createLiqPaySignature(data);

    return {
      checkoutUrl: LIQPAY_CHECKOUT_URL,
      data,
      signature,
      paymentId: session.id,
      amount,
      currency: 'UAH',
      devMode: this.isLiqPayDevModeEnabled(),
    };
  }

  async createMonobankCheckout(
    dto: CreateOrderDto,
    userId: string,
    lang: OrderLangType = 'ua',
  ): Promise<MonobankCheckoutResponse> {
    const paymentPreview = await this.ordersService.buildOnlinePaymentPreview(userId, dto, lang);

    if (paymentPreview.amountInMinorUnits <= 0) {
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
        amount: paymentPreview.amount,
        provider: 'monobank',
        status: 'prepared',
        paymentPayload: {
          paymentPreview,
        },
      }),
    );

    const requestBody: MonobankInvoiceCreatePayload = {
      amount: paymentPreview.amountInMinorUnits,
      ccy: 980,
      merchantPaymInfo: {
        reference: session.id,
        destination:
          lang === 'ua'
            ? `Оплата замовлення Nextronic ${session.id}`
            : `Nextronic order payment ${session.id}`,
        comment:
          lang === 'ua'
            ? `Оплата замовлення Nextronic ${session.id}`
            : `Nextronic order payment ${session.id}`,
        basketOrder: paymentPreview.basketOrder,
        ...(paymentPreview.discounts.length > 0 ? { discounts: paymentPreview.discounts } : {}),
      },
      redirectUrl: this.buildResultUrl(lang),
      webHookUrl: this.buildMonobankWebhookUrl(),
      validity: this.getMonobankInvoiceValidity(),
      paymentType: 'debit',
      displayType: 'iframe',
    };

    const createdInvoice = await this.createMonobankInvoice(requestBody, lang);
    const invoiceId = createdInvoice.invoiceId?.trim();
    const pageUrl = createdInvoice.pageUrl?.trim();

    if (!invoiceId || !pageUrl) {
      throw new InternalServerErrorException(
        lang === 'ua'
          ? 'Monobank не повернув посилання на оплату.'
          : 'Monobank did not return a payment URL.',
      );
    }

    session.status = 'created';
    session.paymentTransactionId = invoiceId;
    session.paymentPayload = {
      ...(session.paymentPayload || {}),
      invoiceCreateRequest: requestBody,
      invoiceCreateResponse: createdInvoice,
    };
    await this.paymentSessionRepo.save(session);

    return {
      paymentId: session.id,
      invoiceId,
      pageUrl,
      amount: paymentPreview.amount,
      currency: 'UAH',
      devMode: this.isMonobankDevModeEnabled(),
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
      devMode: this.isLiqPayDevModeEnabled(),
    };
  }

  async getMonobankPaymentStatus(paymentId: string, userId: string, lang: OrderLangType = 'ua') {
    const session = await this.paymentSessionRepo.findOne({
      where: { id: paymentId, userId },
    });

    if (!session || session.provider !== 'monobank') {
      throw new NotFoundException(
        lang === 'ua'
          ? 'Платіжну сесію Monobank не знайдено.'
          : 'Monobank payment session was not found.',
      );
    }

    if (
      session.paymentTransactionId &&
      !session.orderId &&
      !MONOBANK_FAILED_STATUSES.has(session.status)
    ) {
      const statusPayload = await this.fetchMonobankInvoiceStatus(session.paymentTransactionId);
      await this.processMonobankInvoiceStatus(statusPayload, lang);
    }

    const freshSession = await this.paymentSessionRepo.findOne({
      where: { id: paymentId, userId },
    });

    if (!freshSession) {
      throw new NotFoundException(
        lang === 'ua'
          ? 'Платіжну сесію Monobank не знайдено.'
          : 'Monobank payment session was not found.',
      );
    }

    return {
      paymentId: freshSession.id,
      invoiceId: freshSession.paymentTransactionId || null,
      status: freshSession.status,
      orderId: freshSession.orderId || null,
      isPaid: MONOBANK_SUCCESS_STATUSES.has(freshSession.status) && Boolean(freshSession.orderId),
      devMode: this.isMonobankDevModeEnabled(),
    };
  }

  async simulateSuccessfulLiqPayPayment(
    paymentId: string,
    userId: string,
    lang: OrderLangType = 'ua',
  ) {
    if (!this.isLiqPayDevModeEnabled()) {
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

  async simulateSuccessfulMonobankPayment(
    paymentId: string,
    userId: string,
    lang: OrderLangType = 'ua',
  ) {
    if (!this.isMonobankDevModeEnabled()) {
      throw new BadRequestException(
        lang === 'ua'
          ? 'Локальний dev-режим Monobank вимкнений.'
          : 'Local Monobank dev mode is disabled.',
      );
    }

    const session = await this.paymentSessionRepo.findOne({
      where: { id: paymentId, userId, provider: 'monobank' },
    });

    if (!session) {
      throw new NotFoundException(
        lang === 'ua'
          ? 'Платіжну сесію Monobank не знайдено.'
          : 'Monobank payment session was not found.',
      );
    }

    if (session.orderId) {
      return await this.ordersService.findOne(session.orderId, lang);
    }

    const timestamp = Date.now();
    const payload: MonobankInvoiceStatusPayload & {
      devMode: true;
      simulatedAt: string;
    } = {
      invoiceId: session.paymentTransactionId || `dev-mono-${timestamp}`,
      status: 'success',
      amount: Math.round(Number(session.amount || 0) * 100),
      ccy: 980,
      finalAmount: Math.round(Number(session.amount || 0) * 100),
      reference: session.id,
      modifiedDate: new Date().toISOString(),
      devMode: true,
      simulatedAt: new Date().toISOString(),
    };

    const order = await this.ordersService.createPaidOnlineOrder(userId, session.orderPayload, {
      provider: 'monobank',
      status: 'success',
      paymentTransactionId: payload.invoiceId || null,
      liqpayOrderId: null,
      rawPayload: payload,
      lang,
    });

    session.status = 'success';
    session.paymentTransactionId = payload.invoiceId || null;
    session.paymentPayload = payload;
    session.orderId = order.id;
    await this.paymentSessionRepo.save(session);

    return order;
  }

  async handleLiqPayCallback(dto: LiqPayCallbackDto) {
    if (!this.isValidLiqPaySignature(dto.data, dto.signature)) {
      throw new UnauthorizedException('Invalid LiqPay signature');
    }

    const payload = this.decodeLiqPayCallbackPayload(dto.data);
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

  async handleMonobankWebhook(
    payload: Record<string, unknown>,
    signature: string | undefined,
    rawBody: Buffer | undefined,
  ) {
    if (!signature) {
      throw new UnauthorizedException('Monobank webhook x-sign header is missing');
    }

    if (!rawBody) {
      throw new BadRequestException(
        'Raw request body is required for Monobank webhook verification',
      );
    }

    const isValid = await this.verifyMonobankWebhookSignature(rawBody, signature);
    if (!isValid) {
      throw new UnauthorizedException('Invalid Monobank webhook signature');
    }

    return await this.processMonobankInvoiceStatus(payload, 'ua');
  }

  private async processMonobankInvoiceStatus(
    payload: Record<string, unknown>,
    lang: OrderLangType = 'ua',
  ) {
    const invoiceId = typeof payload.invoiceId === 'string' ? payload.invoiceId.trim() : '';

    if (!invoiceId) {
      throw new BadRequestException('Monobank payload does not contain invoiceId');
    }

    const session = await this.paymentSessionRepo.findOne({
      where: { paymentTransactionId: invoiceId, provider: 'monobank' },
    });

    if (!session) {
      throw new NotFoundException('Monobank payment session was not found');
    }

    const status =
      typeof payload.status === 'string' && payload.status.trim()
        ? payload.status.trim().toLowerCase()
        : 'unknown';

    session.status = status;
    session.paymentPayload = payload;
    session.paymentTransactionId = invoiceId;

    if (MONOBANK_SUCCESS_STATUSES.has(status)) {
      if (!session.orderId) {
        const order = await this.ordersService.createPaidOnlineOrder(
          session.userId,
          session.orderPayload,
          {
            provider: 'monobank',
            status,
            paymentTransactionId: invoiceId,
            liqpayOrderId: null,
            rawPayload: payload,
            lang,
          },
        );

        session.orderId = order.id;
      }

      await this.paymentSessionRepo.save(session);
      return { result: 'ok', orderId: session.orderId };
    }

    if (MONOBANK_FAILED_STATUSES.has(status)) {
      await this.paymentSessionRepo.save(session);
      return { result: 'failed', status };
    }

    if (MONOBANK_PENDING_STATUSES.has(status)) {
      await this.paymentSessionRepo.save(session);
      return { result: 'pending', status };
    }

    await this.paymentSessionRepo.save(session);
    return { result: 'unknown', status };
  }

  private async createMonobankInvoice(
    payload: MonobankInvoiceCreatePayload,
    lang: OrderLangType,
  ): Promise<MonobankInvoiceCreateResponse> {
    const token = this.getMonobankToken();

    const response = await fetch(`${this.getMonobankApiBaseUrl()}/api/merchant/invoice/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Token': token,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const message = await response.text();
      throw new BadRequestException(
        message ||
          (lang === 'ua'
            ? 'Не вдалося створити рахунок Monobank.'
            : 'Failed to create Monobank invoice.'),
      );
    }

    const data: unknown = await response.json();
    return data as MonobankInvoiceCreateResponse;
  }

  private async fetchMonobankInvoiceStatus(
    invoiceId: string,
  ): Promise<MonobankInvoiceStatusPayload> {
    const token = this.getMonobankToken();
    const url = new URL(`${this.getMonobankApiBaseUrl()}/api/merchant/invoice/status`);
    url.searchParams.set('invoiceId', invoiceId);

    const response = await fetch(url, {
      headers: {
        'X-Token': token,
      },
    });

    if (!response.ok) {
      const message = await response.text();
      throw new BadRequestException(message || 'Failed to load Monobank invoice status');
    }

    const data: unknown = await response.json();
    return data as MonobankInvoiceStatusPayload;
  }

  private async verifyMonobankWebhookSignature(
    rawBody: Buffer,
    signature: string,
  ): Promise<boolean> {
    const publicKey = await this.getMonobankPublicKey();
    const verify = createVerify('SHA256');

    verify.update(rawBody);
    verify.end();

    try {
      return verify.verify(publicKey, Buffer.from(signature, 'base64'));
    } catch {
      this.monobankPublicKeyCache = null;
      return false;
    }
  }

  private async getMonobankPublicKey(): Promise<string> {
    const now = Date.now();

    if (this.monobankPublicKeyCache && this.monobankPublicKeyCache.expiresAt > now) {
      return this.monobankPublicKeyCache.key;
    }

    const token = this.getMonobankToken();
    const response = await fetch(`${this.getMonobankApiBaseUrl()}/api/merchant/pubkey`, {
      headers: {
        'X-Token': token,
      },
    });

    if (!response.ok) {
      const message = await response.text();
      throw new InternalServerErrorException(message || 'Failed to load Monobank public key');
    }

    const data = (await response.json()) as MonobankPubKeyResponse;
    if (!data.key) {
      throw new InternalServerErrorException('Monobank public key response is empty');
    }

    const publicKey = Buffer.from(data.key, 'base64').toString('utf8');

    this.monobankPublicKeyCache = {
      key: publicKey,
      expiresAt: now + 60 * 60 * 1000,
    };

    return publicKey;
  }

  private getLiqPayPublicKey(): string {
    const value = this.configService.get<string>('LIQPAY_PUBLIC_KEY')?.trim();

    if (value) return value;
    if (this.isLiqPayDevModeEnabled()) return 'liqpay-dev-public-key';

    throw new InternalServerErrorException('LIQPAY_PUBLIC_KEY is not configured');
  }

  private getLiqPayPrivateKey(): string {
    const value = this.configService.get<string>('LIQPAY_PRIVATE_KEY')?.trim();

    if (value) return value;
    if (this.isLiqPayDevModeEnabled()) return 'liqpay-dev-private-key';

    throw new InternalServerErrorException('LIQPAY_PRIVATE_KEY is not configured');
  }

  private getMonobankToken(): string {
    const value =
      this.configService.get<string>('MONOBANK_TOKEN')?.trim() ||
      this.configService.get<string>('MONO_TOKEN')?.trim();

    if (value) return value;

    throw new InternalServerErrorException('MONOBANK_TOKEN is not configured');
  }

  private getMonobankApiBaseUrl(): string {
    return (
      this.configService.get<string>('MONOBANK_API_BASE_URL')?.trim() || 'https://api.monobank.ua'
    ).replace(/\/$/, '');
  }

  private getLiqPayLanguage(lang: OrderLangType): LiqPayLanguage {
    return lang === 'en' ? 'en' : 'uk';
  }

  private buildResultUrl(lang: OrderLangType): string {
    const explicitResultUrl = this.configService.get<string>('PAYMENT_RESULT_URL')?.trim();
    if (explicitResultUrl) return explicitResultUrl;

    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL')?.trim() || 'http://localhost:3000';

    return `${frontendUrl.replace(/\/$/, '')}/${lang}/profile/orders`;
  }

  private buildLiqPayServerUrl(): string {
    const explicitServerUrl = this.configService.get<string>('LIQPAY_SERVER_URL')?.trim();
    if (explicitServerUrl) return explicitServerUrl;

    const backendPublicUrl = this.getBackendPublicUrl();

    return `${backendPublicUrl}/payments/liqpay/callback`;
  }

  private buildMonobankWebhookUrl(): string {
    const explicitWebhookUrl = this.configService.get<string>('MONOBANK_WEBHOOK_URL')?.trim();
    if (explicitWebhookUrl) return explicitWebhookUrl;

    const backendPublicUrl = this.getBackendPublicUrl();

    return `${backendPublicUrl}/payments/monobank/webhook`;
  }

  private getBackendPublicUrl(): string {
    const backendPublicUrl =
      this.configService.get<string>('BACKEND_PUBLIC_URL')?.trim() ||
      this.configService.get<string>('API_PUBLIC_URL')?.trim() ||
      `http://localhost:${this.configService.get<string>('PORT') || '3000'}`;

    return backendPublicUrl.replace(/\/$/, '');
  }

  private getMonobankInvoiceValidity(): number {
    const value = Number(this.configService.get<string>('MONOBANK_INVOICE_VALIDITY') || 3600);
    if (!Number.isFinite(value) || value <= 0) return 3600;

    return Math.floor(value);
  }

  private isLiqPaySandboxEnabled(): boolean {
    const value = this.configService.get<string>('LIQPAY_SANDBOX')?.trim().toLowerCase();
    return value === '1' || value === 'true' || value === 'yes';
  }

  private isLiqPayDevModeEnabled(): boolean {
    const value = this.configService.get<string>('LIQPAY_DEV_MODE')?.trim().toLowerCase();
    return value === '1' || value === 'true' || value === 'yes';
  }

  private isMonobankDevModeEnabled(): boolean {
    const value = this.configService.get<string>('MONOBANK_DEV_MODE')?.trim().toLowerCase();
    return value === '1' || value === 'true' || value === 'yes';
  }

  private getLiqPaySignatureAlgorithm(): LiqPaySignatureAlgorithm {
    const value = this.configService
      .get<string>('LIQPAY_SIGNATURE_ALGORITHM')
      ?.trim()
      .toLowerCase();

    return value === 'sha1' ? 'sha1' : 'sha3-256';
  }

  private encodeLiqPayData(payload: LiqPayCheckoutData): string {
    return Buffer.from(JSON.stringify(payload)).toString('base64');
  }

  private createLiqPaySignature(data: string): string {
    const privateKey = this.getLiqPayPrivateKey();
    const rawSignature = createHash(this.getLiqPaySignatureAlgorithm())
      .update(`${privateKey}${data}${privateKey}`)
      .digest();

    return Buffer.from(rawSignature).toString('base64');
  }

  private isValidLiqPaySignature(data: string, receivedSignature: string): boolean {
    const expectedSignature = this.createLiqPaySignature(data);
    const expectedBuffer = Buffer.from(expectedSignature);
    const receivedBuffer = Buffer.from(receivedSignature);

    if (expectedBuffer.length !== receivedBuffer.length) return false;

    return timingSafeEqual(expectedBuffer, receivedBuffer);
  }

  private decodeLiqPayCallbackPayload(data: string): LiqPayCallbackPayload {
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
