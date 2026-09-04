// @akili-spec changes/overview-toc-map
//
// Pure model builder — no DOM, no signals, no injection, no imports from `dashboard-lab.component.ts`
// or `program-overview/**` (folder invariant: parent owns data, this file only shapes it). The
// caller (a later task's `overviewTocMap` computed in `dashboard-lab.component.ts`) feeds the
// already-loaded `tocByKey` slice for the current SP plus the component's own `splitGroupTitle`
// as `parseTitle` — this file never refetches and never parses titles itself (TCM-R-2).
//
// Shape mirrors `program-overview.charts.ts`'s pure-builder pattern: plain data in, plain data out.
//
// `reporting-burndown` is the one exception to the import rule above, and deliberately so: it is a
// pure, Angular-free sibling and the SINGLE home of the zero-target rule (MRF-R-7, KCR-DD-1). The
// map calling `buildRatio` is what makes its node figures the same numbers the hero row shows
// (`bugfix/kpi-count-reconciliation`, KCR-DD-5) instead of a second copy of the arithmetic.

import { buildRatio } from './reporting-burndown';

/** Raw shape of one indicator entry as it arrives on a `TocResultResponse.indicators[]` node. */
export interface TocMapIndicatorInput {
  target_value_sum?: number | string | null;
  actual_achieved_value_sum?: number | string | null;
}

/** Raw shape of one ToC node (`TocResultResponse`) as stored in `tocByKey`'s `outputs`/`outcomes`. */
export interface TocMapNodeInput {
  toc_result_id?: number | string | null;
  category?: string | null;
  result_title?: string | null;
  is_aow?: boolean | null;
  indicators?: TocMapIndicatorInput[] | null;
}

/** One `tocByKey` bucket — the output/outcome tier split `loadToc` stores per key. */
export interface TocMapBucketInput {
  outputs?: TocMapNodeInput[] | null;
  outcomes?: TocMapNodeInput[] | null;
}

/** Minimal AoW shape the model needs (code + display name — the `Unit` the Overview already has). */
export interface TocMapAowInput {
  code: string;
  name: string;
}

export type TocBranchKind = 'aow' | 'program' | 'intermediate' | '2030';

/** One rendered leaf (an HLO/IO/program-level ToC node) under a branch. */
export interface TocLeaf {
  code: string | null;
  title: string;
  /** Raw `category` passed through as-is (`'OUTPUT' | 'OUTCOME' | 'EOI'` on the wire, or `''`). */
  level: string;
  /** *Planned*: every indicator on the node, zero-target ones included (KCR-DD-5). */
  indicators: number;
  target: number;
  achieved: number;
  /** AoW-card rule: counted indicators with `actual_achieved_value_sum > 0`. */
  done: number;
  /**
   * AoW-card rule: *Counted* — indicators minus the zero-target ones (`buildRatio`, KCR-DD-5), so
   * this equals the hero row's denominator. `0` → nothing countable here, no ratio is shown.
   */
  total: number;
}

/** One branch of the radial tree: an AoW, the deduped "Program-level" bucket, or a program-level outcome bucket. */
export interface TocBranch {
  kind: TocBranchKind;
  code: string;
  name: string;
  /**
   * `done`/`total` for the BRANCH's own node (not a rollup of every leaf below). For `kind: 'aow'`
   * these sum ALL of the branch's leaves — its output-tier (HLO) leaves plus the outcome leaves the
   * payload marked `is_aow: true` — which is exactly the AoW-own set `overviewAowProgress` now
   * counts (`bugfix/kpi-count-reconciliation` KCR-R-5 / KCR-DD-2, superseding TCM-R-3's
   * "counts ONLY output-tier" wording), so the AoW's node in the map can never disagree with
   * "Progress by area of work" (TCM-R-3's actual MUST). The leaf list already excludes cross-cut
   * program nodes, so "all its leaves" and "the AoW-own set" are the same rows. Every other branch
   * kind rolls up across all its leaves too.
   */
  done: number;
  total: number;
  /** Σ across every leaf under this branch (all tiers) — tooltip/table figures, not tied to the AoW-card rule. */
  target: number;
  achieved: number;
  leaves: TocLeaf[];
}

