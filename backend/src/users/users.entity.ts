import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { ProfilesEntity } from './profiles.entity';

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

@Entity('users')
export class UsersEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ select: false, nullable: true }) // nullable для Google Auth
  password?: string;

  @Column({ unique: true, nullable: true, select: false }) // Для входу через Google
  googleId?: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role!: UserRole;

  @OneToOne(() => ProfilesEntity, (profile) => profile.user, { cascade: true })
  @JoinColumn()
  profile!: ProfilesEntity;

  @CreateDateColumn()
  createdAt!: Date;
}
