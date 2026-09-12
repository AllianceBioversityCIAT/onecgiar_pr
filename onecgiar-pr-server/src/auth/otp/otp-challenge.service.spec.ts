// @akili-spec changes/cognito-email-otp-login (OTP-T-16, design.md §19.1,
// requirements.md §15 OTP-R-37) — PRMS owns the code lifecycle: generate, store
// only HMACs, count attempts, consume once, purge.

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { createHmac } from 'crypto';
import { IsNull, LessThan, Repository } from 'typeorm';
import { OtpChallenge } from './otp-challenge.entity';
import {
  OTP_CHALLENGE_MAX_ATTEMPTS,
  OTP_CHALLENGE_TTL_MS,
  OtpChallengeService,
} from './otp-challenge.service';

describe('OtpChallengeService (OTP-T-16)', () => {
  let service: OtpChallengeService;
  let repository: Repository<OtpChallenge>;

  const SKEY = 'test-secret';

  // Independent source of truth for the two derivations — recomputed here from
  // the documented construction, not read back from the service.
  const derivedKey = (tag: string) =>
    createHmac('sha256', Buffer.from(SKEY)).update(tag).digest();
  const expectedEmailHash = (email: string) =>
    createHmac('sha256', derivedKey('otp-challenge-email\0'))
      .update(email)
      .digest('hex');
  const expectedCodeHmac = (nonce: string, code: string) =>
    createHmac('sha256', derivedKey('otp-challenge-code\0'))
      .update(`${nonce}|${code}`)
      .digest('hex');

  beforeEach(async () => {
    process.env.JWT_SKEY = SKEY;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OtpChallengeService,
        {
          provide: getRepositoryToken(OtpChallenge),
          useValue: {
            save: jest.fn().mockImplementation((row) => Promise.resolve(row)),
            findOne: jest.fn(),
            increment: jest.fn().mockResolvedValue({ affected: 1 }),
            update: jest.fn().mockResolvedValue({ affected: 1 }),
            delete: jest.fn().mockResolvedValue({ affected: 0 }),
          },
        },
      ],
    }).compile();

    service = module.get<OtpChallengeService>(OtpChallengeService);
    repository = module.get<Repository<OtpChallenge>>(
      getRepositoryToken(OtpChallenge),
    );
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('mints a 6-digit zero-padded code, a 22-char base64url nonce and a 5-minute expiry', async () => {
      const before = Date.now();

      const challenge = await service.create('a@icrisat.org');

      expect(challenge.code).toMatch(/^\d{6}$/);
      expect(challenge.nonce).toMatch(/^[A-Za-z0-9_-]{22}$/);
      expect(OTP_CHALLENGE_TTL_MS).toBe(5 * 60 * 1000);
      expect(challenge.expiresAt.getTime()).toBeGreaterThanOrEqual(
        before + OTP_CHALLENGE_TTL_MS,
      );
      expect(challenge.expiresAt.getTime()).toBeLessThanOrEqual(
        Date.now() + OTP_CHALLENGE_TTL_MS,
      );
    });

    it('stores HMACs only — never the plaintext email or code (OTP-R-11, OTP-R-37)', async () => {
      const challenge = await service.create('a@icrisat.org');

      expect(repository.save).toHaveBeenCalledTimes(1);
      const saved = (repository.save as jest.Mock).mock.calls[0][0];

      expect(saved).toEqual({
        nonce: challenge.nonce,
        email_hash: expectedEmailHash('a@icrisat.org'),
        code_hmac: expectedCodeHmac(challenge.nonce, challenge.code),
        expires_at: challenge.expiresAt,
        attempts: 0,
        consumed_at: null,
      });

      const serialised = JSON.stringify(saved);
      expect(serialised).not.toContain('a@icrisat.org');
      expect(serialised).not.toContain(challenge.code);
    });

    it('normalises the email before hashing, so casing and padding cannot fork a challenge', async () => {
      await service.create('  A@Icrisat.ORG ');

      expect((repository.save as jest.Mock).mock.calls[0][0].email_hash).toBe(
        expectedEmailHash('a@icrisat.org'),
      );
    });

    it('mints a different nonce and code on every call', async () => {
      const a = await service.create('a@icrisat.org');
      const b = await service.create('a@icrisat.org');

      expect(a.nonce).not.toBe(b.nonce);
      expect(
        (repository.save as jest.Mock).mock.calls[0][0].code_hmac,
      ).not.toBe((repository.save as jest.Mock).mock.calls[1][0].code_hmac);
    });

    it('purges expired rows opportunistically without failing the start when the purge throws', async () => {
      jest
        .spyOn(repository, 'delete')
        .mockRejectedValueOnce(new Error('db down'));

      await expect(service.create('a@icrisat.org')).resolves.toEqual(
        expect.objectContaining({ code: expect.any(String) }),
      );
      expect(repository.delete).toHaveBeenCalledTimes(1);
    });
  });

  describe('purgeExpired', () => {
    it('deletes rows whose expiry is older than the retention window (default 60 min)', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-09-12T12:00:00.000Z'));

      await service.purgeExpired();

      expect(repository.delete).toHaveBeenCalledWith({
        expires_at: LessThan(new Date('2026-09-12T11:00:00.000Z')),
      });

      jest.useRealTimers();
    });

    it('honours an explicit window', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-09-12T12:00:00.000Z'));

      await service.purgeExpired(10);

      expect(repository.delete).toHaveBeenCalledWith({
        expires_at: LessThan(new Date('2026-09-12T11:50:00.000Z')),
      });

      jest.useRealTimers();
    });
  });

  describe('findActive', () => {
    it('looks the challenge up by its nonce', async () => {
      const row = { nonce: 'n'.repeat(22) } as OtpChallenge;
      jest.spyOn(repository, 'findOne').mockResolvedValue(row);

      await expect(service.findActive('n'.repeat(22))).resolves.toBe(row);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { nonce: 'n'.repeat(22) },
      });
    });

    it('returns null when the nonce belongs to no challenge (a decoy session)', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);

      await expect(service.findActive('n'.repeat(22))).resolves.toBeNull();
    });
  });

  describe('registerAttempt / consume (OTP-R-37 concurrency, reviewer advisory)', () => {
    it('increments the attempt counter for one nonce, conditioned on being under the ceiling', async () => {
      await service.registerAttempt('abc');

      expect(repository.increment).toHaveBeenCalledWith(
        { nonce: 'abc', attempts: LessThan(OTP_CHALLENGE_MAX_ATTEMPTS) },
        'attempts',
        1,
      );
    });

    it('returns the affected count — 0 when the conditional increment loses the race', async () => {
      await expect(service.registerAttempt('abc')).resolves.toBe(1);

      jest
        .spyOn(repository, 'increment')
        .mockResolvedValueOnce({ affected: 0 } as any);
      await expect(service.registerAttempt('abc')).resolves.toBe(0);
    });

    it('stamps consumed_at only while still unconsumed, so a code can never be replayed', async () => {
      await service.consume('abc');

      expect(repository.update).toHaveBeenCalledWith(
        { nonce: 'abc', consumed_at: IsNull() },
        { consumed_at: expect.any(Date) },
      );
    });

    it('returns true only for the call that wins the race — a second consume on the same nonce returns false', async () => {
      await expect(service.consume('abc')).resolves.toBe(true);

      jest
        .spyOn(repository, 'update')
        .mockResolvedValueOnce({ affected: 0 } as any);
      await expect(service.consume('abc')).resolves.toBe(false);
    });
  });

  describe('matchesCode', () => {
    it('accepts the code that produced the stored HMAC', async () => {
      const challenge = await service.create('a@icrisat.org');
      const row = {
        nonce: challenge.nonce,
        code_hmac: expectedCodeHmac(challenge.nonce, challenge.code),
      } as OtpChallenge;

      expect(service.matchesCode(row, challenge.code)).toBe(true);
    });

    it('rejects a wrong code, a wrong nonce and a malformed stored HMAC', () => {
      const nonce = 'n'.repeat(22);
      const row = {
        nonce,
        code_hmac: expectedCodeHmac(nonce, '123456'),
      } as OtpChallenge;

      expect(service.matchesCode(row, '123457')).toBe(false);
      expect(
        service.matchesCode({ ...row, nonce: 'm'.repeat(22) }, '123456'),
      ).toBe(false);
      expect(
        service.matchesCode({ ...row, code_hmac: 'short' }, '123456'),
      ).toBe(false);
      expect(service.matchesCode(row, '')).toBe(false);
    });
  });

  describe('key derivation', () => {
    it('domain-separates the email and code keys, and never uses JWT_SKEY directly', async () => {
      const challenge = await service.create('a@icrisat.org');
      const saved = (repository.save as jest.Mock).mock.calls[0][0];

      // The two derivations must not collide…
      expect(saved.email_hash).not.toBe(saved.code_hmac);
      // …and neither is the raw-key HMAC an unseparated implementation would emit.
      expect(saved.email_hash).not.toBe(
        createHmac('sha256', Buffer.from(SKEY))
          .update('a@icrisat.org')
          .digest('hex'),
      );
      expect(saved.code_hmac).not.toBe(
        createHmac('sha256', Buffer.from(SKEY))
          .update(`${challenge.nonce}|${challenge.code}`)
          .digest('hex'),
      );
    });

    it('falls back to a per-process random key when JWT_SKEY is unset (never the empty key)', async () => {
      const original = process.env.JWT_SKEY;
      delete process.env.JWT_SKEY;

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          OtpChallengeService,
          {
            provide: getRepositoryToken(OtpChallenge),
            useValue: {
              save: jest.fn().mockImplementation((row) => Promise.resolve(row)),
              delete: jest.fn().mockResolvedValue({ affected: 0 }),
            },
          },
        ],
      }).compile();
      const keyless = module.get<OtpChallengeService>(OtpChallengeService);
      const keylessRepo = module.get(getRepositoryToken(OtpChallenge));

      await keyless.create('a@icrisat.org');
      const saved = (keylessRepo.save as jest.Mock).mock.calls[0][0];

      expect(saved.email_hash).toMatch(/^[0-9a-f]{64}$/);
      expect(saved.email_hash).not.toBe(expectedEmailHash('a@icrisat.org'));
      expect(saved.email_hash).not.toBe(
        createHmac('sha256', Buffer.alloc(0))
          .update('a@icrisat.org')
          .digest('hex'),
      );

      if (original === undefined) delete process.env.JWT_SKEY;
      else process.env.JWT_SKEY = original;
    });
  });

  it('exposes the 3-attempt ceiling the spec fixes (OTP-R-34 modified)', () => {
    expect(OTP_CHALLENGE_MAX_ATTEMPTS).toBe(3);
  });
});
