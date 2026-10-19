import {
  applyZeroTargetRule,
  buildRatio,
  countNewlyReported,
  groupPendingCount,
  hasTarget,
  nextPendingAfter,
  partitionProgramKpis,
  pendingOf,
  sortRemainingFirst,
  summarisePartition,
  sumTargetValues
} from './reporting-burndown';

// MRF-TEST-1 (docs/specs/changes/mass-reporting-flow/tasks.md, MRF-T-1) — pure burn-down helpers.
// The centralised rule was re-armed as "has a target" by KTO-T-1 (below). Every fixture varies
// target and achieved independently (disqualifier: reusing the same value for both cannot
// distinguish the no-target rule from the completion rule).

// KTO-T-1 (docs/specs/changes/kpi-progress-target-only) — the shared rule is "has a target":
// target finite and > 0, achieved ignored (KTO-R-1). Fixtures vary target and achieved
// independently so `0/3` (reported, no target) cannot hide behind `0/0`.

const row = (id: number | string, target: unknown, achieved: unknown) => ({
  indicator_id: id,
  target_value_sum: target,
  actual_achieved_value_sum: achieved
});

// S-1.1 / S-2.2 falsifier fixture: 5/2, 0/0, 0/3, null/0, "0"/0, "12"/0
const falsifierRows = () => [row(1, 5, 2), row(2, 0, 0), row(3, 0, 3), row(4, null, 0), row(5, '0', 0), row(6, '12', 0)];

describe('hasTarget (KTO-R-1, S-1.1)', () => {
  it.each([
    ['5/2', 5, 2, true],
    ['0/0', 0, 0, false],
    ['0/3 (overachieved, still no target)', 0, 3, false],
    ['null/0', null, 0, false],
    ['undefined target', undefined, 4, false],
    ['"0"/0', '0', 0, false],
    ['"12"/0 (numeric string parses)', '12', 0, true],
    ['negative target', -2, 0, false],
    ['NaN target', Number.NaN, 0, false],
    ['Infinity target', Number.POSITIVE_INFINITY, 0, false]
  ])('%s -> %s', (_label, target, achieved, expected) => {
    expect(hasTarget(row(1, target, achieved))).toBe(expected);
  });

  it('returns false for a null / undefined row', () => {
    expect(hasTarget(null)).toBe(false);
    expect(hasTarget(undefined)).toBe(false);
  });
});

describe('applyZeroTargetRule', () => {
  it('counts only rows with a target; zeroTarget is the number of rows excluded (no target set)', () => {
    const { counted, zeroTarget } = applyZeroTargetRule(falsifierRows());

    expect(counted.map(i => i.indicator_id)).toEqual([1, 6]);
    expect(zeroTarget).toBe(4);
  });

  it('excludes a reported row without a target (0/3) from counted', () => {
    const ind = row(1, 0, 3);

    const { counted, zeroTarget } = applyZeroTargetRule([ind]);

    expect(counted).toEqual([]);
    expect(zeroTarget).toBe(1);
  });

  it('keeps every row when all have a target', () => {
    const inds = [row(1, 5, 5), row(2, '4', '2'), row(3, 1, 0)];

    const { counted, zeroTarget } = applyZeroTargetRule(inds);

    expect(counted).toEqual(inds);
    expect(zeroTarget).toBe(0);
  });
});

describe('buildRatio (KTO-R-2, KTO-R-3)', () => {
  it('S-2.1/S-2.2 falsifier: 5/2, 0/0, 0/3, null/0, "0"/0, "12"/0 -> done 1, total 2, zeroTarget 4', () => {
    expect(buildRatio(falsifierRows())).toEqual({ done: 1, total: 2, percent: 50, zeroTarget: 4 });
  });

  it('S-2.1: 50 targeted (10 reported) + 4 without a target reads 10 of 50 and 20%', () => {
    const targeted = Array.from({ length: 50 }, (_, i) => row(i, 10, i < 10 ? 1 : 0));
    const untargeted = [row(100, 0, 0), row(101, 0, 0), row(102, null, 0), row(103, 0, 0)];

    expect(buildRatio([...targeted, ...untargeted])).toEqual({ done: 10, total: 50, percent: 20, zeroTarget: 4 });
  });

  it('S-2.2: an extra 0/3 row stays out of the numerator and bumps zeroTarget to 5', () => {
    const targeted = Array.from({ length: 50 }, (_, i) => row(i, 10, i < 10 ? 1 : 0));
    const untargeted = [row(100, 0, 0), row(101, 0, 0), row(102, null, 0), row(103, 0, 0), row(104, 0, 3)];

    expect(buildRatio([...targeted, ...untargeted])).toEqual({ done: 10, total: 50, percent: 20, zeroTarget: 5 });
  });

  it('S-3.1: all rows without a target -> total 0, percent 0 (not NaN), zeroTarget 3', () => {
    const result = buildRatio([row(1, 0, 0), row(2, 0, 7), row(3, null, 0)]);

    expect(result).toEqual({ done: 0, total: 0, percent: 0, zeroTarget: 3 });
    expect(Number.isNaN(result.percent)).toBe(false);
  });

  it('an empty list is total 0, percent 0, zeroTarget 0', () => {
    expect(buildRatio([])).toEqual({ done: 0, total: 0, percent: 0, zeroTarget: 0 });
  });
});

