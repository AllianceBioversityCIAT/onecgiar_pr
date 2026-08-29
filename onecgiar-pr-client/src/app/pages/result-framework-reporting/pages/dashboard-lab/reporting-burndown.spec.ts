import {
  applyZeroTargetRule,
  countNewlyReported,
  groupPendingCount,
  nextPendingAfter,
  pendingOf,
  sortRemainingFirst
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
