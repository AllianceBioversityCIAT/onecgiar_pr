import { User } from '../../../../auth/modules/user/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Version } from '../../versions/entities/version.entity';
import { Result } from '../../entities/result.entity';
import { InstitutionRole } from '../../institution_roles/entities/institution_role.entity';
import { ClarisaInstitution } from '../../../../clarisa/clarisa-institutions/entities/clarisa-institution.entity';

@Entity()
export class ResultsByInstitution {
  @PrimaryGeneratedColumn({
    type: 'bigint',
  })
  id: number;

  @ManyToOne(() => Result, (r) => r.id, { nullable: false })
  @JoinColumn({
    name: 'result_id',
  })
  result_id: number;

  @ManyToOne(() => ClarisaInstitution, ci => ci.id, { nullable: true })
  @JoinColumn({
    name: 'institutions_id'
  })
  institutions_id: number;

  @ManyToOne(() => InstitutionRole, i => i.id, { nullable: false })
  @JoinColumn({ name: 'institution_roles_id' })
  institution_roles_id: number;

  @Column({
    name: 'is_active',
    type: 'boolean',
    nullable: false,
    default: true,
  })
  is_active: boolean;

  @ManyToOne(() => Version, (v) => v.id, { nullable: false })
  @JoinColumn({
    name: 'version_id',
  })
  version_id: number;

  @ManyToOne(() => User, (u) => u.id, { nullable: false })
  @JoinColumn({
    name: 'created_by',
  })
  created_by: number;

  @CreateDateColumn({
    name: 'created_date',
    type: 'timestamp',
    nullable: false,
  })
  created_date: Date;

  @ManyToOne(() => User, (u) => u.id, { nullable: true })
  @JoinColumn({
    name: 'last_updated_by',
  })
  last_updated_by!: number;

  @UpdateDateColumn({
    name: 'last_updated_date',
    nullable: true,
    type: 'timestamp',
  })
  last_updated_date!: Date;
}
