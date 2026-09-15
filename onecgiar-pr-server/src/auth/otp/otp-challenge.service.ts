import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'crypto';
import { env } from 'process';
import { IsNull, LessThan, Repository } from 'typeorm';
import {
  encodeOtpBase64UrlSegment,
  normaliseOtpEmail,
} from '../utils/otp-shared.util';
import { OtpChallenge } from './otp-challenge.entity';

/**
 * PRMS-owned sign-in challenge lifecycle (`OTP-R-37`, `design.md` §19.1).
 *
 * @akili-spec changes/cognito-email-otp-login (OTP-T-16)
 *
 * Replaces the Cognito `CUSTOM_AUTH` session: PRMS generates the code, mails it,
 * verifies it and consumes it, with no Cognito call anywhere on the path. The row
 * holds **only HMACs** of the email and the code (`OTP-R-11`), one code per
 * challenge, 5 minutes, 3 attempts, single use.
 */

/** 5 minutes — the window the email advertises and the session `exp` carries. */
export const OTP_CHALLENGE_TTL_MS = 5 * 60 * 1000;

/** Wrong codes allowed before the challenge is spent (`OTP-R-34` modified). */
export const OTP_CHALLENGE_MAX_ATTEMPTS = 3;

/** Default retention for the opportunistic purge: expired for over an hour. */
export const OTP_CHALLENGE_PURGE_AFTER_MINUTES = 60;

// Domain-separation tags. The two derivations share one root secret (`JWT_SKEY`),
// so — exactly as for the decoy's auth/mask pair (design.md §13 item (l)) — a
// distinct tag per key makes "no input of one is ever an input of the other"
// structural rather than an argument about separators.
const OTP_CHALLENGE_EMAIL_KEY_TAG = 'otp-challenge-email\0';
const OTP_CHALLENGE_CODE_KEY_TAG = 'otp-challenge-code\0';

/** 16 random bytes → the 22-char base64url nonce the session string carries. */
const OTP_NONCE_BYTES = 16;

export interface CreatedOtpChallenge {
  nonce: string;
  code: string;
  expiresAt: Date;
}

@Injectable()
export class OtpChallengeService {
  private readonly _logger = new Logger(OtpChallengeService.name);

  /**
   * Keys derived from `JWT_SKEY`, read once at construction. The fallback is a
   * per-process random root, never the empty key: an unset `JWT_SKEY` must not
   * make `email_hash` a globally-computable value (same finding as the decoy
   * key's `env.JWT_SKEY ?? ''` review FAIL, OTP-T-5).
   */
  private readonly _emailKey: Buffer;
  private readonly _codeKey: Buffer;

  constructor(
    @InjectRepository(OtpChallenge)
    private readonly _otpChallengeRepository: Repository<OtpChallenge>,
  ) {
    const root = env.JWT_SKEY ? Buffer.from(env.JWT_SKEY) : randomBytes(32);
    this._emailKey = createHmac('sha256', root)
      .update(OTP_CHALLENGE_EMAIL_KEY_TAG)
      .digest();
    this._codeKey = createHmac('sha256', root)
      .update(OTP_CHALLENGE_CODE_KEY_TAG)
      .digest();
  }

  /**
   * Mints and stores one challenge, returning the plaintext code **to the caller
   * only** (it goes straight into the email body and is never logged or stored).
   * The expired-row purge runs opportunistically here — a failing purge must
   * never fail a sign-in, so it is caught and logged as an outcome, not thrown.
   */
  async create(email: string): Promise<CreatedOtpChallenge> {
    await this.purgeExpired().catch(() =>
      this._logger.warn('auth.otp.purge { outcome: "failed" }'),
    );

    const nonce = encodeOtpBase64UrlSegment(randomBytes(OTP_NONCE_BYTES));
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const expiresAt = new Date(Date.now() + OTP_CHALLENGE_TTL_MS);

    await this._otpChallengeRepository.save({
      nonce,
      email_hash: this.hashEmail(email),
      code_hmac: this.hashCode(nonce, code),
      expires_at: expiresAt,
      attempts: 0,
      consumed_at: null,
    });

    return { nonce, code, expiresAt };
  }

  /**
   * The challenge a session's nonce points at, or `null` when there is none —
   * which is precisely how a decoy session is told from a real one, and the only
   * place that distinction is ever made (`design.md` §19.1).
   *
   * Deliberately returns the row whatever its state: `consumed_at`, `attempts`
   * and `expires_at` each map to a *different* answer for the user, so filtering
   * them out here would collapse three outcomes into one.
   */
  async findActive(nonce: string): Promise<OtpChallenge | null> {
    return this._otpChallengeRepository.findOne({ where: { nonce } });
  }

  /**
   * One more wrong code against this challenge — a conditional atomic increment
   * (`attempts < OTP_CHALLENGE_MAX_ATTEMPTS`), so N parallel wrong codes at the
   * ceiling cannot push `attempts` past 3 between them (`OTP-R-37` concurrency,
   * reviewer advisory). Returns the affected row count: `0` means this call lost
   * the race — the ceiling was already reached by another concurrent attempt (or
   * this one) by the time the UPDATE ran, whatever `attempts` looked like when the
   * caller read the row.
   */
  async registerAttempt(nonce: string): Promise<number> {
    const { affected } = await this._otpChallengeRepository.increment(
      { nonce, attempts: LessThan(OTP_CHALLENGE_MAX_ATTEMPTS) },
      'attempts',
      1,
    );
    return affected ?? 0;
  }

  /**
   * Spends the challenge — a code works exactly once (`OTP-R-37`). Conditioned on
   * `consumed_at IS NULL`, so two concurrent right-code verifies for the same
   * nonce cannot both mint a session: only the UPDATE that wins the race affects a
   * row. Returns `true` only when this call was the one that consumed it.
   */
  async consume(nonce: string): Promise<boolean> {
    const { affected } = await this._otpChallengeRepository.update(
      { nonce, consumed_at: IsNull() },
      { consumed_at: new Date() },
    );
    return affected === 1;
  }

  /** Drops challenges that expired longer than `olderThanMinutes` ago. */
  async purgeExpired(
    olderThanMinutes: number = OTP_CHALLENGE_PURGE_AFTER_MINUTES,
  ): Promise<void> {
    await this._otpChallengeRepository.delete({
      expires_at: LessThan(new Date(Date.now() - olderThanMinutes * 60 * 1000)),
    });
  }

  /**
   * Constant-time comparison of the submitted code against the stored HMAC
   * (`OTP-R-34` modified). Returns `false` rather than throwing for a stored
   * value of the wrong shape — `timingSafeEqual` rejects unequal lengths.
   */
  matchesCode(challenge: OtpChallenge, code: string): boolean {
    const expected = Buffer.from(this.hashCode(challenge.nonce, code), 'hex');
    const stored = Buffer.from(String(challenge?.code_hmac ?? ''), 'hex');

    return (
      stored.length === expected.length && timingSafeEqual(stored, expected)
    );
  }

  /** `HMAC(key_email, normalisedEmail)` — the address itself never lands in the DB. */
  private hashEmail(email: string): string {
    return createHmac('sha256', this._emailKey)
      .update(normaliseOtpEmail(email))
      .digest('hex');
  }

  /** `HMAC(key_code, nonce + '|' + code)` — nonce-bound, so a code is useless elsewhere. */
  private hashCode(nonce: string, code: string): string {
    return createHmac('sha256', this._codeKey)
      .update(`${nonce}|${code}`)
      .digest('hex');
  }
}
