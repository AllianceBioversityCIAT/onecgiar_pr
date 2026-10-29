# Tasks — KPI progress as a capped average, no target aggregation

## 1. Scope

- **Feature:** capped flat-average KPI progress on every Science Program shell %, the same rule in the server roll-up, no target aggregation at the top, `Total # of KPIs` chip
- **Linked spec:** [`requirements.md`](./requirements.md) (KPC-R-1..11) + [`design.md`](./design.md)
- **Owner:** santiago.sanchez@cgiar.org
- **Status:** approved, not started (2026-10-19)
- **Budget (design §13):** 6 tasks · ~250 prod LOC + ~300 test LOC · 6–8 review rounds. Exceeding it stops `/akili-execute` for the user

## 2. Pre-flight

- [ ] On `qa-development-2026-ss`. Unrelated working-tree changes are left untouched and never staged: `docs/specs/bilateral/replicated-innovations-2026-pa/project-and-pa-assignment/{execution,tasks}.md`, `email-notification.enum.ts`, `docs/specs/changes/replicated-innovation-reminders/`, `src/api/replicated-innovation-reminders/`, the two `RIR` migrations, `onecgiar-pr-server/src/a.py`
- [ ] The adopted pre-spec draft (design KPC-DD-8) is present: `toc-progress-rollup.ts` (+ spec) and `reporting-burndown.ts`, all uncommitted
- [ ] Every Jest run uses `--maxWorkers=2` and a `--testPathPattern` on touched specs only. One test run at a time on the machine
- [ ] Client lint: `ESLINT_USE_FLAT_CONFIG=false npx eslint <files> --quiet` (`KZ-changes--reporting-dynamic-kpi-target-counts-1`)
- [ ] No commit without the user's explicit go-ahead
- [ ] **Fixture notation:** in T-1 and T-2, `t/a` = **target / achieved** (matches `indicator(target, actual)` in the server spec). In T-3 and in `requirements.md` S-4.1, rows are written **achieved / target**, the way the table shows them. Check which one before writing a fixture

## 3. Task list

### [x] KPC-T-1 — Server roll-up: cap at 100 % and flat average (adopt draft)

- **Type:** server
- **Description:** Review and finish the adopted draft in `toc-progress-rollup.ts`. `ratio()` is capped at 1 and `rollUpChildren` weights each basis (actual, preliminary, achieved) by `indicators_counted`; it returns null when the total weight is 0. Rewrite the file header so it records the 2026-10-19 reversal of "do not cap" (Nicoleta, P2-3296) and "mean of HLO means" (Ángel), citing the source email (KZ-BOR-1). The `hasUsableTarget` paragraph stays. Update the spec, which is partially done in the draft.
- **Implements:** KPC-R-6 (S-6.1, S-6.2, S-6.3, "AND IT MUST keep counted/total/indicators_*"), KPC-R-1 S-1.1 (server side), KPC-R-2 S-2.1 (server side), KPC-R-3 S-3.1 / S-3.2 (server side)
- **Files:** `onecgiar-pr-server/src/api/results/results-toc-results/repositories/toc-progress-rollup.ts` / `.spec.ts`
- **Depends on:** — · **Blocks:** KPC-T-5 (modal / guide sort reads server values), KPC-T-6
- **Estimate:** S · **Review:** full (shared roll-up feeding three endpoints)
- **Skills:** `nestjs-expert`, `tdd`
- **Tests:**
  - S-1.1: `[10/50, 10/0]` → `50%`; `[10/50]` → `100%`
  - S-2.1: Nicoleta's 11 values with two raw overachievers → `77.6%`
  - S-3.1 / S-6.2: children `(0%, 10 ind)` + `(100%, 1 ind)` → `9.1%`
  - S-3.2: `rollUpChildren` of two `rollUpIndicators` HLOs equals `rollUpIndicators` over their union
  - Achieved and preliminary bases are weighted the same way (two children, 100 % × 1 and 0 % × 3 → `25`)
  - `counted`, `total`, `indicators_counted`, `indicators_total` unchanged on every existing case
  - Child with `progress_value: null` is skipped and adds no weight
