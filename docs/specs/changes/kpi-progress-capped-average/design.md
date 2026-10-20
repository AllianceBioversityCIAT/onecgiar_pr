# Design — KPI progress as a capped average, no target aggregation

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/kpi-progress-capped-average/` |
| Requirements | `requirements.md` (KPC-R-1 … R-11) |
| Depth | Standard (re-checked against this design in §13) |
| Approval Mode | gated |
| Status | approved (2026-10-19, spec gates) |
| Skills | `nestjs-expert` (server roll-up), `angular-developer` (client), `tdd` (both rules) |

## 2. Summary

One rule, written twice and pinned by one shared fixture:

| Side | Single home | Change |
|---|---|---|
| Server | `onecgiar-pr-server/src/api/results/results-toc-results/repositories/toc-progress-rollup.ts` | `ratio()` capped at 1; `rollUpChildren` weights each child by `indicators_counted` → flat mean over the leaf indicators |
| Client | `onecgiar-pr-client/.../dashboard-lab/reporting-burndown.ts` | `kpiProgressOf` (capped KPI %), `averageProgress` (Σ ÷ n, one decimal); `buildRatio` returns `percent` = capped mean **and** `progressSum`; `summarisePartition` returns `percent` |

Every surface that paints a % stops dividing `done ÷ total` itself. Instead, its row carries `progressSum` next to `total`, and every multi-row figure is `averageProgress(Σ progressSum, Σ total)`. That's flat by construction (KPC-R-3).

## 1A. Premise Ledger

| # | Premise | Verified |
|---|---|---|
| P-1 | Server HLO figure = mean over its own indicators (`rollUpIndicators`); AoW/SP = `rollUpChildren` of those | `results-framework-reporting.service.ts:480, 853, 862`; `aow-bilateral.repository.ts:775` |
| P-2 | Weighting a child mean by `indicators_counted` = flat leaf mean, because each child figure is itself the mean over exactly those indicators | Arithmetic; pinned by test KPC-S-3.2 |
| P-3 | Indicator rows' own `progress_percentage` is computed elsewhere (`aow-bilateral.repository.ts` `formatProgressPercentage`), not by `ratio()` → raw value survives (KPC-S-6.3) | `aow-bilateral.repository.ts:448-463, 886-889` |
| P-4 | `getStatusLabel(...) > 100 → Overachieved` (entity-aow `aow-hlo-table.component.ts:299`) and `statusOf` (`reporting-aow-table.component.ts:386`) read **indicator rows**, not roll-ups → unaffected by the cap | Templates bind `result.progress_percentage` / `row.progress_percentage` |
| P-5 | Every shell % surface derives from `buildRatio` / `applyZeroTargetRule` over the partition (KCR-DD-1) | Consumer sweep: `dashboard-lab.component.ts:1904, 1940, 1968, 2841, 5427`; `program-overview.component.ts:401, 418, 459`; `reporting-entry-hub.component.ts:270`; `dashboard-lab.toc-map.ts:146, 191, 264, 303`; `program-overview.charts.ts:766, 1286` |
| P-6 | Overview strategic-outcome chips render counts only (`done/total`, `program-overview.component.html:929`), no % | Template read |
| P-7 | Where-to-report modal's internal path reads `area.progress.done`, which the server roll-up never sends (it has `counted`), so its own sort is effectively by 0 today | `where-to-report-modal.component.ts:131-142`. Pre-existing; see §12 G-2 |
| P-8 | `sumTargetValues` is still needed for the per-HLO `TARGET` figure (`reporting-aow-table.component.ts:1057`), which is not "at the top" | Read |

## 3. Architecture Overview

```text
server  rollUpIndicators(HLO) ─cap─► HLO %      rollUpChildren(weighted by indicators_counted) ─► AoW %, SP %
client  partition ─► buildRatio(set) ─► {done,total,percent,progressSum,zeroTarget}
                         │
                         ├─ card bar / banner ............ percent
                         ├─ Overview rows / hub rows ..... percent (row) · sort by percent
                         ├─ aowStats / ring / heatmap /
                         │  ToC map branch & root ....... averageProgress(Σ progressSum, Σ total)
                         └─ counts (N of M, split line) . unchanged
