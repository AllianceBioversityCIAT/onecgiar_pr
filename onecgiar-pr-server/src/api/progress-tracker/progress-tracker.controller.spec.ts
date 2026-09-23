// @akili-spec changes/progress-tracker-pull-bridge/progress-tracker-indicator-mapping
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ProgressTrackerController } from './progress-tracker.controller';
import { ProgressTrackerService } from './progress-tracker.service';
import { ProgressTrackerResolveService } from './progress-tracker-resolve.service';
import { PtResultsQueryDto } from './dto/pt-results-query.dto';
import { PtReadyCountsQueryDto } from './dto/pt-ready-counts-query.dto';
import { PtResolveTriggerDto } from './dto/pt-resolve-trigger.dto';
import * as fs from 'fs';
import * as path from 'path';

/**
 * `PTM-T-4` — `PTM-AC-8`: a request carrying an out-of-whitelist param must be
 * rejected by validation and must NOT reach `ProgressTrackerService` (never mind the
 * upstream, which the service itself never calls when validation short-circuits).
 *
 * These tests boot a real Nest application around the controller and hit the routes
 * over HTTP, so they only pass if the `@Query()` parameter of each route actually
 * carries `ValidationPipe({ transform: true, whitelist: true,
 * forbidNonWhitelisted: true })`. Dropping `forbidNonWhitelisted: true` turns the
 * `evil=1` case green-when-it-should-be-red (the falsifier this task's Verification
 * section names) while leaving the `max_results=20` case red either way — that is
 * exactly why both fixtures are required, per `max_results` alone only proves
 * `@Max(10)`, not whitelisting.
 */
