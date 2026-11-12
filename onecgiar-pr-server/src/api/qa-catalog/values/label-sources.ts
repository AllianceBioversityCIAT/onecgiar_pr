// @akili-spec quality-assurance/qa-value-labels
// QVL-DD-4 / QVL-DD-5 / QVL-R-3 / QVL-R-8: the registry of LABEL SOURCES. One entry per control list the catalog names (55 for 2026):
// where the canonical form text of an option id comes from, and how it is composed. The registry is CODE, outside `CATALOG_FIELDS`, so
// the catalog content hash and `catalog_version` do not move (P-3, QVL-R-10). Physical table and column names live in THIS file only and
// never reach a response or an error (QVL-R-9, security section of the design). `label-sources.spec.ts` checks it three ways:
// completeness (walk of `CATALOG_FIELDS`), entity metadata (every table and column) and the client mirror (every constant label).
//
// Kinds (design section 5):
//   constant - text that exists only in the client form (or a server constant the form reads): labels + the file:line they mirror
//   table    - one PRMS table, id (`keyColumn`) -> label composed from `columns`; lists sharing (table, keyColumn) share one query
//   chained  - a second table is read through a foreign key of the first (`centers`)
//   toc      - a table of the ToC database, found through `resolveLookupSource` (the ToC schema comes from `DB_TOC` at call time)
// No source filters on an active or deleted flag (OQ-1): an inactive row still labels. A missing row is `null`, decided by the resolver.
// Composition is pure TypeScript, never SQL (QVL-DD-3). Ids are strings (the collector stringifies, D-7), so constant keys are strings.
import { env as processEnv } from 'node:process';
import {
  LOOKUP_SOURCES,
  ResolvedLookupSource,
  resolveLookupSource,
} from './lookup-sources';

/** One row of a source as the driver returns it. */
export type LabelRow = Readonly<Record<string, unknown>>;

/** The label of one row, or `null` when the row carries nothing to show. */
export type Composer = (row: LabelRow) => string | null;

/**
 * Where a constant or a ToC column is evidenced. `tree` picks the repository root (`client` = `onecgiar-pr-client/src/app`,
 * `server` = `onecgiar-pr-server/src`), `file` is relative to it and `lines` is a list of ranges such as `36-41,205-206`.
 */
export interface Citation {
  tree: 'client' | 'server';
  file: string;
  lines: string;
}

/** Labels keyed by option id (as a string) plus the file:line each mirrors; the client-mirror spec reads the cited files as text. */
export interface ConstantLabels {
  labels: Readonly<Record<string, string>>;
  cites: readonly Citation[];
}

export interface ConstantSource extends ConstantLabels {
  kind: 'constant';
}

export interface TableSource {
  kind: 'table';
  table: string;
  /** The column the ids match; selected along with `columns`. */
  keyColumn: string;
  /** Columns the composer reads. */
  columns: readonly string[];
  compose: Composer;
  /** Ids whose label is a constant that wins over the row (type 9). Checked against its cited file like a constant. */
  overrides?: ConstantLabels;
}

export interface ChainedSource {
  kind: 'chained';
  /** First hop: the ids match `keyColumn`; `columns` includes the column the second hop follows (`next.via`). */
  table: string;
  keyColumn: string;
  columns: readonly string[];
  next: {
    table: string;
    /** Matched against the first hop's `via` column. */
    keyColumn: string;
    via: string;
    columns: readonly string[];
  };
  /** Composes from the SECOND hop's row; the first hop only carries the foreign key. */
  compose: Composer;
}

export interface TocSource {
  kind: 'toc';
  /** Logical source name; the ToC schema, table and primary key come from `resolveTocLabelSource`. */
  source: string;
  /** Columns the ids are matched on, any-of (an indicator id may be a `related_node_id` or a row `id`). */
  matchColumns: readonly string[];
  /**
   * Columns the composer reads, the match columns that are not the primary key included. Several rows can match one id and the
   * resolver picks one in TypeScript, never by SQL row order: the LOWEST primary key (P-18 for melias), or, for a source whose
   * `columns` include `is_active`, the ACTIVE row first and then the lowest primary key (indicators, P-20, owner decision).
   */
  columns: readonly string[];
  compose: Composer;
  /** The repository SQL that reads these columns: ToC tables have no entity here, so this is what the spec reads as text. */
  sql: Citation;
}

export type LabelSource =
  | ConstantSource
  | TableSource
  | ChainedSource
  | TocSource;

// --- composers ------------------------------------------------------------------------------------------------------

const text = (v: unknown): string =>
  v === null || v === undefined ? '' : String(v).trim();

/** The trimmed column, or `null` when blank. */
const col =
  (column: string): Composer =>
  (row) =>
    text(row[column]) || null;

