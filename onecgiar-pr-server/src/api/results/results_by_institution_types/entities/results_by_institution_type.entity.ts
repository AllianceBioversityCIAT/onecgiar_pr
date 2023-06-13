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
import { InstitutionRole } from '../../institution_roles/entities/institution_role.entity';
import { Version } from '../../../versioning/entities/version.entity';
import { Result } from '../../entities/result.entity';
import { ClarisaInstitutionsType } from '../../../../clarisa/clarisa-institutions-type/entities/clarisa-institutions-type.entity';

@Entity()
export class ResultsByInstitutionType {
  @PrimaryGeneratedColumn({
    type: 'bigint',
  })
  id: number;

  @Column({
    name: 'results_id',
    type: 'bigint',
    nullable: false,
  })
  results_id: number;

  @ManyToOne(() => Result, (r) => r.id, { nullable: false })
  @JoinColumn({
    name: 'results_id',
  })
  obj_results: Result;

  @Column({
    name: 'institution_types_id',
    type: 'int',
    nullable: true,
  })
  institution_types_id: number;

  @ManyToOne(() => ClarisaInstitutionsType, (cit) => cit.code, {
    nullable: true,
  })
  @JoinColumn({
    name: 'institution_types_id',
  })
  obj_institution_types!: ClarisaInstitutionsType;

  @Column({
    name: 'institution_roles_id',
    type: 'bigint',
    nullable: false,
  })
  institution_roles_id: number;

  @ManyToOne(() => InstitutionRole, (ir) => ir.id, { nullable: false })
  @JoinColumn({
    name: 'institution_roles_id',
  })
  obj_institution_roles: InstitutionRole;

  @Column({
    name: 'is_active',
    type: 'boolean',
    nullable: false,
    default: true,
  })
  is_active: boolean;

  @Column({
    name: 'how_many',
    type: 'bigint',
    nullable: true,
  })
  how_many!: number;

  @Column({
    name: 'other_institution',
    type: 'text',
    nullable: true,
  })
  other_institution!: string;

  @Column({
    name: 'graduate_students',
    type: 'bigint',
    nullable: true,
  })
  graduate_students!: number;

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
    name: 'creation_date',
    nullable: false,
    type: 'timestamp',
  })
  creation_date: Date;

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
