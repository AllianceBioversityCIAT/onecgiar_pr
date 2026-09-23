// @akili-spec changes/progress-tracker-pull-bridge/progress-tracker-indicator-mapping
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { env } from 'node:process';
import { firstValueFrom } from 'rxjs';
import { ProgressTrackerIndicatorMap } from './entities/progress-tracker-indicator-map.entity';
import { Version } from '../versioning/entities/version.entity';
import { AppModuleIdEnum } from '../../shared/constants/role-type.enum';
import { getProgressTrackerTimeoutMs } from './progress-tracker.config';

/**
 * `PTM-T-3` — the proxy service: mapping lookup, upstream call, total status
 * classification (`design.md` §2.2, §4.1, §5; `requirements.md` `PTM-R-1`, `PTM-R-3`,
 * `PTM-R-4`, `PTM-R-5`, `PTM-R-7`, `PTM-R-20`, `PTM-R-22`; `PTM-AC-1`–`PTM-AC-7`).
 *
 * 🛑 **Watch-item decision (`design.md` §14, `tasks.md` pre-flight)** — which identifier
 * `:tocIndicatorId` carries, and how the map lookup joins it:
 *
 * **Decision: the `related_node_id` string, joined on `progress_tracker_indicator_map
 * .toc_results_indicator_id` (text) — never `toc_indicator_integration_id` (bigint).**
 *
 * Evidence, read at source:
 * - `framework-result-toc-indicators.service.ts:42-52,68-73` — the create payload sends
 *   the Integration **primary key** (`indicator.indicator_id`), PRMS resolves it via
 *   `findIndicatorById` and stores `indicatorRow.related_node_id` (the string) into
 *   `results_toc_result_indicators.toc_results_indicator_id`. The bigint PK is used only
 *   as a lookup key against `env.DB_TOC` at create time — it is never the value PRMS
 *   persists or re-surfaces afterwards.
 * - `aow-bilateral.repository.ts:777-788` (`findIndicatorById`) confirms the PK ↔
 *   `related_node_id` pair both live on `${env.DB_TOC}.toc_results_indicators`.
 * - `../source/PRMS-ProgressTracker-Pull-Bridge-Guide-2026-09-15.txt:322,337,339` — the
 *   Guide's own end-to-end walkthrough calls
 *   `GET /api/progress-tracker/indicators/5d51da6c6916/results`, and the very same value
 *   (`5d51da6c6916`) is what `results_toc_result_indicators.toc_results_indicator_id`
 *   holds for that result — i.e. the `related_node_id` string, not the Integration PK.
 *
 * Consequence: the mapping's `toc_indicator_integration_id` column (kept per
 * `design.md` §3.1) is **not** read by this lookup. It is carried for the fill routine
 * (`PTM-R-10`, a later task), which needs the bigint PK to call back into
 * `env.DB_TOC` — a different concern from addressing this read route.
 */

export type ProgressTrackerProposalsStatus = 'ok' | 'not_found' | 'unavailable';

/** Query params this service forwards upstream. Whitelisting/validation is `PTM-T-4`'s job. */
export interface ProgressTrackerResultsQuery {
  max_results?: number;
  refresh?: boolean;
  mode?: string;
}

/**
 * The business payload — the classification plus the whitelist named in `design.md`
 * §4.1 (`indicator?, results?, evidence_count?, generated_by?, source?`), re-projected
 * from the upstream body at the top level rather than spread verbatim. Sub-fields pass
 * through **unmodified**: `PTM-R-3c` permits the Progress Tracker `indicator_id` inside
 * opaque provenance (`result_key`) and the display-only `source.pt_url` deep link — only
 * `PTM-R-3a` (upstream base URL / API key) is still forbidden, and neither ever appears
 * in an upstream response body.
 */
export interface ProgressTrackerProposalsBody {
  status: ProgressTrackerProposalsStatus;
  indicator?: Record<string, unknown>;
  results?: unknown[];
  evidence_count?: number;
  generated_by?: unknown;
  source?: Record<string, unknown>;
  /**
   * `design.md` §4.1, amended 2026-09-22 — upstream **top-level** `generated_at`
   * (Guide §4.1 example, `:182`). Required by `PTM-R-13` (the provenance's generation
   * timestamp).
   */
  generated_at?: string;
  /**
   * `design.md` §4.1, amended 2026-09-22 — projected out of upstream
   * `cache.evidence_fingerprint` (Guide §4.1 example, `:186`), never the whole `cache`
   * object. Required by `PTM-R-13`. `cache.hit` and `cache.cached_at` are deliberately
   * **not** surfaced — the projection stays narrow.
   */
  evidence_fingerprint?: string;
}

