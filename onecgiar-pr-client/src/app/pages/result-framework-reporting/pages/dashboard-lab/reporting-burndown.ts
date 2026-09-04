/**
 * Pure burn-down helpers for the Reporting-tab surfaces (By-AOW banner, grouped header ratio,
 * band controls, session counter). Single home of the zero-target rule (MRF-R-7): a KPI with
 * `target = 0 AND achieved = 0` is excluded from denominators/pending counts and hidden by
 * Only-pending (visible == counted — MRF-R-1/R-7 precedence). No Angular imports — pure functions
 * only, testable in isolation and safe to call from any Reporting-tab surface.
 *
 * Scope: Reporting-tab surfaces, PLUS one sanctioned Overview caller — the hero's
 * `overviewAowProgressRich` computed (`changes/overview-aow-progress-hero`, OAH-R-3/DD-1), which
 * delegates to `stateOf`/`applyZeroTargetRule` for its per-AoW glossary counts and zero-target
 * exclusion. Every OTHER Overview computed — `overviewAowProgress`, `overviewXcutProgress`, and
 * KPI card 4's `aowStats` — plus the ToC map, keep TODAY'S rule (unfiltered, no zero-target
 * exclusion): an accepted, disclosed divergence from the hero (MRF-R-7, OAH-DD-1).
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

// ── Program KPI partition (`bugfix/kpi-count-reconciliation`) ────────────────────────────────

/**
 * An `indicatorsByAow()` row: a `BurndownIndicator` plus the two stamps that host computed adds.
 * `__isIntermediateCrosscut` IS the payload's group-level `is_aow` reading — `indicatorsByAow`
 * stamps it as `tier === 'outcome' && g?.is_aow !== true` (RES-R-3). Bucket membership is decided
 * from that stamp ONLY, never by cross-referencing `indicator_id` against another endpoint
 * (KCR-R-1.1): the same `indicator_id` may be AoW-own in one payload and cross-cut in another.
 *
 * @akili-spec bugfix/kpi-count-reconciliation
 */
export interface PartitionIndicator extends BurndownIndicator {
  __tier?: unknown;
  __isIntermediateCrosscut?: unknown;
}

/** One AoW's slice of the partition. @akili-spec bugfix/kpi-count-reconciliation */
export interface ProgramKpiAowSlice<T extends PartitionIndicator = PartitionIndicator> {
  code: string;
  name: string;
  /** AoW-own KPIs: output tier, plus outcome rows the payload marked `is_aow: true` (KCR §6 Glossary). */
  own: T[];
  /**
   * How many cross-cut Intermediate-Outcome rows this AoW's payload repeats. They are NOT in `own`
   * — they belong to the Intermediate bucket and are counted there exactly once (KCR-R-1). Kept as
   * a count for the zero-target/dedupe disclosures and for tests that prove the split happened.
   */
  crosscut: number;
  loading: boolean;
}

/** A program-level bucket (Intermediate outcomes / 2030 outcomes). @akili-spec bugfix/kpi-count-reconciliation */
export interface ProgramKpiBucket<T extends PartitionIndicator = PartitionIndicator> {
  indicators: T[];
  loading: boolean;
}

/** The one deduplicated KPI universe every shell surface counts over (KCR-R-1, KCR-R-3). */
export interface ProgramKpiPartition<T extends PartitionIndicator = PartitionIndicator> {
  aows: ProgramKpiAowSlice<T>[];
  /** Consumers that resolve by AoW code (banner, table) use this map — never an array index. */
  aowByCode: Map<string, ProgramKpiAowSlice<T>>;
  intermediate: ProgramKpiBucket<T>;
  outcomes2030: ProgramKpiBucket<T>;
}

/** One `indicatorsByAow()` bundle, structurally. @akili-spec bugfix/kpi-count-reconciliation */
export interface ProgramKpiAowBundle<T extends PartitionIndicator = PartitionIndicator> {
  aow: { code: string; name?: string };
  indicators?: T[];
  loading?: boolean;
}

