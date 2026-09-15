// @akili-spec bilateral/bulk-uploader-handoff (BIL-HO-T-4, requirements.md §6
// R-2, R-3, R-4, R-5, R-7, R-8, R-9, R-11, R-20, R-21, R-30)

import {
  BadRequestException,
  ForbiddenException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { createHash } from 'crypto';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { BilateralHandoffCode } from '../entities/bilateral-handoff-code.entity';
import { RoleByUserRepository } from '../../../auth/modules/role-by-user/RoleByUser.repository';
import { UserRepository } from '../../../auth/modules/user/repositories/user.repository';
import { ClarisaCentersRepository } from '../../../clarisa/clarisa-centers/clarisa-centers.repository';
import { ClarisaInstitutionsRepository } from '../../../clarisa/clarisa-institutions/ClariasaInstitutions.repository';
import { VersioningService } from '../../versioning/versioning.service';
import { BilateralHandoffService } from './bilateral-handoff.service';

/** Independent source of truth — never derived the way the service derives it. */
const sha256 = (value: string) =>
  createHash('sha256').update(value).digest('hex');

/**
 * Recursively extracts a key tree (top-level + each nested object's keys, sorted),
 * per the task brief's fixture-comparison contract — values are mock-derived and
 * deliberately NOT compared, only the shape (D5: a renamed key must go red).
 */
function keyTree(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(keyTree);
  }
  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = keyTree((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }
  return typeof value;
}

/**
 * Chainable TypeORM QueryBuilder mock. Covers three chains the service issues
 * through the same `repository.createQueryBuilder()` entry point:
 *  - update:  `.update().set().where().andWhere().execute()`      (invalidate, consume)
 *  - insert:  `.insert().into().values().execute()`               (mint, S5 — SQL-side expiry)
 *  - select:  `.select().addSelect().where().getRawOne()`         (E2 rejection classifier)
 */
function makeQueryBuilder(executeResult: { affected: number }) {
  const qb: any = {};
  qb.update = jest.fn().mockReturnValue(qb);
  qb.set = jest.fn().mockReturnValue(qb);
  qb.where = jest.fn().mockReturnValue(qb);
  qb.andWhere = jest.fn().mockReturnValue(qb);
  qb.execute = jest.fn().mockResolvedValue(executeResult);
  qb.insert = jest.fn().mockReturnValue(qb);
  qb.into = jest.fn().mockReturnValue(qb);
  qb.values = jest.fn().mockReturnValue(qb);
  qb.select = jest.fn().mockReturnValue(qb);
  qb.addSelect = jest.fn().mockReturnValue(qb);
  qb.getRawOne = jest.fn().mockResolvedValue(undefined);
  return qb;
}

describe('BilateralHandoffService (BIL-HO-T-4)', () => {
  let service: BilateralHandoffService;
  let handoffRepo: Partial<
    Record<keyof Repository<BilateralHandoffCode>, jest.Mock>
  >;
  let roleByUserRepository: {
    isUserAdmin: jest.Mock;
    validationCenterPermissions: jest.Mock;
    findOne: jest.Mock;
  };
  let clarisaCentersRepository: { findOne: jest.Mock };
  let clarisaInstitutionsRepository: { findOne: jest.Mock };
  let userRepository: { getUserById: jest.Mock };
  let versioningService: { $_findActivePhase: jest.Mock };
  let loggerSpy: jest.SpyInstance;

  const ENV = {
    BULK_HANDOFF_CALLBACK_URL: 'https://partner.example.org/entry',
    BULK_HANDOFF_AUDIENCES:
      'w3-bilateral-uploader:test,w3-bilateral-uploader:staging',
    BULK_HANDOFF_ENV: 'test',
    FRONT_END_PDF_ENDPOINT:
      'https://reporting.cgiar.org/reports/result-details/',
  };

  const sessionUser = {
    id: 55,
    email: 'u@icrisat.org',
    first_name: 'U',
    last_name: 'Ser',
    auth_method: 'otp' as const,
  };

  beforeEach(async () => {
    Object.entries(ENV).forEach(([k, v]) => (process.env[k] = v));

    handoffRepo = {
      createQueryBuilder: jest.fn(),
      findOne: jest.fn(),
      query: jest.fn().mockResolvedValue(undefined),
    };

    roleByUserRepository = {
      isUserAdmin: jest.fn().mockResolvedValue(false),
      validationCenterPermissions: jest.fn().mockResolvedValue(1),
      findOne: jest.fn().mockResolvedValue({
        role: 9,
        obj_role: { description: 'Center User' },
      }),
    };

    clarisaCentersRepository = {
      findOne: jest.fn().mockResolvedValue({
        code: 'CENTER-05',
        institutionId: 42,
      }),
    };

    clarisaInstitutionsRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: 42,
        name: 'Africa Rice Center',
        acronym: 'AfricaRice',
      }),
    };

    userRepository = {
      getUserById: jest.fn().mockResolvedValue({
        id: 55,
        email: 'u@icrisat.org',
        first_name: 'U',
        last_name: 'Ser',
      }),
    };

    versioningService = {
      $_findActivePhase: jest.fn().mockResolvedValue({
        id: 17,
        phase_name: '2026 Annual Reporting',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BilateralHandoffService,
        {
          provide: getRepositoryToken(BilateralHandoffCode),
          useValue: handoffRepo,
        },
        { provide: RoleByUserRepository, useValue: roleByUserRepository },
        {
          provide: ClarisaCentersRepository,
          useValue: clarisaCentersRepository,
        },
        {
          provide: ClarisaInstitutionsRepository,
          useValue: clarisaInstitutionsRepository,
        },
        { provide: UserRepository, useValue: userRepository },
        { provide: VersioningService, useValue: versioningService },
      ],
    }).compile();

    service = module.get<BilateralHandoffService>(BilateralHandoffService);
    loggerSpy = jest.spyOn((service as any).logger, 'log').mockImplementation();
    jest.spyOn((service as any).logger, 'warn').mockImplementation();
  });

  afterEach(() => {
    Object.keys(ENV).forEach((k) => delete process.env[k]);
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  // ---------------------------------------------------------------------------
  // R-2 — minting requires a role on the centre
  // ---------------------------------------------------------------------------
  describe('start — R-2 authorisation', () => {
    it('admin scenario: mints even with no role_by_user row on the centre', async () => {
      roleByUserRepository.isUserAdmin.mockResolvedValue(true);
      handoffRepo.createQueryBuilder.mockReturnValue(
        makeQueryBuilder({ affected: 0 }),
      );

      const result = await service.start(sessionUser, {
        center_code: 'CENTER-11',
      });

      expect(result.code).toHaveLength(43);
      expect(
        roleByUserRepository.validationCenterPermissions,
      ).not.toHaveBeenCalled();
    });

    it('user of another centre scenario: 403, no row written, message does not name the centre', async () => {
      roleByUserRepository.isUserAdmin.mockResolvedValue(false);
      roleByUserRepository.validationCenterPermissions.mockResolvedValue(0);

      await expect(
        service.start(sessionUser, { center_code: 'CENTER-11' }),
      ).rejects.toThrow(ForbiddenException);

      // The forbidden check throws before S4/S5 — no query builder chain (invalidate
      // or mint) is ever opened.
      expect(handoffRepo.createQueryBuilder).not.toHaveBeenCalled();
      try {
        await service.start(sessionUser, { center_code: 'CENTER-11' });
      } catch (error) {
        expect((error as ForbiddenException).message).not.toContain(
          'CENTER-11',
        );
      }
    });
  });

  // ---------------------------------------------------------------------------
  // R-3 — code shape, lifetime and storage
  // ---------------------------------------------------------------------------
  describe('start — R-3 code shape, lifetime, storage', () => {
    let qb: ReturnType<typeof makeQueryBuilder>;

    beforeEach(() => {
      qb = makeQueryBuilder({ affected: 0 });
      handoffRepo.createQueryBuilder.mockReturnValue(qb);
    });

    it('mints a 43-char base64url code and stores only its SHA-256 hex, never the plaintext', async () => {
      const result = await service.start(sessionUser, {
        center_code: 'CENTER-05',
      });

      expect(result.code).toMatch(/^[A-Za-z0-9_-]{43}$/);

      const inserted = qb.values.mock.calls[0][0];
      expect(inserted.code_hash).toBe(sha256(result.code));
      expect(inserted.code_hash).toMatch(/^[0-9a-f]{64}$/);
      expect(JSON.stringify(inserted)).not.toContain(result.code);
    });

    // 2026-09-15 HITL rework: `new Date(Date.now() + 120_000)` serialises in the
    // Node process's local time zone (UTC-5 in Bogotá) while MySQL's session
    // clock (`NOW()`) is UTC on the dev server — `expires_at` landed 5h in the
    // past. Falsifying input: reverting the mint to `new Date(...)` turns this red.
    it('mints with a SQL-side expiry — no JS Date, a DATE_ADD(NOW(), INTERVAL 120 SECOND) expression', async () => {
      await service.start(sessionUser, { center_code: 'CENTER-05' });

      const inserted = qb.values.mock.calls[0][0];
      expect(inserted.expires_at).not.toBeInstanceOf(Date);
      expect(typeof inserted.expires_at).toBe('function');
      expect(inserted.expires_at()).toBe(
        'DATE_ADD(NOW(), INTERVAL 120 SECOND)',
      );
    });

    it('never stores the user email or a claims payload on the row', async () => {
      await service.start(sessionUser, { center_code: 'CENTER-05' });

      const inserted = qb.values.mock.calls[0][0];
      expect(inserted).not.toHaveProperty('email');
      expect(inserted).not.toHaveProperty('claims');
    });
  });

  // ---------------------------------------------------------------------------
  // R-4 — one live code per user
  // ---------------------------------------------------------------------------
  describe('start — R-4 one live code per user', () => {
    it("invalidates the user's other live codes before minting a new one", async () => {
      // Both the invalidation UPDATE (S4) and the mint INSERT (S5) go through the
      // same `repository.createQueryBuilder()` entry point — one shared qb mock.
      const qb = makeQueryBuilder({ affected: 1 });
      handoffRepo.createQueryBuilder.mockReturnValue(qb);

      await service.start(sessionUser, { center_code: 'CENTER-05' });

      expect(qb.where).toHaveBeenCalledWith('user_id = :userId', {
        userId: 55,
      });
      expect(qb.andWhere).toHaveBeenCalledWith('consumed_at IS NULL');
      expect(qb.andWhere).toHaveBeenCalledWith('expires_at > NOW()');
      expect(qb.set).toHaveBeenCalledWith(
        expect.objectContaining({ consumed_by_platform_acronym: 'superseded' }),
      );

      // Exactly one invalidate UPDATE + one mint INSERT.
      const executeOrders = (qb.execute as jest.Mock).mock.invocationCallOrder;
      expect(executeOrders).toHaveLength(2);
      expect(qb.values).toHaveBeenCalledTimes(1);
      // Ordering proof: compare the two distinguishable entry points on the
      // shared builder (`.update()` opens the invalidate chain, `.insert()`
      // opens the mint chain) — `qb.execute`'s own invocationCallOrder can't
      // prove this since it's the same mock called twice either way.
      expect(qb.update.mock.invocationCallOrder[0]).toBeLessThan(
        qb.insert.mock.invocationCallOrder[0],
      );
    });
  });

  // ---------------------------------------------------------------------------
  // R-5 — start response and redirect URL
  // ---------------------------------------------------------------------------
  describe('start — R-5 response and redirect URL', () => {
    beforeEach(() => {
      handoffRepo.createQueryBuilder.mockReturnValue(
        makeQueryBuilder({ affected: 0 }),
      );
    });

    it('happy path: 200 shape with expires_in 120 and a redirect_url with trailing slash, code & env', async () => {
      const result = await service.start(sessionUser, {
        center_code: 'CENTER-05',
        audience: 'w3-bilateral-uploader:test',
      });

      expect(result.expires_in).toBe(120);
      expect(result.code).toHaveLength(43);
      expect(
        result.redirect_url.startsWith('https://partner.example.org/entry/'),
      ).toBe(true);
      const url = new URL(result.redirect_url);
      expect(url.pathname.endsWith('/')).toBe(true);
      expect(url.searchParams.get('code')).toBe(result.code);
      expect(url.searchParams.get('env')).toBe('test');

      // Verification gap (task brief): the logger never receives the plaintext
      // code or its hash, in any argument, on the happy path either.
      expect(JSON.stringify(loggerSpy.mock.calls)).not.toContain(result.code);
      expect(JSON.stringify(loggerSpy.mock.calls)).not.toContain(
        sha256(result.code),
      );
    });

    it('does not include any claim data in the response (no e-mail, centre name or role)', async () => {
      const result = await service.start(sessionUser, {
        center_code: 'CENTER-05',
      });

      const serialised = JSON.stringify(result);
      expect(serialised).not.toContain('u@icrisat.org');
      expect(serialised).not.toContain('AfricaRice');
      expect(Object.keys(result).sort()).toEqual([
        'code',
        'expires_in',
        'redirect_url',
      ]);
    });
  });

  // ---------------------------------------------------------------------------
  // R-30 — explicit audience
  // ---------------------------------------------------------------------------
  describe('start — R-30 audience allow-list', () => {
    let qb: ReturnType<typeof makeQueryBuilder>;

    beforeEach(() => {
      qb = makeQueryBuilder({ affected: 0 });
      handoffRepo.createQueryBuilder.mockReturnValue(qb);
    });

    it('uses the first configured audience as the default when none is requested', async () => {
      await service.start(sessionUser, { center_code: 'CENTER-05' });

      const inserted = qb.values.mock.calls[0][0];
      expect(inserted.audience).toBe('w3-bilateral-uploader:test');
    });

    it('accepts an explicit, configured audience', async () => {
      await service.start(sessionUser, {
        center_code: 'CENTER-05',
        audience: 'w3-bilateral-uploader:staging',
      });

      const inserted = qb.values.mock.calls[0][0];
      expect(inserted.audience).toBe('w3-bilateral-uploader:staging');
    });

    it('rejects an unconfigured audience with 400, writing no row, and logs bad_audience', async () => {
      await expect(
        service.start(sessionUser, {
          center_code: 'CENTER-05',
          audience: 'not-configured',
        }),
      ).rejects.toThrow(BadRequestException);

      // The audience rejection throws before S4/S5 — no query builder chain opens.
      expect(handoffRepo.createQueryBuilder).not.toHaveBeenCalled();

      const startCalls = loggerSpy.mock.calls.filter((call) =>
        String(call[0]).includes('handoff.start'),
      );
      expect(
        startCalls.some((call) => {
          const payload = JSON.parse(call[0] as string);
          return (
            payload.outcome === 'bad_audience' &&
            payload.audience === 'not-configured'
          );
        }),
      ).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Assumption: missing config → 503 (see report)
  // ---------------------------------------------------------------------------
  describe('start — missing configuration', () => {
    it('answers 503 when the callback URL is not configured', async () => {
      delete process.env.BULK_HANDOFF_CALLBACK_URL;

      await expect(
        service.start(sessionUser, { center_code: 'CENTER-05' }),
      ).rejects.toThrow(ServiceUnavailableException);
      expect(handoffRepo.createQueryBuilder).not.toHaveBeenCalled();
      // Verification gap: misconfiguration MUST be detected before any
      // authorisation lookup runs.
      expect(roleByUserRepository.isUserAdmin).not.toHaveBeenCalled();
      expect(
        roleByUserRepository.validationCenterPermissions,
      ).not.toHaveBeenCalled();
    });

    it('answers 503 when the audience allow-list is empty', async () => {
      process.env.BULK_HANDOFF_AUDIENCES = '';

      await expect(
        service.start(sessionUser, { center_code: 'CENTER-05' }),
      ).rejects.toThrow(ServiceUnavailableException);
      expect(handoffRepo.createQueryBuilder).not.toHaveBeenCalled();
      expect(roleByUserRepository.isUserAdmin).not.toHaveBeenCalled();
      expect(
        roleByUserRepository.validationCenterPermissions,
      ).not.toHaveBeenCalled();
    });

    it('answers 503 when BULK_HANDOFF_ENV is unset, writing no row and never logging "minted"', async () => {
      delete process.env.BULK_HANDOFF_ENV;

      await expect(
        service.start(sessionUser, { center_code: 'CENTER-05' }),
      ).rejects.toThrow(ServiceUnavailableException);

      expect(handoffRepo.createQueryBuilder).not.toHaveBeenCalled();
      expect(roleByUserRepository.isUserAdmin).not.toHaveBeenCalled();
      expect(
        roleByUserRepository.validationCenterPermissions,
      ).not.toHaveBeenCalled();
      const startCalls = loggerSpy.mock.calls.filter((call) =>
        String(call[0]).includes('handoff.start'),
      );
      expect(
        startCalls.some((call) =>
          String(call[0]).includes('"outcome":"minted"'),
        ),
      ).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // R-7 — single, atomic redemption
  // ---------------------------------------------------------------------------
  describe('exchange — R-7 single atomic redemption', () => {
    it('replay: a second redemption of the same code answers 400 (affected 0)', async () => {
      handoffRepo.createQueryBuilder.mockReturnValue(
        makeQueryBuilder({ affected: 0 }),
      );
      handoffRepo.findOne.mockResolvedValue({
        code_hash: sha256('irrelevant'),
        consumed_at: new Date(),
        expires_at: new Date(Date.now() + 60_000),
        audience: 'w3-bilateral-uploader:test',
      });

      await expect(
        service.exchange({
          code: 'irrelevant',
          audience: 'w3-bilateral-uploader:test',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('success: affected 1 returns claims and never re-reads the row before the UPDATE', async () => {
      const qb = makeQueryBuilder({ affected: 1 });
      handoffRepo.createQueryBuilder.mockReturnValue(qb);
      handoffRepo.findOne.mockResolvedValue({
        code_hash: sha256('a-code'),
        user_id: 55,
        center_code: 'CENTER-05',
        audience: 'w3-bilateral-uploader:test',
        auth_method: 'otp',
        consumed_at: new Date(),
        expires_at: new Date(Date.now() + 60_000),
      });

      const claims = await service.exchange({
        code: 'a-code',
        audience: 'w3-bilateral-uploader:test',
      });

      expect(claims.user.user_id).toBe(55);
      // The UPDATE is issued via createQueryBuilder before any findOne of the row.
      const updateOrder = (qb.execute as jest.Mock).mock.invocationCallOrder[0];
      const findOrder = (handoffRepo.findOne as jest.Mock).mock
        .invocationCallOrder[0];
      expect(updateOrder).toBeLessThan(findOrder);
    });
  });

  // ---------------------------------------------------------------------------
  // R-8 — indistinguishable failures
  // ---------------------------------------------------------------------------
  describe('exchange — R-8 indistinguishable failures', () => {
    // 2026-09-15 HITL rework: the classifier now derives its reason from a
    // `getRawOne()` shaped exactly like the SQL projection in `classifyRejection`
    // (`consumed_at IS NOT NULL`, `expires_at <= NOW()`, `audience`) — never from
    // a JS `Date.now()` comparison against a fetched row.
    it.each([
      ['never-issued code', undefined, 'unknown'],
      [
        'expired code',
        { consumed: 0, expired: 1, audience: 'w3-bilateral-uploader:test' },
        'expired',
      ],
      [
        'consumed code',
        { consumed: 1, expired: 0, audience: 'w3-bilateral-uploader:test' },
        'consumed',
      ],
      [
        'wrong-audience code',
        { consumed: 0, expired: 0, audience: 'other-aud' },
        'audience',
      ],
    ])(
      'probing: %s answers the same 400 body and never logs the submitted code',
      async (_label, rawRow, expectedReason) => {
        const qb = makeQueryBuilder({ affected: 0 });
        qb.getRawOne.mockResolvedValue(rawRow);
        handoffRepo.createQueryBuilder.mockReturnValue(qb);

        const submittedCode = 'super-secret-probe-code';
        let caught: BadRequestException | undefined;
        try {
          await service.exchange({
            code: submittedCode,
            audience: 'w3-bilateral-uploader:test',
          });
        } catch (error) {
          caught = error as BadRequestException;
        }

        expect(caught).toBeInstanceOf(BadRequestException);
        expect(caught!.message).toBe('Invalid or expired code');

        const exchangeCalls = loggerSpy.mock.calls.filter((call) =>
          String(call[0]).includes('handoff.exchange'),
        );
        const payload = JSON.parse(exchangeCalls[0][0] as string);
        expect(payload.outcome).toBe(`rejected:${expectedReason}`);

        for (const call of loggerSpy.mock.calls) {
          const serialised = JSON.stringify(call);
          expect(serialised).not.toContain(submittedCode);
          expect(serialised).not.toContain(sha256(submittedCode));
        }
      },
    );
  });

  // ---------------------------------------------------------------------------
  // R-9 — claims payload
  // ---------------------------------------------------------------------------
  describe('exchange — R-9 claims payload', () => {
    it('claims for an OTP user match the contract v0.3 §4 key tree (fixture), auth_method "otp", no project/programs', async () => {
      handoffRepo.createQueryBuilder.mockReturnValue(
        makeQueryBuilder({ affected: 1 }),
      );
      handoffRepo.findOne.mockResolvedValue({
        code_hash: sha256('otp-code'),
        user_id: 55,
        center_code: 'CENTER-05',
        audience: 'w3-bilateral-uploader:test',
        auth_method: 'otp',
      });

      const claims = await service.exchange({
        code: 'otp-code',
        audience: 'w3-bilateral-uploader:test',
      });

      expect(claims.user.auth_method).toBe('otp');
      expect(claims.center.clarisa_code).toBe('CENTER-05');
      expect(claims.role.is_admin).toBe(false);
      expect(claims.reporting_phase.status).toBe('open');
      expect(claims).not.toHaveProperty('project');
      expect(claims).not.toHaveProperty('programs');

      // Fixture ↔ output key-tree equality (D5) — the fixture is authored BY HAND
      // from contract v0.3 §4, not derived from this run (never toMatchSnapshot).
      const fixture = JSON.parse(
        fs.readFileSync(
          path.join(__dirname, '../fixtures/handoff-claims.v0.3.json'),
          'utf8',
        ),
      );
      expect(keyTree(claims)).toEqual(keyTree(fixture));
    });

    it('legacy session: auth_method is null but the exchange still succeeds', async () => {
      handoffRepo.createQueryBuilder.mockReturnValue(
        makeQueryBuilder({ affected: 1 }),
      );
      handoffRepo.findOne.mockResolvedValue({
        code_hash: sha256('legacy-code'),
        user_id: 55,
        center_code: 'CENTER-05',
        audience: 'w3-bilateral-uploader:test',
        auth_method: null,
      });

      const claims = await service.exchange({
        code: 'legacy-code',
        audience: 'w3-bilateral-uploader:test',
      });

      expect(claims.user.auth_method).toBeNull();
    });

    it('Center User scenario: role.is_admin is false when isUserAdmin resolves null (no admin role_by_user row)', async () => {
      handoffRepo.createQueryBuilder.mockReturnValue(
        makeQueryBuilder({ affected: 1 }),
      );
      handoffRepo.findOne.mockResolvedValue({
        code_hash: sha256('center-user-code'),
        user_id: 55,
        center_code: 'CENTER-05',
        audience: 'w3-bilateral-uploader:test',
        auth_method: 'otp',
      });
      // The real shape a Center User's row produces (`RoleByUser.repository.ts`
      // returns `null`, not `false`, when no admin row exists) — attempt 1
      // mocked `false` here and never saw this.
      roleByUserRepository.isUserAdmin.mockResolvedValue(null);

      const claims = await service.exchange({
        code: 'center-user-code',
        audience: 'w3-bilateral-uploader:test',
      });

      expect(claims.role.is_admin).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // R-11 — audit, and nothing sensitive in logs
  // ---------------------------------------------------------------------------
  describe('exchange — R-11 audit and log hygiene', () => {
    it('failed redemption is logged with platform + outcome, never the code or its hash', async () => {
      // Default qb.getRawOne() resolves `undefined` (never-issued code) →
      // classifyRejection returns 'unknown'.
      handoffRepo.createQueryBuilder.mockReturnValue(
        makeQueryBuilder({ affected: 0 }),
      );

      const submittedCode = 'unknown-code-value';
      await expect(
        service.exchange(
          { code: submittedCode, audience: 'w3-bilateral-uploader:test' },
          { id: 9, name: 'Bulk Results Uploader', acronym: 'W3-BULK' },
        ),
      ).rejects.toThrow(BadRequestException);

      const exchangeCalls = loggerSpy.mock.calls.filter((call) =>
        String(call[0]).includes('handoff.exchange'),
      );
      expect(exchangeCalls.length).toBeGreaterThan(0);
      const payload = JSON.parse(exchangeCalls[0][0] as string);
      expect(payload.platformId).toBe(9);
      expect(payload.platformAcronym).toBe('W3-BULK');
      expect(payload.outcome).toBe('rejected:unknown');

      for (const call of loggerSpy.mock.calls) {
        const serialised = JSON.stringify(call);
        expect(serialised).not.toContain(submittedCode);
        expect(serialised).not.toContain(sha256(submittedCode));
      }
    });

    it('successful exchange logs platform, user and centre, never the code', async () => {
      handoffRepo.createQueryBuilder.mockReturnValue(
        makeQueryBuilder({ affected: 1 }),
      );
      handoffRepo.findOne.mockResolvedValue({
        code_hash: sha256('ok-code'),
        user_id: 55,
        center_code: 'CENTER-05',
        audience: 'w3-bilateral-uploader:test',
        auth_method: 'otp',
      });

      await service.exchange(
        { code: 'ok-code', audience: 'w3-bilateral-uploader:test' },
        { id: 9, name: 'Bulk Results Uploader', acronym: 'W3-BULK' },
      );

      const exchangeCalls = loggerSpy.mock.calls.filter((call) =>
        String(call[0]).includes('handoff.exchange'),
      );
      const payload = JSON.parse(exchangeCalls[0][0] as string);
      expect(payload.outcome).toBe('redeemed');
      expect(payload.userId).toBe(55);
      expect(payload.centerCode).toBe('CENTER-05');
      // R-11: audience is a mandatory field of the successful exchange audit
      // record; design.md §9 was corrected in the same pass to list it.
      expect(payload.audience).toBe('w3-bilateral-uploader:test');

      for (const call of loggerSpy.mock.calls) {
        expect(JSON.stringify(call)).not.toContain('ok-code');
      }
    });
  });

  // ---------------------------------------------------------------------------
  // R-20 — opportunistic purge, best-effort
  // ---------------------------------------------------------------------------
  describe('start — R-20 opportunistic purge', () => {
    it('a purge failure is swallowed — the mint still succeeds', async () => {
      handoffRepo.createQueryBuilder.mockReturnValue(
        makeQueryBuilder({ affected: 0 }),
      );
      (handoffRepo.query as jest.Mock).mockRejectedValueOnce(
        new Error('db down'),
      );

      const result = await service.start(sessionUser, {
        center_code: 'CENTER-05',
      });

      expect(result.code).toHaveLength(43);
      expect(handoffRepo.query).toHaveBeenCalledTimes(1);
    });
  });

  // ---------------------------------------------------------------------------
  // R-21 — `iat` at redemption time
  // ---------------------------------------------------------------------------
  describe('exchange — R-21 iat at redemption time', () => {
    it('iat is Unix seconds at redemption, not mint time', async () => {
      handoffRepo.createQueryBuilder.mockReturnValue(
        makeQueryBuilder({ affected: 1 }),
      );
      handoffRepo.findOne.mockResolvedValue({
        code_hash: sha256('timed-code'),
        user_id: 55,
        center_code: 'CENTER-05',
        audience: 'w3-bilateral-uploader:test',
        auth_method: 'otp',
      });

      jest.useFakeTimers().setSystemTime(new Date('2026-09-15T12:00:00.000Z'));

      const claims = await service.exchange({
        code: 'timed-code',
        audience: 'w3-bilateral-uploader:test',
      });

      expect(claims.iat).toBe(
        Math.floor(new Date('2026-09-15T12:00:00.000Z').getTime() / 1000),
      );
    });
  });
});
