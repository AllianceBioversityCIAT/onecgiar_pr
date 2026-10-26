# Kaizen Entry — changes/portfolio-overview-revamp/toc-kpi-no-target-disclosure

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/portfolio-overview-revamp/toc-kpi-no-target-disclosure` |
| Date | 2026-10-22 |
| Branch | qa-development-2026-ss (spec branch, since `Default Branch: master`. Every shared-file write below is recorded, not applied) |
| Archive Run | 1 |
| Approval Mode | gated (owner: "continue until you finish all tasks" after T-1) |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 3 of 3 (2 code + 1 HITL) | tasks.md |
| Reviewer FAIL rework attempts | 0 (T-1 and T-2 PASS on attempt 1) | execution.md |
| HALTs / FATAL_FAILs / Pivots | 0 / 0 / 0 | execution.md |
| PRODUCT_BUGs | n/a (no `/akili-test`; absence accepted) | — |
| Validation FAIL / WARN | n/a (no `/akili-validate`; absence accepted). Live parity 13/13 programs ✅ | execution.md TND-T-3 |
| Budget | 3 tasks as planned, 1 review round per code task, about 330 LOC against about 260 (≈ 1.3×, mostly specs) | execution.md Summary |
| Waste (MUDA) | One 13-minute `--findRelatedTests` rerun to name 1 failure. One user round-trip on an empty parity result. Two failed narrow-viewport routes before emulation worked | execution.md TND-T-2, TND-T-3 |

## Lessons

- **KZ-changes--portfolio-overview-revamp--toc-kpi-no-target-disclosure-1 — A named parity sample can name a class of entity that has no data.** (Product, Low)
  - Root cause: TND-T-3 step 1 asked for "SP05 BDN and one Accelerator". No one checked first that an Accelerator has ToC rows in the 2026 phase. None does, so the sample could not test the Accelerator path. The Leader then filled the slot with SP12, which is a Science Program. The user challenged the scope ("why only SP05 and SP12?"), and a full `GROUP BY` query was needed to settle it.
  - Evidence: tasks.md TND-T-3 step 1; execution.md TND-T-3 "Full-portfolio parity" (23 rows, SP01 to SP13 only).
  - Standardization: → P2

- **KZ-changes--portfolio-overview-revamp--toc-kpi-no-target-disclosure-2 — A broad verification run whose output is not saved costs a full rerun to name one failure.** (Product, Low)
  - Root cause: the T-2 brief prescribed `--findRelatedTests` (442 suites, 812 s) with `--silent --reporters=summary` and no saved output. One suite failed and its name was lost in the tail, so the Leader had to rerun for about 13 minutes with `--json --outputFile` to attribute it. It was a pre-existing flake.
  - Evidence: execution.md TND-T-2 "`--findRelatedTests`" bullets.
  - Standardization: → P3

## Noted, not a lesson

- A DBeaver script with `SET @var` lines followed by a `SELECT` returned an empty grid, because Ctrl+Enter ran only the `SELECT`. A variable-free query fixed it. This fits the existing DBeaver memory: hand over single-statement queries.
- `global-completeness-status.component.spec.ts:92` has a `setTimeout` assertion that leaks under load. It is a pre-existing flake, recorded in the archive summary.
- The summary figure `24 / 2452` wraps at ≤ about 430 px (pre-existing, global-filters markup).
- **Worked well:** after both `resize_window` and the same-origin iframe failed, the narrow-viewport check worked this way. Rewrite each `CSSMediaRule` (`min-width` / `width >=`) to `all` or `not all` for the target width, then size the block at `viewport / html zoom`. The app sets `html { zoom: 1.15 }`, and ignoring it overstates the width by 15%. → P4.
- **Worked well:** T-3 parity was rebuilt with `EXISTS`, without the endpoint's join. It was independent of the code under test and matched on the first full run.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/portfolio-overview/CLAUDE.md` § Progress against ToC KPIs (line 116) and the `Verified:` line |
| Edit | Replace "total = 0 reads "No ToC KPIs in this phase"" with: "total counts only KPIs with a target > 0 for the year. `noTarget` (server `LEFT JOIN`, client `?? 0`) shows "excludes N KPI(s) with no target set" under the summary or row. total = 0 reads `noTargetOnly(n)` when noTarget > 0, else "No ToC KPIs in this phase" (spec toc-kpi-no-target-disclosure)." Re-stamp `Verified:`. Keep ≤ 120 lines. |
| Severity | Medium (the guide now states a falsehood, and the client convention wanted it in the T-2 commit) |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/task.md` (HITL / verification task guidance) |
| Edit | "A real-data parity step groups the independent query by every entity (no named sample) and compares the full set. A named sample may be added, but only for an entity class shown to have rows in the target phase." |
| Severity | Low |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | standardization |
| Target | root `AGENTS.md` → AKILI-SPECS constitutional baseline, agent-lean verification commands |
| Edit | "For `--findRelatedTests` or any run above about 50 suites, add `--json --outputFile=<scratchpad>/<task>.json`, so that a failure is named from the file and not by a rerun." |
| Severity | Low |
| Status | pending |

### P4

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-changes--clear-filters-2` |
| Edit | Add source `changes/portfolio-overview-revamp/toc-kpi-no-target-disclosure` as a recurrence. `resize_window` was again a no-op (maximized window), and popups were blocked. The same-origin iframe fallback **did not render the route** this time (the shell loaded, the page body stayed empty). A third route worked: CSSOM media-rule rewrite plus block width = `viewport / html zoom (1.15)`. Suggest the probe lists all three routes in order and records the html zoom. |
| Severity | Medium |
| Status | pending |

### P5

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-results--program-full-names-labels-1` |
| Edit | Add source `changes/portfolio-overview-revamp/toc-kpi-no-target-disclosure`. tasks.md TND-T-2 again prescribed `npx eslint <touched files> --quiet`, which fails without a flat config, and the Implementer needed `ESLINT_USE_FLAT_CONFIG=false`. The same root cause is tracked as `KZ-bilateral--replicated-innovations-2026-pa--center-overview-w3-scope-1`, so merge both at apply time. |
| Severity | High |
| Status | pending |

### P6

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-changes--aow-identity-column-starvation-1` |
| Edit | Add source `changes/portfolio-overview-revamp/toc-kpi-no-target-disclosure`. Here the governing convention was omitted by the **spec**, not the brief. TND-T-2's Files list said "No other file", which shut out the folder `CLAUDE.md` that `onecgiar-pr-client/CLAUDE.md` §10 ("Folder docs") requires in the same commit, and no Reviewer flagged it. Suggest that `/akili-specify` add the folder guide to the Files allowlist of any task that touches a folder with its own `CLAUDE.md`. |
| Severity | Medium |
| Status | pending |

No `factual-sweep` item: no root-guide claim was falsified by this cycle. No `trd-adr` item: DD-1 and DD-2 refine the TKF target-only query and overturn no recorded ADR.
