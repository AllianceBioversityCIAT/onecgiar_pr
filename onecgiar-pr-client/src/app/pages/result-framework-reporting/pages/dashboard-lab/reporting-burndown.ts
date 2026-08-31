/**
 * Pure burn-down helpers for the Reporting-tab surfaces (By-AOW banner, grouped header ratio,
 * band controls, session counter). Single home of the zero-target rule (MRF-R-7): a KPI with
 * `target = 0 AND achieved = 0` is excluded from denominators/pending counts and hidden by
 * Only-pending (visible == counted — MRF-R-1/R-7 precedence). No Angular imports — pure functions
 * only, testable in isolation and safe to call from any Reporting-tab surface.
 *
 * Scope: Reporting-tab surfaces ONLY. The Overview tab (`overviewAowProgress`,
 * `overviewXcutProgress`) and the ToC map keep today's rule (accepted divergence — MRF-R-7).
 *
 * @akili-spec changes/mass-reporting-flow
 */

/** Structural shape every helper here needs — matches `ReportingIndicator` without importing it. */
export interface BurndownIndicator {
  indicator_id?: number | string;
  actual_achieved_value_sum?: unknown;
  target_value_sum?: unknown;
}

/** A group of indicators, structurally compatible with `ReportingAowGroup`. */
export interface BurndownGroup {
  indicators?: BurndownIndicator[];
}

type BurndownState = 'complete' | 'in-progress' | 'not-started';

const STATE_RANK: Record<BurndownState, number> = { 'not-started': 0, 'in-progress': 1, complete: 2 };
/** One rank past `complete` — only reachable via `zeroTargetLast` (never assigned by `STATE_RANK`). */
const ZERO_TARGET_LAST_RANK = 3;

/** Options for `sortRemainingFirst`. */
export interface SortRemainingFirstOptions {
  /**
   * Leader decision (MRF-T-2, T-1 review): in Remaining-work order, a zero-target KPI
   * (`target = 0 AND achieved = 0`) ranks LAST — after `complete` — instead of alongside
   * `not-started` (its raw achieved/target reading). Only meaningful when the list can still
   * contain zero-target KPIs; under Only-pending they are already excluded (`pendingOf`), so this
   * is a no-op there. Defaults to `false` to keep every existing caller byte-identical.
   */
  zeroTargetLast?: boolean;
}

function achievedOf(ind: BurndownIndicator | null | undefined): number {
  return Number(ind?.actual_achieved_value_sum ?? 0) || 0;
}

function targetOf(ind: BurndownIndicator | null | undefined): number {
  return Number(ind?.target_value_sum ?? 0) || 0;
}

/** `target = 0 AND achieved = 0` — the zero-target rule's own predicate (MRF-R-7). */
function isZeroTarget(ind: BurndownIndicator | null | undefined): boolean {
  return targetOf(ind) === 0 && achievedOf(ind) === 0;
}

export function stateOf(ind: BurndownIndicator | null | undefined): BurndownState {
  const achieved = achievedOf(ind);
  const target = targetOf(ind);
  return target > 0 && achieved >= target ? 'complete' : achieved > 0 ? 'in-progress' : 'not-started';
}

function isPending(ind: BurndownIndicator | null | undefined): boolean {
  return !isZeroTarget(ind) && stateOf(ind) !== 'complete';
}

/**
 * Splits `inds` into the counted set (denominators/pending/visible use this) and the number
 * excluded by the zero-target rule. `buildAowBannerStats` and the grouped header ratio delegate
 * here (MRF-R-7, MRF-AC-6 — identical everywhere).
 *
 * @akili-spec changes/mass-reporting-flow
 */
export function applyZeroTargetRule<T extends BurndownIndicator>(inds: T[]): { counted: T[]; zeroTarget: number } {
  const counted: T[] = [];
  let zeroTarget = 0;
  for (const ind of inds) {
    if (isZeroTarget(ind)) zeroTarget++;
    else counted.push(ind);
  }
  return { counted, zeroTarget };
}

