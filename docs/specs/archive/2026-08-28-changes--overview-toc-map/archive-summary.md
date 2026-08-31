# Archive Summary — `changes/overview-toc-map`

## 1. Document Control

| Field | Value |
|---|---|
| Original spec path | `docs/specs/changes/overview-toc-map/` |
| Archive date | 2026-08-28 |
| Final status | **Complete — 4/4 tasks `[x]`, HITL passed (radial kept)** |
| Owner | j.cadavid@cgiar.org · Branch `qa-development-2026` (spec branch) |

## 2. Outcome

The SP Overview gained a full-width **"Theory of Change map"** card: deterministic radial ECharts `tree` — SP hub → AoW branches → HLO/IO leaves + Program-level/Intermediate/2030 branches — with node fill encoding indicator progress (quartiles of the same `done/total` rule as "Progress by area of work"), tooltips (code/title/level/indicators/Σtarget/Σachieved/progress), AoW click-through to `entity-aow`, and a complete flattened a11y table. **Zero new HTTP calls, zero new npm deps** (`TreeChart` registered additively in `pr-viz-chart`).

## 3. Requirements Delivered

TCM-R-1..7 all delivered (R-7 SHOULD: radial kept, fallback not taken; OQ-1 leaf labels off; OQ-2 empty branches omitted). One recorded amendment: TCM-R-2's `is_aow` clause clarified at execution (sharedness = outcome tier) after TCM-T-1's Reviewer FAIL.

## 4. Files Changed

`pr-viz-chart.component.ts` + spec (registration); NEW `dashboard-lab.toc-map.ts` + spec (pure model, dedupe, progress math); `program-overview.charts.ts` + spec (3 pure builders); `program-overview.component.*` + `dashboard-lab.component.*` (wiring, card, navigation, heading 7→8). Commits `66abcb0be`, `cab43109e`, `d233f85f5`, `be48052d5`, `07f9da136`.

## 5. Test & Validation Evidence

Full client suite green at every gate (final 483 suites / 6,965 tests), lint, `ng build`; static gates (0 hex, no package.json, scope-confined). HITL round 1 → 2 findings (hollow symbols, label collision) → fixed (`symbol: 'circle'`, short horizontal labels) → owner approved. Execution history: T-1 PASS attempt 2 (real Reviewer FAIL: `is_aow` partition on the output tier would have diverged from the AoW card; red→green-proven remediation), T-2/T-3 PASS attempt 1 (T-3 after re-cutting a concurrent session's foreign hunks out of the diff — environmental), T-4 one HITL fix round.

## 6. Accepted Follow-Ups

Sankey alternative recorded if the radial ever disappoints; `distance: 8` unasserted; keyboard drill-down (Overview-wide, pre-existing); center filter chips / indicator drill-down MAYs.

## 7. Historical Notes

Budget 4 tasks/~430 LOC/1 round each → actual 4 tasks/~560 LOC/1 rework round total. Shared-worktree hazards recurred (foreign hunks re-cut; one lost Edit) — see kaizen.
