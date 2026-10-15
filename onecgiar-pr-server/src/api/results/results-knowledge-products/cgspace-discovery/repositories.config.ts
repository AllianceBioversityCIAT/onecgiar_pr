import {
  ProjectMatchContext,
  buildProjectClause,
  buildProjectMatch,
} from './project-match';

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
  /**
   * Project label field, queried by the scoped linked/related search and read by the mapper
   * (`KPSF-DD-3`): `cg.identifier.project` on CGSpace, `cg.contributor.project` on
   * MELSpace/WorldFish. It is interpolated into the Solr clause, so it must only ever be this
   * adapter constant, never a request value.
   */
  project: string;
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
      project: 'cg.identifier.project',
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
      project: 'cg.contributor.project',
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
      project: 'cg.contributor.project',
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
  /** Legacy `<code> - <title>` label; mapped to `projectScope=linked` (`KPSF-R-11`). */
  project?: string;
  projectCode?: string;
  projectTitle?: string;
  projectLeadCenter?: string;
  projectScope?: ProjectScope;
}

export type ProjectScope = 'linked' | 'related';

/** Result of resolving the project inputs of a search (`design.md` §7). */
export interface ResolvedProjectScope {
  scope: ProjectScope;
  /** False when the project yields neither >= 2 distinctive words nor a code (`KPSF-R-9`). */
  applied: boolean;
  ctx: ProjectMatchContext;
}

/**
 * Resolves the scoped-project inputs of a search, or `null` when the search carries none (the
 * non-bilateral path, byte-identical to before). An explicit `projectScope` wins; otherwise the
 * legacy `project` (`<code> - <title>`) is accepted for one release as `linked` (`KPSF-R-11`).
 */
export function resolveProjectScope(
  dto: TranslatableSearchParams,
): ResolvedProjectScope | null {
  let scope: ProjectScope;
  let ctx: ProjectMatchContext;

  if (dto.projectScope) {
    scope = dto.projectScope;
    ctx = {
      code: dto.projectCode,
      title: dto.projectTitle,
      leadCenter: dto.projectLeadCenter,
    };
  } else if (dto.project) {
    scope = 'linked';
    const separator = dto.project.indexOf(' - ');
    ctx =
      separator >= 0
        ? {
            code: dto.project.slice(0, separator),
            title: dto.project.slice(separator + 3),
          }
        : { title: dto.project };
  } else {
    return null;
  }

  return { scope, applied: buildProjectMatch(ctx).usable, ctx };
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
 * - project scope (`KPSF-T-2`): `linked` -> `<base> AND (<clause>)`, `related` ->
 *   `<base> AND NOT (<clause>)` on `adapter.fields.project`; an unusable project leaves the base
 *   query untouched (the service short-circuits `linked` before ever calling this). No `f.project`
 *   facet is ever emitted (`KPSF-R-11`).
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

  // @akili-spec changes/kp-project-strict-filter
  // Scoped project split (`KPSF-DD-2`): linked = base AND (clause), related = base AND NOT
  // (clause). The field is the adapter constant; only sanitized tokens come from the project.
  // Residual risk (recorded, no post-filter so counts stay exact): on multi-valued project
  // fields the Solr word group matches at item level, so an item can match across two labels.
  const project = resolveProjectScope(dto);
  if (project?.applied) {
    const clause = buildProjectClause(adapter.fields.project, project.ctx);
    if (clause) {
      const base = escapedQuery ? `(${escapedQuery})` : '*:*';
      params.query =
        project.scope === 'linked'
          ? `${base} AND (${clause})`
          : `${base} AND NOT (${clause})`;
    }
  }

  return params;
}
