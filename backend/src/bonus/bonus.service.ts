import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BonusAccountEntity } from './bonus.entity';

@Injectable()
export class BonusService {
  constructor(
    @InjectRepository(BonusAccountEntity)
    private readonly bonusRepo: Repository<BonusAccountEntity>,
  ) {}

  async getBalance(userId: string) {
    let account = await this.bonusRepo.findOne({ where: { user: { id: userId } } });
    if (!account) {
      account = this.bonusRepo.create({ user: { id: userId }, balance: 0 });
      await this.bonusRepo.save(account);
    }
    return account;
  }

  async addBonuses(userId: string, orderAmount: number) {
    const account = await this.getBalance(userId);
    const bonusAmount = Math.round(orderAmount * 0.1); // 10% з округленням
    account.balance += bonusAmount;
    return await this.bonusRepo.save(account);
  }
}
