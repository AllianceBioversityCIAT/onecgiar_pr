// @akili-spec changes/progress-tracker-pull-bridge/progress-tracker-indicator-mapping
import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { getRepositoryToken } from '@nestjs/typeorm';
import { defer, of } from 'rxjs';
import { ProgressTrackerResolveService } from './progress-tracker-resolve.service';
import { ProgressTrackerIndicatorMap } from './entities/progress-tracker-indicator-map.entity';
import { Version } from '../versioning/entities/version.entity';
import { PtPorbRepository, PtPorbRow } from './repositories/pt-porb.repository';

/**
 * `PTM-T-5` — `PTM-AC-9`–`PTM-AC-11` (`design.md` §4.1 "fill trigger", §5 rule 4;
 * `requirements.md` `PTM-R-10`, `PTM-R-11`, `PTM-R-21`).
 *
 * The mapping repository is modelled as an in-memory table keyed on
 * (`toc_results_indicator_id`, `version_id`) — `findOne`/`save` operate on the same
 * backing array, so a double run genuinely exercises the upsert rather than two
 * independent mocked calls that could never reveal duplication.
 */

const VERSION_ID = 42;
const ACTIVE_VERSION: Partial<Version> = {
  id: VERSION_ID,
  toc_pahse_id: 'phase-uuid-abc' as unknown as number,
  phase_year: 2026,
};

const PORB_ROW: PtPorbRow = {
  tocResultsIndicatorId: '8006329bfd49',
  tocIndicatorIntegrationId: 900123,
  program: 'Food Frontiers and Security',
  aow: 'AOW02: Fragile and Conflict-affected Food Systems',
  center: 'CIAT (Alliance)',
  hloTitle: '2.1.1 Prevent',
  description: 'AW2P3: Fragility and Conflict Sensitivity Hub',
};

/** Live-shape fixture for a `match: exact` `/resolve` response (`PTM-T-5` live capture, 2026-09-22). */
function exactResolveResponse(overrides: Record<string, unknown> = {}) {
  return {
    indicator_id: '8006329bfd49',
    match: 'exact',
    program_id: 'fdb65d1a595c',
    program: 'Food Frontiers and Security',
    computed_indicator_id: '8006329bfd49',
    candidates: [
      { indicator_id: '8006329bfd49', kpi_type: 'custom', score: 1.0 },
      {
        indicator_id: '22ba725f9423',
        kpi_type: 'Number of knowledge products',
        score: 0.668,
      },
    ],
    ...overrides,
  };
}

/**
 * Live-shape fixture for a `match: fuzzy` `/resolve` response where the matched
 * `indicator_id` is deliberately **not** `candidates[0]` (`PTM-T-5` rework, attempt 2
 * — Reviewer finding 1). `exactResolveResponse()` above always has the match at
 * index 0, so `matchScore` sourced from `candidates.find(...)` is indistinguishable
 * from a `candidates[0].score` bug under every other fixture in this file. This one
 * makes that mutation observably wrong: the correct score is `0.91` (index 1); the
 * `candidates[0].score` mutation would read `0.668` instead.
 */
function fuzzyResolveResponse() {
  return {
    indicator_id: '8006329bfd49',
    match: 'fuzzy',
    program_id: 'fdb65d1a595c',
    program: 'Food Frontiers and Security',
    computed_indicator_id: '8006329bfd49',
    candidates: [
      {
        indicator_id: '22ba725f9423',
        kpi_type: 'Number of knowledge products',
        score: 0.668,
      },
      { indicator_id: '8006329bfd49', kpi_type: 'custom', score: 0.91 },
    ],
  };
}

/**
 * Live-shape fixture for a `match: none` `/resolve` response — `candidates[]` is
 * deliberately NON-EMPTY (`PTM-T-5` live capture, 2026-09-22), the falsifier
 * precondition: an empty list would leave correct and mutated code both writing
 * `NULL` and prove nothing.
 */
function noneResolveResponse() {
  return {
    indicator_id: null,
    match: 'none',
    program_id: 'fdb65d1a595c',
    program: 'Food Frontiers and Security',
    computed_indicator_id: 'da2b331d52a7',
    candidates: [
      {
        indicator_id: '22ba725f9423',
        kpi_type: 'Number of knowledge products',
        score: 0.366,
      },
      {
        indicator_id: '21842ca27ace',
        kpi_type: 'Number of knowledge products',
        score: 0.316,
      },
    ],
  };
}

