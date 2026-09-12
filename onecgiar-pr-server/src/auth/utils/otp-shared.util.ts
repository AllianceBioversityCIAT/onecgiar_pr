import { Logger } from '@nestjs/common';
import { randomInt } from 'crypto';

// @akili-spec changes/cognito-email-otp-login (OTP-T-5 rework, design.md §5.1
// lens-B advisory (e): "one normaliseOtpEmail() helper shared by startOtp,
// verifyOtp and getTracker"). Also carries the one `auth.otp.*` log-line
// builder (OTP-R-12) so AuthService's outcomes and OtpThrottlerGuard's
// `rate_limited` outcome are byte-identical in shape.

/** Trim + lower-case — the one normalisation rule for every OTP email touchpoint. */
export function normaliseOtpEmail(email: string): string {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

/** Domain portion of a normalised email; never the local part (OTP-R-11 log rule). */
export function extractOtpDomain(email: string): string {
  return email.split('@')[1] ?? '';
}

export type OtpEventKind = 'start' | 'verify';

/**
 * `auth.otp.<kind> { domain, outcome, durationMs }` (OTP-R-12). The single
 * place this line is built so AuthService (sent/denied_domain/denied_user/
 * ok/mismatch/expired/attempts_exceeded/not_authorized/upstream_error/
 * internal_error) and OtpThrottlerGuard (rate_limited) can never drift.
 */
export function logOtpEvent(
  logger: Logger,
  kind: OtpEventKind,
  domain: string,
  outcome: string,
  startedAt: number,
): void {
  const durationMs = Date.now() - startedAt;
  logger.log(
    `auth.otp.${kind} { domain: '${domain}', outcome: '${outcome}', durationMs: ${durationMs} }`,
  );
}

// @akili-spec changes/cognito-email-otp-login (OTP-T-17, design.md §19.2) —
// pure parsing rule for `OTP_ALLOWED_EMAIL_DOMAINS`, extracted so a consumer
// other than `AuthService.getOtpAllowedDomains()` (e.g. `UserService`'s
// admin-registration path) can apply the exact same rule without importing
// `AuthService` itself (circular DI risk: `UserModule` provides `AuthService`).
// Mirrors `AuthService.getOtpAllowedDomains()`'s parsing byte-for-byte
// (split on `,`, trim, lower-case, drop a leading `@`, drop malformed/empty
// entries, de-duplicate) — keep the two in sync if either rule changes.

/**
 * Parses the raw `OTP_ALLOWED_EMAIL_DOMAINS` global-parameter value into a
 * de-duplicated, lower-cased, `@`-free domain list. Pure — no cache, no I/O.
 * A falsy/unreadable `raw` (empty string, `null`, `undefined`) yields `[]`,
 * i.e. "no allow-list" — never throws.
 */
export function parseOtpAllowedDomains(
  raw: string | null | undefined,
): string[] {
  if (!raw) {
    return [];
  }

  const domains = String(raw)
    .split(',')
    .map((domain) => domain.trim().toLowerCase().replace(/^@/, ''))
    .filter((domain) => domain.length > 0 && !domain.includes('@'));

  return [...new Set(domains)];
}

// @akili-spec changes/cognito-email-otp-login (OTP-T-16, design.md §19.1) —
// the segment encoder moved here from `AuthService` because `OtpChallengeService`
// must mint its `nonce` with the *same* encoding the decoy encoder uses: a real
// session and a decoy session are only byte-indistinguishable if their nonce
// segments are drawn from the same distribution (design.md §13 item (l)).

export const OTP_BASE64URL_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

/**
 * base64url-encodes a segment and fills the bits the encoder would otherwise
 * zero — the trailing bits of the last character when the byte length is not a
 * multiple of 3 (design.md §13 item (l)). Node's decoder ignores those bits, so
 * `Buffer.from(encodeOtpBase64UrlSegment(b), 'base64url')` returns `b` verbatim:
 * the authenticated bytes are unchanged and only the *shape* signal disappears
 * (the trailing char becomes uniform over all 64 alphabet values instead of the
 * 16/4-value subset canonical encoding leaves).
 */
export function encodeOtpBase64UrlSegment(bytes: Buffer): string {
  const encoded = bytes.toString('base64url');
  const remainder = bytes.length % 3;
  if (remainder === 0) {
    return encoded;
  }

  // 1 leftover byte → 2 chars, 4 unused bits; 2 leftover bytes → 3 chars, 2.
  const unusedBits = remainder === 1 ? 4 : 2;
  const unusedMask = (1 << unusedBits) - 1;
  const lastIndex = OTP_BASE64URL_ALPHABET.indexOf(encoded[encoded.length - 1]);
  const randomised = (lastIndex & ~unusedMask) | randomInt(0, unusedMask + 1);

  return encoded.slice(0, -1) + OTP_BASE64URL_ALPHABET[randomised];
}