/** The non-blank trimmed parts joined by `separator`; `null` when none is left. */
const join =
  (columns: readonly string[], separator: string): Composer =>
  (row) => {
    const parts = columns.map((c) => text(row[c])).filter(Boolean);
    return parts.length ? parts.join(separator) : null;
  };

/** The first non-blank of the columns, in order. */
const firstOf =
  (columns: readonly string[]): Composer =>
  (row) =>
    columns.map((c) => text(row[c])).find(Boolean) ?? null;

// --- builders -------------------------------------------------------------------------------------------------------

/** `keyColumn` -> one name column (the common case). */
const named = (
  table: string,
  keyColumn: string,
  nameColumn: string,
): TableSource => ({
  kind: 'table',
  table,
  keyColumn,
  columns: [nameColumn],
  compose: col(nameColumn),
});

const composed = (
  table: string,
  keyColumn: string,
  columns: readonly string[],
  compose: Composer,
): TableSource => ({ kind: 'table', table, keyColumn, columns, compose });

const constant = (
  labels: Record<string, string>,
  ...cites: Citation[]
): ConstantSource => ({ kind: 'constant', labels, cites });

const client = (file: string, lines: string): Citation => ({
  tree: 'client',
  file,
  lines,
});

const TOC = 'toc.integration_information.';

// --- constants: text that exists only in the client form --------------------------------------------------------------

/**
 * Geographic scopes. The form shows the client text, not the DB `name`, and the server folds 4 into 3 on read (P-21: the DB row 4 is
 * "National", the client says "Country"). 50 only appears in the Reporting form when "yet to be determined" is allowed.
 */
const GEO_SCOPES = constant(
  {
    '1': 'Global',
    '2': 'Regional',
    '3': 'Country',
    '4': 'Country',
    '5': 'Sub-national',
    '50': 'This is yet to be determined',
  },
  client(
    'shared/components/geoscope-management/geoscope-management.component.ts',
    '36-41,205-206',
  ),
);

/** `partner_role` ids 1..4: the delivery chips of the partner selector (Results form; the IPSR variant shows the same words). */
const PARTNER_ROLES = constant(
  { '1': 'Scaling', '2': 'Demand', '3': 'Innovation', '4': 'Other' },
  client(
    'pages/results/pages/result-detail/pages/rd-contributors-and-partners/components/multiple-wps/components/normal-selector/normal-selector.component.html',
    '132-177',
  ),
);

/** `results_policy_changes.status_amount` is stored as the text "1".."3"; any other stored text has no label (the resolver gives `null`). */
const POLICY_AMOUNT_STATUSES = constant(
  { '1': 'Confirmed', '2': 'Estimated', '3': 'Unknown' },
  client(
    'pages/results/pages/result-detail/pages/rd-result-types-pages/policy-change-info/policy-change-info.component.html',
    '26-39',
  ),
);

/** `evidence.is_sharepoint` as stored (0/1); the client radio binds booleans, the column holds 0/1. */
const EVIDENCE_SOURCES = constant(
  { '0': 'Link', '1': 'Upload file' },
  client(
    'pages/results/pages/result-detail/pages/rd-evidences/evidence-item/evidence-item.component.ts',
    '83-86',
  ),
);

const FARMER_FOLLOW_UP = client(
  'shared/components/innovation-use-form/farmer-follow-up.ts',
  '33-54',
);

/** The names are the server's own constant, `findAllV2`, not the `toc_level` table, which still holds pre-2025 names (P-9). */
const TOC_LEVELS = constant(
  {
    '1': 'High Level Output',
    '2': 'Intermediate Outcome',
    '3': '2030 Outcome',
  },
  {
    tree: 'server',
    file: 'toc/toc-level/toc-level.service.ts',
    lines: '30-48',
  },
);

/** Type 9 reads "Impact result" in the form (a display override; every other type keeps its DB name). */
const IMPACT_RESULT_TYPE: ConstantLabels = {
  labels: { '9': 'Impact result' },
  cites: [client('shared/utils/impact-result.util.ts', '4-5,24-26')],
};

// --- shared table sources ---------------------------------------------------------------------------------------------

/** A result is `result_code - title` in the merge/split and Innovation Use selects (P-10); other places add prefixes. */
const RESULT_LABEL = composed(
  'result',
  'id',
  ['result_code', 'title'],
  join(['result_code', 'title'], ' - '),
);

const USE_LEVELS = named('clarisa_innovation_use_levels', 'id', 'name');

/** The four question lists read one table; `related_to` ids differ per environment (known gaps 15 and 18). */
const QUESTION = named(
  'result_questions',
  'result_question_id',
  'question_text',
);

