// @akili-spec quality-assurance/qa-field-catalog
import { Validity } from './types';

/** QAC-R-3: valid for Y when valid_from <= Y and (valid_to is null or Y <= valid_to). */
export function isValidIn(entry: Validity, year: number): boolean {
  return (
    entry.valid_from <= year &&
    (entry.valid_to === null || year <= entry.valid_to)
  );
}
