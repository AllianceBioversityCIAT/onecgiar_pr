# `changes/overview-toc-map` — Design

## 1. Summary

- **Spec:** `changes/overview-toc-map` · **Depth:** Standard · **Status:** approved (2026-08-27, Phase 2 gate — judgment-day declined)
- **Linked:** `./requirements.md` (TCM-R-1..7) · `./proposal.md` §3 (scout inventory) · archived `2026-08-27-changes--overview-chart-view-toggle` (builder/host patterns)
- **One-liner:** One pure model builder in `dashboard-lab` (SP→branches→leaves with `done/total`), three pure chart builders in `program-overview.charts.ts` (tree option, flattened table, click resolver), one new full-width card hosting the existing `app-pr-viz-chart`, and an additive `TreeChart` registration in the shared wrapper. Zero HTTP, zero deps.
- **Budget (Step 2.4):** **4 tasks · ~430 LOC (≈180 src + ≈250 spec) · 1 review round per task.** Matches Standard; matches proposal §11 (380–480).

## 2. Architecture Overview

### 2.1 Where this lives

| File | Change |
|---|---|
| `shared/components/pr-viz-chart/pr-viz-chart.component.ts` | + `TreeChart` import, + entry in `REGISTERED_ECHARTS_MODULES`, + `TreeSeriesOption` in the local `EChartsOption` union (the scout-named 3-edit additive change). Nothing else in the wrapper. |
| `dashboard-lab/dashboard-lab.toc-map.ts` **(new)** | Pure `buildTocMapModel(...)`: consumes the already-loaded units + per-AoW/intermediate/2030 ToC buckets and the existing `splitGroupTitle` output; returns `TocMapModel`. Owns dedupe (`is_aow: false` → one "Program-level" branch), progress math (`done/total`, the AoW-card rule), empty-branch omission (OQ-2). |
| `dashboard-lab/dashboard-lab.toc-map.spec.ts` **(new)** | Model spec: dedupe, grouping, progress math, 0-indicator nodes, empty inputs, AoW-card agreement. |
| `dashboard-lab.component.ts` | + `overviewTocMap` computed (thin: feeds existing signals into `buildTocMapModel`) · + `[tocMap]` binding · + `(openAow)` handler navigating to the AoW's existing `entity-aow` route (parent owns data AND navigation — folder invariant). |
| `dashboard-lab.component.html` | + the two bindings on `<app-program-overview>`. |
| `program-overview.charts.ts` | + `tocMapOption(model, tokens)` (pure; ECharts `tree`, radial) · + `tocMapTable(model)` · + `tocMapAowFromClick(event, model)` (returns the clicked AoW code or `null` for every other node class). |
| `program-overview.charts.spec.ts` | Option-shape, tooltip formatter, click-resolver parity, table parity. |
| `program-overview.component.ts/.html/.spec.ts` | + `tocMap` input, option/table computeds, `openAow` output, the new full-width card below "Progress by area of work" (own `<h2>`, empty state, loading via wrapper); pinned heading assertion 7 → 8 (deliberate, cited edit). |

### 2.2 Interaction

