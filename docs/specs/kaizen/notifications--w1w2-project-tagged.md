# Kaizen Entry — notifications/w1w2-project-tagged

## Document Control

| Field | Value |
|---|---|
| Spec Path | `notifications/w1w2-project-tagged` |
| Date | 2026-11-13 |
| Branch | qa-development-2026-ss |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 5 | tasks.md |
| Reviewer FAIL rework attempts | 2 (T-1 two tests that could not fail; T-4 folder `CLAUDE.md` not re-stamped) | execution.md §2 |
| HALTs / FATAL_FAILs | 0 (one API network error mid-edit in T-4 attempt 2, resumed; runtime, not a work FAIL) | execution.md |
| Pivots | 0 | execution.md |
| PRODUCT_BUGs | n/a (no test-report.md) | — |
| Judgment-day severe findings | none recorded | — |
| Validation FAIL / WARN | n/a (no validation-report.md) | — |
| Tasks closed under `REVIEW_WAIVED` (by flag) | 0 | execution.md |
| Tasks closed under `REVIEW_SKIPPED` (by task) | 0 | execution.md |
| Escaped defects (§3) | 0 | execution.md |

## Lessons

No new lesson. T-1's FAIL was the existing vacuous-test family (case 8 could not detect the per-type rule leaking into BCT; case 2 had no empty-acronym fixture, so `not.toContain('()')` could never fail). Mutation red runs fixed it. Recorded as a recurrence in P1. T-4's FAIL (folder `CLAUDE.md` re-stamp) is covered by an existing institutionalized rule (`onecgiar-pr-client/CLAUDE.md` §10).

## Noted, not a lesson

- `tasks.md` header and the T-1..T-4 DoD boxes stayed unchecked after the tasks passed. They were fixed at archive. It cost no work but made the resume dashboard stale.
- The manual gate waited 6 weeks for a PRTest deploy and real data. It closed on a real row (result 10052), not a fixture.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | KZ-bilateral--review-drawer-readonly-rendering-1 |
| Edit | Add `notifications/w1w2-project-tagged` as a source (recurrence): WPT-T-1 attempt 1 had two tests that could not fail (a case-8 fixture whose only target shared the prior row's type, and no empty-string acronym fixture). The Reviewer found them by naming the mutation each falsifier needs (`unionNotified = null`, `?? ` vs `||`). Extend the lesson to "write the mutation that each falsifier must kill, and run it". Evidence: execution.md WPT-T-1 attempt 1. |
| Severity | Medium |
| Status | pending |
