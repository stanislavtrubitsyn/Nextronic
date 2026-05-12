import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn } from 'typeorm';
import { UsersEntity } from '../users/users.entity';

export enum AuditAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
}

@Entity('audit_logs')
export class AuditLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => UsersEntity, { onDelete: 'SET NULL', nullable: true })
  admin!: UsersEntity;

  @Column({ type: 'enum', enum: AuditAction })
  action!: AuditAction;

  // Назва таблиці або сутності
  @Column()
  entityName!: string;

  // ID запису, який змінили
  @Column('uuid')
  entityId!: string;

  // Стан ДО зміни
  @Column({ type: 'jsonb', nullable: true })
  oldValues?: any;

  // Стан ПІСЛЯ зміни
  @Column({ type: 'jsonb', nullable: true })
  newValues?: any;

  @CreateDateColumn()
  createdAt!: Date;
}