- **Verification:**
  - **Falsifier:** `rollUpChildren([node(0,10,10), node(100,1,1)])` returning `50%`, or `rollUpIndicators([indicator(10,50)])` returning `500%`
  - **Red run:** `git stash push -- onecgiar-pr-server/src/api/results/results-toc-results/repositories/toc-progress-rollup.ts`, then `cd onecgiar-pr-server && npx jest --maxWorkers=2 --silent --testPathPattern="toc-progress-rollup"`. It must FAIL on the cap, 77.6, 9.1 and 63.8 cases. Then `git stash pop` and re-run: green. After that, `--testPathPattern="(toc-progress-rollup|results-framework-reporting.service|aow-bilateral.repository)"`: green
  - **Disqualifier:** if `results-framework-reporting.service.spec` or `aow-bilateral.repository.spec` needs a changed indicator-row `progress_percentage` to pass, P-3 is false. Stop and re-specify
  - **Consumers:** `aow-bilateral.repository.ts:775` (`rollUpIndicators`), `results-framework-reporting.service.ts:480, 853, 862` (`rollUpChildren`)
  - **Not evidence:** a green spec whose fixtures all have `indicators_counted = 1`. That can't tell weighted from unweighted. The 9.1 case must exist
- **Done when:** red-then-green recorded in `execution.md`; server eslint clean on the two files; header comment states the reversal

### [x] KPC-T-2 — Client rule: capped KPI %, flat average, `progressSum`

- **Type:** client
- **Description:** Finish and test the adopted draft in `reporting-burndown.ts`: `kpiProgressOf`, `roundProgress`, `averageProgress`, `buildRatio` returning `percent` (capped mean) and `progressSum`, and `summarisePartition` returning `percent`. Rewrite the module header paragraph that says ratios are `done / total`.
- **Implements:** KPC-R-1 (S-1.1 incl. BUT, S-1.2 incl. AND IT MUST, S-1.3), KPC-R-2 (S-2.1 client side, S-2.2 `percent: 0` + `total: 0` contract), KPC-R-3 (S-3.1 "AND IT MUST NOT be computed from rounded percents" at the helper level)
- **Files:** `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/reporting-burndown.ts` / `reporting-burndown.spec.ts`
- **Depends on:** — (parallel with T-1) · **Blocks:** KPC-T-3, T-4, T-5
- **Estimate:** S · **Review:** full (shared symbol with ~15 consumers)
- **Skills:** `angular-developer`, `tdd`
- **Tests:**
  - `kpiProgressOf`: `10/50` → 100; `10/5` → 50; target 0 → 0; achieved `"abc"` / null → 0; numeric strings parse
  - `buildRatio([10/50, 10/0])` → `percent 50`, `done 1`, `total 2`
  - `buildRatio([4/2, 0/7])` → `percent 50`, `zeroTarget 1`
  - Nicoleta's 11 → `percent 77.6`, `progressSum` = 854
  - Empty / all-no-target → `percent 0`, `total 0`, never NaN
  - `averageProgress(250 + 0, 4 + 1)` → 50 (not 31.3)
  - `summarisePartition` on a partition fixture → `percent` equals `buildRatio` over the same counted set
- **Verification:**
  - **Falsifier:** `buildRatio([10/10, 10/5, 10/0, 10/30]).percent` returning `75` (the count rule) instead of `62.5`. Note: `[10/50, 10/0]` gives 50 under both rules, so it alone is not evidence
  - **Red run:** `git stash push -- <reporting-burndown.ts>`, then `cd onecgiar-pr-client && npx jest --maxWorkers=2 --silent --reporters=summary --no-coverage --testPathPattern="reporting-burndown"`. It must fail on the 62.5 / 77.6 / progressSum cases. Pop and re-run: green
  - **Disqualifier:** if a consumer needs `percent` to stay `done/total` for a count display, that site is a count, not a %. Record it in `execution.md` and leave it to T-3..T-5, not here
  - **Consumers:** `reporting-aow-table.component.ts:1236, 1249, 1261`; `dashboard-lab.component.ts:1715, 1904, 1940, 2841, 5427`; `dashboard-lab.toc-map.ts:146`; `where-to-report-modal.component.ts:146-147`; `results-center-reporting-guide.component.ts:202-203`. These are additive here; their behaviour moves in T-3..T-5
