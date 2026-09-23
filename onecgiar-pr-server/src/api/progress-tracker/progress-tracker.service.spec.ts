// @akili-spec changes/progress-tracker-pull-bridge/progress-tracker-indicator-mapping
import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { getRepositoryToken } from '@nestjs/typeorm';
import { defer, of, lastValueFrom } from 'rxjs';
import { ProgressTrackerService } from './progress-tracker.service';
import { ProgressTrackerIndicatorMap } from './entities/progress-tracker-indicator-map.entity';
import { Version } from '../versioning/entities/version.entity';
import { AppModuleIdEnum } from '../../shared/constants/role-type.enum';
import { ResponseInterceptor } from '../../shared/Interceptors/Return-data.interceptor';
import { getProgressTrackerTimeoutMs } from './progress-tracker.config';

/**
 * `PTM-T-3` — `PTM-AC-1`–`PTM-AC-7`, plus the sentinel leak falsifier named in
 * `tasks.md`.
 *
 * Upstream failures are **rejected promises**, deferred so nothing rejects before
 * subscription (mirrors `cgspace-discovery.service.spec.ts`'s pattern, the same
 * `defer(() => Promise.reject(err))` shape, so the catch-block classification is
 * really exercised rather than a synchronous `throwError`).
 */

const BASE_URL =
  'https://mrl8hgyyye.execute-api.eu-central-1.amazonaws.com/dev';
const ACTIVE_VERSION: Partial<Version> = { id: 42 } as Version;

function mappedRow(
  overrides: Partial<ProgressTrackerIndicatorMap> = {},
): ProgressTrackerIndicatorMap {
  return {
    id: 1,
    toc_results_indicator_id: '5d51da6c6916',
    toc_indicator_integration_id: 900123,
    version_id: 42,
    pt_indicator_id: '8006329bfd49',
    pt_program_id: 'fdb65d1a595c',
    match_quality: 'exact',
    match_score: 0.98,
    resolved_at: new Date('2026-09-15T00:00:00.000Z'),
    ...overrides,
  } as ProgressTrackerIndicatorMap;
}

