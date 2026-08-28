# `changes/overview-toc-map` — Tasks

## 1. Scope of this task list

- **Module / feature:** ToC radial map card on the SP Overview (client only)
- **Linked spec:** `requirements.md` (TCM-R-1..7) + `design.md` (TCM-DD-1..7)
- **Owner / driver:** j.cadavid@cgiar.org
- **Status:** approved — ready for /akili-execute (2026-08-27, Phase 3 gate)
- **Depth:** Standard · **Budget:** 4 tasks / ~430 LOC / 1 review round per task (design §1)
- **Parallel-safe:** yes vs other specs (touches `pr-viz-chart` registration + `dashboard-lab/**`); tasks themselves are serial

## 2. Pre-flight checklist

*(Recorded in prose — the tasks-gate hook reserves checked boxes for /akili-execute's evidence-first flow.)*

- `requirements.md` approved at Phase 1 gate (2026-08-27); `design.md` approved at Phase 2 gate (2026-08-27, judgment-day declined).
- Base merged: archived `overview-chart-view-toggle` (heading contract 7, separators present, builders file established).
- No other in-flight spec touching `pr-viz-chart` or `dashboard-lab/**` at execution start.
- `package.json` untouched by this spec.

## 3. Task list

### [x] `TCM-T-1` — Wrapper registration + pure `buildTocMapModel` (+ model spec)

- **Type:** `client`
- **Description:** (a) In `pr-viz-chart.component.ts`: register `TreeChart` — the design §2.1 3-edit additive change (import, `REGISTERED_ECHARTS_MODULES`, `TreeSeriesOption` into the local `EChartsOption` union). (b) New `dashboard-lab/dashboard-lab.toc-map.ts`: `TocMapModel`/`TocBranch`/`TocLeaf` types (design §3) + pure `buildTocMapModel(...)` per design §2.2 item 1 and TCM-DD-1/4/5: branch order AoWs-by-code → "Program-level" → "Intermediate outcomes" → "2030 outcomes"; `is_aow: false` dedupe into ONE program branch; `done/total` = AoW-card counting rule; `total === 0` leaves structural; empty branches omitted (OQ-2); labels via the existing `splitGroupTitle` output with truncated-title fallback; empty/loading inputs → `null`/empty model, no throw. (c) New `dashboard-lab.toc-map.spec.ts`.
- **Implements:**
  - `TCM-R-2` — *Shared nodes are not double-counted* (THEN exactly once under "Program-level"; AND per-AoW branches only `is_aow: true`; **BUT NOT** refetch/new HTTP → pure function over already-loaded inputs; **AND IT MUST** label via `splitGroupTitle` + fallback) · *Empty program* (model side: null/empty, no throw)
  - `TCM-R-3` — progress math (*Encoding agrees with the AoW card*: the shared-derivation half — same `done/total` values; **AND IT MUST** handle `total === 0` without a ratio)
- **Files (expected):** `pr-viz-chart.component.ts`, `dashboard-lab.toc-map.ts` (new), `dashboard-lab.toc-map.spec.ts` (new)
- **Depends on:** — · **Blocks:** TCM-T-2, TCM-T-3
- **Estimate:** M (~150 LOC incl. spec)
- **Skills:** `angular-developer`, `tdd`
- **Definition of done:**
  - [x] Dedupe spec: fixture repeats one `is_aow: false` node under 2 AoWs → node appears exactly once, under "Program-level"; AoW branches hold only their own `is_aow: true` nodes. **FAIL input:** skipping dedupe → count red; attach-to-first-AoW → branch-membership red.
  - [x] Progress spec: asymmetric fixture where each AoW's `done/total` differs; assert exact values AND that running the same fixture through the AoW-card rule (indicators with `actual_achieved_value_sum > 0`) yields identical numbers. **FAIL input:** a second/divergent derivation → red. **Disqualifier:** asserting only that values are numbers (not exact) is not evidence.
  - [x] `total === 0` leaf → structural (no ratio, no NaN); empty buckets → branch omitted; fully empty inputs → null model, no throw. **FAIL input:** division by zero → NaN assertion red.
  - [x] Wrapper: existing `pr-viz-chart` spec suite green post-registration; `npx ng build` green (union typecheck — **the input that fails it:** a tree option object against a union missing `TreeSeriesOption`).
  - [x] Full suite `cd onecgiar-pr-client && npx jest --silent --reporters=summary --no-coverage` green; `npx ng lint --quiet` clean. **Disqualifier:** `--testPathPattern` narrowing.

### [x] `TCM-T-2` — Pure chart builders: `tocMapOption` + `tocMapTable` + `tocMapAowFromClick`

- **Type:** `client`
- **Description:** In `program-overview.charts.ts` per design §2.2 items 2–6 + TCM-DD-3/4/6: `tocMapOption(model, tokens)` — ECharts `tree`, `layout: 'radial'`, fully expanded, no roam; depth-scaled `symbolSize`; root+branch labels on, leaf labels off; node fill = ramp token by `done/total` quartile, muted structural token when `total === 0`; tooltip formatter per TCM-R-4 (code+title, level, n indicators, Σtarget, Σachieved, done/total; AoW nodes append the click hint). `tocMapTable(model)` — one row per rendered node, caption = SP name. `tocMapAowFromClick(event, model)` — AoW branch node → its code; root/leaf/program/intermediate/2030/malformed → `null`. Extend `program-overview.charts.spec.ts`.
- **Implements:**
  - `TCM-R-3` — *Encoding agrees with the AoW card* (encoding half: quartile→ramp mapping; AND token-only colors; **BUT NOT** hex/new tokens — caller-resolved, KZ-SPO-1 name assertions)
  - `TCM-R-4` — *Node facts* (full tooltip contract; **BUT NOT** $/invented figures → formatter asserted verbatim)
  - `TCM-R-5` — *AoW click* (resolver half; **BUT** non-AoW → null; **AND IT MUST** hold for every fixture AoW — parity loop, not sampling)
  - `TCM-R-6` — *Assistive tech* (builder half: table rows ≡ rendered nodes — count AND content parity from the single model)
  - `TCM-R-7` — deterministic tree option (radial layout asserted; no force config present)
- **Files (expected):** `program-overview.charts.ts`, `program-overview.charts.spec.ts`
- **Depends on:** TCM-T-1 · **Blocks:** TCM-T-3
- **Estimate:** M (~160 LOC incl. spec)
- **Skills:** `angular-developer`, `tdd`
- **Definition of done:**
  - [x] Option-shape spec: series type `tree`, `layout: 'radial'`, expand-all, no roam; symbolSize root > branch > leaf; label config root/branch on + leaf off. **FAIL input:** force/graph config or leaf labels on → red.
  - [x] Quartile spec: fixture leaves at 0%, 30%, 60%, 100%, and `total === 0` → exact ramp token NAME per node (never resolved values — jsdom `''`, KZ-SPO-1). **FAIL input:** off-by-one quartile boundary → red. **What this cannot prove:** the rendered look — TCM-AC-3 (T6).
  - [x] Tooltip spec: full leaf, 0-indicator node, and AoW node → exact strings incl. Σtarget/Σachieved/done/total; no `$`. **FAIL input:** formatter reading the artifact's own value instead of the model → red.
  - [x] Parity spec: `tocMapAowFromClick` over EVERY fixture AoW returns its code; root, each leaf, program/intermediate/2030 branches, and `{}`/out-of-range events return null. **Disqualifier:** sampling one AoW is not parity.
  - [x] Table spec: row count === rendered node count; each row's cells match the node's model fields; caption = SP name. **FAIL input:** independent derivation drifting → red.
  - [x] Full suite + lint green (same disqualifier).

### [x] `TCM-T-3` — Card wiring: model computed, bindings, navigation, heading 7→8

- **Type:** `client`
- **Description:** Per design §2.1/§2.2 + TCM-DD-2: `dashboard-lab.component.ts` — `overviewTocMap` computed (null while any bucket loads) + `(openAow)` handler navigating to the AoW's existing `entity-aow` route (locate the exact route from the app's routing during implementation); `.html` — `[tocMap]` + `(openAow)` bindings. `program-overview` — `tocMap` input, option/table computeds (null-safe), `openAow` output emitting only on non-null resolver result, the new full-width card directly below "Progress by area of work" (own `<h2>` "Theory of Change map", wrapper loading state, empty state, height per design §6.1); pinned heading assertion 7 → 8 with a TCM-R-1 citation comment. Extend `program-overview.component.spec.ts` (+ `dashboard-lab.component.spec.ts` only if the computed/handler needs it).
- **Implements:**
  - `TCM-R-1` — *Card renders after data settles* (THEN card + heading appended; **BUT NOT** reorder/restyle existing cards/separators/headings → all prior pinned assertions unmodified and green; **AND IT MUST** loading while in flight + empty state)
  - `TCM-R-2` — *Empty program* (component side: empty state renders, no chart)
  - `TCM-R-5` — *AoW click* (emission half: `openAow` emits code on AoW payload; **BUT** non-AoW → no emission; parent routes)
  - `TCM-R-6` — *Assistive tech* (binding half: tableModel bound; **BUT NOT** a second interactive surface → no new buttons/links in the card body)
