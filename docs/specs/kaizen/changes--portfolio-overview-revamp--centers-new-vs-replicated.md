# Kaizen Entry — changes/portfolio-overview-revamp/centers-new-vs-replicated

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/portfolio-overview-revamp/centers-new-vs-replicated` |
| Date | 2026-10-15 |
| Branch | qa-development-2026-ss |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 4 (3 code + 1 browser check) | tasks.md |
| Reviewer FAIL rework attempts | 0 | execution.md |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 0 | execution.md |
| PRODUCT_BUGs | n/a (no test-report) | — |
| Validation FAIL / WARN | n/a (no validation-report; T-H browser PASS) | execution.md — CNR-T-H |
| Budget | ≈ 240 LOC estimated → ≈ 495 changed (+106 %); 320 tripwire raised before T-3 and lifted by the user | execution.md — Budget Override |
| Drift | No audit report in `docs/specs/audits/` | — |

## Lessons

No new lessons. Both signals repeat root causes that already have lessons, so they are recorded as `digest-update` items (P1, P2).

## Noted, not a lesson

- The T-3 Reviewer's advisory that the card total has no loading skeleton shows CNR-N3's premise ("like the card's total") was not checked against the template at specify time. Seen once.
- The browser window could not be resized for the 375 / 768 checks; same-origin iframes of that width worked as a substitute. Worth a line in `docs/infrastructure.md` §6 if it recurs.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-results--program-full-names-labels-1` |
| Edit | Add source `changes/portfolio-overview-revamp/centers-new-vs-replicated` as a recurrence (sixth spec). This time tasks.md named `npx ng lint --quiet --lint-file-patterns <files>`: it ran clean in T-1, but in T-3 the Implementer got "Unknown arguments: quiet, lint-file-patterns" and fell back to `ESLINT_USE_FLAT_CONFIG=false npx eslint <files> --quiet`. The recipe is fragile in both forms; one verified client lint-on-files command should be pinned in root `AGENTS.md`. |
| Severity | High |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-results--program-full-names-labels-2` |
| Edit | Add source `changes/portfolio-overview-revamp/centers-new-vs-replicated` as a recurrence: ≈ 240 LOC estimated vs ≈ 495 actual, most of the excess in component specs (a 9-spec mixed-fixture suite in T-2 alone was ≈ 130 lines). First spec of the family to trip the tripwire. |
| Severity | Medium |
| Status | pending |
