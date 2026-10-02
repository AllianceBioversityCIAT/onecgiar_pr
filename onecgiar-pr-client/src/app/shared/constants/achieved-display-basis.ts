// @akili-spec bugfix/achieved-counts-submitted
//
// ACS-DD-1 / ACS-DD-2 (design.md §8.1) — the ONE choke point that re-points every ToC-progress
// payload returned by the four `ResultsApiService` methods (`GET_TocResultsByAowId`,
// `GET_IntermediateOutcomes`, `GET_2030Outcomes`, `GET_ScienceProgramTocProgress`) at the union
// ("Achieved" = Submitted + QA'd + Approved, status 2/3/6) basis before it reaches any component.
//
// With the switch off (default, ACS-R-5), every indicator's `actual_achieved_value_sum` /
// `progress_percentage` and every roll-up's `progress_value` / `progress_percentage` — the fields
// every existing surface already binds to — are re-pointed to read the `achieved_*` union-basis
// fields the server carries alongside the QA ones (`achieved_value_sum` / `achieved_value`,
// `achieved_progress_percentage`). The original QA value is kept under a `qa_*` key (client-only —
// never sent back to the server) so nothing is lost and the switch can be restored with zero server
// change (ACS-S-10). `preliminary_*` fields are left completely untouched (ACS-S-11).
//
// Guard (ACS-DD-5): each field is re-pointed ONLY when its OWN union counterpart is present on the
// object — independently of its sibling field. A response from a server that has not shipped a
// given union field yet leaves that one field exactly as it arrived (deploy-order safety).
//
// Pure and non-mutating: `toDisplayBasis` never writes to `payload` — it returns a new object only
// at the levels where something actually changed, and the same reference everywhere else.

/** ACS-R-5 / ACS-S-10 — the one switch. Flip to `true` to restore the QA/Prel split; no server change needed. */
export const SHOW_QA_PREL_SPLIT = false;

type AnyRecord = Record<string, any>;

/**
 * `[field every surface already binds to, the union-basis source field, where the QA value survives]`.
 * Indicator rows (`tocResultsOutputs[]`/`tocResultsOutcomes[]`/`tocResults[]` → `indicators[]`).
 */
const INDICATOR_REPOINTS: ReadonlyArray<readonly [string, string, string]> = [
  ['actual_achieved_value_sum', 'achieved_value_sum', 'qa_actual_achieved_value_sum'],
  ['progress_percentage', 'achieved_progress_percentage', 'qa_progress_percentage']
];

/** Same contract, for a `ProgressRollup` object: top-level `progress`, `areas[].progress`, node `progress`. */
const ROLLUP_REPOINTS: ReadonlyArray<readonly [string, string, string]> = [
  ['progress_value', 'achieved_value', 'qa_progress_value'],
  ['progress_percentage', 'achieved_progress_percentage', 'qa_progress_percentage']
];

/** Applies `repoints` to `obj` field-by-field (ACS-DD-5 guard). Returns `obj` itself when nothing changed. */
function repointFields(obj: AnyRecord, repoints: ReadonlyArray<readonly [string, string, string]>): AnyRecord {
  let result = obj;
  for (const [target, source, qaKey] of repoints) {
    if (source in obj) {
      if (result === obj) {
        result = { ...obj };
      }
      result[qaKey] = obj[target];
      result[target] = obj[source];
    }
  }
  return result;
}

function repointRollup(rollup: unknown): unknown {
  if (rollup == null || typeof rollup !== 'object') return rollup;
  return repointFields(rollup as AnyRecord, ROLLUP_REPOINTS);
}

function repointIndicator(indicator: unknown): unknown {
  if (indicator == null || typeof indicator !== 'object') return indicator;
  return repointFields(indicator as AnyRecord, INDICATOR_REPOINTS);
}

/** One ToC node from `tocResults[]` / `tocResultsOutputs[]` / `tocResultsOutcomes[]`: its own `indicators[]` and its own `progress` roll-up (aow-bilateral.repository.ts `node.progress = rollUpIndicators(node.indicators)`). */
function repointNode(node: unknown): unknown {
  if (node == null || typeof node !== 'object') return node;
  const record = node as AnyRecord;
  let result = record;

  if (Array.isArray(record.indicators)) {
    const indicators = record.indicators.map(repointIndicator);
    const changed = indicators.some((indicator: unknown, index: number) => indicator !== record.indicators[index]);
    if (changed) {
      result = { ...result, indicators };
    }
  }

  if (record.progress != null) {
    const progress = repointRollup(record.progress);
    if (progress !== record.progress) {
      result = { ...result, progress };
    }
  }

  return result;
}

function repointNodeArray(nodes: unknown): unknown {
  if (!Array.isArray(nodes)) return nodes;
  const repointed = nodes.map(repointNode);
  return repointed.some((node: unknown, index: number) => node !== nodes[index]) ? repointed : nodes;
}

/**
 * ACS-DD-1 — walks every ToC-progress response shape the four `ResultsApiService` methods return
 * (design.md §8.1) and re-points it to the union ("Achieved") basis:
 *   - a top-level `progress` roll-up (`GET_TocResultsByAowId`, `GET_ScienceProgramTocProgress`)
 *   - `areas[].progress` (`GET_ScienceProgramTocProgress`)
 *   - every node's own `progress` and `indicators[]` inside `tocResults[]` (`GET_IntermediateOutcomes`,
 *     `GET_2030Outcomes`), `tocResultsOutputs[]` and `tocResultsOutcomes[]` (`GET_TocResultsByAowId`)
 *
 * Pure: never mutates `payload`. With the switch on, returns `payload` unchanged (identity).
 */
export function toDisplayBasis<T>(payload: T, showSplit: boolean = SHOW_QA_PREL_SPLIT): T {
  if (showSplit) return payload;
  if (payload == null || typeof payload !== 'object') return payload;

  const root = payload as AnyRecord;
  let result = root;

  if (root.progress != null) {
    const progress = repointRollup(root.progress);
    if (progress !== root.progress) {
      result = { ...result, progress };
    }
  }

  for (const key of ['tocResults', 'tocResultsOutputs', 'tocResultsOutcomes'] as const) {
    if (Array.isArray(root[key])) {
      const repointed = repointNodeArray(root[key]);
      if (repointed !== root[key]) {
        result = { ...result, [key]: repointed };
      }
    }
  }

  if (Array.isArray(root.areas)) {
    const areas = root.areas.map((area: unknown) => {
      if (area == null || typeof area !== 'object') return area;
      const areaRecord = area as AnyRecord;
      if (areaRecord.progress == null) return area;
      const progress = repointRollup(areaRecord.progress);
      return progress === areaRecord.progress ? area : { ...areaRecord, progress };
    });
    if (areas.some((area: unknown, index: number) => area !== root.areas[index])) {
      result = { ...result, areas };
    }
  }

  return result as T;
}
