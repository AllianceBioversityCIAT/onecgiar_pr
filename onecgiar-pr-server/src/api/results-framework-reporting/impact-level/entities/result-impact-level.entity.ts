import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../../../auth/modules/user/entities/user.entity';
import { Result } from '../../../results/entities/result.entity';
import { ImpactStudyType } from './impact-study-type.entity';

/**
 * IRS-R-4 / IRS-R-5 — "Impact level info" of an impact result (level 1 / type 9): study type,
 * CGIAR contribution statement and the "already reported in PRMS" answer. 1:1 with `result`
 * (unique `result_id`), created lazily on the first save of the section (design §3.1).
 *
 * Audit columns follow `ResultScalingStudyUrl`: `created_by` / `last_updated_by` are `int` because
 * they are real foreign keys to `users.id` (an `int`), which a `bigint` column could not reference.
 */
@Entity('results_impact_level')
@Unique('UQ_results_impact_level_result', ['result_id'])
export class ResultImpactLevel {
  @PrimaryGeneratedColumn({ name: 'id', type: 'bigint' })
  id: number;

  @Column({ name: 'result_id', type: 'bigint', nullable: false })
  result_id: number;

  @ManyToOne(() => Result, { nullable: false })
  @JoinColumn({
    name: 'result_id',
    foreignKeyConstraintName: 'FK_results_impact_level_result',
  })
  obj_result: Result;

  @Column({ name: 'impact_study_type_id', type: 'int', nullable: true })
  impact_study_type_id: number | null;

  @ManyToOne(() => ImpactStudyType, { nullable: true })
  @JoinColumn({
    name: 'impact_study_type_id',
    foreignKeyConstraintName: 'FK_results_impact_level_study_type',
  })
  obj_impact_study_type: ImpactStudyType;

  @Column({ name: 'cgiar_contribution', type: 'text', nullable: true })
  cgiar_contribution: string | null;

  @Column({ name: 'previously_reported', type: 'boolean', nullable: true })
  previously_reported: boolean | null;

  @Column({
    name: 'is_active',
    type: 'boolean',
    nullable: false,
    default: true,
  })
  is_active: boolean;

  @CreateDateColumn({
    name: 'created_date',
    type: 'timestamp',
    nullable: false,
  })
  created_date: Date;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  created_by!: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({
    name: 'created_by',
    foreignKeyConstraintName: 'FK_results_impact_level_created_by',
  })
  created_by_user?: User;

  @UpdateDateColumn({
    name: 'last_updated_date',
    type: 'timestamp',
    nullable: true,
  })
  last_updated_date!: Date;

  @Column({ name: 'last_updated_by', type: 'int', nullable: true })
  last_updated_by!: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({
    name: 'last_updated_by',
    foreignKeyConstraintName: 'FK_results_impact_level_updated_by',
  })
  last_updated_by_user?: User;
}
