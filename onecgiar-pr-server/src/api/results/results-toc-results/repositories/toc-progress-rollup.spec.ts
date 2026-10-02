import {
  formatProgress,
  hasUsableTarget,
  rollUpChildren,
  rollUpIndicators,
} from './toc-progress-rollup';

const indicator = (
  target: number | null,
  actual: number,
  preliminary = actual,
) => ({
  target_value_sum: target,
  actual_achieved_value_sum: actual,
  preliminary_achieved_value_sum: preliminary,
});

describe('hasUsableTarget — the single decision P2-3296 turns on', () => {
  it('accepts a positive target', () => {
    expect(hasUsableTarget(indicator(10, 5))).toBe(true);
  });

  // Nicoleta: "leave the target as is - if anything is reported will be assessed as
  // 'overachieved'". Overachieved is a verdict, not a quantity — there is no ratio here.
  it('rejects a target of zero even when something was reported', () => {
    expect(hasUsableTarget(indicator(0, 500000))).toBe(false);
  });

  it('rejects a missing target', () => {
    expect(hasUsableTarget(indicator(null, 5))).toBe(false);
    expect(hasUsableTarget({})).toBe(false);
  });

  it('rejects a negative or non-numeric target', () => {
    expect(hasUsableTarget(indicator(-10, 5))).toBe(false);
    expect(hasUsableTarget({ target_value_sum: 'abc' })).toBe(false);
  });
});

describe('rollUpIndicators — AC2, the HLO level', () => {
  it('averages the indicators that have a target', () => {
    const rollup = rollUpIndicators([indicator(10, 10), indicator(10, 5)]);
    expect(rollup.progress_percentage).toBe('75%');
    expect(rollup.counted).toBe(2);
    expect(rollup.total).toBe(2);
  });

  /**
   * The reason this ticket needed a decision at all. Left in the average, indicator B
   * contributes 50,000,000% and the HLO reads 25,000,050%.
   */
  it('keeps a zero-target indicator out of the average instead of destroying it', () => {
    const rollup = rollUpIndicators([indicator(10, 10), indicator(0, 500000)]);
    expect(rollup.progress_percentage).toBe('100%');
    expect(rollup.counted).toBe(1);
    expect(rollup.total).toBe(2);
  });

  it('reports null — not 0% — when no indicator has a usable target', () => {
    const rollup = rollUpIndicators([indicator(0, 5), indicator(null, 3)]);
    expect(rollup.progress_percentage).toBeNull();
    expect(rollup.preliminary_progress_percentage).toBeNull();
    expect(rollup.counted).toBe(0);
    expect(rollup.total).toBe(2);
  });

  it('reports null for a node with no indicators at all', () => {
    expect(rollUpIndicators([]).progress_percentage).toBeNull();
    expect(rollUpIndicators([]).total).toBe(0);
  });

  it('averages the preliminary figure independently of the QA one', () => {
    const rollup = rollUpIndicators([indicator(10, 5, 8)]);
    expect(rollup.progress_percentage).toBe('50%');
    expect(rollup.preliminary_progress_percentage).toBe('80%');
  });

  it('does not cap overachievement, per Nicoleta', () => {
    expect(rollUpIndicators([indicator(10, 50)]).progress_percentage).toBe(
      '500%',
    );
  });
});

describe('rollUpChildren — AC3 and AC4', () => {
  const node = (percentage: number | null, counted = 1, total = 1) => ({
    progress: {
      progress_percentage: percentage === null ? null : `${percentage}%`,
      preliminary_progress_percentage:
        percentage === null ? null : `${percentage}%`,
      progress_value: percentage,
      preliminary_value: percentage,
      counted,
      total,
      indicators_counted: counted,
      indicators_total: total,
    },
  });

  it('averages the children that produced a number', () => {
    expect(rollUpChildren([node(100), node(50)]).progress_percentage).toBe(
      '75%',
    );
  });

  it('skips a child with nothing measurable rather than counting it as zero', () => {
    const rollup = rollUpChildren([node(100), node(null, 0, 4)]);
    expect(rollup.progress_percentage).toBe('100%');
    expect(rollup.counted).toBe(1);
    expect(rollup.total).toBe(2);
  });

  it('weighs every child equally regardless of how many indicators it holds', () => {
    // A 10-indicator HLO at 0% and a 1-indicator HLO at 100% average to 50%, not 9%.
    const rollup = rollUpChildren([node(0, 10, 10), node(100, 1, 1)]);
    expect(rollup.progress_percentage).toBe('50%');
  });

  it('carries the leaf indicator denominator all the way up', () => {
    const rollup = rollUpChildren([node(100, 2, 10), node(50, 3, 5)]);
    expect(rollup.indicators_counted).toBe(5);
    expect(rollup.indicators_total).toBe(15);
  });

  it('reports null when no child produced a number', () => {
    const rollup = rollUpChildren([node(null, 0, 3), node(null, 0, 2)]);
    expect(rollup.progress_percentage).toBeNull();
    expect(rollup.indicators_total).toBe(5);
  });

  it('reports null for a program with no areas', () => {
    expect(rollUpChildren([]).progress_percentage).toBeNull();
  });
});

describe('formatProgress', () => {
  it('drops a trailing .0 and keeps one decimal otherwise', () => {
    expect(formatProgress(50)).toBe('50%');
    expect(formatProgress(33.333)).toBe('33.3%');
  });

  it('falls back to 0% for a non-finite input', () => {
    expect(formatProgress(Number.NaN)).toBe('0%');
    expect(formatProgress(Number.POSITIVE_INFINITY)).toBe('0%');
  });
});

