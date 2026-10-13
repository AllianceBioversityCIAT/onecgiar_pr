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
import {
  getProgressTrackerTimeoutMs,
  getPtReviewThreshold,
} from './progress-tracker.config';
import { classifyUpstreamFailure } from './progress-tracker.service';
import { PtPorbRepository, PtPorbRow } from './repositories/pt-porb.repository';
import {
  PT_RESOLVE_LIMIT_DEFAULT,
  PtResolveTriggerDto,
} from './dto/pt-resolve-trigger.dto';
import { toPtCenterName } from './pt-center-name';

/**
 * `PTM-T-5` — the `/resolve` fill routine (`design.md` §4.1 "fill trigger", §5 rule 4,
 * §12 `PTM-DD-2`, `PTM-DD-3`; `requirements.md` `PTM-R-10`, `PTM-R-11`, `PTM-R-21`,
 * `PTM-R-22`, `PTM-R-30`; `PTM-AC-9`–`PTM-AC-11`).
 *
 * 🛑 **`PTM-R-11` — the "never guess" invariant.** When the upstream answers
 * `match: 'none'`, this service writes an explicit unmapped row
 * (`pt_indicator_id = NULL`) and **never** reads `candidates[]` to fill it in. The
 * `candidates[]` array is a picker suggestion list, not a resolution — promoting its
 * first entry to a stored mapping is exactly the `D-7` defect class this task exists
 * to close. The only place `candidates[]` is read at all is the `exact`/`fuzzy`
 * branch, and only to recover the **score** of the entry whose `indicator_id` already
 * equals the top-level `data.indicator_id` PT itself resolved — never to source the id.
 *
 * Idempotency (`PTM-R-21`, `PTM-AC-11`): upserts on
 * (`toc_results_indicator_id`, `version_id`, `center`) — the same tuple the migration's
 * unique key enforces (`1791400000000-ProgressTrackerIndicatorMapCenter`). A second run
 * over unchanged upstream answers updates the existing row's `resolved_at` rather than
 * inserting a duplicate.
 *
 * Center: the row stores the PRMS-side acronym (what the lookup keys on); `/resolve` is
 * sent PT's own spelling (`toPtCenterName`), because PT ranks on it rather than filtering.
 *
 * `PTM-R-12` (read-only `env.DB_TOC`): the only `env.DB_TOC` access in this file is
 * inside {@link PtPorbRepository}, and it is `SELECT`-only
 * (`db-toc-write-guard.spec.ts` enforces this repo-wide, not just here).
 */
export type PtResolveRunStatus = 'ok' | 'not_found' | 'unavailable';

export interface PtResolveCounts {
  processed: number;
  exact: number;
  fuzzy: number;
  unmapped: number;
  skipped: number;
  /** Rows passed over because the map already holds them (no upstream call; `force` re-resolves them). */
  already_resolved: number;
}

export interface PtResolveTriggerBody extends PtResolveCounts {
  status: PtResolveRunStatus;
  /** Ordered ToC indicator rows in scope (version + optional program). */
  total: number;
  /** Where this batch started. */
  cursor: number;
  /** Send this back as `cursor` for the next batch; `null` once every row has been visited. */
  next_cursor: number | null;
}

/** Same wire envelope shape as the read-proxy routes (`Return-data.interceptor.ts:30`). */
export interface PtResolveTriggerResponse {
  statusCode: 200;
  message: string;
  response: PtResolveTriggerBody;
}

const RESOLVE_MESSAGES: Record<PtResolveRunStatus, string> = {
  ok: 'Progress Tracker indicator mapping batch completed',
  not_found: 'No reporting version was found to resolve',
  unavailable: 'Progress Tracker is not configured; no indicator was resolved',
};

/** One `/resolve` outcome, per row — what {@link resolveOneRow} reports back to the loop. */
type RowOutcome = 'exact' | 'fuzzy' | 'unmapped' | 'skipped';

/** Top two candidate scores closer than this are a tie — flagged for review. */
export const PT_CANDIDATE_TIE_EPSILON = 0.005;

