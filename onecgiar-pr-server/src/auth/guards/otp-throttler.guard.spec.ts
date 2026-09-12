import {
  Controller,
  HttpStatus,
  Post,
  INestApplication,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ThrottlerModule, SkipThrottle } from '@nestjs/throttler';
import request from 'supertest';
import { OtpThrottlerGuard } from './otp-throttler.guard';
import { HttpExceptionFilter } from '../../shared/handlers/error.exception';
import { ThrottlerExcludeBilateralGuard } from '../../shared/guards/throttler-exclude-bilateral.guard';

// @akili-spec changes/cognito-email-otp-login (OTP-T-5 rework round 2, Leader
// correction, design.md §5.1/OTP-DD-6) — `ThrottlerModule.forRoot` carries only
// the plain, unnamed `default` throttler everywhere in these specs (matching
// `app.module.ts` exactly — no `otp` entry). `OtpThrottlerGuard` enforces its
// own limits (`OTP_ROUTE_LIMITS` in otp-throttler.guard.ts) through its own
// storage key/namespace, entirely independent of `@Throttle`/`forRoot`.

@Controller()
class OtpProbeController {
  @Post('/probe/otp/start')
  @UseGuards(OtpThrottlerGuard)
  @SkipThrottle()
  start() {
    return { ok: true };
  }

  @Post('/probe/otp/verify')
  @UseGuards(OtpThrottlerGuard)
  @SkipThrottle()
  verify() {
    return { ok: true };
  }

  // Undecorated control route — carries neither @SkipThrottle nor
  // OtpThrottlerGuard. Proves the OTP limits (5|10 per 15 min, email-keyed)
  // leak nowhere: this route stays on the app-global default (100/60s) only.
  @Post('/probe/otp/control')
  control() {
    return { ok: true };
  }
}

