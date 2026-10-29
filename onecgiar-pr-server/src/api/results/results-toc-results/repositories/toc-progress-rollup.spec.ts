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

  it('caps each indicator at 100% so one overachiever cannot hide the others, per Nicoleta (2026-10)', () => {
    expect(rollUpIndicators([indicator(10, 50)]).progress_percentage).toBe(
      '100%',
    );
    // 500% + 0% would read 250%; capped it reads 50%.
    expect(
      rollUpIndicators([indicator(10, 50), indicator(10, 0)])
        .progress_percentage,
    ).toBe('50%');
  });

  it("matches Nicoleta's BDN AoW1 example: (100+100+45+73+100+86+0+100+50+100+100) / 11 = 77.6%", () => {
    const percentages = [100, 100, 45, 73, 100, 86, 0, 100, 50, 100, 100];
    // Two of the 100% rows are overachieved (150, 300) and must still count as 100.
    const indicators = percentages.map((p, i) =>
      indicator(100, i === 0 ? 150 : i === 4 ? 300 : p),
    );
    expect(rollUpIndicators(indicators).progress_percentage).toBe('77.6%');
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

  it('averages flat over the leaf indicators, not over the children, per Nicoleta (2026-10)', () => {
    // A 10-indicator HLO at 0% and a 1-indicator HLO at 100%: 100 / 11 indicators = 9.1%, not 50%.
    const rollup = rollUpChildren([node(0, 10, 10), node(100, 1, 1)]);
    expect(rollup.progress_percentage).toBe('9.1%');
  });

  it('gives the same figure one level up as averaging the leaves directly', () => {
    const hloA = rollUpIndicators([indicator(10, 10), indicator(10, 0)]);
    const hloB = rollUpIndicators([indicator(4, 1)]);
    const flat = rollUpIndicators([
      indicator(10, 10),
      indicator(10, 0),
      indicator(4, 1),
    ]);
    expect(
      rollUpChildren([{ progress: hloA }, { progress: hloB }])
        .progress_percentage,
    ).toBe(flat.progress_percentage);
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
    // Flat over the leaves: (10·16 + 80·53) / 69 and (10·16 + 0·7) / 23.
    expect(aowA.progress_percentage).toBe('63.8%');
    expect(aowB.progress_percentage).toBe('7%');
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

// ── KPC-T-1 (docs/specs/changes/kpi-progress-capped-average, KPC-R-3 / KPC-R-6) ─────────────
// Every basis (actual, preliminary, achieved) is weighted by `indicators_counted`, never by child.
describe('rollUpChildren — flat weighting applies to every basis (KPC-S-3.1, KPC-S-6.2)', () => {
  const basisNode = (
    value: number | null,
    indicators: number,
    preliminary: number | null = value,
    achieved: number | null = value,
  ) => ({
    progress: {
      progress_percentage: value === null ? null : `${value}%`,
      preliminary_progress_percentage:
        preliminary === null ? null : `${preliminary}%`,
      progress_value: value,
      preliminary_value: preliminary,
      achieved_value: achieved,
      achieved_progress_percentage: achieved === null ? null : `${achieved}%`,
      counted: indicators,
      total: indicators,
      indicators_counted: indicators,
      indicators_total: indicators,
    },
  });

  it('weights the preliminary and achieved bases like the QA basis: 100% x1 + 0% x3 = 25', () => {
    const rollup = rollUpChildren([basisNode(100, 1), basisNode(0, 3)]);
    expect(rollup.progress_value).toBe(25);
    expect(rollup.preliminary_value).toBe(25);
    expect(rollup.achieved_value).toBe(25);
    expect(rollup.preliminary_progress_percentage).toBe('25%');
    expect(rollup.achieved_progress_percentage).toBe('25%');
  });

  it('weights each basis by its own figure (bases may differ per child)', () => {
    // QA 0 / 100, preliminary 100 / 100, achieved 50 / 0, over 3 and 1 indicators.
    const rollup = rollUpChildren([
      basisNode(0, 3, 100, 50),
      basisNode(100, 1, 100, 0),
    ]);
    expect(rollup.progress_value).toBe(25);
    expect(rollup.preliminary_value).toBe(100);
    expect(rollup.achieved_value).toBe(37.5);
  });

  it('a child with progress_value null is skipped and adds no weight', () => {
    // The null child still reports 4 indicators behind it; they must not dilute the 100.
    const rollup = rollUpChildren([basisNode(100, 1), basisNode(null, 4)]);
    expect(rollup.progress_value).toBe(100);
    expect(rollup.counted).toBe(1);
    expect(rollup.total).toBe(2);
  });

  it('is null when the measurable children carry no indicator weight', () => {
    const rollup = rollUpChildren([basisNode(50, 0)]);
    expect(rollup.progress_value).toBeNull();
    expect(rollup.progress_percentage).toBeNull();
  });

  it('rolls a Program flat over AoWs of different size (two levels up equals the leaves)', () => {
    const hlo1 = rollUpIndicators([indicator(10, 0), indicator(10, 0)]);
    const hlo2 = rollUpIndicators([indicator(10, 99)]);
    const aow = rollUpChildren([{ progress: hlo1 }, { progress: hlo2 }]);
    const program = rollUpChildren([
      { progress: aow },
      { progress: rollUpIndicators([indicator(2, 1)]) },
    ]);
    // Leaves capped: 0, 0, 100, 50 -> 37.5
    expect(program.progress_value).toBe(37.5);
  });
});
