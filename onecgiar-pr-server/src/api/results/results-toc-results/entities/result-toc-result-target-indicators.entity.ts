import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BaseEntity } from '../../../../shared/entities/base-entity';
import { ResultsTocResultIndicators } from './results-toc-results-indicators.entity';

@Entity('result_indicators_targets')
export class ResultIndicatorTarget extends BaseEntity {
  @PrimaryGeneratedColumn()
  indicators_targets: number;

  @Column({
    type: 'bigint',
    name: 'number_target',
  })
  number_target: number;

  @Column({
    type: 'bigint',
    name: 'result_toc_result_indicator_id',
  })
  result_toc_result_indicator_id: number;

  @Column({
    type: 'decimal',
    precision: 9,
    scale: 2,
    name: 'contributing_indicator',
    nullable: true,
  })
  contributing_indicator: number;

  @Column({
    type: 'boolean',
    name: 'indicator_question',
    nullable: true,
  })
  indicator_question: boolean;

  @Column({
    type: 'text',
    name: 'target_progress_narrative',
    nullable: true,
  })
  target_progress_narrative: string;

  @Column({
    type: 'int',
    name: 'target_date',
    nullable: true,
  })
  target_date: number | null;

  @ManyToOne(
    () => ResultsTocResultIndicators,
    (cs) => cs.obj_result_indicator_targets,
    { nullable: true },
  )
  @JoinColumn({
    name: 'result_toc_result_indicator_id',
  })
  obj_result_toc_result_indicator_id: ResultsTocResultIndicators;
}
