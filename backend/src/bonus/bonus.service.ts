import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, EntityManager, IsNull, LessThanOrEqual } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BonusEntity, BonusSource } from './bonus.entity';
import { AdminAddBonusDto, AdminSubtractBonusDto } from './bonus.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { ProfilesEntity } from '../users/profiles.entity';

@Injectable()
export class BonusService {
  private readonly logger = new Logger(BonusService.name);

  constructor(
    @InjectRepository(BonusEntity)
    private readonly bonusRepo: Repository<BonusEntity>,
    @InjectRepository(ProfilesEntity)
    private readonly profileRepo: Repository<ProfilesEntity>,
    private readonly notificationsService: NotificationsService,
  ) {}

  private readonly i18n = {
    ua: {
      unlimited: 'необмежено',
      purchaseTitle: 'Нарахування бонусів',
      purchaseBody: (amount: number, product: string, date: string) =>
        `Вам нараховано ${amount} бонусів${product}. Дійсні до: ${date}.`,
      birthdayTitle: 'З днем народження!',
      birthdayBody: (amount: number, date: string) =>
        `Даруємо вам ${amount} бонусів до вашого свята! Використайте їх до ${date}.`,
      adminAddTitle: 'Подарункові бонуси',
      adminAddBody: (amount: number, date: string) =>
        `Адміністратор нарахував вам ${amount} бонусів. Дійсні до: ${date}.`,
      adminSubTitle: 'Списання бонусів',
      adminSubBody: (amount: number) => `Адміністратор списав ${amount} бонусів з вашого рахунку.`,
      spendTitle: 'Використання бонусів',
      spendBody: (amount: number) =>
        `З вашого рахунку списано ${amount} бонусів для оплати замовлення.`,
      refundTitle: 'Повернення бонусів',
      refundBody: (amount: number) => `Вам повернуто ${amount} бонусів за скасоване замовлення.`,
      forProduct: (name: string) => ` за товар "${name}"`,
    },
    en: {
      unlimited: 'unlimited',
      purchaseTitle: 'Bonus Accrual',
      purchaseBody: (amount: number, product: string, date: string) =>
        `You have been credited with ${amount} bonuses${product}. Valid until: ${date}.`,
      birthdayTitle: 'Happy Birthday!',
      birthdayBody: (amount: number, date: string) =>
        `We are giving you ${amount} bonuses for your holiday! Use them until ${date}.`,
      adminAddTitle: 'Gift Bonuses',
      adminAddBody: (amount: number, date: string) =>
        `The administrator has credited you with ${amount} bonuses. Valid until: ${date}.`,
      adminSubTitle: 'Bonus Deduction',
      adminSubBody: (amount: number) =>
        `The administrator has deducted ${amount} bonuses from your account.`,
      spendTitle: 'Bonus Usage',
      spendBody: (amount: number) => `${amount} bonuses have been deducted for your order payment.`,
      refundTitle: 'Bonus Refund',
      refundBody: (amount: number) =>
        `${amount} bonuses have been refunded for your cancelled order.`,
      forProduct: (name: string) => ` for product "${name}"`,
    },
  };

  // АВТОМАТИЗАЦІЯ: Перевірка іменинників щодня о 09:00

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async checkBirthdays() {
    this.logger.log('Checking for birthdays today...');
    const today = new Date();
    const day = today.getDate();
    const month = today.getMonth() + 1;

    // Шукаємо профілі, де день і місяць народження збігаються з сьогоднішнім
    const birthdayProfiles = await this.profileRepo
      .createQueryBuilder('profile')
      .leftJoinAndSelect('profile.user', 'user')
      .where('EXTRACT(DAY FROM profile.birthday) = :day', { day })
      .andWhere('EXTRACT(MONTH FROM profile.birthday) = :month', { month })
      .getMany();

    for (const profile of birthdayProfiles) {
      if (profile.user) {
        await this.addBirthdayBonuses(profile.user.id, 200, 'ua');
      }
    }
  }

  // АВТОМАТИЗАЦІЯ: Позначення протермінованих бонусів щоночі

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupExpiredBonuses() {
    this.logger.log('Cleaning up expired bonuses...');
    await this.bonusRepo.update(
      {
        expiresAt: LessThanOrEqual(new Date()),
        isExpired: false,
      },
      { isExpired: true },
    );
  }

