// @akili-spec bilateral/center-overview-tab (COV-T-3, COV-R-6..12, COV-R-20..22, COV-DD-1, COV-DD-6)
import { BilateralCenterResult } from '../../services/bilateral-center-result.interface';
import { BilateralProject } from '../../services/bilateral-creation.interfaces';
import { BilateralAiDraft } from '../../services/bilateral-ai.interfaces';
import { Phases } from '../../../../shared/interfaces/phasesList.interface';
import { STATUS_KEY_TO_ID } from '../../bilateral-query-params';

/**
 * Pure aggregation module for the Center Overview tab (`COV-DD-1`): every card figure is derived
 * here, from the SAME rows the Results tab renders (already passed through `filterCenterResults`
 * by the caller) — never recomputed with a second predicate set. No `inject()`, no HTTP, no DOM.
 */

/** `COV-R-20` — the "pending too long" aging threshold lives in exactly one place. */
export const PENDING_AGE_DAYS = 14;

/** `status_id` values, derived from the ONE contract map (`bilateral-query-params.ts`'s
 *  `STATUS_KEY_TO_ID`) instead of a second literal — a Reviewer finding against `COV-DD-1`: two
 *  copies of "what status_id means" can silently drift apart. */
const STATUS = {
  EDITING: STATUS_KEY_TO_ID.editing,
  QA: STATUS_KEY_TO_ID.qa,
  SUBMITTED: STATUS_KEY_TO_ID.submitted,
  DISCONTINUED: STATUS_KEY_TO_ID.discontinued,
  PENDING: STATUS_KEY_TO_ID.pending,
  APPROVED: STATUS_KEY_TO_ID.approved,
  REJECTED: STATUS_KEY_TO_ID.rejected,
} as const;

/**
 * `COV-DD-6` — result-type grouping by id, one constant. `result_type_id` 11 (Complementary
 * innovation) is deliberately absent from both lists, same as any future unknown id: it lands in
 * `'other'` rather than being dropped.
 */
export const RESULT_TYPE_GROUPS: { output: readonly number[]; outcome: readonly number[] } = {
  output: [5, 6, 7, 8],
  outcome: [1, 2, 3, 4, 9, 10],
};

export type ResultTypeGroupKey = 'output' | 'outcome' | 'other';

export function resolveResultTypeGroup(resultTypeId: number): ResultTypeGroupKey {
  if (RESULT_TYPE_GROUPS.output.includes(resultTypeId)) return 'output';
  if (RESULT_TYPE_GROUPS.outcome.includes(resultTypeId)) return 'outcome';
  return 'other';
}

// ---------------------------------------------------------------------------
// Date helpers — every comparison is date-only (UTC midnight), never time-of-day sensitive.
// ---------------------------------------------------------------------------

function toDateOnly(value: string | Date): Date {
  const d = typeof value === 'string' ? new Date(value) : value;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function daysBetween(fromValue: string | Date, toValue: string | Date): number {
  const from = toDateOnly(fromValue).getTime();
  const to = toDateOnly(toValue).getTime();
  return Math.floor((to - from) / 86_400_000);
}

function isoWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay(); // 0 (Sun) .. 6 (Sat)
  const diffToMonday = (day + 6) % 7; // Mon → 0
  d.setUTCDate(d.getUTCDate() - diffToMonday);
  return d;
}

function addWeeks(date: Date, weeks: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + weeks * 7);
  return d;
}

function weeksBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (7 * 86_400_000));
}

function toIsoDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** `true` when a draft counts toward "AI drafts awaiting review" — not discarded. Promoted drafts
 *  are removed from `BilateralAiService.draftList()` by the service itself, so this is the one
 *  defensive check the pure module still owns (`COV-R-6`/`COV-R-8`). */
function isActiveDraft(draft: BilateralAiDraft): boolean {
  return !draft.is_discarded;
}

// ---------------------------------------------------------------------------
// KPI deck (COV-R-6)
// ---------------------------------------------------------------------------

export interface OverviewTotalResultsKpi {
  count: number;
  w3Count: number;
  w1w2Count: number;
  leadCount: number;
  contributingCount: number;
}

