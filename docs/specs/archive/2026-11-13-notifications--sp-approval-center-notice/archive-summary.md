# Archive Summary — notifications/sp-approval-center-notice

## Document Control

| Field | Value |
|---|---|
| Original Spec Path | `docs/specs/notifications/sp-approval-center-notice/` |
| Archive Date | 2026-11-13 |
| Final Status | Done. All 4 tasks PASS; HITL closed on PRTest |
| Last code commit | 577a8b832 (detail panel fix), on qa-dev and performance-refactor (5518acc45) |

## Requirements Delivered

| Requirement | Status | Evidence |
|---|---|---|
| SACN-R-1: Approve notifies every active role on the lead center | Done | T-1/T-2; 10 distinct recipients for 10094 in TEST |
| SACN-R-2: de-dup, approver removed | Done | T-2 specs; TEST rows (one per user) |
| SACN-R-3/R-4: new sentence, toast = list | Done | T-2/T-3 specs; PRTest row |
| SACN-R-5: submitter wording unchanged | Done (specs) | T-2/T-3. No live case: on 10094 the submitter (115) was also the approver, so no submitter row by design |
| SACN-R-6: reference row (icon, chips, no actions) | Done | HITL PASS 2026-11-13 |
| Detail panel shows the same sentence | Done | Fixed in 577a8b832 and verified on PRTest |

## Files Changed Summary

Server: `results.service.ts` (recipient split, new sentence) and `role-by-user` repository (any-role lookup). Client: `notification-type.constants.ts` (parts parser) and `notification-item` component (row chip and icon, and the detail-panel branch for update rows). See `execution.md` for each task.

## Test Evidence Summary

- Jest for T-1 to T-4 is green (see `execution.md`). The panel fix went from 2 failing cases to passing, and `--findRelatedTests` gave 21 suites / 1078 tests green.
- PRTest HITL: the row matches the mockup. After the deploy, the panel sentence matches the row.

## Validation Summary

No `validation-report.md`. The HITL on PRTest stands as the closing check, accepted by the user.

## Accepted Follow-Ups

| Follow-up | Note |
|---|---|
| "Couldn't load the approval chain", plus empty Reporting center and Submitted by in the detail panel | Not part of SACN; the panel's own data fetch. Not investigated |
| Live check of the submitter row with a different approver | Covered by specs only |
| Advisory: `isApprovedDecisionUpdateRow` has no `isUpdateSource` guard | Harmless today |

## Historical Notes

- Pivot (T-4): the data has no non-role-9 center role, so the manual check used a role-9 user who is not the submitter.
- The detail-panel defect reached the HITL. The `drawerHeader()` method had no branch for update rows, so it fell into the contributor-request template. This affected every bilateral Updates row, not only SACN rows.

## Diagrams

None.
