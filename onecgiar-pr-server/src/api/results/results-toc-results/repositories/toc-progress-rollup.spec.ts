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
