import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BaseEntity } from '../../../../shared/entities/base-entity';
import { ResultsTocResult } from './results-toc-result.entity';

@Entity('result_toc_action_area')
export class ResultTocActionArea extends BaseEntity {
  @PrimaryGeneratedColumn()
  result_toc_action_area: number;

  @Column({
    type: 'bigint',
    name: 'result_toc_result_id',
  })
  result_toc_result_id: number;

  @Column({
    type: 'bigint',
    name: 'action_area_outcome',
  })
  action_area_outcome: number;

  @ManyToOne(() => ResultsTocResult, (tr) => tr.result_toc_result_id, {
    nullable: true,
  })
  @JoinColumn({
    name: 'result_toc_result_id',
  })
  results_toc_results!: ResultsTocResult;
}
