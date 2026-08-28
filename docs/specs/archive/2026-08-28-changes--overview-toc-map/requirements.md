# `changes/overview-toc-map` — Requirements

## 1. Module / Feature

- **Module:** `result-framework-reporting` → `dashboard-lab` (client only) + shared `pr-viz-chart` (additive chart registration)
- **Sub-feature:** Radial Theory-of-Change map on the SP Overview (SP → AoW → HLO/IO, indicator progress)
- **Owner:** j.cadavid@cgiar.org
- **Status:** approved (2026-08-27, Phase 1 gate)
- **Depth:** Standard · **Type:** Change · **Approval Mode:** gated
- **Linked proposal:** `./proposal.md` (2026-08-27) · **Scout inventory:** recorded in proposal §3 (2026-08-27)
- **Reference:** Alliance radial program map (user screenshot 2026-08-27); archived `2026-08-27-changes--overview-chart-view-toggle` (host/tableModel/builder patterns)

## 2. Context

The SP Overview already loads the full ToC tree it needs (proposal §3, scout-verified): AoWs via `clarisa-global-units`, per-AoW ToC nodes with `indicators[]` (`target_value_sum`, `actual_achieved_value_sum`, `progress_percentage`) via `toc-results`, plus `intermediate-outcomes` and `2030-outcomes`. "Progress by area of work" collapses all of it to one `done/total` row per AoW. The map renders the same loaded tree as one radial picture with per-node indicator progress. **Zero new endpoints; zero new npm dependencies** (`TreeChart`/`GraphChart` ship in installed echarts 6.1.0, unregistered).

## 3. In Scope / Out of Scope

### In scope
- One new full-width Overview card "Theory of Change map" (radial tree; SP center → AoW ring → HLO/IO leaves; Intermediate/2030 as program-level branches).
- Node progress encoding consistent with the AoW card's `done/total` rule; tooltips with target/achieved; AoW click-through; flattened a11y table; loading/empty states.
- `pr-viz-chart` chart registration (3-edit additive change); pure builders + model computed; Jest coverage.

### Out of scope
- New endpoints or server changes; result-counts per ToC node (no linkage data — P2-3395); indicator-level nodes or drill-down (MAY later); center filter chips (MAY later); editing; persistence; budget/$ encoding; every existing Overview card.

## 4. Personas Affected

| Persona | What changes |
|---|---|
| All PRMS users on SP Overview | Gain one map card showing the program's whole ToC with progress; nothing else moves. |

## 5. User Stories

- **`TCM-US-1`** As an SP leader, I want the program's ToC structure and indicator progress in one radial picture, so that I can spot advancing and stalled areas without opening each AoW page.

## 6. Functional Requirements

### Required (MUST)

- **`TCM-R-1` Map card.** The Overview MUST render a full-width "Theory of Change map" card directly below "Progress by area of work", outside the W1/W2 · W3/Bilateral separators (program-wide content), with its own `<h2>` (heading contract 7 → 8, deliberate recorded edit).

#### Scenario: Card renders after data settles
- GIVEN the Overview with `loadAllTocs()` completed for the selected SP
- WHEN the Overview renders
- THEN the map card shows the radial tree for that SP
- AND the card heading is "Theory of Change map" appended to the pinned heading-order assertion (7 → 8)
- BUT it must NOT reorder or restyle any existing card, separator, or heading
- AND IT MUST show the wrapper's loading state while ToC calls are in flight, and the card's empty state when the SP has no AoWs/ToC nodes

- **`TCM-R-2` Tree content.** The map MUST render SP (root) → one branch per AoW (code-labeled) → that AoW's HLO/IO nodes as leaves, plus two program-level branches ("Intermediate outcomes", "2030 outcomes") from the loaded buckets — all derived from the ALREADY-LOADED `tocByKey`/units data.

