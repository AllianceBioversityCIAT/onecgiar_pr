// @akili-spec changes/progress-tracker-pull-bridge/progress-tracker-indicator-mapping
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity';
import { Version } from '../../versioning/entities/version.entity';

/**
 * `PTM-T-1` — one row per (ToC indicator, reporting version), mapping it to the
 * Progress Tracker's own `indicator_id` (`design.md` §3.1, §12 `PTM-DD-2`;
 * `requirements.md` `PTM-R-9`).
 *
 * Keyed on `version_id`, never `phase_year` (`P-4`): two `version` rows can share a
 * `phase_year` with different ToC phase ids, so a year-keyed table would silently
 * collide. `result` itself keys on `version_id` (`result.entity.ts:266-271`).
 *
 * Both `toc_results_indicator_id` (the Integration `related_node_id` string) and
 * `toc_indicator_integration_id` (the Integration primary key) are kept on purpose —
 * which one the runtime lookup (`PTM-T-3`) joins on is that task's decision, not this
 * migration's (`design.md` §14 watch item).
 *
 * `UNIQUE (toc_results_indicator_id(255), version_id, center)` — one row per center,
 * since PT keeps one KPI per (indicator, center). Created by the migrations
 * (`1791400000000-ProgressTrackerIndicatorMapCenter`), not repeated here as a TypeORM
 * index decorator, matching the house convention of leaving schema constraints to the
 * raw-SQL migration (`P-12`).
 */
@Entity('progress_tracker_indicator_map')
export class ProgressTrackerIndicatorMap extends BaseEntity {
  @PrimaryGeneratedColumn({
    name: 'id',
    type: 'bigint',
  })
  id: number;

  @Column({
    name: 'toc_results_indicator_id',
    type: 'text',
    nullable: false,
  })
  toc_results_indicator_id: string;

  @Column({
    name: 'toc_indicator_integration_id',
    type: 'bigint',
    nullable: true,
  })
  toc_indicator_integration_id: number | null;

  @Column({
    name: 'version_id',
    type: 'bigint',
    nullable: false,
  })
  version_id: number;

  @ManyToOne(() => Version, (v) => v.id)
  @JoinColumn({ name: 'version_id' })
  obj_version: Version;

  /**
   * PRMS-side center acronym (`clarisa_institutions.acronym`), **not** the PT spelling —
   * the runtime lookup keys on what PRMS holds. `''` when the indicator has no center
   * target. The normalized PT name is only sent on the wire (`toPtCenterName`).
   */
  @Column({
    name: 'center',
    type: 'varchar',
    length: 64,
    nullable: false,
    default: '',
  })
  center: string;

  /** The ToC indicator's `type_value`. */
  @Column({
    name: 'kpi_type',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  kpi_type: string | null;

  /** True for a weak fuzzy match, near-tied candidates the center cannot split, or no match at all. */
  @Column({
    name: 'needs_review',
    type: 'boolean',
    nullable: false,
    default: false,
  })
  needs_review: boolean;

  @Column({
    name: 'pt_indicator_id',
    type: 'varchar',
    length: 32,
    nullable: true,
  })
  pt_indicator_id: string | null;

  @Column({
    name: 'pt_program_id',
    type: 'varchar',
    length: 32,
    nullable: true,
  })
  pt_program_id: string | null;

  @Column({
    name: 'match_quality',
    type: 'varchar',
    length: 16,
    nullable: false,
  })
  match_quality: string;

  @Column({
    name: 'match_score',
    type: 'decimal',
    precision: 5,
    scale: 4,
    nullable: true,
  })
  match_score: number | null;

  @Column({
    name: 'resolved_at',
    type: 'timestamp',
    precision: 6,
    nullable: true,
  })
  resolved_at: Date | null;
}
