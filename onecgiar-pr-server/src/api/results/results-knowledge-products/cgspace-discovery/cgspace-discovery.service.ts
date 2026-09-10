import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { CgspaceDiscoveryMapper } from './cgspace-discovery.mapper';
import { CgspaceSearchQueryDto } from './dto/cgspace-search-query.dto';
import { CgspaceFacetQueryDto } from './dto/cgspace-facet-query.dto';
import {
  CgspaceItemDto,
  CgspaceMergedSearchPageDto,
  CgspacePageMetaDto,
  SourceStatusDto,
} from './dto/cgspace-item.dto';
import {
  ALL_REPOSITORIES,
  KP_REPOSITORIES,
  KpRepository,
  RepositoryAdapter,
  escapeSolrQuery,
  translateParams,
} from './repositories.config';
import { dedupe, interleave } from './merge';

export interface CacheEntry<T> {
  expires: number;
  value: T;
}

export interface CgspaceFacetValueDto {
  label: string;
  value: string;
  count: number;
  /** Selected repositories whose facet carries this (normalized) label (`KPM-DD-6`). */
  repositories: KpRepository[];
}

export interface CgspaceFacetPageDto {
  name: string;
  values: CgspaceFacetValueDto[];
  /** One row per selected repository, in selection order (`KPM-R-9`). */
  sources: SourceStatusDto[];
}

export interface CgspaceServiceResponse<T> {
  response: T;
  message: string;
  status: number;
}

/**
 * A per-source HTTP failure. This is the **only** thing `searchOne`/`facetOne` reject with, and it
 * is deliberately made of primitives: repository key, a classified status and — at most — the
 * numeric upstream status. The caught Axios error itself (message, config.url, response.data)
 * never leaves the catch block, so no base URL, hostname, env value or upstream body can reach a
 * response or a log line (`KPM-R-8`, `KPM-AC-9`, `.cursorrules`).
 */
export interface SourceFailure {
  repository: KpRepository;
  status: 'timeout' | 'error';
  upstreamStatus?: number;
  durationMs: number;
}

/** What one source contributed to the merge; cached (ok only) under a repository-scoped key. */
interface SourceSearchPayload {
  items: CgspaceItemDto[];
  page: CgspacePageMetaDto;
}

interface SearchSourceOk extends SourceSearchPayload {
  repository: KpRepository;
  status: 'ok';
  durationMs: number;
}

interface SearchSourceUnconfigured {
  repository: KpRepository;
  status: 'unconfigured';
  durationMs: number;
}

type SearchSourceOutcome =
  | SearchSourceOk
  | SearchSourceUnconfigured
  | SourceFailure;

interface FacetSourceOk {
  repository: KpRepository;
  status: 'ok';
  values: CgspaceFacetValueDto[];
  durationMs: number;
}

type FacetSourceOutcome =
  | FacetSourceOk
  | SearchSourceUnconfigured
  | SourceFailure;

const SEARCH_TIMEOUT_MS = 8000;
const SEARCH_CACHE_MAX = 600;
const SEARCH_CACHE_TTL_MS = 60_000;
const FACET_CACHE_MAX = 60;
const FACET_CACHE_TTL_MS = 600_000;
const ALLOWED_FACETS = new Set(['itemtype', 'affiliation']);

/** Generalized, repository-neutral copy (`KPM-R-11`); the 502 wrapper shape is unchanged so the
 * client's `KCSR` retry — which keys on a body `status >= 400` — still covers a total outage. */
const UNAVAILABLE_MESSAGE = 'Repository search is temporarily unavailable';
const SEARCH_RESULTS_MESSAGE = 'Repository search results';
const FACET_RESULTS_MESSAGE = 'Repository facet results';

@Injectable()
export class CgspaceDiscoveryService {
  private readonly logger = new Logger(CgspaceDiscoveryService.name);

  /**
   * Repositories already warned about a missing base URL. The provider is a singleton, so this is
   * "once per process" (`design.md` §4.1) without a module-level global that would leak between
   * test cases.
   */
  private readonly configMissingWarned = new Set<KpRepository>();

