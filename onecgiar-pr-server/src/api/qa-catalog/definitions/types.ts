// @akili-spec quality-assurance/qa-field-catalog
// QAC-R-1 content model. Pure types: no runtime imports, no entity coupling.

export type CatalogLevel = 'output' | 'outcome' | 'impact';

export const CATALOG_FIELD_TYPES = [
  'text',
  'number',
  'date',
  'boolean',
  'single_select',
  'multi_select',
  'list',
  'object',
] as const;
export type CatalogFieldType = (typeof CATALOG_FIELD_TYPES)[number];

/** `['*']` means "applies to every result type". */
export type ResultTypeScope = string[];

export interface CatalogResultType {
  key: string;
  label: string;
  level: CatalogLevel;
}

/** Phase years are plain integers (DD-9); `valid_to: null` is open-ended. */
export interface Validity {
  valid_from: number;
  valid_to: number | null;
}

export interface CatalogSection extends Validity {
  key: string;
  label: string;
  order: number;
  result_types: ResultTypeScope;
}

export interface ColumnBinding {
  kind: 'column';
  table: string;
  column: string;
}

/**
 * A relation's elements are the rows of `table` whose `fk_to_result` is the result and that match `filter` (equality only).
 * A row whose `value_column` is NULL is NOT an element: a relation field has one value per element, so a row with no value is not
 * part of the answer (QAC-T-22: this is how `partners.kp_author_affiliations`, keyed by `result_kp_mqap_institution_id`, leaves out
 * the partner rows that have no M-QAP match, which no equality `filter` can express).
 */
export interface RelationBinding {
  kind: 'relation';
  table: string;
  fk_to_result: string;
  value_column: string;
  control_list_table?: string;
  filter?: Record<string, string | number | boolean | null>;
}

/** One column pair of a path step's join: `from` on the previous table, `to` on the step's table. */
export interface JoinPair {
  from: string;
  to: string;
}

/**
 * DD-13: one hop of a parent -> child table path. The path starts at the PARENT element's row (DD-12):
 * `result` for a top-level field, the parent binding's last table for a subfield. `join` lists the column
 * pairs the hop matches on, ALL of which must hold (e.g. `result_id -> results_id` AND
 * `inititiative_id -> initiative_id`); each `from` is a column of the previous table (for the first step, of
 * that start table) and each `to` a column of this step's `table`.
 */
export interface PathStep {
  table: string;
  join: JoinPair[];
  /** Equality filters on columns of this step's table (stale-checked like a relation filter). */
  filter?: Record<string, string | number | boolean | null>;
  /**
   * Declared when the step can still match several rows per parent row (e.g. `evidence_sharepoint` keeps older
   * rows of a re-uploaded file): the first row in this order is the one the binding reads. Same shape and meaning
   * as a lookup's `pick`; `order_by` is a column of this step's table.
   */
  pick?: LookupPick;
}

/** DD-13: value reached by following `steps` from the parent element's row (`result` for a top-level field); `value_column` lives on the last step's table. */
export interface PathBinding {
  kind: 'path';
  steps: PathStep[];
  value_column: string;
  /** Further columns of the last step's table the binding touches (all counted as covered). */
  columns?: string[];
}

/** One column of a lookup source the key matches: `from` is a catalog key (sibling subfield or top-level), `to` a column of `source`. */
export interface LookupKey {
  from: string;
  to: string;
}

/** Qualifier value that means "the result's phase year" (the `version.phase_year` of the result being read). */
export const PHASE_YEAR = 'phase_year';

/**
 * A source column that must match `equals`: a literal, or `PHASE_YEAR` for the result's phase year.
 * `match` defaults to `'equals'` (plain equality); `'year'` compares the YEAR PART of the column, for a date
 * stored both as `YYYY` and as `YYYY-MM-DD` (the repository's canonical read: `REGEXP '^[0-9]{4}-'` -> `YEAR()`, else `CAST`).
 */
export interface LookupQualifier {
  column: string;
  equals: string | number | boolean;
  match?: 'equals' | 'year';
}

/** How ONE row is chosen when the keys and qualifiers can still match several: order by `order_by`, take the first. */
export interface LookupPick {
  order_by: string;
  direction: 'asc' | 'desc';
}

/**
 * DD-13: read-only reference value Reporting does not store (ToC `integration_information.*`, CLARISA).
 * `keys` are ALTERNATIVES (any-of): the source row matches when ANY `from -> to` pair matches, e.g. a KPI id
 * stored as the node's `related_node_id` for some rows and as its numeric `id` for others (P2-2932).
 * Each `from` is a catalog key: a sibling subfield key (subfield lookup) or a top-level field key
 * (CI-validated). `qualifiers` further restrict the source row (ALL must hold), e.g. `target_date = phase_year`.
 * No table is checked by the completeness guard because `source` is not a result table.
 */
export interface LookupBinding {
  kind: 'lookup';
  source: string;
  keys: LookupKey[];
  qualifiers?: LookupQualifier[];
  /** Declared when the source can still hold several matching rows; the first row in this order is the value. */
  pick?: LookupPick;
  value_column: string;
}

export type StorageBinding =
  | ColumnBinding
  | RelationBinding
  | PathBinding
  | LookupBinding;

/** Subfields never use a relation: a column of the parent's row, a path, or a lookup. */
export type SubFieldStorageBinding =
  | ColumnBinding
  | PathBinding
  | LookupBinding;

export type ConditionOperator = 'eq' | 'in' | 'not_null';
export type RequiredWhenOperator = ConditionOperator;

export interface ConditionLeaf {
  field: string;
  operator: ConditionOperator;
  value?: string | number | boolean | Array<string | number>;
}
export type RequiredWhenCondition = ConditionLeaf;

/**
 * Declarative condition, data only (DD-7); never evaluated by the catalog. One vocabulary for
 * `required_when` and `visible_when` (DD-12).
 */
export type Condition =
  | ConditionLeaf
  | { all: Condition[] }
  | { any: Condition[] };
export type RequiredWhen = Condition;

/** DD-13: a subfield may nest one more level (field -> subfield -> subfield; depth 3 is rejected). */
export interface CatalogSubField {
  key: string;
  label: string;
  type: CatalogFieldType;
  control_list?: string;
  required?: boolean;
  required_when?: Condition;
  visible_when?: Condition;
  subfields?: CatalogSubField[];
  storage: SubFieldStorageBinding;
}

export interface CatalogField extends Validity {
  key: string;
  label: string;
  description?: string;
  type: CatalogFieldType;
  control_list?: string;
  section: string;
  order: number;
  result_types: ResultTypeScope;
  required: boolean;
  required_confirmed: boolean;
  required_when?: Condition;
  visible_when?: Condition;
  subfields?: CatalogSubField[];
  storage: StorageBinding;
}

export interface NotForQaEntry {
  table: string;
  column: string;
  reason: string;
}

/** DD-11: a column of an in-scope table that is for QA but not yet described (stage 2). */
export interface PendingCatalogEntry {
  table: string;
  column: string;
  reason: string;
}

export interface CatalogDefinition {
  resultTypes: CatalogResultType[];
  sections: CatalogSection[];
  fields: CatalogField[];
  notForQa: NotForQaEntry[];
}
