/**
 * P2-3296 AC2-AC4 — rolling the indicator-level progress up to HLO, Area of Work and
 * Science Program.
 *
 * The whole ticket hinges on one decision, so it lives in one predicate:
 * `hasUsableTarget`. Nicoleta's ruling was "leave the target as is - if anything is
 * reported will be assessed as 'overachieved'". *Overachieved* is a verdict, not a
 * quantity: with a target of zero there is no ratio to compute, only a division by zero.
 * So an indicator without a usable target is labelled on its own row and kept OUT of the
 * averages above it.
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
  counted: number;
  total: number;
  indicators_counted: number;
  indicators_total: number;
}

export interface RollupIndicator {
  target_value_sum?: number | string | null;
  actual_achieved_value_sum?: number | string | null;
  preliminary_achieved_value_sum?: number | string | null;
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

function ratio(achieved: unknown, target: number): number {
  const value = Number(achieved);
  return (Number.isFinite(value) ? value : 0) / target;
}

function averageOf(values: number[]): number | null {
  if (values.length === 0) {
    return NO_MEASURABLE_PROGRESS;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
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
    progress_value: rollup.actual,
    preliminary_value: rollup.preliminary,
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

  return {
    actual: averageOf(actuals),
    preliminary: averageOf(preliminaries),
    counted: measurable.length,
    total: list.length,
    indicators_counted: measurable.length,
    indicators_total: list.length,
  };
}

/**
 * AC2 — one HLO / ToC node, averaged over its own indicators.
 *
 * A simple mean, not a weighted one: the indicators under a node are separate commitments
 * in different units (USD next to a count of knowledge products), so there is no common
 * scale to weight them on. Ángel confirmed the existing formula stays as it is.
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
 * The mean is taken over the children's own percentages, so every HLO weighs the same
 * regardless of how many indicators hang off it — an HLO is one commitment. A child with
 * nothing measurable is skipped rather than counted as zero, exactly as an indicator
 * without a target is.
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
    actual: averageOf(
      measurable.map((child) => child.progress!.progress_value!),
    ),
    preliminary: averageOf(
      measurable.map((child) => child.progress?.preliminary_value ?? 0),
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