- **Done when:** green, eslint clean, header paragraph updated

### [x] KPC-T-3 — Reporting tab: card bar %, no target sums, `Total # of KPIs`, rule copy

- **Type:** client
- **Description:** The card header bar and its `%` render the new `percent` (one decimal) through the unchanged `ratioOf`. Remove the `· N targets` header span (`headerTargets`). Remove the Target pill and the `targetSum` input from the quick-typology component. Remove the pass-through from `reporting-program-band`, and `reportingTargetSum` plus both `[targetSum]` bindings from `dashboard-lab`. Relabel the first chip `Total # of KPIs` / short `KPIs`. Replace `ratioRuleSentence` and `ratioPercentTooltip` with the KPC-R-10 sentence, and reword the `achievementTooltip` clause so it no longer calls the % a count. Invert or remove the specs that assert the pill, the header sum and the KCR "Σ target sums = Target chip" identity; keep the count identity.
- **Implements:** KPC-R-4 (S-4.1 incl. BUT, S-4.2), KPC-R-7 (S-7.1 incl. AND IT MUST), KPC-R-8 (S-8.1 incl. BUT), KPC-R-9 (S-9.1 incl. AND), KPC-R-10 (S-10.1 incl. BUT) for the Reporting tab sites; By-AOW banner part of KPC-R-4 via `buildAowBannerStats`
- **Files:** `components/reporting-aow-table/reporting-aow-table.component.{ts,html,spec.ts}`, `components/reporting-quick-typology-filters/reporting-quick-typology-filters.component.ts`, `.../reporting-quick-typology.util.ts` (+ spec), `components/reporting-program-band/reporting-program-band.component.{ts,html,spec.ts}`, `dashboard-lab.component.{ts,html}`, `dashboard-lab.kcr-reconciliation.spec.ts`, specs asserting `'KPI'` on the chip (grep first)
- **Depends on:** KPC-T-2 · **Blocks:** KPC-T-4 (same `dashboard-lab.component.ts`, serial)
- **Estimate:** M · **Review:** checklist
- **Skills:** `angular-developer`, `spartan` (chip row unchanged otherwise), `tdd`
- **Tests:**
  - S-4.1: card with rows 10/10, 5/10, 0/10, 30/10 → text `3 of 4`, `62.5%`, bar `width: 62.5%`
  - S-4.2: Type = HLO narrows the base → % recomputed from the narrowed rows
  - S-2.2 on the card: all-no-target → `—` (existing KTO test still green)
  - S-7.1: no `[data-testid="quick-typology-target-pill"]` in band or toolbar; all typology chips still render with counts
  - S-8.1: no `[data-testid="aow-header-targets"]`; header text contains no `targets`
  - S-9.1: first chip label `Total # of KPIs`, short `KPIs`, count from `counts['all']`
  - S-10.1: `[data-testid="aow-info-rule"]` shows the KPC-R-10 sentence; the `%` tooltip equals it
  - Banner: `buildAowBannerStats` `pct` = 62.5 for the S-4.1 rows
- **Verification:**
  - **Falsifier:** the S-4.1 card rendering `75%`, or any Target pill / `targets` text present
  - **Red run:** `cd onecgiar-pr-client && npx jest --maxWorkers=2 --silent --reporters=summary --no-coverage --testPathPattern="(reporting-aow-table.component|reporting-program-band|reporting-quick-typology|kcr-reconciliation|dashboard-lab.component.spec)"`. The new assertions fail first, then pass
  - **Sweeps:** `rg "targetSum|headerTargets|quick-typology-target-pill|reportingTargetSum" onecgiar-pr-client/src` → no hit in source (specs may only assert absence); `rg -i "something reported against them|Share of KPIs with a target" onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-aow-table` → no hit
  - **Disqualifier:** if removing the pill breaks the band layout (chips shift or wrap differently in a CT / the band spec), stop. That's a layout question for the HITL, not something to patch
  - **Consumers:** `sumTargetValues` stays (per-HLO `TARGET`, P-8). `targetSum` inputs: band, quick filters, `dashboard-lab.component.html:1468, 1531`
  - **Not evidence:** a test that only checks `ratioOf().percent` without the rendered text. The template must show the one-decimal figure
