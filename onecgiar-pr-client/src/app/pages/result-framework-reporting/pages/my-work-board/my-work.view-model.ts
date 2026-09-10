// @akili-spec changes/my-work-board (MWB-T-2, MWB-T-10, MWB-R-2, R-3, R-5, R-11, design.md §5, §6.6)
// Pure — no Angular imports. `MyWorkBoardComponent`/`MyWorkBoardService` (T-3, T-4) are the only
// callers; everything here is a plain function of a `ProgrammeResultRow[]` (or of its output).
import { ProgrammeResultRow } from '../programme-results/services/programme-results.service';

/**
 * One board column key, in render order (`STATUS_COLUMN_MAP`, design.md §5).
 *
 * Vocabulary mirrors the Overview reporting-status meters: W1/W2 uses Editing · Submitted · In QA;
 * W3/Bilateral uses Editing · Pending review · Approved · Rejected. Each `status_id` maps to
 * exactly one column — no merged buckets.
 */
export type MyWorkColumnKey =
  | 'editing'
  | 'pending'
  | 'submitted'
  | 'inQa'
  | 'approved'
  | 'discontinued'
  | 'rejected'
  | 'other';

/** Which of the four visual groups a column belongs to (`MWB-R-2`). `done` renders expanded like
 *  `waiting`; only `closed` collapses to rails (`MWB-DD-8`). */
export type MyWorkColumnGroup = 'action' | 'waiting' | 'done' | 'closed';

/** The board's scope segment. Only `'mine'` ever feeds the tab badge (`MWB-R-1`, `MWB-R-3`). */
export type MyWorkScope = 'mine' | 'all';

/** `status_id` -> column key (`MWB-DD-1b`, the single vocabulary, design.md §5). */
export const STATUS_COLUMN_MAP: Readonly<Record<number, MyWorkColumnKey>> = Object.freeze({
  1: 'editing', // Editing
  8: 'editing', // Draft
  5: 'pending', // Pending Review
  3: 'submitted', // Submitted
  2: 'inQa', // Quality Assessed / In QA (W1/W2)
  6: 'approved', // Approved (W3/Bilateral)
  4: 'discontinued', // Discontinued
  7: 'rejected' // Rejected (W3/Bilateral)
});

/** Any `status_id` not in `STATUS_COLUMN_MAP` (including `null`) lands in the `Other` rail. */
export function columnForStatus(statusId: number | null | undefined): MyWorkColumnKey {
  if (statusId === null || statusId === undefined) return 'other';
  return STATUS_COLUMN_MAP[statusId] ?? 'other';
}

/** One column descriptor. Fixed render order — `groupByColumn` never reorders this list. */
export interface MyWorkColumnDef {
  key: MyWorkColumnKey;
  label: string;
  group: MyWorkColumnGroup;
}

/** Fixed column order (design.md §5). Labels match Overview W1/W2 + W3 status meters. */
export const MY_WORK_COLUMN_DEFS: readonly MyWorkColumnDef[] = Object.freeze([
  { key: 'editing', label: 'Editing', group: 'action' },
  { key: 'pending', label: 'Pending review', group: 'waiting' },
  { key: 'submitted', label: 'Submitted', group: 'waiting' },
  { key: 'inQa', label: 'In QA', group: 'done' },
  { key: 'approved', label: 'Approved', group: 'done' },
  { key: 'discontinued', label: 'Discontinued', group: 'closed' },
  { key: 'rejected', label: 'Rejected', group: 'closed' },
  { key: 'other', label: 'Other', group: 'closed' }
]);

/** A column descriptor with its ordered rows. */
export interface MyWorkColumn extends MyWorkColumnDef {
  rows: ProgrammeResultRow[];
}

/** Per-column + grand-total counts over the same rows `groupByColumn` was given. */
export interface MyWorkTotals {
  editing: number;
  pending: number;
  submitted: number;
  inQa: number;
  approved: number;
  discontinued: number;
  rejected: number;
  other: number;
  all: number;
}

/** Rows whose `phaseName` equals `label`. `null`/`''` is "no filter" — every row passes
 *  (`MWB-R-3`, same client-side phase model as the Results tab). */
export function filterByPhase(rows: ProgrammeResultRow[], label: string | null | undefined): ProgrammeResultRow[] {
  if (!label) return rows ?? [];
  return (rows ?? []).filter(row => row?.phaseName === label);
}

