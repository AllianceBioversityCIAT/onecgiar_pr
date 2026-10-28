// @akili-spec quality-assurance/qa-results-feed
// QRF-DD-8 / QRF-R-7: fills the `lookup` fields and subfields the base resolvers left in `deferred`, from values already
// read. Per binding: the key of each `keys` pair comes from the SIBLING subfield when the parent declares it, else from the
// top-level value of that catalog key; the pairs are ALTERNATIVES (any-of). Bindings that share (source, key columns,
// qualifiers) share ONE SELECT over the distinct keys of the whole batch. A qualifier `PHASE_YEAR` is the request's year;
// `match: 'year'` reads the column the repository's canonical way (`^YYYY-` -> its year, `^YYYY$` -> the number, else none,
// results-toc-results.repository.ts getIndicatorTargetCatalog) and is applied here, over the rows the SELECT returned.
// `pick` takes the first matching row in its order; without one, the first by primary key. One round only: a key that is
// itself a lookup value is not resolved. Errors name catalog keys only (QRF-R-9).
import { stableStringify } from '../definitions/content-hash';
import {
  CatalogField,
  CatalogSubField,
  LookupBinding,
  PHASE_YEAR,
} from '../definitions/types';
import { resolveLookupSource } from './lookup-sources';
import {
  DeferredBinding,
  PlanQuery,
  PlanQueryRunner,
  Predicate,
  SqlRow,
} from './read-plan';
import {
  ScalarFieldType,
  emptyValue,
  isScalarType,
  typeScalar,
} from './value-typing';
import { READ_CONCURRENCY, mapBounded } from './value-reader';

export interface LookupContext {
  run: PlanQueryRunner;
  /** The request's `phase_year`: what a `PHASE_YEAR` qualifier means. */
  phaseYear: number;
  concurrency?: number;
  /** Environment the source registry reads (default `process.env`); specs pass a literal. */
  env?: Record<string, string | undefined>;
}

type Values = Map<number, Record<string, unknown>>;
type Obj = Record<string, unknown>;

/** One deferred lookup, resolved against the catalog. */
interface Target {
  fieldKey: string;
  /** A lookup field of its own (not a subfield): its siblings are the result's top-level values. */
  topLevel: boolean;
  /** Subfield keys from the field down to the parent of the lookup subfield. */
  parentPath: string[];
  /** Key written: the subfield key, or the field key for a top-level lookup. */
  writeKey: string;
  /** Keys the parent declares as subfields: those are "siblings". */
  siblings: Set<string>;
  binding: LookupBinding;
  type: CatalogField['type'];
}

/** One place a value goes: the object that receives it and the key of each alternative. */
interface Site {
  target: Target;
  container: Obj;
  keys: Array<string | null>;
}

const isObj = (v: unknown): v is Obj =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

function fail(fieldKey: string, why: string): never {
  throw new Error(`lookup resolver: field ${fieldKey} ${why}`);
}

function targetOf(fields: CatalogField[], d: DeferredBinding): Target {
  const field = fields.find((f) => f.key === d.fieldKey);
  if (!field) fail(d.fieldKey, 'is not in the catalog');
  let node: CatalogField | CatalogSubField = field;
  const parentPath = d.subfieldPath.slice(0, -1);
  let siblings = new Set<string>();
  for (const key of d.subfieldPath) {
    siblings = new Set((node.subfields ?? []).map((s) => s.key));
    const next: CatalogSubField | undefined = (node.subfields ?? []).find(
      (s) => s.key === key,
    );
    if (!next) fail(d.fieldKey, 'has no such subfield');
    node = next;
  }
  if (node.storage.kind !== 'lookup') fail(d.fieldKey, 'is not a lookup');
  if (!isScalarType(node.type)) fail(d.fieldKey, 'looks up a non-scalar type');
  return {
    fieldKey: d.fieldKey,
    topLevel: d.subfieldPath.length === 0,
    parentPath,
    writeKey: d.subfieldPath.length ? d.subfieldPath.at(-1)! : d.fieldKey,
    siblings,
    binding: node.storage,
    type: node.type,
  };
}

function toArray(v: unknown): unknown[] {
  if (Array.isArray(v)) return v;
  return v === null || v === undefined ? [] : [v];
}

/** The objects `parentPath` reaches under a field's value (elements of a list, the object itself, a `{ value, … }`). */
function containersAt(value: unknown, parentPath: string[]): Obj[] {
  let level = toArray(value);
  for (const key of parentPath) {
    level = level.flatMap((c) => (isObj(c) ? toArray(c[key]) : []));
  }
  return level.filter(isObj);
}

/** A key as it is compared: a scalar becomes text; a `{ value, … }` is its value; anything else is no key. */
function keyText(raw: unknown): string | null {
  const v = isObj(raw) && 'value' in raw ? raw.value : raw;
  if (typeof v !== 'string' && typeof v !== 'number' && typeof v !== 'bigint') {
    return null;
  }
  const text = String(v);
  return text === '' ? null : text;
}

// the column collation is case-insensitive: compare the way the SELECT matched
const same = (a: unknown, b: string) =>
  a !== null && a !== undefined && String(a).toLowerCase() === b.toLowerCase();

/** The repository's canonical year of a stored target date (`getIndicatorTargetCatalog`). */
function canonicalYear(raw: unknown): number | null {
  if (raw instanceof Date) return raw.getFullYear();
  if (raw === null || raw === undefined) return null;
  const text = String(raw);
  if (/^[0-9]{4}-/.test(text)) return Number(text.slice(0, 4));
  return /^[0-9]{4}$/.test(text) ? Number(text) : null;
}

