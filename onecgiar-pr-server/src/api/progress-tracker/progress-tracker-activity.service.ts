import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ProgressTrackerIndicatorMap } from './entities/progress-tracker-indicator-map.entity';
import { Version } from '../versioning/entities/version.entity';
import { AppModuleIdEnum } from '../../shared/constants/role-type.enum';
import {
  ProgressTrackerProposalsStatus,
  ProgressTrackerService,
} from './progress-tracker.service';

/**
 * One mapped (ToC indicator, center) row of the active reporting version, with the
 * Progress Tracker evidence count of the KPI it maps to.
 *
 * `matched` is the same gate `ProgressTrackerService.getIndicatorResults` applies before
 * calling upstream (a PT id, not `match_quality: none`, not `needs_review`) — a row the
 * proposals route would answer `not_found` for is never reported as matched, so a badge
 * never points at a Progress Tracker tab that would come up empty.
 */
export interface ProgressTrackerIndicatorActivityItem {
  /** Integration `related_node_id` — the map's join key. */
  toc_results_indicator_id: string;
  /** Integration primary key (`toc_results_indicators.id`), the `indicator_id` the Reporting rows carry. */
  toc_indicator_integration_id: number | null;
  /** PRMS center acronym as stored on the map (`''` when the indicator has no center target). */
  center: string;
  matched: boolean;
  evidence_count: number;
  /** PT KPI id (permitted as opaque provenance, `PTM-R-3c`) — lets a shared target de-duplicate centers mapped to one KPI. */
  pt_indicator_id: string | null;
}

export interface ProgressTrackerIndicatorActivityBody {
  status: ProgressTrackerProposalsStatus;
  items: ProgressTrackerIndicatorActivityItem[];
  generated_at?: string;
}

export interface ProgressTrackerIndicatorActivityResponse {
  statusCode: 200;
  message: string;
  response: ProgressTrackerIndicatorActivityBody;
}

const ACTIVITY_MESSAGES: Record<ProgressTrackerProposalsStatus, string> = {
  ok: 'Progress Tracker indicator activity retrieved',
  not_found: 'No Progress Tracker activity found for this program',
  unavailable: 'Progress Tracker indicator activity is temporarily unavailable',
};

/** How long a program's `ok` answer is served from memory. */
export const PT_ACTIVITY_CACHE_TTL_MS = 5 * 60 * 1000;
/** Upper bound on cached programs — PRMS has ~13, the cap only guards against junk keys. */
const PT_ACTIVITY_CACHE_MAX_ENTRIES = 100;

interface CacheEntry {
  expiresAt: number;
  value: ProgressTrackerIndicatorActivityResponse;
}

/**
 * Per-program Progress Tracker activity for the Reporting tab badges: the upstream
 * ready-counts (evidence count per PT KPI) joined with `progress_tracker_indicator_map`
 * of the active reporting version, so the client gets every (ToC indicator, center)
 * match status and count in ONE call per program load.
 *
 * Only `ok` answers are cached (in memory, per instance, {@link PT_ACTIVITY_CACHE_TTL_MS});
 * `not_found` / `unavailable` are recomputed on the next call so a transient upstream
 * failure does not hide badges for five minutes. Concurrent calls for the same program
 * share one in-flight computation.
 */
@Injectable()
export class ProgressTrackerActivityService {
  private readonly logger = new Logger(ProgressTrackerActivityService.name);
  private readonly cache = new Map<string, CacheEntry>();
  private readonly inFlight = new Map<
    string,
    Promise<ProgressTrackerIndicatorActivityResponse>
  >();

  constructor(
    private readonly progressTrackerService: ProgressTrackerService,
    @InjectRepository(ProgressTrackerIndicatorMap)
    private readonly mappingRepository: Repository<ProgressTrackerIndicatorMap>,
    @InjectRepository(Version)
    private readonly versionRepository: Repository<Version>,
  ) {}

