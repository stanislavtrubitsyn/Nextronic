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
        await this.addBirthdayBonuses(profile.user.id, 200);
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

  private formatDate(date: Date | null): string {
    if (!date) return 'unlimited';
    return date.toLocaleDateString('uk-UA');
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

  async addBonuses(userId: string, orderAmount: number, productName?: string) {
    const amount = Math.round(orderAmount * 0.01);
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

    await this.notificationsService.createNotification(userId, 'purchaseTitle', 'purchaseBody', {
      amount,
      product: productName || '',
      date: this.formatDate(expiresAt),
      bonusId: bonus.id,
    });
    return bonus;
  }

  async addBirthdayBonuses(userId: string, amount: number = 200) {
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

    await this.notificationsService.createNotification(userId, 'birthdayTitle', 'birthdayBody', {
      amount,
      date: this.formatDate(expiresAt),
      bonusId: bonus.id,
    });
    return bonus;
  }

  async adminAddBonus(dto: AdminAddBonusDto) {
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

    await this.notificationsService.createNotification(
      dto.userId,
      'adminAddTitle',
      'adminAddBody',
      { amount: dto.amount, date: this.formatDate(expiresAt), bonusId: bonus.id },
    );
    return bonus;
  }

  async adminSubtractBonus(dto: AdminSubtractBonusDto) {
    const bonus = await this.bonusRepo.save(
      this.bonusRepo.create({
        amount: -dto.amount,
        source: BonusSource.SPENT,
        user: { id: dto.userId },
      }),
    );

    await this.notificationsService.createNotification(
      dto.userId,
      'adminSubTitle',
      'adminSubBody',
      { amount: dto.amount, bonusId: bonus.id },
    );
    return bonus;
  }

  async spendBonuses(userId: string, amount: number, manager?: EntityManager) {
    const repo = manager ? manager.getRepository(BonusEntity) : this.bonusRepo;
    const bonus = await repo.save(
      repo.create({ amount: -amount, source: BonusSource.SPENT, user: { id: userId } }),
    );

    await this.notificationsService.createNotification(userId, 'spendTitle', 'spendBody', {
      amount,
      bonusId: bonus.id,
    });
    return bonus;
  }

  async refundBonuses(userId: string, amount: number) {
    const bonus = await this.bonusRepo.save(
      this.bonusRepo.create({ amount, source: BonusSource.REFUND, user: { id: userId } }),
    );

    await this.notificationsService.createNotification(userId, 'refundTitle', 'refundBody', {
      amount,
      bonusId: bonus.id,
    });
    return bonus;
  }

  async getHistory(userId: string) {
    return await this.bonusRepo.find({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' },
    });
  }
}
