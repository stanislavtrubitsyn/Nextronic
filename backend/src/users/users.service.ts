import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersEntity, UserRole } from './users.entity';
import { ProfilesEntity } from './profiles.entity';
import * as bcrypt from 'bcrypt';
import { USERS_I18N, UserLangType } from './users.i18n';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-log.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UsersEntity)
    private readonly userRepo: Repository<UsersEntity>,
    @InjectRepository(ProfilesEntity)
    private readonly profileRepo: Repository<ProfilesEntity>,
    private readonly auditService: AuditService,
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

  async findOrCreateGoogleUser(googleProfile: {
    email: string;
    googleId: string;
    firstName?: string;
    lastName?: string;
  }) {
    const user = await this.userRepo.findOne({
      where: { email: googleProfile.email },
      relations: ['profile'],
    });

    if (user) {
      if (!user.googleId) {
        user.googleId = googleProfile.googleId;
        await this.userRepo.save(user);
      }
      return user;
    }

    const newUser = this.userRepo.create({
      email: googleProfile.email,
      googleId: googleProfile.googleId,
      profile: {
        email: googleProfile.email,
        firstName: googleProfile.firstName,
        lastName: googleProfile.lastName,
      },
    });

    return await this.userRepo.save(newUser);
  }

  // Адмінське оновлення З ЛОГУВАННЯМ
  async adminUpdate(
    id: string,
    data: { role?: UserRole; profile?: Partial<ProfilesEntity> },
    adminId: string,
    lang: UserLangType = 'ua',
  ) {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: ['profile'],
    });

    if (!user) throw new NotFoundException(USERS_I18N[lang].notFound);

    // Робимо глибоку копію старого стану (JSON.parse), щоб TypeORM не змінив oldValues по посиланню
    const oldUserSnapshot = JSON.parse(JSON.stringify(user));

    if (data.role) user.role = data.role;

    if (data.profile) {
      Object.assign(user.profile, data.profile);
      if (data.profile.email) user.email = data.profile.email;
      if (data.profile.phone) user.phone = data.profile.phone;
    }

    const savedUser = await this.userRepo.save(user);

    // ЗАПИСУЄМО В АУДИТ
    await this.auditService.logAction(
      adminId,
      AuditAction.UPDATE,
      'UsersEntity',
      savedUser.id,
      oldUserSnapshot, // Старий стан до модифікації
      savedUser, // Новий стан
    );

    return savedUser;
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

  // Видалення З ЛОГУВАННЯМ
  async remove(id: string, adminId?: string, lang: UserLangType = 'ua') {
    const user = await this.userRepo.findOne({ where: { id }, relations: ['profile'] });
    if (!user) throw new NotFoundException(USERS_I18N[lang].notFound);

    // Робимо копію перед видаленням
    const oldUserSnapshot = JSON.parse(JSON.stringify(user));

    const result = await this.userRepo.remove(user);

    // ЗАПИСУЄМО В АУДИТ (якщо дію ініціював адмін або сам користувач)
    if (adminId) {
      await this.auditService.logAction(
        adminId,
        AuditAction.DELETE,
        'UsersEntity',
        id,
        oldUserSnapshot, // Старий стан (щоб можна було відновити акаунт)
        null,
      );
    }

    return result;
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
