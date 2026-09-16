# Archive Summary — Confirm Submission Dialog Stale Title & Disclaimer Copy

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `docs/specs/bugfix/confirm-submission-title-and-disclaimer` |
| Slug | `confirm-submission-title-and-disclaimer` |
| Author | Santiago Sanchez Correa |
| Archive Date | 2026-09-16 |
| Final Status | Completed (PASS, Committed & Pushed) |
| Related Commits | `1395244e1`, `e3829e227`, `336cd7c58` |

## 2. Original Spec Path

`docs/specs/bugfix/confirm-submission-title-and-disclaimer`

## 3. Archive Date

2026-09-16

## 4. Final Status

**Completed.** Both tasks (`SUB-T-1` and `SUB-T-2`) implemented, reviewed, tested, and committed. Refresh of shared result state after AI Review title acceptance eliminates stale title in Confirm Submission dialog, disclaimer copy updated to "Please note that further changes to this result can only be made during the QA process.", Cypress E2E regression test verifies red-before/green-after behavior.

## 5. Requirements Delivered

- `SUB-R-1`: Confirm Submission dialog reflects the newly accepted AI Review title without requiring page reload.
- `SUB-R-2`: Shared `CurrentResultService` fetches latest result after AI Review section changes.
- `SUB-R-3`: Disclaimer copy matches the approved wording for results in QA.
- `SUB-AC-1`, `SUB-AC-2`: Cypress E2E test `confirm-submission-title.cy.ts` covers the entire user journey.

## 6. Files Changed Summary

- `onecgiar-pr-client/src/app/shared/services/api/ai-review.service.ts` — Injected `CurrentResultService` and called `GET_resultById()` inside `notifySectionChanged()`.
- `onecgiar-pr-client/src/app/pages/results/pages/result-detail/components/submission-modal/submission-modal.component.html` — Updated disclaimer sentence.
- `onecgiar-pr-client/src/app/shared/services/api/ai-review.service.spec.ts` — Updated test mocks for `GET_resultById`.
- `onecgiar-pr-client/cypress/e2e/results/confirm-submission-title.cy.ts` — Added Cypress E2E regression test.

## 7. Test Evidence Summary

- Jest unit tests: 34 tests passing across 3 suites (`ai-review.service`, `ai-review.component`, `submission-modal.component`).
- Cypress E2E: 4 clean runs of `confirm-submission-title.cy.ts` on Electron, red-check verified against pre-fix code.
- Lint clean (`npx ng lint --quiet`).

## 8. Validation Summary

- Manual in-browser verification performed on result `#9139` by Santiago Sanchez.

## 9. Accepted Warnings Or Follow-Ups

- `SUB-OQ-1`: IPSR modal's identical disclaimer copy resolved as out of scope (separate title source).

## 10. Historical Notes

- Red-before verification in Cypress required scratch-wait adjustment to confirm behavioral assertion discrimination instead of network-wait timeout.