export interface TocMapModel {
  spCode: string;
  spName: string;
  branches: TocBranch[];
}

/** `{code, name}` override for a program-level bucket's branch identity. */
export interface TocMapBucketLabel {
  code: string;
  name: string;
}

export interface TocMapBuildInput {
  spCode: string | null | undefined;
  spName: string | null | undefined;
  aows: TocMapAowInput[] | null | undefined;
  /** Per-AoW ToC bucket keyed by AoW code — the `tocByKey` slice for the current SP (`${sp}::${aow.code}`). */
  tocByAow: Map<string, TocMapBucketInput | undefined | null> | Record<string, TocMapBucketInput | undefined | null> | null | undefined;
  /** Program-level "Intermediate outcomes" bucket (dedicated endpoint; flat list lands in `outputs`). */
  intermediateOutcomes?: TocMapBucketInput | null;
  /** Program-level "2030 outcomes" bucket. */
  outcomes2030?: TocMapBucketInput | null;
  /** Parses a node's `result_title` — pass the caller's `splitGroupTitle`, kept out of this pure file. */
  parseTitle: (title: string | null | undefined) => { code: string | null; name: string };
  /** Override the default code/name for the "Intermediate outcomes" branch. */
  intermediateOutcomesLabel?: TocMapBucketLabel;
  /** Override the default code/name for the "2030 outcomes" branch. */
  outcomes2030Label?: TocMapBucketLabel;
}

const PROGRAM_BRANCH_LABEL: TocMapBucketLabel = { code: 'PROGRAM', name: 'Program-level' };
// Match dashboard-lab.component.ts's own constants (not imported — this file stays import-free of
// the component) so a caller that doesn't override the label still lines up with the app's codes.
const DEFAULT_INTERMEDIATE_LABEL: TocMapBucketLabel = { code: 'intermediate-outcomes', name: 'Intermediate outcomes' };
const DEFAULT_2030_LABEL: TocMapBucketLabel = { code: '2030-outcomes', name: '2030 outcomes' };

function toNum(value: unknown): number {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? ''));
  return Number.isFinite(n) ? n : 0;
}

/**
 * `done`/`total` are card-exact because they come from the SAME function the card calls:
 * `buildRatio` (`reporting-burndown.ts`), which applies the zero-target rule (`target = 0 AND
 * achieved = 0` — MRF-R-7) and counts `done` as `achieved > 0`. `KCR-DD-5`: the leaf used to count
 * every indicator, so a node with zero-target KPIs read a larger `total` than the hero row TCM-R-3
 * pins it to. `leaf.indicators` deliberately keeps the PLANNED count — planned and counted are two
 * different figures and the map states both. `toNum`/`parseFloat` stay for the Σtarget/Σachieved
 * sums, which have no equivalent card rule.
 *
 * @akili-spec bugfix/kpi-count-reconciliation
 */
function buildLeaf(node: TocMapNodeInput, parseTitle: TocMapBuildInput['parseTitle']): TocLeaf {
  const parsed = parseTitle(node?.result_title);
  const indicators = node?.indicators ?? [];
  const target = indicators.reduce((sum, i) => sum + toNum(i?.target_value_sum), 0);
  const achieved = indicators.reduce((sum, i) => sum + toNum(i?.actual_achieved_value_sum), 0);
  const { done, total } = buildRatio(indicators);

  return {
    code: parsed.code,
    title: parsed.name,
    level: node?.category ?? '',
    indicators: indicators.length,
    target,
    achieved,
    done,
    total
  };
}

function getBucket(
  map: TocMapBuildInput['tocByAow'],
  key: string
): TocMapBucketInput | undefined | null {
  if (!map) return undefined;
  if (map instanceof Map) return map.get(key);
  return (map as Record<string, TocMapBucketInput | undefined | null>)[key];
}

