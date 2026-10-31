// @akili-spec quality-assurance/qa-results-feed
// QRF-DD-7 / P-14: what the value reader must know about a bound table that the catalog bindings do not say —
// its primary key (element identity), the column that holds the result id (a `column` binding names no foreign
// key) and whether a date column is a DATE or a DATETIME (QRF-DD-9). Read from the TypeORM entity metadata of the
// catalog scope, so a renamed column cannot drift from the reader.
import { getMetadataArgsStorage } from 'typeorm';
import { tableName } from '../definitions/completeness';
import { CATALOG_SCOPE } from '../definitions/scope';

export type Temporal = 'date' | 'datetime';

/** Seam the plan builder and resolvers read; specs pass a literal fixture instead of the entity metadata. */
export interface TableKeys {
  /** The single-column primary key of `table`; throws when there is none or it is composite (P-14). */
  primaryKey(table: string): string;
  /** The column of `table` that holds the result id, for a top-level `column` binding. */
  resultKey(table: string): string;
  /** Storage kind of a date column; `datetime` unless the entity declares `date`. */
  temporal(table: string, column: string): Temporal;
}

/**
 * Top-level `column` bindings read one row of the result's own table (`result`) or of one per-type table.
 * The binding names no foreign key, so it is stated here, once. `values/table-metadata.spec.ts` checks every
 * entry against the entity metadata and every top-level `column` table of the catalog against this map.
 */
export const RESULT_KEY_COLUMN: Readonly<Record<string, string>> = {
  result: 'id',
  results_knowledge_product: 'results_id',
  results_capacity_developments: 'result_id',
  results_innovations_dev: 'results_id',
  results_policy_changes: 'result_id',
  results_innovations_use: 'results_id',
  result_innovation_package: 'result_innovation_package_id',
};

type AnyClass = abstract new (...args: any[]) => unknown;

/** Target followed by its base classes (base-class columns are registered on the base target). */
function prototypeChain(target: AnyClass): Set<unknown> {
  const chain = new Set<unknown>();
  let current: unknown = target;
  while (typeof current === 'function' && current !== Function.prototype) {
    chain.add(current);
    current = Object.getPrototypeOf(current);
  }
  return chain;
}

interface ColumnInfo {
  name: string;
  primary: boolean;
  temporal: Temporal;
}

/** `table -> columns` of the catalog-scope entities, with primary-key and date-kind flags. */
function scopeColumns(): Map<string, ColumnInfo[]> {
  const storage = getMetadataArgsStorage();
  const scope = new Set<unknown>(CATALOG_SCOPE);
  const out = new Map<string, ColumnInfo[]>();
  for (const table of storage.tables) {
    if (typeof table.target !== 'function' || !scope.has(table.target)) {
      continue;
    }
    const chain = prototypeChain(table.target as AnyClass);
    const columns = storage.columns
      .filter((c) => chain.has(c.target))
      .map((c) => ({
        name: c.options?.name ?? c.propertyName,
        primary: c.options?.primary === true,
        temporal: (c.options?.type === 'date'
          ? 'date'
          : 'datetime') as Temporal,
      }));
    // a foreign key declared by `@JoinColumn` is a column too (e.g. `results_capacity_developments.result_id`)
    const joins = storage.joinColumns
      .filter((j) => chain.has(j.target))
      .map((j) => ({
        name: j.name ?? `${j.propertyName}Id`,
        primary: false,
        temporal: 'datetime' as Temporal,
      }));
    const name = tableName(table);
    out.set(name, [...(out.get(name) ?? []), ...columns, ...joins]);
  }
  return out;
}

/** Primary-key columns per table (P-14 reads this; `primaryKey` below requires exactly one). */
export function primaryKeyColumnsByTable(): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const [table, columns] of scopeColumns()) {
    out.set(
      table,
      columns.filter((c) => c.primary).map((c) => c.name),
    );
  }
  return out;
}

/** Column names per scope table (own and inherited); lets a spec check a registered column really exists. */
export function columnNamesByTable(): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  for (const [table, columns] of scopeColumns()) {
    out.set(table, new Set(columns.map((c) => c.name)));
  }
  return out;
}

export function entityTableKeys(): TableKeys {
  const columns = scopeColumns();
  const info = (table: string): ColumnInfo[] => {
    const found = columns.get(table);
    if (!found)
      throw new Error('value reader: table is not in the catalog scope');
    return found;
  };
  return {
    primaryKey(table) {
      const pks = info(table).filter((c) => c.primary);
      if (pks.length !== 1) {
        throw new Error(
          `value reader: expected one primary-key column, found ${pks.length}`,
        );
      }
      return pks[0].name;
    },
    resultKey(table) {
      const key = RESULT_KEY_COLUMN[table];
      if (!key) throw new Error('value reader: no result key for the table');
      return key;
    },
    temporal(table, column) {
      return info(table).find((c) => c.name === column)?.temporal ?? 'datetime';
    },
  };
}