describe('OtpThrottlerGuard', () => {
  describe('getTracker', () => {
    let guard: OtpThrottlerGuard;

    beforeEach(async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }])],
        providers: [OtpThrottlerGuard],
      }).compile();

      guard = moduleRef.get(OtpThrottlerGuard);
    });

    it('returns the normalised body email when present', async () => {
      const req = {
        body: { email: '  A@ICRISAT.ORG  ' },
        headers: {},
        ip: '1.2.3.4',
      };
      const tracker = await (guard as any).getTracker(req);
      expect(tracker).toBe('a@icrisat.org');
    });

    // (q) — getTracker with a 300-char email → key length ≤ 254
    it('caps the tracker at 254 chars for a very long email', async () => {
      const longLocal = 'a'.repeat(290);
      const email = `${longLocal}@icrisat.org`; // > 300 chars, has '@'
      const req = { body: { email }, headers: {}, ip: '1.2.3.4' };

      const tracker = await (guard as any).getTracker(req);

      expect(tracker.length).toBeLessThanOrEqual(254);
      expect(tracker).toBe(email.toLowerCase().slice(0, 254));
    });

    // (q) — no '@' → falls back to IP (never trusts a non-email as the key)
    it('falls back to req.ip when the body "email" has no @', async () => {
      const req = {
        body: { email: 'not-an-email-at-all' },
        headers: {},
        ip: '9.9.9.9',
      };
      const tracker = await (guard as any).getTracker(req);
      expect(tracker).toBe('9.9.9.9');
    });

    it('falls back to the first x-forwarded-for hop when there is no body email', async () => {
      const req = {
        body: {},
        headers: { 'x-forwarded-for': '10.0.0.1, 10.0.0.2' },
        ip: '1.2.3.4',
      };
      const tracker = await (guard as any).getTracker(req);
      expect(tracker).toBe('10.0.0.1');
    });

    it('falls back to req.ip when there is neither a body email nor x-forwarded-for', async () => {
      const req = { body: {}, headers: {}, ip: '1.2.3.4' };
      const tracker = await (guard as any).getTracker(req);
      expect(tracker).toBe('1.2.3.4');
    });
  });

  describe('rate limiting behaviour (6th call within the window) — guard-owned limits, no named throttler anywhere', () => {
    let app: INestApplication;

    beforeEach(async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }])],
        controllers: [OtpProbeController],
        providers: [OtpThrottlerGuard],
      }).compile();

      app = moduleRef.createNestApplication();
      app.useGlobalFilters(new HttpExceptionFilter());
      await app.init();
    });

    afterEach(async () => {
      await app.close();
    });

    it('returns 429 with the neutral envelope on the 6th call for a known email', async () => {
      const email = 'known@icrisat.org';
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post('/probe/otp/start')
          .send({ email })
          .expect(HttpStatus.CREATED);
      }

      const res = await request(app.getHttpServer())
        .post('/probe/otp/start')
        .send({ email })
        .expect(HttpStatus.TOO_MANY_REQUESTS);

      expect(res.body.response).toMatchObject({
        valid: false,
        code: 'OTP_RATE_LIMITED',
      });
      expect(res.body.message).toBe('Too many requests — wait a few minutes.');
      // Never the framework's raw ThrottlerException body/text.
      expect(JSON.stringify(res.body)).not.toMatch(/ThrottlerException/i);
    });

    it('returns 429 with the neutral envelope on the 6th call for an unknown email alike', async () => {
      const email = 'unknown@icrisat.org';
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post('/probe/otp/start')
          .send({ email })
          .expect(HttpStatus.CREATED);
      }

      const res = await request(app.getHttpServer())
        .post('/probe/otp/start')
        .send({ email })
        .expect(HttpStatus.TOO_MANY_REQUESTS);

      expect(res.body.response).toMatchObject({
        valid: false,
        code: 'OTP_RATE_LIMITED',
      });
    });

    it('tracks each email independently (a different email is not yet rate limited)', async () => {
      const email = 'known@icrisat.org';
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post('/probe/otp/start')
          .send({ email })
          .expect(HttpStatus.CREATED);
      }

      const res = await request(app.getHttpServer())
        .post('/probe/otp/start')
        .send({ email: 'another@icrisat.org' })
        .expect(HttpStatus.CREATED);

      // Explicit assertion (not just "did not throw"): the different email's
      // request reaches the route handler cleanly — no rate-limit envelope.
      expect(res.body).toEqual({ ok: true });
    });

    it('verify allows 10 per window (a stricter start limit does not leak onto verify)', async () => {
      const email = 'verify-email@icrisat.org';
      for (let i = 0; i < 10; i++) {
        const res = await request(app.getHttpServer())
          .post('/probe/otp/verify')
          .send({ email })
          .expect(HttpStatus.CREATED);
        expect(res.body).toEqual({ ok: true });
      }

      const blocked = await request(app.getHttpServer())
        .post('/probe/otp/verify')
        .send({ email })
        .expect(HttpStatus.TOO_MANY_REQUESTS);

      expect(blocked.body.response).toMatchObject({
        valid: false,
        code: 'OTP_RATE_LIMITED',
      });
    });

    // FAIL A-2 — outcome=rate_limited must actually be emitted, exactly once.
    it('emits exactly one auth.otp.start { outcome: rate_limited } log line on the 6th call', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      const email = 'logged@icrisat.org';
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post('/probe/otp/start')
          .send({ email })
          .expect(HttpStatus.CREATED);
      }
      logSpy.mockClear();

      await request(app.getHttpServer())
        .post('/probe/otp/start')
        .send({ email })
        .expect(HttpStatus.TOO_MANY_REQUESTS);

      const matches = logSpy.mock.calls.filter((call) => {
        const text = String(call[0]);
        return (
          text.includes('auth.otp.start') &&
          text.includes("domain: 'icrisat.org'") &&
          text.includes("outcome: 'rate_limited'")
        );
      });
      expect(matches.length).toBe(1);
      logSpy.mockRestore();
    });
  });

  // (m) — composition test: the REAL app-global guard + this route guard, and
  // an undecorated control route in the same module. A composition test that
  // omits the real APP_GUARD proves nothing (task disqualifier) — this is why
  // ThrottlerExcludeBilateralGuard is registered as APP_GUARD below,
  // unmodified, exactly as app.module.ts does, with the SAME unnamed
  // `ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }])` app.module.ts uses.
  describe('composition: APP_GUARD=ThrottlerExcludeBilateralGuard (real) + OtpThrottlerGuard, no named throttler anywhere', () => {
    let app: INestApplication;

    beforeEach(async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }])],
        controllers: [OtpProbeController],
        providers: [
          OtpThrottlerGuard,
          { provide: APP_GUARD, useClass: ThrottlerExcludeBilateralGuard },
        ],
      }).compile();

      app = moduleRef.createNestApplication();
      app.useGlobalFilters(new HttpExceptionFilter());
      await app.init();
    });

    afterEach(async () => {
      await app.close();
    });

    it('6th call for one email → neutral 429; a different email from the same IP is not blocked', async () => {
      const email = 'known@icrisat.org';
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post('/probe/otp/start')
          .send({ email })
          .expect(HttpStatus.CREATED);
      }

      const blocked = await request(app.getHttpServer())
        .post('/probe/otp/start')
        .send({ email })
        .expect(HttpStatus.TOO_MANY_REQUESTS);

      expect(blocked.body.response).toMatchObject({
        valid: false,
        code: 'OTP_RATE_LIMITED',
      });
      expect(JSON.stringify(blocked.body)).not.toMatch(/ThrottlerException/i);

      // Same IP (supertest reuses one client), a fresh email — OtpThrottlerGuard's
      // per-email counter is fresh for this email, and the global guard
      // contributes nothing (this route is @SkipThrottle()'d for `default`,
      // and no `otp` throttler exists anywhere for it to also enforce).
      await request(app.getHttpServer())
        .post('/probe/otp/start')
        .send({ email: 'other@icrisat.org' })
        .expect(HttpStatus.CREATED);
    });

    // The whole point of round 2: the OTP limit must not leak onto an
    // ordinary, undecorated route sitting in the same app.
    it('11 rapid calls to the undecorated control route all pass (default 100/60s only — OTP limits leak nowhere)', async () => {
      for (let i = 0; i < 11; i++) {
        const res = await request(app.getHttpServer())
          .post('/probe/otp/control')
          .send({})
          .expect(HttpStatus.CREATED);
        // Explicit per-call assertion — proves each of the 11 calls actually
        // reached the handler (not just that none of them threw).
        expect(res.body).toEqual({ ok: true });
      }
    });
  });
});
