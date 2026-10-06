// @akili-spec quality-assurance/qa-field-catalog
// QAC-R-7 / DD-2: pure completeness guard over TypeORM metadata (no database).
// The spec calls checkCompleteness() for the real scope AND for its fixtures: one code path.
import type { ColumnMetadataArgs } from 'typeorm/metadata-args/ColumnMetadataArgs';
import type { JoinColumnMetadataArgs } from 'typeorm/metadata-args/JoinColumnMetadataArgs';
import type { TableMetadataArgs } from 'typeorm/metadata-args/TableMetadataArgs';
import { snakeCase } from 'typeorm/util/StringUtils';
import { CatalogField, NotForQaEntry } from './types';
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
 * Columns a binding claims. A relation binding covers `fk_to_result` and `value_column` of its table;
 * its `filter` keys also count as covered (they are columns the binding itself names and must exist),
 * and are stale-checked like the rest.
 */
function claimsFrom(fields: CatalogField[]): Claim[] {
  const claims: Claim[] = [];
  for (const f of fields) {
    const s = f.storage;
    if (s.kind === 'column') {
      claims.push({
        table: s.table,
        column: s.column,
        origin: `field ${f.key}`,
      });
    } else {
      const origin = `field ${f.key}`;
      claims.push({ table: s.table, column: s.fk_to_result, origin });
      claims.push({ table: s.table, column: s.value_column, origin });
      for (const key of Object.keys(s.filter ?? {})) {
        claims.push({ table: s.table, column: key, origin });
      }
    }
    for (const sub of f.subfields ?? []) {
      claims.push({
        table: sub.storage.table,
        column: sub.storage.column,
        origin: `subfield ${f.key}.${sub.key}`,
      });
    }
  }
  return claims;
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
  for (const c of claims) {
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
          `uncatalogued column ${name}.${column}: bind it to a field or list it in NOT_FOR_QA with a reason`,
        );
      }
    }
  }
  return failures;
}
