import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Lifecycle of one outbound delivery (P2-3166, AC4).
 *
 * SENDING is not cosmetic. The dispatcher claims a row by moving it into SENDING *before* it makes
 * the HTTP call, so a second cron run overlapping the first finds nothing due and cannot send twice.
 * Every scheduled task in this repo has to be idempotent; for an outbound POST that is the only way
 * to mean it.
 */
export enum WebhookDeliveryStatus {
  /** Enqueued, waiting for the dispatcher. */
  PENDING = 'PENDING',
  /** Claimed by a dispatcher run. In flight, or abandoned mid-flight by a crash. */
  SENDING = 'SENDING',
  /** Accepted by the recipient (2xx). Terminal. */
  SENT = 'SENT',
  /** Rejected or unreachable, retry scheduled in `next_attempt_at`. */
  FAILED = 'FAILED',
  /** Retries exhausted. Terminal until someone replays it. */
  EXHAUSTED = 'EXHAUSTED',
}

@Entity('webhook_delivery')
export class WebhookDelivery {
  @PrimaryGeneratedColumn({ name: 'id', type: 'bigint' })
  id: number;

  @Column({ name: 'result_id', type: 'bigint' })
  result_id: number;

  /**
   * Resolved once, at enqueue time. Deliberately not re-resolved at send time: a configuration
   * change between the decision and the delivery must not silently redirect a queued payload.
   */
  @Column({ name: 'endpoint_id', type: 'int' })
  endpoint_id: number;

  /** `APPROVE` / `REJECT` — mirrors `ReviewDecisionEnum`, the event being reported. */
  @Column({ name: 'decision', type: 'varchar', length: 10 })
  decision: string;

  /**
   * The exact body that was sent, stored at send time rather than at enqueue time. Two reasons: the
   * payload then reflects the result as it actually went out, and a retry can replay identical bytes
   * instead of re-deriving them.
   */
  @Column({ name: 'payload', type: 'json', nullable: true })
  payload: Record<string, unknown> | null;

  @Column({
    name: 'status',
    type: 'varchar',
    length: 20,
    default: WebhookDeliveryStatus.PENDING,
  })
  status: WebhookDeliveryStatus;

  @Column({ name: 'attempts', type: 'int', default: 0 })
  attempts: number;

  @Column({ name: 'last_http_status', type: 'int', nullable: true })
  last_http_status: number | null;

  /**
   * Failure message only. Whatever is written here must never contain the destination URL — it is
   * read back by support and quoted in the AC5 alert (`docs/prd.md` AC-9).
   */
  @Column({ name: 'last_error', type: 'text', nullable: true })
  last_error: string | null;

  @Column({ name: 'next_attempt_at', type: 'timestamp', nullable: true })
  next_attempt_at: Date | null;

  /** Stamped when the AC5 alert goes out, so it goes out once and not once per cron tick. */
  @Column({ name: 'alerted_at', type: 'timestamp', nullable: true })
  alerted_at: Date | null;

  @CreateDateColumn({ name: 'created_date', type: 'timestamp' })
  created_date: Date;

  @UpdateDateColumn({ name: 'last_updated_date', type: 'timestamp' })
  last_updated_date: Date;
}