describe('pendingOf', () => {
  it('excludes no-target rows and complete rows; keeps targeted not-started and in-progress', () => {
    const inds = [row(1, 0, 0), row(2, 5, 0), row(3, 5, 2), row(4, 5, 5), row(5, 0, 3)];

    expect(pendingOf(inds).map(i => i.indicator_id)).toEqual([2, 3]);
  });

  it('S-8.1: over the falsifier fixture contains no no-target row', () => {
    const noTargetIds = [2, 3, 4, 5];

    const ids = pendingOf(falsifierRows()).map(i => i.indicator_id);

    expect(ids).toEqual([1, 6]);
    expect(ids.some(id => noTargetIds.includes(id as number))).toBe(false);
  });
});

describe('sortRemainingFirst', () => {
  it('orders not-started -> in-progress -> complete, stable within each state, regardless of catalogue order', () => {
    const complete1 = { indicator_id: 'A', target_value_sum: 2, actual_achieved_value_sum: 2 };
    const notStarted1 = { indicator_id: 'B', target_value_sum: 2, actual_achieved_value_sum: 0 };
    const inProgress1 = { indicator_id: 'C', target_value_sum: 2, actual_achieved_value_sum: 1 };
    const complete2 = { indicator_id: 'D', target_value_sum: 2, actual_achieved_value_sum: 2 };
    const notStarted2 = { indicator_id: 'E', target_value_sum: 2, actual_achieved_value_sum: 0 };
    const inProgress2 = { indicator_id: 'F', target_value_sum: 2, actual_achieved_value_sum: 1 };
    const catalogue = [complete1, notStarted1, inProgress1, complete2, notStarted2, inProgress2];

    const sorted = sortRemainingFirst(catalogue);

    expect(sorted.map(i => i.indicator_id)).toEqual(['B', 'E', 'C', 'F', 'A', 'D']);
  });

  it('does not mutate the input array', () => {
    const catalogue = [{ indicator_id: 1, actual_achieved_value_sum: 0, target_value_sum: 2 }];
    const copy = [...catalogue];

    sortRemainingFirst(catalogue);

    expect(catalogue).toEqual(copy);
  });

  // A no-target row ranks with `not-started` by default (its raw reading), but LAST — after
  // `complete` — when the caller opts into `zeroTargetLast` (KTO-R-8: Remaining-work order).
  describe('zeroTargetLast option', () => {
    const noTarget = (id: string) => ({ indicator_id: id, target_value_sum: 0, actual_achieved_value_sum: 0 });
    const noTargetReported = (id: string) => ({ indicator_id: id, target_value_sum: 0, actual_achieved_value_sum: 3 });
    const notStarted = (id: string) => ({ indicator_id: id, target_value_sum: 5, actual_achieved_value_sum: 0 });
    const inProgress = (id: string) => ({ indicator_id: id, target_value_sum: 5, actual_achieved_value_sum: 2 });
    const complete = (id: string) => ({ indicator_id: id, target_value_sum: 5, actual_achieved_value_sum: 5 });

    it('without the option, ranks a no-target KPI with not-started (its raw reading)', () => {
      const catalogue = [complete('A'), noTarget('B'), inProgress('C'), notStarted('D')];

      const sorted = sortRemainingFirst(catalogue);

      expect(sorted.map(i => i.indicator_id)).toEqual(['B', 'D', 'C', 'A']);
    });

    it('with zeroTargetLast, ranks a no-target KPI after complete instead of with not-started', () => {
      const catalogue = [complete('A'), noTarget('B'), inProgress('C'), notStarted('D')];

      const sorted = sortRemainingFirst(catalogue, { zeroTargetLast: true });

      expect(sorted.map(i => i.indicator_id)).toEqual(['D', 'C', 'A', 'B']);
    });

    it('with zeroTargetLast, a reported no-target KPI (0/3) also ranks last, not as in-progress', () => {
      const catalogue = [noTargetReported('R'), notStarted('D'), complete('A')];

      const sorted = sortRemainingFirst(catalogue, { zeroTargetLast: true });

      expect(sorted.map(i => i.indicator_id)).toEqual(['D', 'A', 'R']);
    });

    it('keeps multiple no-target KPIs stable relative to each other, both last', () => {
      const catalogue = [noTarget('B1'), notStarted('D'), noTarget('B2')];

      const sorted = sortRemainingFirst(catalogue, { zeroTargetLast: true });

      expect(sorted.map(i => i.indicator_id)).toEqual(['D', 'B1', 'B2']);
    });
  });
});