```

## 4. Data Model / Migrations

None.

## 5. API Surface

No endpoint or field change. Only the **values** of `progress_*`, `preliminary_*`, `achieved_*` on the AoW and Science Program ToC progress endpoints move (KPC-R-6). No bilateral / platform-report impact.

## 6. Server Rules (KPC-R-6)

| Function | Rule |
|---|---|
| `ratio(achieved, target)` | `min(achieved ÷ target, 1)`; non-finite achieved → 0 |
| `rollUpIndicators` | Unchanged mean over `hasUsableTarget` indicators (now of capped ratios) |
| `rollUpChildren` | Children with `progress_value !== null`. Each basis (actual, preliminary, achieved) = `Σ(value × indicators_counted) ÷ Σ indicators_counted`; null when the weight is 0. `counted / total / indicators_*` unchanged |
| Header comment | Rewritten: records the 2026-10-19 reversal of "do not cap" and "mean of HLO means" with the source email (KZ-BOR-1) |

## 7. Frontend Plan

### 7.1 Shared rule — `reporting-burndown.ts` (KPC-R-1, R-2, R-3)

| Export | Contract |
|---|---|
| `kpiProgressOf(ind)` | Capped KPI % (0–100) for a KPI with a target, 0 otherwise. Uses the same `achievedOf` / `targetOf` parsing as today (KPC-S-1.3) |
| `roundProgress(x)` | One decimal; non-finite → 0 |
| `averageProgress(sum, n)` | `n > 0 ? roundProgress(sum ÷ n) : 0` |
| `buildRatio(inds)` | Adds `progressSum`; `percent` = `averageProgress(progressSum, total)`. `done`, `total`, `zeroTarget` unchanged |
| `summarisePartition(p)` | Adds `percent` over the counted set |
| Module header | States the new rule; keeps the has-a-target text |

### 7.2 Reporting tab (KPC-R-4, R-7, R-8, R-9, R-10)

| File | Change |
|---|---|
| `reporting-aow-table.component.ts` | `ratioOf` passes through the new `percent` (bar width + text). `headerTargets` and its template span removed (KPC-R-8). `ratioRuleSentence` / `ratioPercentTooltip` → KPC-R-10 sentence. `achievementTooltip` sentence "KPI reporting progress counts only KPIs with a target separately" → reworded so it no longer calls the % a count |
| `reporting-aow-table.component.html` | Remove the `aow-header-targets` span; % text renders the one-decimal figure |
| `dashboard-lab.component.ts` `buildAowBannerStats` | `pct` = `percent` (already flows) |
| `reporting-quick-typology.util.ts` | `QUICK_TYPOLOGIES[0]` label `Total # of KPIs`, short `KPIs` |
| `reporting-quick-typology-filters.component.ts` | Remove the Target pill and the `targetSum` input |
| `reporting-program-band.component.{ts,html}` | Remove the `targetSum` input and binding |
| `dashboard-lab.component.{ts,html}` | Remove `reportingTargetSum` and both `[targetSum]` bindings; drop the now-unused import |

### 7.3 Overview + hub (KPC-R-5, R-10, R-11)

| Site | Change |
|---|---|
| `OverviewAowProgressRow` / `AowProgressRow` / `HubAowRow` / `HubProgramLevelRow` | Add optional `percent` and `progressSum` (optional so external callers and fixtures keep compiling) |
| `dashboard-lab` `overviewAowProgress`, `overviewXcutProgress` | Fill `percent` / `progressSum` from `buildRatio`; `overviewAowProgress` sort ascending by `percent`, tie code |
| `dashboard-lab` `overviewAowProgressRich` | Add `percent` / `progressSum` from `buildRatio(counted)`. Sort (remaining desc) unchanged: it's a work-queue order, not a progress order |
| `hubProgramLevelRows` | Fill `percent` / `progressSum` |
| `program-overview` `aowStats.pct`, `richStats.pct` (+ ring offset) | `averageProgress(Σ progressSum, Σ total)` |
| `program-overview` `percentOfRich(row)` | `row.percent` |
| `program-overview.component.html:457` tooltip | KPC-R-10 sentence; the `N of M` caption keeps its count wording |
| `reporting-entry-hub` `percentOf(row)` | `row.percent ?? 0` |
| Segment widths (`completeSegmentWidth`, …) | **Unchanged**: they are shares of KPI counts by state, not progress |