/** No area filter: the field may hold other areas' ids (P-12, a separate bugfix). */
const IMPACT_COMPONENT = named('impact_areas_scores_components', 'id', 'name');

const CAPDEV_TERM = named('capdevs_term', 'capdev_term_id', 'name');

/**
 * A ToC result by `toc_results.id`. The form prefixes the work-package acronym on levels 1 and 2; the canonical label is the title alone.
 * Repository SQL: `tr.id as toc_result_id`, `tr.result_title as title`.
 */
const TOC_RESULT: TocSource = {
  kind: 'toc',
  source: `${TOC}toc_results`,
  matchColumns: ['id'],
  columns: ['result_title'],
  compose: col('result_title'),
  sql: {
    tree: 'server',
    file: 'toc/toc-results/toc-results.repository.ts',
    lines: '155-160',
  },
};

// --- the registry -------------------------------------------------------------------------------------------------------

export const LABEL_SOURCES: Readonly<Record<string, LabelSource>> = {
  // geography
  countries: named('clarisa_countries', 'id', 'name'),
  regions: named('clarisa_regions', 'um49Code', 'name'),
  subnational_areas: composed(
    'clarisa_subnational_scopes',
    'code',
    ['name', 'local_name', 'romanization_system_name'],
    firstOf(['name', 'local_name', 'romanization_system_name']),
  ),
  geographic_scopes: GEO_SCOPES,
  extra_geographic_scopes: GEO_SCOPES,
  ipsr_geographic_scopes: GEO_SCOPES,

  // partners and centers
  institutions: named('clarisa_institutions', 'id', 'name'),
  institution_types: named('clarisa_institution_types', 'code', 'name'),
  partner_delivery_types: PARTNER_ROLES,
  /**
   * `results_center.center_id` stores the CLARISA center code (text). The name lives in `clarisa_institutions`, reached through
   * `clarisa_center.institutionId` (P-11). Canonical text is `acronym - name` (2026 chips show the acronym, IPSR chips the name).
   */
  centers: {
    kind: 'chained',
    table: 'clarisa_center',
    keyColumn: 'code',
    columns: ['institutionId'],
    next: {
      table: 'clarisa_institutions',
      keyColumn: 'id',
      via: 'institutionId',
      columns: ['acronym', 'name'],
    },
    compose: join(['acronym', 'name'], ' - '),
  },
  initiatives: composed(
    'clarisa_initiatives',
    'id',
    ['official_code', 'name'],
    join(['official_code', 'name'], ' - '),
  ),
  projects: composed(
    'clarisa_projects',
    'id',
    ['full_name', 'short_name'],
    firstOf(['full_name', 'short_name']),
  ),

  // innovation
  innovation_types: named('clarisa_innovation_type', 'code', 'name'),
  innovation_characteristics: named(
    'clarisa_innovation_characteristic',
    'id',
    'name',
  ),
  // P-14 (verified, test and prod): the duplicate level rows carry the same `name`, so a direct id -> name read equals the form.
  innovation_use_levels: USE_LEVELS,
  use_levels: USE_LEVELS,
  readiness_levels: named('clarisa_innovation_readiness_level', 'id', 'name'),

  // results and people
  results: RESULT_LABEL,
  qa_innovation_dev_results: RESULT_LABEL,
  ipsr_bundle_candidates: RESULT_LABEL,
  users: composed(
    'users',
    'id',
    ['first_name', 'last_name'],
    join(['first_name', 'last_name'], ' '),
  ),
  directory_users: named('ad_users', 'id', 'display_name'),

  // result classification
  result_types: {
    ...named('result_type', 'id', 'name'),
    overrides: IMPACT_RESULT_TYPE,
  },
  result_statuses: named('result_status', 'result_status_id', 'status_name'),
  result_levels: named('result_level', 'id', 'name'),
  discontinued_reasons: named(
    'investment_discontinued_option',
    'investment_discontinued_option_id',
    'option',
  ),
  tag_levels: named('gender_tag_level', 'id', 'title'),
  impact_area_components_gender: IMPACT_COMPONENT,
  impact_area_components_climate: IMPACT_COMPONENT,
  impact_area_components_nutrition: IMPACT_COMPONENT,
  impact_area_components_environmental: IMPACT_COMPONENT,
  impact_area_components_poverty: IMPACT_COMPONENT,

  // questions
  question_options_gesi_stage: QUESTION,
  question_options_risk_stage: QUESTION,
  question_options_ipr: QUESTION,
  policy_related_questions: QUESTION,

  // policy change
  policy_types: named('clarisa_policy_type', 'id', 'name'),
  policy_stages: named('clarisa_policy_stage', 'id', 'name'),
  policy_amount_statuses: POLICY_AMOUNT_STATUSES,

  // innovation package
  assessed_workshop_options: named(
    'assessed_during_expert_workshop',
    'id',
    'name',
  ),
  complementary_functions: named(
    'complementary_innovation_functions',
    'complementary_innovation_functions_id',
    'name',
  ),
  complementary_innovation_enabler_types: named(
    'complementary_innovation_enabler_types',
    'complementary_innovation_enabler_types_id',
    'group',
  ),

  // innovation use
  actor_types: named('actor_type', 'actor_type_id', 'name'),
  actor_count_unit: constant(
    { households: 'Households', individuals: 'Individual actors' },
    FARMER_FOLLOW_UP,
  ),
  actor_use_nature: constant(
    {
      information_received: 'Actors who received information, advice or inputs',
      innovation_applied: 'Actors who applied the innovation',
    },
    FARMER_FOLLOW_UP,
  ),

  // capacity sharing
  capdev_training_lengths: CAPDEV_TERM, // read from the NORMALIZED value: length 4 is "Long-term" (P-2)
  capdev_degrees: CAPDEV_TERM,
  capdev_delivery_methods: named(
    'capdevs_delivery_methods',
    'capdev_delivery_method_id',
    'name',
  ),

  // evidence and MELIA
  evidence_sources: EVIDENCE_SOURCES,
  melia_types: named('clarisa_melia_study_type', 'id', 'name'),

  // Theory of Change. Rows match on the ToC ids; the repository SQL each cites is read as text by the spec (no entity here).
  toc_levels: TOC_LEVELS,
  eoi_outcomes: TOC_RESULT,
  toc_results: TOC_RESULT,
  toc_results_indicators: {
    kind: 'toc',
    source: `${TOC}toc_results_indicators`,
    // the stored id is the node's `related_node_id` for some rows and its numeric `id` for others (P2-2932); `related_node_id` is not
    // unique (P-20 refuted). The resolver picks ACTIVE row first (`is_active = 1`), then the lowest primary key, and filters nothing
    // out (OQ-1): an id whose only rows are inactive still gets the inactive row's text. `is_active` is in `columns` because the
    // pick reads it; the rest of the rows are a known gap in the contract (design section 14)
    matchColumns: ['related_node_id', 'id'],
    columns: ['related_node_id', 'indicator_description', 'is_active'],
    compose: col('indicator_description'),
    // `tri.id AS indicator_id`, `tri.related_node_id`, `tri.indicator_description` (1023-1030); `tri.is_active` (938)
    sql: {
      tree: 'server',
      file: 'toc/toc-results/toc-results.repository.ts',
      lines: '938,1023-1030',
    },
  },
  toc_melia_studies: {
    kind: 'toc',
    source: `${TOC}toc_results_melias`,
    // the stored id is the text `melia_id`; several rows share one and carry equal titles (P-18), lowest `id` picks one
    matchColumns: ['melia_id'],
    columns: ['melia_id', 'title'],
    compose: col('title'),
    // `trm.melia_id`, `trm.title` ... `toc_results_melias trm`
    sql: {
      tree: 'server',
      file: 'api/results/ost-melia-studies/ost-melia-studies.repository.ts',
      lines: '46-52',
    },
  },
};

