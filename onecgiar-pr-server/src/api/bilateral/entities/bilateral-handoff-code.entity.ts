import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../../auth/modules/user/entities/user.entity';
import { ClarisaCenter } from '../../../clarisa/clarisa-centers/entities/clarisa-center.entity';

/**
 * One PRMS-minted sign-in handoff code to the Bulk Results Uploader
 * (`design.md` §3.1, `requirements.md` §6 R-3).
 *
 * @akili-spec bilateral/bulk-uploader-handoff (BIL-HO-T-1)
 *
 * Deliberately NOT a `BaseEntity`/`Auditable` descendant — same reasoning as
 * `OtpChallenge` (`src/auth/otp/otp-challenge.entity.ts`): this is throw-away
 * authentication state with a 120 s life and an opportunistic purge (R-20),
 * not an audited business row — it has no `is_active`, no `created_by`, and
 * nothing to soft-delete.
 *
 * 🛑 What is deliberately NOT stored here (R-3 "database dump" scenario):
 * the plaintext code (only its SHA-256 lives in `code_hash` — `BIL-HO-DD-3`
 * explains why a plain hash, no HMAC, is enough for a 256-bit random value),
 * the user's e-mail, and any claim payload (claims are assembled at exchange
 * time from `users` / `role_by_user` / `clarisa_center` / `clarisa_institutions`
 * / the open Reporting phase — never persisted here, `design.md` §5 E3).
 */
@Entity('bilateral_handoff_codes')
@Index('IDX_bilateral_handoff_codes_user_live', [
  'user_id',
  'consumed_at',
  'expires_at',
])
export class BilateralHandoffCode {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  id: number;

  /**
   * SHA-256 hex digest of the plaintext code. Never the code itself (R-3).
   * The input carries 256 bits of entropy, so a keyed HMAC buys nothing here
   * — unlike `OtpChallenge.code_hmac`, which protects a short, guessable code
   * (`BIL-HO-DD-3`).
   */
  @Index('IDX_bilateral_handoff_codes_code_hash', { unique: true })
  @Column({ type: 'char', length: 64 })
  code_hash: string;

  /**
   * The verified session's user id (R-1). Leading column of the composite
   * index above, which serves both R-4 (invalidate this user's live codes)
   * and R-20 (opportunistic purge).
   */
  @Column({ type: 'int' })
  user_id: number;

  @ManyToOne(() => User, (u) => u.id)
  @JoinColumn({ name: 'user_id' })
  user: User;

  /**
   * CLARISA centre code (`CENTER-XX`) the code was minted for (`OQ-3`).
   * `collation: 'utf8mb3_unicode_ci'` matches `clarisa_center.code`'s actual
   * collation (verified live: `SHOW FULL COLUMNS FROM clarisa_center LIKE
   * 'code'`), which differs from this schema's default
   * (`utf8mb3_general_ci`) — required so the `FOREIGN KEY` below does not
   * fail with errno 3780 on `migration:run` (same reasoning as
   * `IntellectualPropertyExpert.center_code`).
   */
  @Column({ type: 'varchar', length: 45, collation: 'utf8mb3_unicode_ci' })
  center_code: string;

  @ManyToOne(() => ClarisaCenter, (cc) => cc.code)
  @JoinColumn({ name: 'center_code' })
  center: ClarisaCenter;

  /** Partner audience the code was minted for, e.g. `w3-bilateral-uploader:test`. */
  @Column({ type: 'varchar', length: 100 })
  audience: string;

  /** `created_at + 120 s` (R-3). */
  @Column({ type: 'datetime' })
  expires_at: Date;

  /**
   * Stamped by the single successful exchange (R-7), or by a later `start`
   * call invalidating this row (R-4, `design.md` §5 S4 — the invalidation
   * `UPDATE` also stamps `consumed_by_platform_acronym = 'superseded'`).
   */
  @Column({ type: 'datetime', nullable: true })
  consumed_at: Date;

  /** `mis.id` from the CLARISA key validation on the redeeming call (R-11). */
  @Column({ type: 'int', nullable: true })
  consumed_by_platform_id: number;

  /**
   * `mis.acronym`, denormalised so the audit trail survives a CLARISA rename
   * (`design.md` §3.1).
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  consumed_by_platform_acronym: string;

  /**
   * `req.user.auth_method` copied at mint time (`saml` | `password` | `otp`),
   * so `exchange` can return it without re-reading the session (R-9, R-10,
   * `BIL-HO-DD-4`, S5'). Not personal data. `null` for sessions issued before
   * the `auth_method` claim existed (legacy scenario).
   */
  @Column({ type: 'varchar', length: 16, nullable: true })
  auth_method: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;
}
