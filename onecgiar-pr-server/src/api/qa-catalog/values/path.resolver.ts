// @akili-spec quality-assurance/qa-results-feed
// QRF-DD-6 / QRF-DD-7 for `path` bindings (catalog DD-12 / DD-13). A path starts at the PARENT element's row (the
// `result` row for a top-level field, the parent's last-step row for a subfield) and follows `steps`; every `join` pair
// of a step must hold, `filter` is equality, `pick` keeps the first row per parent row. One SELECT per step reads the
// whole batch (`IN` over the first pair's values; the remaining pairs are matched here). Bindings that share their
// `steps` share the traversal and read the union of their columns (DD-6). Shapes follow QRF-R-7 / DD-9, built key by
// key from the catalog.
import {
  CatalogField,
  CatalogFieldType,
  CatalogSubField,
  PathBinding,
  PathStep,
} from '../definitions/types';
import { stableStringify } from '../definitions/content-hash';
import {
  DeferredBinding,
  ELEMENT_ROWS,
  PlanQueryRunner,
  SqlRow,
  filterPredicates,
  readStage,
} from './read-plan';
import { TableKeys } from './table-metadata';
import { emptyValue, isScalarType, typeScalar } from './value-typing';

export interface PathContext {
  run: PlanQueryRunner;
  keys: TableKeys;
  /** Table the top-level paths start from (default `result`). */
  resultTable?: string;
}

/** A row a path starts from; `id` is its identity (the result id, or the element's primary key). */
export interface PathStart {
  id: number;
  row: SqlRow;
}

export interface PathValues {
  values: Map<number, Record<string, unknown>>;
  /** `lookup` subfields reached under a path field: left to the lookup resolver (QRF-T-5). */
  deferred: DeferredBinding[];
}

function joinKey(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) {
    throw new Error('path resolver: a join key is not numeric');
  }
  return n;
}

function sortable(value: unknown): number | string {
  if (value === null || value === undefined) return -Infinity;
  if (value instanceof Date) return value.getTime();
  return typeof value === 'number' ? value : String(value);
}

function pickFirst(rows: SqlRow[], step: PathStep, pk: string): SqlRow[] {
  if (!step.pick || rows.length < 2) return rows;
  const { order_by, direction } = step.pick;
  const sign = direction === 'desc' ? -1 : 1;
  const best = [...rows].sort((a, b) => {
    const x = sortable(a[order_by]);
    const y = sortable(b[order_by]);
    if (x !== y) return (x < y ? -1 : 1) * sign;
    return Number(a[pk]) - Number(b[pk]);
  })[0];
  return [best];
}

/**
 * Follows `steps` from `starts` and returns, per start id, the rows of the LAST step (primary-key order, no duplicates).
 * `extraColumns` are columns of the last table the caller also needs. Exposed so the reader can start a subfield
 * path of a `relation` element from that element's row (QRF-T-6).
 */
export async function followPath(
  steps: PathStep[],
  starts: PathStart[],
  ctx: PathContext,
  extraColumns: string[] = [],
): Promise<Map<number, SqlRow[]>> {
  let current = new Map<number, SqlRow[]>(starts.map((s) => [s.id, [s.row]]));
  for (const [index, step] of steps.entries()) {
    const pk = ctx.keys.primaryKey(step.table);
    const first = step.join[0];
    const wanted = new Set<number>();
    for (const rows of current.values()) {
      for (const row of rows) {
        const key = joinKey(row[first.from]);
        if (key !== null) wanted.add(key);
      }
    }
    const next = steps[index + 1];
    const select = new Set<string>([pk, ...step.join.map((j) => j.to)]);
    if (step.pick) select.add(step.pick.order_by);
    (next ? next.join.map((j) => j.from) : extraColumns).forEach((c) =>
      select.add(c),
    );
    const found =
      wanted.size === 0
        ? []
        : await ctx.run({
            table: step.table,
            select: [...select],
            where: [
              { column: first.to, op: 'in', values: [...wanted] },
              ...filterPredicates(step.filter),
            ],
            orderBy: pk,
          });

    const advanced = new Map<number, SqlRow[]>();
    for (const [startId, rows] of current) {
      const hits = new Map<number, SqlRow>();
      for (const row of rows) {
        // every pair of the join must hold (NULL never matches)
        const matches = found.filter((candidate) =>
          step.join.every((p) => {
            const from = joinKey(row[p.from]);
            return from !== null && from === joinKey(candidate[p.to]);
          }),
        );
        for (const hit of pickFirst(matches, step, pk)) {
          hits.set(Number(hit[pk]), hit);
        }
      }
      advanced.set(
        startId,
        [...hits.values()].sort((a, b) => Number(a[pk]) - Number(b[pk])),
      );
    }
    current = advanced;
  }
  return current;
}

/** One field or subfield read through a path; members of a group share `steps`. */
interface Member {
  id: string;
  fieldKey: string;
  subPath: string[];
  type: CatalogFieldType;
  subfields: CatalogSubField[];
  valueColumn: string;
}