export interface OverviewPendingReviewKpi {
  count: number;
  /** `null` when there are no pending rows. */
  oldestAgeDays: number | null;
  overAgeCount: number;
}

export interface OverviewApprovedKpi {
  count: number;
  /** `null` when `approved + rejected === 0` (`COV-R-6` #3). */
  approvalRatePercent: number | null;
  rejectedCount: number;
}

export interface OverviewNeedsAttentionKpi {
  count: number;
  editingCount: number;
  rejectedCount: number;
  aiDraftCount: number;
}

export interface OverviewProjectsCoveredKpi {
  coveredCount: number;
  totalCount: number;
  notStartedCount: number;
}

export interface OverviewKpisModel {
  totalResults: OverviewTotalResultsKpi;
  pendingReview: OverviewPendingReviewKpi;
  approved: OverviewApprovedKpi;
  needsAttention: OverviewNeedsAttentionKpi;
  projectsCovered: OverviewProjectsCoveredKpi;
}

export function buildTotalResultsKpi(rows: readonly BilateralCenterResult[]): OverviewTotalResultsKpi {
  let w3Count = 0;
  let leadCount = 0;
  for (const row of rows) {
    if (row.source === 'API') w3Count++;
    if (Number(row.is_leading_result) === 1) leadCount++;
  }
  return {
    count: rows.length,
    w3Count,
    w1w2Count: rows.length - w3Count,
    leadCount,
    contributingCount: rows.length - leadCount,
  };
}

export function buildPendingReviewKpi(rows: readonly BilateralCenterResult[], today: Date): OverviewPendingReviewKpi {
  let count = 0;
  let oldest: number | null = null;
  let overAgeCount = 0;
  for (const row of rows) {
    if (Number(row.status_id) !== STATUS.PENDING) continue;
    count++;
    const age = daysBetween(row.created_date, today);
    if (oldest === null || age > oldest) oldest = age;
    if (age > PENDING_AGE_DAYS) overAgeCount++;
  }
  return { count, oldestAgeDays: oldest, overAgeCount };
}

export function buildApprovedKpi(rows: readonly BilateralCenterResult[]): OverviewApprovedKpi {
  let approved = 0;
  let rejected = 0;
  for (const row of rows) {
    const statusId = Number(row.status_id);
    if (statusId === STATUS.APPROVED) approved++;
    else if (statusId === STATUS.REJECTED) rejected++;
  }
  const denominator = approved + rejected;
  return {
    count: approved,
    approvalRatePercent: denominator > 0 ? Math.round((approved / denominator) * 100) : null,
    rejectedCount: rejected,
  };
}

export function buildNeedsAttentionKpi(
  rows: readonly BilateralCenterResult[],
  drafts: readonly BilateralAiDraft[],
): OverviewNeedsAttentionKpi {
  let editingCount = 0;
  let rejectedCount = 0;
  for (const row of rows) {
    const statusId = Number(row.status_id);
    if (statusId === STATUS.EDITING) editingCount++;
    else if (statusId === STATUS.REJECTED) rejectedCount++;
  }
  const aiDraftCount = drafts.filter(isActiveDraft).length;
  return { count: editingCount + rejectedCount + aiDraftCount, editingCount, rejectedCount, aiDraftCount };
}

/** Aggregated per-project rollup shared by the KPI "Projects covered" card and `byProject` — one
 *  computation, so the two never drift on what "covered" means. */
interface ProjectRollup {
  perProject: Map<number, { lead: number; contributing: number; total: number }>;
  noProject: { total: number; leadCount: number; contributingCount: number; allW1W2: boolean } | null;
}

function rollupByProject(rows: readonly BilateralCenterResult[]): ProjectRollup {
  const perProject = new Map<number, { lead: number; contributing: number; total: number }>();
  let noTotal = 0;
  let noLead = 0;
  let noContributing = 0;
  let noNonW1w2 = 0;

  for (const row of rows) {
    const isLead = Number(row.is_leading_result) === 1;
    if (row.project_id === null || row.project_id === undefined) {
      noTotal++;
      if (isLead) noLead++;
      else noContributing++;
      if (row.source !== 'Result') noNonW1w2++;
      continue;
    }
    const projectId = Number(row.project_id);
    const entry = perProject.get(projectId) ?? { lead: 0, contributing: 0, total: 0 };
    if (isLead) entry.lead++;
    else entry.contributing++;
    entry.total++;
    perProject.set(projectId, entry);
  }

  return {
    perProject,
    noProject:
      noTotal > 0 ? { total: noTotal, leadCount: noLead, contributingCount: noContributing, allW1W2: noNonW1w2 === 0 } : null,
  };
}

