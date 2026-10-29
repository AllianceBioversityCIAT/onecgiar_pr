/**
 * P2-3296 AC2-AC4 — rolling the indicator-level progress up to HLO, Area of Work and
 * Science Program.
 *
 * REVERSAL (2026-10-19, spec changes/kpi-progress-capped-average, KPC-R-1/R-3/R-6): the first
 * build of this file did NOT cap an indicator at 100% (Nicoleta, P2-3296: overachievement stayed
 * visible) and averaged an Area of Work / Program as a mean of the children's means (Ángel). Both
 * are superseded by Nicoleta's email "RE: Resync PRMS with ToC for BDN" (KZ-BOR-1):
 *   1. each indicator contributes `min(achieved / target, 1) * 100`, so one overachiever cannot
 *      hide indicators that missed (`ratio`);
 *   2. an HLO / AoW / Program is the FLAT mean over the leaf indicators with a target, so
 *      `rollUpChildren` weights every child by `indicators_counted` instead of averaging means.
 * The indicator row's own `progress_percentage` keeps the raw figure (KPC-S-6.3); only the
 * averages cap.
 *
 * What stays: `hasUsableTarget`. Nicoleta's ruling was "leave the target as is - if anything is
 * reported will be assessed as 'overachieved'". *Overachieved* is a verdict, not a quantity: with
 * a target of zero there is no ratio to compute, only a division by zero. So an indicator without
 * a usable target is labelled on its own row and kept OUT of the averages above it.
 *
 * Counting it as 0% would punish a team for an empty field; letting the current
 * `value * 100` branch through would put 50,000,000% into an average and destroy every
 * level above it. Excluding is the only one of the three that does not state something
 * false.
 *
 * If that ruling ever changes, change `hasUsableTarget` and nothing else.
 */

/** A percentage the caller must render as a dash: there was nothing to measure. */
export const NO_MEASURABLE_PROGRESS = null;

export interface ProgressRollup {
  /** Formatted percentage, or null when nothing measurable rolled up (render a dash, not 0%). */
  progress_percentage: string | null;
  preliminary_progress_percentage: string | null;
  /**
   * The same two figures unrounded. Parents average these instead of re-parsing the
   * formatted strings, and the client sizes its bars from them instead of splitting on '%'.
   */
  progress_value: number | null;
  preliminary_value: number | null;
  /**
   * @akili-spec bugfix/achieved-counts-submitted — union basis (status 2, 3, 6), ACS-R-3/ACS-S-7.
   * Same shape as `progress_value`/`progress_percentage`, computed from `achieved_value_sum`
   * alongside (never instead of) the QA and preliminary figures above. Optional so existing
   * fixtures/literals built against this interface (pre-dating this field) keep compiling —
   * `rollUpIndicators`/`rollUpChildren` always populate it on what they return.
   */
  achieved_value?: number | null;
  achieved_progress_percentage?: string | null;
  /** Direct children that carried a measurable figure, out of those considered. */
  counted: number;
  total: number;
  /**
   * Leaf indicators behind this number, accumulated all the way down. A level is only as
   * solid as the indicators under it, so the deepest denominator travels with the number:
   * "45%" over 2 of 10 indicators must never look like "45%" over 10 of 10.
   */
  indicators_counted: number;
  indicators_total: number;
}

/** Numeric twin of ProgressRollup, kept internal so parents can average without reparsing strings. */
interface NumericRollup {
  actual: number | null;
  preliminary: number | null;
  /** @akili-spec bugfix/achieved-counts-submitted — union basis, alongside actual/preliminary. */
  achieved: number | null;
  counted: number;
  total: number;
  indicators_counted: number;
  indicators_total: number;
}

export interface RollupIndicator {
  target_value_sum?: number | string | null;
  actual_achieved_value_sum?: number | string | null;
  preliminary_achieved_value_sum?: number | string | null;
  /** @akili-spec bugfix/achieved-counts-submitted — union basis (status 2, 3, 6). */
  achieved_value_sum?: number | string | null;
}

/**
 * THE decision, in one place.
 *
 * A target of zero and a missing target are treated alike on purpose: neither expresses a
 * commitment, so neither can be a denominator. 53 indicators sit at zero and 50 have no
 * target row at all (103 of 2,847 active — 3.6%).
 */
export function hasUsableTarget(indicator: RollupIndicator): boolean {
  const target = Number(indicator?.target_value_sum);
  return Number.isFinite(target) && target > 0;
}

/**
 * Same rounding the indicator row has used in production since P2-2841 — one decimal,
 * trailing `.0` dropped — so a rolled-up number reads like the numbers beside it.
 */
export function formatProgress(progressPercentage: number): string {
  const rounded = Math.round(progressPercentage * 10) / 10;
  if (!Number.isFinite(rounded)) {
    return '0%';
  }
  return Number.isInteger(rounded)
    ? `${rounded.toFixed(0)}%`
    : `${rounded.toFixed(1)}%`;
}

