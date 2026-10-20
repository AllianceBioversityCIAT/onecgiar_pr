# Execution Log — KPI progress as a capped average, no target aggregation

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/kpi-progress-capped-average/` |
| Branch | `qa-development-2026-ss` |
| Approval Mode | gated (continue/pause asked after each wave) |
| Leader | Claude Code session, `opus` (T1) |
| Implementer | `akili-implementer` wrapper (T2) |
| Reviewer | `akili-reviewer` wrapper (T3) |
| Started | 2026-10-19 |
| Concurrency | T-1 and T-2 ran in parallel (different packages); Jest serialized through a scratchpad `mkdir` lock, `--maxWorkers=2`, scoped `--testPathPattern` |

## 2. Task Execution History

### KPC-T-1 — Server roll-up: cap at 100 % and flat average (adopt draft) — PASS

- **Date:** 2026-10-19 · **Attempts:** 1 · **Effort:** medium, steered "think carefully" in the brief · **Skills:** `nestjs-expert`, `tdd` (as listed)
- **Requirements covered:** KPC-R-6 (S-6.1, S-6.2, S-6.3, counts unchanged), KPC-R-1 S-1.1, KPC-R-2 S-2.1, KPC-R-3 S-3.1 / S-3.2 (server side)

**Attempt 1**
- Files: `onecgiar-pr-server/src/api/results/results-toc-results/repositories/toc-progress-rollup.ts`. The adopted draft logic was kept: `ratio()` = `min(a÷t, 1)`, and `rollUpChildren` → `weightedAverageOf` by `indicators_counted`, null at weight 0. The file header was rewritten to record the 2026-10-19 reversal of "do not cap" (Nicoleta, P2-3296) and "mean of HLO means" (Ángel), citing *"RE: Resync PRMS with ToC for BDN"* (KZ-BOR-1), with the `hasUsableTarget` paragraph kept. The `ratio` / `rollUpIndicators` doc comments were updated.
- `toc-progress-rollup.spec.ts` gained a new "flat weighting applies to every basis" block:
  - 25 on all three bases
  - per-basis 25 / 100 / 37.5
  - a null child adds no weight
  - weight 0 gives null
  - Program two-level case 37.5

  The draft cases S-1.1, S-2.1 (77.6), S-3.1 (9.1), S-3.2 and 63.8 (P2-3296 AC3) are kept.
- Red run (source stashed alone): 10 failed, 21 passed, 31 total. Names were not captured (`--silent`). The Reviewer traced the HEAD formula by arithmetic: cap → 500 %, 77.6 → ≈100.4 %, 9.1 → 50 %, 63.8 → 45 %. All four required failures are confirmed. The Reviewer counts 9 failing tests against the recorded 10; that is unreconciled and does not gate.
- Green run `(toc-progress-rollup|results-framework-reporting.service|aow-bilateral.repository)`: 4 suites, 240/240. An intermediate run failed 1 test on the Implementer's own wrong `indicators_counted` assertion for a mixed fixture (it sums over all children). The assertion was removed.
- P-3 disqualifier: not triggered, since no indicator-row `progress_percentage` change was needed.
- Lint `npx eslint <2 files> --quiet`: clean
- Reviewer: **PASS**. All four §6 rows conform. The "Not evidence" clause is met because the 9.1, 63.8, 25 and 37.5 fixtures have `indicators_counted ≠ 1`. `present()` is untouched, so the response shape is unchanged.

**Parity note (T-2 advisory cross-check).** The server `ratio()` clamps only the top (`min(…, 1)`) and maps non-finite values to 0. The client `kpiProgressOf` does the same, so both sides treat a negative achieved value identically. No clamp is added (out of spec), and parity holds.

**ADVISORY (4R, non-gating)**
- Reliability: record red runs without `--silent` so the failing test names land in this log.
- Reliability: a hand-built child with non-null `progress_value` and `indicators_counted: 0` would yield a null figure with `counted ≥ 1`. Production inputs can't produce it, because every child comes from `rollUpIndicators` / `rollUpChildren`. A one-line comment in `weightedAverageOf` would document the assumption.
- Readability: a name like `indicatorWeightedMean` would surface the KPC-R-3 intent.

### KPC-T-2 — Client rule: capped KPI %, flat average, `progressSum` — PASS

- **Date:** 2026-10-19 · **Attempts:** 1 · **Effort:** medium · **Skills:** `angular-developer`, `tdd` (as listed)
- **Requirements covered:** KPC-R-1 (S-1.1, S-1.2, S-1.3), KPC-R-2 (S-2.1 client side, S-2.2 contract), KPC-R-3 (S-3.1 helper level)

**Attempt 1**
- Files: `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/reporting-burndown.ts` (adopted draft kept as is per KPC-DD-8; module header rewritten, `@akili-spec` tag), `reporting-burndown.spec.ts` (new cases for `kpiProgressOf`, `roundProgress`, `averageProgress`, `buildRatio`, `summarisePartition`; existing `toEqual` expectations moved to capped values, e.g. the 50-KPI 10/1 case now averages `2`)
- Red run (`reporting-burndown.ts` stashed): 1 suite failed, 25 failed / 42 passed / 67 total. Reviewer confirmed that at HEAD the 62.5 case returns 75, the 77.6 case returns 91, and `progressSum` is undefined, so the failures are behavioural
- Green run `(reporting-burndown|reporting-aow-table.component|dashboard-lab.toc-map)`: 286 passed, 6 failed. `reporting-burndown` and `toc-map` fully green
- Lint `ESLINT_USE_FLAT_CONFIG=false npx eslint <2 files> --quiet`: clean
- Reviewer: **PASS**. The diff matches design §7.1, covers every T-2 test and scenario, leaves `done` / `total` / `zeroTarget` unchanged, and the falsifier (62.5) is pinned

**Disqualifier record (count-display consumers left to T-3).** The 6 red tests are in `reporting-aow-table.component.spec.ts`, which T-2 does not touch. Each asserts the old count-based % or the old copy, both of which KPC-T-3 owns (S-4.1, S-10.1). The Reviewer confirmed they are T-3 scope:
1. AoW ratio › counts REPORTED over total, not completed
2. AoW ratio › agrees with buildAowBannerStats on a shared fixture, incl. a no-target KPI
3. header › (a) the ticket AoW reads 10 of 50 · 20% · 54 KPIs…
4. header › a reported row without a target stays out of the numerator…
5. header › states the rule in the info panel and on the % tooltip
6. Target filter axis › S-7.1 … header still reads 10 of 50 · 20%

The branch is knowingly red on these 6 tests until KPC-T-3 lands. The other `buildRatio` / `summarisePartition` consumers (`dashboard-lab.component`, Overview, hub) were not run here. They are assessed in T-3..T-5.

**ADVISORY (4R, non-gating)**
- Reliability: `kpiProgressOf` has no lower bound, so a negative achieved value would contribute a negative %. The spec doesn't cover it. Check parity with the server's `ratio()` before adding a clamp.
- Readability: `summarisePartition` repeats the `progressSum` reduce from `buildRatio`. A shared helper would stop them drifting.
- Test: the `summarisePartition` shape test uses `percent: expect.any(Number)`. The exact value is pinned by the equality-with-`buildRatio` test, which is close to tautological.

### KPC-T-3 — Reporting tab: card bar %, no target sums, `Total # of KPIs`, rule copy — PASS (attempt 2)