@Injectable()
export class ProgressTrackerResolveService {
  private readonly logger = new Logger(ProgressTrackerResolveService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly porbRepository: PtPorbRepository,
    @InjectRepository(ProgressTrackerIndicatorMap)
    private readonly mappingRepository: Repository<ProgressTrackerIndicatorMap>,
    @InjectRepository(Version)
    private readonly versionRepository: Repository<Version>,
  ) {}

  /**
   * `PTM-R-10` — walks the ToC indicator rows for one reporting version, calls
   * `/resolve` once per row (Guide §4.2), and upserts the mapping (`design.md` §5
   * rule 4). `PTM-R-30`: this is the admin-triggered mechanism (`PTM-DD-3`).
   *
   * Resumable batches: at most `dto.limit` upstream calls per request, starting at
   * `dto.cursor` in the deterministic row order (`ORDER BY tri.id, center`), answering
   * `next_cursor`. Retrying the same cursor after a gateway 504 is safe — rows the
   * first attempt already wrote are now passed over as `already_resolved`.
   */
  public async resolveIndicatorMappings(
    dto: PtResolveTriggerDto = {},
  ): Promise<PtResolveTriggerResponse> {
    const version = await this.resolveTargetVersion(dto.versionId);
    if (!version) {
      return this.buildEnvelope('not_found', this.emptyCounts(), {
        total: 0,
        cursor: 0,
        next_cursor: null,
      });
    }

    // `version.toc_pahse_id` is declared `number` on the entity but the column is
    // `varchar(50)` at the DB level (a UUID-like phase id, per
    // `reporting-toc-context.service.ts`'s own `.trim()` on the same field read via
    // raw SQL) — read defensively rather than trusting the TS type.
    const phaseUuid = String((version.toc_pahse_id as unknown) ?? '').trim();

    if (!phaseUuid) {
      return this.buildEnvelope('not_found', this.emptyCounts(), {
        total: 0,
        cursor: 0,
        next_cursor: null,
      });
    }

    // `wp.year = ?` predicate (Reviewer finding 2, `PTM-T-5` rework attempt 2) —
    // same `phase_year` field `aow-bilateral.repository.ts` reads off the version
    // (`resolveReportingContext`) to bind its own `wp.year = ?` precedents.
    const reportingYear = Number((version.phase_year as unknown) ?? NaN);

    const porbRows = await this.porbRepository.findPorbRowsForPhase(
      phaseUuid,
      reportingYear,
      dto.programId,
    );

    const total = porbRows.length;
    const cursor = Math.min(dto.cursor ?? 0, total);
    const limit = dto.limit ?? PT_RESOLVE_LIMIT_DEFAULT;
    const counts = this.emptyCounts();

    const baseUrl = env.PT_INTEROP_BASE_URL;
    if (!baseUrl) {
      counts.skipped = total - cursor;
      this.logger.warn({
        message: 'pt.resolve.unavailable',
        reason: 'unconfigured',
        versionId: version.id,
        ...counts,
      });
      return this.buildEnvelope('unavailable', counts, {
        total,
        cursor,
        next_cursor: null,
      });
    }

    const resolvedKeys = dto.force
      ? new Set<string>()
      : await this.findResolvedKeys(version.id);

    // `limit` caps upstream calls, not rows visited: passing over an already-mapped row
    // costs no `/resolve` round-trip, so it does not eat into the gateway window.
    let index = cursor;
    while (index < total && counts.processed < limit) {
      const row = porbRows[index];
      index += 1;
      if (
        resolvedKeys.has(this.rowKey(row.tocResultsIndicatorId, row.center))
      ) {
        counts.already_resolved += 1;
        continue;
      }
      counts.processed += 1;
      const outcome = await this.resolveOneRow(row, baseUrl, version.id);
      if (outcome === 'exact') counts.exact += 1;
      else if (outcome === 'fuzzy') counts.fuzzy += 1;
      else if (outcome === 'unmapped') counts.unmapped += 1;
      else counts.skipped += 1;
    }
    const nextCursor = index < total ? index : null;

    // `design.md` §9 — structured start/finish with per-outcome counts (`PTM-AC-9`
    // "scoped to the reporting phase"). Only the classified counts and the PRMS
    // versionId are logged; no host, URL, key or body (`PTM-R-22`).
    this.logger.log({
      message: 'pt.resolve.completed',
      versionId: version.id,
      total,
      cursor,
      nextCursor,
      ...counts,
    });

    return this.buildEnvelope('ok', counts, {
      total,
      cursor,
      next_cursor: nextCursor,
    });
  }

