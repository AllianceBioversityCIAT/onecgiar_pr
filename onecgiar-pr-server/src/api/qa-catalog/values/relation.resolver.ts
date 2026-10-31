// @akili-spec quality-assurance/qa-results-feed
// QRF-DD-7: the elements of a relation field are the rows of its table that pass the plan's equality `filter` (in the
// query) and whose value column is NOT NULL (here: it is per field, and several fields share one plan), in primary-key
// order. QRF-R-7 shapes: multi_select -> ids, list -> objects keyed by subfield key, scalar types -> the first element's
// value; no element -> `[]` for multi_select / list and `null` for the rest. A scalar field with subfields (amended 2026-10-28)
// is `{ value, <subfield key>: ... }` built from its first element. Every element object is registered with its row, so a
// subfield `path` can start there (QRF-T-6).
import {
  ELEMENT_ROWS,
  ElementColumnRead,
  PlanQueryRunner,
  RelationFieldRead,
  RelationReadPlan,
  SqlRow,
  planQuery,
} from './read-plan';
import { emptyValue, isScalarType, typeScalar } from './value-typing';

function elementObject(
  row: SqlRow,
  columns: ElementColumnRead[],
): Record<string, unknown> {
  // Built key by key from the catalog (QRF-DD-9): nothing outside the subfields can appear.
  const out: Record<string, unknown> = {};
  for (const c of columns) {
    out[c.subfieldKey] = typeScalar(c.type, row[c.column], {
      temporal: c.temporal,
    });
  }
  return out;
}

function element(row: SqlRow, columns: ElementColumnRead[]) {
  const object = elementObject(row, columns);
  ELEMENT_ROWS.set(object, row);
  return object;
}

function fieldValue(field: RelationFieldRead, rows: SqlRow[]): unknown {
  const elements = rows.filter(
    (r) =>
      r[field.value.column] !== null && r[field.value.column] !== undefined,
  );
  const typeOf = (row: SqlRow) =>
    typeScalar(field.value.type, row[field.value.column], {
      temporal: field.value.temporal,
    });

  if (field.fieldType === 'multi_select') return elements.map(typeOf);
  if (field.fieldType === 'list') {
    return elements.map((r) => element(r, field.columns));
  }
  if (elements.length === 0) {
    if (!field.wrapped) return emptyValue(field.fieldType);
    return {
      value: null,
      ...Object.fromEntries(field.columns.map((c) => [c.subfieldKey, null])),
    };
  }
  if (field.fieldType === 'object') return element(elements[0], field.columns);
  if (!isScalarType(field.fieldType)) return null;
  if (!field.wrapped) return typeOf(elements[0]);
  const wrapped = {
    value: typeOf(elements[0]),
    ...elementObject(elements[0], field.columns),
  };
  ELEMENT_ROWS.set(wrapped, elements[0]);
  return wrapped;
}

export async function resolveRelationPlan(
  plan: RelationReadPlan,
  resultIds: number[],
  run: PlanQueryRunner,
): Promise<Map<number, Record<string, unknown>>> {
  const rows = await run(planQuery(plan, resultIds));
  const byResult = new Map<number, SqlRow[]>();
  for (const row of rows) {
    const resultId = Number(row[plan.keyColumn]);
    const list = byResult.get(resultId);
    if (list) list.push(row);
    else byResult.set(resultId, [row]);
  }

  const out = new Map<number, Record<string, unknown>>();
  for (const resultId of resultIds) {
    const own = byResult.get(resultId) ?? [];
    const values: Record<string, unknown> = {};
    for (const f of plan.fields) values[f.fieldKey] = fieldValue(f, own);
    out.set(resultId, values);
  }
  return out;
}
