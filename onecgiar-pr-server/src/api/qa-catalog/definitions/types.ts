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

export type StorageBinding = ColumnBinding | RelationBinding;

export type RequiredWhenOperator = 'eq' | 'in' | 'not_null';

export interface RequiredWhenCondition {
  field: string;
  operator: RequiredWhenOperator;
  value?: string | number | boolean | Array<string | number>;
}

/** Declarative condition, data only (DD-7); never evaluated by the catalog. */
export type RequiredWhen =
  | RequiredWhenCondition
  | { all: RequiredWhen[] }
  | { any: RequiredWhen[] };

export interface CatalogSubField {
  key: string;
  label: string;
  type: CatalogFieldType;
  control_list?: string;
  required?: boolean;
  storage: ColumnBinding;
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
  required_when?: RequiredWhen;
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