  public async getProgramIndicatorActivity(
    programId: string,
  ): Promise<ProgressTrackerIndicatorActivityResponse> {
    const key = (programId ?? '').trim().toUpperCase();
    if (!key) return this.buildEnvelope({ status: 'not_found', items: [] });

    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.value;
    if (cached) this.cache.delete(key);

    const pending = this.inFlight.get(key);
    if (pending) return pending;

    const computation = this.compute(programId.trim())
      .catch(() => {
        // A DB failure must degrade like an upstream one: no error text leaves this block.
        this.logger.warn({
          message: 'pt.activity.unavailable',
          status: 'unavailable',
          reason: 'internal',
        });
        return this.buildEnvelope({ status: 'unavailable', items: [] });
      })
      .then((value) => {
        if (value.response.status === 'ok') this.remember(key, value);
        return value;
      })
      .finally(() => this.inFlight.delete(key));
    this.inFlight.set(key, computation);
    return computation;
  }

  /** Test seam / admin hook: drops every cached program. */
  public clearCache(): void {
    this.cache.clear();
  }

  private async compute(
    programId: string,
  ): Promise<ProgressTrackerIndicatorActivityResponse> {
    const readyCounts = await this.progressTrackerService.getProgramReadyCounts(
      programId,
      { min_evidence: 1 },
    );
    const ready = readyCounts.response;
    if (ready.status !== 'ok') {
      return this.buildEnvelope({ status: ready.status, items: [] });
    }

    const counts = this.countsByPtIndicator(ready.items);
    const base = ready.generated_at ? { generated_at: ready.generated_at } : {};
    if (counts.size === 0) {
      return this.buildEnvelope({ status: 'ok', items: [], ...base });
    }

    const activeVersion = await this.versionRepository.findOne({
      where: {
        status: true,
        is_active: true,
        app_module_id: AppModuleIdEnum.REPORTING,
      },
    });
    if (!activeVersion) {
      return this.buildEnvelope({ status: 'not_found', items: [] });
    }

    const rows = await this.mappingRepository.find({
      where: {
        version_id: activeVersion.id,
        pt_indicator_id: In([...counts.keys()]),
        is_active: true,
      },
    });

    const items = (rows ?? []).map((row) => ({
      toc_results_indicator_id: row.toc_results_indicator_id,
      toc_indicator_integration_id:
        row.toc_indicator_integration_id === null ||
        row.toc_indicator_integration_id === undefined
          ? null
          : Number(row.toc_indicator_integration_id),
      center: row.center ?? '',
      matched:
        !!row.pt_indicator_id &&
        row.match_quality !== 'none' &&
        !row.needs_review,
      evidence_count: counts.get(row.pt_indicator_id ?? '') ?? 0,
      pt_indicator_id: row.pt_indicator_id ?? null,
    }));

    return this.buildEnvelope({ status: 'ok', items, ...base });
  }

  /**
   * `items[]` of the upstream ready-counts (Guide §4.3: `{ indicator_id, evidence_count }`),
   * reduced to a PT id → count map. Malformed entries are skipped; a repeated id keeps
   * the highest count.
   */
  private countsByPtIndicator(
    items: unknown[] | undefined,
  ): Map<string, number> {
    const counts = new Map<string, number>();
    for (const item of items ?? []) {
      const id = (item as any)?.indicator_id;
      const count = Number((item as any)?.evidence_count);
      if (
        typeof id !== 'string' ||
        !id ||
        !Number.isFinite(count) ||
        count <= 0
      ) {
        continue;
      }
      counts.set(id, Math.max(counts.get(id) ?? 0, count));
    }
    return counts;
  }

  private remember(
    key: string,
    value: ProgressTrackerIndicatorActivityResponse,
  ): void {
    if (this.cache.size >= PT_ACTIVITY_CACHE_MAX_ENTRIES) {
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) this.cache.delete(oldest);
    }
    this.cache.set(key, {
      expiresAt: Date.now() + PT_ACTIVITY_CACHE_TTL_MS,
      value,
    });
  }

  private buildEnvelope(
    body: ProgressTrackerIndicatorActivityBody,
  ): ProgressTrackerIndicatorActivityResponse {
    return {
      statusCode: 200,
      message: ACTIVITY_MESSAGES[body.status],
      response: body,
    };
  }
}
