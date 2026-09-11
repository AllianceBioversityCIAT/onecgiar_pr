import { Logger } from '@nestjs/common';

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
