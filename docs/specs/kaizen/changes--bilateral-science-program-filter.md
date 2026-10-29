# Kaizen Entry — changes/bilateral-science-program-filter

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/bilateral-science-program-filter` |
| Date | 2026-10-16 |
| Branch | qa-development-2026-ss |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 2 | tasks.md |
| Reviewer FAIL rework attempts | 2 (T-1 x1, T-2 x1) | execution.md |
| Defects found outside review | 1 (TS2339, found by the user's `ng serve`) | execution.md — T-1 manual verification |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 0 | execution.md |
| PRODUCT_BUGs | n/a (no test-report) | — |
| Validation FAIL / WARN | n/a (no validation-report; user validated live) | archive-summary.md §5 |

## Lessons

No new lessons. The compile error recurs a root cause already on record, so it is a `digest-update` item below.

## Noted, not a lesson

- **design.md DD-2 stated a gap that did not exist** (`clearAllFilters()` already reset `programFilter`). Harmless; the Implementer noticed and left it.
- **Label format FAIL (T-1 #1)** was a one-off misread of "mirror field-for-field"; the Reviewer caught it against `catalogProjectLabel`.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-bugfix--lead-center-full-catalog-1` |
| Edit | Add source `changes/bilateral-science-program-filter` with this recurrence note: T-1's verification named only `npx jest` + `npx ng lint --quiet`; an untyped call to the generic `filterOutAvisaInitiatives` fell back to its constraint type and broke `ng serve` with TS2339, while 2 Reviewer PASSes and Jest stayed green. The user found it in the DoD browser check; attempt 3 added `ng build`. Evidence: execution.md — T-1 "Manual verification (user-driven)". |
| Severity | High |
| Status | pending |
