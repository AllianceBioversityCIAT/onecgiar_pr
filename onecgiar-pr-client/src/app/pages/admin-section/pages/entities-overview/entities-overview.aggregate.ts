import { buildStatusModel } from '../../../bilateral/pages/bilateral-overview/bilateral-overview.aggregate';
import { BilateralCenterResult } from '../../../bilateral/services/bilateral-center-result.interface';

/**
 * P2-3858 — pure aggregation for Admin › All P/As and Centers. Each row repeats the numbers of the
 * entity's own Overview, never a re-derivation of them:
 * - Programs: the status slots of the Program Overview (Editing · Quality Assessed · Submitted ·
 *   Discontinued), read from `get/science-programs/progress` — the same call that Overview uses.
 * - Centers: the four tiles of the Center Overview (Editing · Pending review · Approved · Rejected),
 *   computed with that page's own `buildStatusModel` over `bilateral-center-results`.
 */
export const PROGRAM_STATUS_IDS = [1, 2, 3, 4] as const;
export const CENTER_STATUS_IDS = [1, 5, 6, 7] as const;

export interface EntityOverviewRow {
  code: string;
  name: string;
  link: string;
  total: number;
  /** Count per status id, in the order of the table's columns. */
  counts: number[];
}

interface ProgressStatus {
  statusId: number;
  count: number;
}

interface ProgressVersion {
  versionId?: number | null;
  totalResults?: number;
  statuses?: ProgressStatus[];
}

export interface ProgressProgram {
  initiativeCode: string;
  initiativeName?: string;
  initiativeShortName?: string;
  versions?: ProgressVersion[];
}

export function buildProgramRows(
  response: { mySciencePrograms?: ProgressProgram[]; otherSciencePrograms?: ProgressProgram[] } | null | undefined,
  versionId: number | null
): EntityOverviewRow[] {
  const programs = [...(response?.mySciencePrograms ?? []), ...(response?.otherSciencePrograms ?? [])];
  const seen = new Set<string>();
  return programs
    .filter(program => {
      if (!program?.initiativeCode || seen.has(program.initiativeCode)) return false;
      seen.add(program.initiativeCode);
      return true;
    })
    .map(program => {
      const versions = program.versions ?? [];
      // No phase resolved → the server already answered for the active one; take its latest version.
      const version = versionId === null ? (versions[0] ?? null) : (versions.find(v => Number(v.versionId) === versionId) ?? null);
      const byStatus = new Map<number, number>();
      for (const status of version?.statuses ?? []) byStatus.set(Number(status.statusId), Number(status.count) || 0);
      const counts = PROGRAM_STATUS_IDS.map(id => byStatus.get(id) ?? 0);
      return {
        code: program.initiativeCode,
        name: (program.initiativeShortName || program.initiativeName || '').trim(),
        link: `/result-framework-reporting/entity-details/${encodeURIComponent(program.initiativeCode)}/overview`,
        total: Number(version?.totalResults) || 0,
        counts
      };
    })
    .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: 'base' }));
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