- **Files (expected):** `dashboard-lab.component.ts/.html`, `program-overview.component.ts/.html/.spec.ts` (+ `dashboard-lab.component.spec.ts` if needed)
- **Depends on:** TCM-T-2 · **Blocks:** TCM-T-4
- **Estimate:** M (~120 LOC incl. spec)
- **Skills:** `angular-developer`, `ui-ux-pro-max`
- **Definition of done:**
  - [x] Init spec: with a model, the card renders one `app-pr-viz-chart` (Overview host count 5 → 6) with non-null tableModel; heading assertion now 8, cited. **FAIL input:** missing heading append → assertion red.
  - [x] Prior pinned assertions (separators, card order) unmodified in the diff and green. **FAIL input:** any edit to them.
  - [x] Null-model spec: loading → wrapper loading state; empty model → empty state, option computed null. **FAIL input:** rendering a chart with no table → wrapper clears it (design §2.2 constraint).
  - [x] Click spec: AoW payload → `openAow` emits the code (via subscribe); leaf/root payload → no emission. **FAIL input:** resolver bypass → red.
  - [x] Navigation: handler routes to the located `entity-aow` route — assert router call args in spec, **and record what that cannot prove** (the real page landing is TCM-AC-3/T6).
  - [x] Full suite + lint + `ng build` green (same disqualifier).