1. **Model.** `overviewTocMap()` returns `TocMapModel` or `null` while any ToC bucket is still loading (card shows the wrapper's loading state) — same guard style as the other overview computeds. Branch order: AoWs by code, then "Program-level", then "Intermediate outcomes", then "2030 outcomes"; empty branches omitted (OQ-2).
2. **Tree option.** ECharts `tree` series, `layout: 'radial'`, `initialTreeDepth: -1` (fully expanded), no zoom/roam. Root = SP node; depth-scaled `symbolSize` (root > branch > leaf). Labels: root + branch on, leaf off (OQ-1 default — tooltip carries names). Deterministic: no force physics (TCM-R-7).
3. **Progress encoding.** Node fill = existing violet ramp token by progress quartile of `done/total` (0–25/25–50/50–75/75–100 → ramp index 0..3); a node with `total === 0` renders the muted structural token, no ratio computed. Tokens caller-resolved (purity fence, KZ-SPO-1 assertions by name).
4. **Tooltip.** Formatter reads the node's model payload: code + title, level name, `n indicators`, `Target Σ`, `Achieved Σ`, `done/total`. Non-AoW nodes append nothing else; AoW nodes append the click affordance hint.
5. **Click.** `tocMapAowFromClick` maps the event's tree node to a branch of `kind: 'aow'` → its code; every other node class → `null`. Component emits `openAow(code)` only on non-null; `dashboard-lab` routes to the AoW's existing `entity-aow` page (exact route located at execution from the app's routing — it exists today).
6. **A11y.** `tocMapTable(model)` flattens the SAME model: one row per rendered node (branch, code, title, level, indicators, target, achieved, progress), caption = SP name. Chart-node ↔ table-row count parity is spec-asserted (single derivation, TCM-R-6).
7. **Fallback (TCM-R-7).** If radial spacing fails HITL: swap the series shape to `graph` + circular layout inside `tocMapOption` (model, table, resolver unchanged) and register `GraphChart`; decision recorded in `execution.md` — same escape-valve mechanics as the family's morph fallback.

## 3. Data Model Changes
None persisted. New client-only types: `TocMapModel { spCode, spName, branches: TocBranch[] }`, `TocBranch { kind: 'aow'|'program'|'intermediate'|'2030', code, name, done, total, leaves: TocLeaf[] }`, `TocLeaf { code: string|null, title, level, indicators, target, achieved, done, total }`.

## 4. API Surface
None. Zero new HTTP (TCM-R-2 BUT clause); reuses `aows()/tocByKey` signals as loaded today.

## 5. Server Workflow
N/A.

## 6. Frontend Plan

### 6.1 Design system usage
Existing tokens only: violet ramp (`--pr-chart-1..4`) for progress quartiles, muted chart token for structural nodes, `--pr-text-secondary` for labels, `--pr-border` for lines. Card chrome identical to the other Overview cards. Height ~460px (full-width radial needs vertical room; HITL-adjustable).

### 6.2 A11y
Wrapper's mandatory `tableModel` (no table → no chart, enforced by `pr-viz-chart`). SVG marks non-focusable (family precedent); the table is the reading path. Keyboard drill-down remains the Overview-wide open follow-up recorded at the toggle spec's archive — this card adds no regression to that baseline.

## 7. Security / 8. Performance / 9. Observability
None / one model build + one option build per data change (computeds); ~60 nodes worst case, trivial for SVG / none.

## 10. Testing Plan

| Spec | Cases |
|---|---|
| `dashboard-lab.toc-map.spec.ts` | dedupe fixture (one `is_aow: false` node repeated under 2 AoWs → appears once, under "Program-level"); per-AoW grouping with asymmetric fixture; `done/total` math incl. `total === 0`; empty-branch omission; empty inputs → null/empty model; **AoW-card agreement:** same fixture through the AoW-progress rule and the map model yields identical `done/total` per AoW |
| `program-overview.charts.spec.ts` | tree option shape (radial layout, depth symbol sizes, root/branch/leaf label config); quartile→ramp-token mapping asserted by token NAME (never resolved values, KZ-SPO-1); tooltip formatter for a full leaf, a 0-indicator node, and an AoW; `tocMapAowFromClick` parity over EVERY fixture AoW + null for root/leaf/program branches + malformed event; `tocMapTable` row-count/content parity with the model |
| `program-overview.component.spec.ts` | card renders with model; heading assertion 7→8 (cited edit); empty state; option/table computeds null-safe; `openAow` emits on AoW click payload only |
| Wrapper | existing `pr-viz-chart` suite green post-registration; `ng build` (option-union typecheck) |
| Static | hex grep 0 new; no `package.json`; diff confined to wrapper registration + `dashboard-lab/**` |
| Manual (T6) | TCM-AC-3: legibility 1280/1024, tooltips, AoW click, layout-fallback decision |

## 11. Backwards Compatibility
Purely additive: no existing card, model, or route changes; wrapper registration is append-only (all existing charts unaffected). Heading contract 7→8 is the single deliberate assertion edit.

## 12. Design Decisions

| # | Decision | Rationale / rejected |
|---|---|---|
| `TCM-DD-1` | Model built by a pure function in a NEW `dashboard-lab.toc-map.ts`, thin computed in the component | `dashboard-lab.component.ts` is ~2,400 lines; pure-file builders are the family's proven testable shape (`program-overview.charts.ts` precedent). Rejected: inline computed (untestable in isolation, grows the giant). |
| `TCM-DD-2` | Parent (`dashboard-lab`) owns model AND navigation; `program-overview` renders and emits `openAow` | Folder invariant (parent = data/links, child = geometry); entity-aow routing knowledge stays out of the child. |
| `TCM-DD-3` | ECharts `tree` radial, fully expanded, no roam | Deterministic (TCM-R-7); hierarchy IS a tree. Rejected: `graph` force (physics, jsdom-untestable geometry — proposal §10); kept as the pre-approved circular fallback only. |
| `TCM-DD-4` | Progress = quartile of `done/total` → ramp token index; `total === 0` → muted structural token | Token-only, deterministic, testable by name (KZ-SPO-1); reuses the exact AoW-card counting rule so the two cards cannot disagree (TCM-R-3). Rejected: parsing `progress_percentage` strings (fragile, second source of truth). |
| `TCM-DD-5` | `is_aow: false` nodes dedupe into ONE "Program-level" branch | The payload repeats them under every AoW (scout); double-counting is the spec's #1 defect class. Rejected: attach-to-first-AoW (misattributes program-level work). |
| `TCM-DD-6` | Leaf labels off, tooltip-first (OQ-1 default); root+branch labels on | ~60 leaf labels cannot fit a radial at 1024px; HITL may overrule (recorded there). |
| `TCM-DD-7` | Register `TreeChart` only in v1 (`GraphChart` added only if the fallback fires) | Smallest wrapper delta; registration is additive and cheap to extend. |

**Reversion challenge (Step 2.3):** no DD removes, disables, or inverts shipped behavior — the change is purely additive (the 7→8 heading edit adds; nothing is taken away). Challenge skipped per rule; recorded here.

## 13. Open Gaps & Follow-ups
- Radial legibility is jsdom-blind → TCM-AC-3 decides layout vs fallback (recorded either way).
- Exact `entity-aow` route shape located at execution (exists today; task carries the lookup).
- Center filter chips, indicator drill-down, keyboard drill-down → recorded MAYs/follow-ups, out of v1.