  /** Per-source caches. Only `ok` results are ever written (`KPM-DD-2`): a failed or unconfigured
   * source is re-queried on the next call, so Retry is never a cached no-op, while its healthy
   * siblings are still served from cache. */
  public readonly searchCache = new Map<
    string,
    CacheEntry<SourceSearchPayload>
  >();
  public readonly facetCache = new Map<
    string,
    CacheEntry<CgspaceFacetValueDto[]>
  >();

  constructor(
    private readonly httpService: HttpService,
    private readonly mapper: CgspaceDiscoveryMapper,
  ) {}

  /**
   * Resolves the selected repositories, defaulting to all three. The DTO transform already
   * normalizes/defaults the query param; this covers direct service calls where `repository` is
   * simply absent from the object.
   */
  private resolveRepositories(
    selected?: KpRepository[],
  ): readonly KpRepository[] {
    return selected && selected.length ? selected : ALL_REPOSITORIES;
  }

  /**
   * Reads one adapter's base URL from `process.env` at call time. Missing/blank warns
   * `kp.discovery.config.missing { repository }` once per process and returns null — the caller
   * then reports `unconfigured` without issuing any HTTP call (`KPM-R-13`). The env **variable
   * name** is never logged, only the repository key.
   */
  private resolveBaseUrl(adapter: RepositoryAdapter): string | null {
    const envUrl = process.env[adapter.baseUrlEnv];
    if (!envUrl || !envUrl.trim()) {
      if (!this.configMissingWarned.has(adapter.key)) {
        this.configMissingWarned.add(adapter.key);
        this.logger.warn({
          message: 'kp.discovery.config.missing',
          repository: adapter.key,
        });
      }
      return null;
    }
    return envUrl.trim();
  }

  /**
   * Retrieves an entry from cache if it exists and has not expired.
   */
  private getFromCache<T>(
    cache: Map<string, CacheEntry<T>>,
    key: string,
  ): T | null {
    const entry = cache.get(key);
    if (!entry) {
      return null;
    }
    if (Date.now() > entry.expires) {
      cache.delete(key);
      return null;
    }
    return entry.value;
  }