- **Done when:** green, sweeps clean, eslint clean

### [x] KPC-T-4 — Overview and hub: rows, `aowStats`, ring, hub % and sort

- **Type:** client
- **Description:** Add optional `percent` / `progressSum` to `AowProgressRow`, `OverviewAowProgressRow`, `OverviewAowProgressRowRich`, `HubAowRow` and `HubProgramLevelRow`. Fill them from `buildRatio` in `overviewAowProgress`, `overviewXcutProgress`, `overviewAowProgressRich` and `hubProgramLevelRows`. `overviewAowProgress` sorts ascending by `percent`, tie code. The rich sort is unchanged (KPC-DD-7). In `program-overview`: `aowStats.pct` and `richStats.pct` (ring) = `averageProgress(Σ progressSum, Σ total)`; `percentOfRich` = `row.percent`; tooltip at `program-overview.component.html:457` → KPC-R-10 sentence. `reporting-entry-hub.percentOf` = `row.percent ?? 0`. Segment widths are unchanged.
- **Implements:** KPC-R-5 (S-5.1, S-5.2 incl. BUT), KPC-R-3 (S-3.1 "AND IT MUST NOT be computed from rounded percents" at `aowStats` / ring), KPC-R-10 (Overview tooltip), KPC-R-11 (S-11.1 for Overview progress rows)
- **Files:** `dashboard-lab.component.ts`, `components/program-overview/program-overview.component.{ts,html}` (+ spec), `components/reporting-entry-hub/reporting-entry-hub.component.ts` (+ spec), `dashboard-lab.oah-rows.spec.ts`, `dashboard-lab.hub.spec.ts`
- **Depends on:** KPC-T-3 · **Blocks:** KPC-T-5
- **Estimate:** M · **Review:** checklist
- **Skills:** `angular-developer`, `tdd`
- **Tests:**
  - S-5.1: the same fixture AoW → `overviewAowProgressRich` row `percent` = Reporting `ratioOf(group).percent`
  - S-5.2: rows `{progressSum 250, total 4}` + `{progressSum 0, total 1}` → `richStats().pct` = 50 and `aowStats().pct` = 50 (not 31.3); ring offset uses 50
  - `percentOfRich` returns `row.percent` (62.5 fixture)
  - Hub: `percentOf` with `percent: 62.5` → 62.5; absent → 0
  - S-11.1: AoW A (`1 of 4`, 25 %) and B (`2 of 4`, 10 %) → `overviewAowProgress` order B, A
  - Rich sort still remaining-desc (existing test green)
  - Tooltip at `:457` shows the KPC-R-10 sentence
- **Verification:**
  - **Falsifier:** `richStats().pct === 31.3`, or the S-11.1 order A, B
  - **Red run:** `cd onecgiar-pr-client && npx jest --maxWorkers=2 --silent --reporters=summary --no-coverage --testPathPattern="(program-overview.component|dashboard-lab.oah-rows|dashboard-lab.hub|reporting-entry-hub)"`
  - **Sweep:** `rg "reported / row.total|totalDone / totalPlanned|reported / total|row.done / row.total" onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/{program-overview,reporting-entry-hub}` → no hit
  - **Disqualifier:** if a host passes rows without `progressSum` (external caller or fixture) and the Overview silently shows 0 %, the optional-field fallback is wrong. Re-specify the fallback instead of defaulting to 0
  - **Consumers:** every `OverviewAowProgressRow` / `HubAowRow` producer: `dashboard-lab.component.ts`, `where-to-report-modal` (T-5), `results-center-reporting-guide` (T-5)
  - **Not evidence:** fixtures where every row has the same `total`. There, mean-of-rows equals the flat mean and the test can't fail. S-5.2 uses totals 4 and 1
