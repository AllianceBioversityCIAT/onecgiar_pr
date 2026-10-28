// @akili-spec quality-assurance/qa-results-feed
// QRF-DD-6 / QRF-DD-7: bindings -> read plans. A plan is ONE statement per (table, filter, element kind), whatever the
// number of fields it serves or of results it reads: `WHERE <result key> IN (<result ids>)`.
//  - `column` bindings on the same table share one plan (a top-level column field reads the result's row of `result` or of
//    one per-type table);
//  - `relation` bindings with the same table, result foreign key and filter share one plan that returns the element
//    primary key, every value column and every subfield `column` (a subfield `column` is read from the element row).
// `path` and `lookup` bindings are not planned here: they come back as `deferred` for the later resolvers (QRF-T-4/T-5),
// which start from the element rows these plans read.
import {
  CatalogField,
  CatalogSubField,
  RelationBinding,
} from '../definitions/types';
import { stableStringify } from '../definitions/content-hash';
import { TableKeys, Temporal } from './table-metadata';
import { ScalarFieldType, isScalarType } from './value-typing';

export type SqlRow = Record<string, unknown>;

/** A WHERE term. `in` is added by `planQuery`; `eq` / `is_null` come from a relation's equality `filter`. */
export type Predicate =
  | { column: string; op: 'in'; values: number[] }
  | { column: string; op: 'eq'; value: string | number }
  | { column: string; op: 'is_null' };

/** The one statement of a plan, as data. Table and column names come from catalog bindings (code), never from input. */
export interface PlanQuery {
  table: string;
  select: string[];
  where: Predicate[];
  orderBy: string;
}

/** The seam to the database: specs pass a function over fixture rows, production passes `dataSourceRunner(dataSource)`. */
export type PlanQueryRunner = (query: PlanQuery) => Promise<SqlRow[]>;

/** One scalar cell the plan reads and how to type it (QRF-DD-9). */
export interface CellRead {
  column: string;
  type: ScalarFieldType;
  temporal: Temporal;
}

export interface ColumnFieldRead extends CellRead {
  fieldKey: string;
}

/** A subfield `column`, read from the element row and keyed by the subfield's catalog key. */
export interface ElementColumnRead extends CellRead {
  subfieldKey: string;
}

export interface RelationFieldRead {
  fieldKey: string;
  fieldType: CatalogField['type'];
  /** The element's value; a row whose value is NULL is not an element (catalog DD-13). */
  value: CellRead;
  /** Subfield columns, in catalog order; only for `list` / `object`. */
  columns: ElementColumnRead[];
}

interface PlanBase {
  table: string;
  /** Element identity (QRF-DD-7): the table's single-column primary key. */
  primaryKey: string;
  /** The column that holds the result id. */
  keyColumn: string;
}

export interface ColumnReadPlan extends PlanBase {
  kind: 'column';
  fields: ColumnFieldRead[];
}

export interface RelationReadPlan extends PlanBase {
  kind: 'relation';
  /** Equality terms of the relation's `filter` (rows failing them are not elements). */
  filter: Predicate[];
  fields: RelationFieldRead[];
}

/** New binding kinds join this union (the lookup and path resolvers of QRF-T-4/T-5 add theirs). */
export type ReadPlan = ColumnReadPlan | RelationReadPlan;

/** A binding no plan here reads: the field (or subfield path under it) is left to a later resolver. */
export interface DeferredBinding {
  fieldKey: string;
  /** Subfield keys from the field down to the deferred subfield; empty = the field itself. */
  subfieldPath: string[];
  kind: 'path' | 'lookup';
}

export interface ReadPlanSet {
  plans: ReadPlan[];
  deferred: DeferredBinding[];
}

function fail(fieldKey: string, why: string): never {
  // Catalog keys are public; table and column names never go in an error (QRF-R-9).
  throw new Error(`value reader: field ${fieldKey} ${why}`);
}

