import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Role } from '../../role/entities/role.entity';

@Entity('roles_user_by_aplication')
export class RolesUserByAplication {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.id)
  @JoinColumn({ name: 'user_id' })
  user_id: number;

  @ManyToOne(() => Role, (role) => role.id)
  @JoinColumn({ name: 'role_id' })
  role_id: number;

  @Column({
    name: 'active',
    type: 'boolean',
    default: true,
  })
  active: boolean;
}