function valueType(type: CatalogFieldType) {
  return isScalarType(type) ? type : 'single_select';
}

function notNull(row: SqlRow, column: string): boolean {
  return row[column] !== null && row[column] !== undefined;
}

async function resolveGroup(
  steps: PathStep[],
  members: Member[],
  starts: PathStart[],
  ctx: PathContext,
  deferred: DeferredBinding[],
): Promise<Map<string, Map<number, unknown>>> {
  const table = steps[steps.length - 1].table;
  const pk = ctx.keys.primaryKey(table);
  const temporal = (column: string) => ctx.keys.temporal(table, column);

  const extra = new Set<string>();
  const subGroups = new Map<string, { steps: PathStep[]; members: Member[] }>();
  const owners = new Map<string, Member>();
  for (const m of members) {
    extra.add(m.valueColumn);
    for (const sub of m.subfields) {
      const where = [...m.subPath, sub.key];
      if (sub.storage.kind === 'column') {
        if (sub.storage.table !== table) {
          throw new Error(
            `path resolver: field ${m.fieldKey} has a subfield column on another table than its element`,
          );
        }
        extra.add(sub.storage.column);
      } else if (sub.storage.kind === 'path') {
        // the subfield path starts at THIS member's element row (catalog DD-12), never at the result
        sub.storage.steps[0].join.forEach((j) => extra.add(j.from));
        const key = stableStringify(sub.storage.steps);
        const subMember: Member = {
          id: `${m.id}/${sub.key}`,
          fieldKey: m.fieldKey,
          subPath: where,
          type: sub.type,
          subfields: sub.subfields ?? [],
          valueColumn: sub.storage.value_column,
        };
        owners.set(subMember.id, m);
        const group = subGroups.get(key) ?? {
          steps: sub.storage.steps,
          members: [],
        };
        group.members.push(subMember);
        subGroups.set(key, group);
      } else {
        deferred.push({
          fieldKey: m.fieldKey,
          subfieldPath: where,
          kind: 'lookup',
        });
      }
    }
  }

  const rowsByStart = await followPath(steps, starts, ctx, [...extra]);
  const elementsOf = (m: Member, startId: number) =>
    (rowsByStart.get(startId) ?? []).filter((r) => notNull(r, m.valueColumn));

  const subValues = new Map<string, Map<number, unknown>>();
  for (const group of subGroups.values()) {
    const elements = new Map<number, PathStart>();
    for (const sm of group.members) {
      for (const startId of rowsByStart.keys()) {
        for (const row of elementsOf(owners.get(sm.id) as Member, startId)) {
          elements.set(Number(row[pk]), { id: Number(row[pk]), row });
        }
      }
    }
    const resolved = await resolveGroup(
      group.steps,
      group.members,
      [...elements.values()],
      ctx,
      deferred,
    );
    for (const [id, byElement] of resolved) subValues.set(id, byElement);
  }

  const out = new Map<string, Map<number, unknown>>();
  for (const m of members) {
    const typeOf = (row: SqlRow) =>
      typeScalar(valueType(m.type), row[m.valueColumn], {
        temporal: temporal(m.valueColumn),
      });
    const object = (row: SqlRow) => {
      const o: Record<string, unknown> = {};
      for (const sub of m.subfields) {
        if (sub.storage.kind === 'column') {
          o[sub.key] = isScalarType(sub.type)
            ? typeScalar(sub.type, row[sub.storage.column], {
                temporal: temporal(sub.storage.column),
              })
            : null;
        } else if (sub.storage.kind === 'path') {
          const mine = subValues.get(`${m.id}/${sub.key}`);
          o[sub.key] = mine?.has(Number(row[pk]))
            ? mine.get(Number(row[pk]))
            : emptyValue(sub.type);
        }
        // a `lookup` subfield is added by the lookup resolver (it is in `deferred`)
      }
      return o;
    };
    const scalarWithSubfields = isScalarType(m.type) && m.subfields.length > 0;

    const byStart = new Map<number, unknown>();
    for (const start of starts) {
      const elements = elementsOf(m, start.id);
      let value: unknown;
      if (m.type === 'multi_select') value = elements.map(typeOf);
      else if (m.type === 'list') value = elements.map(object);
      else if (elements.length === 0) {
        // a scalar with subfields still carries every key (QRF-R-7, amended 2026-10-28)
        value = scalarWithSubfields
          ? {
              value: null,
              ...Object.fromEntries(
                m.subfields.map((s) => [s.key, emptyValue(s.type)]),
              ),
            }
          : emptyValue(m.type);
      } else if (m.type === 'object') value = object(elements[0]);
      else if (scalarWithSubfields) {
        value = { value: typeOf(elements[0]), ...object(elements[0]) };
      } else value = typeOf(elements[0]);
      byStart.set(start.id, value);
    }
    out.set(m.id, byStart);
  }
  return out;
}

/**
 * Reads the top-level `path` fields of `fields` for a batch of results. Fields whose `steps` are equal share one
 * traversal; every result gets every field (null / [] when nothing is reached). Non-path fields are ignored.
 */
