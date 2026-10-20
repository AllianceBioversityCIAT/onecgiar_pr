// @akili-spec changes/replicated-innovation-reminders
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ReplicatedInnovationReminderCampaign } from './replicated-innovation-reminder-campaign.entity';

/**
 * `RIR-T-1` — one row per digest actually attempted for a campaign (design §3.1, `RIR-DD-2`).
 *
 * The UNIQUE (`campaign_id`, `recipient_email`) is the `RIR-R-8` guard and the reason this table
 * exists: the dispatcher INSERTs the row *before* it emits, and `ER_DUP_ENTRY` means another
 * dispatch (the other PROD server, Send now, a retry) already owns that recipient, so it is
 * skipped. Exactly-once is therefore decided by the database, not by process memory.
 *
 * Deliberately not a `BaseEntity`: it is an append-only audit row with a single `created_date` and
 * no soft-delete.
 *
 * PII at rest (design §7): `recipient_email` is the *intended* lead, lower-cased and trimmed, even
 * when a non-production dispatch redirected the mail to the test address.
 */
@Entity('replicated_innovation_reminder_log')
@Index('UQ_rir_log_campaign_recipient', ['campaign_id', 'recipient_email'], {
  unique: true,
})
export class ReplicatedInnovationReminderLog {
  @PrimaryGeneratedColumn({ name: 'id', type: 'bigint' })
  id: number;

  @Column({ name: 'campaign_id', type: 'bigint', nullable: false })
  campaign_id: number;

  @ManyToOne(() => ReplicatedInnovationReminderCampaign, { nullable: false })
  @JoinColumn({
    name: 'campaign_id',
    foreignKeyConstraintName: 'FK_rir_log_campaign',
  })
  obj_campaign: ReplicatedInnovationReminderCampaign;

  /** Lower-cased, trimmed. The intended lead, even when the mail was redirected. */
  @Column({
    name: 'recipient_email',
    type: 'varchar',
    length: 150,
    nullable: false,
  })
  recipient_email: string;

  /** Comma-separated result ids listed in the digest. */
  @Column({ name: 'result_ids', type: 'text', nullable: false })
  result_ids: string;

  @Column({ name: 'cc_count', type: 'int', nullable: false, default: 0 })
  cc_count: number;

  /** True when a non-production dispatch sent this digest to the test address instead. */
  @Column({
    name: 'redirected',
    type: 'boolean',
    nullable: false,
    default: false,
  })
  redirected: boolean;

  @CreateDateColumn({ name: 'created_date', type: 'timestamp' })
  created_date: Date;
}
