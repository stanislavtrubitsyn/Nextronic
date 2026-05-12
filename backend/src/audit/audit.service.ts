import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, DeepPartial, ObjectLiteral } from 'typeorm';
import { AuditLogEntity, AuditAction } from './audit-log.entity';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLogEntity)
    private readonly auditRepo: Repository<AuditLogEntity>,
    private readonly dataSource: DataSource,
  ) {}

  // Запис дії в лог
  async logAction(
    adminId: string,
    action: AuditAction,
    entityName: string,
    entityId: string,
    oldValues?: any,
    newValues?: any,
  ) {
    const log = this.auditRepo.create({
      admin: { id: adminId },
      action,
      entityName,
      entityId,
      oldValues,
      newValues,
    });
    return await this.auditRepo.save(log);
  }

  // Отримання останніх дій
  async getRecentActivity(limit: number = 5) {
    return await this.auditRepo.find({
      relations: ['admin', 'admin.profile'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  // ІСТОРІЯ ЗМІН ДЛЯ КОНКРЕТНОГО ОБ'ЄКТА
  async getEntityHistory(entityName: string, entityId: string) {
    return await this.auditRepo.find({
      where: { entityName, entityId },
      relations: ['admin', 'admin.profile'],
      order: { createdAt: 'DESC' },
    });
  }

  // ВІДКАТ ДО ПОПЕРЕДНЬОЇ ВЕРСІЇ
  async revertChange(logId: string) {
    const log = await this.auditRepo.findOne({ where: { id: logId } });
    if (!log) throw new NotFoundException('Лог не знайдено');

    if (log.action === AuditAction.CREATE) {
      throw new BadRequestException('Неможливо відкотити створення (використовуйте видалення)');
    }

    if (!log.oldValues) {
      throw new BadRequestException('Немає попередніх даних для відкату');
    }

    // Динамічно отримуємо репозиторій сутності за її назвою
    const entityRepo = this.dataSource.getRepository(log.entityName);

    // Знаходимо поточний запис
    const currentEntity = await entityRepo.findOne({ where: { id: log.entityId } });
    if (!currentEntity) throw new NotFoundException('Сутність вже не існує');

    // Відновлюємо старі значення з правильним приведенням типів для TypeORM
    const revertedEntity = entityRepo.merge(
      currentEntity,
      log.oldValues as DeepPartial<ObjectLiteral>,
    );
    await entityRepo.save(revertedEntity);

    // Логуємо сам факт відкату
    await this.logAction(
      log.admin?.id || 'SYSTEM',
      AuditAction.UPDATE,
      log.entityName,
      log.entityId,
      currentEntity,
      revertedEntity,
    );

    return { success: true, message: 'Успішно відкочено до попередньої версії' };
  }
}