- **Date:** 2026-10-19 · **Attempts:** 2 · **Effort:** medium → high on rework · **Skills:** `angular-developer`, `spartan`, `tdd` (as listed)
- **Requirements covered:** KPC-R-4 (S-4.1, S-4.2), KPC-R-7 (S-7.1), KPC-R-8 (S-8.1), KPC-R-9 (S-9.1), KPC-R-10 (S-10.1, Reporting sites), S-2.2 on the card; By-AOW banner via `buildAowBannerStats`
- **Gate:** user said *"continua hasta que termines"* (2026-10-19) after T-1/T-2, so routine PASS gates auto-continue until T-6 HITL. Exceptions still stop.

**Attempt 1**
- **Files** (all under `dashboard-lab/`):
  - `reporting-aow-table.component.{ts,html,spec.ts}`: removed `headerTargets` and the `aow-header-targets` span; `ratioRuleSentence` / `ratioPercentTooltip` now use the KPC-R-10 sentence; `achievementTooltip` reworded so it no longer calls the % a count.
  - `reporting-quick-typology-filters.component.ts`: removed the Target pill and the `targetSum` input.
  - `reporting-quick-typology.util.ts` (+ spec): `Total # of KPIs` / `KPIs`.
  - `reporting-program-band.component.{ts,html,spec.ts}`: removed `targetSum`.
  - `dashboard-lab.component.{ts,html}`: removed `reportingTargetSum`, both `[targetSum]` bindings, and the unused `sumTargetValues` import (still used for the per-HLO TARGET, P-8).
  - `dashboard-lab.kcr-reconciliation.spec.ts`: Σ-target identity dropped, count identity kept.
- **Spec values moved to the capped mean, all hand-verified by the Reviewer:**
  - The 6 T-2 known-red tests now read: ticket AoW `10 of 50 · 4%`; the 2/4 + 0/4 case reads 25.
  - KCR banner / S-10.2 now read 8.
  - New tests: S-4.1 DOM (`3 of 4`, `62.5%`, bar width `62.5%`, no `75%`), S-4.2, S-8.1, S-7.1 (band).
- **Red:** no clean red-then-green, because the 6 old tests were already red from T-2. The first post-edit run had 3 failures, all on stale fixture values, which the Implementer then fixed.
- **Green:** 7 suites, 534/534.
- **Reviewer: FAIL**, verbatim:
  1. *Discovered Issue:* The first chip's accessible name has no count. `reporting-quick-typology-filters.component.ts:23` binds `[attr.aria-label]="chip.label"`, so the chip is announced as `Total # of KPIs`, not `Total # of KPIs (213)`. The S-9.1 test only checks `label`, `shortLabel` and `count` on the util output. *Violated Rule:* requirements.md KPC-R-9 ("`Total # of KPIs (213)` as the accessible name"). *Remediation:* include the count in the aria-label; add a DOM assertion `Total # of KPIs (5)`.
  2. *Discovered Issue:* the task's test "Banner: `buildAowBannerStats` `pct` = 62.5 for the S-4.1 rows" is missing. *Violated Rule:* tasks.md KPC-T-3 › Tests, last bullet. *Remediation:* add the assertion (`pct` 62.5, `done` 3, `total` 4).
  - ADVISORY: orphaned JSDoc (`3 of 8 · 38%`) contradicts KPC-R-4; folder `CLAUDE.md` still documents `headerTargets` (owned by T-6); `toContain('4%')` is loose.

**Attempt 2** (same Implementer resumed, Reviewer report passed verbatim)
- Leader decisions:
  - Count only on the `all` chip; the other chips' names are unchanged (no widening).
  - The orphaned JSDoc in the Implementer's own touched file is removed (in scope: it restated the old rule).
  - `CLAUDE.md` is left for T-6.