describe('ProgressTrackerController', () => {
  const mockProgressTrackerService = {
    getIndicatorResults: jest.fn().mockResolvedValue({
      statusCode: 200,
      message: 'Progress Tracker proposals retrieved',
      response: { status: 'ok', results: [] },
    }),
    getProgramReadyCounts: jest.fn().mockResolvedValue({
      statusCode: 200,
      message: 'Progress Tracker ready counts retrieved',
      response: { status: 'ok', items: [] },
    }),
  } as unknown as jest.Mocked<ProgressTrackerService>;

  // `PTM-T-5` — the resolve fill trigger's own service, mocked here purely so this
  // suite's `TestingModule` can resolve `ProgressTrackerController`'s (now two-arg)
  // constructor. Its own behavior is covered by
  // `progress-tracker-resolve.service.spec.ts`.
  const mockProgressTrackerResolveService = {
    resolveIndicatorMappings: jest.fn().mockResolvedValue({
      statusCode: 200,
      message: 'Progress Tracker indicator mapping fill completed',
      response: {
        status: 'ok',
        processed: 0,
        exact: 0,
        fuzzy: 0,
        unmapped: 0,
        skipped: 0,
      },
    }),
  } as unknown as jest.Mocked<ProgressTrackerResolveService>;

  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [ProgressTrackerController],
      providers: [
        {
          provide: ProgressTrackerService,
          useValue: mockProgressTrackerService,
        },
        {
          provide: ProgressTrackerResolveService,
          useValue: mockProgressTrackerResolveService,
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /indicators/:tocIndicatorId/results', () => {
    it('returns 200 and forwards the service envelope unchanged (no re-wrap, no flatten)', async () => {
      const res = await request(app.getHttpServer())
        .get('/indicators/5d51da6c6916/results')
        .expect(200);

      expect(res.body.statusCode).toBe(200);
      expect(res.body.response.status).toBe('ok');
      expect(
        mockProgressTrackerService.getIndicatorResults,
      ).toHaveBeenCalledTimes(1);
      const [tocIndicatorId, dto] =
        mockProgressTrackerService.getIndicatorResults.mock.calls[0];
      expect(tocIndicatorId).toBe('5d51da6c6916');
      expect(dto).toBeInstanceOf(PtResultsQueryDto);
      expect((dto as PtResultsQueryDto).max_results).toBe(5);
    });

    it('rejects max_results=20 with 400 (out of the 1..10 range) — PTM-R-6', async () => {
      await request(app.getHttpServer())
        .get('/indicators/5d51da6c6916/results')
        .query({ max_results: 20 })
        .expect(400);

      expect(
        mockProgressTrackerService.getIndicatorResults,
      ).not.toHaveBeenCalled();
    });

    it('PTM-AC-8 FALSIFIER FIXTURE — rejects an unknown param even alongside a valid one, and must NOT reach the service', async () => {
      await request(app.getHttpServer())
        .get('/indicators/5d51da6c6916/results')
        .query({ max_results: 5, evil: 1 })
        .expect(400);

      expect(
        mockProgressTrackerService.getIndicatorResults,
      ).not.toHaveBeenCalled();
    });

    it('PTM-AC-8 — rejects both an out-of-range known param AND an unknown param in the same request', async () => {
      const res = await request(app.getHttpServer())
        .get('/indicators/5d51da6c6916/results')
        .query({ max_results: 20, evil: 1 })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
      expect(
        mockProgressTrackerService.getIndicatorResults,
      ).not.toHaveBeenCalled();
    });
  });

  describe('GET /programs/:programId/ready-counts', () => {
    it('returns 200 and forwards the service envelope unchanged', async () => {
      const res = await request(app.getHttpServer())
        .get('/programs/fdb65d1a595c/ready-counts')
        .expect(200);

      expect(res.body.statusCode).toBe(200);
      expect(res.body.response.status).toBe('ok');
      expect(
        mockProgressTrackerService.getProgramReadyCounts,
      ).toHaveBeenCalledTimes(1);
      const [programId, dto] =
        mockProgressTrackerService.getProgramReadyCounts.mock.calls[0];
      expect(programId).toBe('fdb65d1a595c');
      expect(dto).toBeInstanceOf(PtReadyCountsQueryDto);
      expect((dto as PtReadyCountsQueryDto).min_evidence).toBe(1);
    });

    it('rejects a negative min_evidence with 400', async () => {
      await request(app.getHttpServer())
        .get('/programs/fdb65d1a595c/ready-counts')
        .query({ min_evidence: -1 })
        .expect(400);

      expect(
        mockProgressTrackerService.getProgramReadyCounts,
      ).not.toHaveBeenCalled();
    });

    it('PTM-AC-8 FALSIFIER FIXTURE — rejects an unknown param and must NOT reach the service', async () => {
      await request(app.getHttpServer())
        .get('/programs/fdb65d1a595c/ready-counts')
        .query({ min_evidence: 1, evil: 1 })
        .expect(400);

      expect(
        mockProgressTrackerService.getProgramReadyCounts,
      ).not.toHaveBeenCalled();
    });
  });

  /**
   * `PTM-T-5` — the `/resolve` fill trigger route.
   */
  describe('POST /indicator-map/resolve', () => {
    it('returns 200 and forwards the service envelope, calling the resolve service with the body DTO', async () => {
      const res = await request(app.getHttpServer())
        .post('/indicator-map/resolve')
        .send({ versionId: 42 })
        .expect(200);

      expect(res.body.statusCode).toBe(200);
      expect(res.body.response.status).toBe('ok');
      expect(
        mockProgressTrackerResolveService.resolveIndicatorMappings,
      ).toHaveBeenCalledTimes(1);
      const [dto] =
        mockProgressTrackerResolveService.resolveIndicatorMappings.mock
          .calls[0];
      expect(dto).toBeInstanceOf(PtResolveTriggerDto);
      expect((dto as PtResolveTriggerDto).versionId).toBe(42);
    });

    it('defaults to an empty body (no versionId/programId required)', async () => {
      await request(app.getHttpServer())
        .post('/indicator-map/resolve')
        .send({})
        .expect(200);

      expect(
        mockProgressTrackerResolveService.resolveIndicatorMappings,
      ).toHaveBeenCalledTimes(1);
    });

    it('rejects an unknown body field and must NOT reach the resolve service (whitelist discipline, same as the read routes)', async () => {
      await request(app.getHttpServer())
        .post('/indicator-map/resolve')
        .send({ versionId: 42, evil: 1 })
        .expect(400);

      expect(
        mockProgressTrackerResolveService.resolveIndicatorMappings,
      ).not.toHaveBeenCalled();
    });
  });

  /**
   * `design.md` §12 `PTM-DD-3` — the resolve trigger is JWT-gated, **explicitly not**
   * modelled on `clarisa-connections.controller.ts:17-18`, which carries no guard at
   * all. This is not testable by booting only the controller (the guard is
   * `JwtMiddleware`, applied in `app.module.ts`, not a controller-level `@UseGuards`),
   * so this suite asserts the two static facts that make the inherited posture true:
   * (1) `progress-tracker.controller.ts` declares no `@UseGuards` anywhere — the
   * resolve route gets no different, weaker treatment than its siblings — and (2)
   * `app.module.ts`'s `JwtMiddleware` `.exclude(...)` list does not carry
   * `progress-tracker` or `indicator-map`, so `api/progress-tracker/indicator-map/resolve`
   * is not excluded from the JWT check applied to `api/*path`.
   */
  describe('PTM-DD-3 — JWT posture, not the Clarisa controller precedent', () => {
    const controllerSource = fs.readFileSync(
      path.resolve(__dirname, 'progress-tracker.controller.ts'),
      'utf8',
    );
    const appModuleSource = fs.readFileSync(
      path.resolve(__dirname, '..', '..', 'app.module.ts'),
      'utf8',
    );

    it('declares no @UseGuards decorator on the controller (no route, including resolve, opts out of inherited auth)', () => {
      expect(controllerSource).not.toMatch(/@UseGuards\(/);
    });

    it('is not added to the JwtMiddleware exclusion list in app.module.ts', () => {
      const excludeBlockMatch = appModuleSource.match(
        /\.apply\(JwtMiddleware[\s\S]*?\.exclude\(([\s\S]*?)\)\s*\n\s*\.forRoutes/,
      );
      expect(excludeBlockMatch).not.toBeNull();
      const excludeBlock = excludeBlockMatch?.[1] ?? '';
      expect(excludeBlock).not.toMatch(/progress-tracker/);
      expect(excludeBlock).not.toMatch(/indicator-map/);
    });
  });
});