- **Done when:** green, sweep clean, eslint clean

### [x] KPC-T-5 — ToC map, heatmap, and progress sorts outside the shell

- **Type:** client
- **Description:** Carry `progressSum` on ToC map leaves, branches and root (`dashboard-lab.toc-map.ts`). `tocMapQuartileIndex` takes the aggregate %. Heatmap cell `pct` = `averageProgress(Σ progressSum, Σ total)`, and the tooltip progress line reads `x% (N of M reported)`. Where-to-report modal internal path and Results-list Center reporting guide sort by `area.progress.achieved_value ?? area.progress.progress_value ?? 0` ascending, tie code (server values from T-1), and fill `HubAowRow.percent` with that same value (rounded to one decimal) so the shared hub bar reads it; their program-level rows fill `percent` from `buildRatio` (Pivot T-4, 2026-10-19). Displayed counts in those lists are unchanged.
- **Implements:** KPC-R-5 (S-5.3), KPC-R-3 (heatmap totals / ToC branch and root flat), KPC-R-11 (S-11.1 for the modal and the guide)
- **Files:** `dashboard-lab.toc-map.ts` (+ `dashboard-lab.toc-map.spec.ts`), `components/program-overview/program-overview.charts.ts` (+ `.spec.ts`), `components/where-to-report-modal/where-to-report-modal.component.ts` (+ spec), `results/.../results-center-reporting-guide/results-center-reporting-guide.component.ts` (+ spec)
- **Depends on:** KPC-T-1, KPC-T-4 · **Blocks:** KPC-T-6
- **Estimate:** M · **Review:** checklist
- **Skills:** `angular-developer`, `tdd`
- **Tests:**
  - S-5.3: node with % 10 and `3 of 4` → quartile index 0 (bottom), not 3 (from `3/4`)
  - Boundaries 25 / 50 / 75 still land in the higher bucket (existing TCM-DD-4 test, re-expressed in %)
  - Heatmap row with leaves `{250, 4}` + `{0, 1}` → cell `pct` 50
  - ToC map branch `progressSum` = Σ leaves; the AoW node % equals the Overview row % for the same AoW (TCM-R-3 parity)
  - Modal / guide: areas with `progress_value` 10 and 75 → order 10, 75, whatever their `done`
  - Modal / guide: the hub bar `percentOf(row)` reads the server value (e.g. `achieved_value` 37.5 → bar 37.5 %), never 0 when the server sent a figure (Pivot T-4)
- **Verification:**
  - **Falsifier:** the S-5.3 node painted in quartile 3 (from `3/4`), or the heatmap cell reading 31
  - **Red run:** `cd onecgiar-pr-client && npx jest --maxWorkers=2 --silent --reporters=summary --no-coverage --testPathPattern="(dashboard-lab.toc-map|program-overview.charts|where-to-report-modal|results-center-reporting-guide)"`
  - **Sweep (D-3):** `rg "done / .*total|reported / .*total|totalDone / " onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab onecgiar-pr-client/src/app/pages/results/pages/results-outlet/pages/results-list/components/results-center-reporting-guide -g '!*.spec.ts' -g '!*.cy.ts'`. Every remaining hit is listed in `execution.md` as a count or segment-width site
  - **Disqualifier:** if the heatmap's `Program-level` / `Total Progress` columns need leaves the map does not carry, the flat rule can't be applied without new data. Stop and report
  - **Consumers:** `tocMapQuartileIndex` callers in `program-overview.charts.ts`; `TocLeaf` / branch builders in `dashboard-lab.toc-map.ts`
  - **Not evidence:** a quartile test whose `done/total` and % land in the same bucket. S-5.3 picks values where they differ
- **Done when:** green, D-3 sweep recorded, eslint clean

