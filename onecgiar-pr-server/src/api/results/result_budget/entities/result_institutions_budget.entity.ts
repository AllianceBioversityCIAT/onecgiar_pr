import {
  PrimaryGeneratedColumn,
  Column,
  Entity,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../../shared/entities/base-entity';
import { ResultsByInstitution } from '../../results_by_institutions/entities/results_by_institution.entity';
import { Version } from '../../../versioning/entities/version.entity';

@Entity('result_institutions_budget')
export class ResultInstitutionsBudget extends BaseEntity {
  @PrimaryGeneratedColumn({
    name: 'result_institutions_budget_id',
    type: 'bigint',
  })
  result_institutions_budget_id: number;

  @Column({
    name: 'result_institution_id',
    type: 'bigint',
    nullable: false,
  })
  result_institution_id: number;

  @Column({
    name: 'in_kind',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  in_kind!: number;

  @Column({
    name: 'in_cash',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  in_cash!: number;

  @Column({
    name: 'is_determined',
    type: 'boolean',
    nullable: true,
  })
  is_determined!: boolean;

  @ManyToOne(
    () => ResultsByInstitution,
    (rbi) => rbi.obj_result_institution_array,
  )
  @JoinColumn({
    name: 'result_institution_id',
  })
  obj_result_institution: ResultsByInstitution;

  @ManyToOne(() => Version, (v) => v.id)
  @JoinColumn({
    name: 'version_id',
  })
  obj_version: Version;
}
