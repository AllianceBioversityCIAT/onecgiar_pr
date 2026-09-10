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
 * Translates a validated search/facet query DTO into upstream Discovery-API params for one
 * adapter. **Skeleton only** — Solr-escaped `query`, `f.<facets.type>`, `f.<facets.center>`
 * (skipped when the adapter has none), the year filter via `yearFilterField`, and the
 * `sort=dc.date.accessioned,DESC` no-query fallback land in `KPM-T-4`, which also wires this
 * into `CgspaceDiscoveryService.search`/`facets` per selected source (design.md §5).
 */
export function translateParams(
  dto: { page?: number; size?: number },
  adapter: RepositoryAdapter,
): Record<string, any> {
  // TODO(KPM-T-4): query escaping, f.<type>/f.<center> facet params, year filter, sort fallback.
  void adapter;
  return {
    dsoType: 'item',
    page: dto.page ?? 0,
    size: dto.size ?? 10,
  };
}