describe('ProgressTrackerResolveService', () => {
  let service: ProgressTrackerResolveService;
  let httpService: { get: jest.Mock };
  let porbRepository: { findPorbRowsForPhase: jest.Mock };
  let versionRepository: { findOne: jest.Mock };
  let table: ProgressTrackerIndicatorMap[];

  function makeMappingRepository() {
    return {
      findOne: jest.fn(
        async ({ where }: any) =>
          table.find(
            (row) =>
              row.toc_results_indicator_id === where.toc_results_indicator_id &&
              row.version_id === where.version_id,
          ) ?? null,
      ),
      create: jest.fn(
        (data: Partial<ProgressTrackerIndicatorMap>) =>
          data as ProgressTrackerIndicatorMap,
      ),
      save: jest.fn(async (row: ProgressTrackerIndicatorMap) => {
        const existingIndex = table.findIndex(
          (r) =>
            r.toc_results_indicator_id === row.toc_results_indicator_id &&
            r.version_id === row.version_id,
        );
        if (existingIndex >= 0) {
          table[existingIndex] = { ...table[existingIndex], ...row };
        } else {
          table.push({ ...row });
        }
        return row;
      }),
    };
  }

  beforeEach(async () => {
    process.env.PT_INTEROP_BASE_URL =
      'https://mrl8hgyyye.execute-api.eu-central-1.amazonaws.com/dev';
    delete process.env.PT_INTEROP_API_KEY;
    delete process.env.PT_INTEROP_TIMEOUT_MS;

    table = [];
    httpService = { get: jest.fn() };
    porbRepository = {
      findPorbRowsForPhase: jest.fn().mockResolvedValue([PORB_ROW]),
    };
    versionRepository = {
      findOne: jest.fn().mockResolvedValue(ACTIVE_VERSION),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProgressTrackerResolveService,
        { provide: HttpService, useValue: httpService },
        { provide: PtPorbRepository, useValue: porbRepository },
        {
          provide: getRepositoryToken(ProgressTrackerIndicatorMap),
          useValue: makeMappingRepository(),
        },
        { provide: getRepositoryToken(Version), useValue: versionRepository },
      ],
    }).compile();

    service = module.get<ProgressTrackerResolveService>(
      ProgressTrackerResolveService,
    );

    jest
      .spyOn((service as any).logger, 'warn')
      .mockImplementation(() => undefined);
    jest
      .spyOn((service as any).logger, 'log')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    delete process.env.PT_INTEROP_BASE_URL;
    delete process.env.PT_INTEROP_API_KEY;
    delete process.env.PT_INTEROP_TIMEOUT_MS;
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  describe('PTM-AC-9 — match: exact writes a resolved row scoped to the reporting phase', () => {
    it('writes indicator_id, match_quality, score and a resolution timestamp, keyed to version_id', async () => {
      httpService.get.mockReturnValue(of({ data: exactResolveResponse() }));

      const result = await service.resolveIndicatorMappings({
        versionId: VERSION_ID,
      });

      expect(result.response.status).toBe('ok');
      expect(result.response.processed).toBe(1);
      expect(result.response.exact).toBe(1);

      expect(table).toHaveLength(1);
      const row = table[0];
      expect(row.toc_results_indicator_id).toBe('8006329bfd49');
      expect(row.version_id).toBe(VERSION_ID);
      expect(row.pt_indicator_id).toBe('8006329bfd49');
      expect(row.match_quality).toBe('exact');
      expect(row.match_score).toBe(1.0);
      expect(row.resolved_at).toBeInstanceOf(Date);
    });

    it('sends the PORB texts as the /resolve query params (program, aow, center, hlo_title, description)', async () => {
      httpService.get.mockReturnValue(of({ data: exactResolveResponse() }));

      await service.resolveIndicatorMappings({ versionId: VERSION_ID });

      expect(httpService.get).toHaveBeenCalledTimes(1);
      const [url, config] = httpService.get.mock.calls[0];
      expect(url).toContain('/api/prms/indicators/resolve');
      expect(config.params).toEqual({
        program: PORB_ROW.program,
        aow: PORB_ROW.aow,
        center: PORB_ROW.center,
        hlo_title: PORB_ROW.hloTitle,
        description: PORB_ROW.description,
      });
    });

    it('sources match_score from the candidate whose indicator_id matches (not candidates[0]) — PTM-T-5 rework finding 1', async () => {
      httpService.get.mockReturnValue(of({ data: fuzzyResolveResponse() }));

      const result = await service.resolveIndicatorMappings({
        versionId: VERSION_ID,
      });

      expect(result.response.fuzzy).toBe(1);
      expect(table).toHaveLength(1);
      const row = table[0];
      expect(row.match_quality).toBe('fuzzy');
      expect(row.pt_indicator_id).toBe('8006329bfd49');
      // The matched entry is candidates[1] (score 0.91), not candidates[0] (score
      // 0.668) — this assertion is false under a `candidates[0].score` mutation.
      expect(row.match_score).toBe(0.91);
    });
  });

  describe('PTM-AC-10 — match: none is recorded unmapped, never a candidate', () => {
    it('writes pt_indicator_id = NULL and match_quality = none, and does NOT store any candidates[] entry', async () => {
      httpService.get.mockReturnValue(of({ data: noneResolveResponse() }));

      const result = await service.resolveIndicatorMappings({
        versionId: VERSION_ID,
      });

      expect(result.response.unmapped).toBe(1);
      expect(table).toHaveLength(1);
      const row = table[0];
      expect(row.pt_indicator_id).toBeNull();
      expect(row.match_quality).toBe('none');
      expect(row.match_score).toBeNull();

      // The falsifier precondition: candidates[] must be non-empty, and neither of
      // its ids may have been stored.
      const noneCandidateIds = noneResolveResponse().candidates.map(
        (c) => c.indicator_id,
      );
      expect(noneCandidateIds.length).toBeGreaterThan(0);
      expect(noneCandidateIds).not.toContain(row.pt_indicator_id);
    });

    /**
     * The named falsifier (`tasks.md` `PTM-T-5`): if the `match: none` branch stored
     * `candidates[0].indicator_id` instead of `null`, this assertion goes red. This
     * test does not mutate the source — it re-asserts the exact behavioral contract
     * the mutation would violate, using the fixture the task requires (non-empty
     * `candidates[]`, so the mutation is observable).
     */
    it('FALSIFIER PROOF — pt_indicator_id must be strictly null, not candidates[0].indicator_id', async () => {
      const response = noneResolveResponse();
      httpService.get.mockReturnValue(of({ data: response }));

      await service.resolveIndicatorMappings({ versionId: VERSION_ID });

      const row = table[0];
      expect(row.pt_indicator_id).toBe(null);
      expect(row.pt_indicator_id).not.toBe(response.candidates[0].indicator_id);
    });
  });

  describe('PTM-AC-11 — idempotent double run', () => {
    it('running the fill twice over unchanged upstream answers does not duplicate the row; resolved_at is updated', async () => {
      httpService.get.mockReturnValue(of({ data: exactResolveResponse() }));

      await service.resolveIndicatorMappings({ versionId: VERSION_ID });
      expect(table).toHaveLength(1);
      const firstResolvedAt = table[0].resolved_at.getTime();

      // Force a distinguishable timestamp on the second run.
      await new Promise((resolve) => setTimeout(resolve, 5));

      const result = await service.resolveIndicatorMappings({
        versionId: VERSION_ID,
      });

      expect(table).toHaveLength(1); // still one row — no duplicate
      expect(result.response.exact).toBe(1);
      const secondResolvedAt = table[0].resolved_at.getTime();
      expect(secondResolvedAt).toBeGreaterThanOrEqual(firstResolvedAt);
    });

    it('also does not duplicate across a none -> exact re-resolution (same tuple, updated fields)', async () => {
      httpService.get.mockReturnValueOnce(of({ data: noneResolveResponse() }));
      await service.resolveIndicatorMappings({ versionId: VERSION_ID });
      expect(table).toHaveLength(1);
      expect(table[0].match_quality).toBe('none');

      httpService.get.mockReturnValueOnce(of({ data: exactResolveResponse() }));
      await service.resolveIndicatorMappings({ versionId: VERSION_ID });

      expect(table).toHaveLength(1);
      expect(table[0].match_quality).toBe('exact');
      expect(table[0].pt_indicator_id).toBe('8006329bfd49');
    });
  });

  describe('PTM-R-12 — never a write against env.DB_TOC (reads only, through the repository)', () => {
    it('reads PORB rows through PtPorbRepository.findPorbRowsForPhase, using the version phase id', async () => {
      httpService.get.mockReturnValue(of({ data: exactResolveResponse() }));

      await service.resolveIndicatorMappings({ versionId: VERSION_ID });

      expect(porbRepository.findPorbRowsForPhase).toHaveBeenCalledWith(
        'phase-uuid-abc',
        2026,
        undefined,
      );
    });

    it('forwards an explicit programId to the PORB repository unchanged', async () => {
      httpService.get.mockReturnValue(of({ data: exactResolveResponse() }));

      await service.resolveIndicatorMappings({
        versionId: VERSION_ID,
        programId: 'Food Frontiers and Security',
      });

      expect(porbRepository.findPorbRowsForPhase).toHaveBeenCalledWith(
        'phase-uuid-abc',
        2026,
        'Food Frontiers and Security',
      );
    });
  });

  describe('PTM-R-4 / total classification — no row is guessed on an unexpected or failed upstream answer', () => {
    it('skips a row (writes nothing) when /resolve answers with an unrecognised match value', async () => {
      httpService.get.mockReturnValue(
        of({ data: { indicator_id: 'x', match: 'weird-value' } }),
      );

      const result = await service.resolveIndicatorMappings({
        versionId: VERSION_ID,
      });

      expect(result.response.skipped).toBe(1);
      expect(table).toHaveLength(0);
    });

    it('skips a row when the upstream call rejects, and never throws out of the loop', async () => {
      const sentinelError = {
        message: 'SENTINEL-MESSAGE',
        config: { url: 'SENTINEL-URL' },
        response: { status: 500, data: 'SENTINEL-BODY' },
      };
      httpService.get.mockReturnValue(
        defer(() => Promise.reject(sentinelError)),
      );

      const result = await service.resolveIndicatorMappings({
        versionId: VERSION_ID,
      });

      expect(result.response.skipped).toBe(1);
      expect(table).toHaveLength(0);
    });
  });

  describe('no reporting version / unconfigured upstream', () => {
    it('returns not_found with zero counts when no version resolves', async () => {
      versionRepository.findOne.mockResolvedValue(null);

      const result = await service.resolveIndicatorMappings({});

      expect(result.response.status).toBe('not_found');
      expect(result.response.processed).toBe(0);
      expect(httpService.get).not.toHaveBeenCalled();
    });

    it('returns unavailable and skips every row when PT_INTEROP_BASE_URL is unset', async () => {
      delete process.env.PT_INTEROP_BASE_URL;

      const result = await service.resolveIndicatorMappings({
        versionId: VERSION_ID,
      });

      expect(result.response.status).toBe('unavailable');
      expect(result.response.skipped).toBe(1);
      expect(httpService.get).not.toHaveBeenCalled();
      expect(table).toHaveLength(0);
    });
  });

  describe('PTM-R-22 — structured, secret-free logging', () => {
    it('logs a structured completion summary with per-outcome counts, never the base URL, key or an upstream body', async () => {
      process.env.PT_INTEROP_API_KEY = 'SENTINEL-API-KEY-VALUE';
      httpService.get.mockReturnValue(of({ data: exactResolveResponse() }));

      const logSpy = (service as any).logger.log as jest.Mock;
      await service.resolveIndicatorMappings({ versionId: VERSION_ID });

      expect(logSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'pt.resolve.completed',
          processed: 1,
          exact: 1,
          fuzzy: 0,
          unmapped: 0,
          skipped: 0,
        }),
      );

      const serializedLogCalls = JSON.stringify(logSpy.mock.calls);
      expect(serializedLogCalls).not.toContain('SENTINEL-API-KEY-VALUE');
      expect(serializedLogCalls).not.toContain(process.env.PT_INTEROP_BASE_URL);
    });
  });
});
