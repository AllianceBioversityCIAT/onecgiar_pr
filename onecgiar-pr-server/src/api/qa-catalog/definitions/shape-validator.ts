// @akili-spec quality-assurance/qa-field-catalog
import {
  CatalogDefinition,
  CatalogSubField,
  Condition,
  LookupBinding,
  PathBinding,
  StorageBinding,
  SubFieldStorageBinding,
  Validity,
} from './types';

export type CatalogShapeRule =
  | 'SELECT_WITHOUT_CONTROL_LIST'
  | 'STRUCTURED_WITHOUT_SUBFIELDS'
  | 'INVALID_VALIDITY_RANGE'
  | 'DUPLICATE_KEY'
  | 'UNKNOWN_SECTION'
  | 'UNKNOWN_RESULT_TYPE'
  | 'EMPTY_NOT_FOR_QA_REASON'
  | 'UNKNOWN_CONDITION_KEY'
  | 'MALFORMED_CONDITION'
  | 'UNKNOWN_LOOKUP_KEY'
  | 'CONDITION_KEY_NOT_VALID'
  | 'MAX_DEPTH_EXCEEDED'
  | 'MALFORMED_PATH_BINDING'
  | 'MALFORMED_LOOKUP_BINDING';

export interface CatalogShapeError {
  rule: CatalogShapeRule;
  path: string;
  message: string;
}

const SELECT_TYPES = ['single_select', 'multi_select'];
const STRUCTURED_TYPES = ['list', 'object'];

/** Subfields may nest to this depth below the top-level field (DD-13). */
export const MAX_SUBFIELD_DEPTH = 2;

/**
 * The ONLY condition key that is not a catalog field (DD-12): the result's catalog type key,
 * matching `result_types[]`. Any other value a condition needs is itself a catalog field.
 */
export const CONDITION_PSEUDO_KEYS: readonly string[] = ['result_type'];

/** Closed operator vocabulary of `required_when` / `visible_when` (DD-12). */
export const CONDITION_OPERATORS: readonly string[] = ['eq', 'in', 'not_null'];

const isBlank = (v: unknown): boolean =>
  typeof v !== 'string' || v.trim() === '';

/** Every `field` named by a condition tree (leaves under all/any). */
function conditionKeys(condition: Condition | undefined): string[] {
  if (!condition) return [];
  if ('all' in condition) return condition.all.flatMap(conditionKeys);
  if ('any' in condition) return condition.any.flatMap(conditionKeys);
  return [condition.field];
}

/**
 * Why a condition node is malformed, or null. A leaf needs a non-blank `field`, an operator in the
 * closed vocabulary, a scalar `value` for `eq` and a non-empty array for `in`; `all` / `any` need a
 * non-empty array. Recurses into all/any, returning every problem.
 */
function conditionProblems(condition: unknown): string[] {
  if (!condition || typeof condition !== 'object') {
    return ['condition is not an object'];
  }
  const node = condition as Record<string, unknown>;
  for (const op of ['all', 'any'] as const) {
    if (op in node) {
      const children = node[op];
      if (!Array.isArray(children) || children.length === 0) {
        return [`${op} needs a non-empty array`];
      }
      return children.flatMap(conditionProblems);
    }
  }
  const problems: string[] = [];
  if (isBlank(node.field)) problems.push('field missing');
  if (!CONDITION_OPERATORS.includes(node.operator as string)) {
    problems.push(
      `operator "${String(node.operator)}" is not one of ${CONDITION_OPERATORS.join(' | ')}`,
    );
  } else if (node.operator === 'in') {
    if (!Array.isArray(node.value) || node.value.length === 0) {
      problems.push('`in` needs a non-empty array value');
    }
  } else if (node.operator === 'not_null') {
    if (node.value !== undefined) {
      problems.push('`not_null` takes no value');
    }
  } else if (node.operator === 'eq') {
    if (
      node.value === undefined ||
      node.value === null ||
      typeof node.value === 'object'
    ) {
      problems.push('`eq` needs a scalar value');
    }
  }
  return problems;
}

/** Why a path/lookup binding is malformed, or null; column and relation bindings are not checked here. */
function bindingProblem(
  storage: StorageBinding | SubFieldStorageBinding,
): { rule: CatalogShapeRule; problem: string } | null {
  if (storage.kind === 'path') {
    const b = storage as PathBinding;
    const problems: string[] = [];
    if (!Array.isArray(b.steps) || b.steps.length === 0) {
      problems.push('steps must be a non-empty array');
    } else {
      b.steps.forEach((step, i) => {
        for (const prop of ['table', 'join_from', 'join_to'] as const) {
          if (isBlank(step?.[prop]))
            problems.push(`step ${i}: ${prop} missing`);
        }
      });
    }
    if (isBlank(b.value_column)) problems.push('value_column missing');
    return problems.length
      ? { rule: 'MALFORMED_PATH_BINDING', problem: problems.join('; ') }
      : null;
  }
  if (storage.kind === 'lookup') {
    const b = storage as LookupBinding;
    const problems = (['source', 'key_from', 'value_column'] as const)
      .filter((prop) => isBlank(b[prop]))
      .map((prop) => `${prop} missing`);
    return problems.length
      ? { rule: 'MALFORMED_LOOKUP_BINDING', problem: problems.join('; ') }
      : null;
  }
  return null;
}

/** True when `target` is valid in every year `owner` is valid in. */
function covers(target: Validity, owner: Validity): boolean {
  if (target.valid_from > owner.valid_from) return false;
  if (target.valid_to === null) return true;
  return owner.valid_to !== null && owner.valid_to <= target.valid_to;
}

