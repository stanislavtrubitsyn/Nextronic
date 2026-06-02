import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, ObjectLiteral } from 'typeorm';
import { AuditLogEntity, AuditAction } from './audit-log.entity';

type JsonLike = string | number | boolean | null | JsonLike[] | { [key: string]: JsonLike };

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLogEntity)
    private readonly auditRepo: Repository<AuditLogEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async logAction(
    adminId: string | null | undefined,
    action: AuditAction,
    entityName: string,
    entityId: string,
    oldValues?: unknown,
    newValues?: unknown,
  ) {
    const log = this.auditRepo.create({
      admin: this.isUuid(adminId) ? { id: adminId } : null,
      action,
      entityName,
      entityId,
      oldValues: this.createSnapshot(oldValues),
      newValues: this.createSnapshot(newValues),
    });

    return await this.auditRepo.save(log);
  }

  async getRecentActivity(limit: number = 5) {
    return await this.auditRepo.find({
      relations: ['admin', 'admin.profile'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getEntityHistory(entityName: string, entityId: string) {
    return await this.auditRepo.find({
      where: { entityName, entityId },
      relations: ['admin', 'admin.profile'],
      order: { createdAt: 'DESC' },
    });
  }

  async revertChange(logId: string, adminId?: string) {
    const log = await this.auditRepo.findOne({ where: { id: logId }, relations: ['admin'] });
    if (!log) throw new NotFoundException('Лог не знайдено');

    if (log.action === AuditAction.CREATE) {
      throw new BadRequestException('Неможливо відкотити створення. Видаліть запис вручну.');
    }

    if (!this.isObjectSnapshot(log.oldValues)) {
      throw new BadRequestException('Немає попередніх даних для відкату');
    }

    const entityRepo = this.getEntityRepository(log.entityName);

    if (log.action === AuditAction.DELETE) {
      const currentEntity = await entityRepo.findOne({
        where: { id: log.entityId },
      });

      if (currentEntity) {
        throw new BadRequestException('Сутність вже існує. Відновлення неможливе.');
      }

      const restoredEntity = entityRepo.create(log.oldValues);
      const savedEntity = await entityRepo.save(restoredEntity);

      await this.logAction(
        adminId,
        AuditAction.CREATE,
        log.entityName,
        log.entityId,
        null,
        savedEntity,
      );

      return { success: true, message: 'Успішно відновлено видалений запис' };
    }

    const currentEntity = await entityRepo.findOne({
      where: { id: log.entityId },
    });

    if (!currentEntity) {
      throw new NotFoundException('Сутність вже не існує. Можливо, її було видалено.');
    }

    const oldSnapshot = this.createSnapshot(currentEntity);
    const revertedEntity = entityRepo.merge(currentEntity, log.oldValues);
    const savedEntity = await entityRepo.save(revertedEntity);

    await this.logAction(
      adminId,
      AuditAction.UPDATE,
      log.entityName,
      log.entityId,
      oldSnapshot,
      savedEntity,
    );

    return { success: true, message: 'Успішно відкочено до попередньої версії' };
  }

  private getEntityRepository(entityName: string): Repository<ObjectLiteral> {
    const metadata = this.dataSource.entityMetadatas.find(
      (item) => item.name === entityName || item.tableName === entityName,
    );

    if (!metadata) {
      throw new BadRequestException(`Сутність ${entityName} не підтримується для аудиту`);
    }

    return this.dataSource.getRepository(metadata.target);
  }

  private createSnapshot(value: unknown): JsonLike | null {
    if (value === null || value === undefined) return null;

    const snapshot = this.sanitizeValue(value, 0, new WeakSet<object>());
    return snapshot === undefined ? null : snapshot;
  }

  private sanitizeValue(
    value: unknown,
    depth: number,
    seen: WeakSet<object>,
  ): JsonLike | undefined {
    if (value === null || value === undefined) return null;

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return value;
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (Array.isArray(value)) {
      if (depth >= 5) return [];

      return value
        .map((item) => this.sanitizeValue(item, depth + 1, seen))
        .filter((item): item is JsonLike => item !== undefined);
    }

    if (typeof value === 'object') {
      if (seen.has(value)) return null;
      seen.add(value);

      const source = value as Record<string, unknown>;
      const result: Record<string, JsonLike> = {};

      for (const [key, entryValue] of Object.entries(source)) {
        if (this.shouldSkipKey(key) || typeof entryValue === 'function') continue;

        if (depth >= 5 && key !== 'id') continue;

        const sanitized = this.sanitizeValue(entryValue, depth + 1, seen);
        if (sanitized !== undefined) result[key] = sanitized;
      }

      return result;
    }

    return undefined;
  }

  private shouldSkipKey(key: string): boolean {
    return ['password', 'hashedPassword', 'refreshToken', 'accessToken'].includes(key);
  }

  private isObjectSnapshot(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }

  private isUuid(value: unknown): value is string {
    return typeof value === 'string' && UUID_REGEX.test(value);
  }
}