- **Changes:**
  - aria-label is now `chip.id === 'all' && chip.count != null ? label (count) : label`.
  - New band DOM test: `Total # of KPIs (5)` / `Knowledge Product`.
  - New aow-table test: `buildAowBannerStats` → `{done 3, total 4, pct 62.5}`.
  - JSDoc deleted.
  - `toMatch(/10 of 50 4%(?!\d)/)`.
- **Red** (non-silent): 1 failed / 338, `ReportingProgramBandComponent › quick filter chips › S-9.1: the first chip accessible name carries its count…`. The banner test was green on first write, because only coverage was missing.
- **Green:** `--testPathPattern="(reporting-aow-table.component|reporting-program-band|reporting-quick-typology|kcr-reconciliation|dashboard-lab.component.spec|reporting-burndown)"` → 7 suites, 536/536.
- **Lint:** `ESLINT_USE_FLAT_CONFIG=false` on the 4 touched .ts files: clean.
- **Reviewer: PASS.** Both issues are closed, and attempt 2 changed only the listed items.

**Sweeps**
- `rg "targetSum|headerTargets|quick-typology-target-pill|reportingTargetSum" onecgiar-pr-client/src` returns one absence-asserting spec and `reporting-aow-table/CLAUDE.md:40` (guide, T-6).
- The old-copy sweep in `reporting-aow-table` returns no hits.
- The remaining "something reported" hits are T-4-owned (`program-overview.component.html:457`, `.ts:124`) or doc comments on `done`, which is still a count (`dashboard-lab.component.ts:1843, 5405`).
- Leader check: no `.cy.ts` references the removed elements.

**ADVISORY (non-gating):** layout after the pill and span removal is unmeasured in jsdom (KZ-OAH-1), so it goes to the T-6 HITL.

### KPC-T-4 — Overview and hub — IN PROGRESS, blocked on the Disqualifier (attempt 1, not yet reviewed)

- **Date:** 2026-10-19 · **Effort:** medium-high · **Skills:** `angular-developer`, `tdd`
- **Done in attempt 1:**
  - The `dashboard-lab` producers (`overviewAowProgress`, `overviewXcutProgress`, `overviewAowProgressRich`, `hubProgramLevelRows`) fill `percent` / `progressSum`. `overviewAowProgress` sorts ascending by `percent`, tie code; the rich sort is unchanged.
  - In `program-overview`: `aowStats.pct` / `richStats.pct` = `averageProgress(Σ progressSum, Σ total)`; `percentOfRich` = `row.percent ?? 0`; the `:457` tooltip now uses the KPC-R-10 sentence; the `:124` comment is reworded.
  - `reporting-entry-hub`: only the optional fields were added.
  - Specs updated in oah-rows, hub, `program-overview.component`, oah-hero, and scope.
  - A stale T-3 hub test (`buildAowBannerStats`) was corrected to 12.5, hand-computed as (30 + 0 + 20 + 0) / 4.
- **Red:** 12 failed / 187 (oah-rows S-5.1, S-11.1, invariants; hub `toEqual`s; oah-hero S-5.2 ring and rail, `aowStats`, `percentOfRich`, KPC-R-10 tooltip, "honest at 1%").
- **Green:**
  - T-4 pattern: 5 suites, 173/173
  - `program-overview` (incl. oah-hero, scope, charts): 4 suites, 288/288
  - T-3 pattern: 7 suites, 536/536
- **Lint:** clean
- **Disqualifier triggered:**
  - `where-to-report-modal.component.ts` (~131, ~157) and `results-center-reporting-guide.component.ts` (~187) build `HubAowRow` / `HubProgramLevelRow` without `percent` / `progressSum`.
  - With `reporting-entry-hub.percentOf = row.percent ?? 0` as designed, every bar in the modal and the guide would read 0 %. So `percentOf` is left unchanged (still `done/total`), and the task's sweep still hits it.
  - Per the task, the fallback must be re-specified, not defaulted to 0.
- **Spec inconsistency found:** S-11.1's "AoW A `1 of 4`, 75 %" cannot occur. One reported KPI out of four caps at 100, so the mean is at most 25. The test reproduces the same order with 1/4 at 25 % against 2/4 at 0.5 %.
- **Unrun CT note:** `program-overview.row-layout.cy.ts` fixtures carry no `percent`, so the rows render 0 % there. To be handled with the fallback decision.

## Pivot Record: KPC-T-4

- **Trigger:** KPC-T-4 Disqualifier. `where-to-report-modal` and `results-center-reporting-guide` build hub rows without `percent`, so `percentOf = row.percent ?? 0` would paint 0 % bars there.
- **Alternatives offered to the user (2026-10-19):**
  1. Fill `percent` in T-5 from the server value used for the sort (recommended).
  2. A temporary `done/total` fallback in the hub, which breaks KPC-R-5 parity on those screens.
  3. Exclude the modal and guide as a follow-up.
- **User decision:** option 1, "Fill % in T-5".
- **Spec amendments:**
  - tasks.md KPC-T-5 Description and Tests: the modal and guide fill `HubAowRow.percent` with `achieved_value ?? progress_value ?? 0` (one decimal), and their program-level rows take `buildRatio().percent`; new test bullet added.
  - design.md §7.5: new row.
  - KPC-T-4 keeps `percentOf = row.percent ?? 0` as designed. The interim 0 % on the modal and guide exists only in the uncommitted tree between T-4 and T-5 and is never committed on its own.
- **Infeasible fixtures corrected:**
  - requirements S-11.1 / tasks T-4: AoW A `1 of 4` at 75 % is impossible, because one reported KPI out of four is capped at a 25 % mean. Corrected to `1 of 4`, 25 %. The order B, A is unchanged and still differs from the count order.
  - requirements S-5.3 / tasks T-5 Tests and Falsifier: the same flaw (`1 of 4` at 75 %). Corrected to % 10 with `3 of 4` → bottom quartile, not the top one from `3/4`.
