// @akili-spec quality-assurance/qa-results-feed
// QRF-R-7: a top-level `column` binding reads the result's row of `result` or of a per-type table (one row per result;
// when several match, the lowest primary key wins, as the plan orders by it). A result with no row holds `null`. A scalar
// field with subfields holds `{ value, <subfield key>: ... }` read from that same row (QRF-R-7 as amended 2026-10-28).
import {
  ColumnFieldRead,
  ColumnReadPlan,
  ELEMENT_ROWS,
  PlanQueryRunner,
  SqlRow,
  planQuery,
} from './read-plan';
import { typeScalar } from './value-typing';

function fieldValue(f: ColumnFieldRead, row: SqlRow | undefined): unknown {
  const value = row
    ? typeScalar(f.type, row[f.column], { temporal: f.temporal })
    : null;
  if (!f.wrapped) return value;
  // built key by key from the catalog (QRF-DD-9)
  const wrapped: Record<string, unknown> = { value };
  for (const c of f.columns) {
    wrapped[c.subfieldKey] = row
      ? typeScalar(c.type, row[c.column], { temporal: c.temporal })
      : null;
  }
  if (row) ELEMENT_ROWS.set(wrapped, row);
  return wrapped;
}

export async function resolveColumnPlan(
  plan: ColumnReadPlan,
  resultIds: number[],
  run: PlanQueryRunner,
): Promise<Map<number, Record<string, unknown>>> {
  const rows = await run(planQuery(plan, resultIds));
  const firstRow = new Map<number, Record<string, unknown>>();
  for (const row of rows) {
    const resultId = Number(row[plan.keyColumn]);
    if (!firstRow.has(resultId)) firstRow.set(resultId, row);
  }

  const out = new Map<number, Record<string, unknown>>();
  for (const resultId of resultIds) {
    const row = firstRow.get(resultId);
    const values: Record<string, unknown> = {};
    for (const f of plan.fields) values[f.fieldKey] = fieldValue(f, row);
    out.set(resultId, values);
  }
  return out;
}
