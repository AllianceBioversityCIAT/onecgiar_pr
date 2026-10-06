// @akili-spec quality-assurance/qa-field-catalog
import { CatalogDefinition, Validity } from './types';

export type CatalogShapeRule =
  | 'SELECT_WITHOUT_CONTROL_LIST'
  | 'STRUCTURED_WITHOUT_SUBFIELDS'
  | 'INVALID_VALIDITY_RANGE'
  | 'DUPLICATE_KEY'
  | 'UNKNOWN_SECTION'
  | 'UNKNOWN_RESULT_TYPE'
  | 'EMPTY_NOT_FOR_QA_REASON';

export interface CatalogShapeError {
  rule: CatalogShapeRule;
  path: string;
  message: string;
}

const SELECT_TYPES = ['single_select', 'multi_select'];
const STRUCTURED_TYPES = ['list', 'object'];

function checkValidityRange(
  entry: Validity,
  path: string,
  errors: CatalogShapeError[],
): void {
  if (entry.valid_to !== null && entry.valid_from > entry.valid_to) {
    errors.push({
      rule: 'INVALID_VALIDITY_RANGE',
      path,
      message: `${path}: valid_from (${entry.valid_from}) is after valid_to (${entry.valid_to})`,
    });
  }
}

function checkDuplicates(
  keys: string[],
  prefix: string,
  errors: CatalogShapeError[],
): void {
  const seen = new Set<string>();
  const reported = new Set<string>();
  for (const key of keys) {
    if (seen.has(key) && !reported.has(key)) {
      reported.add(key);
      errors.push({
        rule: 'DUPLICATE_KEY',
        path: `${prefix}:${key}`,
        message: `${prefix}:${key}: key is declared more than once`,
      });
    }
    seen.add(key);
  }
}

function checkResultTypes(
  scope: string[],
  known: Set<string>,
  path: string,
  errors: CatalogShapeError[],
): void {
  for (const key of scope) {
    if (key !== '*' && !known.has(key)) {
      errors.push({
        rule: 'UNKNOWN_RESULT_TYPE',
        path,
        message: `${path}: unknown result type "${key}"`,
      });
    }
  }
}

/** Pure shape check of a catalog definition (QAC-R-1, QAC-R-3, QAC-R-7). Returns every violation. */
export function validateCatalogShape(
  catalog: CatalogDefinition,
): CatalogShapeError[] {
  const errors: CatalogShapeError[] = [];
  const typeKeys = new Set(catalog.resultTypes.map((t) => t.key));
  const sectionKeys = new Set(catalog.sections.map((s) => s.key));

  checkDuplicates(
    catalog.resultTypes.map((t) => t.key),
    'resultType',
    errors,
  );
  checkDuplicates(
    catalog.sections.map((s) => s.key),
    'section',
    errors,
  );
  checkDuplicates(
    catalog.fields.map((f) => f.key),
    'field',
    errors,
  );

  for (const s of catalog.sections) {
    const path = `section:${s.key}`;
    checkValidityRange(s, path, errors);
    checkResultTypes(s.result_types, typeKeys, path, errors);
  }

  for (const f of catalog.fields) {
    const path = `field:${f.key}`;
    checkValidityRange(f, path, errors);
    checkResultTypes(f.result_types, typeKeys, path, errors);
    if (!sectionKeys.has(f.section)) {
      errors.push({
        rule: 'UNKNOWN_SECTION',
        path,
        message: `${path}: unknown section "${f.section}"`,
      });
    }
    if (SELECT_TYPES.includes(f.type) && !f.control_list) {
      errors.push({
        rule: 'SELECT_WITHOUT_CONTROL_LIST',
        path,
        message: `${path}: ${f.type} requires a control_list`,
      });
    }
    if (STRUCTURED_TYPES.includes(f.type) && !f.subfields?.length) {
      errors.push({
        rule: 'STRUCTURED_WITHOUT_SUBFIELDS',
        path,
        message: `${path}: ${f.type} requires at least one subfield`,
      });
    }
    for (const sub of f.subfields ?? []) {
      if (SELECT_TYPES.includes(sub.type) && !sub.control_list) {
        const subPath = `${path}/subfield:${sub.key}`;
        errors.push({
          rule: 'SELECT_WITHOUT_CONTROL_LIST',
          path: subPath,
          message: `${subPath}: ${sub.type} requires a control_list`,
        });
      }
    }
  }

  for (const n of catalog.notForQa) {
    if (!n.reason || n.reason.trim() === '') {
      const path = `notForQa:${n.table}.${n.column}`;
      errors.push({
        rule: 'EMPTY_NOT_FOR_QA_REASON',
        path,
        message: `${path}: NOT_FOR_QA entry needs a non-empty reason`,
      });
    }
  }

  return errors;
}