#### Scenario: Shared nodes are not double-counted
- GIVEN a ToC node with `is_aow: false` that the payload repeats under every AoW
- WHEN the model is built
- THEN that node appears EXACTLY ONCE, under a single "Program-level" branch off the root
- AND per-AoW branches contain only `is_aow: true` nodes *(clarified at execution, TCM-T-1 attempt-1 adjudication: sharedness applies to the OUTCOME tier — the codebase's definition (`dashboard-lab.component.ts` cross-cut stamp) — so output-tier (HLO) nodes always stay on their AoW branch regardless of `is_aow`; the literal both-tier reading would violate TCM-R-3's "can never disagree" MUST. See execution.md TCM-T-1.)*
- BUT the model must NOT refetch or add HTTP calls (same signals the Overview already fills)
- AND IT MUST label nodes with the code parsed by the existing `splitGroupTitle()` (falling back to truncated title when the parse returns null)

#### Scenario: Empty program
- GIVEN an SP whose loaded data has no AoWs (or no ToC nodes at all)
- WHEN the Overview renders
- THEN the map card shows its empty state (no chart, no throw)

- **`TCM-R-3` Node encoding.** Node size MUST encode hierarchy level (SP > AoW > leaf), and each AoW/leaf node MUST visually encode indicator progress using the SAME rule as "Progress by area of work": `done` = indicators with `actual_achieved_value_sum > 0`, `total` = indicator count.

#### Scenario: Encoding agrees with the AoW card
- GIVEN AOW02 shows "3/7" in "Progress by area of work"
- WHEN the map renders
- THEN AOW02's node encodes exactly 3/7 (the two cards can never disagree — one shared derivation)
- AND colors come from existing chart/text tokens only (violet family), resolved by the caller
- BUT it must NOT introduce hex literals or new tokens
- AND IT MUST render a node with 0 indicators as a plain structural node (no progress encoding, no division by zero)

- **`TCM-R-4` Tooltip.** Hovering any AoW/HLO/IO node MUST show: code + title, level name (Output / Outcome / EoI / AoW), indicator count, Σ`target_value_sum`, Σ`actual_achieved_value_sum`, and progress `done/total`.

#### Scenario: Node facts
- GIVEN the leaf node "OP 3.3.4" with 2 indicators (targets 10 and 5, achieved 4 and 0)
- WHEN hovered
- THEN the tooltip shows its code+title, level, "2 indicators", target 15, achieved 4, progress 1/2
- BUT it must NOT show budget/$ figures (not in PRMS data) or invented percentages beyond the stated fields

- **`TCM-R-5` Click-through.** Clicking an AoW node MUST navigate to that AoW's existing `entity-aow` page; clicking the SP root, HLO/IO leaves, or program-level branches MUST do nothing (tooltip-only in v1).

#### Scenario: AoW click
- GIVEN the rendered map
- WHEN the AOW03 node is clicked
- THEN the app navigates to AOW03's entity-aow route for the selected SP
- BUT a click on any non-AoW node must NOT navigate or emit
- AND IT MUST hold for every AoW of the fixture (parity over the set, not sampling)

- **`TCM-R-6` A11y.** The card MUST bind a complete flattened `tableModel` (wrapper contract: no table → no chart): one row per rendered node — branch, code, title, level, indicators, target, achieved, progress — same derivation as the chart.

#### Scenario: Assistive tech
- GIVEN the rendered map
- THEN the hidden table lists every node the chart renders (count parity chart-nodes ↔ table-rows)
- AND the caption names the SP
- BUT it must NOT be a second interactive surface (SVG marks non-focusable; the table is the reading path — family precedent)

### Should (SHOULD)

