# Kaizen Entry — notifications/sp-approval-center-notice

## Document Control

| Field | Value |
|---|---|
| Spec Path | `notifications/sp-approval-center-notice` |
| Date | 2026-11-13 |
| Branch | qa-development-2026-ss |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 4 | tasks.md |
| Reviewer FAIL rework attempts | 2 (T-4 x2) | execution.md T-4 |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 1 (T-4: no non-role-9 center role in the data) | execution.md Pivot Record |
| Tasks closed under `REVIEW_WAIVED` / `REVIEW_SKIPPED` | 0 / 0 | execution.md |
| Escaped defects (§3) | 1: detail-panel sentence wrong for update rows, found at the HITL | execution.md section 5 |

## Lessons

- **KZ-notifications--sp-approval-center-notice-1 — A consumer named in the task had no assertion of its own.** (Product, Medium)
  - Root cause: SACN-T-4 named the notification row and the detail panel as consumers of the same text parts. Its specs asserted only the row. `drawerHeader()` had a separate branch order (`isBilateralContributorRequest` came before any update-row handling), so the panel rendered the contributor template, and no test noticed.
  - Evidence: execution.md section 5, "DEFECT found in the drawer (consumer named in SACN-T-4)" and "Drawer sentence fix".
  - Standardization: → P1

## Noted, not a lesson

- The HITL stayed open for about 6 weeks after the code PASS. This is the same pattern as primary-decline-rejects-result and bilateral-project-codes.
- The live submitter-row check could not run, because the PRTest approver was also the submitter. A check that needs two roles should name the test users when the task is planned.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/task.md` |
| Edit | In the Definition of Done guidance: when a task lists more than one consumer of the same output (row, panel, toast, email), require at least one assertion per consumer, not only the first. |
| Severity | Medium |
| Status | pending |
