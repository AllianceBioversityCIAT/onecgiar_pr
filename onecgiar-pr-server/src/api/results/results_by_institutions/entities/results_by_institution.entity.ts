import { User } from '../../../../auth/modules/user/entities/user.entity';
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
import { Version } from '../../versions/entities/version.entity';
import { Result } from '../../entities/result.entity';
import { InstitutionRole } from '../../institution_roles/entities/institution_role.entity';
import { ClarisaInstitution } from '../../../../clarisa/clarisa-institutions/entities/clarisa-institution.entity';
import { ResultsKnowledgeProductInstitution } from '../../results-knowledge-products/entities/results-knowledge-product-institution.entity';
import { ResultInstitutionsBudget } from '../../result_budget/entities/result_institutions_budget.entity';

@Entity()
export class ResultsByInstitution {
  @PrimaryGeneratedColumn({
    type: 'bigint',
  })
  id!: number;

  @Column({
    name: 'result_id',
    type: 'bigint',
    nullable: false
  })
  result_id: number;

  @ManyToOne(() => Result, (r) => r.id, { nullable: false })
  @JoinColumn({
    name: 'result_id',
  })
  obj_result: Result;

  @Column({
    name: 'institutions_id',
    type: 'int',
    nullable: true
  })
  institutions_id: number;

  @ManyToOne(() => ClarisaInstitution, (ci) => ci.id, { nullable: true })
  @JoinColumn({
    name: 'institutions_id',
  })
  obj_institutions: ClarisaInstitution;

  @Column({
    name: 'institution_roles_id',
    type: 'bigint',
    nullable: false
  })
  institution_roles_id: number;

  @ManyToOne(() => InstitutionRole, (i) => i.id, { nullable: false })
  @JoinColumn({ name: 'institution_roles_id' })
  obj_institution_roles: InstitutionRole;

  @Column({
    name: 'is_active',
    type: 'boolean',
    nullable: false,
    default: true,
  })
  is_active!: boolean;

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

  //object relations
  @OneToMany(
    () => ResultsKnowledgeProductInstitution,
    (rkpi) => rkpi.results_by_institutions_object,
  )
  result_knowledge_product_institution_array: ResultsKnowledgeProductInstitution[];

  @OneToMany(() => ResultInstitutionsBudget, rib => rib.obj_result_institution)
  obj_result_institution_array: ResultInstitutionsBudget[];
}