### 7.4 ToC map + heatmap (KPC-R-5)

| Site | Change |
|---|---|
| `dashboard-lab.toc-map.ts` leaf / branch / root | Carry `progressSum` beside `done` / `total` (`sumBy` like the others) |
| `program-overview.charts.ts` `tocMapQuartileIndex` | Takes the aggregate % (0–100) instead of `done, total` |
| heatmap cell `pct` | `averageProgress(Σ progressSum, Σ total)`; `Progress: done/total` tooltip line becomes `Progress: x% (N of M reported)` |

### 7.5 Sorting outside the shell (KPC-R-11)

| Site | Change |
|---|---|
| `where-to-report-modal` internal path | Sort by `area.progress.achieved_value ?? area.progress.progress_value ?? 0` (server, now capped & flat); `customAowRows` path already sorted by the shell |
| `results-center-reporting-guide` | Same as the modal |
| Modal + guide hub rows (Pivot T-4) | Fill `HubAowRow.percent` with the same server value used for the sort; program-level rows take `buildRatio().percent`. The shared hub `percentOf` reads `row.percent ?? 0` |

## 8. Security / Performance / Observability

No auth change, no new call, no logging. Client cost: one extra pass per `buildRatio` (O(KPIs)).

## 9. Testing Plan

| Layer | Suites (scoped, `--maxWorkers=2`) | Covers |
|---|---|---|
| Server unit | `toc-progress-rollup.spec.ts` | S-1.1 (server), S-2.1, S-3.1/3.2, S-6.1/6.2 |
| Server service | `results-framework-reporting.service.spec.ts`, `aow-bilateral.repository.spec.ts` | S-6.3, shape unchanged |
| Client rule | `reporting-burndown.spec.ts` | S-1.1–1.3, S-2.1, S-2.2, S-3.1 |
| Reporting | `reporting-aow-table.component.spec.ts`, `reporting-program-band.component.spec.ts`, `reporting-quick-typology.util.spec.ts`, `dashboard-lab.kcr-reconciliation.spec.ts` | S-4.1, S-4.2, S-7.1, S-8.1, S-9.1, S-10.1 |
| Overview | `program-overview.component.spec.ts`, `dashboard-lab.oah-rows.spec.ts`, `dashboard-lab.hub.spec.ts`, `reporting-entry-hub.component.spec.ts` | S-5.1, S-5.2, S-11.1 |
| ToC map | `dashboard-lab.toc-map.spec.ts`, `program-overview.charts.spec.ts` | S-5.3 |
| Sort outside shell | `where-to-report-modal.component.spec.ts`, `results-center-reporting-guide.component.spec.ts` | S-11.1 |
| Gate sweeps | `rg` commands of requirements §8 D-3, D-5, D-6 | Remnants |
| HITL | Browser at 1366 / 1280 / 375 (D-7); SP05 AoW01 vs Nicoleta worked example (D-8; local and PRTest share prdb) | Layout, data |

Lint: `ESLINT_USE_FLAT_CONFIG=false npx eslint <touched .ts> --quiet` (client, `KZ-changes--reporting-dynamic-kpi-target-counts-1`); `npx eslint <touched .ts> --quiet` (server).

## 10. Backwards Compatibility / Rollback

- Values change on screen and in the endpoints; shape doesn't. Rollback = revert the commits. No data to restore.
- Folder guides that state the old rule are re-stamped in the last code task: `dashboard-lab/CLAUDE.md`, `reporting-aow-table/CLAUDE.md`, `program-overview/CLAUDE.md`. Root guides and the TRD wait for `/akili-archive` on `staging` (shared-file write discipline).

## 11. Design Decisions

