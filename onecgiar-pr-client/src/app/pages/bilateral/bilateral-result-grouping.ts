// @akili-spec changes/center-results-kpi-chips (CRK-T-3, CRK-R-1, CRK-R-2, CRK-R-4, CRK-DD-3)
import { BilateralCenterResult } from './services/bilateral-center-result.interface';

/**
 * One Results-table row: the NEWEST version's fields spread at the top level (so column sorting by
 * `result_code` / `title` / ... orders groups by the newest version, `CRK-R-4`) plus every version
 * of the same `result_code`, newest phase first.
 */
export type BilateralCenterResultGroup = BilateralCenterResult & {
  versions: BilateralCenterResult[];
};

/**
 * `is_replicated` arrives from a raw SQL `tinyint` (`0`/`1`/`null`) and may be a string or a
 * boolean after serialization (`CRK-R-2`). Only `1` / `'1'` / `true` count.
 */
export function isReplicatedRow(row: Pick<BilateralCenterResult, 'is_replicated'>): boolean {
  const value: unknown = row.is_replicated;
  return value === true || value === 1 || value === '1';
}

/**
 * Groups rows sharing a `result_code` (string/number tolerant) into one group each (`CRK-R-1`).
 * Never merges different codes. Callers MUST filter first and group after, so a phase filter
 * leaves single-version groups. Group order follows the first appearance of each code in `rows`;
 * `version_id` (phase id) is ordered numerically, descending; ties keep input order.
 */
export function groupCenterResults(rows: readonly BilateralCenterResult[]): BilateralCenterResultGroup[] {
  const byCode = new Map<string, BilateralCenterResult[]>();
  for (const row of rows) {
    const key = String(row.result_code);
    const bucket = byCode.get(key);
    if (bucket) bucket.push(row);
    else byCode.set(key, [row]);
  }

  return Array.from(byCode.values()).map(bucket => {
    const versions = [...bucket].sort((a, b) => Number(b.version_id) - Number(a.version_id));
    return { ...versions[0], versions };
  });
}
