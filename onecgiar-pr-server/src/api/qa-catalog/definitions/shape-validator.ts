// @akili-spec quality-assurance/qa-field-catalog
import { CLOSED_CONTROL_LISTS } from './closed-control-lists';
import {
  CatalogDefinition,
  CatalogField,
  CatalogSubField,
  Condition,
  ConditionLeaf,
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
  | 'UNKNOWN_HEADER_KEY'
  | 'CONDITION_OPERATOR_NOT_ALLOWED'
  | 'CONDITION_VALUE_TYPE'
  | 'CONDITION_VALUE_NOT_IN_LIST'
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
 * v1.9: the `$` prefix is reserved for RESULT HEADER data (not catalog fields). A condition key that starts with `$`
 * must be one of CONDITION_PSEUDO_KEYS; any other `$...` key is rejected. Today only `$result_type` exists: the
 * result's catalog type key, matching `result_types[].key`. Future header keys (e.g. `$phase`) follow the same syntax.
 * Every other value a condition needs is itself a catalog field.
 */
export const HEADER_KEY_PREFIX = '$';
export const CONDITION_PSEUDO_KEYS: readonly string[] = ['$result_type'];

/** Closed operator vocabulary of `required_when` / `visible_when` (DD-12). */
export const CONDITION_OPERATORS: readonly string[] = ['eq', 'in', 'not_null'];

const isBlank = (v: unknown): boolean =>
  typeof v !== 'string' || v.trim() === '';

/** Every leaf of a condition tree (under all/any). */
function conditionLeaves(condition: Condition | undefined): ConditionLeaf[] {
  if (!condition) return [];
  if ('all' in condition) return condition.all.flatMap(conditionLeaves);
  if ('any' in condition) return condition.any.flatMap(conditionLeaves);
  return [condition];
}

/** The compared value(s) of a leaf, as a list (`eq` -> one, `in` -> many, `not_null` -> none). */
function comparedValues(leaf: ConditionLeaf): unknown[] {
  if (leaf.operator === 'not_null') return [];
  return Array.isArray(leaf.value) ? leaf.value : [leaf.value];
}

/**
 * v1.9 comparison semantics by the referenced field's type. Returns the violations of one well-formed leaf:
 *  - boolean / number / text / date: compared as is, nothing to check;
 *  - single_select: compared against the option id, so every value must be numeric;
 *  - multi_select: only `in` (true when at least one selected id is in `value`) or `not_null`; `eq` is rejected;
 *  - a select over a CLOSED control list: every compared id must exist in that list;
 *  - `$result_type`: compared against the type key (string); every key must exist in result_types[].
 */
function leafSemanticProblems(
  leaf: ConditionLeaf,
  target: { type: string; control_list?: string } | undefined,
  typeKeys: Set<string>,
): Array<{ rule: CatalogShapeRule; problem: string }> {
  const out: Array<{ rule: CatalogShapeRule; problem: string }> = [];
  const values = comparedValues(leaf);
  if (leaf.field.startsWith(HEADER_KEY_PREFIX)) {
    if (leaf.field === '$result_type') {
      for (const v of values) {
        if (typeof v !== 'string') {
          out.push({
            rule: 'CONDITION_VALUE_TYPE',
            problem: `"$result_type" is compared against a result type key (string), got ${JSON.stringify(v)}`,
          });
        } else if (!typeKeys.has(v)) {
          out.push({
            rule: 'CONDITION_VALUE_NOT_IN_LIST',
            problem: `"$result_type" value "${v}" is not a result type key`,
          });
        }
      }
    }
    return out;
  }
  if (!target) return out;
  if (target.type === 'multi_select' && leaf.operator === 'eq') {
    out.push({
      rule: 'CONDITION_OPERATOR_NOT_ALLOWED',
      problem: `"${leaf.field}" is a multi_select: \`eq\` is not allowed, use \`in\` (true when at least one selected id is in value)`,
    });
    return out;
  }
  if (target.type !== 'single_select' && target.type !== 'multi_select') {
    return out;
  }
  const nonNumeric = values.filter(
    (v) => typeof v !== 'number' || !Number.isFinite(v),
  );
  if (nonNumeric.length > 0) {
    out.push({
      rule: 'CONDITION_VALUE_TYPE',
      problem: `"${leaf.field}" is a ${target.type}: it is compared against option ids, so every value must be numeric (got ${JSON.stringify(nonNumeric)})`,
    });
    return out;
  }
  const closed = target.control_list
    ? CLOSED_CONTROL_LISTS[target.control_list]
    : undefined;
  if (closed) {
    const missing = values.filter((v) => !closed.includes(v as number));
    if (missing.length > 0) {
      out.push({
        rule: 'CONDITION_VALUE_NOT_IN_LIST',
        problem: `"${leaf.field}" compares ids ${JSON.stringify(missing)} that are not in the closed control list "${target.control_list}" (${closed.join(', ')})`,
      });
    }
  }
  return out;
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
        if (isBlank(step?.table)) problems.push(`step ${i}: table missing`);
        if (!Array.isArray(step?.join) || step.join.length === 0) {
          problems.push(`step ${i}: join must be a non-empty array`);
          return;
        }
        step.join.forEach((pair, j) => {
          for (const prop of ['from', 'to'] as const) {
            if (isBlank(pair?.[prop])) {
              problems.push(`step ${i}: join ${j} ${prop} missing`);
            }
          }
        });
      });
    }
    if (isBlank(b.value_column)) problems.push('value_column missing');
    return problems.length
      ? { rule: 'MALFORMED_PATH_BINDING', problem: problems.join('; ') }
      : null;
  }
  if (storage.kind === 'lookup') {
    const b = storage as LookupBinding;
    const problems = (['source', 'value_column'] as const)
      .filter((prop) => isBlank(b[prop]))
      .map((prop) => `${prop} missing`);
    if (!Array.isArray(b.keys) || b.keys.length === 0) {
      problems.push('keys must be a non-empty array');
    } else {
      b.keys.forEach((key, i) => {
        for (const prop of ['from', 'to'] as const) {
          if (isBlank(key?.[prop])) problems.push(`key ${i}: ${prop} missing`);
        }
      });
    }
    if (b.qualifiers !== undefined) {
      if (!Array.isArray(b.qualifiers)) {
        problems.push('qualifiers must be an array');
      } else {
        b.qualifiers.forEach((q, i) => {
          if (isBlank(q?.column))
            problems.push(`qualifier ${i}: column missing`);
          if (
            !['string', 'number', 'boolean'].includes(typeof q?.equals) ||
            (typeof q?.equals === 'string' && q.equals.trim() === '')
          ) {
            problems.push(`qualifier ${i}: equals needs a scalar value`);
          }
          if (
            q?.match !== undefined &&
            q.match !== 'equals' &&
            q.match !== 'year'
          ) {
            problems.push(`qualifier ${i}: match must be "equals" or "year"`);
          }
        });
      }
    }
    if (b.pick !== undefined) {
      const pick = b.pick as unknown;
      if (typeof pick !== 'object' || pick === null || Array.isArray(pick)) {
        problems.push('pick must be an object');
      } else {
        const { order_by, direction } = pick as Record<string, unknown>;
        if (isBlank(order_by)) problems.push('pick: order_by missing');
        if (direction !== 'asc' && direction !== 'desc') {
          problems.push('pick: direction must be "asc" or "desc"');
        }
      }
    }
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
  const topLevelField = new Map<string, CatalogField>();
  for (const f of catalog.fields) {
    if (!topLevel.has(f.key)) {
      topLevel.set(f.key, f);
      topLevelField.set(f.key, f);
    }
  }

  function pushSemantic(
    found: Array<{ rule: CatalogShapeRule; problem: string }>,
    path: string,
  ): void {
    for (const { rule, problem } of found) {
      errors.push({ rule, path, message: `${path}: ${problem}` });
    }
  }

  /**
   * DD-12: every key a condition names must be a catalog key (top-level, a sibling subfield for a
   * subfield condition, or a pseudo key) and, for a top-level key, valid in every year the owner is.
   */
  function checkCondition(
    condition: Condition | undefined,
    path: string,
    owner: Validity,
    siblings: Map<string, CatalogSubField> | undefined,
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
    for (const leaf of conditionLeaves(condition)) {
      const key = leaf.field;
      if (key.startsWith(HEADER_KEY_PREFIX)) {
        if (!CONDITION_PSEUDO_KEYS.includes(key)) {
          errors.push({
            rule: 'UNKNOWN_HEADER_KEY',
            path,
            message: `${path}: condition names "${key}"; the "$" prefix is reserved for result header keys and only ${CONDITION_PSEUDO_KEYS.join(', ')} exists`,
          });
        } else {
          pushSemantic(leafSemanticProblems(leaf, undefined, typeKeys), path);
        }
        continue;
      }
      // Scope: inside subfields the sibling of the same list element wins; a top-level key is the fallback.
      const sibling = siblings?.get(key);
      const target = sibling ?? topLevelField.get(key);
      if (!target) {
        errors.push({
          rule: 'UNKNOWN_CONDITION_KEY',
          path,
          message: `${path}: condition names "${key}", which is not a catalog key`,
        });
        continue;
      }
      if (!sibling && !covers(topLevel.get(key) as Validity, owner)) {
        errors.push({
          rule: 'CONDITION_KEY_NOT_VALID',
          path,
          message: `${path}: condition key "${key}" is not valid in every year its owner is`,
        });
        continue;
      }
      pushSemantic(leafSemanticProblems(leaf, target, typeKeys), path);
    }
  }

  /** DD-13: every lookup key's `from` names a sibling subfield key (subfield lookup) or a top-level key. */
  function checkLookupKey(
    storage: StorageBinding | SubFieldStorageBinding,
    path: string,
    siblings: Pick<Set<string>, 'has'> | undefined,
    ownKey?: string,
  ): void {
    if (storage.kind !== 'lookup' || !Array.isArray(storage.keys)) return;
    for (const { from } of storage.keys) {
      if (isBlank(from)) continue;
      if (ownKey !== undefined && from === ownKey) {
        errors.push({
          rule: 'UNKNOWN_LOOKUP_KEY',
          path,
          message: `${path}: lookup key from "${from}" names the subfield itself; it must name a sibling subfield or a top-level catalog key`,
        });
      } else if (!siblings?.has(from) && !topLevel.has(from)) {
        errors.push({
          rule: 'UNKNOWN_LOOKUP_KEY',
          path,
          message: `${path}: lookup key from "${from}" is neither a sibling subfield key nor a top-level catalog key`,
        });
      }
    }
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
    const siblings = new Map(subs.map((sub) => [sub.key, sub]));
    for (const key of siblings.keys()) {
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