### [x] KPC-T-6 — HITL: layout and figures, folder guides

- **Type:** tests (manual, read-only browser) + docs
- **Description:** Re-stamp the folder guides that state the old rule: `dashboard-lab/CLAUDE.md`, `reporting-aow-table/CLAUDE.md`, `program-overview/CLAUDE.md`. Each gets one line pointing to this spec; no root guide or TRD edit (shared-file discipline). On local, after confirming the served bundle matches disk and without clicking write buttons (shared prdb):
  - SP05 2026 Reporting: `Total # of KPIs (213)`, no Target pill, AoW01 header `53 KPIs` with no `targets`
  - AoW01 bar % equals the hand-computed capped mean of its rows
  - Overview row % equals the Reporting card %
  - Layout at 1366 / 1280 / 375 px: no wrap or clip of the one-decimal % in card header, ring, rows, hub, chips (D-7)
  - Show G-1 (ring vs program achievement) and G-3 (per-HLO TARGET) to the user for a decision
  - Compare SP05 AoW01 against Nicoleta's worked example (D-8, KPC-OQ-1). Local and PRTest share prdb, so this needs her source (indicators, year), not a deploy
- **Implements:** KPC-R-9 (S-9.1 live count 213, Other Output / Other Outcome included), KPC-R-5 (S-5.1 live), the layout NFR, D-7, D-8
- **Depends on:** KPC-T-1 … T-5
- **Estimate:** S · **Review:** user at the HITL pause
- **Verification:**
  - **Falsifier:** the live AoW01 % differing from the hand computation over the same rows, or any element overflowing at the three widths
  - **Red run:** n/a (no test gate)
  - **Disqualifier:** a bundle that predates the change, or a reporting year / phase other than 2026 / P25. Then the reading is not evidence
  - **Consumers:** none (no shared symbol changed)
- **Done when:** every check passes, or each difference is explained and accepted by the user; G-1 / G-3 decisions recorded in `execution.md`

### [x] KPC-T-7 — Remove aggregated Target / Achieved, AoW card copy, SP root tooltip (HITL amendment 2026-10-19)

- **Type:** client
- **Description:** Per the user's HITL decisions:
  1. Remove every summed `Target` / `Achieved` figure from multi-indicator surfaces of the Science Program shell:
     - the HLO rows of the Reporting grouped view (`reporting-aow-table`, the per-HLO `TARGET` / `ACHIEVED` figures, P-8) and of the By-AOW view (`dashboard-lab.component.html` HLO row columns 3 and 4, plus the matching `TARGET` / `ACHIEVED` header cells, so the grid stays aligned)
     - the ToC map tooltips for AoW, bucket and SP nodes (`Target:` / `Achieved:` lines in `program-overview.charts.ts`)
     - the heatmap cell tooltip (`Target Σ` / `Achieved Σ`)
  2. Single-indicator rows keep their own Target and Achieved.
  3. The Overview Areas of Work card reads `x% achieved`, not `completed`.
  4. The SP root tooltip drops the `indicators` / `Target` / `Achieved` lines.
  5. Remove `sumTargetValues` only if no caller remains.
  6. Update the specs that assert the removed figures, inverting them into absence assertions.
- **Implements:** KPC-R-12 (S-12.1, S-12.2), KPC-R-13, KPC-R-14; closes design G-3
- **Files (grep first, do not widen past the shell):** `components/reporting-aow-table/*`, `dashboard-lab.component.{html,ts}` (By-AOW HLO row and header), `components/program-overview/program-overview.charts.ts` (+ spec), `components/program-overview/program-overview.component.{html,ts}` (+ specs), `reporting-burndown.ts` only if removing `sumTargetValues`
- **Depends on:** KPC-T-5 · **Blocks:** KPC-T-6 close
- **Estimate:** S-M · **Review:** checklist
- **Skills:** `angular-developer`, `spartan`
- **Tests:**
  - S-12.1: an HLO row with 14 targeted KPIs (targets Σ 24) shows no `TARGET` / summed `ACHIEVED`, while the expanded indicator rows still show their own Target and Achieved
  - S-12.2: the heatmap and AoW-node tooltips contain no `Target` / `Achieved` / `Σ`
  - KPC-R-13: the card text contains `achieved` and no `completed`
  - KPC-R-14: the root tooltip has no `indicators` / `Target` / `Achieved`