### `TCM-T-4` — Closure: gates + HITL layout decision

- **Type:** `tests` / verification
- **Description:** (a) Full suite + lint + build on the final tree; (b) static gates (hex grep 0 new; diff confined to wrapper registration + `dashboard-lab/**`; no `package.json`); (c) **HITL/T6 (TCM-AC-3)** on SP02 at 1280/1024px: radial legibility (labels, spacing, 5+ AoWs × ~6–10 leaves), progress encoding readable, tooltips correct, AoW click lands on the right page — decide **radial kept** vs **circular-graph fallback** (TCM-R-7; if taken: builder-level swap + `GraphChart` registration, recorded); revisit OQ-1 (leaf labels) with the live render; (d) record everything in `execution.md`.
- **Implements:** `TCM-R-7` (layout SHOULD + recorded decision) · TCM-AC-1/2/3 closure · TCM-R-1/R-5 visual halves
- **Files (expected):** none (or the fallback swap if taken)
- **Depends on:** TCM-T-3 · **Blocks:** —
- **Estimate:** S
- **Skills:** `angular-developer`
- **Definition of done:**
  - [ ] Static gates green, outputs recorded. **FAIL input:** a hex literal or an out-of-scope diff line.
  - [ ] HITL outcome recorded: "radial kept" or "fallback taken (reason)" + OQ-1 label decision. **Disqualifier:** closing with no recorded decision. **What automated gates cannot prove here:** everything visual — this task exists to close that gap.
  - [ ] Full suite green on the final tree (post-decision).

## 4. Dependency graph

```
TCM-T-1 (wrapper + model)
   └── TCM-T-2 (chart builders)
         └── TCM-T-3 (wiring + card)
               └── TCM-T-4 (gates + HITL)
```

Serial; no cycles.

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `TCM-TEST-1` | unit (pure model) | TCM-R-2 dedupe/empty · TCM-R-3 math | `dashboard-lab.toc-map.spec.ts` |
| `TCM-TEST-2` | unit (pure builders) | TCM-R-3 encoding · TCM-R-4 · TCM-R-5 resolver · TCM-R-6 table · TCM-R-7 shape | `program-overview.charts.spec.ts` |
| `TCM-TEST-3` | unit (component) | TCM-R-1 · TCM-R-2 empty · TCM-R-5 emission · TCM-R-6 binding | `program-overview.component.spec.ts` |
| `TCM-TEST-4` | static | hex · diff scope · no package.json · wrapper suite | shell + existing suite, recorded in `execution.md` |
| `TCM-TEST-5` | manual (T6) | TCM-AC-3 + layout/OQ-1 decisions | HITL at TCM-T-4 |

Coverage thresholds (50/60/60/60) unaffected.

## 6. Rollout & verification

- Single PR against `qa-development-2026` (~430 LOC — marginally above the ~400 split threshold but one coherent feature with a serial graph; splitting would ship a registered chart with no consumer). PR description per `cognitive-doc-design`: review `buildTocMapModel` (dedupe + progress math) first; out of scope: endpoints, drill-down, filters.
- CI green; TCM-AC-3 evidence linked in the PR.

## 7. Cleanup & follow-ups

- Center filter chips, indicator drill-down, keyboard drill-down (Overview-wide), map persistence → recorded MAYs/follow-ups (proposal §12, archive summary §6).
- Guide note (map card + `dashboard-lab.toc-map.ts`) folds into the pending `program-overview`/`dashboard-lab` guide-sync kaizen items at this spec's archive.

## 8. Roll-back plan

Revert the single PR; the card and registration are purely additive — no persisted state, no API, no deps. Heading assertion returns 8→7 with the revert.