/**
 * The wire envelope `ResponseInterceptor` (`Return-data.interceptor.ts`) expects:
 * `statusCode` (always 200, `PTM-DD-1`) and `message` are the only status-bearing
 * top-level keys, and `response` carries the whole business payload — including the
 * `ok` / `not_found` / `unavailable` classification, now nested under `response.status`.
 * A top-level `status` key must never be added back: the interceptor prefers
 * `data.status` over `data.statusCode` (`:30`) and would set the HTTP status from the
 * classification string instead of from `statusCode: 200` — the exact defect this
 * shape exists to prevent. Matches the house envelope at
 * `cgspace-discovery.service.ts:528-542`.
 */
export interface ProgressTrackerProposalsResponse {
  statusCode: 200;
  message: string;
  response: ProgressTrackerProposalsBody;
}

/**
 * A non-`ok` upstream outcome, deliberately made of primitives only — the `SourceFailure`
 * contract adopted **verbatim** from `cgspace-discovery.service.ts:48-60`. The caught
 * Axios error's `message`, `config.url` and `response.data` never leave the catch block
 * that builds this; only a numeric `upstreamStatus` (when present) and a `durationMs`
 * are read from it, so no upstream host, URL, key or body can reach a response or a log
 * line (`PTM-R-3`, `PTM-R-22`, `PTM-AC-5`, `.cursorrules`).
 */
export interface SourceFailure {
  status: 'not_found' | 'unavailable';
  upstreamStatus?: number;
  durationMs: number;
}

/**
 * Classifies a caught upstream error into the leak-free `SourceFailure` shape. A `404`
 * classifies as `not_found` (`PTM-AC-3`); every other outcome — `422`, `5xx`, timeout,
 * network failure — classifies as `unavailable` (`PTM-AC-4`, `PTM-AC-5`), matching the
 * total three-way rule in `PTM-R-4`. Only `err.response.status` (a plain number, when
 * present) is read from the caught error; `err.message`, `err.config` and
 * `err.response.data` are never touched.
 *
 * Extracted to module level (`PTM-T-5`) so `progress-tracker-resolve.service.ts` can
 * import and reuse this verbatim, per the Leader's brief ("reuse its
 * `classifyUpstreamFailure` … do not re-invent them") instead of duplicating the
 * leak-free contract in a second file. `ProgressTrackerService`'s own private method
 * of the same name now delegates here, unchanged in behavior.
 */
export function classifyUpstreamFailure(
  err: any,
  durationMs: number,
): SourceFailure {
  const upstreamStatus =
    typeof err?.response?.status === 'number' ? err.response.status : undefined;

  const failure: SourceFailure = {
    status: upstreamStatus === 404 ? 'not_found' : 'unavailable',
    durationMs,
  };
  if (upstreamStatus !== undefined) {
    failure.upstreamStatus = upstreamStatus;
  }
  return failure;
}

/** `message` per classification — mirrors the `cgspace-discovery` convention of a fixed string per outcome. */
const PROPOSALS_MESSAGES: Record<ProgressTrackerProposalsStatus, string> = {
  ok: 'Progress Tracker proposals retrieved',
  not_found: 'No Progress Tracker mapping found for this indicator',
  unavailable: 'Progress Tracker proposals are temporarily unavailable',
};

/**
 * `PTM-T-4` — `PTM-R-2` proxy. Query params this service forwards upstream for
 * `GET /api/prms/programs/{program_id}/ready-counts` (Guide §4.3). Whitelisting is
 * `PtReadyCountsQueryDto`'s job.
 */
export interface ProgressTrackerReadyCountsQuery {
  min_evidence?: number;
}

