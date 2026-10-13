# Kaizen Entry — changes/sp-overview-total-general-card

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/sp-overview-total-general-card` |
| Date | 2026-10-08 |
| Branch | qa-development-2026-ss |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 3 | tasks.md |
| Reviewer FAIL rework attempts | 2 (T-2 x1, T-3 x1) | execution.md |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 0 | execution.md |
| PRODUCT_BUGs | n/a (no test-report) | — |
| Validation FAIL / WARN | n/a (no validation-report; user validated live) | archive-summary.md §5 |
| Budget | 5 review rounds vs 1; ~190 LOC vs ~140 | execution.md — Budget Tripwire |

## Lessons

No new lessons. Both FAILs recur root causes already on record, so they are recorded as `digest-update` items below rather than duplicated.

## Noted, not a lesson

- **The budget estimate counted production LOC only.** The ~140 LOC estimate left out test detail (exact labels, tooltips, order, a mutation-proof precondition). Tests were most of the overrun; production was ~40 LOC. Below the lesson bar; it feeds the recurrence check on budget sizing.
- **`ng build` was skipped on every task** because free RAM was 2.9 GB, under the 4 GB machine rule, while `ng serve` and `nest --watch` were up. This is environmental: the dev-server AOT compile substituted. Recurrence-adjacent to `KZ-changes--reporting-aow-jira-hierarchy-1` (template verification).
- **Mid-task scope flip-flop on an unrelated quick change** (center "Needs attention": both → card only → tile only). The user resolved it in two messages, and the resumed Implementer restored from git cleanly. Recorded for context only.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-changes--reporting-favorite-indicators-3` |
| Edit | Add source `changes/sp-overview-total-general-card` with this recurrence note: T-2 attempt 1's "bilateral does not change the headline" test set `bilateralCategories`, which never feeds `bilateralStatusTotal()`, so the tasks.md Fail input could not turn it red. The Reviewer caught it by tracing the computed. The fix asserts the precondition first (`bilateralStatusTotal() === 9`), then the headline. Evidence: execution.md — T-2 attempt 1. |
| Severity | Medium |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-result-framework-reporting--programme-results-multiselect-filters-1` |
| Edit | Add source `changes/sp-overview-total-general-card` with this recurrence note: tasks.md T-3 told the author to re-stamp `program-overview/CLAUDE.md` but only "mirror one line" in `dashboard-lab/CLAUDE.md`. The code task T-1 also touched the `dashboard-lab/` folder, so client CLAUDE.md §10 required a re-stamp there too, and T-3 attempt 1 FAILed on it. The doc task must list a re-stamp for every folder-doc folder the spec's code tasks touch. Evidence: execution.md — T-3 attempt 1. |
| Severity | Medium |
| Status | pending |
