# Kaizen Entry — bugfix/policy-change-usd-amount-position

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/policy-change-usd-amount-position` |
| Date | 2026-10-15 |
| Branch | qa-development-2026-mc-2 (spec branch — not apply-capable; `staging` is) |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 1 (`PCP-T-1`) | tasks.md |
| Reviewer FAIL rework attempts | 0 | execution.md |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 0 | execution.md |
| PRODUCT_BUGs | n/a — no `test-report.md` (Lite depth) | — |
| Judgment-day severe findings | n/a — not run | — |
| Validation FAIL / WARN | n/a — no `validation-report.md` (Lite depth) | — |
| Tasks closed under `REVIEW_WAIVED` (by flag) | 0 | execution.md |
| Tasks closed under `REVIEW_SKIPPED` (by task) | 0 — `Consumers` field was non-`none`, full conformance Reviewer ran | execution.md, tasks.md |
| Escaped defects (§3) | 0 | execution.md |

**Clean run.** Every Measure signal is zero — no rework, no pivots, no severe findings, no waived/skipped-with-escaped-defect tasks. Nothing new to learn; the task PASSed on the first attempt with a genuinely demonstrated falsifier.

## Lessons

None — clean run.

## Noted, not a lesson

- This spec exists because a prior spec (`bugfix/policy-change-usd-amount-layout`) satisfied part of a requirement ("fields moved out of Full Metadata") but not all of it ("following the same layout as Pool Funding," which also meant grouping with Policy type). The user caught the gap after the first fix shipped. Worth watching for a pattern across future specs: when a ticket's acceptance criterion has multiple clauses (placement AND grouping AND layout), a spec's own requirements should enumerate each clause separately rather than let one clause's satisfaction read as the whole criterion's satisfaction. This single instance doesn't yet justify a methodology lesson (the prior spec's `PCL-R-10` was correctly marked SHOULD, not MUST, and the grouping omission was a genuine scope judgment call at the time, not a dropped requirement) — recording here as a recurrence-watch item.

## Pending Items

None. Factual-claims sweep of root guides found no stale claims attributable to this spec. No new module/package. The one component-folder doc touched (`type-policy-change/CLAUDE.md`) was already updated and re-stamped as part of task finalization — not shared-file-gated. `.codegraph/` exists — a re-index is recommended (not urgent; tiny template reorder).
