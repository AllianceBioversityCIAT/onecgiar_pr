// @akili-spec changes/progress-tracker-pull-bridge/progress-tracker-indicator-mapping
import * as fs from 'fs';
import * as path from 'path';
import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { getRepositoryToken } from '@nestjs/typeorm';
import { defer, of } from 'rxjs';
import { ProgressTrackerService } from '../progress-tracker.service';
import { ProgressTrackerIndicatorMap } from '../entities/progress-tracker-indicator-map.entity';
import { Version } from '../../versioning/entities/version.entity';

/**
 * `PTM-T-8` — pins the upstream **staging** response shape (`P-14`) as a committed
 * fixture and proves `ProgressTrackerService`'s whitelist DTO projects it correctly,
 * including the top-level `generated_at` / `cache.evidence_fingerprint` projection
 * amended into `design.md` §4.1 on 2026-09-22, and the `422` classification
 * (`PTM-AC-4`). Mirrors `cgspace-discovery/fixtures/fixtures-keys.spec.ts` — the
 * fixture is loaded raw (`fs.readFileSync`, no hand-editing) and driven through the
 * real service, not re-implemented as an inline assertion.
 *
 * **Provenance** (see `./README.md` for the full record):
 * - `pt-results.staging.json` — live capture, PT **staging**, `GET
 *   /api/prms/indicators/8006329bfd49/results?max_results=3&refresh=true&mode=auto`,
 *   `2026-09-22T18:47:26.657864+00:00`, HTTP 200 in 23.1 s (cold — `refresh=true`
 *   forces past any cache, so `cache.hit: false` and `generated_by.mode: "ai"` are
 *   guaranteed; a `mode=template` capture would NOT carry `cache.evidence_fingerprint`
 *   — the inert-fixture trap this task's Disqualifier names).
 * - `pt-results-422.json` — live capture, PT **staging**, same route with an
 *   out-of-contract `mode=bogus` (upstream's own Pydantic validation), HTTP 422 in
 *   5.2 s. `P-14`'s DEV-observed drift (`mode=template&refresh=true` → 422) does
 *   **not** reproduce on staging — confirmed live below — so this is a staging-native
 *   422 of the same upstream shape, not a DEV capture (DEV is disqualified outright).
 *
 * **P-14 outcome:** staging matches the documented contract (cold `mode=auto` ⇒
 * `200` with the full field set; `mode=template&refresh=true` ⇒ `200`, not the `422`
 * DEV produces). `P-14` is updated to **VERIFIED** in `design.md` §1A.
 */

function loadFixture(fileName: string): any {
  return JSON.parse(fs.readFileSync(path.resolve(__dirname, fileName), 'utf8'));
}

const STAGING_RESULTS = loadFixture('pt-results.staging.json');
const STAGING_422 = loadFixture('pt-results-422.json');

const BASE_URL = 'https://staging.pt.example/interop';
const ACTIVE_VERSION: Partial<Version> = { id: 42 } as Version;

function mappedRow(): ProgressTrackerIndicatorMap {
  return {
    id: 1,
    toc_results_indicator_id: '5d51da6c6916',
    toc_indicator_integration_id: 900123,
    version_id: 42,
    pt_indicator_id: STAGING_RESULTS.indicator.indicator_id,
    pt_program_id: STAGING_RESULTS.indicator.program_id,
    match_quality: 'exact',
    match_score: 0.98,
    resolved_at: new Date('2026-09-22T00:00:00.000Z'),
  } as ProgressTrackerIndicatorMap;
}

