# `changes/overview-chart-view-toggle` — Tasks

## 1. Scope of this task list

- **Module / feature:** `program-overview` — heatmap ↔ stacked-bars toggle on the two matrix cards (client only)
- **Linked spec:** `requirements.md` (CVT-R-1..5) + `design.md` (CVT-DD-1..6)
- **Owner / driver:** j.cadavid@cgiar.org
- **Status:** approved — ready for /akili-execute (2026-08-27)
- **Depth:** Standard · **Budget:** 3 tasks / ~300 LOC / 1 review round (design.md §1)
- **Parallel-safe:** yes vs other specs (only `program-overview/**`); tasks themselves are serial

## 2. Pre-flight checklist

*(Gates 1–3 passed at specify time, 2026-08-27 — recorded in prose because the tasks-gate hook reserves checked boxes for /akili-execute's evidence-first flow.)*

- [ ] `requirements.md` approved — DONE at Phase 1 gate 2026-08-27 (OQ-1 "no totals", OQ-2 "heading row" defaults accepted)
- [ ] `design.md` approved — DONE at Phase 2 gate 2026-08-27
- [ ] Base code merged — DONE: archived family `sp-overview-echarts` shipped `program-overview.charts.ts`, `HeatmapModel`, `emitLink`, and the three quicks (abbreviations/`interval:0`/rotation, always-on cell labels, violet donut)
- [ ] No other in-flight spec touching `program-overview/**` at execution start
- [ ] `package.json` untouched by this spec

## 3. Task list

### [x] `CVT-T-1` — Pure builders: `stackedBarOption` + `barLinkFromClick` (+ shared morph ids)

- **Type:** `client`
- **Description:** In `program-overview.charts.ts` add `stackedBarOption(model: HeatmapModel, ramp: string[]): EChartsOption` per design §2.2 item 3 — yAxis = rows (`inverse: true`, `axisLabel { interval: 0, formatter: abbreviateAxisLabel }`), xAxis value, one `bar` series per column with `stack: 'total'`, `name` = full column name, `color: ramp[c % ramp.length]`, data aligned to rows with `0 → null`, tooltip naming row × column with the "(not navigable)" note for null-link cells, `universalTransition` enabled with series/dataset ids **shared with `heatmapOption`** (add the same ids there — the only heatmap-path edit, CVT-DD-4). Add `barLinkFromClick(event, model)` resolving `(seriesIndex → c, dataIndex → r)` to the stored cell link. Extend `program-overview.charts.spec.ts`.
- **Implements:**
  - `CVT-R-2` — *Same data, second shape* (stack values from the model; zero → no segment; ramp per column; **BUT NOT** refetch/re-derive → builders are pure over the same `HeatmapModel`; **AND IT MUST** abbreviations + `interval: 0` on the category axis, full names in tooltips) · *Empty model* (builder side: `rows: []` → empty series, no throw)
  - `CVT-R-3` — *Segment click* (THEN same `OverviewLink`; **BUT** null-link segments do not resolve; **AND IT MUST** hold for every cell → full-model parity spec)
  - `CVT-R-5` — shared ids + `universalTransition` present in both options
- **Files (expected):** `program-overview.charts.ts`, `program-overview.charts.spec.ts`
- **Depends on:** — · **Blocks:** CVT-T-2, CVT-T-3
- **Estimate:** M (~130 LOC incl. spec)
- **Skills:** `angular-developer`, `tdd`
- **Definition of done:**
  - [x] Option-shape spec with an asymmetric 2×4 fixture (distinct values): series count = 4 (columns), each `stack: 'total'`, series `s` data at row `r` = cell value or `null` when 0, yAxis data = rows. **FAIL input:** transposing rows/columns → stack-value assertions red.
  - [x] **Parity spec:** for every `(r, c)` of the fixture, `barLinkFromClick({seriesIndex: c, dataIndex: r}, model)` equals `cellLinkFromClick({data: [c, r, v]}, model)` — incl. the null cells. **FAIL input:** off-by-one in either index mapping → red. **Disqualifier:** sampling two cells is not parity — the spec must iterate the whole matrix.
  - [x] Colors asserted by ramp **index/name**, never resolved values (jsdom empty strings — KZ-SPO-1 precedent); `interval: 0` + `abbreviateAxisLabel` asserted on the bars option. **FAIL input:** dropping the formatter → red.
  - [x] Shared ids: both builders' series/dataset ids equal for the same model; `universalTransition` enabled. **FAIL input:** divergent ids → equality red. **What this cannot prove:** that the morph *renders* well — CVT-AC-3 (T6), with the CVT-R-5 fallback pre-approved.
  - [x] Full suite `cd onecgiar-pr-client && npx jest --silent --reporters=summary --no-coverage` green; `npx ng lint --quiet` clean. **Disqualifier:** `--testPathPattern` narrowing.

### [x] `CVT-T-2` — Toggle state, segmented control, mode-aware bindings

- **Type:** `client`
- **Description:** In `program-overview.component.ts`: `w12ViewMode` / `bilateralViewMode` signals (default `'heatmap'`), setters, mode-aware option computeds (`w12ChartOption()` → heatmap or bars builder over the same model/ramp), click handlers routing through the mode's resolver into `emitLink`. In the template: segmented control (two `<button type="button">`, labels "Heatmap"/"Bars", `[attr.aria-pressed]`, status-pill styling + `focus-visible:shadow-[var(--pr-focus-ring)]` — CVT-DD-6) right-aligned in each matrix card's heading row; `[options]` bound to the mode-aware computed; `tableModel`/`chartTitle`/`height`/`(chartClick)` unchanged. Extend `program-overview.component.spec.ts`.
- **Implements:**
  - `CVT-R-1` — *Switching one card* (THEN bars render + `aria-pressed`; AND the other card stays — independent signals; **BUT NOT** change `<h2>` text/order → pinned order assertion untouched and still green; **AND IT MUST** default heatmap on load → init spec)
  - `CVT-R-2` — *Empty model* (component side: empty state renders in both modes, toggle present but chart absent)
  - `CVT-R-4` — *Assistive tech* (same `tableModel` object identity across the switch; real buttons with pressed state; **BUT NOT** a second chart host → hosts-per-card count stays 1)
- **Files (expected):** `program-overview.component.ts`, `.html`, `.spec.ts`
- **Depends on:** CVT-T-1 · **Blocks:** CVT-T-3
- **Estimate:** M (~140 LOC incl. spec)
- **Skills:** `angular-developer`, `ui-ux-pro-max`
- **Definition of done:**
  - [x] Init spec: both cards heatmap by default (options shape = heatmap builder output). **FAIL input:** defaulting to `'bars'` → red.
  - [x] Independence spec: toggle W1/W2 → its options switch, bilateral's unchanged. **FAIL input:** one shared signal → red.
  - [x] Host/table spec: `app-pr-viz-chart` count per card = 1 before and after the switch; `tableModel` reference identical across the switch. **FAIL input:** second host or table rebuild → red.
  - [x] Pinned `<h2>` order assertion **unmodified** in the diff and green. **FAIL input:** any heading edit.
  - [x] Bars-mode click: `Other` segment event → no emission; navigable segment → the cell's link (via `openResults.subscribe`). **FAIL input:** resolver bypassing the null check → red.
  - [x] Full suite + lint + `ng build` green (same disqualifier). **Presence caveat:** `aria-pressed` + classes prove markup; pressed-state *visibility* and control affordance are CVT-AC-3 (T6).

### [~] `CVT-T-3` — Morph verification + HITL decision record

- **Type:** `tests` / verification
- **Description:** Close the spec: (a) full-suite + lint + build re-run on the final tree; (b) static gates (hex grep 0 new; diff confined to `program-overview/**`; no `package.json`); (c) **HITL/T6 pass (CVT-AC-3)** on SP02 at 1280/1024px: toggle affordance, bars legibility (half-width and full-width cards), morph quality — decide **morph kept** vs **fallback** (drop shared ids/flag, plain swap; one-line code change) and record the decision + evidence in `execution.md`; (d) segment-click chips land correctly on the Results tab (spot: one navigable + one `Other`).
- **Implements:** `CVT-R-5` (morph SHOULD + recorded fallback decision) · `CVT-R-4` (motion parity — reduced-motion instant swap is wrapper-owned, verified by the existing wrapper spec; note it) · CVT-AC-1/2/3 closure
- **Files (expected):** none (or the one-line fallback edit + spec id adjustments if taken)
- **Depends on:** CVT-T-2 · **Blocks:** —
- **Estimate:** S
- **Skills:** `angular-developer`
- **Definition of done:**
  - [ ] Static gates green with outputs recorded in `execution.md`. **FAIL input:** a hex literal or an out-of-folder diff line.
  - [ ] HITL outcome recorded: "morph kept" or "fallback taken (reason)". **Disqualifier:** closing the task with no recorded decision — the SHOULD requires the decision, not necessarily the morph. **What automated gates cannot prove here:** everything visual — this task exists to close that gap.
  - [ ] Full suite green on the final tree (post-decision).

## 4. Dependency graph

```
CVT-T-1 (builders + parity)
   └── CVT-T-2 (toggle UI + mode bindings)
         └── CVT-T-3 (morph HITL + closure)
```

Serial; no cycles.

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `CVT-TEST-1` | unit (pure builders) | CVT-R-2 shape/KZ-SPO-1 · CVT-R-3 full parity · CVT-R-5 ids | `program-overview.charts.spec.ts` |
| `CVT-TEST-2` | unit (component DOM/state) | CVT-R-1 · CVT-R-2 empty · CVT-R-4 | `program-overview.component.spec.ts` |
| `CVT-TEST-3` | static | hex · diff scope · no package.json | shell, recorded in `execution.md` |
| `CVT-TEST-4` | manual (T6) | CVT-AC-3 + morph decision | HITL at CVT-T-3 |

Coverage thresholds (50/60/60/60) unaffected.

## 6. Rollout & verification

- [ ] Single PR against `qa-development-2026` (~300 LOC, under the split threshold). PR description: review `stackedBarOption` + the parity spec first; out of scope: dashboard-lab, persistence.
- [ ] CI green; CVT-AC-3 evidence linked in the PR.

## 7. Cleanup & follow-ups

- Toggle persistence (localStorage/user pref) → future MAY.
- Guide note (toggle pattern) folds into the pending `program-overview/CLAUDE.md` rewrite already queued in kaizen `changes--sp-overview-echarts.md` item 1 — extend that pending item at this spec's archive rather than adding a new one.

## 8. Roll-back plan

Revert the single PR; default view was heatmap, so no user-visible state is lost. No deps, no API, no persisted state.
