import {
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ThrottlerGuard, ThrottlerLimitDetail } from '@nestjs/throttler';
import {
  normaliseOtpEmail,
  extractOtpDomain,
  logOtpEvent,
} from '../utils/otp-shared.util';

const OTP_RATE_LIMITED_MESSAGE = 'Too many requests — wait a few minutes.';

// @akili-spec changes/cognito-email-otp-login (OTP-T-5 rework round 2, Leader
// correction) — this guard's own storage namespace/key prefix, entirely
// independent of `ThrottlerModule.forRoot`'s (unnamed, still just
// `[{ ttl: 60000, limit: 100 }]`) `default` throttler. Nothing here is a named
// `@Throttle`/`@SkipThrottle` entry, so it can never leak onto any other route.
const OTP_STORAGE_NAMESPACE = 'otp';

const OTP_ROUTE_LIMITS: Record<
  'start' | 'verify',
  { limit: number; ttl: number }
> = {
  start: { limit: 5, ttl: 900_000 },
  verify: { limit: 10, ttl: 900_000 },
};

/**
 * Rate limits the Center (email OTP) start/verify routes per normalised email
 * rather than per IP, so a single account cannot be hammered from many
 * addresses and the limiter behaves identically for known and unknown emails
 * (OTP-R-3, OTP-R-6, OTP-DD-6, design.md §4.1/§5.1).
 *
 * @akili-spec changes/cognito-email-otp-login (OTP-T-5 rework round 2)
 * Round 1 of this rework added a **named** `otp` throttler to the global
 * `ThrottlerModule.forRoot` array so this guard could piggy-back on
 * `@Throttle`'s named-throttler mechanism. That was wrong: `forRoot`'s options
 * are process-global (`@Global()` module), so the app-wide
 * `ThrottlerExcludeBilateralGuard` (`APP_GUARD`, unmodified) would ALSO
 * process that same named entry on every OTHER, undecorated route in the
 * app — via its own `req.ip` tracker and the array's default limit/ttl —
 * because `@nestjs/throttler`'s multi-throttler design intentionally applies
 * every configured named throttler app-wide unless a route opts out. Adding
 * one named entry for two routes would have rate-limited the entire
 * application to 10 req/15 min per IP per endpoint.
 *
 * The fix: `ThrottlerModule.forRoot` stays exactly `[{ ttl: 60000, limit: 100
 * }]` (see `app.module.ts` — reverted, no `otp` entry). The two routes carry
 * a plain `@SkipThrottle()` (skips `default` only — the only throttler that
 * exists) so `ThrottlerExcludeBilateralGuard` skips them entirely and
 * contributes nothing. This guard never touches `@Throttle`/`@SkipThrottle`
 * metadata or `this.throttlers`/`this.options` at all: its `canActivate` is a
 * fully self-contained override that reads its OWN limits from
 * `OTP_ROUTE_LIMITS` (chosen by request path) and drives the injected
 * `ThrottlerStorage` directly with its own key/namespace
 * (`OTP_STORAGE_NAMESPACE`) — a mechanism that cannot exist anywhere else in
 * the app, so it cannot leak onto any other route by construction.
 */
@Injectable()
export class OtpThrottlerGuard extends ThrottlerGuard {
  private readonly _otpLogger = new Logger(OtpThrottlerGuard.name);

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Record<string, any>>();
    const res = context.switchToHttp().getResponse<Record<string, any>>();

    // Timestamp the request on the request object itself (not on `this` — the
    // guard is a singleton shared across concurrent requests) so
    // `throwThrottlingException` can compute a real `durationMs` for the
    // `auth.otp.<kind>` telemetry line (OTP-R-12).
    req['__otpThrottleStartedAt'] = Date.now();

    const kind = this.resolveKind(req);
    const { limit, ttl } = OTP_ROUTE_LIMITS[kind];

    const tracker = await this.getTracker(req);
    const key = this.generateKey(context, tracker, OTP_STORAGE_NAMESPACE);

    const { totalHits, timeToExpire, isBlocked, timeToBlockExpire } =
      await this.storageService.increment(
        key,
        ttl,
        limit,
        ttl,
        OTP_STORAGE_NAMESPACE,
      );

    if (isBlocked) {
      res.header?.('Retry-After', timeToBlockExpire);
      await this.throwThrottlingException(context, {
        limit,
        ttl,
        key,
        tracker,
        totalHits,
        timeToExpire,
        isBlocked,
        timeToBlockExpire,
      });
    }

    res.header?.('X-RateLimit-Limit-otp', limit);
    res.header?.('X-RateLimit-Remaining-otp', Math.max(0, limit - totalHits));
    res.header?.('X-RateLimit-Reset-otp', timeToExpire);

    return true;
  }

  /** `start` or `verify`, derived from the request path — chooses which of `OTP_ROUTE_LIMITS` applies. */
  private resolveKind(req: Record<string, any>): 'start' | 'verify' {
    const path: string = req?.path ?? req?.url ?? '';
    return path.includes('verify') ? 'verify' : 'start';
  }

  /**
   * Normalised body email, capped at 254 chars, required to contain `@` before
   * it is trusted as the rate-limit key (else fall back) — the first
   * `x-forwarded-for` hop, then `req.ip` (OTP-T-5 rework, design.md §5.1).
   */
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const bodyEmail = req?.body?.email;
    if (typeof bodyEmail === 'string') {
      const normalised = normaliseOtpEmail(bodyEmail);
      if (normalised.includes('@')) {
        return normalised.slice(0, 254);
      }
    }

    const forwardedFor = req?.headers?.['x-forwarded-for'];
    if (typeof forwardedFor === 'string' && forwardedFor.trim().length > 0) {
      return forwardedFor.split(',')[0].trim();
    }

    return req.ip;
  }

  /**
   * Replaces the framework's raw `ThrottlerException` with the project's
   * neutral 429 envelope (`OTP_RATE_LIMITED`) and emits
   * `auth.otp.<kind> { domain, outcome: 'rate_limited', durationMs }` before
   * throwing (OTP-T-5 rework, review FAIL A-2 — this outcome was never
   * emitted before because the exception was thrown without logging and
   * `AuthService.startOtp/verifyOtp` are never reached on a 429).
   */
  protected async throwThrottlingException(
    context: ExecutionContext,
    _throttlerLimitDetail: ThrottlerLimitDetail,
  ): Promise<void> {
    const req = context.switchToHttp().getRequest<Record<string, any>>();
    const startedAt: number = req?.['__otpThrottleStartedAt'] ?? Date.now();
    const kind = this.resolveKind(req);
    const bodyEmail =
      typeof req?.body?.email === 'string' ? req.body.email : '';
    const domain = extractOtpDomain(normaliseOtpEmail(bodyEmail));

    logOtpEvent(this._otpLogger, kind, domain, 'rate_limited', startedAt);

    throw new HttpException(
      {
        valid: false,
        code: 'OTP_RATE_LIMITED',
        message: OTP_RATE_LIMITED_MESSAGE,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
