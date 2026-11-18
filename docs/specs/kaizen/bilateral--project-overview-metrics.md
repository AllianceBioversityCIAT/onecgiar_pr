# Kaizen Entry — bilateral/project-overview-metrics

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bilateral/project-overview-metrics` |
| Date | 2026-11-13 |
| Branch | qa-development-2026-ss |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 4 | tasks.md |
| Reviewer FAIL rework attempts | 0 | execution.md |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 1 (scope correction: metric #3 implemented after being designed out) | execution.md §7 |
| PRODUCT_BUGs | n/a | — |
| Validation FAIL / WARN | n/a | — |
| Tasks closed under `REVIEW_WAIVED` | 0 | execution.md |
| Tasks closed under `REVIEW_SKIPPED` | 0 | execution.md |
| Escaped defects (§3) | 1: user's real-data test (result 9441) not counted, caught before commit | execution.md §7 |

## Lessons

- **KZ-bilateral--project-overview-metrics-1 — "No data source exists" was concluded from one table without searching the write paths.** (Product, Medium)
  - Root cause: `requirements.md` §2 checked only `results_by_inititiative` and declared metric #3 impossible. `results_by_projects` was already written for W1/W2 results by `ApplyFrameworkResultAssociationsService.processBilateralProjects`. A grep for writers of the target relation (who inserts project links) would have found it. Recurrence of the same root-cause family as `KZ-bugfix--ipsr-empty-state-active-check-1` (trace who writes the data before concluding).
  - Evidence: execution.md §7 "What happened" and "overturns the premise behind BIL-POM-OQ-1".
  - Standardization: → P1

## Noted, not a lesson

- The approved design (DD-2 "no third badge") was superseded in execution and never amended. The archive summary records it instead.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | KZ-bugfix--ipsr-empty-state-active-check-1 |
| Edit | Add bilateral/project-overview-metrics as a second source: an "absence of data" claim made without tracing the write paths caused a scope reversal (execution.md §7). Broaden the lesson to "before concluding about data (present, absent, or correct), trace every writer of it". |
| Severity | High |
| Status | pending |
