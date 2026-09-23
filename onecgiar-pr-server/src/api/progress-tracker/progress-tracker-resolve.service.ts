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
import { classifyUpstreamFailure } from './progress-tracker.service';
import { PtPorbRepository, PtPorbRow } from './repositories/pt-porb.repository';
import { PtResolveTriggerDto } from './dto/pt-resolve-trigger.dto';

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
 * (`toc_results_indicator_id`, `version_id`) — the same tuple the migration's unique
 * key enforces (`PTM-T-1`). A second run over unchanged upstream answers updates the
 * existing row's `resolved_at` rather than inserting a duplicate.
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
}

export interface PtResolveTriggerBody extends PtResolveCounts {
  status: PtResolveRunStatus;
}

/** Same wire envelope shape as the read-proxy routes (`Return-data.interceptor.ts:30`). */
export interface PtResolveTriggerResponse {
  statusCode: 200;
  message: string;
  response: PtResolveTriggerBody;
}

const RESOLVE_MESSAGES: Record<PtResolveRunStatus, string> = {
  ok: 'Progress Tracker indicator mapping fill completed',
  not_found: 'No reporting version was found to resolve',
  unavailable: 'Progress Tracker is not configured; no indicator was resolved',
};

/** One `/resolve` outcome, per row — what {@link resolveOneRow} reports back to the loop. */
type RowOutcome = 'exact' | 'fuzzy' | 'unmapped' | 'skipped';

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
   */
  public async resolveIndicatorMappings(
    dto: PtResolveTriggerDto = {},
  ): Promise<PtResolveTriggerResponse> {
    const version = await this.resolveTargetVersion(dto.versionId);
    if (!version) {
      return this.buildEnvelope('not_found', this.emptyCounts());
    }

    // `version.toc_pahse_id` is declared `number` on the entity but the column is
    // `varchar(50)` at the DB level (a UUID-like phase id, per
    // `reporting-toc-context.service.ts`'s own `.trim()` on the same field read via
    // raw SQL) — read defensively rather than trusting the TS type.
    const phaseUuid = String((version.toc_pahse_id as unknown) ?? '').trim();

    if (!phaseUuid) {
      return this.buildEnvelope('not_found', this.emptyCounts());
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

    const counts = this.emptyCounts();

    const baseUrl = env.PT_INTEROP_BASE_URL;
    if (!baseUrl) {
      counts.skipped = porbRows.length;
      this.logger.warn({
        message: 'pt.resolve.unavailable',
        reason: 'unconfigured',
        versionId: version.id,
        ...counts,
      });
      return this.buildEnvelope('unavailable', counts);
    }

    for (const row of porbRows) {
      counts.processed += 1;
      const outcome = await this.resolveOneRow(row, baseUrl, version.id);
      if (outcome === 'exact') counts.exact += 1;
      else if (outcome === 'fuzzy') counts.fuzzy += 1;
      else if (outcome === 'unmapped') counts.unmapped += 1;
      else counts.skipped += 1;
    }

    // `design.md` §9 — structured start/finish with per-outcome counts (`PTM-AC-9`
    // "scoped to the reporting phase"). Only the classified counts and the PRMS
    // versionId are logged; no host, URL, key or body (`PTM-R-22`).
    this.logger.log({
      message: 'pt.resolve.completed',
      versionId: version.id,
      ...counts,
    });

    return this.buildEnvelope('ok', counts);
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
            center: row.center,
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
   * Upserts on (`toc_results_indicator_id`, `version_id`) — `PTM-R-21`/`PTM-AC-11`.
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
    }

    const ptProgramId =
      typeof data?.program_id === 'string' ? data.program_id : null;

    const existing = await this.mappingRepository.findOne({
      where: {
        toc_results_indicator_id: row.tocResultsIndicatorId,
        version_id: versionId,
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
      existing.resolved_at = resolvedAt;
      await this.mappingRepository.save(existing);
    } else {
      await this.mappingRepository.save(
        this.mappingRepository.create({
          toc_results_indicator_id: row.tocResultsIndicatorId,
          toc_indicator_integration_id: row.tocIndicatorIntegrationId ?? null,
          version_id: versionId,
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

  private emptyCounts(): PtResolveCounts {
    return { processed: 0, exact: 0, fuzzy: 0, unmapped: 0, skipped: 0 };
  }

  private buildEnvelope(
    status: PtResolveRunStatus,
    counts: PtResolveCounts,
  ): PtResolveTriggerResponse {
    return {
      statusCode: 200,
      message: RESOLVE_MESSAGES[status],
      response: { status, ...counts },
    };
  }
}