/** A bucket's already-flattened indicators plus its loading flag. */
export interface ProgramKpiBucketInput<T extends PartitionIndicator = PartitionIndicator> {
  indicators?: T[];
  loading?: boolean;
}

/** KCR-R-1/R-1.1: an AoW row is a cross-cut iff it is outcome-tier AND stamped `is_aow !== true`. */
function isCrosscutRow(ind: PartitionIndicator | null | undefined): boolean {
  return ind?.__tier === 'outcome' && ind?.__isIntermediateCrosscut === true;
}

/** First occurrence of each `indicator_id` wins; rows without an id are never collapsed. */
function dedupeById<T extends BurndownIndicator>(inds: T[]): T[] {
  const seen = new Set<number | string>();
  const out: T[] = [];
  for (const ind of inds) {
    const id = ind?.indicator_id;
    if (id === undefined || id === null) {
      out.push(ind);
      continue;
    }
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(ind);
  }
  return out;
}

/**
 * Places every indicator of a program+phase in exactly one bucket (KCR-R-1): AoW-own rows on their
 * AoW, cross-cut Intermediate-Outcome rows nowhere (they are served once by the Intermediate
 * bucket), bucket rows on their bucket, deduplicated by `indicator_id` within the bucket.
 *
 * Pure — no Angular, no signals. The single home of the count-once rule: no consumer may
 * re-implement the predicate (KCR-DD-1, same single-home rule MRF established for `buildRatio`).
 *
 * @akili-spec bugfix/kpi-count-reconciliation
 */
export function partitionProgramKpis<T extends PartitionIndicator>(
  bundles: ProgramKpiAowBundle<T>[] | null | undefined,
  intermediate?: ProgramKpiBucketInput<T> | null,
  outcomes2030?: ProgramKpiBucketInput<T> | null
): ProgramKpiPartition<T> {
  const aows: ProgramKpiAowSlice<T>[] = (bundles ?? []).map(bundle => {
    const own: T[] = [];
    let crosscut = 0;
    for (const ind of bundle?.indicators ?? []) {
      if (isCrosscutRow(ind)) crosscut++;
      else own.push(ind);
    }
    return {
      code: bundle?.aow?.code ?? '',
      name: bundle?.aow?.name ?? '',
      own,
      crosscut,
      loading: bundle?.loading === true
    };
  });

  return {
    aows,
    aowByCode: new Map(aows.map(entry => [entry.code, entry])),
    intermediate: {
      indicators: dedupeById(intermediate?.indicators ?? []),
      loading: intermediate?.loading === true
    },
    outcomes2030: {
      indicators: dedupeById(outcomes2030?.indicators ?? []),
      loading: outcomes2030?.loading === true
    }
  };
}

/**
 * Program-wide totals over the partition (KCR-R-2, R-8, R-9): `planned` = every KPI counted once;
 * `zeroTarget` = how many the MRF-R-7 rule excludes; `counted` = the only denominator the shell may
 * show; `reported` = counted KPIs with `achieved > 0` — `achieved > 0` ONLY, never
 * `progress_percentage` (KCR-R-9: that clause read a `'1500%'` string and was dead).
 *
 * @akili-spec bugfix/kpi-count-reconciliation
 */
export function summarisePartition<T extends PartitionIndicator>(
  partition: ProgramKpiPartition<T>
): { planned: number; zeroTarget: number; counted: number; reported: number } {
  const all: T[] = [
    ...partition.aows.flatMap(entry => entry.own),
    ...partition.intermediate.indicators,
    ...partition.outcomes2030.indicators
  ];
  const { counted, zeroTarget } = applyZeroTargetRule(all);
  return {
    planned: all.length,
    zeroTarget,
    counted: counted.length,
    reported: counted.filter(ind => achievedOf(ind) > 0).length
  };
}