- **Verification:**
  - Scoped Jest on the touched specs plus the T-3, T-4 and T-5 patterns, all green
  - Sweep: `rg "Target Σ|Achieved Σ|target_value_sum|sumTargetValues" onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab -g '!*.spec.ts'`, with every remaining hit justified
  - Lint on the touched `.ts` files
  - **Disqualifier:** a removal that leaves the By-AOW grid misaligned (header tracks ≠ row tracks) must be fixed in the same task; layout is re-checked at T-6
- **Done when:** green, sweep recorded, eslint clean

## 4. Dependency graph

```text
KPC-T-1 (server) ─────────────────────────────┐
KPC-T-2 (client rule) ─► KPC-T-3 ─► KPC-T-4 ─► KPC-T-5 ─► KPC-T-6 (HITL)
```

T-1 and T-2 are parallel-safe (different packages). Tests still run **one at a time**. T-3 → T-4 → T-5 are serial: they share `dashboard-lab.component.ts` and the ToC/Overview row types.

## 5. Scenario Coverage

| Scenario / clause | Owner |
|---|---|
| S-1.1 (+ BUT not 250 / not 100) | T-1 (server), T-2 (client) |
| S-1.2 (+ AND IT MUST no-target count) | T-2 |
| S-1.3 | T-2 |
| S-2.1 | T-1 (server), T-2 (client) |
| S-2.2 (dash, not 0 % / NaN) | T-2 (contract), T-3 (card `—`) |
| S-3.1 (+ BUT not 50, + AND IT MUST NOT rounded) | T-1, T-2 (helper), T-4 (`aowStats` / ring), T-5 (heatmap, ToC branch) |
| S-3.2 | T-1 |
| S-4.1 (+ BUT not 75 %) | T-3 |
| S-4.2 | T-3 |
| S-5.1 | T-4 (unit), T-6 (live) |
| S-5.2 (+ BUT not 31.3 %) | T-4 |
| S-5.3 | T-5 |
| S-6.1 (+ AND IT MUST keep counts) | T-1 |
| S-6.2 | T-1 |
| S-6.3 | T-1 |
| S-7.1 (+ AND IT MUST keep typology chips) | T-3 |
| S-8.1 (+ BUT no `targets` / `63`) | T-3 |
| S-9.1 (+ AND Other Output / Outcome, cross-cuts once) | T-3 (unit), T-6 (live 213) |
| S-10.1 (+ BUT old wording gone) | T-3 (Reporting), T-4 (Overview tooltip) |
| S-11.1 | T-4 (Overview rows), T-5 (modal, guide) |
| NFR Layout | T-6 |
| NFR Parity | T-1 + T-2 (same 77.6 fixture) |
| D-1 … D-8 | D-1/2 T-1+T-2 · D-3 T-4+T-5 sweeps · D-4 T-4 · D-5 T-3 · D-6 T-3 · D-7/8 T-6 |

## 6. Rollout

- [ ] User authorizes the commit(s), using the format `<emoji> <type>(<scope>) [SPEC:changes/kpi-progress-capped-average]: …` with no apostrophes in the subject (Jenkins)
- [ ] Push to `qa-development-2026-ss`, then fast-forward to `performance-refactor` for PRTest (~30 min deploy), in the user's checkout
- [ ] D-8: ask Nicoleta which indicators and source her 77.6 % example used (T-6), then the reply to Nicoleta / Angel
- [ ] Staging → master promotion by Cristian, once he authorizes it

## 7. Follow-ups

- G-1 near-duplicate Overview figure · G-2 modal `area.progress.done` never sent · G-3 per-HLO `TARGET` sums mixed units

## 8. Roll-back

Revert the spec's commits (client and server are independent). No data or migration to undo.
