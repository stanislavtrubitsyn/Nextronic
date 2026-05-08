import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProfilesEntity } from './profiles.entity';
import { WishlistsEntity } from '../wishlists/wishlists.entity';

export enum UserRole {
  USER = 'user',
  MODERATOR = 'moderator',
  ADMIN = 'admin',
}

@Entity('users')
export class UsersEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ unique: true, nullable: true })
  phone?: string;

  @Column({ select: false, nullable: true })
  password?: string;

  @Column({ unique: true, nullable: true, select: false })
  googleId?: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role!: UserRole;

  @OneToOne(() => ProfilesEntity, (profile) => profile.user, { cascade: true })
  profile!: ProfilesEntity;

  @OneToMany(() => WishlistsEntity, (wishlist) => wishlist.user)
  wishlists!: WishlistsEntity[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