describe('ProgressTrackerService', () => {
  let service: ProgressTrackerService;
  let httpService: { get: jest.Mock };
  let mappingRepository: { findOne: jest.Mock };
  let versionRepository: { findOne: jest.Mock };
  let loggerWarnSpy: jest.SpyInstance;

  function allLoggerWarnCalls(): any[][] {
    return loggerWarnSpy.mock.calls;
  }

  beforeEach(async () => {
    process.env.PT_INTEROP_BASE_URL = BASE_URL;
    delete process.env.PT_INTEROP_API_KEY;
    delete process.env.PT_INTEROP_TIMEOUT_MS;

    httpService = { get: jest.fn() };
    mappingRepository = { findOne: jest.fn() };
    versionRepository = {
      findOne: jest.fn().mockResolvedValue(ACTIVE_VERSION),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProgressTrackerService,
        { provide: HttpService, useValue: httpService },
        {
          provide: getRepositoryToken(ProgressTrackerIndicatorMap),
          useValue: mappingRepository,
        },
        { provide: getRepositoryToken(Version), useValue: versionRepository },
      ],
    }).compile();

    service = module.get<ProgressTrackerService>(ProgressTrackerService);

    loggerWarnSpy = jest
      .spyOn((service as any).logger, 'warn')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    delete process.env.PT_INTEROP_BASE_URL;
    delete process.env.PT_INTEROP_API_KEY;
    delete process.env.PT_INTEROP_TIMEOUT_MS;
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  describe('mapping lookup joins on toc_results_indicator_id + version_id (design.md §14 watch item)', () => {
    it('queries the mapping repository on the related_node_id string and the active reporting version id', async () => {
      mappingRepository.findOne.mockResolvedValue(mappedRow());
      httpService.get.mockReturnValue(of({ data: { results: [] } }));

      await service.getIndicatorResults('5d51da6c6916');

      expect(versionRepository.findOne).toHaveBeenCalledWith({
        where: {
          status: true,
          is_active: true,
          app_module_id: AppModuleIdEnum.REPORTING,
        },
      });
      expect(mappingRepository.findOne).toHaveBeenCalledWith({
        where: { toc_results_indicator_id: '5d51da6c6916', version_id: 42 },
      });
    });
  });

  describe('PTM-AC-2 — unmapped indicator: not_found, zero upstream calls', () => {
    it('returns not_found and calls HttpService.get zero times when no mapping row exists', async () => {
      mappingRepository.findOne.mockResolvedValue(null);

      const result = await service.getIndicatorResults('unmapped-indicator');

      expect(result).toEqual({
        statusCode: 200,
        message: 'No Progress Tracker mapping found for this indicator',
        response: { status: 'not_found' },
      });
      expect(httpService.get).not.toHaveBeenCalled();
    });

    it("returns not_found and calls HttpService.get zero times when match_quality is 'none'", async () => {
      mappingRepository.findOne.mockResolvedValue(
        mappedRow({ match_quality: 'none', pt_indicator_id: null }),
      );

      const result = await service.getIndicatorResults('some-indicator');

      expect(result).toEqual({
        statusCode: 200,
        message: 'No Progress Tracker mapping found for this indicator',
        response: { status: 'not_found' },
      });
      expect(httpService.get).not.toHaveBeenCalled();
    });

    it('returns not_found and calls HttpService.get zero times when there is no active reporting version', async () => {
      versionRepository.findOne.mockResolvedValue(null);

      const result = await service.getIndicatorResults('5d51da6c6916');

      expect(result).toEqual({
        statusCode: 200,
        message: 'No Progress Tracker mapping found for this indicator',
        response: { status: 'not_found' },
      });
      expect(mappingRepository.findOne).not.toHaveBeenCalled();
      expect(httpService.get).not.toHaveBeenCalled();
    });
  });

  describe('PTM-AC-1 — mapped indicator, upstream ok: proposals returned, PT id permitted in provenance + deep link (PTM-R-3c)', () => {
    it('returns status ok with the whitelisted top-level fields, passing indicator_id, program_id and source.pt_url through unmodified', async () => {
      mappingRepository.findOne.mockResolvedValue(mappedRow());
      httpService.get.mockReturnValue(
        of({
          data: {
            indicator: {
              indicator_id: 'PT-INDICATOR-ID',
              program_id: 'PT-PROGRAM-ID',
              program: 'Food Frontiers and Security',
              aow: 'AOW02: Fragile and Conflict-affected Food Systems',
            },
            results: [{ result_key: '8006329bfd49:1', title: 'Draft result' }],
            evidence_count: 13,
            generated_by: { mode: 'ai', model: 'claude-haiku-4-5-20251001' },
            source: {
              system: 'progress-tracker',
              environment: 'dev',
              pt_url:
                'https://progress-tracker.synapsis-analytics.com/program/x?indicator=PT-INDICATOR-ID',
            },
            generated_at: '2026-09-15T16:48:25.851727+00:00',
            cache: {
              hit: false,
              evidence_fingerprint: '853894227c38',
              cached_at: '2026-09-15T16:48:25.851727+00:00',
            },
          },
        }),
      );

      const result = await service.getIndicatorResults('5d51da6c6916', {
        max_results: 3,
      });

      expect(result.statusCode).toBe(200);
      expect(result.response.status).toBe('ok');
      expect(result.response.results).toEqual([
        { result_key: '8006329bfd49:1', title: 'Draft result' },
      ]);
      expect(result.response.evidence_count).toBe(13);
      // `design.md` §4.1 amendment, `PTM-R-13` — top-level generated_at, and
      // evidence_fingerprint projected out of `cache` (never the whole object).
      expect(result.response.generated_at).toBe(
        '2026-09-15T16:48:25.851727+00:00',
      );
      expect(result.response.evidence_fingerprint).toBe('853894227c38');
      expect((result.response as any).cache).toBeUndefined();
      // `PTM-R-3c` — the PT ids and `result_key` MAY appear; they are NOT stripped.
      expect(result.response.indicator).toEqual({
        indicator_id: 'PT-INDICATOR-ID',
        program_id: 'PT-PROGRAM-ID',
        program: 'Food Frontiers and Security',
        aow: 'AOW02: Fragile and Conflict-affected Food Systems',
      });
      expect(result.response.source).toEqual({
        system: 'progress-tracker',
        environment: 'dev',
        pt_url:
          'https://progress-tracker.synapsis-analytics.com/program/x?indicator=PT-INDICATOR-ID',
      });

      // `PTM-R-3a` — only the upstream base URL / API key are forbidden, and this
      // fixture's upstream body never carries either.
      const serialized = JSON.stringify(result);
      expect(serialized).not.toContain(BASE_URL);
    });

    it('never strips result_key, indicator ids or pt_url — sanitizeProposals only whitelists top-level keys (PTM-R-3c)', async () => {
      mappingRepository.findOne.mockResolvedValue(mappedRow());
      httpService.get.mockReturnValue(
        of({
          data: {
            results: [
              { result_key: '8006329bfd49:1', title: 'A' },
              { result_key: '8006329bfd49:2', title: 'B' },
            ],
            source: { pt_url: 'https://progress-tracker.example.com/x' },
            // Unlisted top-level field: must NOT pass through (the whitelist still applies at the top level).
            debug_internal: 'should-not-appear',
          },
        }),
      );

      const result = await service.getIndicatorResults('5d51da6c6916');

      expect(result.response.results).toEqual([
        { result_key: '8006329bfd49:1', title: 'A' },
        { result_key: '8006329bfd49:2', title: 'B' },
      ]);
      expect(result.response.source).toEqual({
        pt_url: 'https://progress-tracker.example.com/x',
      });
      expect((result.response as any).debug_internal).toBeUndefined();
    });

    /**
     * `design.md` §4.1 amendment (2026-09-22) — the projection out of `cache` is
     * deliberately narrow: `evidence_fingerprint` alone, never the whole object. This
     * is the assertion that distinguishes a narrow projection from a lazy
     * whole-object whitelist (which the prior six-key list effectively was, in that
     * it dropped `cache` entirely rather than projecting one field out of it).
     */
    it('projects only cache.evidence_fingerprint through — cache.hit and cache.cached_at do NOT appear (PTM-R-13)', async () => {
      mappingRepository.findOne.mockResolvedValue(mappedRow());
      httpService.get.mockReturnValue(
        of({
          data: {
            results: [],
            generated_at: '2026-09-15T16:36:53.391188+00:00',
            cache: {
              hit: true,
              evidence_fingerprint: 'SENTINEL-FINGERPRINT',
              cached_at: 'SENTINEL-CACHED-AT',
            },
          },
        }),
      );

      const result = await service.getIndicatorResults('5d51da6c6916');

      expect(result.response.generated_at).toBe(
        '2026-09-15T16:36:53.391188+00:00',
      );
      expect(result.response.evidence_fingerprint).toBe('SENTINEL-FINGERPRINT');
      expect((result.response as any).cache).toBeUndefined();
      const serialized = JSON.stringify(result);
      expect(serialized).not.toContain('SENTINEL-CACHED-AT');
      // `hit: true` would serialize as the literal token `true` next to nothing
      // distinctive, so assert on the key's absence instead of a content sentinel.
      expect(Object.keys(result.response)).not.toContain('cache');
    });

    it('sends the request to the resolved PT indicator id, never the PRMS/Integration id', async () => {
      mappingRepository.findOne.mockResolvedValue(mappedRow());
      httpService.get.mockReturnValue(of({ data: {} }));

      await service.getIndicatorResults('5d51da6c6916');

      expect(httpService.get).toHaveBeenCalledTimes(1);
      const [url] = httpService.get.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/api/prms/indicators/8006329bfd49/results`);
    });

    /**
     * `D-14` — nothing previously pinned the clamped timeout onto the actual axios
     * request config; deleting the `timeout:` line from the `httpService.get` options
     * left the whole suite green under `PTM-R-7` (a MUST). This asserts the config
     * value on the real call, not just `getProgressTrackerTimeoutMs()` in isolation
     * (already covered by `progress-tracker.config.spec.ts`).
     */
    it('D-14 — sends the clamped timeout on the request config', async () => {
      mappingRepository.findOne.mockResolvedValue(mappedRow());
      httpService.get.mockReturnValue(of({ data: {} }));

      await service.getIndicatorResults('5d51da6c6916');

      expect(httpService.get.mock.calls[0][1].timeout).toBe(
        getProgressTrackerTimeoutMs(),
      );
    });
  });

  describe('PTM-AC-3 — upstream 404: not_found, never a 4xx/5xx from PRMS', () => {
    it('classifies an upstream 404 as not_found with statusCode 200', async () => {
      mappingRepository.findOne.mockResolvedValue(mappedRow());
      httpService.get.mockReturnValue(
        defer(() =>
          Promise.reject({
            message: 'Request failed with status code 404',
            response: { status: 404, data: { detail: 'not found' } },
          }),
        ),
      );

      const result = await service.getIndicatorResults('5d51da6c6916');

      expect(result).toEqual({
        statusCode: 200,
        message: 'No Progress Tracker mapping found for this indicator',
        response: { status: 'not_found' },
      });
    });
  });

  describe('PTM-AC-4 — upstream 422: classified unavailable, never an unhandled exception', () => {
    it('classifies an upstream 422 (the PT DEV on-ramp drift) as unavailable, resolving rather than rejecting', async () => {
      mappingRepository.findOne.mockResolvedValue(mappedRow());
      httpService.get.mockReturnValue(
        defer(() =>
          Promise.reject({
            message: 'Request failed with status code 422',
            response: { status: 422, data: { detail: 'unprocessable' } },
          }),
        ),
      );

      await expect(
        service.getIndicatorResults('5d51da6c6916'),
      ).resolves.toEqual({
        statusCode: 200,
        message: 'Progress Tracker proposals are temporarily unavailable',
        response: { status: 'unavailable' },
      });
    });
  });

  describe('PTM-AC-5 — timeout / 5xx: unavailable, and the leak-free SourceFailure contract', () => {
    it('classifies a timeout as unavailable without leaking message, config.url or response body', async () => {
      mappingRepository.findOne.mockResolvedValue(mappedRow());
      httpService.get.mockReturnValue(
        defer(() =>
          Promise.reject({
            code: 'ECONNABORTED',
            message: 'timeout of 25000ms exceeded to SENTINEL-HOST',
            config: {
              url: `${BASE_URL}/api/prms/indicators/SENTINEL-HOST/results`,
            },
            response: undefined,
          }),
        ),
      );

      const result = await service.getIndicatorResults('5d51da6c6916');

      expect(result).toEqual({
        statusCode: 200,
        message: 'Progress Tracker proposals are temporarily unavailable',
        response: { status: 'unavailable' },
      });

      const serializedResult = JSON.stringify(result);
      const serializedLogs = JSON.stringify(allLoggerWarnCalls());
      for (const sentinel of [
        'SENTINEL-HOST',
        BASE_URL,
        'timeout of 25000ms',
      ]) {
        expect(serializedResult).not.toContain(sentinel);
        expect(serializedLogs).not.toContain(sentinel);
      }
    });

    it('classifies an upstream 5xx as unavailable without leaking the response body', async () => {
      mappingRepository.findOne.mockResolvedValue(mappedRow());
      httpService.get.mockReturnValue(
        defer(() =>
          Promise.reject({
            message: 'Request failed with status code 503 for SENTINEL-HOST',
            response: {
              status: 503,
              data: { error: 'SENTINEL-BODY upstream down' },
            },
          }),
        ),
      );

      const result = await service.getIndicatorResults('5d51da6c6916');

      expect(result).toEqual({
        statusCode: 200,
        message: 'Progress Tracker proposals are temporarily unavailable',
        response: { status: 'unavailable' },
      });
      const serialized = JSON.stringify([result, allLoggerWarnCalls()]);
      expect(serialized).not.toContain('SENTINEL-HOST');
      expect(serialized).not.toContain('SENTINEL-BODY');
    });

    /**
     * The falsifier named in `tasks.md` `PTM-T-3`: replacing the primitives-only catch
     * with `{ status: 'unavailable', message: error.message }` must turn this red.
     * Every sentinel lives on a different field (`message`, `config.url`,
     * `response.data`) so a fixture with an empty message cannot hide the mutation.
     */
    it('FALSIFIER — the caught error object never leaves the catch block (sentinel leak test)', async () => {
      mappingRepository.findOne.mockResolvedValue(mappedRow());
      const sentinelError = {
        message: 'SENTINEL-MESSAGE: connection refused',
        config: { url: 'https://SENTINEL-URL.example.com/leak' },
        response: { status: 500, data: { token: 'SENTINEL-KEY-VALUE' } },
      };
      httpService.get.mockReturnValue(
        defer(() => Promise.reject(sentinelError)),
      );

      const result = await service.getIndicatorResults('5d51da6c6916');

      const serialized = JSON.stringify([result, allLoggerWarnCalls()]);
      expect(serialized).not.toContain('SENTINEL-MESSAGE');
      expect(serialized).not.toContain('SENTINEL-URL');
      expect(serialized).not.toContain('SENTINEL-KEY-VALUE');
    });
  });

  describe('PTM-AC-6 — PT_INTEROP_BASE_URL unset: unavailable, never throws, never names the variable', () => {
    it('resolves unavailable without calling the upstream when the base URL is unset', async () => {
      delete process.env.PT_INTEROP_BASE_URL;
      mappingRepository.findOne.mockResolvedValue(mappedRow());

      const result = await service.getIndicatorResults('5d51da6c6916');

      expect(result).toEqual({
        statusCode: 200,
        message: 'Progress Tracker proposals are temporarily unavailable',
        response: { status: 'unavailable' },
      });
      expect(httpService.get).not.toHaveBeenCalled();

      const serialized = JSON.stringify([result, allLoggerWarnCalls()]);
      expect(serialized).not.toContain('PT_INTEROP_BASE_URL');
    });
  });

  describe('PTM-AC-7 — X-API-Key sent only when non-empty, never logged', () => {
    it('does not send an X-API-Key header when PT_INTEROP_API_KEY is unset', async () => {
      delete process.env.PT_INTEROP_API_KEY;
      mappingRepository.findOne.mockResolvedValue(mappedRow());
      httpService.get.mockReturnValue(of({ data: {} }));

      await service.getIndicatorResults('5d51da6c6916');

      const [, config] = httpService.get.mock.calls[0];
      expect(config?.headers?.['X-API-Key']).toBeUndefined();
    });

    // The AC's own Given is "is empty" (`''`), a distinct code path from `delete` (unset).
    it('does not send an X-API-Key header when PT_INTEROP_API_KEY is the literal empty string', async () => {
      process.env.PT_INTEROP_API_KEY = '';
      mappingRepository.findOne.mockResolvedValue(mappedRow());
      httpService.get.mockReturnValue(of({ data: {} }));

      await service.getIndicatorResults('5d51da6c6916');

      const [, config] = httpService.get.mock.calls[0];
      expect(config?.headers?.['X-API-Key']).toBeUndefined();
    });

    it('sends X-API-Key when PT_INTEROP_API_KEY is non-empty, and never logs it', async () => {
      process.env.PT_INTEROP_API_KEY = 'SENTINEL-API-KEY-VALUE';
      mappingRepository.findOne.mockResolvedValue(mappedRow());
      httpService.get.mockReturnValue(
        defer(() =>
          Promise.reject({ message: 'boom', response: { status: 500 } }),
        ),
      );

      await service.getIndicatorResults('5d51da6c6916');

      expect(httpService.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: { 'X-API-Key': 'SENTINEL-API-KEY-VALUE' },
        }),
      );

      const serializedLogs = JSON.stringify(allLoggerWarnCalls());
      expect(serializedLogs).not.toContain('SENTINEL-API-KEY-VALUE');
    });
  });

  describe('statusCode is always 200 (PTM-DD-1)', () => {
    it.each([
      ['ok', () => httpService.get.mockReturnValue(of({ data: {} }))],
      [
        'not_found (unmapped)',
        () => mappingRepository.findOne.mockResolvedValue(null),
      ],
      [
        'unavailable (5xx)',
        () =>
          httpService.get.mockReturnValue(
            defer(() =>
              Promise.reject({ message: 'boom', response: { status: 500 } }),
            ),
          ),
      ],
    ])('returns statusCode 200 for the %s case', async (_label, arrange) => {
      mappingRepository.findOne.mockResolvedValue(mappedRow());
      arrange();

      const result = await service.getIndicatorResults('5d51da6c6916');
      expect(result.statusCode).toBe(200);
    });
  });

  describe('the service envelope survives the real ResponseInterceptor (Finding 1 regression gate)', () => {
    /**
     * Attempt 1 shipped a top-level `status` string. `ResponseInterceptor` prefers
     * `data.status` over `data.statusCode` (`Return-data.interceptor.ts:30`), so a
     * classification string like `'ok'` became the emitted HTTP status, and
     * `response: data?.response || {}` (`:29`) discarded the whole payload because the
     * service returned no `response` key. This pipes the SERVICE's real return value
     * through the REAL interceptor (not a hand-built fixture) so that defect cannot
     * hide behind an in-process assertion again.
     */
    function makeContext(res: { status: jest.Mock }) {
      return {
        switchToHttp: () => ({
          getRequest: () => ({
            url: '/api/progress-tracker/indicators/5d51da6c6916/results',
            method: 'GET',
            socket: { remoteAddress: '127.0.0.1' },
          }),
          getResponse: () => res,
        }),
      } as any;
    }

    it('emits HTTP 200 and preserves the full payload for the ok case', async () => {
      mappingRepository.findOne.mockResolvedValue(mappedRow());
      httpService.get.mockReturnValue(
        of({ data: { results: [{ result_key: '8006329bfd49:1' }] } }),
      );

      const serviceResult = await service.getIndicatorResults('5d51da6c6916');

      const interceptor = new ResponseInterceptor();
      jest
        .spyOn((interceptor as any)._logger, 'verbose')
        .mockImplementation(() => undefined as any);
      const res = { status: jest.fn().mockReturnThis() };
      const wired = await lastValueFrom(
        interceptor.intercept(makeContext(res), {
          handle: () => of(serviceResult),
        } as any),
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(wired.statusCode).toBe(200);
      expect(wired.response).toEqual({
        status: 'ok',
        results: [{ result_key: '8006329bfd49:1' }],
      });
    });

    it('emits HTTP 200 and preserves the payload for the not_found and unavailable cases too', async () => {
      mappingRepository.findOne.mockResolvedValue(null);
      const serviceResult = await service.getIndicatorResults('unmapped');

      const interceptor = new ResponseInterceptor();
      jest
        .spyOn((interceptor as any)._logger, 'verbose')
        .mockImplementation(() => undefined as any);
      const res = { status: jest.fn().mockReturnThis() };
      const wired = await lastValueFrom(
        interceptor.intercept(makeContext(res), {
          handle: () => of(serviceResult),
        } as any),
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(wired.response).toEqual({ status: 'not_found' });
    });

    /**
     * The new falsifier named in the rework brief: re-introducing a top-level `status`
     * key must turn this red. Built from the real `serviceResult` plus the regressed
     * key, so it exercises the exact interceptor precedence rule (`data.status` over
     * `data.statusCode`) that caused Finding 1.
     */
    it('FALSIFIER — a regressed top-level `status` key must break the HTTP status (proves the pipe test gates the defect)', async () => {
      mappingRepository.findOne.mockResolvedValue(mappedRow());
      httpService.get.mockReturnValue(of({ data: {} }));
      const serviceResult = await service.getIndicatorResults('5d51da6c6916');

      const regressed = { ...serviceResult, status: 'ok' as any };

      const interceptor = new ResponseInterceptor();
      jest
        .spyOn((interceptor as any)._logger, 'verbose')
        .mockImplementation(() => undefined as any);
      jest
        .spyOn((interceptor as any)._logger, 'warn')
        .mockImplementation(() => undefined as any);
      const res = { status: jest.fn().mockReturnThis() };
      const wired = await lastValueFrom(
        interceptor.intercept(makeContext(res), {
          handle: () => of(regressed),
        } as any),
      );

      // The interceptor sets the HTTP status from the string 'ok', not from 200.
      expect(res.status).toHaveBeenCalledWith('ok');
      expect(wired.statusCode).toBe('ok');
      expect(wired.statusCode).not.toBe(200);
    });
  });

  /**
   * `PTM-T-4` — `getProgramReadyCounts` (`PTM-R-2`). No mapping-table lookup precedes
   * this call (unlike `getIndicatorResults`): `design.md` §4.1 documents no
   * program-level mapping for this route, and the Guide (§4.3) addresses it by the
   * program id/name directly. `mappingRepository` is asserted **not called** in every
   * case below to prove that.
   *
   * Otherwise this method reuses the exact same leak-free `SourceFailure`
   * classification (`classifyUpstreamFailure`) and header/logging discipline as
   * `getIndicatorResults`, so it is held to `getIndicatorResults`'s own bar —
   * including the sentinel leak falsifier, the highest-severity defect class in this
   * spec (`D-1`).
   */
  describe('getProgramReadyCounts (PTM-R-2)', () => {
    it('returns status ok with the whitelisted top-level fields on a 200', async () => {
      httpService.get.mockReturnValue(
        of({
          data: {
            program_id: 'fdb65d1a595c',
            items: [
              { indicator_id: '8006329bfd49', evidence_count: 13 },
              { indicator_id: '906bb71c7c54', evidence_count: 8 },
            ],
            indicators_with_evidence: 95,
            generated_at: '2026-09-15T16:36:53.391188+00:00',
            // Unlisted upstream field — must NOT pass through verbatim.
            unexpected_field: 'SENTINEL-UNLISTED',
          },
        }),
      );

      const result = await service.getProgramReadyCounts('fdb65d1a595c');

      expect(result).toEqual({
        statusCode: 200,
        message: 'Progress Tracker ready counts retrieved',
        response: {
          status: 'ok',
          program_id: 'fdb65d1a595c',
          items: [
            { indicator_id: '8006329bfd49', evidence_count: 13 },
            { indicator_id: '906bb71c7c54', evidence_count: 8 },
          ],
          indicators_with_evidence: 95,
          generated_at: '2026-09-15T16:36:53.391188+00:00',
        },
      });
      expect(JSON.stringify(result)).not.toContain('SENTINEL-UNLISTED');
      expect(mappingRepository.findOne).not.toHaveBeenCalled();
    });

    it('forwards min_evidence as an upstream query param', async () => {
      httpService.get.mockReturnValue(of({ data: {} }));

      await service.getProgramReadyCounts('fdb65d1a595c', { min_evidence: 3 });

      const [url, config] = httpService.get.mock.calls[0];
      expect(url).toBe(
        `${BASE_URL}/api/prms/programs/fdb65d1a595c/ready-counts`,
      );
      expect(config.params).toEqual({ min_evidence: 3 });
    });

    /** `D-14` — same gate as `getIndicatorResults`'s equivalent test above. */
    it('D-14 — sends the clamped timeout on the request config', async () => {
      httpService.get.mockReturnValue(of({ data: {} }));

      await service.getProgramReadyCounts('fdb65d1a595c');

      expect(httpService.get.mock.calls[0][1].timeout).toBe(
        getProgressTrackerTimeoutMs(),
      );
    });

    it('classifies an upstream 404 as not_found, never a 4xx/5xx from PRMS', async () => {
      httpService.get.mockReturnValue(
        defer(() =>
          Promise.reject({ message: 'not found', response: { status: 404 } }),
        ),
      );

      const result = await service.getProgramReadyCounts('unknown-program');

      expect(result).toEqual({
        statusCode: 200,
        message: 'No Progress Tracker ready counts found for this program',
        response: { status: 'not_found' },
      });
      expect(mappingRepository.findOne).not.toHaveBeenCalled();
    });

    it.each([
      ['422', { response: { status: 422 } }],
      ['5xx', { response: { status: 503 } }],
      ['timeout', { code: 'ECONNABORTED' }],
      ['network failure', { message: 'Network Error' }],
    ])(
      'classifies %s as unavailable, resolving rather than rejecting',
      async (_label, err) => {
        httpService.get.mockReturnValue(defer(() => Promise.reject(err)));

        const result = await service.getProgramReadyCounts('fdb65d1a595c');

        expect(result).toEqual({
          statusCode: 200,
          message: 'Progress Tracker ready counts are temporarily unavailable',
          response: { status: 'unavailable' },
        });
      },
    );

    it('resolves unavailable without calling the upstream when the base URL is unset, and never names the variable', async () => {
      delete process.env.PT_INTEROP_BASE_URL;

      const result = await service.getProgramReadyCounts('fdb65d1a595c');

      expect(result).toEqual({
        statusCode: 200,
        message: 'Progress Tracker ready counts are temporarily unavailable',
        response: { status: 'unavailable' },
      });
      expect(httpService.get).not.toHaveBeenCalled();
      const serialized = JSON.stringify([result, allLoggerWarnCalls()]);
      expect(serialized).not.toContain('PT_INTEROP_BASE_URL');
    });

    it('does not send an X-API-Key header when PT_INTEROP_API_KEY is unset', async () => {
      delete process.env.PT_INTEROP_API_KEY;
      httpService.get.mockReturnValue(of({ data: {} }));

      await service.getProgramReadyCounts('fdb65d1a595c');

      const [, config] = httpService.get.mock.calls[0];
      expect(config?.headers?.['X-API-Key']).toBeUndefined();
    });

    it('does not send an X-API-Key header when PT_INTEROP_API_KEY is the literal empty string', async () => {
      process.env.PT_INTEROP_API_KEY = '';
      httpService.get.mockReturnValue(of({ data: {} }));

      await service.getProgramReadyCounts('fdb65d1a595c');

      const [, config] = httpService.get.mock.calls[0];
      expect(config?.headers?.['X-API-Key']).toBeUndefined();
    });

    it('sends X-API-Key when PT_INTEROP_API_KEY is non-empty, and never logs it', async () => {
      process.env.PT_INTEROP_API_KEY = 'SENTINEL-API-KEY-VALUE';
      httpService.get.mockReturnValue(
        defer(() =>
          Promise.reject({ message: 'boom', response: { status: 500 } }),
        ),
      );

      await service.getProgramReadyCounts('fdb65d1a595c');

      expect(httpService.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: { 'X-API-Key': 'SENTINEL-API-KEY-VALUE' },
        }),
      );
      const serializedLogs = JSON.stringify(allLoggerWarnCalls());
      expect(serializedLogs).not.toContain('SENTINEL-API-KEY-VALUE');
    });

    /**
     * The `D-1` gate for this method: mirrors `PTM-T-3`'s sentinel leak falsifier
     * verbatim, one sentinel per field (`message`, `config.url`, `response.data`) so a
     * fixture with an empty message cannot hide a mutation. If the catch block were
     * changed to spread the caught error (e.g. `{ status: 'unavailable',
     * message: error.message }`), this test goes red.
     */
    it('FALSIFIER — the caught error object never leaves the catch block (sentinel leak test)', async () => {
      const sentinelError = {
        message: 'SENTINEL-RC-MESSAGE: connection refused',
        config: { url: 'https://SENTINEL-RC-HOST.example.com/leak' },
        response: { status: 500, data: { token: 'SENTINEL-RC-KEY' } },
      };
      httpService.get.mockReturnValue(
        defer(() => Promise.reject(sentinelError)),
      );

      const result = await service.getProgramReadyCounts('fdb65d1a595c');

      const serialized = JSON.stringify([result, allLoggerWarnCalls()]);
      expect(serialized).not.toContain('SENTINEL-RC-MESSAGE');
      expect(serialized).not.toContain('SENTINEL-RC-HOST');
      expect(serialized).not.toContain('SENTINEL-RC-KEY');
    });

    it.each([
      ['ok', () => httpService.get.mockReturnValue(of({ data: {} }))],
      [
        'not_found (404)',
        () =>
          httpService.get.mockReturnValue(
            defer(() => Promise.reject({ response: { status: 404 } })),
          ),
      ],
      [
        'unavailable (5xx)',
        () =>
          httpService.get.mockReturnValue(
            defer(() =>
              Promise.reject({ message: 'boom', response: { status: 500 } }),
            ),
          ),
      ],
    ])(
      'returns statusCode 200 for the %s case (PTM-DD-1)',
      async (_label, arrange) => {
        arrange();

        const result = await service.getProgramReadyCounts('fdb65d1a595c');
        expect(result.statusCode).toBe(200);
      },
    );

    it('the envelope carries no top-level `status` key (same discipline as getIndicatorResults)', async () => {
      httpService.get.mockReturnValue(of({ data: {} }));

      const result = await service.getProgramReadyCounts('fdb65d1a595c');

      expect((result as any).status).toBeUndefined();
      expect(result.response.status).toBe('ok');
    });
  });
});