### KPC-DD-1 — Same rule on both sides, pinned by one fixture (Option B)

The client keeps computing so filters keep moving the %. The server is corrected so its HLO/AoW figures agree. Rejected: A (client only: server figures contradict the bar), C (client reads server: filters stop moving the %; large refactor).

### KPC-DD-2 — Aggregate through `progressSum`, never through rounded percents

Rows carry the unrounded sum. Any multi-row figure is `Σ progressSum ÷ Σ total`. This makes KPC-R-3 structural rather than a convention each surface has to remember.

### KPC-DD-3 — Server flat mean by weighting, not by re-walking leaves

`rollUpChildren` weights by `indicators_counted`. Equal to the leaf mean (P-2), needs no new field, and keeps the response shape.

### KPC-DD-4 — Remove the Target chip and the header target sum (reversion)

**Challenge: "what does removing this break?"**
- Tests: band spec (pill present, no `aria-pressed`), typology filters spec, aow-table header specs, and the KCR reconciliation's "Σ AoW target sums = Target chip" identity. They are removed or inverted into absence assertions (KPC-S-7.1, S-8.1). The KCR count identity (`Total # of KPIs` = Σ chips) stays.
- Code: `sumTargetValues` must stay because the per-HLO `TARGET` figure uses it (P-8). Only its two "top" callers go.
- Users: nobody loses data; the per-HLO target stays visible.
- Outcome: no unaddressed breakage.

### KPC-DD-5 — Remove the server "no cap" and "mean of HLO means" rules (reversion)

**Challenge: "what does removing this break?"**
- Overachieved labels: they read indicator rows, not roll-ups (P-4), so they're safe.
- Server tests asserting `500%` and the equal-weight `50%`: inverted to KPC-S-6.1/S-3.1 (done in the adopted draft).
- Bars sized from `progress_value` above 100: they were already clamped client-side, so nothing visible changes except the value.
- Outcome: no unaddressed breakage; history recorded in the source comment (KZ-BOR-1).

### KPC-DD-6 — Keep `N of M` as text and keep the Overview's server achievement figure

`N of M` stays as the count (KPC-OQ-2). The Overview hero keeps the emerald program achievement (server, QA/Prel split) next to the ring. After this change both use the same rule, so they agree when filters and basis match. Removing one is a product call, not part of Nicoleta's ask (G-1).

### KPC-DD-7 — Overview rich rows keep their "remaining work" sort

`overviewAowProgressRich` orders by remaining KPIs to report (a to-do order, OAH-R-3), not by progress. KPC-R-11 applies only to lists sorted by progress.

### KPC-DD-8 — The adopted pre-spec draft

The draft is adopted as is. Server: matches §6 exactly. Client: `reporting-burndown.ts` matches §7.1. T-1 and T-2 own it, and the Reviewer audits it like any other diff.

## 12. Open Gaps & Follow-ups

| # | Item |
|---|---|
| G-1 | Possible near-duplicate figure on the Overview (ring vs program achievement). Show at HITL; user decides |
| G-2 | P-7: the Where-to-report modal's internal path reads `area.progress.done`, which doesn't exist. The displayed `done` is 0 there. Not caused by this spec; record as a follow-up, do not fix here |
| G-3 | The per-HLO `TARGET` figure still sums targets of mixed units under one HLO. Nicoleta's comment targets "the top" only. Raise with her at PRTest check | **Resolved 2026-10-19 (HITL): removed, see KPC-R-12 / KPC-T-7.**
| G-1 decision | 2026-10-19 (HITL): keep the ring, the card and the emerald ACHIEVED box; they now agree by design. Record as a follow-up for Nicoleta, no code change |

## 13. Budget (tripwire for `/akili-execute`)

| Measure | Expected |
|---|---|
| Tasks | 6 (T-1 server, T-2 client rule, T-3 Reporting, T-4 Overview + hub, T-5 ToC map + sorts, T-6 HITL + guides) |
| Production LOC | ~250 (net, removals included) |
| Test LOC | ~300 |
| Review rounds | 6–8 (one per code task, plus up to 2 reworks) |

Matches Standard depth.
