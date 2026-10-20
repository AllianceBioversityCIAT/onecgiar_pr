// @akili-spec changes/replicated-innovation-reminders
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity';
import { Version } from '../../versioning/entities/version.entity';

/** Which of the two reminders a campaign sends (`RIR-R-5`). */
export enum ReplicatedReminderKind {
  Q4_NOTICE = 'Q4_NOTICE',
  FINAL_REMINDER = 'FINAL_REMINDER',
}

/**
 * Lifecycle of one campaign (`RIR-R-5`, design §3.1).
 *
 * SENDING is the claim, not a cosmetic state: the dispatcher moves a campaign into it with a single
 * `UPDATE ... WHERE status IN (PENDING, FAILED)` before it reads or sends anything, so two PROD
 * servers (and Send now overlapping the cron) cannot both own the same dispatch (`RIR-R-8`).
 */
export enum ReplicatedReminderStatus {
  /** Scheduled, waiting for its date or for Send now. Editable and cancellable. */
  PENDING = 'PENDING',
  /** Claimed by a dispatch. In flight, or abandoned by a crash (`claimed_at` releases it). */
  SENDING = 'SENDING',
  /** Dispatched with no failed digest. Terminal and frozen. */
  SENT = 'SENT',
  /** Dispatched with at least one failed digest, or refused. A retry re-claims it. */
  FAILED = 'FAILED',
  /** Cancelled by an admin while still PENDING. Terminal. */
  CANCELLED = 'CANCELLED',
}

/**
 * `RIR-T-1` — one scheduled reminder for one reporting phase (design §3.1).
 *
 * "At most one non-cancelled campaign per kind per phase" (`RIR-R-5`) is enforced by the service, not
 * here: MySQL has no partial unique index, so a UNIQUE (`version_id`, `kind`) would also block
 * re-creating a kind after cancelling it. The accepted race is recorded in design §13.
 *
 * All instants are **UTC** (`scheduled_at`, `claimed_at`, `sent_at`) and stored as `datetime`, so
 * the column carries no session-time-zone conversion. The client converts for display.
 *
 * Schema is created by `1791500000000-RIR-CreateReminderTables`; the index below mirrors the one
 * created there so a schema diff stays empty.
 */
@Entity('replicated_innovation_reminder_campaign')
@Index('IDX_rir_campaign_status_scheduled', ['status', 'scheduled_at'])
export class ReplicatedInnovationReminderCampaign extends BaseEntity {
  @PrimaryGeneratedColumn({ name: 'id', type: 'bigint' })
  id: number;

  /** The phase. Keyed on `version_id`, never `phase_year` (two versions can share a year). */
  @Column({ name: 'version_id', type: 'bigint', nullable: false })
  version_id: number;

  @ManyToOne(() => Version, { nullable: false })
  @JoinColumn({
    name: 'version_id',
    foreignKeyConstraintName: 'FK_rir_campaign_version',
  })
  obj_version: Version;

  @Column({ name: 'kind', type: 'varchar', length: 20, nullable: false })
  kind: ReplicatedReminderKind;

  /** UTC. The hourly cron dispatches campaigns that are PENDING with `scheduled_at <= UTC now`. */
  @Column({ name: 'scheduled_at', type: 'datetime', nullable: false })
  scheduled_at: Date;

  @Column({
    name: 'status',
    type: 'varchar',
    length: 20,
    nullable: false,
    default: ReplicatedReminderStatus.PENDING,
  })
  status: ReplicatedReminderStatus;

  /** UTC. Stamped by the claim; a SENDING campaign older than `rir_stale_sending_minutes` is released. */
  @Column({ name: 'claimed_at', type: 'datetime', nullable: true })
  claimed_at: Date | null;

  /** UTC. Stamped when the dispatch ends (SENT or FAILED). */
  @Column({ name: 'sent_at', type: 'datetime', nullable: true })
  sent_at: Date | null;

  @Column({ name: 'sent_count', type: 'int', nullable: false, default: 0 })
  sent_count: number;

  /** Digests skipped because the log already holds (campaign, recipient): the `RIR-R-8` retry guard. */
  @Column({ name: 'skipped_count', type: 'int', nullable: false, default: 0 })
  skipped_count: number;

  @Column({ name: 'failed_count', type: 'int', nullable: false, default: 0 })
  failed_count: number;

  /** Pending results whose lead cannot be emailed (`RIR-R-4`). A count of results, not of leads. */
  @Column({
    name: 'unreachable_count',
    type: 'int',
    nullable: false,
    default: 0,
  })
  unreachable_count: number;

  /**
   * A short message only. Never an address, a name, a body or a URL: it is read back by admins and
   * the AC-9 / `.cursorrules` ban on PII in output applies.
   */
  @Column({ name: 'last_error', type: 'varchar', length: 500, nullable: true })
  last_error: string | null;
}
