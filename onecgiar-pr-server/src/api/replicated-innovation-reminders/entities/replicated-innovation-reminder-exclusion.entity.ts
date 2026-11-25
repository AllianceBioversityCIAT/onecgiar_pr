// @akili-spec changes/rir-breeding-exclusion
import { Column, Entity, PrimaryColumn } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity';

/**
 * `RBX-T-2` — results that never receive a replicated-innovation reminder (`RBX-R-1`,
 * `RBX-DD-2`; SR-167303: SP01 breeding lines and varieties updated by the B4T MELIA focal point).
 *
 * Keyed by `result_code`, not `result.id`: the code is stable across phases (replication keeps
 * it), so one entry covers every phase's copy of the result. It is the primary key, so the seed is
 * idempotent and the selection's `NOT EXISTS` lookup is indexed. There is no foreign key:
 * `result_code` is not unique in `result` (one row per phase). `is_active` (from `BaseEntity`) is
 * the active flag; an inactive entry does not exclude.
 *
 * Read only by raw SQL (`PendingInnovationRepository.findPending`), so no repository is injected
 * and the module does not list it in `TypeOrmModule.forFeature`. The entity is still discovered:
 * `config/orm.config.ts` globs `api/**\/*.entity.ts`, like the campaign and log entities.
 *
 * Schema is created by `1793600000000-RIR-BreedingExclusionCopyV3`.
 */
@Entity('replicated_innovation_reminder_exclusion')
export class ReplicatedInnovationReminderExclusion extends BaseEntity {
  @PrimaryColumn({ name: 'result_code', type: 'bigint' })
  result_code: number;

  @Column({ name: 'reason', type: 'varchar', length: 255, nullable: true })
  reason: string | null;
}
