# Archive Summary — ToC KPI coverage: target-only filter

**Outcome:** delivered. `getPortfolioTocCoverage` now counts only ToC KPIs that have a target > 0 for the reporting year (P2-3974). A no-target KPI is left out of both total and covered. Verified on PRTest v36:

| P/A | Before | After |
|---|---|---|
| SP01 | 403 / 10 | 360 / 10 |
| SP02 | 139 / 3 | 137 / 3 |

The user query and the endpoint match exactly. Committed as `e5c2c775b` and deployed through `performance-refactor` at `38d15a30c`.

## Document Control

| Field | Value |
|---|---|
| Original Spec Path | `docs/specs/changes/portfolio-overview-revamp/toc-kpi-target-filter/` |
| Parent | `changes/portfolio-overview-revamp` (family #10, bugfix of #5) |
| Archive Date | 2026-10-16 |
| Final Status | **Done**: 2 / 2 tasks `[x]` |
| Branch | `qa-development-2026-ss` (spec branch; default is `master`) |
| Kaizen entry | `docs/specs/kaizen/changes--portfolio-overview-revamp--toc-kpi-target-filter.md` |

## Requirements Delivered

| ID | Delivered by | Evidence |
|---|---|---|
| TKF-R-1 denominator = KPIs with a target | T-1 inner join on `toc_result_indicator_target` (`target_date = year`, `CAST DECIMAL > 0`) | Repo spec; real data 360 and 137 |
| TKF-R-2 covered ⊆ total | T-1 (inner join on `tri`) | Reviewer check; real data covered unchanged (10 / 3) |
| TKF-R-3 nothing else changes | T-1 | Response shape unchanged; `cov` subquery untouched |

## Files Changed

| File | Change |
|---|---|
| `aow-bilateral.repository.ts` | +13 / −1: target join, second year param, docstring |
| `aow-bilateral.repository.spec.ts` | +22 / −5: join assertions, param order |

## Test Evidence

| Check | Result |
|---|---|
| Jest `aow-bilateral.repository` (`--maxWorkers=2`) | Red 2 failed / 83 → green 83 / 83 |
| eslint `--quiet` | Clean |
| Real data (T-2) | PASS; fractional targets under 1: 0 in both P/As |

## Validation Summary

There is no `test-report.md` or `validation-report.md`. The task ran Implementer → Reviewer, and the Reviewer passed it on attempt 1. The user ran the real-data query. The user approved the commit, the push and the archive (2026-10-16).

## Accepted Warnings / Follow-ups

- [ ] Advisory: the dashboard-lab target uses `MAX(CAST AS SIGNED)` (`aow-bilateral.repository.ts:575`), while this query uses DECIMAL. They disagree only on fractional targets between 0 and 1; there are 0 such targets on current data.

## Historical Notes

- The orchestrator session (onecgiar-pr-92) opened this spec on the user's behalf. It was kept repository-only because `results-framework-reporting.*` held another session's uncommitted work.
