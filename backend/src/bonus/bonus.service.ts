import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, EntityManager, IsNull, LessThanOrEqual } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BonusEntity, BonusSource } from './bonus.entity';
import { AdminAddBonusDto, AdminSubtractBonusDto } from './bonus.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { ProfilesEntity } from '../users/profiles.entity';
import { BONUS_I18N, LangType } from './bonus.i18n';

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

  // ВТОМАТИЗАЦІЯ

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async checkBirthdays() {
    this.logger.log('Checking for birthdays today...');
    const today = new Date();
    const day = today.getDate();
    const month = today.getMonth() + 1;

    const birthdayProfiles = await this.profileRepo
      .createQueryBuilder('profile')
      .leftJoinAndSelect('profile.user', 'user')
      .where('EXTRACT(DAY FROM profile.birthday) = :day', { day })
      .andWhere('EXTRACT(MONTH FROM profile.birthday) = :month', { month })
      .getMany();

    for (const profile of birthdayProfiles) {
      if (profile.user) {
        // За замовчуванням 'ua', але можна брати з профілю, якщо є таке поле
        await this.addBirthdayBonuses(profile.user.id, 200, 'ua');
      }
    }
  }

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

  //ДОПОМІЖНІ МЕТОДИ

  private formatDate(date: Date | null, lang: LangType = 'ua'): string {
    if (!date) return BONUS_I18N[lang].unlimited;
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

  // ЛОГІКА НАРАХУВАННЯ ТА СПИСАННЯ

  async addBonuses(
    userId: string,
    orderAmount: number,
    productName?: string,
    lang: LangType = 'ua',
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

    const t = BONUS_I18N[lang];
    const productInfo = productName ? t.forProduct(productName) : '';
    await this.notificationsService.createNotification(
      userId,
      t.purchaseTitle,
      t.purchaseBody(amount, productInfo, this.formatDate(expiresAt, lang)),
    );
    return bonus;
  }

  async addBirthdayBonuses(userId: string, amount: number = 200, lang: LangType = 'ua') {
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

    const t = BONUS_I18N[lang];
    await this.notificationsService.createNotification(
      userId,
      t.birthdayTitle,
      t.birthdayBody(amount, this.formatDate(expiresAt, lang)),
    );
    return bonus;
  }

  async adminAddBonus(dto: AdminAddBonusDto, lang: LangType = 'ua') {
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

    const t = BONUS_I18N[lang];
    await this.notificationsService.createNotification(
      dto.userId,
      t.adminAddTitle,
      t.adminAddBody(dto.amount, this.formatDate(expiresAt, lang)),
    );
    return bonus;
  }

  async adminSubtractBonus(dto: AdminSubtractBonusDto, lang: LangType = 'ua') {
    const bonus = await this.bonusRepo.save(
      this.bonusRepo.create({
        amount: -dto.amount,
        source: BonusSource.SPENT,
        user: { id: dto.userId },
      }),
    );

    const t = BONUS_I18N[lang];
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
    lang: LangType = 'ua',
    manager?: EntityManager,
  ) {
    const repo = manager ? manager.getRepository(BonusEntity) : this.bonusRepo;
    const bonus = await repo.save(
      repo.create({ amount: -amount, source: BonusSource.SPENT, user: { id: userId } }),
    );

    const t = BONUS_I18N[lang];
    await this.notificationsService.createNotification(userId, t.spendTitle, t.spendBody(amount));
    return bonus;
  }

  async refundBonuses(userId: string, amount: number, lang: LangType = 'ua') {
    const bonus = await this.bonusRepo.save(
      this.bonusRepo.create({ amount, source: BonusSource.REFUND, user: { id: userId } }),
    );

    const t = BONUS_I18N[lang];
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
