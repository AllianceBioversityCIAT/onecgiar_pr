// @akili-spec quality-assurance/qa-field-catalog
// QAC-R-7 / DD-2: pure completeness guard over TypeORM metadata (no database).
// The spec calls checkCompleteness() for the real scope AND for its fixtures: one code path.
import type { ColumnMetadataArgs } from 'typeorm/metadata-args/ColumnMetadataArgs';
import type { JoinColumnMetadataArgs } from 'typeorm/metadata-args/JoinColumnMetadataArgs';
import type { TableMetadataArgs } from 'typeorm/metadata-args/TableMetadataArgs';
import { snakeCase } from 'typeorm/util/StringUtils';
import {
  CatalogField,
  CatalogSubField,
  NotForQaEntry,
  PendingCatalogEntry,
  StorageBinding,
  SubFieldStorageBinding,
} from './types';
import type { ExcludedTable } from './excluded-tables';
import type { EntityClass } from './scope';

/** The slice of `getMetadataArgsStorage()` the guard reads; lets callers pass a filtered view. */
export interface MetadataView {
  tables: TableMetadataArgs[];
  columns: ColumnMetadataArgs[];
  joinColumns: JoinColumnMetadataArgs[];
}

export interface CompletenessInput {
  metadata: MetadataView;
  scope: EntityClass[];
  excluded: ExcludedTable[];
  fields: CatalogField[];
  notForQa: NotForQaEntry[];
  /** DD-11: known-but-not-yet-catalogued columns; subtracted like NOT_FOR_QA but kept distinct. */
  pending: PendingCatalogEntry[];
}

/** Rule: tables that must be in scope or excluded (the `result` table plus every `results?_*`). */
export const RESULT_TABLE_PATTERN = /^(result|results?_.*)$/;

type AnyClass = abstract new (...args: any[]) => unknown;

/** Target followed by its base classes (base-class columns are registered on the base target). */
function prototypeChain(target: AnyClass): AnyClass[] {
  const chain: AnyClass[] = [];
  let current: unknown = target;
  while (typeof current === 'function' && current !== Function.prototype) {
    chain.push(current as AnyClass);
    current = Object.getPrototypeOf(current);
  }
  return chain;
}

/** `@Entity()` without a name resolves via TypeORM's default strategy: snake_case(class name). */
export function tableName(table: TableMetadataArgs): string {
  return table.name ?? snakeCase((table.target as AnyClass).name);
}

/** Column names of an entity class, own + inherited, including join columns. */
export function columnsOf(
  metadata: MetadataView,
  target: AnyClass,
): Set<string> {
  const chain = new Set<unknown>(prototypeChain(target));
  const names = new Set<string>();
  for (const c of metadata.columns) {
    if (chain.has(c.target)) names.add(c.options?.name ?? c.propertyName);
  }
  for (const j of metadata.joinColumns) {
    if (chain.has(j.target)) {
      // Unnamed join column: TypeORM's default naming is camelCase(<relation>_<referenced pk>) -> `<prop>Id`.
      names.add(j.name ?? `${j.propertyName}Id`);
    }
  }
  return names;
}

/** `table -> columns` for every registered @Entity table. */
export function tablesIn(metadata: MetadataView): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  for (const t of metadata.tables) {
    if (typeof t.target !== 'function') continue;
    const name = tableName(t);
    const cols = columnsOf(metadata, t.target as AnyClass);
    const prev = out.get(name);
    out.set(name, prev ? new Set([...prev, ...cols]) : cols);
  }
  return out;
}

interface Claim {
  table: string;
  column: string;
  origin: string;
}

/**
 * The table a binding's value row lives on, i.e. the row a child (subfield) binding starts from:
 * a column or relation binding names it; a path binding ends on its last step's table; a lookup has
 * no table (reference data), so nothing can be joined from it.
 */
function lastTableOf(
  s: StorageBinding | SubFieldStorageBinding,
): string | undefined {
  switch (s.kind) {
    case 'column':
    case 'relation':
      return s.table;
    case 'path':
      return s.steps?.[s.steps.length - 1]?.table;
    default:
      return undefined;
  }
}

/**
 * Columns a binding claims. A relation binding covers `fk_to_result` and `value_column` of its table;
 * its `filter` keys also count as covered (they are columns the binding itself names and must exist),
 * and are stale-checked like the rest. A path binding (DD-13) claims, per step and per `join` pair, `to` and the
 * filter keys on the step's table and `from` on the previous table, plus `value_column` and
 * `columns` on the last step's table. The first step starts from `startTable`: `result` for a
 * top-level field, the PARENT binding's last table for a subfield (DD-12), so the parent table must
 * be in scope too; with no start table (the parent is a lookup) the first `from` columns are unchecked.
 * A lookup claims nothing: its source is reference data, not a result table.
 */
