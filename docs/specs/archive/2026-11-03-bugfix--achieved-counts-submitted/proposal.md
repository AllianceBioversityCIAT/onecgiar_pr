# Proposal: "Achieved" must count submitted results (QA'd + not-yet-QA'd), with the QA / Prel split hidden for now

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/bugfix/achieved-counts-submitted` |
| Slug | `achieved-counts-submitted` — derived from free-text argument ("Nicoleta reporta esto para corregir", ticket PDF) |
| Type | **Bug** |
| Approval Mode | `gated` (default) |
| Requested by | santiago.sanchez@cgiar.org, relaying Nicoleta Trifa (CGIAR System Organization) |
| Source | Ticket **#INC-162943** "Issues sync reporting with overview" (Alliance IT Support, due Sat 10 Oct) — reply of **30 Sep 2026** |
| Date | 2026-10-02 |
| Predecessor | `docs/specs/bugfix/indicator-achieved-value-per-center` (backend half done; its §7 client follow-up was explicitly deferred — **this is that follow-up**) |
| Depends on | `bugfix/indicator-achieved-value-per-center` (already executed) · Parallel-safe: no (same files as `reported-results-center-scoping`) |

## 2. Intent

Program / Accelerator (P/A) leads must see the progress they report **as soon as a result is submitted**, not only after QA (which ends ~February). Nicoleta's rule, verbatim:

> "Achieved value = preliminary + QA. If you remove QA and Prel from the equation, then achieved is whatever the user reports as achieved value for submitted results (regardless if these are QA'ed or not)."
> "…remove for now that split between QA and Prel (or hide it)…"

## 3. Problem / Current Behavior

Two examples in the ticket, same symptom:

| Example | Where | Shown today | Expected |
|---|---|---|---|
| KP **31037** (SAAF / SP03), submitted | Reporting → AoW1 / HLO 1.1, indicator "Tanzania – chicken…", Target 1 | Achieved **0**, status *Not started*, QA 0%, Prel 100% | Achieved **1**, 100%, status *Achieved* |
| Same program | Overview → Progress by area of work → Productivity+ | **0/90** KPIs, QA 0%, Prel 0.5% | **1/90**, one progress figure |
| KP **30983** (SF / SP02), submitted | Reporting → AoW5 / HLO 5.3 (FAIR KPs, CIMMYT row, Target 5) | Achieved 0, Prel 20% | Achieved 1, 20% (per-center part fixed on 21 Sep) |

## 4. Proposed Outcome

- Every **Achieved** figure (indicator row, HLO sum, KPIs-reported counts, status badge, progress %) is computed from results with status **Submitted (3) + QualityAssessed (2) + Approved (6)** — each result counted once.
- The UI shows **one** progress figure instead of the QA / Prel pair. The split is hidden behind a single switch so it can come back after the QA cycle without new work.
- Nothing about *which* row a result counts in changes (per-center / exact-target scoping from the previous two specs stays as is).

## 5. Scope

**Server** (`aow-bilateral.repository.ts`, `toc-progress-rollup.ts`) — additive only:
- Per indicator: add `achieved_progress_percentage` = `achieved_value_sum / target` (the `achieved_value_sum` field already ships).
- Roll-ups (HLO → AoW → Science Program): add the achieved figure next to the existing `progress_value` / `preliminary_value`.

**Client** — switch the bindings from `actual_achieved_value_sum` / `progress_percentage` to the achieved pair, and hide QA/Prel:
- `dashboard-lab/components/reporting-aow-table` — `achievedText`, `achievedIsEmpty`, `hloAchievedSum`, `statusOf`/`progressOf`, the row bars and the AoW/HLO header QA·Prel chips.
- `dashboard-lab/components/program-overview` — "Progress by area of work" rows and the program hero (QA/Prel → one %).
- `dashboard-lab/reporting-burndown.ts` → `achievedOf` (drives the **0/90 → 1/90** count and the "KPIs with evidence" band).
- `entity-aow/.../aow-hlo-table` — same switch (legacy By-AoW table).
- `dashboard-lab/components/indicator-drawer`, `dashboard-lab.toc-map.ts` — same switch, so no surface disagrees with the table.

## 6. Non-Goals

- Changing which ToC row / center a result is counted in (done in `reported-results-center-scoping` and `indicator-achieved-value-per-center`).
- The Bilateral-indicator-without-center question from the 21 Sep email — Nicoleta asked to treat it **separately**; still waiting on her answers.
- Removing `actual_achieved_value_sum` / `preliminary_*` from the payload (kept: additive change, revertible).
- Excel export and Home "galaxy" (`results.service.ts:1670`, `results-framework-reporting.service.ts:99`) — see OQ-2.

## 7. Affected Users, Systems, And Specs

| Item | Detail |
|---|---|
| Users | P/A leads & coordinators, PMU (Nicoleta) |
| Screens | SP shell → **Reporting** tab, **Overview** tab, indicator drawer, ToC map, legacy By-AoW table |
| Server | `onecgiar-pr-server/src/api/results/results-toc-results/repositories/aow-bilateral.repository.ts`, `toc-progress-rollup.ts` |
| Client | `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/**`, `entity-aow/**/aow-hlo-table` |
| Related specs | `bugfix/indicator-achieved-value-per-center`, `bugfix/reported-results-center-scoping`, archived P2-3296 (QA/Prel bars), `bugfix/kpi-count-reconciliation` (archived — owns `summarisePartition`) |

## 8. Visual Reference

- Source: None (ticket screenshots only — `C:\Users\santiagosanchez\Downloads\Alliance IT Support Count.pdf`, pages 1–4).
- Notes: no new layout. The QA + Prel two-track cell becomes a single track using the existing bar/token; the header chips "QA x% · PREL. y%" become one "x%". Spartan per project rule if any component changes.

## 9. Bug Diagnosis

### Observed Symptom
Submitted (not yet QA'd) results show **Achieved 0** and *Not started*, and the Overview counts **0** KPIs reported, while the Prel bar shows progress — the screen contradicts itself.

### Reproduction Steps
1. Open SAAF (SP03) → Reporting, filter Knowledge Product, expand AoW1 → HLO 1.1.
2. Row "Tanzania – chicken…" (Target 1), which has KP 31037 at status **Submitted (3)**.
3. Expected Achieved 1 / 100% / Achieved. Actual: Achieved 0, *Not started*, QA 0%, Prel 100%.
4. Overview → Progress by area of work → Productivity+: actual 0/90.

### Root Cause (confirmed in code)
The server already computes the right number; **the client never reads it.**

1. `getIndicatorContributions` (`aow-bilateral.repository.ts:933-938`) returns three sums:
   `actual_achieved_value_sum` = status (2, 6) · `preliminary_achieved_value_sum` = (3, 6) · `achieved_value_sum` = (2, 3, 6). The third was added by `indicator-achieved-value-per-center` (RFR-T-2) and passed through to the payload (`:439`, `:725`).
2. **No client file references `achieved_value_sum`** (grep over `onecgiar-pr-client/src` — zero hits). Every "Achieved" surface reads the QA-only field:
   - `reporting-aow-table.component.ts:392` `achievedText` → `actual_achieved_value_sum`; `:411` empty state; `:989` HLO sum; `:341` `statusOf` → `progress_percentage` (QA-only %).
   - `reporting-burndown.ts:52` `achievedOf` → `actual_achieved_value_sum` → feeds `summarisePartition` → the **0/90** count.
   - `aow-hlo-table.component.html:134`, `:178-183` — same field and QA-only status.
3. The roll-ups (`toc-progress-rollup.ts:124-137`) only know `actual` and `preliminary`; there is no union figure above indicator level, so HLO / AoW / Program percentages cannot show it either.
4. The previous spec flagged this exactly: `indicator-achieved-value-per-center/tasks.md §7` — *"File the client-binding follow-up… if the screen still displays the wrong basis"* — and it was never filed.

So for KP 31037 (status 3): `actual = 0`, `preliminary = 1`, `achieved = 1` reaches the browser, and the browser displays `actual`.

### Impact & Scope
- Every SP, every indicator: any submitted-not-QA'd result is invisible in Achieved, status, the KPIs-reported counts and the AoW/Program %. Approved (6) bilateral results already count (they are in both sets).
- No data integrity risk — read-only display; nothing written.
- Approved (6) is in both QA and Prel, so naïvely adding the two bars would double-count it; using `achieved_value_sum` (one `status_id` per result) avoids that.

### Fix Strategy
`/akili-specify` (Lite) in **Bug Mode** — logic touches several surfaces and the roll-up, not cosmetic. Regression tests: server roll-up carries the achieved figure; client `achievedText` / `statusOf` / `achievedOf` return 1 / *achieved* / counted for a row with `actual=0, preliminary=1, achieved=1` (red today).

## 10. Approach Options

| Option | What | Pros | Cons |
|---|---|---|---|
| **A — Additive server + client switch** (recommended) | Server adds `achieved_progress_percentage` + achieved roll-up; client reads them; QA/Prel hidden behind one constant | Payload stays backwards-compatible; split returns by flipping one flag; QA figure still available for the drawer/tooltip | Touches ~6 client files |
| B — Redefine on the server | Make `actual_achieved_value_sum` / `progress_percentage` mean (2, 3, 6) | Smallest client diff; Excel/galaxy follow automatically | Silently changes a field P2-2841 fixed; loses the QA-only number; reverting needs a server deploy; the Prel bar would then duplicate it |
| C — Client-only | Client sums/derives from fields it has | No server change | Can't compute HLO/AoW/Program roll-ups correctly in the browser (averages of ratios); Approved double-count risk |

## 11. Recommended Approach

**Option A.** It is the smallest *safe* path: the indicator number already exists server-side, the roll-up gets one more field mirroring the two it has, and the client switches bindings. "For now" is honoured by one switch (`SHOW_QA_PREL_SPLIT = false`) instead of deleting the bars. Status badge (Not started / In progress / Achieved / Overachieved) moves to the achieved % so it never contradicts the number beside it.

## 12. Risks, Dependencies, And Open Questions

| ID | Item |
|---|---|
| R-1 | Many Cypress/Jest specs assert `QA` / `Prel.` text (`reporting-aow-table.row-layout.cy.ts`, `program-overview.row-layout.cy.ts`, `aow-hlo-table.component.spec.ts`, …). Hiding the split will break them — run the affected specs before commit (memory: *run client tests before commit*; scoped `--testPathPattern` only). |
| R-2 | The Report-button rule (`b42862223`, enabled on achieved/overachieved) keys off status → it will now flip on submitted results. Intended, but confirm. |
| R-3 | Shares `aow-bilateral.repository.ts` with uncommitted / recent work (`reported-results-center-scoping`) — not parallel-safe. |
| OQ-1 | Hide QA/Prel **completely**, or keep it in a tooltip on the single figure? (Proposal: hide; QA-only value available in tooltip.) |
| OQ-2 | Excel export and Home galaxy also use the QA-only figure — switch them too for consistency? (Proposal: yes in a follow-up, or here if Nicoleta wants every surface aligned.) |
| OQ-3 | Do **Pending Review (5)** bilateral results count? Today neither bar counts them; proposal keeps (2, 3, 6). |
| Verify | Before execution, confirm on the DB that 31037 is `status_id = 3` with `contributing_indicator = 1` on that `toc_indicator_target_id` (query to paste inline on request). |

## 13. Success Criteria

- SAAF / AoW1 / HLO 1.1 "Tanzania – chicken…" shows **Achieved 1**, **100%**, status *Achieved*, with KP 31037 only Submitted.
- Overview Productivity+ shows **1/90** and a non-zero single progress %.
- SF / AoW5 / HLO 5.3 FAIR CIMMYT row shows **Achieved 1**, **20%**.
- No QA / Prel pair visible on Reporting, Overview, drawer, ToC map, By-AoW table; flipping the switch restores it.
- A result that moves Submitted → QA'd keeps the same Achieved (no drop, no double count).

## 14. Next Step

```text
/akili-specify bugfix/achieved-counts-submitted   (Bug Mode)
```
