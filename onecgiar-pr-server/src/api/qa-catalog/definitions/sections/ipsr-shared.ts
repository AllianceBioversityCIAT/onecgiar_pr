// @akili-spec quality-assurance/qa-field-catalog
// QAC-T-11 · helpers shared by the IPSR (innovation package) section files. Data only.
import { CatalogSubField, Condition } from '../types';

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

/** QAC-T-28: row-level rule of a subfield. Unconditional -> `required: true`; conditional -> `required: false` + `required_when`. */
export interface SubRule {
  required?: boolean;
  required_when?: Condition;
  visible_when?: Condition;
}

/** Subfield of a list; `rule` is its optional row-level rule (none = optional and always shown). */
export const sub = (
  table: string,
  key: string,
  label: string,
  type: CatalogSubField['type'],
  column: string = key,
  control_list?: string,
  rule: SubRule = {},
): CatalogSubField => ({
  key,
  label,
  type,
  ...(control_list ? { control_list } : {}),
  required: rule.required ?? false,
  ...(rule.required_when ? { required_when: rule.required_when } : {}),
  ...(rule.visible_when ? { visible_when: rule.visible_when } : {}),
  storage: col(table, column),
});
