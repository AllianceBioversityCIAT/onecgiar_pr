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
import { User } from '../../../../auth/modules/user/entities/user.entity';
import { ResultsTocResult } from './results-toc-result.entity';
import { ResultIndicatorTarget } from './result-toc-result-target-indicators.entity';

@Entity('results_toc_result_indicators')
export class ResultsTocResultIndicators {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    name: 'result_toc_result_indicator_id',
  })
  result_toc_result_indicator_id: number;

  @Column({
    name: 'toc_results_indicator_id',
    type: 'text',
  })
  toc_results_indicator_id: string;

  @Column({
    name: 'results_toc_results_id',
    type: 'bigint',
  })
  results_toc_results_id!: number;

  @ManyToOne(
    () => ResultsTocResult,
    (tr) => tr.obj_results_toc_result_indicators,
    {
      nullable: true,
    },
  )
  @JoinColumn({
    name: 'results_toc_results_id',
  })
  obj_results_toc_results!: ResultsTocResult;

  @Column({
    name: 'status',
    type: 'bigint',
    nullable: true,
  })
  status: number;

  @Column({
    name: 'indicator_contributing',
    type: 'text',
    nullable: true,
  })
  indicator_contributing: string;

  @Column({
    name: 'is_active',
    type: 'boolean',
    nullable: false,
    default: true,
  })
  is_active: boolean;

  @Column({
    name: 'is_not_aplicable',
    type: 'boolean',
    nullable: false,
    default: false,
  })
  is_not_aplicable: boolean;

  @ManyToOne(() => User, (u) => u.id, { nullable: true })
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

  @OneToMany(
    () => ResultIndicatorTarget,
    (ritt) => ritt.obj_result_toc_result_indicator_id,
  )
  obj_result_indicator_targets: ResultIndicatorTarget[];
}
