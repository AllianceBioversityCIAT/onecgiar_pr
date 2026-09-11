/**
 * Static adapter registry for the multi-repository Discovery-API proxy (`KPM-DD-1`).
 * One entry per repository (DSpace 7 Discovery-API host); the service/mapper take the adapter
 * as a parameter instead of one class per repository. See `design.md` §3.3 / §5 / `KPM-DD-1`,
 * `KPM-DD-5`.
 */

/**
 * Discovery-searchable repository keys.
 * Priority order for the merge/dedup survivor rule (`KPM-DD-4`): CGSpace › MELSpace › WorldFish.
 */
export const KP_REPOSITORY_VALUES = [
  'cgspace',
  'melspace',
  'worldfish',
] as const;

export type KpRepository = (typeof KP_REPOSITORY_VALUES)[number];

/** Default-selection / priority order — identical to `KP_REPOSITORY_VALUES`. */
export const ALL_REPOSITORIES: readonly KpRepository[] = KP_REPOSITORY_VALUES;

/**
 * Per-repository metadata field keys, pinned by the fixture task `KPM-T-1` against live captures
 * (design.md §3.3, rows 68-70).
 */
export interface RepositoryAdapterFields {
  title: string;
  type: string;
  year: string;
  /** Ordered metadata keys concatenated + de-duplicated into `CgspaceItemDto.authors[]` (`KPM-T-3`). */
  authors: string[];
  /** Undefined when the host has no affiliation/center metadata field -> mapper emits `[]`. */
  affiliation?: string;
  doi: string;
  uri: string;
}

export interface RepositoryAdapterFacets {
  /** `f.<type>` facet name (item type). */
  type: string;
  /** `f.<center>` facet name (affiliation / center). Undefined -> Center filter unconstrained (`KPM-OQ-3`). */
  center?: string;
}

export interface RepositoryAdapter {
  key: KpRepository;
  display: string;
  /** `process.env` key holding the base Discovery-API URL, read at call time (same as today). */
  baseUrlEnv: string;
  /** Host used to build `itemUrl = https://<itemHost>/items/<uuid>`. */
  itemHost: string;
  fields: RepositoryAdapterFields;
  facets: RepositoryAdapterFacets;
  /** `f.<yearFilterField>=[Y TO Y],equals` param name. Undefined -> service post-filters (`KPM-DD-7`). */
  yearFilterField?: string;
}

/**
 * The registry. Values for `melspace` / `worldfish` were pinned by `KPM-T-1` against live
 * captures in `cgspace-discovery/fixtures/{melspace,worldfish}-{search.hal,facets}.json`
 * (2026-09-10) — see `design.md` §3.3 for the source table.
 */
export const KP_REPOSITORIES: Record<KpRepository, RepositoryAdapter> = {
  cgspace: {
    key: 'cgspace',
    display: 'CGSpace',
    baseUrlEnv: 'CGSPACE_DISCOVERY_URL',
    itemHost: 'cgspace.cgiar.org',
    fields: {
      title: 'dc.title',
      type: 'dcterms.type',
      year: 'dcterms.issued',
      authors: ['dc.contributor.author'],
      affiliation: 'cg.contributor.affiliation',
      doi: 'cg.identifier.doi',
      uri: 'dc.identifier.uri',
    },
    facets: {
      type: 'itemtype',
      center: 'affiliation',
    },
    yearFilterField: 'dateIssued',
  },
  melspace: {
    key: 'melspace',
    display: 'MELSpace',
    baseUrlEnv: 'MELSPACE_DISCOVERY_URL',
    itemHost: 'repo.mel.cgiar.org',
    fields: {
      title: 'dc.title',
      type: 'dc.type',
      year: 'dcterms.available',
      authors: ['dc.creator', 'dc.contributor'],
      affiliation: 'cg.contributor.center',
      doi: 'cg.identifier.doi',
      uri: 'dc.identifier.uri',
    },
    facets: {
      type: 'itemtype',
      center: 'institute',
    },
    yearFilterField: 'dateIssued',
  },
  worldfish: {
    key: 'worldfish',
    display: 'WorldFish',
    baseUrlEnv: 'WORLDFISH_DISCOVERY_URL',
    itemHost: 'digitalarchive.worldfishcenter.org',
    fields: {
      title: 'dc.title',
      type: 'dc.type',
      year: 'dc.date.issued',
      authors: ['dc.creator'],
      affiliation: 'cg.contributor.affiliation',
      doi: 'dc.identifier.doi',
      uri: 'dc.identifier.uri',
    },
    facets: {
      type: 'itemtype',
      center: 'institute',
    },
    yearFilterField: 'dateIssued',
  },
};

