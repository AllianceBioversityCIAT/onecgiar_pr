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

/** Types with the innovation-only blocks (annual updating, extra geographic scope). */
export const INNOVATION_TYPES = ['innovation_development', 'innovation_use'];

/**
 * Convention for `required_when` (DD-7, data only, never evaluated here):
 *  - `field` is the catalog key of another field, except the two pseudo fields below;
 *  - `result_type` is the catalog result type key of the result;
 *  - `is_replicated` is `result.is_replicated` (a NOT_FOR_QA flag that gates the annual-updating block).
 * `required` is true only when the rule has no condition; a conditional rule sets `required: false`
 * plus `required_when`.
 */
export const RESULT_TYPE_FIELD = 'result_type';
export const IS_REPLICATED_FIELD = 'is_replicated';

export const whenEq = (
  field: string,
  value: string | number | boolean,
): RequiredWhen => ({ field, operator: 'eq', value });

export const whenIn = (
  field: string,
  value: Array<string | number>,
): RequiredWhen => ({ field, operator: 'in', value });