function sumBy(leaves: TocLeaf[], pick: (leaf: TocLeaf) => number): number {
  return leaves.reduce((sum, leaf) => sum + pick(leaf), 0);
}

/** Builds a branch from a single already-flat program-level bucket (Intermediate/2030 outcomes). */
function buildProgramLevelBranch(
  bucket: TocMapBucketInput | null | undefined,
  kind: 'intermediate' | '2030',
  defaultLabel: TocMapBucketLabel,
  overrideLabel: TocMapBucketLabel | undefined,
  parseTitle: TocMapBuildInput['parseTitle']
): TocBranch | null {
  const nodes = [...(bucket?.outputs ?? []), ...(bucket?.outcomes ?? [])];
  if (!nodes.length) return null;

  const leaves = nodes.map(node => buildLeaf(node, parseTitle));
  const label = overrideLabel ?? defaultLabel;

  return {
    kind,
    code: label.code,
    name: label.name,
    done: sumBy(leaves, l => l.done),
    total: sumBy(leaves, l => l.total),
    target: sumBy(leaves, l => l.target),
    achieved: sumBy(leaves, l => l.achieved),
    leaves
  };
}

/**
 * Builds the `TocMapModel` for the Theory-of-Change map (`TCM-R-2`/`TCM-R-3`). Pure: consumes the
 * ALREADY-LOADED `tocByKey`/units data the Overview holds (no HTTP, no throw), owns dedupe of
 * shared `is_aow: false` nodes into ONE "Program-level" branch (`TCM-DD-5`), and mirrors the exact
 * `overviewAowProgress` counting rule for each AoW branch's own progress (`TCM-DD-4`/TCM-R-3).
 *
 * Branch order: AoWs by code → "Program-level" → "Intermediate outcomes" → "2030 outcomes"
 * (`OQ-2`); a branch with zero leaves is omitted. `null`/empty inputs → `null` (no chart, no throw).
 */
