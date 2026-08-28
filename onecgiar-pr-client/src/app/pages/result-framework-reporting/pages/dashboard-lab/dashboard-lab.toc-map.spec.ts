import { buildTocMapModel, TocMapBucketInput, TocMapBuildInput, TocMapNodeInput } from './dashboard-lab.toc-map';

/**
 * Minimal, deterministic stand-in for `dashboard-lab.component.ts`'s `splitGroupTitle` — this
 * file's own parsing rules are NOT under test here (that regex lives on the component and is
 * exercised by its own spec); we only need SOME parser to prove `buildTocMapModel` consumes it
 * as a caller-supplied function rather than hardcoding one.
 */
function parseTitle(title: string | null | undefined): { code: string | null; name: string } {
  const text = String(title ?? '').trim();
  const match = /^([\w.]+)\s*[-–:]\s*(.+)$/.exec(text);
  return match ? { code: match[1], name: match[2] } : { code: null, name: text };
}

function indicator(target: number, achieved: number) {
  return { target_value_sum: target, actual_achieved_value_sum: achieved };
}

function node(overrides: Partial<TocMapNodeInput> & { toc_result_id: string }): TocMapNodeInput {
  return {
    category: 'OUTPUT',
    result_title: overrides.toc_result_id,
    is_aow: true,
    indicators: [],
    ...overrides
  };
}

/**
 * Independent re-derivation of `overviewAowProgress`'s rule (dashboard-lab.component.ts:944) over
 * ONLY output-tier nodes — the same fixture's OTHER source of truth for "Progress by area of
 * work". Kept deliberately separate from `buildTocMapModel` (never calls it) so the agreement
 * assertion below is not tautological: two independent computations over the same raw data.
 */
function aowCardRow(bucket: TocMapBucketInput | undefined) {
  const indicators = (bucket?.outputs ?? []).flatMap(n => n.indicators ?? []);
  const done = indicators.filter(i => Number(i.actual_achieved_value_sum ?? 0) > 0).length;
  return { done, total: indicators.length };
}

