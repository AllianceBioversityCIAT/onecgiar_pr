// @akili-spec quality-assurance/qa-field-catalog
// Constants shared by the section files (QAC-T-8 onwards). Data only.
import { RequiredWhen, Validity } from '../types';

/** Every field of the 2026 (P25) form is valid from 2026 and open-ended (QAC-R-3). */
export const FROM_2026: Validity = { valid_from: 2026, valid_to: null };

/** `result_types` for rows that apply to every result type. */
export const ALL_TYPES = ['*'];

/** Every result type except knowledge product (KP rows are read-only or exempt). */
export const NON_KP_TYPES = [
  'policy_change',
  'innovation_use',
  'other_outcome',
  'capacity_sharing',
  'innovation_development',
  'other_output',
  'impact_contribution',
  'innovation_package',
];

/**
 * Every result type except innovation package. Explicit list on purpose: the IPSR step-1 geography has its own
 * keys (`ipsr_step_1.geo_scope` / `.regions` / `.countries`, QAC-T-11) because the live IPSR function applies none of
 * the common `geo.*` required rules, so those keys must not use `ALL_TYPES` (QAC-R-5).
 */
export const NON_IPSR_TYPES = [
  'policy_change',
  'innovation_use',
  'other_outcome',
  'capacity_sharing',
  'knowledge_product',
  'innovation_development',
  'other_output',
  'impact_contribution',
];

/** Types with the innovation-only blocks (annual updating, extra geographic scope). */
export const INNOVATION_TYPES = ['innovation_development', 'innovation_use'];

/**
 * Convention for `required_when` (DD-7, data only, never evaluated here):
 *  - `field` is the catalog key of another field (inside a subfield: a sibling subfield first), except the
 *    header pseudo keys, which start with `$` (v1.9); the only one today is `$result_type` (DD-12);
 *  - `$result_type` is the catalog result type key of the result;
 *  - any other value a condition needs is itself a catalog field (e.g. `general.is_replicated`).
 * `required` is true only when the rule has no condition; a conditional rule sets `required: false`
 * plus `required_when`.
 */
export const RESULT_TYPE_FIELD = '$result_type';
export const IS_REPLICATED_FIELD = 'general.is_replicated';

export const whenEq = (
  field: string,
  value: string | number | boolean,
): RequiredWhen => ({ field, operator: 'eq', value });

export const whenIn = (
  field: string,
  value: Array<string | number>,
): RequiredWhen => ({ field, operator: 'in', value });
