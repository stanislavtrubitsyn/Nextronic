import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersEntity, UserRole } from './users.entity';
import { ProfilesEntity } from './profiles.entity';
import * as bcrypt from 'bcrypt';
import { USERS_I18N, UserLangType } from './users.i18n';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UsersEntity)
    private readonly userRepo: Repository<UsersEntity>,
    @InjectRepository(ProfilesEntity)
    private readonly profileRepo: Repository<ProfilesEntity>,
  ) {}

  async create(
    email: string,
    password?: string,
    googleId?: string,
    phone?: string,
    lang: UserLangType = 'ua',
  ) {
    const existingUser = await this.userRepo.findOne({
      where: [{ email }, { phone: phone || 'never-match' }],
    });

    if (existingUser) {
      throw new BadRequestException(USERS_I18N[lang].exists);
    }

    let hashedPassword;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    const user = this.userRepo.create({
      email,
      phone,
      password: hashedPassword,
      googleId,
      profile: {
        email,
        phone,
      },
    });

    return await this.userRepo.save(user);
  }

  // Адмінське оновлення
  async adminUpdate(
    id: string,
    data: { role?: UserRole; profile?: Partial<ProfilesEntity> },
    lang: UserLangType = 'ua',
  ) {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: ['profile'],
    });

    if (!user) throw new NotFoundException(USERS_I18N[lang].notFound);

    if (data.role) user.role = data.role;

    if (data.profile) {
      Object.assign(user.profile, data.profile);
      if (data.profile.email) user.email = data.profile.email;
      if (data.profile.phone) user.phone = data.profile.phone;
    }

    return await this.userRepo.save(user);
  }

  async update(id: string, updateData: Partial<ProfilesEntity>, lang: UserLangType = 'ua') {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: ['profile'],
    });

    if (!user) throw new NotFoundException(USERS_I18N[lang].notFound);

    Object.assign(user.profile, updateData);

    if (updateData.email) user.email = updateData.email;
    if (updateData.phone) user.phone = updateData.phone;

    return await this.userRepo.save(user);
  }

  async remove(id: string, lang: UserLangType = 'ua') {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException(USERS_I18N[lang].notFound);
    return await this.userRepo.remove(user);
  }

  async findByEmail(email: string) {
    return await this.userRepo.findOne({
      where: { email },
      relations: ['profile'],
      select: ['id', 'email', 'password', 'role', 'googleId'],
    });
  }

  async findOne(id: string) {
    return await this.userRepo.findOne({
      where: { id },
      relations: ['profile'],
    });
  }

  async findAll() {
    return await this.userRepo.find({
      relations: ['profile'],
    });
  }

  async findByIdentifier(identifier: string) {
    return await this.userRepo.findOne({
      where: [{ email: identifier }, { phone: identifier }],
      relations: ['profile'],
      select: ['id', 'email', 'phone', 'password', 'role'],
    });
  }
}