/**
 * The business payload for the ready-counts proxy — same three-way classification as
 * `ProgressTrackerProposalsBody` (`PTM-R-4`), re-projecting the upstream body's
 * documented fields (Guide §4.3: `program_id`, `items[]`, `indicators_with_evidence`,
 * `generated_at`) rather than spreading it verbatim.
 */
export interface ProgressTrackerReadyCountsBody {
  status: ProgressTrackerProposalsStatus;
  program_id?: string;
  items?: unknown[];
  indicators_with_evidence?: number;
  generated_at?: string;
}

/** Same wire envelope shape as {@link ProgressTrackerProposalsResponse}, for the ready-counts route. */
export interface ProgressTrackerReadyCountsResponse {
  statusCode: 200;
  message: string;
  response: ProgressTrackerReadyCountsBody;
}

/** `message` per classification for the ready-counts route. */
const READY_COUNTS_MESSAGES: Record<ProgressTrackerProposalsStatus, string> = {
  ok: 'Progress Tracker ready counts retrieved',
  not_found: 'No Progress Tracker ready counts found for this program',
  unavailable: 'Progress Tracker ready counts are temporarily unavailable',
};

@Injectable()
export class ProgressTrackerService {
  private readonly logger = new Logger(ProgressTrackerService.name);

  constructor(
    private readonly httpService: HttpService,
    @InjectRepository(ProgressTrackerIndicatorMap)
    private readonly mappingRepository: Repository<ProgressTrackerIndicatorMap>,
    @InjectRepository(Version)
    private readonly versionRepository: Repository<Version>,
  ) {}

  /**
   * `PTM-R-1` — proposals for one KPI. Business rules 1–3 from `design.md` §5:
   * (1) mapping lookup precedes the upstream call, (2) status classification is total,
   * (3) failures are primitives.
   */
  public async getIndicatorResults(
    tocIndicatorId: string,
    query: ProgressTrackerResultsQuery = {},
  ): Promise<ProgressTrackerProposalsResponse> {
    const activeVersion = await this.versionRepository.findOne({
      where: {
        status: true,
        is_active: true,
        app_module_id: AppModuleIdEnum.REPORTING,
      },
    });

    // No open reporting phase -> no mapping scope can exist; the cheapest correct
    // answer is the same `not_found` an unmapped indicator gets, with no HTTP call.
    if (!activeVersion) {
      return this.buildEnvelope({ status: 'not_found' });
    }

    const mapping = await this.mappingRepository.findOne({
      where: {
        toc_results_indicator_id: tocIndicatorId,
        version_id: activeVersion.id,
      },
    });

    // `PTM-AC-2` / design.md §5 rule 1: an unmapped indicator, or one whose row is
    // match_quality='none' (or otherwise carries no PT id), returns `not_found`
    // WITHOUT any HTTP call — zero calls to `HttpService.get` is the assertion.
    if (
      !mapping ||
      mapping.match_quality === 'none' ||
      !mapping.pt_indicator_id
    ) {
      return this.buildEnvelope({ status: 'not_found' });
    }

    return this.fetchUpstreamResults(mapping.pt_indicator_id, query);
  }