export function buildProjectsCoveredKpi(
  rows: readonly BilateralCenterResult[],
  projects: readonly BilateralProject[],
): OverviewProjectsCoveredKpi {
  const { perProject } = rollupByProject(rows);
  const scopeIds = new Set(projects.map(p => Number(p.id)));
  let coveredCount = 0;
  for (const projectId of perProject.keys()) {
    if (scopeIds.has(projectId)) coveredCount++;
  }
  const totalCount = projects.length;
  return { coveredCount, totalCount, notStartedCount: Math.max(totalCount - coveredCount, 0) };
}

export function buildOverviewKpis(
  rows: readonly BilateralCenterResult[],
  projects: readonly BilateralProject[],
  drafts: readonly BilateralAiDraft[],
  today: Date,
): OverviewKpisModel {
  return {
    totalResults: buildTotalResultsKpi(rows),
    pendingReview: buildPendingReviewKpi(rows, today),
    approved: buildApprovedKpi(rows),
    needsAttention: buildNeedsAttentionKpi(rows, drafts),
    projectsCovered: buildProjectsCoveredKpi(rows, projects),
  };
}

// ---------------------------------------------------------------------------
// Reporting status card (COV-R-7)
// ---------------------------------------------------------------------------

export type StatusTileKey = 'editing' | 'pending' | 'submittedQa' | 'approved' | 'rejected';

export interface OverviewStatusTile {
  key: StatusTileKey;
  statusIds: readonly number[];
  count: number;
}

export interface OverviewStatusTableRow {
  statusId: number;
  count: number;
}

export interface OverviewStatusModel {
  tiles: OverviewStatusTile[];
  /** One row per status id 1..7 (plus any unexpected id actually present), so a zero-count status
   *  still renders in the a11y table (`COV-R-7`). */
  tableRows: OverviewStatusTableRow[];
  /** Sum of tile counts — total minus Discontinued (`COV-R-7`: "tile counts sum to 47 minus
   *  discontinued"). */
  tileTotal: number;
}

const STATUS_TILE_DEFS: { key: StatusTileKey; statusIds: readonly number[] }[] = [
  { key: 'editing', statusIds: [STATUS.EDITING] },
  { key: 'pending', statusIds: [STATUS.PENDING] },
  { key: 'submittedQa', statusIds: [STATUS.QA, STATUS.SUBMITTED] },
  { key: 'approved', statusIds: [STATUS.APPROVED] },
  { key: 'rejected', statusIds: [STATUS.REJECTED] },
];

export function buildStatusModel(rows: readonly BilateralCenterResult[]): OverviewStatusModel {
  const counts = new Map<number, number>();
  for (let id = 1; id <= 7; id++) counts.set(id, 0);
  for (const row of rows) {
    const statusId = Number(row.status_id);
    counts.set(statusId, (counts.get(statusId) ?? 0) + 1);
  }

  const tiles = STATUS_TILE_DEFS.map(def => ({
    key: def.key,
    statusIds: def.statusIds,
    count: def.statusIds.reduce((sum, id) => sum + (counts.get(id) ?? 0), 0),
  }));

  const tableRows = [...counts.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([statusId, count]) => ({ statusId, count }));

  return { tiles, tableRows, tileTotal: tiles.reduce((sum, tile) => sum + tile.count, 0) };
}

// ---------------------------------------------------------------------------
// Needs attention card (COV-R-8)
// ---------------------------------------------------------------------------

export type AttentionRowKey = 'editing' | 'rejected' | 'aiDrafts' | 'pendingOver14';

export interface OverviewAttentionRow {
  key: AttentionRowKey;
  count: number;
}

export interface OverviewAttentionModel {
  rows: OverviewAttentionRow[];
  allZero: boolean;
}