export async function resolvePathFields(
  fields: CatalogField[],
  resultIds: number[],
  ctx: PathContext,
): Promise<PathValues> {
  const ids = [...new Set(resultIds)];
  const values = new Map<number, Record<string, unknown>>(
    ids.map((id) => [id, {}]),
  );
  const deferred: DeferredBinding[] = [];
  const pathFields = fields.filter(
    (f): f is CatalogField & { storage: PathBinding } =>
      f.storage.kind === 'path',
  );
  if (ids.length === 0 || pathFields.length === 0) return { values, deferred };

  const table = ctx.resultTable ?? 'result';
  const idColumn = ctx.keys.resultKey(table);
  const select = new Set<string>([idColumn]);
  pathFields.forEach((f) =>
    f.storage.steps[0].join.forEach((j) => select.add(j.from)),
  );
  const resultRows = await readStage(
    pathFields.map((f) => f.key),
    () =>
      ctx.run({
        table,
        select: [...select],
        where: [{ column: idColumn, op: 'in', values: ids }],
        orderBy: idColumn,
      }),
  );
  const starts: PathStart[] = resultRows.map((row) => ({
    id: Number(row[idColumn]),
    row,
  }));

  const groups = new Map<string, typeof pathFields>();
  for (const f of pathFields) {
    const key = stableStringify(f.storage.steps);
    groups.set(key, [...(groups.get(key) ?? []), f]);
  }
  for (const group of groups.values()) {
    const resolved = await readStage(
      group.map((f) => f.key),
      () =>
        resolveGroup(
          group[0].storage.steps,
          group.map((f) => ({
            id: f.key,
            fieldKey: f.key,
            subPath: [],
            type: f.type,
            subfields: f.subfields ?? [],
            valueColumn: f.storage.value_column,
          })),
          starts,
          ctx,
          deferred,
        ),
    );
    for (const f of group) {
      const byStart = resolved.get(f.key) as Map<number, unknown>;
      for (const id of ids) {
        (values.get(id) as Record<string, unknown>)[f.key] = byStart.has(id)
          ? byStart.get(id)
          : emptyValue(f.type);
      }
    }
  }
  return { values, deferred };
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Subfield `path`s of a `relation` / `column` field's elements (the base plans leave them in `deferred` with a one-key
 * `subfieldPath`). A subfield path starts at ITS element's row, never at the result (catalog DD-12): each element object
 * is registered with its row by the base resolvers. Fills the elements in place; what it finds below (lookups) is pushed
 * onto `base.deferred` for the lookup resolver, which must run after this.
 */
export async function resolveElementPaths(
  fields: CatalogField[],
  base: {
    values: Map<number, Record<string, unknown>>;
    deferred: DeferredBinding[];
  },
  ctx: PathContext,
): Promise<void> {
  const wanted = base.deferred.filter(
    (d) => d.kind === 'path' && d.subfieldPath.length === 1,
  );
  for (const fieldKey of new Set(wanted.map((d) => d.fieldKey))) {
    const field = fields.find((f) => f.key === fieldKey);
    if (!field || field.storage.kind === 'path') continue;
    const table = field.storage.kind === 'lookup' ? null : field.storage.table;
    if (!table) continue;
    const pk = ctx.keys.primaryKey(table);

    const elements: Array<{
      object: Record<string, unknown>;
      start: PathStart;
    }> = [];
    for (const own of base.values.values()) {
      const value = own[field.key];
      for (const object of (Array.isArray(value) ? value : [value]).filter(
        isObject,
      )) {
        const row = ELEMENT_ROWS.get(object);
        if (row) elements.push({ object, start: { id: Number(row[pk]), row } });
      }
    }

    const groups = new Map<string, { steps: PathStep[]; members: Member[] }>();
    for (const d of wanted.filter((w) => w.fieldKey === fieldKey)) {
      const sub = (field.subfields ?? []).find(
        (s) => s.key === d.subfieldPath[0],
      );
      if (!sub || sub.storage.kind !== 'path') continue;
      const key = stableStringify(sub.storage.steps);
      const group = groups.get(key) ?? {
        steps: sub.storage.steps,
        members: [],
      };
      group.members.push({
        id: sub.key,
        fieldKey: field.key,
        subPath: [sub.key],
        type: sub.type,
        subfields: sub.subfields ?? [],
        valueColumn: sub.storage.value_column,
      });
      groups.set(key, group);
    }

    for (const group of groups.values()) {
      const resolved = await readStage(
        group.members.map((m) => m.fieldKey),
        () =>
          resolveGroup(
            group.steps,
            group.members,
            elements.map((e) => e.start),
            ctx,
            base.deferred,
          ),
      );
      for (const m of group.members) {
        const sub = (field.subfields ?? []).find((s) => s.key === m.id)!;
        const byElement = resolved.get(m.id);
        for (const { object, start } of elements) {
          object[m.id] = byElement?.has(start.id)
            ? byElement.get(start.id)
            : emptyValue(sub.type);
        }
      }
    }
  }
}
