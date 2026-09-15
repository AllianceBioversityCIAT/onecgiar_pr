import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * One PRMS-owned sign-in challenge (`OTP-R-37`, `design.md` §19.1 "Storage").
 *
 * @akili-spec changes/cognito-email-otp-login (OTP-T-16)
 *
 * Deliberately NOT a `BaseEntity`/`Auditable` descendant: this is throw-away
 * authentication state with a 5-minute life and a purge, not an audited business
 * row — it has no `is_active`, no `created_by`, and nothing to soft-delete.
 *
 * 🛑 The plaintext email and the plaintext code never reach this table
 * (`OTP-R-11`, `OTP-R-37`): `email_hash` and `code_hmac` are keyed HMACs under
 * two `JWT_SKEY`-derived, domain-separated keys, so a database dump yields
 * neither the address that asked for a code nor the code itself.
 */
@Entity('otp_challenges')
export class OtpChallenge {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  id: number;

  /**
   * The 22-char base64url nonce that also sits inside the session string handed
   * to the client — the only link between a session and its challenge, and the
   * reason real and decoy sessions stay byte-indistinguishable (`design.md` §19.1).
   */
  @Index('IDX_otp_challenges_nonce', { unique: true })
  @Column({ type: 'varchar', length: 32 })
  nonce: string;

  /** `HMAC(key_email, normalisedEmail)` in hex — never the address itself. */
  @Index('IDX_otp_challenges_email_hash')
  @Column({ type: 'char', length: 64 })
  email_hash: string;

  /** `HMAC(key_code, nonce + '|' + code)` in hex — never the code itself. */
  @Column({ type: 'char', length: 64 })
  code_hmac: string;

  @Column({ type: 'datetime' })
  expires_at: Date;

  /** Wrong-code counter; 3 exhausts the challenge (`OTP-R-34` modified). */
  @Column({ type: 'tinyint', default: 0 })
  attempts: number;

  /** Set on the single successful verification — a challenge is one-shot. */
  @Column({ type: 'datetime', nullable: true })
  consumed_at: Date;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;
}
