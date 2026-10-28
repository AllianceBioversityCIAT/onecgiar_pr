// @akili-spec quality-assurance/qa-results-feed
// QRF-DD-6 / §8: runs the read plans of a batch (bounded concurrency) and merges what the column and relation
// resolvers return. Every result gets every planned field (null / [] fill); `deferred` lists what path and lookup
// resolvers (QRF-T-4/T-5) still have to add. Fields that do not apply to a result's type are the caller's to drop.
import { CatalogField } from '../definitions/types';
import { resolveColumnPlan } from './column.resolver';
import {
  DeferredBinding,
  PlanQueryRunner,
  ReadPlan,
  buildReadPlans,
} from './read-plan';
import { resolveRelationPlan } from './relation.resolver';
import { TableKeys } from './table-metadata';

/** Plans of one batch that may run at once on the shared pool (design §8). */
export const READ_CONCURRENCY = 4;

export interface ReadContext {
  run: PlanQueryRunner;
  keys: TableKeys;
  concurrency?: number;
}

export interface BaseValues {
  values: Map<number, Record<string, unknown>>;
  deferred: DeferredBinding[];
}

export async function mapBounded<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker),
  );
  return results;
}

function resolve(plan: ReadPlan, ids: number[], run: PlanQueryRunner) {
  return plan.kind === 'column'
    ? resolveColumnPlan(plan, ids, run)
    : resolveRelationPlan(plan, ids, run);
}

export async function readBaseValues(
  fields: CatalogField[],
  resultIds: number[],
  ctx: ReadContext,
): Promise<BaseValues> {
  const ids = [...new Set(resultIds)];
  const { plans, deferred } = buildReadPlans(fields, ctx.keys);
  const values = new Map<number, Record<string, unknown>>(
    ids.map((id) => [id, {}]),
  );
  if (ids.length === 0) return { values, deferred };

  const resolved = await mapBounded(
    plans,
    ctx.concurrency ?? READ_CONCURRENCY,
    (plan) => resolve(plan, ids, ctx.run),
  );
  for (const byResult of resolved) {
    for (const [id, own] of byResult) Object.assign(values.get(id), own);
  }
  return { values, deferred };
}
