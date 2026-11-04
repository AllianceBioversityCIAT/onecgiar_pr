# Archive Summary — KPI row status counts

**Outcome:** each KPI row on the SP reporting page shows a neutral `N result(s) reported ›` button. A yellow `● N editing` badge appears only when some results are still in Editing. Approved is its own group. The button total equals the drawer count. Shipped to qa-development-2026-ss and performance-refactor (PRTest) on 2026-11-03.

## Document Control

| Field | Value |
|---|---|
| Original spec path | `result-framework-reporting/kpi-row-status-counts` |
| Ticket | INC-167164 point 1 (Karen Marshall, ILRI, SAAF / SP03) |
| Archive date | 2026-11-03 |
| Final status | Done, accepted without test-report/validation-report (Santiago) |
| Branch | qa-development-2026-ss (spec branch) |

## Requirements Delivered

| Req | Delivered by | Evidence |
|---|---|---|
| KRC-R-1 grouping (Approved separate) + button | T-2, T-3, T-5 | util/chip specs; PRTest Tanzania split |
| KRC-R-2 button = drawer | T-2 matcher | PRTest Uganda 8=8, Tanzania 7=7, Kenya 2=2; local Mali-CBBP 1=1 |
| KRC-R-3 drafts counted | T-1 | prdb Q-5/Q-6 |
| KRC-R-4 figures untouched | T-1 diff checks | protected functions not edited |
| KRC-R-5 read-only, once per load, fail-soft | T-1, T-2 | PRTest fail-soft (blocked call: rows render, 0 chips, no toast) |
| KRC-R-6 legible / accessible / 1280–640 | T-3, T-5 #4 | PRTest 1280; Santiago's 652px screenshot |
| KRC-R-7 button opens Reported results | T-3 | specs; PRTest drawers |
| KRC-R-8 breakdown | narrowed #3: existing IRR-R-11 split | drawer untouched |

## Files Changed Summary

| Area | Files |
|---|---|
| Server | `aow-bilateral.repository.ts` (`findIndicatorResultStatusLinks`), `results-framework-reporting.{controller,service}.ts` (new GET), specs |
| Client | `results-api.service.ts`, `dashboard-lab` (`kpi-status-counts.util.ts`, `components/kpi-status-chip/`, 6 host chips, `reporting-aow-table` 2 chips), specs, folder `CLAUDE.md` files |

Commit: 792c3183f (+ docs commits) on qa-dev; perf merge 3b30d1f32.

## Test Evidence Summary

- Related runs: 44 suites / 1384 tests (T-5), 41 / 1297 (T-5 #4). The 6 → approved mutation goes red. The source lock fails on a root re-tint.
- PRTest: parity on 3 rows; perf 290/351/106 ms (≤ 500 ms, spread > 2× so inconclusive); fail-soft; 1280px. 640px from Santiago's screenshot.

## Validation Summary

No `/akili-validate` run; accepted by Santiago on 2026-11-03. Every task closed on a Reviewer PASS. T-3 needed 4 attempts (redesign after the local visual FAIL). T-5 needed rework: the drawer line was withdrawn, and the separator and tint text in the spec was swept.

## Accepted Warnings Or Follow-Ups

| # | Item | Owner |
|---|---|---|
| 1 | T-4 step 1 (JSON before/after diff) not run | accepted |
| 2 | A chip click right after closing the drawer with Escape sometimes does not open it (close-animation race) | watch; not fixed |
| 3 | The `dashboard-lab/CLAUDE.md` T-3 bullet (L245) is stale; the T-5 bullet is in English inside a Spanish section | pending guide-sync |

## Historical Notes

- Ownership moved from session onecgiar-pr-02 to onecgiar-pr-41 after T-3.
- Pivots: #2 (Approved split + button), #3 (drawer line withdrawn as a duplicate of IRR-R-11), #4 (colour only on the editing badge, after Santiago could not read the grey vs yellow pills).
- On a Windows merge checkout (`autocrlf=true`), `dashboard-lab.kpi-status-chip.spec` fails only on CRLF (hard-coded `\n`). CI uses LF.
