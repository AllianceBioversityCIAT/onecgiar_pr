// @akili-spec quality-assurance/qa-field-catalog
import {
  CatalogFieldType,
  Condition,
  CatalogLevel,
  ResultTypeScope,
} from '../definitions/types';

// QAC-R-9 / proposal "Response shape (agreed)". Additive-only (ADR-004).
export interface QaCatalogResultTypeResponse {
  key: string;
  label: string;
  level: CatalogLevel;
}

export interface QaCatalogSectionResponse {
  key: string;
  label: string;
  order: number;
  result_types: ResultTypeScope;
}

export interface QaCatalogSubFieldResponse {
  key: string;
  label: string;
  type: CatalogFieldType;
  control_list?: string;
  required?: boolean;
  /** QAC-R-13: omitted when the subfield is always required / always shown. */
  required_when?: Condition;
  visible_when?: Condition;
  /** QAC-R-14: one more level (max depth 2 below the top-level field). */
  subfields?: QaCatalogSubFieldResponse[];
}

export interface QaCatalogFieldResponse {
  key: string;
  label: string;
  description?: string;
  type: CatalogFieldType;
  control_list?: string;
  section: string;
  order: number;
  result_types: ResultTypeScope;
  required: boolean;
  valid_from: number;
  valid_to: number | null;
  required_when?: Condition;
  visible_when?: Condition;
  subfields?: QaCatalogSubFieldResponse[];
}

export interface QaCatalogResponse {
  portfolio: string;
  phase: number;
  catalog_version: string;
  generated_at: string;
  result_types: QaCatalogResultTypeResponse[];
  sections: QaCatalogSectionResponse[];
  fields: QaCatalogFieldResponse[];
}
