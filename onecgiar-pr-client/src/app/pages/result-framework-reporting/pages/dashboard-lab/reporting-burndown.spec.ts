import {
  applyZeroTargetRule,
  countNewlyReported,
  groupPendingCount,
  nextPendingAfter,
  partitionProgramKpis,
  pendingOf,
  sortRemainingFirst,
  summarisePartition
} from './reporting-burndown';

// MRF-TEST-1 (docs/specs/changes/mass-reporting-flow/tasks.md, MRF-T-1) — pure burn-down helpers
// and the centralised zero-target rule (MRF-R-7, MRF-AC-6). Every fixture below varies target and
// achieved independently (disqualifier: reusing the same value for both cannot distinguish the
// zero-target rule from the completion rule).

describe('applyZeroTargetRule', () => {
  it('excludes 3 of 10 KPIs (target=0 AND achieved=0), leaving denominators at 7 (MRF-AC-6)', () => {
    const inds = [
      { indicator_id: 1, target_value_sum: 0, actual_achieved_value_sum: 0 }, // zero-target
      { indicator_id: 2, target_value_sum: 0, actual_achieved_value_sum: 0 }, // zero-target
      { indicator_id: 3, target_value_sum: 0, actual_achieved_value_sum: 0 }, // zero-target
      { indicator_id: 4, target_value_sum: 5, actual_achieved_value_sum: 5 }, // complete
      { indicator_id: 5, target_value_sum: 5, actual_achieved_value_sum: 2 }, // in-progress
      { indicator_id: 6, target_value_sum: 5, actual_achieved_value_sum: 0 }, // not-started
      { indicator_id: 7, target_value_sum: 3, actual_achieved_value_sum: 3 }, // complete
      { indicator_id: 8, target_value_sum: 10, actual_achieved_value_sum: 1 }, // in-progress
      { indicator_id: 9, target_value_sum: 0, actual_achieved_value_sum: 4 }, // achieved without target
      { indicator_id: 10, target_value_sum: 2, actual_achieved_value_sum: 0 } // not-started
    ];

    const { counted, zeroTarget } = applyZeroTargetRule(inds);

    expect(zeroTarget).toBe(3);
    expect(counted.map(i => i.indicator_id)).toEqual([4, 5, 6, 7, 8, 9, 10]);
  });

  it('keeps a KPI with achieved reported but no target — achieved-without-target still counts', () => {
    const ind = { indicator_id: 1, actual_achieved_value_sum: 4 };

    const { counted, zeroTarget } = applyZeroTargetRule([ind]);

    expect(zeroTarget).toBe(0);
    expect(counted).toEqual([ind]);
  });

  it('coerces string-typed numeric fixtures for both target and achieved', () => {
    const zeroTargetString = { indicator_id: 1, target_value_sum: '0', actual_achieved_value_sum: '0' };
    const countedString = { indicator_id: 2, target_value_sum: '4', actual_achieved_value_sum: '2' };

    const { counted, zeroTarget } = applyZeroTargetRule([zeroTargetString, countedString]);

    expect(zeroTarget).toBe(1);
    expect(counted).toEqual([countedString]);
  });
});

describe('pendingOf', () => {
  it('applies the MRF-R-1/R-7 precedence: a zero-target KPI is excluded even though its raw achieved/target reads as not-started', () => {
    const inds = [
      { indicator_id: 1, target_value_sum: 0, actual_achieved_value_sum: 0 }, // zero-target — must be excluded
      { indicator_id: 2, target_value_sum: 5, actual_achieved_value_sum: 0 }, // real not-started — stays visible
      { indicator_id: 3, target_value_sum: 5, actual_achieved_value_sum: 2 }, // in-progress — stays visible
      { indicator_id: 4, target_value_sum: 5, actual_achieved_value_sum: 5 } // complete — hidden
    ];

    expect(pendingOf(inds).map(i => i.indicator_id)).toEqual([2, 3]);
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

  // MRF-T-2 Leader decision (T-1 review, binding): a zero-target KPI ranks with `not-started` by
  // default (its raw achieved/target reading), but LAST — after `complete` — when the caller opts
  // into `zeroTargetLast` (Only-pending off, sort = Remaining work).
  describe('zeroTargetLast option', () => {
    const zeroTarget = (id: string) => ({ indicator_id: id, target_value_sum: 0, actual_achieved_value_sum: 0 });
    const notStarted = (id: string) => ({ indicator_id: id, target_value_sum: 5, actual_achieved_value_sum: 0 });
    const inProgress = (id: string) => ({ indicator_id: id, target_value_sum: 5, actual_achieved_value_sum: 2 });
    const complete = (id: string) => ({ indicator_id: id, target_value_sum: 5, actual_achieved_value_sum: 5 });

    it('without the option, ranks a zero-target KPI with not-started (its raw reading)', () => {
      const catalogue = [complete('A'), zeroTarget('B'), inProgress('C'), notStarted('D')];

      const sorted = sortRemainingFirst(catalogue);

      expect(sorted.map(i => i.indicator_id)).toEqual(['B', 'D', 'C', 'A']);
    });

    it('with zeroTargetLast, ranks a zero-target KPI after complete instead of with not-started', () => {
      const catalogue = [complete('A'), zeroTarget('B'), inProgress('C'), notStarted('D')];

      const sorted = sortRemainingFirst(catalogue, { zeroTargetLast: true });

      expect(sorted.map(i => i.indicator_id)).toEqual(['D', 'C', 'A', 'B']);
    });

    it('keeps multiple zero-target KPIs stable relative to each other, both last', () => {
      const catalogue = [zeroTarget('B1'), notStarted('D'), zeroTarget('B2')];

      const sorted = sortRemainingFirst(catalogue, { zeroTargetLast: true });

      expect(sorted.map(i => i.indicator_id)).toEqual(['D', 'B1', 'B2']);
    });
  });
});

describe('groupPendingCount', () => {
  it('counts pending KPIs within a group, applying the zero-target rule', () => {
    const group = {
      indicators: [
        { indicator_id: 1, target_value_sum: 0, actual_achieved_value_sum: 0 }, // zero-target, excluded
        { indicator_id: 2, target_value_sum: 5, actual_achieved_value_sum: 5 }, // complete, excluded
        { indicator_id: 3, target_value_sum: 5, actual_achieved_value_sum: 1 } // pending
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
// (anti-tautology): planned 11, zero-target 2, counted 9, reported 1.

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
  it('reads the requirements fixture as planned 11, zeroTarget 2, counted 9, reported 1', () => {
    const partition = partitionProgramKpis(scenarioBundles(), scenarioIntermediate(), scenario2030());

    // Hand-counted from the scenario, NOT from the helper: A 4 + B 4 + IO 2 + 2030 1 = 11 planned;
    // zero-target = a4 and #902; counted = 9; reported = b2 (achieved 75) only.
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