function claimsOfBinding(
  s: StorageBinding | SubFieldStorageBinding,
  origin: string,
  startTable: string | undefined,
): Claim[] {
  switch (s.kind) {
    case 'column':
      return [{ table: s.table, column: s.column, origin }];
    case 'relation':
      return [
        { table: s.table, column: s.fk_to_result, origin },
        { table: s.table, column: s.value_column, origin },
        ...Object.keys(s.filter ?? {}).map((column) => ({
          table: s.table,
          column,
          origin,
        })),
      ];
    case 'path': {
      const claims: Claim[] = [];
      let previous = startTable;
      for (const step of s.steps ?? []) {
        for (const pair of step.join ?? []) {
          if (previous !== undefined) {
            claims.push({ table: previous, column: pair.from, origin });
          }
          claims.push({ table: step.table, column: pair.to, origin });
        }
        for (const column of Object.keys(step.filter ?? {})) {
          claims.push({ table: step.table, column, origin });
        }
        previous = step.table;
      }
      const last = s.steps?.[s.steps.length - 1];
      if (last) {
        for (const column of [s.value_column, ...(s.columns ?? [])]) {
          claims.push({ table: last.table, column, origin });
        }
      }
      return claims;
    }
    default:
      return [];
  }
}

function claimsOfSubfields(
  subs: CatalogSubField[] | undefined,
  prefix: string,
  parentTable: string | undefined,
): Claim[] {
  return (subs ?? []).flatMap((sub) => {
    const id = `${prefix}.${sub.key}`;
    return [
      ...claimsOfBinding(sub.storage, `subfield ${id}`, parentTable),
      ...claimsOfSubfields(sub.subfields, id, lastTableOf(sub.storage)),
    ];
  });
}

function claimsFrom(fields: CatalogField[]): Claim[] {
  return fields.flatMap((f) => [
    ...claimsOfBinding(f.storage, `field ${f.key}`, 'result'),
    ...claimsOfSubfields(f.subfields, f.key, lastTableOf(f.storage)),
  ]);
}

/** Returns human-readable failures; empty array means the guard passes. */
export function checkCompleteness(input: CompletenessInput): string[] {
  const failures: string[] = [];
  const tables = tablesIn(input.metadata);

  const scopeNames = new Set<string>();
  for (const cls of input.scope) {
    const meta = input.metadata.tables.find((t) => t.target === cls);
    if (!meta) {
      failures.push(`scope: ${cls.name} is not a registered @Entity`);
      continue;
    }
    scopeNames.add(tableName(meta));
  }

  // DD-3: every result table is in scope or excluded.
  const excludedNames = new Set(input.excluded.map((e) => e.table));
  for (const name of tables.keys()) {
    if (
      RESULT_TABLE_PATTERN.test(name) &&
      !scopeNames.has(name) &&
      !excludedNames.has(name)
    ) {
      failures.push(
        `result table ${name} is neither in scope.ts nor in excluded-tables.ts`,
      );
    }
  }
  for (const e of input.excluded) {
    if (!e.reason?.trim())
      failures.push(`excluded table ${e.table} has an empty reason`);
    if (!tables.has(e.table))
      failures.push(`stale excluded entry: table ${e.table} does not exist`);
    if (scopeNames.has(e.table))
      failures.push(`table ${e.table} is both in scope and excluded`);
  }

  // Bindings and NOT_FOR_QA must name existing columns of in-scope tables.
  const covered = new Set<string>();
  const claims: Claim[] = [
    ...claimsFrom(input.fields),
    ...input.notForQa.map((n) => ({
      table: n.table,
      column: n.column,
      origin: 'NOT_FOR_QA',
    })),
  ];
  for (const n of input.notForQa) {
    if (!n.reason?.trim())
      failures.push(`NOT_FOR_QA ${n.table}.${n.column} has an empty reason`);
  }
  // DD-11: PENDING_CATALOG entries are validated like NOT_FOR_QA (reason, existing column, in-scope
  // table) and count as covered. A column may be both bound and pending (a second field shares the
  // column and is not catalogued yet), but never both pending and NOT_FOR_QA (contradictory).
  const notForQaKeys = new Set(
    input.notForQa.map((n) => `${n.table}.${n.column}`),
  );
  for (const p of input.pending) {
    const id = `${p.table}.${p.column}`;
    if (!p.reason?.trim())
      failures.push(`PENDING_CATALOG ${id} has an empty reason`);
    if (notForQaKeys.has(id))
      failures.push(`${id} is both PENDING_CATALOG and NOT_FOR_QA`);
  }
  const pendingClaims: Claim[] = input.pending.map((p) => ({
    table: p.table,
    column: p.column,
    origin: 'PENDING_CATALOG',
  }));
  for (const c of [...claims, ...pendingClaims]) {
    const cols = tables.get(c.table);
    if (!cols) {
      failures.push(
        `stale ${c.origin}: table ${c.table} does not exist (${c.table}.${c.column})`,
      );
    } else if (!cols.has(c.column)) {
      failures.push(`stale ${c.origin}: ${c.table}.${c.column} does not exist`);
    } else if (!scopeNames.has(c.table)) {
      failures.push(
        `${c.origin} names ${c.table}.${c.column} but table ${c.table} is not in scope.ts`,
      );
    } else {
      covered.add(`${c.table}.${c.column}`);
    }
  }

  // Every column of every in-scope table is covered.
  for (const name of scopeNames) {
    for (const column of tables.get(name) ?? []) {
      if (!covered.has(`${name}.${column}`)) {
        failures.push(
          `uncatalogued column ${name}.${column}: bind it to a field, or list it in NOT_FOR_QA or PENDING_CATALOG with a reason`,
        );
      }
    }
  }
  return failures;
}
