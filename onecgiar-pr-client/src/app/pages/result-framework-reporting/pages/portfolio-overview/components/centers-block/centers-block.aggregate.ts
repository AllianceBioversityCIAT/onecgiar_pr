import { buildStatusModel } from '../../../../../bilateral/pages/bilateral-overview/bilateral-overview.aggregate';
import { BilateralCenterResult } from '../../../../../bilateral/services/bilateral-center-result.interface';

/**
 * P2-3858 — pure aggregation of the CGIAR Centers block (moved from Admin › All P/As and Centers into
 * the Portfolio overview by P2-3928). Each row repeats the numbers of the Center's own Overview, never a
 * re-derivation of them: the four tiles of the Center Overview (Editing · Pending review · Approved ·
 * Rejected), computed with that page's own `buildStatusModel` over `bilateral-center-results`.
 */
export const CENTER_STATUS_IDS = [1, 5, 6, 7] as const;

export interface EntityOverviewRow {
  code: string;
  name: string;
  link: string;
  total: number;
  /** Count per status id, in the order of the table's columns. */
  counts: number[];
}

export function buildCenterRow(code: string, acronym: string, rows: readonly BilateralCenterResult[]): EntityOverviewRow {
  const tiles = buildStatusModel(rows).tiles;
  const countFor = (id: number) => tiles.find(tile => tile.statusIds.includes(id))?.count ?? 0;
  return {
    code,
    name: acronym,
    link: `/bilateral/${encodeURIComponent(acronym)}/overview`,
    total: rows.length,
    counts: CENTER_STATUS_IDS.map(countFor)
  };
}

/** Column-wise sum of the loaded rows (rows still loading or failed are passed in as absent). */
export function sumRows(rows: readonly EntityOverviewRow[], columns: number): { total: number; counts: number[] } {
  const counts = new Array(columns).fill(0);
  let total = 0;
  for (const row of rows) {
    total += row.total;
    row.counts.forEach((count, index) => (counts[index] += count));
  }
  return { total, counts };
}