  private formatDate(date: Date | null, lang: 'ua' | 'en' = 'ua'): string {
    if (!date) return this.i18n[lang].unlimited;
    return date.toLocaleDateString(lang === 'ua' ? 'uk-UA' : 'en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  async getBalance(userId: string): Promise<number> {
    const bonuses = await this.bonusRepo.find({
      where: [
        { user: { id: userId }, isExpired: false, expiresAt: MoreThan(new Date()) },
        { user: { id: userId }, expiresAt: IsNull() },
      ],
    });
    return bonuses.reduce((sum, b) => sum + Number(b.amount), 0);
  }

  async addBonuses(
    userId: string,
    orderAmount: number,
    productName?: string,
    lang: 'ua' | 'en' = 'ua',
  ) {
    const amount = Math.round(orderAmount * 0.1);
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    const bonus = await this.bonusRepo.save(
      this.bonusRepo.create({
        amount,
        source: BonusSource.PURCHASE,
        expiresAt,
        user: { id: userId },
      }),
    );

    const t = this.i18n[lang];
    const productInfo = productName ? t.forProduct(productName) : '';
    await this.notificationsService.createNotification(
      userId,
      t.purchaseTitle,
      t.purchaseBody(amount, productInfo, this.formatDate(expiresAt, lang)),
    );
    return bonus;
  }

  async addBirthdayBonuses(userId: string, amount: number = 200, lang: 'ua' | 'en' = 'ua') {
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    const bonus = await this.bonusRepo.save(
      this.bonusRepo.create({
        amount,
        source: BonusSource.BIRTHDAY,
        expiresAt,
        user: { id: userId },
      }),
    );

    const t = this.i18n[lang];
    await this.notificationsService.createNotification(
      userId,
      t.birthdayTitle,
      t.birthdayBody(amount, this.formatDate(expiresAt, lang)),
    );
    return bonus;
  }

  async adminAddBonus(dto: AdminAddBonusDto, lang: 'ua' | 'en' = 'ua') {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (dto.daysValid || 30));

    const bonus = await this.bonusRepo.save(
      this.bonusRepo.create({
        amount: dto.amount,
        source: BonusSource.ADMIN,
        expiresAt,
        user: { id: dto.userId },
      }),
    );

    const t = this.i18n[lang];
    await this.notificationsService.createNotification(
      dto.userId,
      t.adminAddTitle,
      t.adminAddBody(dto.amount, this.formatDate(expiresAt, lang)),
    );
    return bonus;
  }

  async adminSubtractBonus(dto: AdminSubtractBonusDto, lang: 'ua' | 'en' = 'ua') {
    const bonus = await this.bonusRepo.save(
      this.bonusRepo.create({
        amount: -dto.amount,
        source: BonusSource.SPENT,
        user: { id: dto.userId },
      }),
    );

    const t = this.i18n[lang];
    await this.notificationsService.createNotification(
      dto.userId,
      t.adminSubTitle,
      t.adminSubBody(dto.amount),
    );
    return bonus;
  }

  async spendBonuses(
    userId: string,
    amount: number,
    lang: 'ua' | 'en' = 'ua',
    manager?: EntityManager,
  ) {
    const repo = manager ? manager.getRepository(BonusEntity) : this.bonusRepo;
    const bonus = await repo.save(
      repo.create({ amount: -amount, source: BonusSource.SPENT, user: { id: userId } }),
    );

    const t = this.i18n[lang];
    await this.notificationsService.createNotification(userId, t.spendTitle, t.spendBody(amount));
    return bonus;
  }

  async refundBonuses(userId: string, amount: number, lang: 'ua' | 'en' = 'ua') {
    const bonus = await this.bonusRepo.save(
      this.bonusRepo.create({ amount, source: BonusSource.REFUND, user: { id: userId } }),
    );

    const t = this.i18n[lang];
    await this.notificationsService.createNotification(userId, t.refundTitle, t.refundBody(amount));
    return bonus;
  }

  async getHistory(userId: string) {
    return await this.bonusRepo.find({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' },
    });
  }
}
