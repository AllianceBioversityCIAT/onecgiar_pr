import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { RolesUserByAplication } from '../../roles-user-by-aplication/entities/roles-user-by-aplication.entity';

@Entity('role')
export class Role {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'description',
    type: 'text',
  })
  description: string;

  @Column({
    name: 'scope',
    type: 'text',
  })
  scope: string;

  @Column({
    name: 'scope_id',
    type: 'int',
  })
  scope_id: number;

  @Column({
    name: 'active',
    type: 'boolean',
    default: true,
  })
  active: boolean;

  @OneToMany(() => RolesUserByAplication, (ruba) => ruba.role)
  rolesUserByAplication: RolesUserByAplication[];
}