function completenessRatio(row: ProgrammeResultRow): number {
  const completeness = row?.completeness;
  if (!completeness || completeness.total <= 0) return -1;
  return completeness.complete / completeness.total;
}

function createdTime(row: ProgrammeResultRow): number {
  const time = row?.created ? new Date(row.created).getTime() : NaN;
  return Number.isFinite(time) ? time : 0;
}

/** Editing order (`MWB-R-5`): completeness ratio ascending, `null` first, ties by newest
 *  `created` first. Does not mutate the input. */
export function orderEditing(rows: ProgrammeResultRow[]): ProgrammeResultRow[] {
  return [...(rows ?? [])].sort((a, b) => {
    const ratioDiff = completenessRatio(a) - completenessRatio(b);
    if (ratioDiff !== 0) return ratioDiff;
    return createdTime(b) - createdTime(a);
  });
}

/** Every other column's order (`MWB-R-5`): newest `created` first. Does not mutate the input. */
export function orderByCreatedDesc(rows: ProgrammeResultRow[]): ProgrammeResultRow[] {
  return [...(rows ?? [])].sort((a, b) => createdTime(b) - createdTime(a));
}

/**
 * Buckets rows by `columnForStatus`, orders each bucket (`orderEditing` for Editing,
 * `orderByCreatedDesc` for the rest), and emits the seven fixed columns plus `other` only when it
 * is non-empty (`MWB-R-2`).
 */
export function groupByColumn(rows: ProgrammeResultRow[]): MyWorkColumn[] {
  const buckets: Record<MyWorkColumnKey, ProgrammeResultRow[]> = {
    editing: [],
    pending: [],
    submitted: [],
    inQa: [],
    approved: [],
    discontinued: [],
    rejected: [],
    other: []
  };

  for (const row of rows ?? []) {
    buckets[columnForStatus(row?.statusId)].push(row);
  }

  return MY_WORK_COLUMN_DEFS.filter(def => def.key !== 'other' || buckets.other.length > 0).map(def => ({
    ...def,
    rows: def.key === 'editing' ? orderEditing(buckets.editing) : orderByCreatedDesc(buckets[def.key])
  }));
}

/** How many of the given rows (meant to be the Editing column's rows) are at `n === m`
 *  (`MWB-R-11`, the "k ready to submit" header hint). A row with no completeness never counts. */
export function readyCount(rows: ProgrammeResultRow[]): number {
  return (rows ?? []).filter(row => {
    const completeness = row?.completeness;
    return !!completeness && completeness.total > 0 && completeness.complete === completeness.total;
  }).length;
}

/**
 * The tab badge's value for one load (`MWB-R-1`, `MWB-R-3` *Switch scope* — "BUT NOT change the
 * tab badge"). Only a **Mine** load can move the badge: `scope === 'all'` returns `null`, which
 * callers read as "no update — keep whatever the badge already shows," never as zero.
 */
export function badgeCount(columns: readonly MyWorkColumn[], scope: MyWorkScope): number | null {
  if (scope !== 'mine') return null;
  return columns.find(column => column.key === 'editing')?.rows.length ?? 0;
}

/** Per-column + grand-total counts (`MWB-R-2`). */
export function totals(rows: ProgrammeResultRow[]): MyWorkTotals {
  const counts: MyWorkTotals = {
    editing: 0,
    pending: 0,
    submitted: 0,
    inQa: 0,
    approved: 0,
    discontinued: 0,
    rejected: 0,
    other: 0,
    all: 0
  };
  for (const row of rows ?? []) {
    counts[columnForStatus(row?.statusId)]++;
    counts.all++;
  }
  return counts;
}

/**
 * The phase select's default (design.md §6.6, same family as the Results tab): the URL label when
 * it names a loaded option; else the current reporting phase name when it names a loaded option;
 * else the newest option (`options[0]`, assumed newest-first as `phaseOptions` already sorts it).
 * `null` when there are no options at all (nothing loaded yet).
 */
export function resolveDefaultPhase(
  options: readonly string[],
  currentPhaseName: string | null | undefined,
  urlLabel: string | null | undefined
): string | null {
  if (urlLabel && options.includes(urlLabel)) return urlLabel;
  if (currentPhaseName && options.includes(currentPhaseName)) return currentPhaseName;
  return options[0] ?? null;
}