/**
 * Normalizes the `repository` query param into a deduped, lowercased array:
 * `undefined` -> default all three; a single comma-separated string -> split on `,`;
 * a repeatable-form `string[]` (Express `repository=a&repository=b`) -> each element flattened
 * through the same split; then trim, lowercase, dedupe (first-seen order kept).
 * Validation (`@IsArray`, `@ArrayMinSize(1)`, `@IsIn(..., { each: true })`) happens on the DTO —
 * this only normalizes shape/case/whitespace/duplicates so validation sees a clean array.
 */
export function normalizeRepositoryParam(value: unknown): string[] {
  let raw: string[];
  if (value === undefined || value === null) {
    raw = [...ALL_REPOSITORIES];
  } else if (Array.isArray(value)) {
    raw = value.flatMap((entry) => String(entry).split(','));
  } else {
    raw = String(value).split(',');
  }

  const normalized = raw
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0);

  return Array.from(new Set(normalized));
}

/**
 * Sanitizes a Solr query string: strips leading wildcards and escapes the Solr special
 * characters. Lives here (not on the service) so `translateParams` stays a pure function that
 * the service can call per source; `CgspaceDiscoveryService.escapeSolr` delegates to it, so
 * there is exactly one implementation.
 */
export function escapeSolrQuery(query?: string | null): string {
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
 * The subset of `CgspaceSearchQueryDto` `translateParams` reads. Declared structurally so this
 * module stays free of DTO imports (the DTOs import *this* file for `KpRepository`).
 */
export interface TranslatableSearchParams {
  query?: string;
  page?: number;
  size?: number;
  type?: string;
  year?: string;
  center?: string;
}

/**
 * Translates a validated search query DTO into upstream Discovery-API params for one adapter
 * (`design.md` §5 "Adapter registry", `KPM-R-8` "each with that repository's facet/field
 * translation"):
 *
 * - `dsoType=item`, `page`/`size` (the per-source page size, `KPM-R-8`);
 * - Solr-escaped `query` when present, else `sort=dc.date.accessioned,DESC`;
 * - `f.<facets.type>=<type>,equals` for the item-type filter;
 * - `f.<facets.center>=<center>,equals` — **skipped** when the adapter declares no center facet,
 *   leaving that repository unconstrained by the Center filter (`KPM-OQ-3`);
 * - `f.<yearFilterField>=[Y TO Y],equals` — when the adapter declares no year filter field the
 *   param is omitted and the service post-filters the mapped `year` instead (`KPM-DD-7`).
 *
 * Pure: no env reads, no logging, no host/base-URL knowledge.
 */
export function translateParams(
  dto: TranslatableSearchParams,
  adapter: RepositoryAdapter,
): Record<string, any> {
  const params: Record<string, any> = {
    dsoType: 'item',
    page: dto.page ?? 0,
    size: dto.size ?? 10,
  };

  const escapedQuery = escapeSolrQuery(dto.query);
  if (escapedQuery) {
    params.query = escapedQuery;
  } else {
    params.sort = 'dc.date.accessioned,DESC';
  }

  if (dto.type) {
    params[`f.${adapter.facets.type}`] = `${dto.type},equals`;
  }

  if (dto.center && adapter.facets.center) {
    params[`f.${adapter.facets.center}`] = `${dto.center},equals`;
  }

  if (dto.year && adapter.yearFilterField) {
    params[`f.${adapter.yearFilterField}`] =
      `[${dto.year} TO ${dto.year}],equals`;
  }

  return params;
}
