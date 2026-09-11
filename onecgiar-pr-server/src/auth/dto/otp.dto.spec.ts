import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AuthController } from '../auth.controller';
import { AuthService } from '../auth.service';
import { ActiveDirectoryService } from '../services/active-directory.service';
import { OtpThrottlerGuard } from '../guards/otp-throttler.guard';
import { ThrottlerModule } from '@nestjs/throttler';

// @akili-spec changes/cognito-email-otp-login (OTP-T-5, tasks.md verification (i))
// Exercises OtpStartDto / OtpVerifyDto through the real AuthController's
// per-route ValidationPipe (whitelist + forbidNonWhitelisted), never in
// isolation from the pipe — a disqualifier for this task.
describe('Otp DTOs through the controller ValidationPipe', () => {
  let app: INestApplication;
  const startOtp = jest.fn().mockResolvedValue({ ok: true });
  const verifyOtp = jest.fn().mockResolvedValue({ ok: true });

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot([{ ttl: 900000, limit: 100 }])],
      controllers: [AuthController],
      providers: [
        OtpThrottlerGuard,
        { provide: AuthService, useValue: { startOtp, verifyOtp } },
        { provide: ActiveDirectoryService, useValue: {} },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    startOtp.mockClear();
    verifyOtp.mockClear();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('OtpStartDto', () => {
    it('accepts a valid email', async () => {
      await request(app.getHttpServer())
        .post('/login/otp/start')
        .send({ email: 'a@icrisat.org' })
        .expect(HttpStatus.OK);

      expect(startOtp).toHaveBeenCalledTimes(1);
    });

    it('rejects an email over 254 chars with 400', async () => {
      const longLocal = 'a'.repeat(250);
      await request(app.getHttpServer())
        .post('/login/otp/start')
        .send({ email: `${longLocal}@icrisat.org` })
        .expect(HttpStatus.BAD_REQUEST);

      expect(startOtp).not.toHaveBeenCalled();
    });

    it('rejects an extra field with 400 (forbidNonWhitelisted)', async () => {
      await request(app.getHttpServer())
        .post('/login/otp/start')
        .send({ email: 'a@icrisat.org', extra: 'nope' })
        .expect(HttpStatus.BAD_REQUEST);

      expect(startOtp).not.toHaveBeenCalled();
    });
  });

  describe('OtpVerifyDto', () => {
    const base = {
      email: 'a@icrisat.org',
      code: '123456',
      session: 'otp:x.y.1',
    };

    it('accepts a valid payload', async () => {
      await request(app.getHttpServer())
        .post('/login/otp/verify')
        .send(base)
        .expect(HttpStatus.OK);

      expect(verifyOtp).toHaveBeenCalledTimes(1);
    });

    it('rejects a non-digit code with 400', async () => {
      await request(app.getHttpServer())
        .post('/login/otp/verify')
        .send({ ...base, code: '12ab' })
        .expect(HttpStatus.BAD_REQUEST);

      expect(verifyOtp).not.toHaveBeenCalled();
    });

    it('rejects a missing session with 400', async () => {
      const withoutSession = { email: base.email, code: base.code };
      await request(app.getHttpServer())
        .post('/login/otp/verify')
        .send(withoutSession)
        .expect(HttpStatus.BAD_REQUEST);

      expect(verifyOtp).not.toHaveBeenCalled();
    });

    // @akili-spec changes/cognito-email-otp-login (OTP-T-5 rework, FAIL A-3/B-1)
    // An empty string satisfies @IsString/@MaxLength — only @IsNotEmpty catches it.
    // Without @IsNotEmpty this reaches the service with session === '', and
    // isDecoySession('') is false, so the empty session would flow through to a
    // real user lookup and a live microservice call.
    it('rejects an empty session with 400 (l)', async () => {
      await request(app.getHttpServer())
        .post('/login/otp/verify')
        .send({ ...base, session: '' })
        .expect(HttpStatus.BAD_REQUEST);

      expect(verifyOtp).not.toHaveBeenCalled();
    });

    it('rejects an extra field with 400 (forbidNonWhitelisted)', async () => {
      await request(app.getHttpServer())
        .post('/login/otp/verify')
        .send({ ...base, extra: 'nope' })
        .expect(HttpStatus.BAD_REQUEST);

      expect(verifyOtp).not.toHaveBeenCalled();
    });
  });
});
