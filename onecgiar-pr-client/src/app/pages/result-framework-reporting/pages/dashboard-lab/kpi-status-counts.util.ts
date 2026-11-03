/**
 * @akili-spec result-framework-reporting/kpi-row-status-counts (KRC-T-2, KRC-R-1, KRC-R-2, design.md §8)
 *
 * Pure matcher: turns the program-wide `indicator-result-status-links` payload into the per-row
 * status counts. It MUST mirror the indicator drawer's population so the chip equals the drawer
 * count (KRC-R-2): same node, anchor in {row anchor, NULL}, or any anchor when the row has none.
 */

export interface IndicatorResultStatusLink {
  toc_result_id: number;
  related_node_id: string;
  result_id: number;
  status_id: number;
  anchors: number[];
  has_unanchored: boolean;
}

export interface KpiStatusCounts {
  editing: number;
  submitted: number;
  approved: number;
  pendingReview: number;
}

export type KpiStatusLinkIndex = Map<string, IndicatorResultStatusLink[]>;

const nodeKey = (tocResultId: unknown, relatedNodeId: unknown): string => `${tocResultId}|${relatedNodeId}`;

/**
 * Row anchor, parsed like the drawer loader (`parseTocIndicatorTargetId`): null / undefined / blank
 * string / non-finite number are all "absent".
 */
export function rowAnchor(raw: unknown): number | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw === 'string' && raw.trim() === '') return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function indexLinks(links: IndicatorResultStatusLink[] | null | undefined): KpiStatusLinkIndex {
  const index: KpiStatusLinkIndex = new Map();
  for (const l of links ?? []) {
    const key = nodeKey(l.toc_result_id, l.related_node_id);
    const bucket = index.get(key);
    if (bucket) bucket.push(l);
    else index.set(key, [l]);
  }
  return index;
}

/**
 * Status groups (KRC-R-1 amended, KRC-T-5): 1 editing; 2 / 3 submitted; 6 approved; 5 pending review;
 * anything else is ignored. Shared with the indicator drawer header (KRC-R-8) so button and drawer
 * can never disagree on the mapping.
 */
export function statusGroupOf(statusId: unknown): keyof KpiStatusCounts | null {
  switch (Number(statusId)) {
    case 1:
      return 'editing';
    case 2:
    case 3:
      return 'submitted';
    case 6:
      return 'approved';
    case 5:
      return 'pendingReview';
    default:
      return null;
  }
}

/** `row` is an indicator row: `toc_result_id`, `related_node_id`, optional `toc_indicator_target_id`. */
export function countsForRow(index: KpiStatusLinkIndex, row: any): KpiStatusCounts {
  const counts: KpiStatusCounts = { editing: 0, submitted: 0, approved: 0, pendingReview: 0 };
  if (row?.toc_result_id == null || row?.related_node_id == null) return counts;
  const links = index.get(nodeKey(row.toc_result_id, row.related_node_id));
  if (!links) return counts;
  const anchor = rowAnchor(row.toc_indicator_target_id);
  const seen = new Set<number>();
  for (const l of links) {
    if (anchor !== undefined && !l.has_unanchored && !(l.anchors ?? []).includes(anchor)) continue;
    if (seen.has(l.result_id)) continue;
    const bucket = statusGroupOf(l.status_id);
    if (!bucket) continue;
    seen.add(l.result_id);
    counts[bucket]++;
  }
  return counts;
}