describe('groupPendingCount', () => {
  it('counts pending KPIs within a group, excluding no-target KPIs', () => {
    const group = {
      indicators: [
        { indicator_id: 1, target_value_sum: 0, actual_achieved_value_sum: 0 },
        { indicator_id: 2, target_value_sum: 5, actual_achieved_value_sum: 5 },
        { indicator_id: 3, target_value_sum: 5, actual_achieved_value_sum: 1 }
      ]
    };

    expect(groupPendingCount(group)).toBe(1);
  });

  it('returns 0 for a group with no indicators', () => {
    expect(groupPendingCount({ indicators: [] })).toBe(0);
    expect(groupPendingCount({})).toBe(0);
    expect(groupPendingCount(undefined)).toBe(0);
  });
});

describe('nextPendingAfter', () => {
  const complete = (id: number) => ({ indicator_id: id, target_value_sum: 2, actual_achieved_value_sum: 2 });
  const pending = (id: number) => ({ indicator_id: id, target_value_sum: 2, actual_achieved_value_sum: 0 });

  it('wraps to the first pending KPI when the current one is last in order', () => {
    const ordered = [pending(1), complete(2), pending(3)];

    expect(nextPendingAfter(3, ordered)).toEqual(pending(1));
  });

  it('returns the next pending KPI, skipping completed ones in between', () => {
    const ordered = [pending(1), complete(2), pending(3)];

    expect(nextPendingAfter(1, ordered)).toEqual(pending(3));
  });

  it('returns null when no pending KPI remains other than the current one', () => {
    const ordered = [pending(1), complete(2), complete(3)];

    expect(nextPendingAfter(1, ordered)).toBeNull();
  });

  it('returns null for an empty list', () => {
    expect(nextPendingAfter(1, [])).toBeNull();
  });

  it('S-8.1: never lands on a no-target row, including a reported 0/3 row', () => {
    const noTarget = { indicator_id: 2, target_value_sum: 0, actual_achieved_value_sum: 0 };
    const noTargetReported = { indicator_id: 3, target_value_sum: 0, actual_achieved_value_sum: 3 };
    const ordered = [pending(1), noTarget, noTargetReported, pending(4)];

    expect(nextPendingAfter(1, ordered)).toEqual(pending(4));
    expect(nextPendingAfter(4, ordered)).toEqual(pending(1));
  });
});

describe('countNewlyReported', () => {
  it('counts KPIs whose achieved value increased between prev and next, matched by id', () => {
    const prev = [
      { indicator_id: 1, actual_achieved_value_sum: 0 },
      { indicator_id: 2, actual_achieved_value_sum: 3 },
      { indicator_id: 3, actual_achieved_value_sum: 5 }
    ];
    const next = [
      { indicator_id: 1, actual_achieved_value_sum: 2 }, // increased -> counts
      { indicator_id: 2, actual_achieved_value_sum: 3 }, // unchanged -> not counted
      { indicator_id: 3, actual_achieved_value_sum: 1 } // decreased -> not counted
    ];

    expect(countNewlyReported(prev, next)).toBe(1);
  });

  it('ignores a KPI absent from prev — no baseline to diff against', () => {
    const prev = [{ indicator_id: 1, actual_achieved_value_sum: 0 }];
    const next = [
      { indicator_id: 1, actual_achieved_value_sum: 0 },
      { indicator_id: 2, actual_achieved_value_sum: 5 }
    ];

    expect(countNewlyReported(prev, next)).toBe(0);
  });

  it('coerces string-typed achieved values', () => {
    const prev = [{ indicator_id: 1, actual_achieved_value_sum: '2' }];
    const next = [{ indicator_id: 1, actual_achieved_value_sum: '5' }];

    expect(countNewlyReported(prev, next)).toBe(1);
  });
});