const sortable = (v: unknown): number | string =>
  v === null || v === undefined
    ? -Infinity
    : v instanceof Date
      ? v.getTime()
      : typeof v === 'number'
        ? v
        : String(v);

function collectSites(targets: Target[], values: Values): Site[] {
  const sites: Site[] = [];
  for (const own of values.values()) {
    for (const target of targets) {
      const containers = target.topLevel
        ? [own]
        : containersAt(own[target.fieldKey], target.parentPath);
      for (const container of containers) {
        const keys = target.binding.keys.map((k) =>
          keyText(
            target.siblings.has(k.from) ? container[k.from] : own[k.from],
          ),
        );
        sites.push({ target, container, keys });
      }
    }
  }
  return sites;
}

/** Targets that can share one SELECT: same source, same key columns, same qualifiers. */
const groupKey = (b: LookupBinding) =>
  stableStringify([b.source, b.keys.map((k) => k.to), b.qualifiers ?? []]);

interface Group {
  targets: Target[];
  sites: Site[];
}

function queryOf(group: Group, ctx: LookupContext): PlanQuery | null {
  const { binding, fieldKey } = group.targets[0];
  const source = resolveLookupSource(binding.source, ctx.env);
  if (!source) fail(fieldKey, 'reads a source that is not available');
  const distinct = new Set<string>();
  group.sites.forEach((s) => s.keys.forEach((k) => k && distinct.add(k)));
  if (distinct.size === 0) return null; // no key in the batch: nothing to read
  const select = new Set<string>([source.primaryKey]);
  const where: Predicate[] = [
    {
      op: 'any_in',
      columns: binding.keys.map((k) => k.to),
      values: [...distinct],
    },
  ];
  binding.keys.forEach((k) => select.add(k.to));
  for (const q of binding.qualifiers ?? []) {
    select.add(q.column);
    if (q.match === 'year') continue; // applied to the rows (canonical year read)
    const value = qualifierValue(q.equals, ctx);
    where.push({
      column: q.column,
      op: 'eq',
      value: typeof value === 'boolean' ? (value ? 1 : 0) : value,
    });
  }
  for (const t of group.targets) {
    select.add(t.binding.value_column);
    if (t.binding.pick) select.add(t.binding.pick.order_by);
  }
  return {
    schema: source.schema,
    table: source.table,
    select: [...select],
    where,
    orderBy: source.primaryKey,
  };
}

const qualifierValue = (
  equals: string | number | boolean,
  ctx: LookupContext,
) => (equals === PHASE_YEAR ? ctx.phaseYear : equals);

function valueOf(site: Site, rows: SqlRow[], ctx: LookupContext): unknown {
  const { binding, type, fieldKey } = site.target;
  const years = (binding.qualifiers ?? [])
    .filter((q) => q.match === 'year')
    .map((q) => ({
      column: q.column,
      year: Number(qualifierValue(q.equals, ctx)),
    }));
  if (years.some((y) => !Number.isFinite(y.year))) {
    fail(fieldKey, 'has a year qualifier that is not a year');
  }
  let hits = rows.filter(
    (row) =>
      binding.keys.some((k, i) => {
        const key = site.keys[i];
        return key !== null && same(row[k.to], key);
      }) && years.every((y) => canonicalYear(row[y.column]) === y.year),
  );
  if (binding.pick && hits.length > 1) {
    const { order_by, direction } = binding.pick;
    const sign = direction === 'desc' ? -1 : 1;
    // rows come in primary-key order and the sort is stable: equal orders keep the lowest key first
    hits = [...hits].sort((a, b) => {
      const x = sortable(a[order_by]);
      const y = sortable(b[order_by]);
      return x === y ? 0 : (x < y ? -1 : 1) * sign;
    });
  }
  return hits.length === 0
    ? emptyValue(type)
    : typeScalar(type as ScalarFieldType, hits[0][binding.value_column]);
}

/**
 * Adds the lookup values to `base.values` in place: for every deferred `lookup`, each element that carries it (or each
 * result, for a top-level lookup field) gets its key set — `null` when no key or no row matches. `fields` are the fields
 * the batch was read with. One SELECT per group of bindings, none when the batch holds no key.
 */
export async function resolveLookups(
  fields: CatalogField[],
  base: { values: Values; deferred: DeferredBinding[] },
  ctx: LookupContext,
): Promise<void> {
  const seen = new Set<string>();
  const targets: Target[] = [];
  for (const d of base.deferred) {
    if (d.kind !== 'lookup') continue;
    const id = stableStringify([d.fieldKey, d.subfieldPath]);
    if (seen.has(id)) continue;
    seen.add(id);
    targets.push(targetOf(fields, d));
  }
  if (targets.length === 0) return;

  const groups = new Map<string, Group>();
  for (const t of targets) {
    const key = groupKey(t.binding);
    const group = groups.get(key) ?? { targets: [], sites: [] };
    group.targets.push(t);
    groups.set(key, group);
  }
  for (const site of collectSites(targets, base.values)) {
    groups.get(groupKey(site.target.binding))?.sites.push(site);
  }

  const list = [...groups.values()];
  const rowsOf = await mapBounded(
    list,
    ctx.concurrency ?? READ_CONCURRENCY,
    async (group) => {
      const query = queryOf(group, ctx);
      return query ? ctx.run(query) : [];
    },
  );
  list.forEach((group, i) => {
    for (const site of group.sites) {
      site.container[site.target.writeKey] = valueOf(site, rowsOf[i], ctx);
    }
  });
}