export function buildAttentionModel(
  rows: readonly BilateralCenterResult[],
  drafts: readonly BilateralAiDraft[],
  today: Date,
): OverviewAttentionModel {
  let editingCount = 0;
  let rejectedCount = 0;
  let pendingOver14Count = 0;
  for (const row of rows) {
    const statusId = Number(row.status_id);
    if (statusId === STATUS.EDITING) editingCount++;
    else if (statusId === STATUS.REJECTED) rejectedCount++;
    if (statusId === STATUS.PENDING && daysBetween(row.created_date, today) > PENDING_AGE_DAYS) pendingOver14Count++;
  }
  const aiDraftCount = drafts.filter(isActiveDraft).length;

  const attentionRows: OverviewAttentionRow[] = [
    { key: 'editing', count: editingCount },
    { key: 'rejected', count: rejectedCount },
    { key: 'aiDrafts', count: aiDraftCount },
    { key: 'pendingOver14', count: pendingOver14Count },
  ];
  return { rows: attentionRows, allZero: attentionRows.every(row => row.count === 0) };
}

// ---------------------------------------------------------------------------
// Results by project card (COV-R-9)
// ---------------------------------------------------------------------------

export interface OverviewProjectBar {
  projectId: number;
  leadCount: number;
  contributingCount: number;
  total: number;
}

export interface OverviewNoProjectRow {
  total: number;
  leadCount: number;
  contributingCount: number;
  /** `true` iff every no-project row is a W1/W2 row (`source === 'Result'`) — decides whether the
   *  card's link carries `source=w1w2` or no project param at all (`COV-R-9` Scenario C). */
  allW1W2: boolean;
}

export interface OverviewByProjectModel {
  /** One entry per project with ≥1 result in scope, sorted by total desc (ties by `projectId`
   *  asc for a stable order) — full list; slicing to "top 7 + Show n more" is a render concern. */
  bars: OverviewProjectBar[];
  /** Projects in scope with zero results. */
  notStartedProjectIds: number[];
  /** `null` when no row has a null `project_id`. */
  noProjectRow: OverviewNoProjectRow | null;
  coveredCount: number;
  totalProjectsInScope: number;
  /** Rows whose `project_id` is set but matches no project in the passed-in scope — dropped from
   *  every bar rather than silently lost, so the card can say so instead of the count quietly not
   *  adding up. */
  unmatchedProjectRows: number;
}

export function buildByProjectModel(
  rows: readonly BilateralCenterResult[],
  projects: readonly BilateralProject[],
): OverviewByProjectModel {
  const { perProject, noProject } = rollupByProject(rows);
  const scopeProjectIds = projects.map(p => Number(p.id));
  const scopeIdSet = new Set(scopeProjectIds);

  const bars: OverviewProjectBar[] = [];
  let unmatchedProjectRows = 0;
  for (const [projectId, agg] of perProject.entries()) {
    // Defensive: a result referencing a project outside the passed-in scope is not rendered as a
    // bar (the scope list is the source of truth for "projects in scope") — but it is counted,
    // not silently dropped.
    if (!scopeIdSet.has(projectId)) {
      unmatchedProjectRows += agg.total;
      continue;
    }
    bars.push({ projectId, leadCount: agg.lead, contributingCount: agg.contributing, total: agg.total });
  }
  bars.sort((a, b) => b.total - a.total || a.projectId - b.projectId);

  const coveredIds = new Set(bars.map(bar => bar.projectId));
  const notStartedProjectIds = scopeProjectIds.filter(id => !coveredIds.has(id));

  return {
    bars,
    notStartedProjectIds,
    noProjectRow: noProject,
    coveredCount: bars.length,
    totalProjectsInScope: projects.length,
    unmatchedProjectRows,
  };
}

// ---------------------------------------------------------------------------
// Science Program contribution card (COV-R-10)
// ---------------------------------------------------------------------------

export interface OverviewSpRow {
  programCode: string;
  projectsMappedCount: number;
  resultsCount: number;
}

export interface OverviewBySpModel {
  rows: OverviewSpRow[];
}

