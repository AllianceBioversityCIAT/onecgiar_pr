# Kaizen Entry — changes/portfolio-overview-revamp/remove-rankings-status-copy

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/portfolio-overview-revamp/remove-rankings-status-copy` |
| Date | 2026-10-15 |
| Branch | qa-development-2026-ss |
| Archive Run | 1 |
| Approval Mode | gated (the user asked on 2026-10-14 to run all tasks without pausing) |

**Branch Context:** this run is on a spec branch. The current branch is `qa-development-2026-ss`, and the default branch is pinned to `master`. Every item below is recorded as pending, and no shared file was edited.

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 4 (3 code + 1 human browser check) | tasks.md |
| Reviewer FAIL rework attempts | 0 | execution.md — T-A, T-B, T-C |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 0 | — |
| PRODUCT_BUGs | n/a (no test-report) | — |
| Judgment-day severe findings | 2 (JD-1, JD-2), fixed before execution | judgment.md |
| Validation FAIL / WARN | n/a (no validation-report; T-H PASS accepted by the user) | execution.md — T-H |
| Budget | ≈ +186 added LOC against a 220 tripwire | execution.md — T-C |

## Lessons

No new lesson. Execution was clean. Both severe design findings share their root cause with an existing lesson, so they are recorded as a recurrence (P1).

## Noted, not a lesson

- **Browser check through Claude in Chrome on PRTest worked as the T-H evidence path.**
  - The served-bundle grep on the lazy chunk satisfied the task's disqualifier without a local dev server.
  - Grepping `main.js` alone was not enough: lazy route files are named `<component>-<hash>.js`, not `chunk-*.js`.
  - The tooltip-on-focus check that Jest could not prove (inert mock) was closed this way.
- **Pre-existing a11y defect surfaced during T-H.** It is the sr-only "Chart rendered without required accessibility tableModel" on the status pipeline bar, from `18b359579`. It is out of scope and listed as an archive follow-up.
- **768 px not exercised.** Resizing would have changed the user's own Chrome window. Below the lesson bar.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-result-framework-reporting--programme-results-created-by-filter-1` |
| Edit | Add source `changes/portfolio-overview-revamp/remove-rankings-status-copy` as a recurrence. The specify step again did not grep the specs that pin a changed or deleted exported symbol. Judgment Day caught it at design time: JD-1, `portfolio-overview.service.spec.ts` referenced the deleted `programRankingRows`; JD-2, the wrong spec-breakage list. It cost a design fix round, not an execution FAIL. The rule should cover **deletions** as well as extensions. |
| Severity | Medium |
| Status | pending |
