// @akili-spec quality-assurance/qa-value-labels
// QVL-DD-3 / QVL-R-3 / QVL-R-4 / QVL-R-7 / QVL-R-9: turns the batch union of (control list, option id) pairs into labels.
// Constants resolve in memory. Table lists sharing one (table, key column) share ONE `PlanQuery` with `any_in` over the union of
// their ids; a chained list (centers) adds ONE follow-up query; a ToC list is read from the ToC schema (`resolveTocLabelSource`).
// So the statements depend on the lists the batch touches and never on the number of ids or results (R-7). The groups run
// concurrently through the counted runner. Composition is TypeScript (`label-sources.ts`): a label is the stored text as-is (trimmed,
// composed), nothing is stripped or checked, and a text that holds `<` never fails the batch (R-3 as amended 2026-11-10, R-4).
// Every input pair gets an entry: a missing row is `null`, an inactive row still labels (OQ-1, nothing is filtered on a flag).
// Several rows can match one ToC id; the pick is made here over the fetched rows and never depends on SQL row order.
// A throw (a driver error, an unavailable ToC schema) leaves the whole call: no partial labels (R-9). Messages
// never carry a table, column, SQL, id or label (R-9, QRF-R-9).
import { LabelPairs } from './label-collector';
import {
  ChainedSource,
  LABEL_SOURCES,
  LabelRow,
  TableSource,
  TocSource,
  resolveTocLabelSource,
} from './label-sources';
import { PlanQueryRunner, SqlRow } from './read-plan';

export interface LabelContext {
  run: PlanQueryRunner;
  /** Environment the ToC schema is read from (default `process.env`); specs pass a literal. */
  env?: Record<string, string | undefined>;
}

/** control list -> option id (a string) -> label, or `null` when the id has no row (or the row has nothing to show). */
export type ResolvedLabels = Map<string, Map<string, string | null>>;

type Out = Map<string, string | null>;

const has = (o: object, k: string) =>
  Object.prototype.hasOwnProperty.call(o, k);

function fail(list: string, why: string): never {
  // a control list name is a public catalog key; tables, columns, ids and labels never go in an error
  throw new Error(`label resolver: list ${list} ${why}`);
}

// the columns collate case-insensitively: rows are matched the way the SELECT matched them
const keyOf = (v: unknown) => String(v).toLowerCase();

/** The rows by each key column's value (lower-cased text); a row that matches through several columns is kept once per key. */
function indexRows(
  rows: readonly SqlRow[],
  columns: readonly string[],
): Map<string, SqlRow[]> {
  const index = new Map<string, SqlRow[]>();
  for (const row of rows) {
    for (const column of columns) {
      const v = row[column];
      if (v === null || v === undefined) continue;
      const key = keyOf(v);
      const rowsOfKey = index.get(key) ?? [];
      if (!rowsOfKey.includes(row)) rowsOfKey.push(row);
      index.set(key, rowsOfKey);
    }
  }
  return index;
}

const unique = (...columns: Array<readonly string[]>) => [
  ...new Set(columns.flat()),
];

const isActive = (v: unknown) => Number(v) === 1;

/** Primary keys compare as numbers when both are, else as text: a stable order whatever the order the rows arrived in. */
function byPrimaryKey(primaryKey: string) {
  return (a: SqlRow, b: SqlRow) => {
    const x = a[primaryKey];
    const y = b[primaryKey];
    const nx = Number(x);
    const ny = Number(y);
    if (Number.isFinite(nx) && Number.isFinite(ny)) return nx - ny;
    return String(x).localeCompare(String(y));
  };
}

/** The ToC row that labels an id: active first when the source reads `is_active`, then the lowest primary key. */
function pickTocRow(
  source: TocSource,
  primaryKey: string,
  candidates: readonly SqlRow[],
): SqlRow {
  const activeFirst = source.columns.includes('is_active');
  const order = byPrimaryKey(primaryKey);
  return [...candidates].sort((a, b) => {
    if (activeFirst) {
      const rank =
        Number(!isActive(a.is_active)) - Number(!isActive(b.is_active));
      if (rank !== 0) return rank;
    }
    return order(a, b);
  })[0];
}

/** One statement's worth of lists: what it reads and how it fills `out` once its rows are back. */
type Job = () => Promise<void>;

