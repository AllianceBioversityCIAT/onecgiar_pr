import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { CgspaceDiscoveryMapper } from './cgspace-discovery.mapper';
import { CgspaceSearchQueryDto } from './dto/cgspace-search-query.dto';
import { CgspaceFacetQueryDto } from './dto/cgspace-facet-query.dto';
import { CgspaceSearchPageDto } from './dto/cgspace-item.dto';

export interface CacheEntry<T> {
  expires: number;
  value: T;
}

export interface CgspaceFacetValueDto {
  label: string;
  value: string;
  count: number;
}

export interface CgspaceFacetPageDto {
  name: string;
  values: CgspaceFacetValueDto[];
}

export interface CgspaceServiceResponse<T> {
  response: T;
  message: string;
  status: number;
}

const SEARCH_TIMEOUT_MS = 8000;
const SEARCH_CACHE_MAX = 200;
const SEARCH_CACHE_TTL_MS = 60_000;
const FACET_CACHE_MAX = 20;
const FACET_CACHE_TTL_MS = 600_000;
const ALLOWED_FACETS = new Set(['itemtype', 'affiliation']);

@Injectable()
export class CgspaceDiscoveryService {
  private readonly logger = new Logger(CgspaceDiscoveryService.name);

  public readonly searchCache = new Map<
    string,
    CacheEntry<CgspaceServiceResponse<CgspaceSearchPageDto>>
  >();
  public readonly facetCache = new Map<
    string,
    CacheEntry<CgspaceServiceResponse<CgspaceFacetPageDto>>
  >();

  constructor(
    private readonly httpService: HttpService,
    private readonly mapper: CgspaceDiscoveryMapper,
  ) {}