  /** Keys of the rows the map already holds for this version — what a non-`force` batch passes over. */
  private async findResolvedKeys(versionId: number): Promise<Set<string>> {
    const rows = await this.mappingRepository.find({
      where: { version_id: versionId },
      select: { toc_results_indicator_id: true, center: true },
    });
    return new Set(
      (rows ?? []).map((r) =>
        this.rowKey(r.toc_results_indicator_id, r.center),
      ),
    );
  }

  private rowKey(tocResultsIndicatorId: string, center: string | null): string {
    return `${tocResultsIndicatorId}\u0000${center ?? ''}`;
  }

  private async resolveTargetVersion(
    versionId?: number,
  ): Promise<Version | null> {
    if (versionId !== undefined) {
      return this.versionRepository.findOne({ where: { id: versionId } });
    }
    return this.versionRepository.findOne({
      where: {
        status: true,
        is_active: true,
        app_module_id: AppModuleIdEnum.REPORTING,
      },
    });
  }

  /**
   * The single `/resolve` call for one PORB row, and its upsert. Failures are
   * classified with the same leak-free contract the read-proxy service uses
   * (`classifyUpstreamFailure`, adopted verbatim — never re-implemented) and counted
   * as `skipped`, never guessed into a mapping.
   */
  private async resolveOneRow(
    row: PtPorbRow,
    baseUrl: string,
    versionId: number,
  ): Promise<RowOutcome> {
    const apiKey = env.PT_INTEROP_API_KEY;
    const headers = apiKey ? { 'X-API-Key': apiKey } : undefined;

    const start = Date.now();
    try {
      const res = await firstValueFrom(
        this.httpService.get(`${baseUrl}/api/prms/indicators/resolve`, {
          params: {
            program: row.program,
            aow: row.aow,
            center: toPtCenterName(row.center),
            kpi_type: row.kpiType ?? undefined,
            hlo_title: row.hloTitle,
            description: row.description,
          },
          timeout: getProgressTrackerTimeoutMs(),
          ...(headers ? { headers } : {}),
        }),
      );

      return await this.upsertMapping(row, versionId, res.data);
    } catch (err: any) {
      const failure = classifyUpstreamFailure(err, Date.now() - start);
      this.logger.warn({
        message: `pt.resolve.row.${failure.status}`,
        status: failure.status,
        ...(failure.upstreamStatus !== undefined
          ? { upstreamStatus: failure.upstreamStatus }
          : {}),
        durationMs: failure.durationMs,
      });
      return 'skipped';
    }
  }