export function buildTocMapModel(input: TocMapBuildInput | null | undefined): TocMapModel | null {
  if (!input) return null;

  const spCode = input.spCode ?? '';
  const spName = input.spName ?? '';
  const aows = input.aows ?? [];
  const { parseTitle } = input;

  const orderedAows = [...aows].sort((a, b) => a.code.localeCompare(b.code));

  // Dedupe pool for shared (`is_aow` not strictly `true`) nodes — first AoW to surface a given
  // `toc_result_id` wins, so the same node repeated under every AoW lands here exactly once
  // (`TCM-DD-5`). Falls back to `result_title` when a node carries no id.
  const programNodesByKey = new Map<string, TocMapNodeInput>();
  const rememberProgramNode = (node: TocMapNodeInput): void => {
    const key = String(node?.toc_result_id ?? node?.result_title ?? '');
    if (!key || programNodesByKey.has(key)) return;
    programNodesByKey.set(key, node);
  };

  const aowBranches: TocBranch[] = orderedAows
    .map(aow => {
      const bucket = getBucket(input.tocByAow, aow.code) ?? {};
      const outputs = bucket?.outputs ?? [];
      const outcomes = bucket?.outcomes ?? [];

      // TCM-R-2's "AoW branches contain only is_aow: true nodes" clause is scoped to the OUTCOME
      // tier (requirements.md's TCM-T-1 execution note — matching the codebase's own definition of
      // "shared": `indicatorsByAow`'s `__isIntermediateCrosscut` stamp, dashboard-lab.component.ts,
      // is `tier === 'outcome' && g?.is_aow !== true` — OUTCOME tier only). Output-tier (HLO) nodes
      // ALWAYS stay on their AoW branch regardless of `is_aow`, because `overviewAowProgress`
      // (`:944`) sums `toc?.outputs` with NO `is_aow` filter at all — filtering outputs here would
      // silently disagree with the AoW card (TCM-R-3's "can never disagree" MUST; caught in review
      // on attempt 1, where both tiers were filtered and the fixture had no `is_aow: false`/absent
      // output node to expose it).
      const ownedOutcomeNodes = outcomes.filter(node => {
        const owned = node?.is_aow === true;
        if (!owned) rememberProgramNode(node);
        return owned;
      });

      const outputLeaves = outputs.map(node => buildLeaf(node, parseTitle));
      const outcomeLeaves = ownedOutcomeNodes.map(node => buildLeaf(node, parseTitle));
      const leaves = [...outputLeaves, ...outcomeLeaves];

      // TCM-R-3: the AoW node's OWN done/total must equal "Progress by area of work" for this AoW
      // (`overviewAowProgress`), which counts the AoW-**own** set — output-tier (HLO) indicators
      // PLUS the outcome nodes the payload marked `is_aow: true` (KCR-R-5, KCR-DD-2; the earlier
      // output-tier-only rule left an owned outcome out of the node but in the card). `leaves` is
      // that set already: the cross-cut nodes were routed to the program pool above.
      const branch: TocBranch = {
        kind: 'aow',
        code: aow.code,
        name: aow.name,
        done: sumBy(leaves, l => l.done),
        total: sumBy(leaves, l => l.total),
        target: sumBy(leaves, l => l.target),
        achieved: sumBy(leaves, l => l.achieved),
        leaves
      };
      return branch;
    })
    .filter(branch => branch.leaves.length > 0);

  const intermediateBranch = buildProgramLevelBranch(
    input.intermediateOutcomes,
    'intermediate',
    DEFAULT_INTERMEDIATE_LABEL,
    input.intermediateOutcomesLabel,
    parseTitle
  );
  const outcomes2030Branch = buildProgramLevelBranch(
    input.outcomes2030,
    '2030',
    DEFAULT_2030_LABEL,
    input.outcomes2030Label,
    parseTitle
  );

  // `KCR-R-5.1` / `KCR-DD-7` — the deduplicated "Program-level" branch (TCM-DD-5) is built from the
  // `is_aow !== true` nodes the AoW payloads repeat, and the Intermediate-outcomes branch is built
  // from the IO endpoint: by RES-R-3 those are the SAME population, so rendering both shows every
  // cross-cutting IO twice and gives it two denominators — exactly what KCR-R-1 forbids. When the
  // IO branch has at least one leaf it is the authoritative one and the Program-level branch is
  // suppressed; it stays as the FALLBACK when the IO endpoint returned nothing (or failed), where
  // the AoW payloads are the only source of those nodes.
  // @akili-spec bugfix/kpi-count-reconciliation
  const programLeaves = intermediateBranch ? [] : [...programNodesByKey.values()].map(node => buildLeaf(node, parseTitle));
  const programBranch: TocBranch | null = programLeaves.length
    ? {
        kind: 'program',
        code: PROGRAM_BRANCH_LABEL.code,
        name: PROGRAM_BRANCH_LABEL.name,
        done: sumBy(programLeaves, l => l.done),
        total: sumBy(programLeaves, l => l.total),
        target: sumBy(programLeaves, l => l.target),
        achieved: sumBy(programLeaves, l => l.achieved),
        leaves: programLeaves
      }
    : null;

  const intermediateBranch = buildProgramLevelBranch(
    input.intermediateOutcomes,
    'intermediate',
    DEFAULT_INTERMEDIATE_LABEL,
    input.intermediateOutcomesLabel,
    parseTitle
  );
  const outcomes2030Branch = buildProgramLevelBranch(
    input.outcomes2030,
    '2030',
    DEFAULT_2030_LABEL,
    input.outcomes2030Label,
    parseTitle
  );

  const branches: TocBranch[] = [
    ...aowBranches,
    ...(programBranch ? [programBranch] : []),
    ...(intermediateBranch ? [intermediateBranch] : []),
    ...(outcomes2030Branch ? [outcomes2030Branch] : [])
  ];

  if (!branches.length) return null;

  return { spCode, spName, branches };
}