export function filterPredicates(
  filter: RelationBinding['filter'],
): Predicate[] {
  return Object.entries(filter ?? {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([column, value]): Predicate => {
      if (value === null) return { column, op: 'is_null' };
      return {
        column,
        op: 'eq',
        value: typeof value === 'boolean' ? (value ? 1 : 0) : value,
      };
    });
}

function cellOf(
  keys: TableKeys,
  table: string,
  column: string,
  type: CatalogField['type'],
  ownerKey: string,
): CellRead {
  if (!isScalarType(type)) fail(ownerKey, `reads a ${type} from one column`);
  return { column, type, temporal: keys.temporal(table, column) };
}

function elementColumns(
  keys: TableKeys,
  field: CatalogField,
  table: string,
  deferred: DeferredBinding[],
): ElementColumnRead[] {
  const out: ElementColumnRead[] = [];
  for (const sub of field.subfields ?? ([] as CatalogSubField[])) {
    if (sub.storage.kind === 'column') {
      if (sub.storage.table !== table) {
        fail(
          field.key,
          `has a subfield column on another table than its element`,
        );
      }
      out.push({
        subfieldKey: sub.key,
        ...cellOf(
          keys,
          table,
          sub.storage.column,
          sub.type,
          `${field.key}.${sub.key}`,
        ),
      });
    } else {
      deferred.push({
        fieldKey: field.key,
        subfieldPath: [sub.key],
        kind: sub.storage.kind,
      });
    }
  }
  return out;
}

/**
 * Groups the bindings of `fields` (already narrowed to one phase year and the batch's result types by the caller) into
 * read plans. The result does not depend on how many results will be read: that is the point of QRF-DD-6.
 */
export function buildReadPlans(
  fields: CatalogField[],
  keys: TableKeys,
): ReadPlanSet {
  const columnPlans = new Map<string, ColumnReadPlan>();
  const relationPlans = new Map<string, RelationReadPlan>();
  const deferred: DeferredBinding[] = [];

  for (const field of fields) {
    const binding = field.storage;
    if (binding.kind === 'column') {
      let plan = columnPlans.get(binding.table);
      if (!plan) {
        plan = {
          kind: 'column',
          table: binding.table,
          primaryKey: keys.primaryKey(binding.table),
          keyColumn: keys.resultKey(binding.table),
          fields: [],
        };
        columnPlans.set(binding.table, plan);
      }
      plan.fields.push({
        fieldKey: field.key,
        ...cellOf(keys, binding.table, binding.column, field.type, field.key),
      });
    } else if (binding.kind === 'relation') {
      const filter = filterPredicates(binding.filter);
      const group = `${binding.table}|${binding.fk_to_result}|${stableStringify(filter)}`;
      let plan = relationPlans.get(group);
      if (!plan) {
        plan = {
          kind: 'relation',
          table: binding.table,
          primaryKey: keys.primaryKey(binding.table),
          keyColumn: binding.fk_to_result,
          filter,
          fields: [],
        };
        relationPlans.set(group, plan);
      }
      // QRF-R-7 gives a scalar-typed field (even one with subfields) the shape of its type: the value only.
      const withSubfields = field.type === 'list' || field.type === 'object';
      plan.fields.push({
        fieldKey: field.key,
        fieldType: field.type,
        value: cellOf(
          keys,
          binding.table,
          binding.value_column,
          // the element value of a list / multi_select is an id or a scalar; its type is the value column's, read as a select id
          withSubfields || field.type === 'multi_select'
            ? 'single_select'
            : field.type,
          field.key,
        ),
        columns: withSubfields
          ? elementColumns(keys, field, binding.table, deferred)
          : [],
      });
    } else {
      deferred.push({
        fieldKey: field.key,
        subfieldPath: [],
        kind: binding.kind,
      });
    }
  }

  return {
    plans: [...columnPlans.values(), ...relationPlans.values()],
    deferred,
  };
}

/** Columns a plan selects: identity, result key, then every value and subfield column once. */
export function planColumns(plan: ReadPlan): string[] {
  const columns = new Set<string>([plan.primaryKey, plan.keyColumn]);
  if (plan.kind === 'column') {
    plan.fields.forEach((f) => columns.add(f.column));
  } else {
    plan.fields.forEach((f) => {
      columns.add(f.value.column);
      f.columns.forEach((c) => columns.add(c.column));
    });
  }
  return [...columns];
}

/** The plan's statement for a batch of result ids; always one statement, ordered by the table's primary key. */
export function planQuery(plan: ReadPlan, resultIds: number[]): PlanQuery {
  return {
    table: plan.table,
    select: planColumns(plan),
    where: [
      { column: plan.keyColumn, op: 'in', values: resultIds },
      ...(plan.kind === 'relation' ? plan.filter : []),
    ],
    orderBy: plan.primaryKey,
  };
}

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

function ident(name: string): string {
  if (!IDENTIFIER.test(name))
    throw new Error('value reader: invalid identifier');
  return `\`${name}\``;
}

/** Parameterized SQL for a plan query; values are bound, identifiers are checked and quoted. */
export function renderPlanSql(query: PlanQuery): {
  sql: string;
  params: unknown[];
} {
  const params: unknown[] = [];
  const terms = query.where.map((p) => {
    switch (p.op) {
      case 'in':
        params.push(...p.values);
        return `${ident(p.column)} IN (${p.values.map(() => '?').join(', ')})`;
      case 'eq':
        params.push(p.value);
        return `${ident(p.column)} = ?`;
      case 'is_null':
        return `${ident(p.column)} IS NULL`;
    }
  });
  const sql =
    `SELECT ${query.select.map(ident).join(', ')} FROM ${ident(query.table)}` +
    ` WHERE ${terms.join(' AND ')} ORDER BY ${ident(query.orderBy)} ASC`;
  return { sql, params };
}

/** Production runner over anything with TypeORM's `query(sql, parameters)` (a `DataSource`, a `QueryRunner`). */
export function dataSourceRunner(source: {
  query(sql: string, parameters?: unknown[]): Promise<unknown>;
}): PlanQueryRunner {
  return async (query) => {
    const { sql, params } = renderPlanSql(query);
    return (await source.query(sql, params)) as SqlRow[];
  };
}
