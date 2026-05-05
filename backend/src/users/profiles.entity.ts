import { Entity, Column, PrimaryGeneratedColumn, OneToOne } from 'typeorm';
import { UsersEntity } from './users.entity';

@Entity('profiles')
export class ProfilesEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ nullable: true })
  firstName?: string;

  @Column({ nullable: true })
  lastName?: string;

  @Column({ nullable: true })
  middleName?: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  phone?: string;

  @OneToOne(() => UsersEntity, (user) => user.profile)
  user!: UsersEntity;
}