describe('progress-tracker fixtures — staging contract key projection (PTM-T-8)', () => {
  let service: ProgressTrackerService;
  let httpService: { get: jest.Mock };
  let mappingRepository: { findOne: jest.Mock };
  let versionRepository: { findOne: jest.Mock };

  beforeEach(async () => {
    process.env.PT_INTEROP_BASE_URL = BASE_URL;
    delete process.env.PT_INTEROP_API_KEY;
    delete process.env.PT_INTEROP_TIMEOUT_MS;

    httpService = { get: jest.fn() };
    mappingRepository = { findOne: jest.fn().mockResolvedValue(mappedRow()) };
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
    jest.spyOn((service as any).logger, 'warn').mockImplementation();
  });

  afterEach(() => {
    delete process.env.PT_INTEROP_BASE_URL;
    delete process.env.PT_INTEROP_API_KEY;
    delete process.env.PT_INTEROP_TIMEOUT_MS;
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  describe('cold mode=auto staging fixture', () => {
    it('is a cold capture that actually carries cache.evidence_fingerprint (guards against the inert-fixture trap)', () => {
      expect(STAGING_RESULTS.cache.hit).toBe(false);
      expect(STAGING_RESULTS.generated_by.mode).toBe('ai');
      expect(typeof STAGING_RESULTS.cache.evidence_fingerprint).toBe('string');
      expect(STAGING_RESULTS.cache.evidence_fingerprint.length).toBeGreaterThan(
        0,
      );
    });

    it('projects generated_at and cache.evidence_fingerprint to the top level, and drops cache.hit / cache.cached_at (design.md §4.1, PTM-R-13)', async () => {
      httpService.get.mockReturnValue(of({ data: STAGING_RESULTS }));

      const result = await service.getIndicatorResults('5d51da6c6916', {
        max_results: 3,
      });

      expect(result.statusCode).toBe(200);
      expect(result.response.status).toBe('ok');
      expect(result.response.generated_at).toBe(STAGING_RESULTS.generated_at);
      expect(result.response.evidence_fingerprint).toBe(
        STAGING_RESULTS.cache.evidence_fingerprint,
      );
      expect((result.response as any).cache).toBeUndefined();
    });

    it('projects indicator, results, evidence_count, generated_by and source unmodified', async () => {
      httpService.get.mockReturnValue(of({ data: STAGING_RESULTS }));

      const result = await service.getIndicatorResults('5d51da6c6916', {
        max_results: 3,
      });

      expect(result.response.indicator).toEqual(STAGING_RESULTS.indicator);
      expect(result.response.results).toEqual(STAGING_RESULTS.results);
      expect(result.response.evidence_count).toBe(
        STAGING_RESULTS.evidence_count,
      );
      expect(result.response.generated_by).toEqual(
        STAGING_RESULTS.generated_by,
      );
      expect(result.response.source).toEqual(STAGING_RESULTS.source);
    });

    it('never leaks the configured base URL into the response', async () => {
      httpService.get.mockReturnValue(of({ data: STAGING_RESULTS }));

      const result = await service.getIndicatorResults('5d51da6c6916', {
        max_results: 3,
      });

      expect(JSON.stringify(result)).not.toContain(BASE_URL);
    });

    // 🛑 Forward pointer from `PTM-T-6`'s review — observed capture lengths against
    // the committed column widths (`pt_result_key varchar(64)`,
    // `pt_evidence_fingerprint varchar(128)`, `pt_environment varchar(16)`,
    // `pt_model varchar(64)`). All four must fit, or `PTM-T-7`'s insert is at risk.
    it('keeps every provenance-bound field within its committed column width', () => {
      const resultKeyLengths = STAGING_RESULTS.results.map(
        (r: any) => r.result_key.length,
      );
      const fingerprintLength =
        STAGING_RESULTS.cache.evidence_fingerprint.length;
      const environmentLength = STAGING_RESULTS.source.environment.length;
      const modelLength = STAGING_RESULTS.generated_by.model.length;

      resultKeyLengths.forEach((len: number) =>
        expect(len).toBeLessThanOrEqual(64),
      );
      expect(fingerprintLength).toBeLessThanOrEqual(128);
      expect(environmentLength).toBeLessThanOrEqual(16);
      expect(modelLength).toBeLessThanOrEqual(64);
    });
  });

  describe('422 staging fixture (PTM-AC-4)', () => {
    it('is a genuine upstream validation-error shape, not a DEV capture', () => {
      expect(Array.isArray(STAGING_422.detail)).toBe(true);
      expect(STAGING_422.detail[0].loc).toContain('mode');
    });

    it('classifies the upstream 422 as unavailable, resolving rather than rejecting (PTM-AC-4)', async () => {
      httpService.get.mockReturnValue(
        defer(() =>
          Promise.reject({
            message: 'Request failed with status code 422',
            response: { status: 422, data: STAGING_422 },
          }),
        ),
      );

      const result = await service.getIndicatorResults('5d51da6c6916');

      expect(result).toEqual({
        statusCode: 200,
        message: 'Progress Tracker proposals are temporarily unavailable',
        response: { status: 'unavailable' },
      });
    });
  });
});