/**
 * KPC-R-1 (Nicoleta, "RE: Resync PRMS with ToC for BDN", 2026-10): achievement =
 * min(achieved / target, 1), so one over-achieved indicator can't hide others that missed.
 * The row's own `progress_percentage` keeps the raw figure; only the averages cap it.
 */
function ratio(achieved: unknown, target: number): number {
  const value = Number(achieved);
  return Math.min((Number.isFinite(value) ? value : 0) / target, 1);
}

function averageOf(values: number[]): number | null {
  if (values.length === 0) {
    return NO_MEASURABLE_PROGRESS;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** Mean of the children's figures weighted by the leaf indicators behind each one. */
function weightedAverageOf(
  children: readonly RollupChild[],
  valueOf: (child: RollupChild) => number,
): number | null {
  const weight = (child: RollupChild) =>
    child.progress?.indicators_counted ?? 0;
  const totalWeight = children.reduce((sum, child) => sum + weight(child), 0);
  if (totalWeight === 0) {
    return NO_MEASURABLE_PROGRESS;
  }
  return (
    children.reduce((sum, child) => sum + valueOf(child) * weight(child), 0) /
    totalWeight
  );
}

function present(rollup: NumericRollup): ProgressRollup {
  return {
    progress_percentage:
      rollup.actual === null
        ? NO_MEASURABLE_PROGRESS
        : formatProgress(rollup.actual),
    preliminary_progress_percentage:
      rollup.preliminary === null
        ? NO_MEASURABLE_PROGRESS
        : formatProgress(rollup.preliminary),
    achieved_progress_percentage:
      rollup.achieved === null
        ? NO_MEASURABLE_PROGRESS
        : formatProgress(rollup.achieved),
    progress_value: rollup.actual,
    preliminary_value: rollup.preliminary,
    achieved_value: rollup.achieved,
    counted: rollup.counted,
    total: rollup.total,
    indicators_counted: rollup.indicators_counted,
    indicators_total: rollup.indicators_total,
  };
}

function rollUpIndicatorsNumeric(
  indicators: readonly RollupIndicator[],
): NumericRollup {
  const list = Array.isArray(indicators) ? indicators : [];
  const measurable = list.filter(hasUsableTarget);

  const actuals = measurable.map(
    (indicator) =>
      ratio(
        indicator.actual_achieved_value_sum,
        Number(indicator.target_value_sum),
      ) * 100,
  );
  const preliminaries = measurable.map(
    (indicator) =>
      ratio(
        indicator.preliminary_achieved_value_sum,
        Number(indicator.target_value_sum),
      ) * 100,
  );
  // @akili-spec bugfix/achieved-counts-submitted — same hasUsableTarget filter, union basis.
  const achieved = measurable.map(
    (indicator) =>
      ratio(indicator.achieved_value_sum, Number(indicator.target_value_sum)) *
      100,
  );

  return {
    actual: averageOf(actuals),
    preliminary: averageOf(preliminaries),
    achieved: averageOf(achieved),
    counted: measurable.length,
    total: list.length,
    indicators_counted: measurable.length,
    indicators_total: list.length,
  };
}

/**
 * AC2 — one HLO / ToC node, averaged over its own indicators.
 *
 * A simple mean over the node's own indicators: each one is already a unitless, capped
 * percentage (`ratio`), so USD next to a count of knowledge products need no common scale.
 */
export function rollUpIndicators(
  indicators: readonly RollupIndicator[],
): ProgressRollup {
  return present(rollUpIndicatorsNumeric(indicators));
}

export interface RollupChild {
  progress?: ProgressRollup | null;
}

/**
 * AC3 / AC4 — Area of Work over its HLOs, Science Program over its Areas of Work.
 *
 * Nicoleta (2026-10): "the % for an AoW or HLO is the average of those indicator %". So the
 * mean is FLAT over the leaf indicators, not a mean of the children's means: each child's
 * figure is weighted by `indicators_counted`, which is exactly the leaf average because every
 * child figure is itself the mean over those indicators. A child with nothing measurable is
 * skipped rather than counted as zero, exactly as an indicator without a target is.
 */
export function rollUpChildren(
  children: readonly RollupChild[],
): ProgressRollup {
  const list = Array.isArray(children) ? children : [];
  const measurable = list.filter(
    (child) =>
      child?.progress != null && child.progress.progress_value !== null,
  );

  return present({
    actual: weightedAverageOf(
      measurable,
      (child) => child.progress!.progress_value!,
    ),
    preliminary: weightedAverageOf(
      measurable,
      (child) => child.progress?.preliminary_value ?? 0,
    ),
    // @akili-spec bugfix/achieved-counts-submitted — same `measurable` set (keyed on
    // progress_value !== null, which depends on targets only, so it is identical across bases).
    achieved: weightedAverageOf(
      measurable,
      (child) => child.progress?.achieved_value ?? 0,
    ),
    counted: measurable.length,
    total: list.length,
    indicators_counted: list.reduce(
      (sum, child) => sum + (child?.progress?.indicators_counted ?? 0),
      0,
    ),
    indicators_total: list.reduce(
      (sum, child) => sum + (child?.progress?.indicators_total ?? 0),
      0,
    ),
  });
}
