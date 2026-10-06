# Kaizen Entry — bilateral/lead-project-not-in-contributors

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bilateral/lead-project-not-in-contributors` |
| Date | 2026-10-02 |
| Branch | qa-development-2026-ss (spec branch — items pending) |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 1 | tasks.md |
| Reviewer FAIL rework attempts | 0 | execution.md — T1 |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 0 | execution.md |
| PRODUCT_BUGs | n/a (no test-report) | — |
| Judgment-day severe findings | none recorded | — |
| Validation FAIL / WARN | n/a (manual HITL check = validation) | archive-summary.md |
| Spec-wording corrections after PASS | 1 ("typical API import" was false) | execution.md — T1 spec wording correction |
| Budget | ~60 vs ~35 prod LOC (accepted) | execution.md — T1 budget tripwire |

## Lessons

- **KZ-bilateral--lead-project-not-in-contributors-1 — A scenario labelled a data population ("typical API import") without checking the data.** (Product + Methodology, Low)
  - Root cause: requirements.md LPC-R-1 named the no-lead scenario "typical API import" from an assumption. Nobody checked it against `results_by_projects`. In fact the server marks a single sent project as the lead (`determineIsLead`), and every API-ingested result has a lead row. As a result, tasks.md planned the manual HITL check against a case that does not exist in real data. The user caught it at the gate, and the spec and the check had to be rewritten after the PASS.
  - Evidence: execution.md — "T1 — spec wording correction"; the user's DB query on 2026-10-02 found 0 rows with `lead_rows = 0`.
  - Standardization: → P1 (local) · upstream: same rule for the AKILI requirements template (no stack or domain specifics).

## Noted, not a lesson

- The budget overrun was comment-heavy code, not logic: about 60 production LOC against ~35. The LOC budget counts comments, while this repo's style is comment-dense. Below the lesson bar; it feeds the recurrence check, in case other specs trip the tripwire on comments too.
- "Unsaved changes" in `app-field-card` is set by any click inside the card, so a read-only inspection during a HITL check shows it. This confused the manual check once. It is pre-existing behaviour and out of this spec.
- The Leader passed the Reviewer a frozen diff snapshot file instead of the diff inline (saving about 290 lines of output). Author ≠ auditor was preserved. Possible methodology note if repeated.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/requirements.md` |
| Edit | Under scenario guidance, add: "A scenario title or GIVEN that labels a data population (*typical*, *rare*, *API imports have no X*) must cite the query or code path that shows it, or be marked `unverified` and covered by a data check before the HITL manual check is planned." |
| Severity | Low |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | `onecgiar-pr-client/src/app/pages/bilateral/components/section-contributors/CLAUDE.md` § `## Tests` |
| Edit | Refresh the stale case count ("157 casos") to the current suite count, and name the LPC describe. Reviewer advisory, T1. |
| Severity | Low |
| Status | pending |
