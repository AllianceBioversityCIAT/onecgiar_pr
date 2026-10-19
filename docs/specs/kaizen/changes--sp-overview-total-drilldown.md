# Kaizen Entry — changes/sp-overview-total-drilldown

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/sp-overview-total-drilldown` |
| Date | 2026-10-15 |
| Branch | qa-development-2026-ss |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 5 (3 code + 1 docs + 1 HITL browser check) | tasks.md |
| Reviewer FAIL rework attempts | 1 (T-2: focus ring clipped by track `overflow-hidden`) | execution.md — T-2 |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 0 (one execute-time spec correction: design §8.2 colour-vs-colour claim) | execution.md — T-5 |
| PRODUCT_BUGs | n/a (no test-report) | — |
| Validation FAIL / WARN | n/a (no validation-report; T-5 HITL PASS, 1 accepted delta) | execution.md — T-5 |
| Budget | ~350 LOC → ≈ +480 / −60; tripwire raised after T-1 + T-2, overrun accepted by the user | execution.md — Budget Tripwire |
| Drift | No audit report in `docs/specs/audits/` | — |

## Lessons

No new lessons. The budget and lint signals repeat root causes that already have lessons → `digest-update` items (P1, P2). The window-resize note recurred → standardization (P3).

## Noted, not a lesson

- Design §8.2 claimed the three segment colours were "≥3:1 vs each other" without a measurement; the T-5 measurement showed cyan-300 vs amber-300 = 1:1. A colour-contrast claim in a design should carry its measured ratios or an "unverified" mark. Seen once.
- The T-2 focus-ring defect (outer ring clipped by an `overflow-hidden` parent) is invisible to jsdom; it was caught only by Reviewer reading. Seen once.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-results--program-full-names-labels-2` |
| Edit | Add source `changes/sp-overview-total-drilldown` as a recurrence: ~350 LOC budget vs ≈ +480 / −60 actual, tripwire fired after 2 of 5 tasks; excess mostly in specs (T-1 ≈ +160, T-2 ≈ +110 test lines) plus six forced existing-assertion edits. |
| Severity | Medium |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-results--program-full-names-labels-1` |
| Edit | Add source `changes/sp-overview-total-drilldown` as a recurrence: tasks.md named `npx eslint <files> --quiet`, which fails (ESLint 9, no flat config); Implementers fell back to `ESLINT_USE_FLAT_CONFIG=false npx eslint …` (T-2, T-3) and `npx ng lint --lint-file-patterns …` (T-1). One verified client lint-on-files command still needs pinning in root `AGENTS.md`. |
| Severity | High |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/infrastructure.md` §6 Local Environment |
| Edit | Add one row: "Narrow-viewport checks: the Chrome automation window cannot be resized when maximized — use a same-origin iframe of the target width, or constrain the component's width in DevTools/JS, and record which." (recurrence: `changes/portfolio-overview-revamp/centers-new-vs-replicated` "Noted" + this spec T-5) |
| Severity | Low |
| Status | pending |