function checkBinding(
  storage: StorageBinding | SubFieldStorageBinding,
  path: string,
  errors: CatalogShapeError[],
): void {
  const found = bindingProblem(storage);
  if (found) {
    errors.push({
      rule: found.rule,
      path,
      message: `${path}: ${found.rule === 'MALFORMED_PATH_BINDING' ? 'path' : 'lookup'} binding is malformed (${found.problem})`,
    });
  }
}

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

  const topLevel = new Map<string, Validity>();
  for (const f of catalog.fields) {
    if (!topLevel.has(f.key)) topLevel.set(f.key, f);
  }

  /**
   * DD-12: every key a condition names must be a catalog key (top-level, a sibling subfield for a
   * subfield condition, or a pseudo key) and, for a top-level key, valid in every year the owner is.
   */
  function checkCondition(
    condition: Condition | undefined,
    path: string,
    owner: Validity,
    siblings: Set<string> | undefined,
  ): void {
    if (!condition) return;
    const problems = conditionProblems(condition);
    if (problems.length > 0) {
      errors.push({
        rule: 'MALFORMED_CONDITION',
        path,
        message: `${path}: malformed condition (${problems.join('; ')})`,
      });
      return;
    }
    for (const key of conditionKeys(condition)) {
      if (CONDITION_PSEUDO_KEYS.includes(key) || siblings?.has(key)) continue;
      const target = topLevel.get(key);
      if (!target) {
        errors.push({
          rule: 'UNKNOWN_CONDITION_KEY',
          path,
          message: `${path}: condition names "${key}", which is not a catalog key`,
        });
      } else if (!covers(target, owner)) {
        errors.push({
          rule: 'CONDITION_KEY_NOT_VALID',
          path,
          message: `${path}: condition key "${key}" is not valid in every year its owner is`,
        });
      }
    }
  }

  /** DD-13: a lookup's `key_from` names a sibling subfield key (subfield lookup) or a top-level key. */
  function checkLookupKey(
    storage: StorageBinding | SubFieldStorageBinding,
    path: string,
    siblings: Set<string> | undefined,
    ownKey?: string,
  ): void {
    if (storage.kind !== 'lookup' || isBlank(storage.key_from)) return;
    if (ownKey !== undefined && storage.key_from === ownKey) {
      errors.push({
        rule: 'UNKNOWN_LOOKUP_KEY',
        path,
        message: `${path}: lookup key_from "${storage.key_from}" names the subfield itself; it must name a sibling subfield or a top-level catalog key`,
      });
      return;
    }
    if (siblings?.has(storage.key_from) || topLevel.has(storage.key_from)) {
      return;
    }
    errors.push({
      rule: 'UNKNOWN_LOOKUP_KEY',
      path,
      message: `${path}: lookup key_from "${storage.key_from}" is neither a sibling subfield key nor a top-level catalog key`,
    });
  }

  // Persisted rows are keyed (parent_key, key); a depth-2 parent_key is '<field>.<sub>' (sync
  // convention), so 'a' > 'b' > 'c' and a top-level 'a.b' > 'c' would be the same row.
  const subRows = new Set<string>();

  function checkSubfields(
    subs: CatalogSubField[] | undefined,
    parentPath: string,
    top: Validity,
    depth: number,
    rowParent: string,
  ): void {
    if (!subs?.length) return;
    if (depth > MAX_SUBFIELD_DEPTH) {
      errors.push({
        rule: 'MAX_DEPTH_EXCEEDED',
        path: parentPath,
        message: `${parentPath}: subfields nest deeper than ${MAX_SUBFIELD_DEPTH} levels`,
      });
      return;
    }
    checkDuplicates(
      subs.map((sub) => sub.key),
      `${parentPath}/subfield`,
      errors,
    );
    const siblings = new Set(subs.map((sub) => sub.key));
    for (const key of siblings) {
      const rowId = `${rowParent}|${key}`;
      if (subRows.has(rowId)) {
        errors.push({
          rule: 'DUPLICATE_KEY',
          path: `${parentPath}/subfield:${key}`,
          message: `${parentPath}/subfield:${key}: persisted as the same row (parent "${rowParent}", key "${key}") as another subfield`,
        });
      }
      subRows.add(rowId);
    }
    for (const sub of subs) {
      const subPath = `${parentPath}/subfield:${sub.key}`;
      if (SELECT_TYPES.includes(sub.type) && !sub.control_list) {
        errors.push({
          rule: 'SELECT_WITHOUT_CONTROL_LIST',
          path: subPath,
          message: `${subPath}: ${sub.type} requires a control_list`,
        });
      }
      if (STRUCTURED_TYPES.includes(sub.type) && !sub.subfields?.length) {
        errors.push({
          rule: 'STRUCTURED_WITHOUT_SUBFIELDS',
          path: subPath,
          message: `${subPath}: ${sub.type} requires at least one subfield`,
        });
      }
      checkBinding(sub.storage, subPath, errors);
      checkLookupKey(sub.storage, subPath, siblings, sub.key);
      checkCondition(
        sub.visible_when,
        `${subPath}/visible_when`,
        top,
        siblings,
      );
      checkCondition(
        sub.required_when,
        `${subPath}/required_when`,
        top,
        siblings,
      );
      checkSubfields(
        sub.subfields,
        subPath,
        top,
        depth + 1,
        `${rowParent}.${sub.key}`,
      );
    }
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
    checkBinding(f.storage, path, errors);
    checkLookupKey(f.storage, path, undefined);
    checkCondition(f.visible_when, `${path}/visible_when`, f, undefined);
    checkCondition(f.required_when, `${path}/required_when`, f, undefined);
    checkSubfields(f.subfields, path, f, 1, f.key);
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
