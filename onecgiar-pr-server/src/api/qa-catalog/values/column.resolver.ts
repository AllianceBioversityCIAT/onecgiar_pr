// @akili-spec quality-assurance/qa-results-feed
// QRF-R-7: a top-level `column` binding reads the result's row of `result` or of a per-type table (one row per result;
// when several match, the lowest primary key wins, as the plan orders by it). A result with no row holds `null`.
import { ColumnReadPlan, PlanQueryRunner, planQuery } from './read-plan';
import { typeScalar } from './value-typing';

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
    for (const f of plan.fields) {
      values[f.fieldKey] = row
        ? typeScalar(f.type, row[f.column], { temporal: f.temporal })
        : null;
    }
    out.set(resultId, values);
  }
  return out;
}
