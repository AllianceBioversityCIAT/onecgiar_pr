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

  /**
   * 🛑 P2-3589 — these two are `@Column`s, NOT `@ManyToOne` relations, and that is load-bearing.
   *
   * They were declared as `@ManyToOne(() => Result, ...)` typed `number`, which made TypeORM read
   * `where: { origin_result_id: <id> }` as a nested condition on the RELATED entity rather than as
   * a scalar comparison. `replaceForResult` passes `result.id`, which arrives from raw SQL where
   * mysql2 returns `bigint` as a STRING — so TypeORM walked the string's own keys and answered
   * `Property "0" was not found in "Result"`.
   *
   * The blast radius was the whole section: `replaceForResult` is called on BOTH branches of the
   * discontinuation save, so every Innovation Development and Innovation Use result failed to save
   * General Information with a 500, discontinued or not. Other result types were unaffected because
   * they never enter that block. Measured on prtest 4 Sep 2026: type 1 saved 200 while type 7 failed.
   *
   * The relations live below as their own properties, which is the convention the rest of the
   * schema follows (`Result.version_id` + `Result.obj_version`).
   */
  @Column({
    name: 'origin_result_id',
    type: 'bigint',
    nullable: false,
  })
  origin_result_id: number;

  @ManyToOne(() => Result, (r) => r.id, { nullable: false })
  @JoinColumn({ name: 'origin_result_id' })
  obj_origin_result: Result;

  @Column({
    name: 'target_result_id',
    type: 'bigint',
    nullable: false,
  })
  target_result_id: number;

  @ManyToOne(() => Result, (r) => r.id, { nullable: false })
  @JoinColumn({ name: 'target_result_id' })
  obj_target_result: Result;

  @Column({
    name: 'transition_type',
    type: 'varchar',
    length: 10,
    nullable: false,
  })
  transition_type: InnovationTransitionType;
}
