import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { RolesUserByAplication } from '../../roles-user-by-aplication/entities/roles-user-by-aplication.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'first_name', type: 'text' })
  first_name: string;

  @Column({ name: 'last_name', type: 'text' })
  last_name: string;

  @Column({ name: 'email', type: 'text' })
  email: string;

  @Column({
    name: 'active',
    type: 'boolean',
    default: true,
  })
  active: boolean;

  @OneToMany(() => RolesUserByAplication, (ruba) => ruba.user)
  rolesUserByAplication: RolesUserByAplication[];
}
