// @akili-spec quality-assurance/qa-results-feed
// QRF-DD-6 / QRF-DD-7: bindings -> read plans. A plan is ONE statement per (table, filter, element kind), whatever the
// number of fields it serves or of results it reads: `WHERE <result key> IN (<result ids>)`.
//  - `column` bindings on the same table share one plan (a top-level column field reads the result's row of `result` or of
//    one per-type table);
//  - `relation` bindings with the same table, result foreign key and filter share one plan that returns the element
//    primary key, every value column and every subfield `column` (a subfield `column` is read from the element row).
// `path` and `lookup` bindings are not planned here: they come back as `deferred` for the later resolvers (QRF-T-4/T-5),
// which start from the element rows these plans read. A scalar field that declares subfields is planned like a list element
// (QRF-R-7 as amended 2026-10-28, DD-9): its value column AND its subfield columns come from the same row.
import {
  CatalogField,
  CatalogSubField,
  RelationBinding,
} from '../definitions/types';
import { stableStringify } from '../definitions/content-hash';
import { CLOSED_CONTROL_LISTS } from '../definitions/closed-control-lists';
import { TableKeys, Temporal } from './table-metadata';
import { ScalarFieldType, isScalarType } from './value-typing';

export type SqlRow = Record<string, unknown>;

/**
 * A WHERE term. `in` is added by `planQuery`; `eq` / `is_null` come from a relation's equality `filter`; `any_in` is the
 * lookup resolver's alternative keys (QRF-DD-8): the row matches when ANY of `columns` holds one of `values`.
 */
export type Predicate =
  | { column: string; op: 'in'; values: number[] }
  | { column: string; op: 'eq'; value: string | number }
  | { column: string; op: 'is_null' }
  | { op: 'any_in'; columns: string[]; values: Array<string | number> };

/** The one statement of a plan, as data. Table and column names come from catalog bindings (code), never from input. */
export interface PlanQuery {
  /** Database the table lives in, when it is not the connection's own (the ToC lookup sources, P-13). */
  schema?: string;
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

/** A subfield `column`, read from the element row and keyed by the subfield's catalog key. */
export interface ElementColumnRead extends CellRead {
  subfieldKey: string;
}

export interface ColumnFieldRead extends CellRead {
  fieldKey: string;
  /** A scalar field with subfields: its value is `{ value, <subfield key>: ... }`. */
  wrapped: boolean;
  columns: ElementColumnRead[];
  /** Columns the row must also carry for the subfield paths that start from it (QRF-T-6). */
  startColumns: string[];
}

export interface RelationFieldRead {
  fieldKey: string;
  fieldType: CatalogField['type'];
  /** The element's value; a row whose value is NULL is not an element (catalog DD-13). */
  value: CellRead;
  /** A scalar field with subfields: its value is `{ value, <subfield key>: ... }`. */
  wrapped: boolean;
  /** Subfield columns, in catalog order; only for `list` / `object` / a wrapped scalar. */
  columns: ElementColumnRead[];
  /** Columns the element row must also carry for the subfield paths that start from it (QRF-T-6). */
  startColumns: string[];
}

/**
 * The row each element object was built from, so a subfield `path` starts at ITS element's row (catalog DD-12).
 * Weak: it never outlives the values it describes, and nothing here reaches the response (projection is by catalog key).
 */
export const ELEMENT_ROWS = new WeakMap<object, SqlRow>();

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

/**
 * A read stage failed (design sections 7 and 9). It carries the catalog keys of the fields the stage serves and the CLASS of
 * the cause, nothing else: the driver text can hold SQL, tables, schemas, ids or values (QRF-R-9), so it is neither copied
 * nor chained. The service logs `fieldKeys` and answers a generic 500.
 */
export class PlanReadError extends Error {
  readonly causeName: string;

