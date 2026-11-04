import { buildStatusModel } from '../../../../../bilateral/pages/bilateral-overview/bilateral-overview.aggregate';
import { BilateralCenterResult } from '../../../../../bilateral/services/bilateral-center-result.interface';
import { DimensionIndex, FilterRow, PortfolioFilterSelection, isActive, matchesRow } from '../../services/portfolio-filters';

/**
 * P2-3858 — pure aggregation of the CGIAR Centers block (moved from Admin › All P/As and Centers into
 * the Portfolio overview by P2-3928). Rows are W3 (bilateral) only (CNR-1: the caller drops W1/W2), deduped by result id across Centers (PCA-R-4). It still
 * uses that page's `buildStatusModel` for the four status tiles (Editing · Pending review · Approved ·
 * Rejected) over the rows it is given.
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

/**
 * PCA-R-4 — one row per result. A result linked to several Centers arrives once per Center with the same id,
 * status and origin, so the first one wins. Rows without an id cannot be matched and are all kept.
 */
export function dedupeById(rows: readonly BilateralCenterResult[]): BilateralCenterResult[] {
  const seen = new Set<number | string>();
  return rows.filter(row => {
    const id = row.id;
    if (id === null || id === undefined) return true;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

/** CNR-1 — W3 (bilateral) rows are exactly those that came from the API (CNR-P-1). */
export function isW3Row(row: BilateralCenterResult): boolean {
  return row.source === 'API';
}

/**
 * @akili-spec changes/portfolio-overview-feedback-round/cleanup-and-approved PCA-DD-6
 * The deck counts only W3 results with an active lead Program/Accelerator; the Centers feed does not. `submitter` is the lead's
 * official code (role 1); it matches the deck rule (no `ci.active` in its SQL) only while no lead is inactive or blank (checked on v36).
 */
export function hasLeadProgram(row: BilateralCenterResult): boolean {
  return typeof row.submitter === 'string' && row.submitter.trim() !== '';
}

/**
 * CNR-2 — `is_replicated` arrives as a MySQL tinyint, a string or a boolean, and may be null (CNR-P-2).
 * Only `1`, `'1'` and `true` are replicated; anything else is new.
 */
export function isReplicatedRow(row: BilateralCenterResult): boolean {
  return Number(row.is_replicated) === 1;
}

export type CenterOrigin = 'all' | 'new' | 'replicated';

export function byOrigin(rows: readonly BilateralCenterResult[], origin: CenterOrigin): BilateralCenterResult[] {
  if (origin === 'all') return [...rows];
  const wantReplicated = origin === 'replicated';
  return rows.filter(row => isReplicatedRow(row) === wantReplicated);
}

/** `new + replicated === total` by construction. */
export function originCounts(rows: readonly BilateralCenterResult[]): { total: number; new: number; replicated: number } {
  const replicated = rows.filter(isReplicatedRow).length;
  return { total: rows.length, new: rows.length - replicated, replicated };
}

const NO_VALUES: ReadonlySet<string> = new Set<string>();

/**
 * GLF-R-8 / DD-9 — the page's global selection over a Center's W3 rows. It runs BEFORE `byOrigin` and the status
 * tile. Program, Typology and Status are decided by the row (`matchesRow`, so the level map and the status slots
 * are the page's own); Project goes through the dimensions index by `row.id`, and only when `honoursProject`
 * (the block's phase is the page version). The Center dimension is not a row rule: it limits which Centers feed
 * the block, so it is dropped here. Funding is dropped too (PFF-R-4): the block is W3 by construction and its rows carry no `source_name`. Project honoured with no index yet is pending: no row is claimed as a match.
 */
export function applyGlobal(
  rows: readonly BilateralCenterResult[],
  selection: PortfolioFilterSelection,
  index: DimensionIndex | null | undefined,
  honoursProject: boolean
): BilateralCenterResult[] {
  const effective: PortfolioFilterSelection = { ...selection, center: NO_VALUES, funding: NO_VALUES, project: honoursProject ? selection.project : NO_VALUES };
  if (!isActive(effective)) return [...rows];
  return rows.filter(row => matchesRow(row as unknown as FilterRow, effective, index) === 'match');
}
