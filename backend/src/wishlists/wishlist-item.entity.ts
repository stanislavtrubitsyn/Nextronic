import { Entity, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn } from 'typeorm';
import { WishlistsEntity } from './wishlists.entity';
import { ProductsEntity } from '../products/products.entity';

@Entity('wishlist_items')
export class WishlistItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => WishlistsEntity, (wishlist) => wishlist.items, { onDelete: 'CASCADE' })
  wishlist!: WishlistsEntity;

  @ManyToOne(() => ProductsEntity, { onDelete: 'CASCADE' })
  product!: ProductsEntity;

  @CreateDateColumn()
  createdAt!: Date;
}
