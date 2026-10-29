# Archive Summary — Reporting: dynamic KPI and target counts

**Outcome:** delivered. The AoW card header follows the filters and shows the target sum, the quick chip `All` is now `KPI` (cross-cut IO rows counted once), and an informational `Target` chip was added. Checked live on SP05 2026: `KPI 182 · Target 259` (Type = HLO), `KPI 213 · Target 399` (no filters).

## Document Control

| Field | Value |
|---|---|
| Original spec path | `docs/specs/changes/reporting-dynamic-kpi-target-counts/` |
| Archive date | 2026-10-16 |
| Final status | done: 3/3 tasks PASS |
| Branch / commit | `qa-development-2026-ss` · `ef7a3c627` (pushed) |
| Depth | Lite |

## Requirements Delivered

| ID | Delivered by | Evidence |
|---|---|---|
| DKT-R-1 Header count follows filters | T-1 | Jest DOM tests + KCR spec; live AOW01 `49 KPIs` (HLO) / `53` (none) |
| DKT-R-2 Target sum in header | T-1 | `sumTargetValues` tests; live AOW01 `57` / `63 targets` |
| DKT-R-3 `KPI` chip, counted once | T-2 | util spec, band spec, KCR Σ-identity test; live 182 / 213 |
| DKT-R-4 Informational `Target` chip | T-2 | band spec (span, no `aria-pressed`, no emit); live 259 = Σ AoW sums |

## Files Changed Summary

Client only, `dashboard-lab/`: `reporting-burndown.ts` (+spec), `reporting-aow-table` (ts/html/spec/CLAUDE.md), `reporting-quick-typology-filters` (component, util, new util spec), `reporting-program-band` (ts/html/spec), `dashboard-lab.component.ts/.html`, `dashboard-lab.kcr-reconciliation.spec.ts`. No API or payload change.

## Test Evidence Summary

- T-1: 3 suites / 288 tests; broader 7 suites / 312 tests. T-2: 28 suites / 1144 tests. All `--maxWorkers=2`, scoped.
- ESLint clean on touched `.ts` (`ESLINT_USE_FLAT_CONFIG=false`).
- T-3 HITL live check by the user: every reference figure matched; premise P-4 confirmed.

## Validation Summary

No `test-report.md` or `validation-report.md` (Lite spec). Absence accepted: the per-task Reviewer PASS + the user's live HITL check stand in for them.

## Accepted Warnings / Follow-Ups

- Layout at 1366 / 1280 / 375 px not shown in the HITL screenshots (desktop ~1520 px only); accepted on the user's "funciona bien".
- tasks.md §6: two items from the call with Angel to confirm (summary surface target sum; element to remove).
- T-1 advisories: section comment placement in the aow-table spec; `0 KPIs · 0 targets` on an empty non-loading card is a product call.
- Commit `ef7a3c627` also carried 5 already-staged doc files from the archived `filtered-detail-export` spec (another session's staging). Docs only; decision on keeping them is with the user.

## Historical Notes

- DKT-DD-1 reverted KCR-R-10's "label leaves the Type/Category filter": header now shares `ratioBase` with ratio and split; Only pending / Favorites / PT no longer shrink it (accepted in DKT-R-1).
- One account rate-limit interruption on T-2 (runtime event, not an attempt).
