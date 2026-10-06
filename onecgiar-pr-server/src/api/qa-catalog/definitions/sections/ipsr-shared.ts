// @akili-spec quality-assurance/qa-field-catalog
// QAC-T-11 · helpers shared by the IPSR (innovation package) section files. Data only.
import { CatalogSubField } from '../types';

/** Every IPSR row applies to the innovation package result type only. */
export const IPSR_TYPES = ['innovation_package'];

export const IPSR_TABLE = 'result_innovation_package';
export const IPSR_ELEMENT_TABLE = 'result_by_innovation_package';

/** `ipsr_role_id` of the rows of `result_by_innovation_package`: 1 = core innovation, 2 = complementary element. */
export const ROLE_CORE = 1;
export const ROLE_COMPLEMENTARY = 2;

export const col = (table: string, column: string) => ({
  kind: 'column' as const,
  table,
  column,
});

/** Subfield of a list. Row-level rules stay in the inventory (subfields carry no `required_when`, QAC-R-5). */
export const sub = (
  table: string,
  key: string,
  label: string,
  type: CatalogSubField['type'],
  column: string = key,
  control_list?: string,
): CatalogSubField => ({
  key,
  label,
  type,
  ...(control_list ? { control_list } : {}),
  required: false,
  storage: col(table, column),
});
