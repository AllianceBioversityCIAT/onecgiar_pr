# Kaizen Entry — bugfix/reported-results-center-scoping

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/reported-results-center-scoping` |
| Date | 2026-11-13 |
| Branch | qa-development-2026-ss |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 6 (5 planned + T-6 added by user decision) | tasks.md |
| Reviewer FAIL rework attempts | 3 (T-3 folder docs, T-4 HTTP param not wired, T-5 BIGINT string vs number) | execution.md §2 |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 0 (T-6 is a user-approved spec amendment) | execution.md RRC-T-6 |
| PRODUCT_BUGs | n/a (no test-report.md) | — |
| Judgment-day severe findings | none recorded | — |
| Validation FAIL / WARN | n/a (no validation-report.md) | — |
| Tasks closed under `REVIEW_WAIVED` (by flag) | 0 | execution.md |
| Tasks closed under `REVIEW_SKIPPED` (by task) | 0 | execution.md |
| Escaped defects (§3) | 0. The BIGINT defect was caught by the Reviewer before commit | execution.md RRC-T-5 attempt 1 |

## Lessons

No new lesson. The one real defect (T-5: `Number()`-coerced entry anchor compared with `===` to a raw driver string; mocks used a number, so all 5 mocked tests could not see it) repeats an existing lesson: "fixtures must mirror the wire type of BIGINT columns". It is recorded as a recurrence in P1 instead.

## Noted, not a lesson

- `tasks.md` `RRC-T-4` listed only the loader, query and handler. `design.md` §4.1 already named the controller and service change, so `RRC-AC-2` was unreachable until attempt 2. The task file list under-scoped the design.
- Review rounds exceeded the budget (3 tasks needed a second round). Recorded in execution.md §3.
- The real-data check on the testing DB (execution.md §4) closed the "never run outside mocks" gap for the by-centre SQL.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | KZ-OPF-1 (`docs/specs/kaizen-log.md` Active Lessons) |
| Edit | Add `bugfix/reported-results-center-scoping` as a source (recurrence): the BIGINT `toc_indicator_target_id` arrives from the MySQL driver as a string, a mocked server spec compared it to a number with `===`, and every anchored contribution would have read 0 in production. A Reviewer caught it by reading `orm.config.ts`. Evidence: execution.md RRC-T-5 attempt 1. Keep the wording "fixtures must mirror wire types" and note it applies to server specs too. |
| Severity | Medium |
| Status | pending |