- **Correction sweep:**
  - Forward: `grep "1 of 4\|75 %\|75%"` over the spec folder. The remaining `75%` hits are S-4.1's count-based falsifier (correct) and `proposal.md` (historical).
  - Backward: the Scenario Coverage table cites S-5.3 and S-11.1 by ID only, so it remains true.
- **ADR impact:** none.

### KPC-T-4 — Overview and hub — PASS (attempt 1, resumed after Pivot)

- **Date:** 2026-10-19 · **Attempts:** 1 (the Implementer was paused at the Disqualifier, then resumed after the user's Pivot decision; no Reviewer FAIL)
- **Requirements covered:**
  - KPC-R-5 (S-5.1, S-5.2)
  - KPC-R-3 (S-3.1 at `aowStats` / ring)
  - KPC-R-10 (Overview tooltip)
  - KPC-R-11 (S-11.1 Overview rows, amended fixture)
- **Post-pivot changes:**
  - `reporting-entry-hub.percentOf` = `row.percent ?? 0`, plus a hub test (62.5 → 62.5, a program-level row at 10 → 10, absent with 1/4 → 0, not 25).
  - The S-11.1 fixture is aligned to A `1 of 4` 25 % vs B `2 of 4` 10 %, giving order B, A; the rich rows stay A, B by remaining work.
- **Red:**
  - Initial: 12 failed / 187.
  - Hub: `ReportingEntryHubComponent › percentOf returns the row percent (62.5) and 0 when absent; never done / total`, 1 failed / 30.
- **Green:**
  - T-4 pattern: 5 suites, 174/174.
  - `program-overview` (oah-hero, scope, charts): 4 suites, 288/288.
  - T-3 pattern: 7 suites, 536/536.
- **Lint:** clean on `dashboard-lab.component.ts`, `program-overview.component.ts`, `reporting-entry-hub.component.ts`.
- **Sweeps:**
  - Task `rg` and phrase family in program-overview and reporting-entry-hub: no hits.
  - The remaining `done / total` sites are in `program-overview.charts.ts` (heatmap), which T-5 owns.
- **Reviewer: PASS.**
  - `aowStats` and the ring use `averageProgress(Σ progressSum, Σ total)`; S-5.2 uses totals 4 and 1 (→ 50, not 31.3); the ring offset uses the new pct.
  - The rich sort and segment widths are unchanged; the `:457` tooltip carries the exact KPC-R-10 sentence.
  - Every hand value checks out: 12.5, 13.3, 10.1, 37.5, 40.
  - Disqualifier resolved: `[aowProgress]` / `[xcutProgress]` / `[richRows]` are bound only at `dashboard-lab.component.html:1409-1412`, and every producer fills `progressSum`.
  - The T-3 deliverables are intact.
- **ADVISORY (non-gating):**
  - The `richStats` JSDoc (`program-overview.component.ts` ~80) still says "`pct` rounds `reported/total`". It is carried to T-6 docs, since it lies outside T-5's file list.
  - The S-5.1 test compares against `buildRatio`, not `ratioOf`. They are equivalent today.
  - The strategic-outcome chips (html:929) stay count-only, consistent with KPC-DD-6. To confirm at the HITL.

### KPC-T-5 — ToC map, heatmap, and progress sorts outside the shell — PASS (attempt 2)

- **Date:** 2026-10-19 · **Attempts:** 2 · **Effort:** medium-high → xhigh on rework · **Skills:** `angular-developer`, `tdd`
- **Requirements covered:**
  - KPC-R-5 (S-5.3 amended, ToC map tooltip)
  - KPC-R-3 (heatmap cells, ToC branch and root flat)
  - KPC-R-11 (S-11.1 modal and guide)
  - Pivot T-4 (modal and guide fill `HubAowRow.percent`)

**Attempt 1**
- Files:
  - `dashboard-lab.toc-map.ts` (+spec): `TocLeaf` / `TocBranch` carry `progressSum`. Leaves take it from `buildRatio`; branches use `sumBy`.
  - `program-overview.charts.ts` (+spec):
    - `tocMapQuartileIndex(percent)`
    - `tocMapNodeColor(progressSum, total)`
    - heatmap cell `pct` = `averageProgress(Σ progressSum, Σ total)`
    - tree and heatmap tooltips read `x% (N of M reported)`
  - `where-to-report-modal.component.ts` (+spec) and `results-center-reporting-guide.component.ts` (+spec):
    - sort by `achieved_value ?? progress_value ?? 0` ascending, tie by code
    - `percent` = that value, one decimal
    - program-level rows take `buildRatio().percent`
    - G-2 left untouched
- Red: 10 failed / 114. Covers S-11.1 (guide and modal), modal program-level `percent`, toc-map `progressSum`, charts cell pct, S-3.1, S-5.3, and the three tree-tooltip copy tests.
- Green: T-5 pattern 4 suites / 124; T-4 pattern 8 / 383; T-3 pattern 7 / 536. Lint clean.
- Reviewer: **FAIL**, verbatim:
  - *Discovered Issue:* both root payloads (`tocMapOption` ~L933, `tocMapNetworkOption` ~L1001) were hard-coded `done 0 / total 0 / progressSum 0`. The shared tooltip therefore showed `Progress: 0% (0 of 0 reported)` on the SP root, whatever its real figure.
  - *Violated Rule:* KPC-R-3 ("ToC map branch/root … SHALL equal the flat mean over the union"); design §7.4 ("leaf / branch / root — carry `progressSum`").
  - *Remediation:* (a) real root figures via `sumBy(model.branches)` if the branches are disjoint, or (b) a count-only root line. Add a spec for both options.

**Attempt 2**
- Leader decision: (a) if the branches are disjoint, otherwise a deduped union, otherwise (b) reported explicitly.
- Change: a new `tocMapRootProgress(model)` sums done / total / progressSum over the branches, and both root payloads spread it. Fill stays `tokens.primary`. The docstring now points at KPC-R-5.
- Disjointness (Implementer, confirmed by the Reviewer against `buildTocMapModel` L239-327):
  - AoW branches take output leaves plus `is_aow === true` outcomes; the remaining outcomes go to the Program-level pool, deduped by `toc_result_id`.
  - Program-level is suppressed when Intermediate has a leaf (KCR-DD-7).
  - Intermediate and 2030 come from their own inputs.
- Red: `…› KPC-R-3: the SP root tooltip shows the flat % over every branch, in the radial tree and the network graph`, 1 failed / 100.
- Green: T-5 pattern 4 / 125; T-4 pattern 8 / 384; T-3 pattern 7 / 536. Lint clean.
- Reviewer: **PASS.** The root shows the flat 50 % `(4 of 5 reported)` where a mean of means would give 31.3. Only the charts .ts and its spec changed in attempt 2.

**D-3 sweep (final)**
- The `rg "done / .*total|reported / .*total|totalDone / "` hits are all comments or count shares, none a KPI %:
  - `reporting-burndown.ts:156` (comment)
  - `dashboard-lab.component.ts:1925` (comment)
  - `dashboard-lab.component.ts:2809` (`submittedPct`, a share of results in QAed/Submitted status)
  - `program-overview.charts.ts:1297`, `where-to-report-modal.component.ts:139`, `results-center-reporting-guide.component.ts:195` (comments)
- Counts outside the regex (no-space `done/total`):
  - `program-overview.charts.ts` ~1383 (per-leaf heatmap tooltip list)
  - `tocMapTable` ~1489 / 1500 (a11y table Progress column)
  - `sharePct` (`dashboard-lab.component.ts:1698`), status counts (:2896), segment widths (`program-overview.component.ts:724-796`)

**ADVISORY (non-gating)**
- Risk: output-tier nodes shared by several AoWs are counted once per AoW, and 2030 vs AoW overlap is unproven. This is the same basis as the Overview ring (KPC-S-5.2 / §7.3), so root and ring agree. If T-6 shows a gap against a hand count over distinct KPIs, open a follow-up.
- Readability: the root tooltip reads `0 indicators · Target: 0 · Achieved: 0 · Progress: 50% (4 of 5 reported)`, which is pre-existing. Hiding those lines for `kind === 'root'` is a follow-up. Summing targets is forbidden (KPC-DD-4).
- The a11y table's Progress column is a count beside a % tooltip; consider adding the %.
- The toc-map parity test recomputes inline rather than via `buildRatio`.

**Budget check:** 8 review rounds used against 6–8 planned. LOC is within the ~250 prod / ~300 test estimate (client ~+480/-180 incl. specs, server ~+90). No tripwire.

### KPC-T-6 — HITL: layout and figures, folder guides — IN PROGRESS (docs done, HITL pending)

- **Date:** 2026-10-19
- **Folder guides re-stamped** (Leader inline, docs only — the task's own deliverable, no root guide or TRD touched):
  - `dashboard-lab/CLAUDE.md`: `Verified:` re-stamped, and a new "Añadido 2026-10-19" section added.
  - `components/reporting-aow-table/CLAUDE.md`: the `Cabecera` bullet now says `· S targets` was removed and `headerTargets` no longer exists. A new bullet says the header % is the capped average and no longer `done ÷ total`. The file is at the 120-line cap.
  - `components/program-overview/CLAUDE.md`: a new Contract bullet says every % (ring, `aowStats`, ToC map, heatmap, SP root) uses the capped flat average via `progressSum`, and `N of M` stays a count.
- **Pending for the user's HITL pause:**
  - Browser check on local SP05 2026 (read-only, served bundle confirmed against disk):
    - `Total # of KPIs (213)` and no Target pill.
    - AoW01 header reads `53 KPIs` with no `targets`.
    - The AoW01 % equals a hand-computed capped mean.
    - The Overview row % equals the Reporting card %.
    - Layout at 1366, 1280 and 375 px (D-7).
  - Decisions: G-1 (Overview ring vs program achievement), G-3 (per-HLO TARGET sums mixed units), the root tooltip's `0 indicators · Target 0 · Achieved 0` lines (T-5 advisory), and whether `program-overview.row-layout.cy.ts` fixtures need `percent` (T-4 note).
  - PRTest after the push: check SP05 AoW01 against Nicoleta's Excel (D-8, KPC-OQ-1).
- **Stale comment carried from T-4 (advisory):** the `richStats` JSDoc in `program-overview.component.ts` (~80) still says "`pct` rounds `reported/total`". It is outside every task's file list, so it was not edited and is left for the user to decide.

#### KPC-T-6 — browser check (Leader via Claude in Chrome, 2026-10-19, read-only)

- **Setup:** local stack already running (client `:4200`, server `:3400`), with the user's session. The served bundle is current: the first chip reads `Total # of KPIs`. Nothing was clicked except tabs, view toggles and the read-only "Where to report" modal. No write buttons.
- **SP05 2026 (spec fixture):**
  - The chip's accessible name is `Total # of KPIs (213)`.
  - No `[data-testid=quick-typology-target-pill]` and no `aow-header-targets`.
  - The AoW01 header reads `53 KPIs` / `37 KPIs with target · 16 with no target set`.
  - Every AoW reads `0 of N · 0%`, because no 2026 achievement exists locally. **The % rule cannot be told apart on SP05**, so the hand check moved to SP01.
- **SP01 2026, hand-computed against the screen:**
  - INTERMEDIATE: the KPIs with a target are 10/10 → 100, 2/0 → 0, 10/2 → 20, 150/0 → 0 and 52 %/6 % → 11.5. Σ = 131.5 ÷ 5 = **26.3 %**, and the card shows `3 of 5 · 26.3%`. The old rule would show 60 %.
  - AOW01: 1/1 → 100 and 3/1 → 33.3, the other 19 at 0. 133.3 ÷ 21 = **6.3 %**, and the card shows `2 of 21 · 6.3%`. The old rule would show 9.5 %.
- **Overview (S-5.1, S-5.2):**
  - The hero rows match Reporting: AOW01 `2/21 · 6.3%`, AOW02 0.9, AOW03 2.4, AOW05 0.1, AOW04 0.
  - The ring reads `1.3% · 7 of 360`. The flat sum (0.9·111 + 2.4·94 + 0.1·73 + 0 + 6.3·21) ÷ 360 ≈ 1.29; a mean of row % would give 1.9.
  - The server program achievement (emerald `ACHIEVED 1.3%`) agrees with the ring, which shows T-1 and T-2 parity live and is relevant to G-1.
  - The rich rows keep the remaining-desc order (110, 91, 72, 61, 19).
- **"Where to report" modal (KPC-R-11, Pivot T-4):**
  - Bar widths come back in ascending order: AOW04 0 %, AOW05 0.1 %, AOW02 0.9 %, AOW03 2.4 %, AOW01 6.3 %. None reads 0 when the server sent a figure.
  - The program-level Intermediate bar is 26.3 %.
- **ToC map, Pathway Tree, read via the component's `tocMapOption().tooltip.formatter`:**
  - AoW children read `Progress: 6.3% (2 of 21 reported)` and the same for each AoW; Intermediate reads 26.3 %.
  - The SP root reads `Progress: 1.6% (10 of 369 reported)`, which is flat: (465 + 131.5) ÷ 369 = 1.62.
  - In the network graph, the node tooltip reads `Progress: 0% (0 of 2 reported)`.
- **Heatmap:**
  - AOW01 Outputs = 6.7 (133.3 ÷ 20), Outcomes = 0 (1 KPI), Total = **6.3**. That is flat, not 3.4.
  - The Intermediate total is 26.3.
- **Layout (D-7):** the window is maximized and won't resize, so the app was measured inside same-origin iframes of 1366, 1280 and 375 px.
  - Reporting at 1366 and 1280: none of the 423 % texts wraps, clips or overflows, and there is no horizontal scroll. The compact chip shows `KPIs 415`, with the full name in `aria-label`.
  - Reporting at 375: the header `6.3%` is on one line. The AoW code chip overlaps the bar, which the folder guide already records as a known bug ("a 375px el chip de código del AoW se superpone a la barra de progreso (no es de KTO)"). The per-KPI row % values sit in a wide inner table; they are unchanged by this spec.
  - Overview at 1366 and 1280: no wrap or clip, and no horizontal scroll.
  - Overview at 375: the document scrolls horizontally (497 px against 371). The cause is the hero row's fixed `w-[76px]` figure and `w-[118px]` action tracks, plus the tab nav. The one-decimal % fits its column without wrapping. This looks pre-existing (KZ-OAH-1), not introduced here, but it could not be verified against the old bundle.
- **Not checked live:** the Results-list Center reporting guide (unit tests only); D-8 (PRTest against Nicoleta's Excel).
- **New findings for the user (not in any task scope):**
  1. ToC map tooltips still show summed targets: AoW branches show `Target: 123` / `Target: 24601`, and heatmap cells show `Target Σ: 48`. requirements §2 says *"The page SHALL show no sum of targets"*, while KPC-R-7/R-8 scope that removal to the chip and the card header only. This is a spec gap, the same family as G-3.
  2. The Areas of Work KPI card reads `1.3% completed · 7/360 KPIs`. "completed" now labels an achievement average, not a count of completed KPIs. This is adjacent to KPC-R-10's copy rule.

## Scope Amendment: KPC-T-7 (HITL, 2026-10-19)

- **Trigger:** the T-6 browser check found that summed Target / Achieved figures remain on multi-indicator surfaces: ToC map tooltips (`Target: 123`), heatmap (`Target Σ: 48`) and HLO rows (`24 TARGET · 2 ACHIEVED`). That contradicts requirements §2 ("The page SHALL show no sum of targets") and Nicoleta's rejection of target summing. Two smaller copy issues came up alongside it.
- **User decisions (AskUserQuestion, 2026-10-19):**
  1. Remove summed Target / Achieved everywhere: heatmap, map nodes and HLO rows. This also closes G-3.
  2. Areas of Work card: `completed` → `achieved`.
  3. G-1: keep all three figures and record it as a follow-up for Nicoleta; no code change.
  4. SP root tooltip: drop the `0 indicators · Target · Achieved` lines.
- **Spec edits:**
  - requirements.md gains KPC-R-12 (S-12.1, S-12.2), KPC-R-13 and KPC-R-14, plus their index rows.
  - design.md §12 marks G-3 resolved and adds the G-1 decision row.
  - tasks.md gains KPC-T-7 before the dependency graph.
- **Budget:** this is a seventh task beyond the 6 planned, approved by the user at the HITL.

### KPC-T-7 — Remove aggregated Target / Achieved, AoW card copy, SP root tooltip — PASS (attempt 2)

- **Date:** 2026-10-19 · **Attempts:** 2 · **Effort:** medium → high on rework · **Skills:** `angular-developer`, `spartan`
- **Requirements covered:** KPC-R-12 (S-12.1, S-12.2), KPC-R-13, KPC-R-14; closes design G-3

**Attempt 1**
- Files (all under `dashboard-lab/`):
  - `dashboard-lab.component.{html,scss,ts}`: removed the By-AOW HLO TARGET / ACHIEVED header and row cells. Tracks are now `28px minmax(240px,1fr) 64px 130px`. Deleted `hloTargetSum` / `hloAchievedSum`.
  - `reporting-aow-table.component.{html,ts}`: removed the HLO summed blocks and their methods.
  - `reporting-burndown.ts`: deleted `sumTargetValues`, which has no caller left.
  - `program-overview.charts.ts`: `tocMapTooltip` prints Target / Achieved only for a leaf with `indicators === 1`, the SP root drops `N indicators`, and the heatmap tooltip loses `Target Σ · Achieved Σ`.
  - `program-overview.component.html`: the card reads `achieved`.
  - Specs and the three folder `CLAUDE.md` files updated.
- Red: 13 failed / 557 (S-12.1, S-12.2, R-12 leaf, R-13, R-14, By-AOW header, cells, tracks, and a new parse-based header/row/track parity spec).
- Green: 556 / 388 / 128 across the T-3 / T-4 / T-5 patterns. Lint clean on 10 .ts files.
- Reviewer: **FAIL**, verbatim:
  1. *Discovered Issue:* the ToC map a11y table still shows summed Target and Achieved. `tocMapTable` (`program-overview.charts.ts:1489-1519`, rendered at `program-overview.component.html:1638`) prints `branch.target` / `branch.achieved` for every AoW / bucket row and the summed `leaf.target` / `leaf.achieved` for multi-indicator leaves, and its SP root row is still `0 indicators, 0, 0, '0/0'`. *Violated Rule:* KPC-R-12, KPC-R-14. *Remediation:* blank the cells (`—`) for branches and leaves with `indicators !== 1`, empty the root's Indicators / Target / Achieved, give the root the real `tocMapRootProgress`, add a spec.
  2. *Discovered Issue:* the SP root tooltip has 3 lines (name, `SP` level, progress). *Violated Rule:* KPC-R-14 ("only the program name and its progress line"). *Remediation:* skip the level line for the root and assert the exact string in both views.
  3. *Discovered Issue:* the S-12.1 clause "AND IT MUST still show each indicator's own Target and Achieved when expanded" is untested in both views (the behaviour holds in code). *Violated Rule:* tasks.md KPC-T-7 Tests. *Remediation:* add assertions for both views.

**Attempt 2** (same Implementer resumed, Reviewer report passed verbatim)
- `tocMapTable`: branch rows and leaves with `indicators !== 1` show `—` for Target / Achieved; the root row's Indicators / Target / Achieved are empty and its Progress is `tocMapRootProgress` as `x% (N of M reported)`.
- `tocMapTooltip`: the root tooltip is name and progress only.
- Specs:
  - exact root tooltip in the radial and network views
  - table rows
  - `reporting-aow-table` indicator rows' own 15 / 5 and 10 / 5
  - a template-presence check for the By-AOW Level 3 per-indicator cells (jsdom does not render that tab)
- Red: 3 failed / 413 (KPC-R-14 exact root tooltip, `tocMapTable` blank leaf and root row, updated branch-row expectation). The S-12.1 additions were green on first write, since only coverage was missing.
- Green (`--maxWorkers=1`, low RAM): 7 suites / 534; 8 / 389; 4 / 129. Lint clean.
- Reviewer: **PASS**. All three issues are closed, attempt 2 changed only charts.ts and three specs, and every earlier deliverable is intact.

**Sweep:** `Target Σ`, `Achieved Σ` and `sumTargetValues` have 0 hits. The `completed` hits are tour storage keys and comments. The `target_value_sum` hits are per-indicator fields, plus `dashboard-lab.toc-map.ts:151`, an undisplayed payload sum that the Reviewer accepted as display-only under R-12.

**Folder doc fix (Leader inline, per the Reviewer advisory):** `program-overview/CLAUDE.md` Verified stamp and Contract bullet now describe the attempt-2 root tooltip (name and progress) and the a11y table blanking.

**ADVISORY (non-gating)**
- The By-AOW grid parity spec counts template children, so a future `@if` around a cell could fool it. Real alignment is re-checked in the browser.
- A leaf's `indicators` counts planned KPIs, including zero-target ones; this is pre-existing.

**Budget:** 7 tasks (6 planned + 1 HITL-approved) and 10 review rounds, against 6–8 planned. The overrun comes from the user-approved T-7.

#### KPC-T-6 — browser re-check after KPC-T-7 (Leader via Claude in Chrome, 2026-10-19, read-only, local SP01)

- Reporting grouped view, AOW01 expanded: the HLO rows read `6 indicators · 16.7%`, `5 indicators · 6.7%`, and so on, with no summed TARGET / ACHIEVED (S-12.1).
- By-AOW view (AOW01):
  - The header reads `TITLE & TAXONOMY | KPIS | PROGRESS` and lines up visually with the row columns (KPIs pill and %).
  - The banner reads `KPIs 21 · Reported 2/21 · Progress 6.3%`.
  - Expanding HLO 1 shows each indicator's own Target and Achieved (6 / 0, 15 / 0, 1 / 1 · 100 %), so the S-12.1 "AND IT MUST" clause holds live.
- Overview:
  - The Areas of Work card reads `1.3% achieved · 7/360 KPIs` (KPC-R-13).
  - Tooltips, read via `tocMapOption().tooltip.formatter`:
    - root `Breeding for Tomorrow | Progress: 1.6% (10 of 369 reported)` (KPC-R-14)
    - AoW `AOW01 … | 23 indicators | Progress: 6.3% (2 of 21 reported)`
    - multi-indicator leaf `HLO4… | 2 indicators | Progress: 0% (0 of 2 reported)`
    - heatmap cell `Progress: 6.7% (2 of 20 reported) · Deliverables (5)…`, with no Σ (S-12.2)
  - a11y `tocMapTable`: the root row is empty apart from `1.6% (10 of 369 reported)`; AoW and multi-indicator leaf rows show `—` for Target / Achieved.
- **Still open for T-6:**
  - the PRTest D-8 check against Nicoleta's Excel
  - a final layout check at 375 px (the By-AOW grid is now 4 tracks; the earlier 375 px Overview overflow looks pre-existing)
  - the G-1 follow-up recorded for Nicoleta

#### Correction (2026-10-19): there is no "Nicoleta Excel"
- Earlier entries above say "Nicoleta's Excel" or "ToC export Excel". No such file was provided. The only source is her red annotation on the email *"RE: Resync PRMS with ToC for BDN"*, with 11 achievement values (100, 100, 45, 73, 100, 86, 0, 100, 50, 100, 100) and 77.6 %. It names no indicators, year or source.
- Local and PRTest share prdb, so the D-8 check does not need the deploy. In prdb, SP05 AoW01 for 2026 reads `1 of 37 · 2.7%` (one KPI with achievement). The gap with her 77.6 % comes from the data, not the code.
- D-8 is resolved by asking Nicoleta which indicators and which source or year her example used (KPC-OQ-1). requirements.md, design.md and tasks.md wording was corrected; the history above is left as written.
- Push record: `b5865e341` was pushed to `qa-development-2026-ss` and fast-forwarded to `performance-refactor` (after merging `performance-refactor` in, with 3 conflicts resolved; 886 scoped tests green). CI run `39329135479` started.

#### D-8 source check (2026-10-19): `Better_Diets_and_Nutrition_ToC_export_with_2026_targets_check.xlsx`
- The user supplied the file. It was read in an isolated copy and not committed.
- It is a **2026 targets reconciliation** (ToC export of 12 Oct against the June 2026 PORB). Its columns hold baselines and 2025–2030 **targets only**: no achieved values, and no 77.6 anywhere. It cannot reproduce Nicoleta's achievement example.
- What it does settle for KPC-OQ-1: in the ToC export, AoW01 has **36 indicators with a 2026 target > 0** (33 HLO + 3 IO, counting "Indicator total" rows only), against **37 with a target** in PRMS. The denominator is therefore about 36–37, not 11. Her 11 values look like a selection, probably the indicators with reported values. To be confirmed with her.
- The file itself warns that "summing % IO values with counts gives a number that is not meaningful", which agrees with KPC-R-12 (no target sums).
- Its row 55 ("System / dashboard (as quoted in email) 53 | 6 of 7 | 209") quotes the old dashboard figures from before this spec.

### KPC-T-6 — HITL: layout and figures, folder guides — PASS (closed 2026-10-19)

- **D-8 resolved:** the user confirmed that Nicoleta's 77.6 % (BDN AoW1, 11 values) is an **illustrative example of the formula**, not real data. Nothing needs reconciling against prdb. Her formula is exactly KPC-R-1/R-2 and is pinned on both sides by the KPC-S-2.1 fixture (client `reporting-burndown.spec`, server `toc-progress-rollup.spec`, both 77.6).
- **KPC-OQ-1:** stays at the user's 2026-10-19 default: all KPIs with a target, unreported KPIs count as 0. The ToC export confirms a denominator of 36–37 for AoW01.
- **D-7 layout:**
  - 1366 and 1280 px are clean on Reporting and Overview.
  - At 375 px, the Reporting header % stays on one line. The known AoW code chip overlap was already documented in the folder guide. The Overview horizontal overflow comes from fixed row tracks plus the tab nav, not the decimal, and looks pre-existing.
  - The By-AOW grid is 4 tracks after T-7, aligned live at desktop width.
- **Decisions recorded:**
  - G-1: keep the three figures; follow-up for Nicoleta, no code change.
  - G-3: resolved by KPC-T-7.
  - Root tooltip: fixed by KPC-T-7.
- **Folder guides:** re-stamped (T-6 and T-7), and the merge with `performance-refactor` was reconciled.
- **Final state:** 7/7 tasks `[x]`, 10 review rounds, pushed as `b5865e341` to `qa-development-2026-ss` and `performance-refactor`.

## Summary

The Science Program shell and the server roll-up now show every KPI progress % as the mean of `min(achieved ÷ target, 1) × 100` over the KPIs with a target. The figure is flat over the leaf indicators and rounded to one decimal.

- Target aggregation is gone from every multi-indicator surface: the chip, the card header, HLO rows, ToC map, heatmap and the a11y table.
- The first chip reads `Total # of KPIs`, and the Areas of Work card reads `achieved`.
- Two Pivots were recorded:
  - T-4: the modal and guide fill their bars from the server value.
  - T-7: a HITL-approved scope amendment.
- Open follow-ups, outside the spec:
  - G-1 (duplicate 1.3 % on the Overview), for Nicoleta.
  - G-2 (`area.progress.done` is never sent).
  - The 375 px Overview overflow.
  - The `richStats` JSDoc wording.
  - The `/akili-archive` guide, TRD and kaizen sync on `staging`.
