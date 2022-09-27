import { Auditable } from '../../../../shared/entities/auditableEntity';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { RoleLevel } from '../../role-levels/entities/role-level.entity';

@Entity('role')
export class Role extends Auditable {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'description',
    type: 'text',
  })
  description: string;

  @ManyToOne(() => RoleLevel, (rl) => rl.id)
  @JoinColumn({
    name: 'role_level_id'
  })
  role_level: number;

  @Column({
    name: 'active',
    type: 'boolean',
    default: true,
  })
  active: boolean;

}
