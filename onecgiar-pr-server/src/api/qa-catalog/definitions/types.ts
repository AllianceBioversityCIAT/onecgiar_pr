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

export interface RelationBinding {
  kind: 'relation';
  table: string;
  fk_to_result: string;
  value_column: string;
  control_list_table?: string;
  filter?: Record<string, string | number | boolean | null>;
}

/**
 * DD-13: one hop of a parent -> child table path. The path starts at the PARENT element's row (DD-12):
 * `result` for a top-level field, the parent binding's last table for a subfield:
 *  - `join_from` is a column of the previous table (for the first step, of that start table);
 *  - `join_to` is a column of this step's `table`.
 */
export interface PathStep {
  table: string;
  join_from: string;
  join_to: string;
  /** Equality filters on columns of this step's table (stale-checked like a relation filter). */
  filter?: Record<string, string | number | boolean | null>;
}

/** DD-13: value reached by following `steps` from the parent element's row (`result` for a top-level field); `value_column` lives on the last step's table. */
export interface PathBinding {
  kind: 'path';
  steps: PathStep[];
  value_column: string;
  /** Further columns of the last step's table the binding touches (all counted as covered). */
  columns?: string[];
}

/**
 * DD-13: read-only reference value Reporting does not store (ToC `integration_information.*`,
 * CLARISA). `key_from` is the catalog key that holds the id: a sibling subfield key (subfield lookup) or a
 * top-level field key (CI-validated, DD-13). No table is checked by the
 * completeness guard because `source` is not a result table.
 */
export interface LookupBinding {
  kind: 'lookup';
  source: string;
  key_from: string;
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
