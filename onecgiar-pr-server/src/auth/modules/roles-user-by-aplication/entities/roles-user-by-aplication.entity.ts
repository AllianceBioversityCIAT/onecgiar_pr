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

  @ManyToOne(() => User, (user) => user.rolesUserByAplication)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Role, (role) => role.rolesUserByAplication)
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @Column({
    name: 'active',
    type: 'boolean',
    default: true,
  })
  active: boolean;
}