export async function resolveLabels(
  union: LabelPairs,
  ctx: LabelContext,
): Promise<ResolvedLabels> {
  const result: ResolvedLabels = new Map();
  const jobs: Job[] = [];

  const outOf = (list: string): Out => {
    let out = result.get(list);
    if (!out) result.set(list, (out = new Map()));
    return out;
  };
  const tables = new Map<
    string,
    Array<{ list: string; source: TableSource }>
  >();
  const chains = new Map<
    string,
    Array<{ list: string; source: ChainedSource }>
  >();
  const tocs = new Map<
    string,
    {
      schema: string;
      table: string;
      primaryKey: string;
      lists: Array<{ list: string; source: TocSource }>;
    }
  >();

  for (const [list, ids] of union) {
    if (ids.size === 0) continue;
    if (!has(LABEL_SOURCES, list)) fail(list, 'has no label source');
    const source = LABEL_SOURCES[list];
    switch (source.kind) {
      case 'constant': {
        const out = outOf(list);
        for (const id of ids) {
          out.set(id, has(source.labels, id) ? source.labels[id] : null);
        }
        break;
      }
      case 'table': {
        const key = JSON.stringify([source.table, source.keyColumn]);
        tables.set(key, [...(tables.get(key) ?? []), { list, source }]);
        break;
      }
      case 'chained': {
        const key = JSON.stringify([
          source.table,
          source.keyColumn,
          source.next.table,
          source.next.keyColumn,
          source.next.via,
        ]);
        chains.set(key, [...(chains.get(key) ?? []), { list, source }]);
        break;
      }
      case 'toc': {
        // resolved before any statement runs: an unavailable ToC schema fails the batch, it never yields `null` labels (P-6)
        const resolved = resolveTocLabelSource(source.source, ctx.env);
        if (!resolved?.schema)
          fail(list, 'reads a source that is not available');
        const key = JSON.stringify([
          resolved.schema,
          resolved.table,
          source.matchColumns,
        ]);
        const group = tocs.get(key) ?? {
          schema: resolved.schema,
          table: resolved.table,
          primaryKey: resolved.primaryKey,
          lists: [],
        };
        group.lists.push({ list, source });
        tocs.set(key, group);
        break;
      }
    }
  }

  const idsOf = (lists: Array<{ list: string }>): string[] => [
    ...new Set(lists.flatMap(({ list }) => [...(union.get(list) ?? [])])),
  ];

  for (const lists of tables.values()) {
    const { table, keyColumn } = lists[0].source;
    jobs.push(async () => {
      const rows = await ctx.run({
        table,
        select: unique([keyColumn], ...lists.map((l) => l.source.columns)),
        where: [{ op: 'any_in', columns: [keyColumn], values: idsOf(lists) }],
        orderBy: keyColumn,
      });
      const index = indexRows(rows, [keyColumn]);
      for (const { list, source } of lists) {
        const out = outOf(list);
        for (const id of union.get(list) ?? []) {
          // a constant override wins over the row, found or not (type 9); the statement is still issued (R-7)
          const override = source.overrides?.labels;
          const row = index.get(keyOf(id))?.[0];
          out.set(
            id,
            override && has(override, id)
              ? override[id]
              : row
                ? source.compose(row as LabelRow)
                : null,
          );
        }
      }
    });
  }

  for (const lists of chains.values()) {
    const { table, keyColumn, next } = lists[0].source;
    jobs.push(async () => {
      const first = await ctx.run({
        table,
        select: unique([keyColumn], ...lists.map((l) => l.source.columns), [
          next.via,
        ]),
        where: [{ op: 'any_in', columns: [keyColumn], values: idsOf(lists) }],
        orderBy: keyColumn,
      });
      const firstIndex = indexRows(first, [keyColumn]);
      const via = [
        ...new Set(
          first
            .map((r) => r[next.via])
            .filter(
              (v): v is string | number =>
                typeof v === 'string' || typeof v === 'number',
            ),
        ),
      ];
      // no first-hop row carries a foreign key: nothing to follow (`IN ()` is never issued)
      const second =
        via.length === 0
          ? []
          : await ctx.run({
              table: next.table,
              select: unique([next.keyColumn], next.columns),
              where: [{ op: 'any_in', columns: [next.keyColumn], values: via }],
              orderBy: next.keyColumn,
            });
      const secondIndex = indexRows(second, [next.keyColumn]);
      for (const { list, source } of lists) {
        const out = outOf(list);
        for (const id of union.get(list) ?? []) {
          const hop = firstIndex.get(keyOf(id))?.[0];
          const fk = hop?.[next.via];
          const row =
            fk === null || fk === undefined
              ? undefined
              : secondIndex.get(keyOf(fk))?.[0];
          out.set(id, row ? source.compose(row as LabelRow) : null);
        }
      }
    });
  }

  for (const group of tocs.values()) {
    const { schema, table, primaryKey, lists } = group;
    const matchColumns = lists[0].source.matchColumns;
    jobs.push(async () => {
      const rows = await ctx.run({
        schema,
        table,
        select: unique(
          [primaryKey],
          matchColumns,
          ...lists.map((l) => l.source.columns),
        ),
        where: [
          { op: 'any_in', columns: [...matchColumns], values: idsOf(lists) },
        ],
        orderBy: primaryKey,
      });
      const index = indexRows(rows, matchColumns);
      for (const { list, source } of lists) {
        const out = outOf(list);
        for (const id of union.get(list) ?? []) {
          const candidates = index.get(keyOf(id));
          out.set(
            id,
            candidates?.length
              ? source.compose(
                  pickTocRow(source, primaryKey, candidates) as LabelRow,
                )
              : null,
          );
        }
      }
    });
  }

  await Promise.all(jobs.map((job) => job()));
  return result;
}
