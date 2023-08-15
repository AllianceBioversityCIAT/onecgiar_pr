import {
  PrimaryGeneratedColumn,
  Column,
  Entity,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../../shared/entities/base-entity';
import { BaseBudget } from './base-budget';
import { ResultsByInititiative } from '../../results_by_inititiatives/entities/results_by_inititiative.entity';
import { Version } from '../../../versioning/entities/version.entity';

@Entity('result_initiative_budget')
export class ResultInitiativeBudget extends BaseEntity {
  @PrimaryGeneratedColumn({
    name: 'result_initiative_budget_id',
    type: 'bigint',
  })
  result_initiative_budget_id: number;

  @Column({
    name: 'result_initiative_id',
    type: 'bigint',
    nullable: false,
  })
  result_initiative_id: number;

  @Column({
    name: 'current_year',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  current_year!: number;

  @Column({
    name: 'next_year',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  next_year!: number;

  @Column({
    name: 'is_determined',
    type: 'boolean',
    nullable: true,
  })
  is_determined!: boolean;

  @ManyToOne(
    () => ResultsByInititiative,
    (rbi) => rbi.obj_result_initiative_array,
  )
  @JoinColumn({
    name: 'result_initiative_id',
  })
  obj_result_initiative: ResultsByInititiative;
}