/**
 * The ratio rule shared by `buildAowBannerStats` (By-AOW banner) and the grouped header's
 * `ratioOf` — one function, so both surfaces produce identical numbers under the zero-target rule
 * (MRF-R-6, MRF-AC-5, MRF-AC-6). **Reported** = `achieved > 0`, a different predicate from
 * **Complete** (`achieved >= target`, the burn-down states above) — never conflate the two.
 *
 * @akili-spec changes/mass-reporting-flow
 */
export function buildRatio<T extends BurndownIndicator>(
  inds: T[]
): { done: number; total: number; percent: number; zeroTarget: number } {
  const { counted, zeroTarget } = applyZeroTargetRule(inds);
  const total = counted.length;
  const done = counted.filter(ind => achievedOf(ind) > 0).length;
  return { done, total, percent: total > 0 ? Math.round((done / total) * 100) : 0, zeroTarget };
}

/**
 * The KPIs an "Only pending" toggle keeps visible: the zero-target rule's `counted` set, minus
 * `complete` KPIs (MRF-R-1 — visible == counted; a zero-target KPI is excluded even though its raw
 * achieved/target reads as `not-started`).
 *
 * @akili-spec changes/mass-reporting-flow
 */
export function pendingOf<T extends BurndownIndicator>(inds: T[]): T[] {
  return applyZeroTargetRule(inds).counted.filter(ind => stateOf(ind) !== 'complete');
}

/**
 * Remaining-work order (MRF-R-2): `not-started` → `in-progress` → `complete`, stable within each
 * state. Does not mutate `inds`.
 *
 * `options.zeroTargetLast` (MRF-T-2 Leader decision): rank a zero-target KPI last instead of with
 * `not-started` — see `SortRemainingFirstOptions`.
 *
 * @akili-spec changes/mass-reporting-flow
 */
export function sortRemainingFirst<T extends BurndownIndicator>(inds: T[], options?: SortRemainingFirstOptions): T[] {
  const zeroTargetLast = options?.zeroTargetLast ?? false;
  return inds
    .map((ind, index) => ({
      ind,
      index,
      rank: zeroTargetLast && isZeroTarget(ind) ? ZERO_TARGET_LAST_RANK : STATE_RANK[stateOf(ind)]
    }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map(entry => entry.ind);
}

/**
 * Pending-KPI count for a group (a card's badge, or the "groups by pending count desc" sort),
 * applying the zero-target rule identically to every other surface.
 *
 * @akili-spec changes/mass-reporting-flow
 */
export function groupPendingCount(group: BurndownGroup | null | undefined): number {
  return pendingOf(group?.indicators ?? []).length;
}

/**
 * The next pending KPI after `kpiId` in `orderedInds` (its current filter+sort order), wrapping to
 * the start of the list. Returns `null` when no other pending KPI remains (MRF-R-3.1, MRF-AC-3
 * BUT clause).
 *
 * @akili-spec changes/mass-reporting-flow
 */
export function nextPendingAfter<T extends BurndownIndicator>(kpiId: number | string, orderedInds: T[]): T | null {
  const total = orderedInds.length;
  if (total === 0) return null;
  const currentIndex = orderedInds.findIndex(ind => ind?.indicator_id === kpiId);
  const start = currentIndex === -1 ? 0 : currentIndex + 1;
  for (let offset = 0; offset < total; offset++) {
    const candidate = orderedInds[(start + offset) % total];
    if (candidate?.indicator_id !== kpiId && isPending(candidate)) return candidate;
  }
  return null;
}

/**
 * Session-counter diff (MRF-R-4): counts KPIs, matched by `indicator_id` between `prev` and
 * `next`, whose `actual_achieved_value_sum` rose. A KPI absent from `prev` has no baseline to diff
 * against and is not counted.
 *
 * @akili-spec changes/mass-reporting-flow
 */
export function countNewlyReported<T extends BurndownIndicator>(prev: T[], next: T[]): number {
  const prevAchievedById = new Map<number | string, number>();
  for (const ind of prev) {
    if (ind?.indicator_id !== undefined) prevAchievedById.set(ind.indicator_id, achievedOf(ind));
  }
  let count = 0;
  for (const ind of next) {
    if (ind?.indicator_id === undefined) continue;
    const prevAchieved = prevAchievedById.get(ind.indicator_id);
    if (prevAchieved !== undefined && achievedOf(ind) > prevAchieved) count++;
  }
  return count;
}