// ── ACS-TEST-1 (docs/specs/bugfix/achieved-counts-submitted, ACS-T-1) ────────────────────────
//
// Achieved/union-basis rollup (ACS-R-3, ACS-S-7). `rollUpIndicators` / `rollUpChildren` must carry
// a third figure — `achieved_value` / `achieved_progress_percentage` — alongside `actual` and
// `preliminary`, computed with the SAME `hasUsableTarget` filter (indicator level) and the SAME
// `measurable` set (child level, keyed on `progress_value !== null`) design.md §7 specifies. Expected
// values are read off the requirements.md ACS-S-1/ACS-S-7 scenario (Target 1, Submitted contributes
// 1 -> 100%), not recomputed the way the code does.
describe('rollUpIndicators — achieved/union basis (ACS-R-3, design.md §7)', () => {
  it('computes achieved_value and achieved_progress_percentage from achieved_value_sum, alongside the QA and preliminary figures', () => {
    const submittedNotYetQaed = {
      target_value_sum: 1,
      actual_achieved_value_sum: 0, // QA basis: not yet QualityAssessed
      preliminary_achieved_value_sum: 1, // Submitted + Approved basis
      achieved_value_sum: 1, // union basis (2, 3, 6): already counts
    };

    // Fails today: RollupIndicator/ProgressRollup carry no achieved_value_sum / achieved_value /
    // achieved_progress_percentage fields at all, so both reads below are undefined.
    const rollup = rollUpIndicators([submittedNotYetQaed] as any) as any;

    expect(rollup.achieved_value).toBe(100);
    expect(rollup.achieved_progress_percentage).toBe('100%');
  });
});

describe('rollUpChildren — achieved/union basis (ACS-S-7)', () => {
  const node = (achievedValue: number | null) => ({
    progress: {
      progress_percentage: achievedValue === null ? null : `${achievedValue}%`,
      preliminary_progress_percentage:
        achievedValue === null ? null : `${achievedValue}%`,
      progress_value: achievedValue,
      preliminary_value: achievedValue,
      achieved_value: achievedValue,
      achieved_progress_percentage:
        achievedValue === null ? null : `${achievedValue}%`,
      counted: achievedValue === null ? 0 : 1,
      total: 1,
      indicators_counted: achievedValue === null ? 0 : 1,
      indicators_total: 1,
    },
  });

  it('averages achieved_value over two children (100, 0) the same way it averages progress_value', () => {
    // Fails today: rollUpChildren never reads/returns achieved_value at all.
    const rollup = rollUpChildren([node(100), node(0)] as any) as any;

    expect(rollup.achieved_value).toBe(50);
  });

  it('skips a child with no usable target for achieved exactly as it does for actual (ACS-S-7 BUT clause)', () => {
    const rollup = rollUpChildren([node(100), node(null)] as any) as any;

    // The zero/no-target child is excluded from EVERY basis via the same `measurable` set — not
    // averaged in as 0, and not counted toward achieved separately from actual/preliminary.
    expect(rollup.achieved_value).toBe(100);
  });
});

/**
 * P2-3296 AC3 regression. The first build averaged an Area of Work over its OUTCOMES only, and
 * every AoW of a programme came back with the identical figure — the outcomes hanging off an AoW
 * are largely programme-level ones repeated under each, while the OUTPUTS are what is actually
 * scoped to one AoW. The AC says so outright: "Includes Outputs (HLOs) and Outcomes".
 */
describe('an Area of Work rolls up BOTH tiers, not outcomes alone', () => {
  const node = (percentage: number, indicators = 1) => ({
    progress: {
      progress_percentage: `${percentage}%`,
      preliminary_progress_percentage: '0%',
      progress_value: percentage,
      preliminary_value: 0,
      counted: indicators,
      total: indicators,
      indicators_counted: indicators,
      indicators_total: indicators,
    },
  });

  // The shared outcomes every AoW carries; the outputs are what tells them apart.
  //
  // ⚠️ P2-3336 (2026-09-09) removed this population from the caller: a programme-level Intermediate
  // Outcome no longer reaches `rollUpChildren` from an Area of Work — the service filters it out
  // first (`results-framework-reporting.service.ts`, `belongsToTheAreaOfWork`). These cases still
  // hold as a property of the FUNCTION, which averages whatever array it is handed and knows
  // nothing about `is_aow`; they no longer describe what the AoW endpoint actually sends.
  const sharedOutcomes = [node(10, 16)];

  it('gives two AoWs different figures once their outputs are included', () => {
    const aowA = rollUpChildren([...sharedOutcomes, node(80, 53)]);
    const aowB = rollUpChildren([...sharedOutcomes, node(0, 7)]);

    expect(aowA.progress_percentage).not.toBe(aowB.progress_percentage);
    expect(aowA.progress_percentage).toBe('45%');
    expect(aowB.progress_percentage).toBe('5%');
  });

  it('is the outcomes-only reading that collapses them to the same number', () => {
    // The defect, stated so the fix is not undone by "simplifying" back to one tier.
    expect(rollUpChildren(sharedOutcomes).progress_percentage).toBe(
      rollUpChildren(sharedOutcomes).progress_percentage,
    );
    expect(rollUpChildren(sharedOutcomes).indicators_total).toBe(16);
  });

  it('carries the indicator denominator of both tiers', () => {
    const rollup = rollUpChildren([...sharedOutcomes, node(80, 53)]);

    expect(rollup.indicators_total).toBe(69);
  });
});
