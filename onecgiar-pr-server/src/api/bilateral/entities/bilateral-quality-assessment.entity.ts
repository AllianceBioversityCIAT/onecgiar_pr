import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Result } from '../../results/entities/result.entity';
import { User } from '../../../auth/modules/user/entities/user.entity';
import {
  QualityEvidenceItem,
  QualitySectionKey,
  QualitySectionResult,
  QualityVerdict,
} from '../services/quality-assessment/bilateral-quality-rules';

/**
 * One AI quality-assessment run against a bilateral result
 * (`design.md` §3.1, `requirements.md` BIL-QAI-R-8).
 *
 * @akili-spec bilateral/qa-ai-traffic-light (BIL-QAI-T-2)
 *
 * Rows are audit history and are never deleted or updated in place after
 * `decided_at` is stamped (AC-7 spirit) — a re-run of the assessment inserts
 * a new row rather than overwriting this one, which is why there is no
 * `is_active` and no soft-delete column: unlike `BilateralHandoffCode`
 * (throw-away auth state), every row here is kept forever as traceability
 * that travels with the result.
 *
 * `overall_verdict`, `sections` and `evidence` reuse the pure-rule types from
 * `services/quality-assessment/bilateral-quality-rules.ts` (import only —
 * that file is owned by another task and MUST NOT be edited here) so T-6/T-7
 * type against the same shapes the rules module already produces.
 *
 * `decision = 'adjusted'` is reserved but never written by this task or by
 * `submitForReview` (`BIL-QAI-DD-6`): "Make adjustments" leaves the row
 * undecided (`decision`/`decided_at` stay null) rather than being stamped —
 * an undecided row IS the "adjusted" signal.
 *
 * `created_at` is set by SQL (`default: () => 'CURRENT_TIMESTAMP'`), never by
 * a JS `Date` — mysql2 serialises a JS `Date` in the connection's local time
 * while `CURRENT_TIMESTAMP` is evaluated by MySQL itself, so a JS default
 * here would drift from every other timestamp on this row.
 *
 * `ai_status` and `degraded_reason` were added by contract v0.2
 * (`@akili-spec bilateral/qa-ai-traffic-light BIL-QAI-T-2b`, `design.md`
 * §3.1/§4.5) in a second additive migration rather than by editing `T-2`'s —
 * see `1789566953005-BilateralQualityAssessments.ts` and
 * `1789571865104-AddAiStatusToBilateralQualityAssessments.ts`.
 */
@Entity('bilateral_quality_assessments')
@Index('IDX_bilateral_quality_assessments_result_created', [
  'result_id',
  'created_at',
])
export class BilateralQualityAssessment {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  id: number;

  /** The bilateral result this assessment was run for. */
  @Index('IDX_bilateral_quality_assessments_result_id')
  @Column({ type: 'bigint' })
  result_id: number;

  @ManyToOne(() => Result, { nullable: false })
  @JoinColumn({ name: 'result_id' })
  result: Result;

  /**
   * The reporting phase the result belonged to at run time. Nullable and
   * carrying no `FOREIGN KEY` — `design.md` §3.1 lists it as a plain
   * traceability column, not a referential one.
   */
  @Column({ type: 'bigint', nullable: true })
  version_id: number | null;

  /** SHA-256 hex of the canonical payload the AI was asked to assess. */
  @Column({ type: 'char', length: 64 })
  content_hash: string;

  /** Echoes the AI quality-assessment contract version, e.g. `0.1`. */
  @Column({ type: 'varchar', length: 16 })
  contract_version: string;

  @Column({ type: 'varchar', length: 24 })
  status: BilateralQualityAssessmentStatus;

  @Column({ type: 'varchar', length: 32, nullable: true })
  unavailable_reason: BilateralQualityAssessmentUnavailableReason | null;

  /**
   * The AI's own `status` verbatim (`design.md` §3.1/§4.5, v0.2): `completed`
   * or `partial`. `null` for KP rows (`skipped_kp_rule`), for `unavailable`
   * rows that never got a usable answer, and for every pre-v0.2 row —
   * `unavailable_reason = 'ai_unavailable'` is what distinguishes an AI
   * `status: "unavailable"` from a timeout/http_error/malformed/not_configured
   * no-answer, both of which also leave this column `null`.
   */
  @Column({ type: 'varchar', length: 16, nullable: true })
  ai_status: BilateralQualityAssessmentAiStatus | null;

  /**
   * The AI's plain-language sentence for a `partial` or `unavailable` run
   * (`design.md` §4.5). Truncated to 255 on write; the client sanitises
   * before persisting so this never contains a host, URL or response body
   * (NFR *Privacy / secrets*, `BIL-QAI-AC-9`). `null` for KP rows, for every
   * pre-v0.2 row, and for a transport no-answer (`timeout`/`http_error`/
   * `malformed`/`not_configured`) — but **set** on an AI `unavailable` row,
   * where `ai_status` is `null` and `unavailable_reason` is `ai_unavailable`
   * (`design.md` §4.5 mapping table, `BIL-QAI-R-7`).
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  degraded_reason: string | null;

  @Column({ type: 'varchar', length: 8, nullable: true })
  overall_verdict: QualityVerdict | null;

  /** 0–100, stored verbatim from the AI response (`BIL-QAI-R-12`). */
  @Column({ type: 'tinyint', nullable: true })
  overall_score: number | null;

  @Column({ type: 'text', nullable: true })
  overall_summary: string | null;

  /** One entry per form section — verdict, optional score, comments, issues, strengths. */
  @Column({ type: 'json' })
  sections: Record<QualitySectionKey, QualitySectionResult>;

  /** Per-evidence verdicts, index-matched to the payload evidence list post grey-rule. */
  @Column({ type: 'json' })
  evidence: QualityEvidenceItem[];

  /** Echoed from the AI response; not this repo's contract version. */
  @Column({ type: 'varchar', length: 64, nullable: true })
  criteria_version: string | null;

  @Column({ type: 'int', nullable: true })
  elapsed_ms: number | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  decision: BilateralQualityAssessmentDecision | null;

  /**
   * Derived server-side at decision time (`BIL-QAI-DD-7`): true when any
   * section or the overall verdict was amber or red. Never computed on
   * insert — only `submitForReview` (T-6) stamps this alongside `decision`.
   */
  @Column({ type: 'tinyint', nullable: true })
  had_outstanding_flags: number | null;

  @Column({ type: 'datetime', nullable: true })
  decided_at: Date | null;

  /** The user who triggered this assessment run. */
  @Column({ type: 'int' })
  created_by: number;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;
}

export type BilateralQualityAssessmentStatus =
  | 'running'
  | 'completed'
  | 'unavailable'
  | 'skipped_kp_rule';

export type BilateralQualityAssessmentUnavailableReason =
  | 'timeout'
  | 'http_error'
  | 'malformed'
  | 'not_configured'
  /** v0.2 — the AI answered well-formed with `status: "unavailable"`. */
  | 'ai_unavailable';

/** v0.2 — the AI's own `status` verbatim (`design.md` §3.1/§4.5). */
export type BilateralQualityAssessmentAiStatus = 'completed' | 'partial';

export type BilateralQualityAssessmentDecision =
  | 'submitted_anyway'
  | 'submitted_without_check'
  | 'adjusted';
