import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ClarisaCenter } from '../../../../clarisa/clarisa-centers/entities/clarisa-center.entity';

@Entity('intellectual_property_experts')
export class IntellectualPropertyExpert {
  @PrimaryGeneratedColumn({
    name: 'ip_expert_id',
    type: 'bigint',
  })
  ip_expert_id: number;

  @Column({
    name: 'is_active',
    type: 'boolean',
    nullable: false,
    default: true,
  })
  is_active: boolean;

  @Column({
    name: 'first_name',
    type: 'text',
    nullable: true,
  })
  first_name: string;

  @Column({
    name: 'last_name',
    type: 'text',
    nullable: true,
  })
  last_name: string;

  @Column({
    name: 'email',
    type: 'text',
    nullable: false,
  })
  email: string;

  @Column({
    name: 'center_code',
    type: 'varchar',
    length: 15,
    collation: 'utf8mb3_unicode_ci',
  })
  center_code: string;

  @ManyToOne(() => ClarisaCenter, (ci) => ci.intellectual_property_experts)
  @JoinColumn({
    name: 'center_code',
  })
  obj_center: ClarisaCenter;
}
