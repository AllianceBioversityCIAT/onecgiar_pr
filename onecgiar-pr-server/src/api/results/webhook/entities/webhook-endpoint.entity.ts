import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Who a delivery can be addressed to (P2-3166, AC3).
 *
 * Ticket AC3 reads "the specific external center **or** platform from which the result was
 * originally created/submitted" — two different things in our model. Phase 1 made only PLATFORM
 * resolvable, from the CLARISA API key. CENTER exists so that if product decides centre-authored
 * bilateral results are also notified, it is a matter of inserting rows.
 */
export enum WebhookRecipientType {
  /** A MIS registered in CLARISA, identified by `result.external_platform_id` (= `mis.id`). */
  PLATFORM = 'PLATFORM',
  /** A CGIAR centre, derived from the result's lead centre. Unused until product confirms. */
  CENTER = 'CENTER',
}

@Entity('webhook_endpoint')
export class WebhookEndpoint {
  @PrimaryGeneratedColumn({ name: 'id', type: 'int' })
  id: number;

  @Column({ name: 'recipient_type', type: 'varchar', length: 20 })
  recipient_type: WebhookRecipientType;

  /** `mis.id` for PLATFORM, CLARISA centre id for CENTER. */
  @Column({ name: 'recipient_id', type: 'int' })
  recipient_id: number;

  /**
   * Denormalised so the AC5 alert can name the recipient without quoting `url`. Keeping it here
   * rather than joining at alert time means the failure path has one fewer thing that can fail.
   */
  @Column({
    name: 'recipient_acronym',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  recipient_acronym: string | null;

  /** Never log this, in full or in part — `docs/prd.md` AC-9 and `.cursorrules`. */
  @Column({ name: 'url', type: 'varchar', length: 500 })
  url: string;

  /** HMAC-SHA256 key for the signature header. Never log this either. */
  @Column({ name: 'secret', type: 'varchar', length: 255, nullable: true })
  secret: string | null;

  @Column({ name: 'is_active', type: 'tinyint', default: 1 })
  is_active: boolean;

  @CreateDateColumn({ name: 'created_date', type: 'timestamp' })
  created_date: Date;

  @UpdateDateColumn({ name: 'last_updated_date', type: 'timestamp' })
  last_updated_date: Date;
}