// --- ToC resolution -------------------------------------------------------------------------------------------------

/**
 * ToC tables a label reads that `LOOKUP_SOURCES` does not register, because no catalog binding reads them as a lookup. Declared once,
 * here, and never a second copy of one the lookup registry already has (`label-sources.spec.ts` checks that). `toc_results_melias`
 * has a single-column primary key `id` (P-18, verified on test and prod).
 */
export const TOC_LABEL_ONLY_SOURCES: Readonly<
  Record<string, { table: string; primaryKey: string }>
> = {
  [`${TOC}toc_results_melias`]: {
    table: 'toc_results_melias',
    primaryKey: 'id',
  },
};

/**
 * Where a ToC label source is read from: `resolveLookupSource` for a registered source, else this file's own entry, both with the ToC
 * schema read from `DB_TOC` at call time. `undefined` when the source is unknown or the ToC database is not configured; the caller
 * fails the batch generically (QVL-R-9, P-6).
 */
export function resolveTocLabelSource(
  source: string,
  env: Record<string, string | undefined> = processEnv,
): ResolvedLookupSource | undefined {
  if (Object.prototype.hasOwnProperty.call(LOOKUP_SOURCES, source)) {
    return resolveLookupSource(source, env);
  }
  if (!Object.prototype.hasOwnProperty.call(TOC_LABEL_ONLY_SOURCES, source)) {
    return undefined;
  }
  const schema = env.DB_TOC;
  return schema ? { schema, ...TOC_LABEL_ONLY_SOURCES[source] } : undefined;
}