  /**
   * Upserts on (`toc_results_indicator_id`, `version_id`, `center`) —
   * `PTM-R-21`/`PTM-AC-11`.
   *
   * `needs_review`: `exact` → false; `none` → true; `fuzzy` → true when its score is
   * below {@link getPtReviewThreshold} (env `PT_INTEROP_REVIEW_THRESHOLD`, or unknown) or the top two candidates tie
   * within {@link PT_CANDIDATE_TIE_EPSILON}.
   *
   * 🛑 `PTM-R-11`/`PTM-AC-10`: `candidates[]` is read **only** inside the
   * `match !== 'none'` branch, and only to find the score of the entry whose
   * `indicator_id` matches the top-level `data.indicator_id` — never to source the id
   * itself. When `match === 'none'`, `pt_indicator_id` and `match_score` are `null`
   * unconditionally; `data.candidates` is never touched in that branch.
   */
  private async upsertMapping(
    row: PtPorbRow,
    versionId: number,
    data: any,
  ): Promise<RowOutcome> {
    const match = data?.match;
    if (match !== 'exact' && match !== 'fuzzy' && match !== 'none') {
      // Total classification (`design.md` §5 rule 2): an upstream answer this
      // service does not recognise is never guessed into a row.
      this.logger.warn({
        message: 'pt.resolve.row.unexpected_match',
      });
      return 'skipped';
    }

    let ptIndicatorId: string | null = null;
    let matchScore: number | null = null;
    let needsReview = match !== 'exact';

    if (match !== 'none') {
      ptIndicatorId =
        typeof data.indicator_id === 'string' && data.indicator_id.length > 0
          ? data.indicator_id
          : null;

      if (!ptIndicatorId) {
        // `exact`/`fuzzy` claimed with no usable id — never guess; skip this row
        // rather than writing a resolved-looking row with nothing behind it.
        this.logger.warn({ message: 'pt.resolve.row.missing_indicator_id' });
        return 'skipped';
      }

      const candidates = Array.isArray(data?.candidates) ? data.candidates : [];
      const matchedCandidate = candidates.find(
        (c: any) => c?.indicator_id === ptIndicatorId,
      );
      matchScore =
        typeof matchedCandidate?.score === 'number'
          ? matchedCandidate.score
          : null;

      if (match === 'fuzzy') {
        needsReview =
          matchScore === null ||
          matchScore < getPtReviewThreshold() ||
          this.topCandidatesTie(candidates);
      }
    }

    const ptProgramId =
      typeof data?.program_id === 'string' ? data.program_id : null;

    const existing = await this.mappingRepository.findOne({
      where: {
        toc_results_indicator_id: row.tocResultsIndicatorId,
        version_id: versionId,
        center: row.center,
      },
    });

    const resolvedAt = new Date();

    if (existing) {
      existing.toc_indicator_integration_id =
        row.tocIndicatorIntegrationId ?? existing.toc_indicator_integration_id;
      existing.pt_indicator_id = ptIndicatorId;
      existing.pt_program_id = ptProgramId;
      existing.match_quality = match;
      existing.match_score = matchScore;
      existing.kpi_type = row.kpiType;
      existing.needs_review = needsReview;
      existing.resolved_at = resolvedAt;
      await this.mappingRepository.save(existing);
    } else {
      await this.mappingRepository.save(
        this.mappingRepository.create({
          toc_results_indicator_id: row.tocResultsIndicatorId,
          toc_indicator_integration_id: row.tocIndicatorIntegrationId ?? null,
          version_id: versionId,
          center: row.center,
          kpi_type: row.kpiType,
          needs_review: needsReview,
          pt_indicator_id: ptIndicatorId,
          pt_program_id: ptProgramId,
          match_quality: match,
          match_score: matchScore,
          resolved_at: resolvedAt,
        }),
      );
    }

    return match === 'none' ? 'unmapped' : match;
  }

  /** True when the two highest candidate scores are within {@link PT_CANDIDATE_TIE_EPSILON}. */
  private topCandidatesTie(candidates: any[]): boolean {
    const scores = candidates
      .map((c) => c?.score)
      .filter((s): s is number => typeof s === 'number')
      .sort((a, b) => b - a);
    return (
      scores.length >= 2 &&
      Math.abs(scores[0] - scores[1]) < PT_CANDIDATE_TIE_EPSILON
    );
  }

  private emptyCounts(): PtResolveCounts {
    return {
      processed: 0,
      exact: 0,
      fuzzy: 0,
      unmapped: 0,
      skipped: 0,
      already_resolved: 0,
    };
  }

  private buildEnvelope(
    status: PtResolveRunStatus,
    counts: PtResolveCounts,
    page: Pick<PtResolveTriggerBody, 'total' | 'cursor' | 'next_cursor'>,
  ): PtResolveTriggerResponse {
    return {
      statusCode: 200,
      message: RESOLVE_MESSAGES[status],
      response: { status, ...counts, ...page },
    };
  }
}