// ── KCR-TEST-1 (docs/specs/bugfix/kpi-count-reconciliation, KCR-T-1) ─────────────────────────
//
// `partitionProgramKpis` / `summarisePartition` — the count-once rule (KCR-R-1, KCR-R-1.1) and the
// program-wide totals every shell surface must agree with (KCR-R-3, R-8, R-9). Fixture is the
// requirements.md "Cross-cut IOs counted once (the SP01 case, reduced)" scenario, transcribed into
// the `indicatorsByAow()` bundle shape the helper consumes:
//
//   AoW A — 4 output KPIs, one of them zero-target, none reported
//   AoW B — 3 output KPIs (one reported, achieved 75) + 1 outcome node the payload marks
//           `is_aow: true` (1 KPI, not reported)
//   both  — the SAME 2 cross-cut outcome nodes (`is_aow: false`) carrying #901 and #902 (#902 is
//           zero-target); `indicatorsByAow` stamps those rows `__isIntermediateCrosscut: true`
//   IO bucket   — #901, #902     2030 bucket — #950
//
// Expected values are read off the scenario, not recomputed the way the helper does
// (anti-tautology): planned 11, no-target (`zeroTarget`) 2 (a4, #902), counted 9, reported 1.

/** An output-tier row as `indicatorsByAow` stamps it (`__isIntermediateCrosscut` is false there). */
const output = (id: string | number, target: number, achieved: number) => ({
  indicator_id: id,
  target_value_sum: target,
  actual_achieved_value_sum: achieved,
  __tier: 'output' as const,
  __isIntermediateCrosscut: false
});

/** An outcome-tier row. `crosscut: true` mirrors a payload group with `is_aow: false` (RES-R-3). */
const outcome = (id: string | number, target: number, achieved: number, crosscut: boolean) => ({
  indicator_id: id,
  target_value_sum: target,
  actual_achieved_value_sum: achieved,
  __tier: 'outcome' as const,
  __isIntermediateCrosscut: crosscut
});

const CROSSCUT_901 = () => outcome(901, 5, 0, true);
const CROSSCUT_902 = () => outcome(902, 0, 0, true); // zero-target

function scenarioBundles() {
  return [
    {
      aow: { code: 'A', name: 'Area A' },
      indicators: [
        output('a1', 10, 0),
        output('a2', 10, 0),
        output('a3', 10, 0),
        output('a4', 0, 0), // zero-target
        CROSSCUT_901(),
        CROSSCUT_902()
      ],
      loading: false
    },
    {
      aow: { code: 'B', name: 'Area B' },
      indicators: [
        output('b1', 10, 0),
        output('b2', 100, 75), // the only reported KPI in the whole fixture
        output('b3', 10, 0),
        outcome('b-own', 4, 0, false), // AoW-owned outcome (`is_aow: true`) — an AoW-own KPI
        CROSSCUT_901(),
        CROSSCUT_902()
      ],
      loading: false
    }
  ];
}

const scenarioIntermediate = () => ({ indicators: [outcome(901, 5, 0, true), outcome(902, 0, 0, true)], loading: false });
const scenario2030 = () => ({ indicators: [outcome(950, 3, 0, true)], loading: false });