export function buildBySpModel(
  rows: readonly BilateralCenterResult[],
  projects: readonly BilateralProject[],
): OverviewBySpModel {
  const projectsMappedBySp = new Map<string, Set<number>>();
  for (const project of projects) {
    const seenOnThisProject = new Set<string>();
    for (const mapping of project.sciencePrograms ?? []) {
      const code = mapping.programCode;
      if (!code || seenOnThisProject.has(code)) continue; // dedupe: same project, same SP twice → once
      seenOnThisProject.add(code);
      const set = projectsMappedBySp.get(code) ?? new Set<number>();
      set.add(Number(project.id));
      projectsMappedBySp.set(code, set);
    }
  }

  const resultsBySp = new Map<string, number>();
  for (const row of rows) {
    if (!row.submitter) continue;
    resultsBySp.set(row.submitter, (resultsBySp.get(row.submitter) ?? 0) + 1);
  }

  const codes = new Set<string>([...projectsMappedBySp.keys(), ...resultsBySp.keys()]);
  const spRows: OverviewSpRow[] = [...codes].map(code => ({
    programCode: code,
    projectsMappedCount: projectsMappedBySp.get(code)?.size ?? 0,
    resultsCount: resultsBySp.get(code) ?? 0,
  }));
  spRows.sort((a, b) => b.resultsCount - a.resultsCount || b.projectsMappedCount - a.projectsMappedCount || a.programCode.localeCompare(b.programCode));

  return { rows: spRows };
}

// ---------------------------------------------------------------------------
// Results by result type card (COV-R-11)
// ---------------------------------------------------------------------------

export interface OverviewTypeSegments {
  approved: number;
  pending: number;
  other: number;
}

export interface OverviewTypeRow {
  resultTypeId: number;
  /** `null` when no row in scope carries this type's name (a known id with zero rows). */
  label: string | null;
  group: ResultTypeGroupKey;
  count: number;
  segments: OverviewTypeSegments;
  /** `true` when `count === 0` — present in the a11y table, omitted from the bars (`COV-R-11`). */
  omittedFromBar: boolean;
}

export interface OverviewByTypeModel {
  rows: OverviewTypeRow[];
}

export function buildByTypeModel(rows: readonly BilateralCenterResult[]): OverviewByTypeModel {
  const knownIds = [...RESULT_TYPE_GROUPS.output, ...RESULT_TYPE_GROUPS.outcome];
  const byId = new Map<number, { count: number; approved: number; pending: number; label: string | null }>();
  for (const id of knownIds) byId.set(id, { count: 0, approved: 0, pending: 0, label: null });

  for (const row of rows) {
    const typeId = Number(row.result_type_id);
    if (!Number.isFinite(typeId)) continue;
    const entry = byId.get(typeId) ?? { count: 0, approved: 0, pending: 0, label: null };
    entry.count++;
    const statusId = Number(row.status_id);
    if (statusId === STATUS.APPROVED) entry.approved++;
    else if (statusId === STATUS.PENDING) entry.pending++;
    if (!entry.label && row.result_type) entry.label = row.result_type;
    byId.set(typeId, entry);
  }

  const typeRows: OverviewTypeRow[] = [...byId.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([resultTypeId, agg]) => ({
      resultTypeId,
      label: agg.label,
      group: resolveResultTypeGroup(resultTypeId),
      count: agg.count,
      segments: { approved: agg.approved, pending: agg.pending, other: agg.count - agg.approved - agg.pending },
      omittedFromBar: agg.count === 0,
    }));

  return { rows: typeRows };
}

// ---------------------------------------------------------------------------
// Reporting pace card (COV-R-12)
// ---------------------------------------------------------------------------

export interface OverviewPacePoint {
  /** ISO date (`yyyy-mm-dd`) of the week's Monday. */
  weekStart: string;
  cumulative: number;
  /** `true` when this bucket absorbed at least one row whose `created_date` fell outside the
   *  window (before start → first bucket, after end → last bucket). */
  isBoundaryBucket: boolean;
}

export interface OverviewPaceModel {
  points: OverviewPacePoint[];
  /** `false` when the phase had no dates and the window fell back to `[min, max]` created_date
   *  (`COV-R-12` AND-IT-MUST). */
  hasWindow: boolean;
  windowStart: string | null;
  windowEnd: string | null;
  todayInWindow: boolean;
  /** Rows bucketed into the first/last week because their date fell outside `[windowStart,
   *  windowEnd]`. */
  outsideWindowCount: number;
}

