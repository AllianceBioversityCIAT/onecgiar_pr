import {
  Column,
  Entity,
  OneToOne,
  PrimaryGeneratedColumn,
  JoinColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';

@Entity('complementary_data_users')
export class ComplementaryDataUser {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => User, (user) => user.id)
  @JoinColumn({ name: 'user_id' })
  user_id: number;

  @Column({
    name: 'is_cgiar',
    type: 'boolean',
  })
  is_cgiar: boolean;

  @Column({
    name: 'password',
    type: 'text',
    nullable: true,
  })
  password!: string;

  @Column({
    name: 'last_login',
    type: 'timestamp',
    nullable: true,
  })
  last_login!: Date;

  @Column({
    name: 'active',
    type: 'boolean',
    default: true,
  })
  active: boolean;
}