describe('partitionProgramKpis (KCR-R-1)', () => {
  it('puts the cross-cut IO rows in neither AoW: A own = its 4 outputs, B own = 3 outputs + its owned outcome', () => {
    const partition = partitionProgramKpis(scenarioBundles(), scenarioIntermediate(), scenario2030());

    const a = partition.aowByCode.get('A')!;
    const b = partition.aowByCode.get('B')!;

    expect(a.own.map(i => i.indicator_id)).toEqual(['a1', 'a2', 'a3', 'a4']);
    expect(a.crosscut).toBe(2);
    expect(b.own.map(i => i.indicator_id)).toEqual(['b1', 'b2', 'b3', 'b-own']);
    expect(b.crosscut).toBe(2);
    // The cross-cuts live in the Intermediate bucket, once.
    expect(partition.intermediate.indicators.map(i => i.indicator_id)).toEqual([901, 902]);
    expect(partition.outcomes2030.indicators.map(i => i.indicator_id)).toEqual([950]);
  });

  it('every indicator_id lands in exactly one bucket (KCR-AC-1 last clause)', () => {
    const partition = partitionProgramKpis(scenarioBundles(), scenarioIntermediate(), scenario2030());

    const ids = [
      ...partition.aows.flatMap(entry => entry.own.map(i => i.indicator_id)),
      ...partition.intermediate.indicators.map(i => i.indicator_id),
      ...partition.outcomes2030.indicators.map(i => i.indicator_id)
    ];

    expect(ids).toHaveLength(11);
    expect(new Set(ids).size).toBe(11);
  });

  // KCR-R-1.1 — membership is decided from the payload's OWN `is_aow` stamp, never by matching
  // `indicator_id` against the Intermediate endpoint. Same id, two payloads, two verdicts.
  it('moves #901 into A own when A\'s payload marks it is_aow: true, while B still treats it as a cross-cut', () => {
    const bundles = scenarioBundles();
    bundles[0].indicators = bundles[0].indicators.map(ind =>
      ind.indicator_id === 901 ? outcome(901, 5, 0, false) : ind
    );

    const partition = partitionProgramKpis(bundles, scenarioIntermediate(), scenario2030());

    expect(partition.aowByCode.get('A')!.own.map(i => i.indicator_id)).toEqual(['a1', 'a2', 'a3', 'a4', 901]);
    expect(partition.aowByCode.get('A')!.crosscut).toBe(1);
    // B is untouched: the id is still cross-cut there, and the IO bucket still serves it.
    expect(partition.aowByCode.get('B')!.own.map(i => i.indicator_id)).toEqual(['b1', 'b2', 'b3', 'b-own']);
    expect(partition.intermediate.indicators.map(i => i.indicator_id)).toEqual([901, 902]);
  });

  it('deduplicates a bucket by indicator_id, keeping the first occurrence', () => {
    const first = outcome(901, 5, 0, true);
    const repeat = outcome(901, 5, 0, true);
    const partition = partitionProgramKpis([], { indicators: [first, repeat, outcome(902, 0, 0, true)] }, null);

    expect(partition.intermediate.indicators).toHaveLength(2);
    expect(partition.intermediate.indicators[0]).toBe(first);
  });

  it('carries each AoW and bucket loading flag through, and exposes aowByCode keyed by code', () => {
    const partition = partitionProgramKpis(
      [{ aow: { code: 'A', name: 'Area A' }, indicators: [], loading: true }],
      { indicators: [], loading: true },
      { indicators: [], loading: false }
    );

    expect(partition.aowByCode.get('A')).toBe(partition.aows[0]);
    expect(partition.aows[0].loading).toBe(true);
    expect(partition.intermediate.loading).toBe(true);
    expect(partition.outcomes2030.loading).toBe(false);
  });

  it('returns empty buckets for null/undefined inputs — no throw', () => {
    const partition = partitionProgramKpis(null, null, undefined);

    expect(partition.aows).toEqual([]);
    expect(partition.aowByCode.size).toBe(0);
    expect(partition.intermediate).toEqual({ indicators: [], loading: false });
    expect(partition.outcomes2030).toEqual({ indicators: [], loading: false });
  });
});

describe('summarisePartition (KCR-R-2 / R-8 / R-9)', () => {
  it('reads the requirements fixture as planned 11, no-target 2, counted 9, reported 1', () => {
    const partition = partitionProgramKpis(scenarioBundles(), scenarioIntermediate(), scenario2030());

    // Hand-counted from the scenario: A 4 + B 4 + IO 2 + 2030 1 = 11 planned; reported = b2 only.
    expect(summarisePartition(partition)).toEqual({ planned: 11, zeroTarget: 2, counted: 9, reported: 1 });
  });

  it('counts reported from achieved > 0 alone — a progress_percentage string never makes a KPI reported (KCR-R-9)', () => {
    const zeroAchievedButPercentString = {
      ...output('p1', 10, 0),
      progress_percentage: '1500%'
    } as ReturnType<typeof output> & { progress_percentage: string };
    const partition = partitionProgramKpis([{ aow: { code: 'A' }, indicators: [zeroAchievedButPercentString] }], null, null);

    expect(summarisePartition(partition)).toEqual({ planned: 1, zeroTarget: 0, counted: 1, reported: 0 });
  });
});

// DKT-T-1 (docs/specs/changes/reporting-dynamic-kpi-target-counts) - DKT-DD-2: numeric target sum.
describe('sumTargetValues (DKT-R-2)', () => {
  const t = (v: unknown) => ({ target_value_sum: v });

  it('adds numeric strings as numbers, never concatenating ("9" + "100" = "109")', () => {
    expect(sumTargetValues([t('9'), t('100')])).toBe('109');
  });

  it('treats null, empty and non-numeric terms as 0', () => {
    expect(sumTargetValues([t(null), t(''), t('abc')])).toBe('0');
  });

  it('formats a fractional sum with one decimal, like the per-HLO TARGET', () => {
    expect(sumTargetValues([t('1.25'), t('1')])).toBe('2.3');
  });

  it('returns "0" for empty or missing input', () => {
    expect(sumTargetValues([])).toBe('0');
    expect(sumTargetValues(null)).toBe('0');
  });
});
