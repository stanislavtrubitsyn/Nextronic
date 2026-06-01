import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersEntity, UserRole } from './users.entity';
import { ProfilesEntity } from './profiles.entity';
import * as bcrypt from 'bcrypt';
import { USERS_I18N, UserLangType } from './users.i18n';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-log.entity';
import { CreateUserAdminDto } from './users.dto';
import { canAssignUserRole, canManageUserRole, isPrivilegedRole } from '../auth/role-groups';

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
    profileData?: {
      firstName?: string;
      lastName?: string;
    },
  ): Promise<UsersEntity> {
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
        firstName: profileData?.firstName,
        lastName: profileData?.lastName,
      },
    });

    return await this.userRepo.save(user);
  }

  async findOrCreateGoogleUser(googleProfile: {
    email: string;
    googleId: string;
    firstName?: string;
    lastName?: string;
  }): Promise<UsersEntity> {
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

  async adminUpdate(
    id: string,
    data: { role?: UserRole; profile?: Partial<ProfilesEntity> },
    adminId: string,
    actorRole: UserRole,
    lang: UserLangType = 'ua',
  ): Promise<UsersEntity> {
    const user = await this.userRepo.findOne({ where: { id }, relations: ['profile'] });
    if (!user) throw new NotFoundException(USERS_I18N[lang].notFound);

    const actualActorRole = await this.resolveActorRole(adminId, actorRole, lang);

    this.assertCanManageUser(actualActorRole, user.role, lang);

    if (data.role && data.role !== user.role) {
      this.assertCanAssignRole(actualActorRole, data.role, lang);
    }

    const oldUserSnapshot = { ...user, profile: { ...user.profile } };

    if (data.role && data.role !== user.role) {
      user.role = data.role;
      user.assignedAt = isPrivilegedRole(data.role) ? new Date() : (null as any);
    }

    if (data.profile) {
      if (!user.profile) {
        user.profile = this.profileRepo.create({
          email: user.email,
          phone: user.phone,
          user,
        });
      }

      Object.assign(user.profile, data.profile);

      if (data.profile.email) {
        user.email = data.profile.email;
        user.profile.email = data.profile.email;
      }

      if (data.profile.phone) {
        user.phone = data.profile.phone;
        user.profile.phone = data.profile.phone;
      }
    }

    const savedUser = await this.userRepo.save(user);

    await this.auditService.logAction(
      adminId,
      AuditAction.UPDATE,
      'UsersEntity',
      savedUser.id,
      oldUserSnapshot,
      savedUser,
    );

    return savedUser;
  }

  async update(
    id: string,
    updateData: Partial<ProfilesEntity>,
    lang: UserLangType = 'ua',
  ): Promise<UsersEntity> {
    const user = await this.userRepo.findOne({ where: { id }, relations: ['profile'] });
    if (!user) throw new NotFoundException(USERS_I18N[lang].notFound);

    Object.assign(user.profile, updateData);
    if (updateData.email) user.email = updateData.email;
    if (updateData.phone) user.phone = updateData.phone;

    return await this.userRepo.save(user);
  }

  async updatePassword(
    id: string,
    newPassword: string,
    oldPassword?: string,
    lang: UserLangType = 'ua',
  ): Promise<{ success: boolean }> {
    const user = await this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.id = :id', { id })
      .getOne();

    if (!user) throw new NotFoundException(USERS_I18N[lang].notFound);

    if (user.password) {
      if (!oldPassword) throw new BadRequestException('Потрібен старий пароль');
      const isMatch = await bcrypt.compare(oldPassword, user.password);
      if (!isMatch) throw new BadRequestException('Невірний старий пароль');
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await this.userRepo.save(user);
    return { success: true };
  }

  async verifyPassword(id: string, password?: string): Promise<boolean> {
    const user = await this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.id = :id', { id })
      .getOne();

    if (!user) return false;
    if (!user.password) return true;
    if (!password) return false;

    const isMatch = await bcrypt.compare(password, user.password);
    return isMatch === true;
  }

  async remove(
    id: string,
    actorId?: string,
    actorRole?: UserRole,
    lang: UserLangType = 'ua',
  ): Promise<UsersEntity> {
    const user = await this.userRepo.findOne({ where: { id }, relations: ['profile'] });
    if (!user) throw new NotFoundException(USERS_I18N[lang].notFound);

    const isSelfAction = actorId === id;

    if (!isSelfAction) {
      const actualActorRole = await this.resolveActorRole(actorId, actorRole, lang);
      this.assertCanManageUser(actualActorRole, user.role, lang);
    }

    const oldUserSnapshot = { ...user, profile: { ...user.profile } };

    await this.userRepo.remove(user);

    if (actorId) {
      await this.auditService.logAction(
        actorId,
        AuditAction.DELETE,
        'UsersEntity',
        id,
        oldUserSnapshot,
        null,
      );
    }

    return user;
  }

  async findByEmail(email: string): Promise<UsersEntity | null> {
    return await this.userRepo.findOne({
      where: { email },
      relations: ['profile'],
      select: ['id', 'email', 'password', 'role', 'googleId'],
    });
  }

  async findOne(
    id: string,
  ): Promise<(Omit<UsersEntity, 'password'> & { hasPassword: boolean }) | null> {
    const user = await this.userRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.profile', 'profile')
      .addSelect('user.password')
      .where('user.id = :id', { id })
      .getOne();

    if (!user) return null;

    const hasPassword = !!user.password;

    const safeUser = { ...user };
    delete safeUser.password;

    return { ...safeUser, hasPassword };
  }

  async findAll(): Promise<UsersEntity[]> {
    return await this.userRepo.find({
      relations: ['profile'],
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findByIdentifier(identifier: string): Promise<UsersEntity | null> {
    return await this.userRepo.findOne({
      where: [{ email: identifier }, { phone: identifier }],
      relations: ['profile'],
      select: ['id', 'email', 'phone', 'password', 'role'],
    });
  }

  async toggleBlock(
    id: string,
    adminId: string,
    actorRole: UserRole,
    lang: UserLangType = 'ua',
  ): Promise<UsersEntity> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException(USERS_I18N[lang].notFound);

    const actualActorRole = await this.resolveActorRole(adminId, actorRole, lang);

    this.assertCanManageUser(actualActorRole, user.role, lang);

    const oldSnapshot = { ...user };

    user.isBlocked = !user.isBlocked;

    const saved = await this.userRepo.save(user);

    await this.auditService.logAction(
      adminId,
      AuditAction.UPDATE,
      'UsersEntity',
      saved.id,
      oldSnapshot,
      saved,
    );

    return saved;
  }

  async createByAdmin(
    dto: CreateUserAdminDto,
    adminId: string,
    actorRole: UserRole,
    lang: UserLangType = 'ua',
  ): Promise<UsersEntity> {
    const { email, password, role, firstName, lastName, middleName, birthday, phone } = dto;
    const actualActorRole = await this.resolveActorRole(adminId, actorRole, lang);

    this.assertCanAssignRole(actualActorRole, role, lang);

    const existing = await this.userRepo.findOne({
      where: [{ email }, { phone: phone || 'never-match' }],
    });

    if (existing) throw new BadRequestException(USERS_I18N[lang].exists);

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = this.userRepo.create({
      email,
      password: hashedPassword,
      phone,
      role,
      assignedAt: isPrivilegedRole(role) ? new Date() : undefined,
      profile: {
        firstName,
        lastName,
        middleName,
        birthday,
        email,
        phone,
      },
    });

    const saved = await this.userRepo.save(user);

    await this.auditService.logAction(
      adminId,
      AuditAction.CREATE,
      'UsersEntity',
      saved.id,
      null,
      saved,
    );

    return saved;
  }

  private async resolveActorRole(
    actorId?: string,
    fallbackRole?: UserRole,
    lang: UserLangType = 'ua',
  ): Promise<UserRole> {
    if (actorId) {
      const actor = await this.userRepo.findOne({
        where: { id: actorId },
        select: ['id', 'role'],
      });

      if (!actor) {
        throw new ForbiddenException(USERS_I18N[lang].accessDenied);
      }

      return actor.role;
    }

    if (fallbackRole) return fallbackRole;

    throw new ForbiddenException(USERS_I18N[lang].accessDenied);
  }

  private assertCanManageUser(
    actorRole: UserRole,
    targetRole: UserRole,
    lang: UserLangType = 'ua',
  ) {
    if (!canManageUserRole(actorRole, targetRole)) {
      throw new ForbiddenException(USERS_I18N[lang].accessDenied);
    }
  }

  private assertCanAssignRole(
    actorRole: UserRole,
    targetRole: UserRole,
    lang: UserLangType = 'ua',
  ) {
    if (!canAssignUserRole(actorRole, targetRole)) {
      throw new ForbiddenException(USERS_I18N[lang].accessDenied);
    }
  }
}