  constructor(
    readonly fieldKeys: string[],
    cause: unknown,
  ) {
    super('A read plan failed');
    this.name = 'PlanReadError';
    this.causeName =
      cause instanceof Error ? cause.constructor.name : typeof cause;
  }
}

/** Runs one stage of a read; whatever it throws leaves as a `PlanReadError` naming the stage's field keys. */
export async function readStage<T>(
  fieldKeys: Iterable<string>,
  read: () => Promise<T>,
): Promise<T> {
  try {
    return await read();
  } catch (cause) {
    throw new PlanReadError([...new Set(fieldKeys)], cause);
  }
}

function fail(fieldKey: string, why: string): never {
  // Catalog keys are public; table and column names never go in an error (QRF-R-9).
  throw new Error(`value reader: field ${fieldKey} ${why}`);
}

/** QRF-R-7 (amended): a scalar field that declares subfields is `{ value, <subfield key>: ... }`. */
function hasWrappedSubfields(field: CatalogField): boolean {
  return isScalarType(field.type) && (field.subfields?.length ?? 0) > 0;
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

/**
 * QRF-DD-13: a relation / path binding whose field (or subfield) names a CLOSED control list reads only the rows whose value
 * column is one of the list's ids, as one more term of the same batched SELECT (the ids are numeric constants of code, bound
 * as parameters). A field with no closed list adds nothing. This is how an answer-bound field reads only the answers to its
 * own question: `result_answers` rows carry the question id, and the question's options are the closed list.
 */
export function closedListPredicates(
  valueColumn: string,
  controlList: string | undefined,
): Predicate[] {
  if (controlList === undefined) return [];
  if (!Object.prototype.hasOwnProperty.call(CLOSED_CONTROL_LISTS, controlList))
    return [];
  return [
    {
      column: valueColumn,
      op: 'in',
      values: [...CLOSED_CONTROL_LISTS[controlList]],
    },
  ];
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
  startColumns: string[],
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
      if (sub.storage.kind === 'path') {
        sub.storage.steps[0].join.forEach((j) => startColumns.push(j.from));
      }
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
      const wrapped = hasWrappedSubfields(field);
      const startColumns: string[] = [];
      plan.fields.push({
        fieldKey: field.key,
        ...cellOf(keys, binding.table, binding.column, field.type, field.key),
        wrapped,
        columns: wrapped
          ? elementColumns(keys, field, binding.table, deferred, startColumns)
          : [],
        startColumns,
      });
    } else if (binding.kind === 'relation') {
      // QRF-DD-13: the closed list is part of the filter, so fields that share a table but not a list get their own plan
      const filter = [
        ...filterPredicates(binding.filter),
        ...closedListPredicates(binding.value_column, field.control_list),
      ];
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
      const wrapped = hasWrappedSubfields(field);
      const withSubfields =
        field.type === 'list' || field.type === 'object' || wrapped;
      const startColumns: string[] = [];
      plan.fields.push({
        fieldKey: field.key,
        fieldType: field.type,
        value: cellOf(
          keys,
          binding.table,
          binding.value_column,
          // the element value of a list / object / multi_select is an id or a scalar; its type is the value column's, read as a select id
          field.type === 'list' ||
            field.type === 'object' ||
            field.type === 'multi_select'
            ? 'single_select'
            : field.type,
          field.key,
        ),
        wrapped,
        columns: withSubfields
          ? elementColumns(keys, field, binding.table, deferred, startColumns)
          : [],
        startColumns,
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
    plan.fields.forEach((f) => {
      columns.add(f.column);
      f.columns.forEach((c) => columns.add(c.column));
      f.startColumns.forEach((c) => columns.add(c));
    });
  } else {
    plan.fields.forEach((f) => {
      columns.add(f.value.column);
      f.columns.forEach((c) => columns.add(c.column));
      f.startColumns.forEach((c) => columns.add(c));
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

// A database name comes from configuration and may carry `-` or `$`; it is quoted, and the value never enters an error.
const SCHEMA_NAME = /^[A-Za-z0-9_$-]+$/;

function qualified(query: PlanQuery): string {
  if (query.schema === undefined) return ident(query.table);
  if (!SCHEMA_NAME.test(query.schema))
    throw new Error('value reader: invalid identifier');
  return `\`${query.schema}\`.${ident(query.table)}`;
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
      case 'any_in': {
        const marks = p.values.map(() => '?').join(', ');
        p.columns.forEach(() => params.push(...p.values));
        return `(${p.columns.map((c) => `${ident(c)} IN (${marks})`).join(' OR ')})`;
      }
      case 'eq':
        params.push(p.value);
        return `${ident(p.column)} = ?`;
      case 'is_null':
        return `${ident(p.column)} IS NULL`;
    }
  });
  const sql =
    `SELECT ${query.select.map(ident).join(', ')} FROM ${qualified(query)}` +
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