- **`TCM-R-7` Deterministic layout.** The map SHOULD use ECharts `tree` with radial layout (same data → same picture). If radial spacing proves illegible at HITL, the pre-approved fallback is `graph` with circular layout (same model, builder-level swap) — decided at execution and recorded (same escape-valve pattern as CVT-R-5).

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| Network | ZERO new HTTP calls (reuses the Overview's existing loads). |
| Dependencies | ZERO new npm packages; `TreeChart` (+ fallback `GraphChart` if taken) registered additively in `pr-viz-chart`. |
| Tokens | Existing chart/text/border tokens only; no hex in TS/HTML. |
| Determinism | No force physics; option builders pure over the model. |
| Performance | Model built in one computed; option rebuilt only on model change. |

## 8. Acceptance Criteria

- **`TCM-AC-1`** Jest: model spec (dedupe of `is_aow: false`, per-AoW grouping, progress math incl. 0-indicator nodes, empty inputs); option-shape spec (tree structure, symbolSize by level, progress encoding, token-name colors); tooltip formatter cases; click resolver parity over every AoW + non-AoW no-op; tableModel row parity; heading assertion 7→8 deliberate edit; wrapper registration additive (all existing `pr-viz-chart` tests green). Full client suite + lint + `ng build` green.
- **`TCM-AC-2`** Static: no new hex; no `package.json` diff; diff confined to `pr-viz-chart` (registration only) + `dashboard-lab/**`.
- **`TCM-AC-3`** **Manual HITL/T6 on SP02:** radial map legible at 1280/1024px (labels, node spacing, 5+ AoWs with ~6–10 leaves each), progress encoding readable, tooltips correct, AoW click lands, layout-fallback decision recorded (TCM-R-7).

## 9. Defect Classes → Gates

| Defect class | Gate | Input that makes the gate FAIL |
|---|---|---|
| Shared (`is_aow: false`) nodes double-counted | TCM-AC-1 model spec with a fixture repeating one node under 2 AoWs | Skipping dedupe → node-count assertion red |
| Progress math diverges from the AoW card | Model spec asserting the SAME `done/total` values both cards derive for a shared fixture | A second derivation drifting → red |
| Wrong tree shape (nodes under wrong branch) | Option/model spec with asymmetric fixture (distinct AoWs, distinct leaf sets) | Swapping branch assignment → red |
| Token drift / hex | Token-name assertions + hex grep (TCM-AC-2) | Hex literal or resolved-value assertion → red |
| Click mis-routing | Resolver spec over EVERY fixture AoW + every non-AoW node class | Off-by-one node index / missing guard → red |
| Table ↔ chart divergence | Row-count + content parity spec (same model feeds both) | Independent table derivation → red |
| Wrapper regression from registration | Existing `pr-viz-chart` suite + `ng build` (option-union typecheck) | Missing union member → build red |
| **Radial legibility / crowding / label overlap** | **No jsdom gate** — TCM-AC-3 HITL/T6; TCM-R-7 fallback pre-approved | — (explicit substitute) |

## 10. Dependencies & Assumptions

- Ships on top of archived `overview-chart-view-toggle` (heading contract currently 7; separators present).
- Assumes `tocByKey`/`indicatorsByAow()`/units signals remain the Overview's load path (scout 2026-08-27); if `loadAllTocs()` is refactored, the model computed follows it.
- `progress_percentage` strings are NOT parsed — the `done/total` rule avoids them (consistency + no string-parse fragility).
- Parent owns data (folder invariant): the model computed lives in `dashboard-lab`; `program-overview` renders.

## 11. Open Questions

- **OQ-1** Leaf label strategy: all labels off + tooltip-only vs labels on outer ring. **Default: leaf labels off (AoW labels on), tooltip carries names** — decided visually at HITL, overridable there.
- **OQ-2** Do Intermediate/2030 branches render when their buckets are empty? **Default: omit empty branches.**

## 12. Requirement ID Index

| ID | Summary | Scenarios | Covered by task |
|---|---|---|---|
| TCM-R-1 | Full-width map card, heading 7→8 | Card renders after data settles | (Phase 3) |
| TCM-R-2 | Tree content from loaded data | Shared nodes · Empty program | (Phase 3) |
| TCM-R-3 | Level size + progress encoding | Encoding agrees with AoW card | (Phase 3) |
| TCM-R-4 | Tooltip contract | Node facts | (Phase 3) |
| TCM-R-5 | AoW click-through only | AoW click | (Phase 3) |
| TCM-R-6 | Flattened a11y table | Assistive tech | (Phase 3) |
| TCM-R-7 | Deterministic layout + fallback | — | (Phase 3) |

## Required cross-references
- `./proposal.md` §3 (scout inventory: endpoints, DTOs, wrapper registration) · archived `2026-08-27-changes--overview-chart-view-toggle` (builder/host/tableModel patterns, KZ precedents) · kaizen `changes--sp-overview-echarts.md` KZ-SPO-1 · `docs/ux-ui/design.md §7` tokens.
