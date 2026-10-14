/**
 * Progress Tracker activity on the Reporting tab — pure helpers behind the per-row `PT · N` badge
 * and the "With Progress Tracker activity" toggle.
 *
 * Source: `GET api/progress-tracker/programs/:programId/indicator-activity` — one call per program
 * load, one item per mapped (ToC indicator, center) of the active reporting version.
 */

export interface PtActivityItem {
  /** Integration `related_node_id`. */
  toc_results_indicator_id: string;
  /** Integration primary key — the `indicator_id` a Reporting row carries. */
  toc_indicator_integration_id: number | null;
  /** PRMS center acronym stored on the map (`''` = no center target). */
  center: string;
  matched: boolean;
  evidence_count: number;
  pt_indicator_id: string | null;
}

/** Items grouped per indicator, reachable by either identifier the row may carry. */
export type PtActivityIndex = ReadonlyMap<string, readonly PtActivityItem[]>;

/** Minimal row shape these helpers read — `ReportingIndicator` satisfies it. */
export interface PtActivityRow {
  indicator_id?: number | string | null;
  indicator_related_node_id?: string | null;
  center_acronym?: string | null;
  centers?: Array<{ center_acronym?: string | null }> | null;
}

/** The client gives up on the call after this long and renders the page without badges. */
export const PT_ACTIVITY_TIMEOUT_MS = 8000;

const byIntegrationId = (id: unknown) => `id:${String(id).trim()}`;
const byNodeId = (id: unknown) => `node:${String(id).trim()}`;
const centerKey = (c: string | null | undefined) => (c ?? '').trim().replace(/\s+/g, ' ').toUpperCase();

/**
 * Every centre that holds a row's target: the `centers[]` list, falling back to the scalar
 * `center_acronym` only for payloads without the list (a target shared by N centres is ONE row
 * whose scalar is `null` on purpose — P2-3255). `reporting-aow-table.centerAcronymsOf` delegates
 * here so the chips, the centre filter and the PT badge always agree on a row's centres.
 */
export function centerAcronymsOfRow(row: PtActivityRow | null | undefined): string[] {
  const fromList = (row?.centers ?? []).map(c => c?.center_acronym?.trim()).filter((c): c is string => !!c && c !== '—');
  if (fromList.length > 0) return fromList;
  const scalar = row?.center_acronym?.trim();
  return scalar && scalar !== '—' ? [scalar] : [];
}

/**
 * Builds the lookup from the endpoint's `response.items`. Defensive on purpose — anything that is
 * not a well-formed item is dropped, and a payload with no array yields `null` (no badges), so a
 * contract drift degrades to "page as before" instead of a template error.
 */
export function buildPtActivityIndex(items: unknown): PtActivityIndex | null {
  if (!Array.isArray(items)) return null;
  const index = new Map<string, PtActivityItem[]>();
  const push = (key: string, item: PtActivityItem) => {
    const list = index.get(key);
    if (list) list.push(item);
    else index.set(key, [item]);
  };

  for (const raw of items) {
    if (!raw || typeof raw !== 'object') continue;
    const r = raw as Record<string, unknown>;
    const nodeId = typeof r['toc_results_indicator_id'] === 'string' ? (r['toc_results_indicator_id'] as string) : '';
    const intId = r['toc_indicator_integration_id'];
    const hasIntId = intId !== null && intId !== undefined && String(intId).trim() !== '';
    if (!nodeId && !hasIntId) continue;

    const count = Number(r['evidence_count']);
    const item: PtActivityItem = {
      toc_results_indicator_id: nodeId,
      toc_indicator_integration_id: hasIntId ? Number(intId) : null,
      center: typeof r['center'] === 'string' ? (r['center'] as string) : '',
      matched: r['matched'] === true,
      evidence_count: Number.isFinite(count) && count > 0 ? count : 0,
      pt_indicator_id: typeof r['pt_indicator_id'] === 'string' ? (r['pt_indicator_id'] as string) : null
    };
    if (hasIntId) push(byIntegrationId(intId), item);
    if (nodeId) push(byNodeId(nodeId), item);
  }
  return index;
}

/**
 * Evidence items Progress Tracker holds for this row's KPI(s); `0` means "show nothing".
 *
 * PT keeps one KPI per (indicator, center), so the row's centres select the map rows — the same
 * rule the proposals route applies (`ProgressTrackerService.pickMapping`): with no centre on the
 * row, only an indicator mapped exactly once counts (never a guess between centres). Only
 * `matched` rows with evidence count. A target shared by several centres sums its centres' KPIs,
 * de-duplicated by PT KPI id so two centres mapped to the same KPI are not counted twice.
 */
export function ptActivityCountOf(row: PtActivityRow | null | undefined, index: PtActivityIndex | null | undefined): number {
  if (!row || !index || index.size === 0) return 0;

  const hasIntId = row.indicator_id !== null && row.indicator_id !== undefined && String(row.indicator_id).trim() !== '';
  const list =
    (hasIntId ? index.get(byIntegrationId(row.indicator_id)) : undefined) ??
    (row.indicator_related_node_id ? index.get(byNodeId(row.indicator_related_node_id)) : undefined);
  if (!list?.length) return 0;

  const centers = centerAcronymsOfRow(row).map(centerKey);
  const candidates = centers.length ? list.filter(i => centers.includes(centerKey(i.center))) : list.length === 1 ? list : [];

  const seen = new Set<string>();
  let total = 0;
  for (const item of candidates) {
    if (!item.matched || item.evidence_count <= 0) continue;
    const key = item.pt_indicator_id ?? `center:${centerKey(item.center)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    total += item.evidence_count;
  }
  return total;
}

/** True when at least one item would light a badge — the toggle is only offered then. */
export function ptActivityHasAny(index: PtActivityIndex | null | undefined): boolean {
  if (!index) return false;
  for (const list of index.values()) {
    if (list.some(i => i.matched && i.evidence_count > 0)) return true;
  }
  return false;
}

/** Badge tooltip copy. */
export function ptActivityTooltip(count: number): string {
  return `Progress Tracker has ${count} evidence items for this KPI`;
}
