import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BaseEntity } from '../../../../shared/entities/base-entity';
import { Result } from '../../entities/result.entity';

/**
 * Where a discontinued innovation continued: merged into another one, or split into several.
 *
 * One row per target, so "split into three" is three rows. See the migration
 * `1788445000000-CreateInnovationMergeSplitTable` for why this is a table of its own and not a
 * reuse of `linked_result`.
 */
export enum InnovationTransitionType {
  MERGE = 'merge',
  SPLIT = 'split',
}

@Entity('result_innovation_merge_split')
export class ResultInnovationMergeSplit extends BaseEntity {
  @PrimaryGeneratedColumn({
    name: 'result_innovation_merge_split_id',
    type: 'bigint',
  })
  result_innovation_merge_split_id: number;

  @ManyToOne(() => Result, (r) => r.id, { nullable: false })
  @JoinColumn({ name: 'origin_result_id' })
  origin_result_id: number;

  @ManyToOne(() => Result, (r) => r.id, { nullable: false })
  @JoinColumn({ name: 'target_result_id' })
  target_result_id: number;

  @Column({
    name: 'transition_type',
    type: 'varchar',
    length: 10,
    nullable: false,
  })
  transition_type: InnovationTransitionType;
}
