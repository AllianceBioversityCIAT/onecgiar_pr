# Kaizen Entry — bilateral/change-type-optional-justification

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bilateral/change-type-optional-justification` |
| Date | 2026-10-27 |
| Branch | qa-development-2026-mc-2 (spec branch — not apply-capable; apply on `staging`) |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 2 (parallel) | tasks.md |
| Reviewer FAIL rework attempts | 0 | execution.md |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 0 | execution.md |
| PRODUCT_BUGs | n/a (no test-report.md) | — |
| Judgment-day severe findings | n/a (not run) | — |
| Validation FAIL / WARN | n/a (no validation-report.md) | — |
| Tasks closed under `REVIEW_WAIVED` (by flag) | 0 | execution.md |
| Tasks closed under `REVIEW_SKIPPED` (by task) | 0 | execution.md |
| Escaped defects (§3) | 0 | execution.md — Post-execution |
| Budget | 2/2 tasks · 2/2 review rounds · ≈20 production LOC | execution.md |

## Lessons

Clean run — no new lesson. The one friction found repeats an existing lesson (→ P1).

## Noted, not a lesson

- The ticket named only the UI field; the server's audit comment would have stored `undefined`. Caught at specify by reading the endpoint (design P-3) and proved with a red probe before tasks — the Premise Ledger worked as intended.
- `spartanBrainMock` `BrnButton` does not reflect `disabled` to the DOM; the spec read the directive input instead (T-1 Not Done / Assumptions). Second mock-shape note after `changes--portfolio-overview-revamp--global-filters` (different directive, different failure) — watch for a third.
- First server probe read `save.mock.calls[n][0]` (the entity class) and returned `[]` — inert fixture caught during specify and written into T-2's Disqualifier.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-bilateral--resubmit-followups-2` |
| Edit | Add source `bilateral/change-type-optional-justification`; recurrence: change verified locally, invisible in testing because the work branch was not merged to `performance-refactor` (cost a round trip, 2026-10-27). Raise severity Low → Medium (2nd occurrence). Supports applying `bilateral--resubmit-followups` P4 (`docs/infrastructure.md` PRTest ← `performance-refactor`). |
| Severity | Medium |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | factual-sweep |
| Target | `docs/infrastructure.md` — §CI/CD, "Environments" line (~line 51) |
| Edit | Replace "`dev` → `staging` (branch `staging`) → `production` (branch `master`)" with "`dev`/PRTest (branch `performance-refactor`, `.github/workflows/reporting-tool-dev-cicd.yml`) → `staging` (branch `staging`) → `production` (branch `master`)". |
| Severity | Medium |
| Status | pending |