  /**
   * `PTM-R-2` — per-program ready counts. Unlike {@link getIndicatorResults}, no PRMS
   * mapping lookup precedes the call: `design.md` §4.1 documents no program-level
   * mapping table (only indicators are mapped, §3.1), and the Guide (§4.3) addresses
   * this route by the program id/name directly. The call, timeout, header and
   * three-way classification rules are otherwise identical to `PTM-R-1`.
   *
   * 🛑 **`:programId` resolved (`design.md` §4.1, 2026-09-22)** — do not re-open this:
   *
   * - `:programId` is the **PRMS program identifier** (name or official code) PRMS
   *   already holds — never a Progress Tracker id. The upstream accepts a name
   *   directly (Guide §4.3), and the PT program id is itself derived from the name
   *   (`md5("PROGRAM|{name}")[:12]`), so the name IS the PRMS-native form. The
   *   pass-through below (no translation, no mapping lookup) is therefore correct
   *   as written, not a gap (`PTM-R-3b`).
   * - `ProgressTrackerIndicatorMap.pt_program_id` is **fill-time provenance only** —
   *   a record of what `/resolve` returned per indicator, for audit. It is
   *   deliberately **not** read by this method. It is neither dead code nor a
   *   missing wire-up.
   */
  public async getProgramReadyCounts(
    programId: string,
    query: ProgressTrackerReadyCountsQuery = {},
  ): Promise<ProgressTrackerReadyCountsResponse> {
    const baseUrl = env.PT_INTEROP_BASE_URL;
    if (!baseUrl) {
      this.logger.warn({
        message: 'pt.readyCounts.unavailable',
        status: 'unavailable',
        reason: 'unconfigured',
        durationMs: 0,
      });
      return this.buildReadyCountsEnvelope({ status: 'unavailable' });
    }

    // `PTM-R-5` / `PTM-AC-7`: sent only when non-empty, and never logged.
    const apiKey = env.PT_INTEROP_API_KEY;
    const headers = apiKey ? { 'X-API-Key': apiKey } : undefined;

    const params: Record<string, unknown> = {};
    if (query.min_evidence !== undefined) {
      params.min_evidence = query.min_evidence;
    }

    const start = Date.now();
    try {
      const res = await firstValueFrom(
        this.httpService.get(
          `${baseUrl}/api/prms/programs/${programId}/ready-counts`,
          {
            params,
            timeout: getProgressTrackerTimeoutMs(),
            ...(headers ? { headers } : {}),
          },
        ),
      );

      return this.buildReadyCountsEnvelope({
        status: 'ok',
        ...this.sanitizeReadyCounts(res.data),
      });
    } catch (err: any) {
      const failure = this.classifyUpstreamFailure(err, Date.now() - start);
      this.logger.warn({
        message: `pt.readyCounts.${failure.status}`,
        status: failure.status,
        ...(failure.upstreamStatus !== undefined
          ? { upstreamStatus: failure.upstreamStatus }
          : {}),
        durationMs: failure.durationMs,
      });
      return this.buildReadyCountsEnvelope({ status: failure.status });
    }
  }

  /** Same shape as {@link sanitizeProposals}, whitelisted to the Guide §4.3 fields. */
  private sanitizeReadyCounts(
    data: any,
  ): Omit<ProgressTrackerReadyCountsBody, 'status'> {
    const safe: Omit<ProgressTrackerReadyCountsBody, 'status'> = {};

    if (typeof data?.program_id === 'string') {
      safe.program_id = data.program_id;
    }
    if (Array.isArray(data?.items)) {
      safe.items = data.items;
    }
    if (typeof data?.indicators_with_evidence === 'number') {
      safe.indicators_with_evidence = data.indicators_with_evidence;
    }
    if (typeof data?.generated_at === 'string') {
      safe.generated_at = data.generated_at;
    }

    return safe;
  }

  /** Same envelope discipline as {@link buildEnvelope}, for the ready-counts route. */
  private buildReadyCountsEnvelope(
    body: ProgressTrackerReadyCountsBody,
  ): ProgressTrackerReadyCountsResponse {
    return {
      statusCode: 200,
      message: READY_COUNTS_MESSAGES[body.status],
      response: body,
    };
  }

  /**
   * Assembles the wire envelope from a business payload: `statusCode: 200` always
   * (`PTM-DD-1`), `message` keyed off the classification, and the whole payload —
   * including `status` — nested under `response`, matching what `ResponseInterceptor`
   * (`Return-data.interceptor.ts:29-30`) expects. No top-level `status` key.
   */
  private buildEnvelope(
    body: ProgressTrackerProposalsBody,
  ): ProgressTrackerProposalsResponse {
    return {
      statusCode: 200,
      message: PROPOSALS_MESSAGES[body.status],
      response: body,
    };
  }

