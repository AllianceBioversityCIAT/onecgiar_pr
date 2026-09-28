// @akili-spec changes/progress-tracker-pull-bridge/progress-tracker-indicator-mapping
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity';
import { Result } from '../../results/entities/result.entity';

/**
 * `PTM-T-6` — one row per result created from a Progress Tracker proposal, recording where
 * it came from (`design.md` §3.1, §12 `PTM-DD-5`; `requirements.md` `PTM-R-13`, `PTM-R-14`;
 * `PTM-AC-12`).
 *
 * A dedicated table, not a column on `result` and not a parsed narrative tail (`PTM-DD-5`):
 * the grey-out and duplicate-detection follow-ups both need to query by indicator and
 * `result_key`, and parsing prose is not a foundation for that. `pt_indicator_id` is kept
 * on this row directly, even though it is also reachable by joining
 * `progress_tracker_indicator_map`, because `PTM-R-13`'s "queryable by indicator" clause
 * means *without* that join.
 *
 * `INDEX (pt_indicator_id, pt_result_key)` — created by the migration, not repeated here as
 * a TypeORM index decorator, matching the house convention of leaving schema constraints
 * to the raw-SQL migration (`P-12`).
 *
 * `result_id` is a plain `@Column` plus a separate `@ManyToOne` relation property (not a
 * `@ManyToOne` typed as the scalar id) — the pattern
 * `result-innovation-merge-split.entity.ts` documents as load-bearing after P2-3589: a
 * `@ManyToOne` typed `number` makes TypeORM treat a raw-SQL `bigint`-as-string id as a
 * nested condition on the related entity instead of a scalar comparison.
 */
@Entity('progress_tracker_result_provenance')
export class ProgressTrackerResultProvenance extends BaseEntity {
  @PrimaryGeneratedColumn({
    name: 'id',
    type: 'bigint',
  })
  id: number;

  @Column({
    name: 'result_id',
    type: 'bigint',
    nullable: false,
  })
  result_id: number;

  @ManyToOne(() => Result, (r) => r.id, { nullable: false })
  @JoinColumn({ name: 'result_id' })
  obj_result: Result;

  @Column({
    name: 'pt_result_key',
    type: 'varchar',
    length: 64,
    nullable: false,
  })
  pt_result_key: string;

  @Column({
    name: 'pt_evidence_fingerprint',
    type: 'varchar',
    length: 128,
    nullable: true,
  })
  pt_evidence_fingerprint: string | null;

  @Column({
    name: 'pt_indicator_id',
    type: 'varchar',
    length: 32,
    nullable: true,
  })
  pt_indicator_id: string | null;

  @Column({
    name: 'pt_environment',
    type: 'varchar',
    length: 16,
    nullable: true,
  })
  pt_environment: string | null;

  @Column({
    name: 'pt_model',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  pt_model: string | null;

  @Column({
    name: 'pt_generated_at',
    type: 'timestamp',
    precision: 6,
    nullable: true,
  })
  pt_generated_at: Date | null;
}