export function buildOverviewPaceModel(
  rows: readonly BilateralCenterResult[],
  phase: Phases | null,
  today: Date,
): OverviewPaceModel {
  let windowStart: Date | null = null;
  let windowEnd: Date | null = null;
  let hasWindow = false;

  if (phase?.start_date && phase?.end_date) {
    windowStart = toDateOnly(phase.start_date);
    windowEnd = toDateOnly(phase.end_date);
    hasWindow = true;
  } else if (rows.length > 0) {
    const times = rows.map(row => toDateOnly(row.created_date).getTime());
    windowStart = new Date(Math.min(...times));
    windowEnd = new Date(Math.max(...times));
    hasWindow = false;
  }

  if (!windowStart || !windowEnd) {
    return { points: [], hasWindow: false, windowStart: null, windowEnd: null, todayInWindow: false, outsideWindowCount: 0 };
  }

  const bucketStart = isoWeekStart(windowStart);
  const bucketEnd = isoWeekStart(windowEnd);
  const weekCount = weeksBetween(bucketStart, bucketEnd) + 1;

  const counts = new Array<number>(weekCount).fill(0);
  const boundaryFlags = new Array<boolean>(weekCount).fill(false);
  let outsideWindowCount = 0;

  for (const row of rows) {
    const date = toDateOnly(row.created_date);
    let index: number;
    if (date.getTime() < windowStart.getTime()) {
      index = 0;
      outsideWindowCount++;
      boundaryFlags[0] = true;
    } else if (date.getTime() > windowEnd.getTime()) {
      index = weekCount - 1;
      outsideWindowCount++;
      boundaryFlags[weekCount - 1] = true;
    } else {
      const rowWeekStart = isoWeekStart(date);
      index = Math.min(Math.max(weeksBetween(bucketStart, rowWeekStart), 0), weekCount - 1);
    }
    counts[index]++;
  }

  let cumulative = 0;
  const points: OverviewPacePoint[] = counts.map((count, index) => {
    cumulative += count;
    return { weekStart: toIsoDateString(addWeeks(bucketStart, index)), cumulative, isBoundaryBucket: boundaryFlags[index] };
  });

  const todayOnly = toDateOnly(today);
  const todayInWindow = hasWindow && todayOnly.getTime() >= windowStart.getTime() && todayOnly.getTime() <= windowEnd.getTime();

  return {
    points,
    hasWindow,
    windowStart: toIsoDateString(windowStart),
    windowEnd: toIsoDateString(windowEnd),
    todayInWindow,
    outsideWindowCount,
  };
}

// ---------------------------------------------------------------------------
// Top-level model (COV-T-3)
// ---------------------------------------------------------------------------

export interface OverviewModel {
  kpis: OverviewKpisModel;
  status: OverviewStatusModel;
  attention: OverviewAttentionModel;
  byProject: OverviewByProjectModel;
  bySp: OverviewBySpModel;
  byType: OverviewByTypeModel;
  pace: OverviewPaceModel;
}

/**
 * Builds every Overview card model from one scoped row set. `rows` and `drafts` are expected to
 * already be scoped by the caller (`filterCenterResults` for rows; project-id filtering for
 * drafts when a project filter is active, `COV-R-6` "AI drafts scope" scenario) — this module adds
 * no filtering of its own beyond the per-card business rules below.
 */
export function buildOverviewModel(
  rows: readonly BilateralCenterResult[],
  projects: readonly BilateralProject[],
  drafts: readonly BilateralAiDraft[],
  phase: Phases | null,
  today: Date,
): OverviewModel {
  return {
    kpis: buildOverviewKpis(rows, projects, drafts, today),
    status: buildStatusModel(rows),
    attention: buildAttentionModel(rows, drafts, today),
    byProject: buildByProjectModel(rows, projects),
    bySp: buildBySpModel(rows, projects),
    byType: buildByTypeModel(rows),
    pace: buildOverviewPaceModel(rows, phase, today),
  };
}
