import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../../../auth/modules/user/entities/user.entity';
import { Result } from '../../../results/entities/result.entity';

/**
 * IRS-R-4 / IRS-R-5 — link from an impact result to a result already in PRMS (any phase or
 * portfolio) that it builds on. One row per (`result_id`, `previous_result_id`); a removed link is
 * kept with `is_active = 0` so it can be re-activated (design §5 Save).
 */
@Entity('results_impact_previous_result')
@Unique('UQ_results_impact_previous_result_pair', [
  'result_id',
  'previous_result_id',
])
@Index('IDX_results_impact_previous_result_previous', ['previous_result_id'])
export class ResultImpactPreviousResult {
  @PrimaryGeneratedColumn({ name: 'id', type: 'bigint' })
  id: number;

  @Column({ name: 'result_id', type: 'bigint', nullable: false })
  result_id: number;

  @ManyToOne(() => Result, { nullable: false })
  @JoinColumn({
    name: 'result_id',
    foreignKeyConstraintName: 'FK_results_impact_previous_result_result',
  })
  obj_result: Result;

  @Column({ name: 'previous_result_id', type: 'bigint', nullable: false })
  previous_result_id: number;

  @ManyToOne(() => Result, { nullable: false })
  @JoinColumn({
    name: 'previous_result_id',
    foreignKeyConstraintName: 'FK_results_impact_previous_result_previous',
  })
  obj_previous_result: Result;

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
    foreignKeyConstraintName: 'FK_results_impact_previous_result_created_by',
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
    foreignKeyConstraintName: 'FK_results_impact_previous_result_updated_by',
  })
  last_updated_by_user?: User;
}