  /**
   * Inserts an entry into bounded TTL cache, evicting the oldest key if max capacity is exceeded.
   */
  private setInCache<T>(
    cache: Map<string, CacheEntry<T>>,
    key: string,
    value: T,
    ttlMs: number,
    maxEntries: number,
  ): void {
    if (cache.has(key)) {
      cache.delete(key);
    } else if (cache.size >= maxEntries) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey !== undefined) {
        cache.delete(oldestKey);
      }
    }
    cache.set(key, {
      expires: Date.now() + ttlMs,
      value,
    });
  }

  /**
   * Per-source search cache key: the request params **plus the repository** (`KPM-R-8` "its own
   * cache key"), so one source's result can never be served for another.
   */
  private buildSearchCacheKey(
    dto: CgspaceSearchQueryDto,
    repository: KpRepository,
  ): string {
    return JSON.stringify({
      query: dto.query ?? '',
      page: dto.page ?? 0,
      size: dto.size ?? 10,
      type: dto.type ?? '',
      center: dto.center ?? '',
      year: dto.year ?? '',
      repository,
    });
  }

  /**
   * Per-source facet cache key: `(name, prefix, size, repository)` (`design.md` §4.1 Cache row).
   * Without `repository` the first source's values would be served for every other source.
   */
  private buildFacetCacheKey(
    name: string,
    dto: CgspaceFacetQueryDto,
    repository: KpRepository,
  ): string {
    return JSON.stringify({
      name,
      prefix: dto.prefix ?? '',
      size: dto.size ?? 50,
      repository,
    });
  }

  /**
   * Sanitizes Solr query strings by removing leading wildcards and escaping special characters.
   * Delegates to the pure `escapeSolrQuery` in `repositories.config.ts`, which `translateParams`
   * also uses — one implementation, one behavior for every source.
   */
  public escapeSolr(query?: string): string {
    return escapeSolrQuery(query);
  }

  /**
   * Classifies a caught upstream error into a leak-free `SourceFailure`. `timeout` when the Axios
   * `code` is `ECONNABORTED`/`ETIMEDOUT` or the message mentions a timeout (the message is
   * *tested*, never stored or logged), otherwise `error`; the upstream HTTP status is carried as a
   * plain number when present (`design.md` §5).
   */
  private classifyFailure(
    err: any,
    repository: KpRepository,
    durationMs: number,
  ): SourceFailure {
    const code = typeof err?.code === 'string' ? err.code : '';
    const rawMessage = typeof err?.message === 'string' ? err.message : '';
    const timedOut =
      code === 'ECONNABORTED' ||
      code === 'ETIMEDOUT' ||
      /timeout/i.test(rawMessage);

    const failure: SourceFailure = {
      repository,
      status: timedOut ? 'timeout' : 'error',
      durationMs,
    };

    const upstreamStatus = err?.response?.status;
    if (typeof upstreamStatus === 'number') {
      failure.upstreamStatus = upstreamStatus;
    }

    return failure;
  }

  /**
   * Normalizes a settled per-source promise into an outcome row. A rejection that is not already a
   * classified `SourceFailure` (which cannot happen today — every throw path goes through
   * `classifyFailure`) is coerced to a bare `error` rather than propagated, so an unexpected
   * rejection reason can never reach a log line or a response body.
   */
  private normalizeOutcome<T extends { repository: KpRepository }>(
    settled: PromiseSettledResult<T>,
    repository: KpRepository,
  ): T | SourceFailure {
    if (settled.status === 'fulfilled') {
      return settled.value;
    }
    const reason: any = settled.reason;
    if (
      reason &&
      (reason.status === 'timeout' || reason.status === 'error') &&
      typeof reason.repository === 'string'
    ) {
      return reason as SourceFailure;
    }
    return { repository, status: 'error', durationMs: 0 };
  }

  private isFailure(outcome: { status: string }): outcome is SourceFailure {
    return outcome.status === 'timeout' || outcome.status === 'error';
  }

  /** A source has a next page when the requested page index is not its last (`KPM-R-20`). */
  private sourceHasMore(page: CgspacePageMetaDto): boolean {
    return page.number + 1 < page.totalPages;
  }

  /**
   * Queries one repository: cache -> env check -> HTTP -> mapper.
   *
   * **Resolves** `{ status: 'unconfigured' }` when the base URL env var is missing (no HTTP call,
   * never a 5xx — `KPM-R-13`) and **rejects** with a classified `SourceFailure` on any HTTP
   * failure, so `Promise.allSettled` is load-bearing: swapping it for `Promise.all` genuinely
   * fails the whole request (`design.md` §5, the live gate in `requirements.md` §9).
   */
  private async searchOne(
    dto: CgspaceSearchQueryDto,
    adapter: RepositoryAdapter,
  ): Promise<SearchSourceOk | SearchSourceUnconfigured> {
    const start = Date.now();
    const cacheKey = this.buildSearchCacheKey(dto, adapter.key);

    const cached = this.getFromCache(this.searchCache, cacheKey);
    if (cached) {
      return {
        repository: adapter.key,
        status: 'ok',
        items: cached.items,
        page: cached.page,
        durationMs: Date.now() - start,
      };
    }

    const baseUrl = this.resolveBaseUrl(adapter);
    if (!baseUrl) {
      return {
        repository: adapter.key,
        status: 'unconfigured',
        durationMs: Date.now() - start,
      };
    }

    try {
      const res = await firstValueFrom(
        this.httpService.get(`${baseUrl}/discover/search/objects`, {
          params: translateParams(dto, adapter),
          paramsSerializer: {
            encode: (param: string) => encodeURIComponent(param),
          },
          timeout: SEARCH_TIMEOUT_MS,
        }),
      );

      const pageDto = this.mapper.toPage(res.data, adapter);
      const payload = this.applyYearFallback(dto, adapter, {
        items: pageDto.items,
        page: pageDto.page,
      });

      this.setInCache(
        this.searchCache,
        cacheKey,
        payload,
        SEARCH_CACHE_TTL_MS,
        SEARCH_CACHE_MAX,
      );

      return {
        repository: adapter.key,
        status: 'ok',
        items: payload.items,
        page: payload.page,
        durationMs: Date.now() - start,
      };
    } catch (err: any) {
      throw this.classifyFailure(err, adapter.key, Date.now() - start);
    }
  }

  /**
   * `KPM-DD-7` fallback: a repository whose adapter declares no year filter field cannot be
   * constrained upstream, so the mapped `year` is filtered here instead — the non-admin year lock
   * still holds for everything listed. Per-source `totalElements` stays raw (the upstream total),
   * so a post-filtered page can be shorter than `size` (accepted, `KPM-DD-7`). No adapter in
   * `design.md` §3.3 needs this today; it is kept for a future repository without a year facet.
   */
  private applyYearFallback(
    dto: CgspaceSearchQueryDto,
    adapter: RepositoryAdapter,
    payload: SourceSearchPayload,
  ): SourceSearchPayload {
    if (!dto.year || adapter.yearFilterField) {
      return payload;
    }

    const wanted = Number(dto.year);
    const kept = payload.items.filter((item) => item.year === wanted);

    this.logger.log({
      message: 'kp.discovery.year_postfiltered',
      repository: adapter.key,
      kept: kept.length,
      dropped: payload.items.length - kept.length,
    });

    return { items: kept, page: payload.page };
  }

  /**
   * Fans out over the selected repositories in parallel, merges (round-robin) and dedupes the
   * page, and reports every source's outcome in `sources[]` (`KPM-R-8`, `KPM-DD-2`).
   *
   * Status rules: **502** (legacy wrapper, generalized copy) only when *every* selected source
   * ended `timeout`/`error`; **200** with `items: []` when every selected source is merely
   * `unconfigured` (`KPM-R-13` — never a 5xx for a partial deployment); **200** otherwise, so one
   * failing source never fails the others (`KPM-R-7`).
   */
  public async search(
    dto: CgspaceSearchQueryDto,
  ): Promise<CgspaceServiceResponse<CgspaceMergedSearchPageDto>> {
    const repositories = this.resolveRepositories(dto.repository);

    const settled = await Promise.allSettled(
      repositories.map((key) => this.searchOne(dto, KP_REPOSITORIES[key])),
    );

    const outcomes: SearchSourceOutcome[] = settled.map((result, index) =>
      this.normalizeOutcome(result, repositories[index]),
    );

    for (const outcome of outcomes) {
      if (this.isFailure(outcome)) {
        this.logger.warn({
          message: 'kp.discovery.source_failed',
          repository: outcome.repository,
          status: outcome.status,
          ...(outcome.upstreamStatus !== undefined
            ? { upstreamStatus: outcome.upstreamStatus }
            : {}),
        });
      }
    }

    const okOutcomes = outcomes.filter(
      (outcome): outcome is SearchSourceOk => outcome.status === 'ok',
    );

    const sources: SourceStatusDto[] = outcomes.map((outcome) =>
      outcome.status === 'ok'
        ? {
            repository: outcome.repository,
            status: 'ok',
            total: outcome.page.totalElements,
            hasMore: this.sourceHasMore(outcome.page),
          }
        : {
            repository: outcome.repository,
            status: outcome.status,
            total: 0,
            hasMore: false,
          },
    );

    const merged = interleave(okOutcomes.map((outcome) => outcome.items));
    const { items, dedupedCount } = dedupe(merged, ALL_REPOSITORIES);

    const number = dto.page ?? 0;
    const size = dto.size ?? 10;
    const totalElements = Math.max(
      0,
      okOutcomes.reduce((sum, outcome) => sum + outcome.page.totalElements, 0) -
        dedupedCount,
    );
    const totalPages = okOutcomes.reduce(
      (max, outcome) => Math.max(max, outcome.page.totalPages),
      0,
    );

    const allFailed =
      outcomes.length > 0 &&
      outcomes.every((outcome) => this.isFailure(outcome));
    const allUnconfigured =
      outcomes.length > 0 &&
      outcomes.every((outcome) => outcome.status === 'unconfigured');
    const outcome = allFailed
      ? 'failure'
      : allUnconfigured
        ? 'unconfigured'
        : okOutcomes.length === outcomes.length
          ? 'success'
          : 'partial';

    this.logger.log({
      message: 'kp.discovery.search',
      repositories: [...repositories],
      sources: outcomes.map((row) => ({
        repository: row.repository,
        status: row.status,
        durationMs: row.durationMs,
        total: row.status === 'ok' ? row.page.totalElements : 0,
      })),
      merged: items.length,
      dedupedCount,
      page: number,
      size,
      hasQuery: !!dto.query?.trim(),
      outcome,
    });

    // With no ok source, `items` is already empty and every total is 0 — the 502 branch differs
    // only in message/status, so the body is assembled once.
    return {
      response: {
        items,
        page: {
          number,
          size,
          totalElements,
          totalPages,
          hasMore: sources.some((source) => source.hasMore),
        },
        sources,
      },
      message: allFailed ? UNAVAILABLE_MESSAGE : SEARCH_RESULTS_MESSAGE,
      status: allFailed ? 502 : 200,
    };
  }

  /**
   * Resolves the logical facet name (`itemtype` | `affiliation`) to this adapter's physical facet.
   * `null` when the adapter declares no center facet — that repository simply contributes nothing
   * to the union and no HTTP call is made (`KPM-OQ-3`).
   */
  private resolveFacetName(
    name: string,
    adapter: RepositoryAdapter,
  ): string | null {
    return name === 'itemtype'
      ? adapter.facets.type
      : (adapter.facets.center ?? null);
  }

  /**
   * Queries one repository's facet. Same contract as `searchOne`: resolves `unconfigured` when the
   * env var is missing, rejects with a classified `SourceFailure` on an HTTP failure, and only
   * caches `ok` results — under a key that includes the repository.
   */
  private async facetOne(
    name: string,
    dto: CgspaceFacetQueryDto,
    adapter: RepositoryAdapter,
  ): Promise<FacetSourceOk | SearchSourceUnconfigured> {
    const start = Date.now();
    const facetName = this.resolveFacetName(name, adapter);
    if (!facetName) {
      return {
        repository: adapter.key,
        status: 'ok',
        values: [],
        durationMs: Date.now() - start,
      };
    }

    const cacheKey = this.buildFacetCacheKey(name, dto, adapter.key);
    const cached = this.getFromCache(this.facetCache, cacheKey);
    if (cached) {
      return {
        repository: adapter.key,
        status: 'ok',
        values: cached,
        durationMs: Date.now() - start,
      };
    }

    const baseUrl = this.resolveBaseUrl(adapter);
    if (!baseUrl) {
      return {
        repository: adapter.key,
        status: 'unconfigured',
        durationMs: Date.now() - start,
      };
    }

    const params: Record<string, any> = { size: dto.size ?? 50 };
    if (dto.prefix) {
      params.prefix = dto.prefix;
    }

    try {
      const res = await firstValueFrom(
        this.httpService.get(`${baseUrl}/discover/facets/${facetName}`, {
          params,
          paramsSerializer: {
            encode: (param: string) => encodeURIComponent(param),
          },
          timeout: SEARCH_TIMEOUT_MS,
        }),
      );

      const rawValues = res.data?._embedded?.values || [];
      const values: CgspaceFacetValueDto[] = rawValues.map((v: any) => ({
        label: v?.label ?? '',
        value: v?.label ?? '',
        count: typeof v?.count === 'number' ? v.count : 0,
        repositories: [adapter.key],
      }));

      this.setInCache(
        this.facetCache,
        cacheKey,
        values,
        FACET_CACHE_TTL_MS,
        FACET_CACHE_MAX,
      );

      return {
        repository: adapter.key,
        status: 'ok',
        values,
        durationMs: Date.now() - start,
      };
    } catch (err: any) {
      throw this.classifyFailure(err, adapter.key, Date.now() - start);
    }
  }

  /**
   * Fans the facet request out over the selected repositories and returns the **union** keyed on
   * the normalized label (trim + case-fold): counts summed, `value` = the first seen raw value,
   * `repositories[]` recording which sources carry it (`KPM-R-9`, `KPM-DD-6`).
   *
   * A source failure simply drops that source from the union — HTTP 200 with its status in
   * `sources[]` (`KPM-AC-11`). The 502 wrapper is kept only for a total outage, mirroring
   * `search`.
   */
  public async facets(
    name: string,
    dto: CgspaceFacetQueryDto,
  ): Promise<CgspaceServiceResponse<CgspaceFacetPageDto>> {
    if (!ALLOWED_FACETS.has(name)) {
      return {
        response: { name, values: [], sources: [] },
        message: `Invalid facet '${name}'. Allowed: itemtype, affiliation`,
        status: 400,
      };
    }

    const repositories = this.resolveRepositories(dto.repository);

    const settled = await Promise.allSettled(
      repositories.map((key) => this.facetOne(name, dto, KP_REPOSITORIES[key])),
    );

    const outcomes: FacetSourceOutcome[] = settled.map((result, index) =>
      this.normalizeOutcome(result, repositories[index]),
    );

    for (const outcome of outcomes) {
      if (this.isFailure(outcome)) {
        this.logger.warn({
          message: 'kp.discovery.source_failed',
          repository: outcome.repository,
          status: outcome.status,
          ...(outcome.upstreamStatus !== undefined
            ? { upstreamStatus: outcome.upstreamStatus }
            : {}),
        });
      }
    }

    const okOutcomes = outcomes.filter(
      (outcome): outcome is FacetSourceOk => outcome.status === 'ok',
    );

    const values = this.unionFacetValues(okOutcomes);

    const sources: SourceStatusDto[] = outcomes.map((outcome) => ({
      repository: outcome.repository,
      status: outcome.status,
      total: outcome.status === 'ok' ? outcome.values.length : 0,
      hasMore: false,
    }));

    const allFailed =
      outcomes.length > 0 && outcomes.every((row) => this.isFailure(row));
    const allUnconfigured =
      outcomes.length > 0 &&
      outcomes.every((row) => row.status === 'unconfigured');
    const outcome = allFailed
      ? 'failure'
      : allUnconfigured
        ? 'unconfigured'
        : okOutcomes.length === outcomes.length
          ? 'success'
          : 'partial';

    this.logger.log({
      message: 'kp.discovery.facets',
      name,
      repositories: [...repositories],
      sources: outcomes.map((row) => ({
        repository: row.repository,
        status: row.status,
        durationMs: row.durationMs,
        total: row.status === 'ok' ? row.values.length : 0,
      })),
      prefixLength: dto.prefix?.length ?? 0,
      size: dto.size ?? 50,
      total: values.length,
      outcome,
    });

    return {
      response: { name, values: allFailed ? [] : values, sources },
      message: allFailed ? UNAVAILABLE_MESSAGE : FACET_RESULTS_MESSAGE,
      status: allFailed ? 502 : 200,
    };
  }

  /**
   * Unions the ok sources' facet values on the normalized label (trim + case-fold). The first
   * source that carries a label fixes its display `label` and raw `value`; later sources only add
   * to `count` and to `repositories[]` (which therefore lists them in selection order). Blank
   * labels are dropped — they cannot be selected as a filter value.
   */
  private unionFacetValues(
    okOutcomes: FacetSourceOk[],
  ): CgspaceFacetValueDto[] {
    const union = new Map<string, CgspaceFacetValueDto>();

    for (const source of okOutcomes) {
      for (const value of source.values) {
        const key = value.label.trim().toLowerCase();
        if (!key) {
          continue;
        }

        const existing = union.get(key);
        if (!existing) {
          union.set(key, {
            label: value.label,
            value: value.value,
            count: value.count,
            repositories: [source.repository],
          });
          continue;
        }

        existing.count += value.count;
        if (!existing.repositories.includes(source.repository)) {
          existing.repositories.push(source.repository);
        }
      }
    }

    return [...union.values()];
  }
}
