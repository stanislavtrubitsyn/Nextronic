import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersEntity } from './users.entity';
import { ProfilesEntity } from './profiles.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UsersEntity)
    private readonly userRepo: Repository<UsersEntity>,
    @InjectRepository(ProfilesEntity)
    private readonly profileRepo: Repository<ProfilesEntity>,
  ) {}

  async create(email: string, password?: string, googleId?: string) {
    // Перевірка, чи існує користувач
    const existingUser = await this.userRepo.findOne({ where: { email } });
    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    // Хешування пароля, якщо він є (немає при Google Auth)
    let hashedPassword;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(password, salt);
    }

    // Створюємо користувача разом із профілем (cascade: true це дозволяє)
    const user = this.userRepo.create({
      email,
      password: hashedPassword,
      googleId,
      profile: {}, // Створюємо порожній об'єкт профілю
    });

    return await this.userRepo.save(user);
  }

  async findByEmail(email: string) {
    return await this.userRepo.findOne({
      where: { email },
      relations: ['profile'],
      select: ['id', 'email', 'password', 'role', 'googleId'], // Пароль потрібен для валідації при логіні
    });
  }

  async findOne(id: string) {
    return await this.userRepo.findOne({
      where: { id },
      relations: ['profile'],
    });
  }
}
