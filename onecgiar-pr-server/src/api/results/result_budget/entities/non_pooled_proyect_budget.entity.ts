import {
  PrimaryGeneratedColumn,
  Column,
  Entity,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../../shared/entities/base-entity';
import { NonPooledProject } from '../../non-pooled-projects/entities/non-pooled-project.entity';

@Entity('non_pooled_projetct_budget')
export class NonPooledProjectBudget extends BaseEntity {
  @PrimaryGeneratedColumn({
    name: 'non_pooled_projetct_budget_id',
    type: 'bigint',
  })
  non_pooled_projetct_budget_id: number;

  @Column({
    name: 'non_pooled_projetct_id',
    type: 'bigint',
    nullable: true,
  })
  non_pooled_projetct_id: number;

  @Column({
    name: 'result_project_id',
    type: 'bigint',
    nullable: true,
  })
  result_project_id: number;

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
    name: 'kind_cash',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  kind_cash!: number;

  @Column({
    name: 'is_determined',
    type: 'boolean',
    nullable: true,
  })
  is_determined!: boolean;

  @ManyToOne(
    () => NonPooledProject,
    (npp) => npp.obj_non_pooled_projetct_budget,
  )
  @JoinColumn({
    name: 'non_pooled_projetct_id',
  })
  obj_non_pooled_projetct: NonPooledProject;
}