describe('buildTocMapModel (TCM-T-1)', () => {
  const baseInput = (): TocMapBuildInput => {
    const aow01Bucket: TocMapBucketInput = {
      outputs: [
        node({ toc_result_id: 'A1', indicators: [indicator(6, 0), indicator(2, 5)] }), // done 1/2
        node({ toc_result_id: 'A2', indicators: [indicator(4, 0)] }), // done 0/1
        node({ toc_result_id: 'A3', indicators: [] }), // total === 0 → structural
        // Closes the attempt-1 fixture hole (Reviewer FAIL): an output-tier (HLO) node with
        // is_aow: false and one with is_aow ABSENT entirely. Per `overviewAowProgress`
        // (dashboard-lab.component.ts:944) and `indicatorsByAow`'s `fromTier` (:1636), the AoW
        // card's output-tier sum applies NO `is_aow` filter — these two must stay on AOW01's
        // branch and count toward its done/total, exactly like A1-A3.
        node({ toc_result_id: 'A4', is_aow: false, indicators: [indicator(7, 3), indicator(2, 0)] }), // done 1/2
        node({ toc_result_id: 'A5', is_aow: undefined, indicators: [indicator(5, 0)] }) // done 0/1, is_aow absent
      ],
      outcomes: [
        node({
          toc_result_id: 'SHARED-1',
          category: 'OUTCOME',
          result_title: 'Shared intermediate outcome',
          is_aow: false,
          indicators: [indicator(20, 5)]
        }),
        node({
          toc_result_id: 'IO-A1',
          category: 'OUTCOME',
          result_title: 'HLO9.AOW1.IO1 - Owned outcome for AOW01',
          is_aow: true,
          indicators: [indicator(10, 0)]
        })
      ]
    };

    const aow02Bucket: TocMapBucketInput = {
      outputs: [
        node({ toc_result_id: 'B1', indicators: [indicator(10, 4), indicator(5, 0), indicator(3, 2), indicator(8, 0)] }),
        node({ toc_result_id: 'B2', indicators: [indicator(1, 0), indicator(2, 9), indicator(4, 0)] })
      ],
      outcomes: [
        // Same shared node, same id, repeated verbatim under a second AoW (the payload's own
        // documented behavior, proposal §12) — must dedupe to ONE Program-level leaf.
        node({
          toc_result_id: 'SHARED-1',
          category: 'OUTCOME',
          result_title: 'Shared intermediate outcome',
          is_aow: false,
          indicators: [indicator(20, 5)]
        })
      ]
    };

    return {
      spCode: 'SP01',
      spName: 'Science Program One',
      // Reverse order on purpose — the builder must sort by code itself.
      aows: [
        { code: 'AOW02', name: 'Area of Work 2' },
        { code: 'AOW01', name: 'Area of Work 1' },
        { code: 'AOW03', name: 'Area of Work 3' } // no bucket at all → must be omitted
      ],
      tocByAow: new Map([
        ['AOW01', aow01Bucket],
        ['AOW02', aow02Bucket]
      ]),
      intermediateOutcomes: { outputs: [node({ toc_result_id: 'IO-PROGRAM-1', indicators: [indicator(5, 5)] })] },
      // omitted → the "2030 outcomes" branch must not appear
      outcomes2030: null,
      parseTitle
    };
  };

  it('dedupes a shared is_aow:false node repeated under 2 AoWs into exactly one Program-level leaf', () => {
    const model = buildTocMapModel(baseInput())!;
    const programBranch = model.branches.find(b => b.kind === 'program')!;

    expect(programBranch).toBeDefined();
    expect(programBranch.leaves.filter(l => l.code === 'SHARED-1' || l.title.includes('Shared intermediate'))).toHaveLength(1);
    expect(programBranch.leaves).toHaveLength(1);
  });

  it('sharedness is scoped to the OUTCOME tier: dedupe only ever pulls from outcomes, output-tier nodes always stay on their AoW regardless of is_aow', () => {
    const model = buildTocMapModel(baseInput())!;
    const aow01 = model.branches.find(b => b.kind === 'aow' && b.code === 'AOW01')!;
    const aow02 = model.branches.find(b => b.kind === 'aow' && b.code === 'AOW02')!;
    const programBranch = model.branches.find(b => b.kind === 'program')!;

    // The shared OUTCOME-tier node never leaks into either AoW branch.
    expect(aow01.leaves.some(l => l.title.includes('Shared intermediate'))).toBe(false);
    expect(aow02.leaves.some(l => l.title.includes('Shared intermediate'))).toBe(false);
    // AOW01 still owns its own outcome-tier IO (is_aow: true) as a leaf.
    expect(aow01.leaves.some(l => l.title.includes('Owned outcome for AOW01'))).toBe(true);

    // A4 (is_aow: false) and A5 (is_aow absent) are OUTPUT-tier — they must NOT be treated as
    // dedupe candidates: they stay on AOW01's branch (all 5 output nodes present) and the
    // Program-level branch gets no output-tier leaf at all (only the shared OUTCOME node).
    expect(aow01.leaves.filter(l => l.level === 'OUTPUT')).toHaveLength(5);
    expect(programBranch.leaves.every(l => l.level !== 'OUTPUT')).toBe(true);
  });

  it('computes distinct, exact done/total per AoW that AGREE with the independent AoW-card rule', () => {
    const input = baseInput();
    const model = buildTocMapModel(input)!;
    const aow01 = model.branches.find(b => b.kind === 'aow' && b.code === 'AOW01')!;
    const aow02 = model.branches.find(b => b.kind === 'aow' && b.code === 'AOW02')!;

    // Exact values (not "is a number") — AOW01: A1(1/2)+A2(0/1)+A3(0/0)+A4(1/2)+A5(0/1) = 2/6.
    // A4/A5 are the attempt-1 fixture hole: is_aow:false / absent output-tier nodes. Under the
    // REJECTED attempt-1 partition (both tiers filtered by is_aow:true) these two would have been
    // stripped from the AoW branch entirely, making this assertion read 1/3 instead of 2/6 — this
    // is the red-on-old / green-on-fix proof the review demanded.
    expect(aow01.done).toBe(2);
    expect(aow01.total).toBe(6);
    // AOW02: 3 of 7 (mirrors the requirements.md TCM-R-3 "3/7" worked example).
    expect(aow02.done).toBe(3);
    expect(aow02.total).toBe(7);
    // Distinct per AoW (asymmetric fixture).
    expect(aow01.done).not.toBe(aow02.done);
    expect(aow01.total).not.toBe(aow02.total);

    // Same fixture through the independent AoW-card derivation (`aowCardRow` applies NO `is_aow`
    // filter, matching `overviewAowProgress` exactly) — must be identical, both AoWs. This is the
    // agreement assertion attempt-1 passed vacuously (every node defaulted `is_aow: true`); A4/A5
    // now carry the axis that exposes a wrong partition.
    const card01 = aowCardRow(input.tocByAow instanceof Map ? input.tocByAow.get('AOW01') : undefined);
    const card02 = aowCardRow(input.tocByAow instanceof Map ? input.tocByAow.get('AOW02') : undefined);
    expect(aow01.done).toBe(card01.done);
    expect(aow01.total).toBe(card01.total);
    expect(aow02.done).toBe(card02.done);
    expect(aow02.total).toBe(card02.total);

    // The AoW-owned outcome-tier IO (target 10, achieved 0) does NOT get folded into the branch's
    // own done/total (that would break the agreement above) — only into the leaf-level Σ figures.
    expect(aow01.target).toBe(6 + 2 + 4 + 7 + 2 + 5 + 10);
    expect(aow01.achieved).toBe(0 + 5 + 0 + 3 + 0 + 0 + 0);
  });

  it('renders a 0-indicator node as a structural leaf: total 0, done 0, never NaN', () => {
    const model = buildTocMapModel(baseInput())!;
    const aow01 = model.branches.find(b => b.kind === 'aow' && b.code === 'AOW01')!;
    const structural = aow01.leaves.find(l => l.total === 0)!;

    expect(structural).toBeDefined();
    expect(structural.done).toBe(0);
    expect(Number.isNaN(structural.done)).toBe(false);
    expect(Number.isNaN(structural.total)).toBe(false);
    expect(Number.isNaN(structural.target)).toBe(false);
    expect(Number.isNaN(structural.achieved)).toBe(false);
  });

  it('omits an AoW branch with no ToC nodes at all, and omits the empty "2030 outcomes" bucket', () => {
    const model = buildTocMapModel(baseInput())!;
    expect(model.branches.some(b => b.kind === 'aow' && b.code === 'AOW03')).toBe(false);
    expect(model.branches.some(b => b.kind === '2030')).toBe(false);
    // The non-empty program-level bucket still renders.
    expect(model.branches.some(b => b.kind === 'intermediate')).toBe(true);
  });

  it('orders branches: AoWs by code, then Program-level, then Intermediate outcomes, then 2030 outcomes', () => {
    const model = buildTocMapModel(baseInput())!;
    expect(model.branches.map(b => `${b.kind}:${b.code}`)).toEqual([
      'aow:AOW01',
      'aow:AOW02',
      'program:PROGRAM',
      'intermediate:intermediate-outcomes'
    ]);
  });

  it('null input → null model, no throw', () => {
    expect(() => buildTocMapModel(null)).not.toThrow();
    expect(buildTocMapModel(null)).toBeNull();
    expect(buildTocMapModel(undefined)).toBeNull();
  });

  it('fully empty program (no AoWs, no program-level buckets) → null model, no throw', () => {
    const empty: TocMapBuildInput = {
      spCode: 'SP02',
      spName: 'Empty Program',
      aows: [],
      tocByAow: new Map(),
      parseTitle
    };
    expect(() => buildTocMapModel(empty)).not.toThrow();
    expect(buildTocMapModel(empty)).toBeNull();
  });

  it('an SP with AoWs but zero ToC nodes loaded (loading/empty buckets) → null model, no throw', () => {
    const loading: TocMapBuildInput = {
      spCode: 'SP03',
      spName: 'Loading Program',
      aows: [{ code: 'AOW01', name: 'Area of Work 1' }],
      tocByAow: new Map(),
      parseTitle
    };
    expect(() => buildTocMapModel(loading)).not.toThrow();
    expect(buildTocMapModel(loading)).toBeNull();
  });

  it('tolerates malformed nodes (missing id/title/indicators) without throwing', () => {
    const malformed: TocMapBuildInput = {
      spCode: 'SP04',
      spName: 'Malformed Program',
      aows: [{ code: 'AOW01', name: 'Area of Work 1' }],
      tocByAow: new Map([
        [
          'AOW01',
          {
            outputs: [{ is_aow: true } as TocMapNodeInput],
            outcomes: [{ is_aow: false } as TocMapNodeInput]
          }
        ]
      ]),
      parseTitle
    };
    expect(() => buildTocMapModel(malformed)).not.toThrow();
    const model = buildTocMapModel(malformed)!;
    expect(model).not.toBeNull();
  });

  it('accepts tocByAow as a plain Record, not only a Map', () => {
    const input = baseInput();
    const record: Record<string, TocMapBucketInput> = {};
    (input.tocByAow as Map<string, TocMapBucketInput>).forEach((value, key) => (record[key] = value));
    const model = buildTocMapModel({ ...input, tocByAow: record })!;
    expect(model.branches.some(b => b.kind === 'aow' && b.code === 'AOW01')).toBe(true);
  });

  it('overrides the default Intermediate/2030 branch code+name when the caller supplies a label', () => {
    const input = baseInput();
    const model = buildTocMapModel({
      ...input,
      intermediateOutcomesLabel: { code: 'io-custom', name: 'Custom intermediate label' }
    })!;
    const branch = model.branches.find(b => b.kind === 'intermediate')!;
    expect(branch.code).toBe('io-custom');
    expect(branch.name).toBe('Custom intermediate label');
  });
});
