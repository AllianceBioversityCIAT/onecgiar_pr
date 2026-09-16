# Kaizen Entry — bugfix/phase-filter-missing-phases-prod

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/phase-filter-missing-phases-prod` |
| Date | 2026-09-16 |
| Branch | qa-development-2026-ss |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 2 (TASK-1, TASK-2) | tasks.md |
| Reviewer FAIL rework attempts | 1 (Attempt 1 missing folder CLAUDE.md update) | execution.md |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 0 | execution.md |
| PRODUCT_BUGs | 0 | execution.md |
| Judgment-day severe findings | 0 | n/a |
| Validation FAIL / WARN | 0 / 0 | execution.md |

## Lessons

- **KZ-bugfix--phase-filter-missing-phases-prod-1 — Testing async race conditions requires deferred observables rather than synchronous `of(...)` mocks.** (Methodology, Medium)
  - Root cause: Standard unit tests with `of(...)` resolve synchronously during the first `fixture.detectChanges()`, hiding race conditions where asynchronous network requests settle after component initialization. Reproducing the race required using a deferred `Subject`.
  - Evidence: `tasks.md` TASK-1 Test description; `execution.md` §2.
  - Standardization: → P1

## Noted, not a lesson

- `programme-results/CLAUDE.md` line count was already around 195 lines prior to this change (pre-existing overflow of 120-line guideline).

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/tasks.md` |
| Edit | For timing/race bugfixes involving HTTP load states and signals/effects, require unit tests to use deferred Observables/Subjects to prove the race is actually exercised. |
| Severity | Medium |
| Status | pending |

**Branch Context:** current branch `qa-development-2026-ss`, default branch pinned to `master`.
