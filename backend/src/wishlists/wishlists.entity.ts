import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
} from 'typeorm';
import { UsersEntity } from '../users/users.entity';
import { WishlistItemEntity } from './wishlist-item.entity';

@Entity('wishlists')
export class WishlistsEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ default: 'Wishlist' })
  name!: string;

  @ManyToOne(() => UsersEntity, { onDelete: 'CASCADE' })
  user!: UsersEntity;

  @OneToMany(() => WishlistItemEntity, (item) => item.wishlist, { cascade: true })
  items!: WishlistItemEntity[];

  @CreateDateColumn()
  createdAt!: Date;
}