  /**
   * Reads and validates the CGSpace Discovery API base URL.
   * If missing or empty, warns and returns null.
   */
  private getBaseUrl(): string | null {
    const envUrl = process.env.CGSPACE_DISCOVERY_URL;
    if (!envUrl || !envUrl.trim()) {
      this.logger.warn('cgspace.config.missing');
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
   * Normalizes search query parameters into a deterministic cache key.
   */
  private buildSearchCacheKey(dto: CgspaceSearchQueryDto): string {
    return JSON.stringify({
      query: dto.query ?? '',
      page: dto.page ?? 0,
      size: dto.size ?? 10,
      type: dto.type ?? '',
      center: dto.center ?? '',
      year: dto.year ?? '',
      repository: dto.repository ?? 'cgspace',
    });
  }

  /**
   * Normalizes facet query parameters into a deterministic cache key.
   */
  private buildFacetCacheKey(name: string, dto: CgspaceFacetQueryDto): string {
    return JSON.stringify({
      name,
      prefix: dto.prefix ?? '',
      size: dto.size ?? 50,
    });
  }

  /**
   * Sanitizes Solr query strings by removing leading wildcards and escaping special characters.
   */
  public escapeSolr(query?: string): string {
    if (!query || typeof query !== 'string') {
      return '';
    }
    let sanitized = query.trim();
    if (!sanitized) {
      return '';
    }
    sanitized = sanitized.replace(/^[*?]+/, '');
    if (!sanitized) {
      return '';
    }
    // Escape Solr special characters: \ + - & | ! ( ) { } [ ] ^ " ~ * ? :
    sanitized = sanitized.replace(/([\\+\-&|!(){}[\]^"~*?:])/g, '\\$1');
    return sanitized;
  }

  /**
   * Executes a search against the CGSpace DSpace 7 Discovery API with fail-soft guarantees,
   * Solr query sanitization, and bounded TTL caching.
   */
  public async search(
    dto: CgspaceSearchQueryDto,
  ): Promise<CgspaceServiceResponse<CgspaceSearchPageDto>> {
    const cacheKey = this.buildSearchCacheKey(dto);
    const cached = this.getFromCache(this.searchCache, cacheKey);
    if (cached) {
      return cached;
    }

    const baseUrl = this.getBaseUrl();
    if (!baseUrl) {
      return {
        response: {
          items: [],
          page: {
            number: dto.page ?? 0,
            size: dto.size ?? 10,
            totalElements: 0,
            totalPages: 0,
          },
        },
        message: 'CGSpace search is temporarily unavailable',
        status: 502,
      };
    }

    const params: Record<string, any> = {
      dsoType: 'item',
      page: dto.page ?? 0,
      size: dto.size ?? 10,
    };

    const escapedQuery = this.escapeSolr(dto.query);
    if (escapedQuery) {
      params.query = escapedQuery;
    } else {
      params.sort = 'dc.date.accessioned,DESC';
    }

    if (dto.type) {
      params['f.itemtype'] = `${dto.type},equals`;
    }

    if (dto.center) {
      params['f.affiliation'] = `${dto.center},equals`;
    }

    if (dto.year) {
      params['f.dateIssued'] = `[${dto.year} TO ${dto.year}],equals`;
    }

    const start = Date.now();
    try {
      const res = await firstValueFrom(
        this.httpService.get(`${baseUrl}/discover/search/objects`, {
          params,
          paramsSerializer: {
            encode: (param: string) => encodeURIComponent(param),
          },
          timeout: SEARCH_TIMEOUT_MS,
        }),
      );

      const durationMs = Date.now() - start;
      const pageDto = this.mapper.toPage(res.data);
      const result: CgspaceServiceResponse<CgspaceSearchPageDto> = {
        response: pageDto,
        message: 'CGSpace search results',
        status: 200,
      };

      this.setInCache(
        this.searchCache,
        cacheKey,
        result,
        SEARCH_CACHE_TTL_MS,
        SEARCH_CACHE_MAX,
      );

      this.logger.log({
        message: 'cgspace.search',
        queryLength: dto.query?.length ?? 0,
        page: dto.page ?? 0,
        size: dto.size ?? 10,
        hasType: !!dto.type,
        hasCenter: !!dto.center,
        year: dto.year,
        durationMs,
        total: pageDto.page.totalElements,
        outcome: 'success',
      });

      return result;
    } catch (err: any) {
      const status = err?.response?.status;
      if (typeof status === 'number' && status >= 400 && status < 500) {
        this.logger.warn({
          message: 'cgspace.search.upstream_4xx',
          status,
        });
      }

      return {
        response: {
          items: [],
          page: {
            number: dto.page ?? 0,
            size: dto.size ?? 10,
            totalElements: 0,
            totalPages: 0,
          },
        },
        message: 'CGSpace search is temporarily unavailable',
        status: 502,
      };
    }
  }

  /**
   * Retrieves facet values from the CGSpace DSpace 7 Discovery API with fail-soft guarantees,
   * allowed facet validation, and bounded TTL caching.
   */
  public async facets(
    name: string,
    dto: CgspaceFacetQueryDto,
  ): Promise<CgspaceServiceResponse<CgspaceFacetPageDto>> {
    if (!ALLOWED_FACETS.has(name)) {
      return {
        response: { name, values: [] },
        message: `Invalid facet '${name}'. Allowed: itemtype, affiliation`,
        status: 400,
      };
    }

    const cacheKey = this.buildFacetCacheKey(name, dto);
    const cached = this.getFromCache(this.facetCache, cacheKey);
    if (cached) {
      return cached;
    }

    const baseUrl = this.getBaseUrl();
    if (!baseUrl) {
      return {
        response: { name, values: [] },
        message: 'CGSpace search is temporarily unavailable',
        status: 502,
      };
    }

    const params: Record<string, any> = {
      size: dto.size ?? 50,
    };

    if (dto.prefix) {
      params.prefix = dto.prefix;
    }

    const start = Date.now();
    try {
      const res = await firstValueFrom(
        this.httpService.get(`${baseUrl}/discover/facets/${name}`, {
          params,
          paramsSerializer: {
            encode: (param: string) => encodeURIComponent(param),
          },
          timeout: SEARCH_TIMEOUT_MS,
        }),
      );

      const durationMs = Date.now() - start;
      const rawValues = res.data?._embedded?.values || [];
      const values: CgspaceFacetValueDto[] = rawValues.map((v: any) => ({
        label: v?.label ?? '',
        value: v?.label ?? '',
        count: typeof v?.count === 'number' ? v.count : 0,
      }));

      const result: CgspaceServiceResponse<CgspaceFacetPageDto> = {
        response: { name, values },
        message: 'CGSpace facet results',
        status: 200,
      };

      this.setInCache(
        this.facetCache,
        cacheKey,
        result,
        FACET_CACHE_TTL_MS,
        FACET_CACHE_MAX,
      );

      this.logger.log({
        message: 'cgspace.facets',
        name,
        prefixLength: dto.prefix?.length ?? 0,
        size: dto.size ?? 50,
        durationMs,
        total: values.length,
        outcome: 'success',
      });

      return result;
    } catch (err: any) {
      const status = err?.response?.status;
      if (typeof status === 'number' && status >= 400 && status < 500) {
        this.logger.warn({
          message: 'cgspace.facets.upstream_4xx',
          status,
        });
      }

      return {
        response: { name, values: [] },
        message: 'CGSpace search is temporarily unavailable',
        status: 502,
      };
    }
  }
}
