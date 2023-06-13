import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Result } from '../../entities/result.entity';
import { User } from '../../../../auth/modules/user/entities/user.entity';
import { ClarisaInstitution } from '../../../../clarisa/clarisa-institutions/entities/clarisa-institution.entity';
import { ClarisaCenter } from '../../../../clarisa/clarisa-centers/entities/clarisa-center.entity';
import { Version } from '../../../versioning/entities/version.entity';
import { NonPooledProjectBudget } from '../../result_budget/entities/non_pooled_proyect_budget.entity';
import { NonPooledProjectType } from './non-pooled-project-type.entity';

@Entity('non_pooled_project')
export class NonPooledProject {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'grant_title',
    type: 'text',
    nullable: true,
    default: null,
  })
  grant_title: string;

  @Column({
    name: 'center_grant_id',
    type: 'text',
    nullable: true,
  })
  center_grant_id!: string;

  @Column({
    name: 'results_id',
    type: 'bigint',
    nullable: true,
  })
  results_id!: number;

  @ManyToOne(() => Result, (r) => r.id)
  @JoinColumn({
    name: 'results_id',
  })
  obj_results: number;

  @Column({
    name: 'lead_center_id',
    type: 'varchar',
    length: 15,
    nullable: true,
  })
  lead_center_id!: string;

  @ManyToOne(() => ClarisaCenter, (ci) => ci.code, { nullable: true })
  @JoinColumn({
    name: 'lead_center_id',
  })
  obj_lead_center!: ClarisaCenter;

  @Column({
    name: 'funder_institution_id',
    type: 'int',
    nullable: true,
  })
  funder_institution_id: number;

  @ManyToOne(() => ClarisaInstitution, (ci) => ci.id, { nullable: true })
  @JoinColumn({
    name: 'funder_institution_id',
  })
  obj_funder_institution_id!: ClarisaInstitution;

  @Column({
    name: 'is_active',
    type: 'boolean',
    nullable: false,
    default: true,
  })
  is_active: boolean;

  @ManyToOne(() => User, (u) => u.id, { nullable: false })
  @JoinColumn({
    name: 'created_by',
  })
  created_by: number;

  @CreateDateColumn({
    name: 'created_date',
    nullable: false,
    type: 'timestamp',
  })
  created_date: Date;

  @ManyToOne(() => User, (u) => u.id, { nullable: true })
  @JoinColumn({
    name: 'last_updated_by',
  })
  last_updated_by!: number;

  @UpdateDateColumn({
    name: 'last_updated_date',
    type: 'timestamp',
    nullable: true,
  })
  last_updated_date!: Date;

  @Column({
    name: 'version_id',
    type: 'bigint',
    nullable: true,
  })
  version_id: number;

  @ManyToOne(() => Version, (v) => v.non_pooled_project)
  @JoinColumn({
    name: 'version_id',
  })
  obj_version: Version;

  @Column({
    name: 'non_pooled_project_type_id',
    type: 'bigint',
    nullable: true,
  })
  non_pooled_project_type_id: number;

  @ManyToOne(
    () => NonPooledProjectType,
    (nppt) => nppt.non_pooled_project_type_id,
  )
  @JoinColumn({
    name: 'non_pooled_project_type_id',
  })
  non_pooled_project_type: NonPooledProjectType;

  @OneToMany(
    () => NonPooledProjectBudget,
    (nppb) => nppb.obj_non_pooled_projetct,
  )
  obj_non_pooled_projetct_budget: NonPooledProjectBudget[];
}
