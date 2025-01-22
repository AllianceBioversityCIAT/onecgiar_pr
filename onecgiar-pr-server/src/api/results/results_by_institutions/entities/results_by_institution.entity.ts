import { User } from '../../../../auth/modules/user/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Result } from '../../entities/result.entity';
import { InstitutionRole } from '../../institution_roles/entities/institution_role.entity';
import { ClarisaInstitution } from '../../../../clarisa/clarisa-institutions/entities/clarisa-institution.entity';
import { ResultsKnowledgeProductInstitution } from '../../results-knowledge-products/entities/results-knowledge-product-institution.entity';
import { ResultInstitutionsBudget } from '../../result_budget/entities/result_institutions_budget.entity';
import { ResultByInstitutionsByDeliveriesType } from '../../result-by-institutions-by-deliveries-type/entities/result-by-institutions-by-deliveries-type.entity';

@Entity()
export class ResultsByInstitution {
  @PrimaryGeneratedColumn({
    type: 'bigint',
  })
  id!: number;

  @Column({
    name: 'is_active',
    type: 'boolean',
    nullable: false,
    default: true,
  })
  is_active!: boolean;

  @Column({
    name: 'is_predicted',
    type: 'boolean',
    nullable: false,
    default: false,
  })
  is_predicted!: boolean;

  // audit fields

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
  created_date!: Date;

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

  @Column({ name: 'is_leading_result', type: 'boolean', nullable: true })
  is_leading_result: boolean;

  // relations

  @Column({
    name: 'result_id',
    type: 'bigint',
    nullable: false,
  })
  result_id: number;

  @Column({
    name: 'institutions_id',
    type: 'int',
    nullable: true,
  })
  institutions_id: number;

  @Column({
    name: 'institution_roles_id',
    type: 'bigint',
    nullable: false,
  })
  institution_roles_id: number;

  @Column({
    name: 'result_kp_mqap_institution_id',
    type: 'bigint',
    nullable: true,
    default: null,
  })
  result_kp_mqap_institution_id: number;

  // relation objects

  @ManyToOne(() => Result, (r) => r.result_by_institution_array)
  @JoinColumn({
    name: 'result_id',
  })
  obj_result: Result;

  @ManyToOne(() => InstitutionRole, (i) => i.id, { nullable: false })
  @JoinColumn({ name: 'institution_roles_id' })
  obj_institution_roles: InstitutionRole;

  @ManyToOne(() => ClarisaInstitution, (ci) => ci.id, { nullable: true })
  @JoinColumn({
    name: 'institutions_id',
  })
  obj_institutions: ClarisaInstitution;

  @OneToOne(
    () => ResultsKnowledgeProductInstitution,
    (rkpi) => rkpi.result_by_institution_object,
    { nullable: true },
  )
  @JoinColumn({
    name: 'result_kp_mqap_institution_id',
  })
  result_kp_mqap_institution_object: ResultsKnowledgeProductInstitution;

  @OneToMany(
    () => ResultByInstitutionsByDeliveriesType,
    (rib) => rib.obj_result_by_institution,
  )
  delivery: ResultByInstitutionsByDeliveriesType[];

  @OneToMany(
    () => ResultInstitutionsBudget,
    (rib) => rib.obj_result_institution,
  )
  result_institution_budget_array: ResultInstitutionsBudget[];
}
