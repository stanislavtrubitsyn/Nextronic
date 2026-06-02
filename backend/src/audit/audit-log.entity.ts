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
  admin?: UsersEntity | null;

  @Column({ type: 'enum', enum: AuditAction })
  action!: AuditAction;

  @Column()
  entityName!: string;

  @Column('uuid')
  entityId!: string;

  @Column({ type: 'jsonb', nullable: true })
  oldValues?: unknown;

  @Column({ type: 'jsonb', nullable: true })
  newValues?: unknown;

  @CreateDateColumn()
  createdAt!: Date;
}