  /**
   * The single upstream call. Resolves `{ status: 'unavailable' }` when
   * `PT_INTEROP_BASE_URL` is unset (`PTM-AC-6` — no throw, the missing variable's name
   * never appears in the response) and otherwise classifies every settled outcome into
   * `ok` / `not_found` / `unavailable` (`PTM-R-4`).
   */
  private async fetchUpstreamResults(
    ptIndicatorId: string,
    query: ProgressTrackerResultsQuery,
  ): Promise<ProgressTrackerProposalsResponse> {
    const baseUrl = env.PT_INTEROP_BASE_URL;
    if (!baseUrl) {
      this.logger.warn({
        message: 'pt.proxy.unavailable',
        status: 'unavailable',
        reason: 'unconfigured',
        durationMs: 0,
      });
      return this.buildEnvelope({ status: 'unavailable' });
    }

    // `PTM-R-5` / `PTM-AC-7`: sent only when non-empty, and never logged.
    const apiKey = env.PT_INTEROP_API_KEY;
    const headers = apiKey ? { 'X-API-Key': apiKey } : undefined;

    const start = Date.now();
    try {
      const res = await firstValueFrom(
        this.httpService.get(
          `${baseUrl}/api/prms/indicators/${ptIndicatorId}/results`,
          {
            params: this.buildUpstreamParams(query),
            timeout: getProgressTrackerTimeoutMs(),
            ...(headers ? { headers } : {}),
          },
        ),
      );

      return this.buildEnvelope({
        status: 'ok',
        ...this.sanitizeProposals(res.data),
      });
    } catch (err: any) {
      const failure = this.classifyUpstreamFailure(err, Date.now() - start);
      this.logger.warn({
        message: `pt.proxy.${failure.status}`,
        status: failure.status,
        ...(failure.upstreamStatus !== undefined
          ? { upstreamStatus: failure.upstreamStatus }
          : {}),
        durationMs: failure.durationMs,
      });
      return this.buildEnvelope({ status: failure.status });
    }
  }

  private buildUpstreamParams(
    query: ProgressTrackerResultsQuery,
  ): Record<string, unknown> {
    const params: Record<string, unknown> = {};
    if (query.max_results !== undefined) {
      params.max_results = query.max_results;
    }
    if (query.refresh !== undefined) {
      params.refresh = query.refresh;
    }
    if (query.mode !== undefined) {
      params.mode = query.mode;
    }
    return params;
  }

  /**
   * Thin instance-method wrapper kept for call-site continuity; the classification
   * itself is the module-level {@link classifyUpstreamFailure} (`PTM-T-5` review
   * finding — extracted so `progress-tracker-resolve.service.ts` can reuse it
   * verbatim instead of re-implementing the leak-free contract).
   */
  private classifyUpstreamFailure(err: any, durationMs: number): SourceFailure {
    return classifyUpstreamFailure(err, durationMs);
  }

  /**
   * Re-projects the upstream `200` body through the whitelist named in `design.md`
   * §4.1 (`indicator?, results?, evidence_count?, generated_by?, source?`) — never a
   * verbatim spread of the *whole* upstream body (an unlisted top-level field, were
   * one ever added upstream, does not silently pass through). Each whitelisted
   * object's **sub-fields do pass through unmodified** — `PTM-R-3c` permits the
   * Progress Tracker `indicator_id` inside opaque provenance (`result_key`, built as
   * `<indicator_id>:<n>`, per the Guide `source/...txt:214`) and the display-only
   * `source.pt_url` deep link. Only `PTM-R-3a` (the upstream **base URL** and **API
   * key**) is still forbidden, and neither ever appears in an upstream response body.
   */
  private sanitizeProposals(
    data: any,
  ): Omit<ProgressTrackerProposalsBody, 'status'> {
    const safe: Omit<ProgressTrackerProposalsBody, 'status'> = {};

    if (data?.indicator && typeof data.indicator === 'object') {
      safe.indicator = data.indicator;
    }
    if (Array.isArray(data?.results)) {
      safe.results = data.results;
    }
    if (typeof data?.evidence_count === 'number') {
      safe.evidence_count = data.evidence_count;
    }
    if (data?.generated_by && typeof data.generated_by === 'object') {
      safe.generated_by = data.generated_by;
    }
    if (data?.source && typeof data.source === 'object') {
      safe.source = data.source;
    }
    // `design.md` §4.1, amended 2026-09-22: top-level passthrough, required by `PTM-R-13`.
    if (typeof data?.generated_at === 'string') {
      safe.generated_at = data.generated_at;
    }
    // Projected out of `cache.evidence_fingerprint` only — `cache.hit` and
    // `cache.cached_at` are deliberately never surfaced (narrow projection, not the
    // whole `cache` object).
    if (typeof data?.cache?.evidence_fingerprint === 'string') {
      safe.evidence_fingerprint = data.cache.evidence_fingerprint;
    }

    return safe;
  }
}
