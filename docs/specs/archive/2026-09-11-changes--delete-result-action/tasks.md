# Tasks: Delete Result Action in SP Results and My Results

## Document Control

- **Spec Path:** `docs/specs/changes/delete-result-action/tasks.md`
- **Linked Requirements:** [`docs/specs/changes/delete-result-action/requirements.md`](file:///Users/jcadavid/orca/workspaces/onecgiar_pr/qa-development-2026/docs/specs/changes/delete-result-action/requirements.md)
- **Linked Design:** [`docs/specs/changes/delete-result-action/design.md`](file:///Users/jcadavid/orca/workspaces/onecgiar_pr/qa-development-2026/docs/specs/changes/delete-result-action/design.md)
- **Module:** `results` / `result-framework-reporting`
- **Sub-feature:** `delete-result-action`
- **Type:** Change
- **Approval Mode:** gated
- **Status:** ready-to-execute
- **Author:** Antigravity (T1 Architect)
- **Date:** 2026-09-11

---

## 1. Scope of this task list

This plan implements the "Delete Result" capability across Science Program Results (`programme-results`) and My Results (`my-work-board` / `my-work-card`), backed by a shared domain service ensuring strict parity with legacy Results Center permissions and business rules.

- **Budget Tripwire:** 4 tasks · ~250–350 LOC · 1 review round.

---

## 2. Pre-flight Checklist

- [x] `requirements.md` is complete and approved.
- [x] `design.md` is complete and approved.
- [x] All open questions resolved (utilities included on card menu).
- [x] Backend endpoint verified: `DELETE /api/manage-data/result/:id/delete` (`ResultsApiService.PATCH_DeleteResult`).
- [x] No schema migrations required.

---

## 3. Task List

### `DEL-T-1` — Implement Shared `ResultDeletionService` and Unit Tests [x]

- **Type:** `client`
- **Skills:** `angular-developer`, `error-handling-patterns`, `tdd`
- **Description:** Create the unified `ResultDeletionService` under `src/app/pages/result-framework-reporting/services/`. It encapsulates all permission checks (phase acronym match, Admin status, role 3/4/5 verification, QAed status lockout with tooltip phrasing), confirmation modal display via `api.alertsFe.show`, invocation of `api.resultsSE.PATCH_DeleteResult`, success feedback, and error handling (409 conflict vs generic errors).
- **Implements:** `DEL-R-3`, `DEL-R-5`, `DEL-AC-3`, `DEL-AC-4`, `DEL-AC-5`, `DEL-AC-8`, Defect gates `D1`, `D2`, `D3`, `D6`
- **Design References:** `design.md` §6.1, `DEL-DD-1`
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/services/result-deletion.service.ts`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/services/result-deletion.service.spec.ts`
- **Depends on:** `—`
- **Blocks:** `DEL-T-2`, `DEL-T-3`
- **Estimate:** `S` (≤ 0.5d)
- **Definition of done:**
  - [x] `ResultDeletionService` created with `getDeleteEligibility()` and `deleteWithConfirmation()`.
  - [x] Role check permits Admin and Roles 3 (Lead), 4 (Co-Lead), 5 (Coordinator); non-leads get tooltip: `"You are not allowed to perform this action. Please contact your leader or co-leader."`.
  - [x] QAed check (`status_id == 2`) blocks deletion with tooltip: `"You are not allowed to perform this action because the result is in the status \"QAed\"."`.
  - [x] Phase acronym mismatch sets `visible: false`.
  - [x] Unit test suite in `result-deletion.service.spec.ts` passes with 100% coverage on all authorization and branch cases.

---

### `DEL-T-2` — Integrate Delete Action into SP Results Table Row Menu

- **Type:** `client`
- **Skills:** `angular-developer`, `ui-ux-pro-max`
- **Description:** Integrate `ResultDeletionService` into `programme-results.component`. In the CDK Connected Overlay row menu (`programme-results.component.html`), add a divider and the "Delete" menu item styled with destructive tokens (`text-[var(--pr-color-red-600)] hover:bg-[var(--pr-color-red-50)]`). Bind the click handler to `deleteWithConfirmation`, passing a callback that triggers `this.data.load(this.programmeCode())` upon success.
- **Implements:** `DEL-R-1`, `DEL-R-4`, `DEL-AC-1`, `DEL-AC-2`, `DEL-AC-3`, `DEL-AC-4`, `DEL-AC-5`, Defect gate `D5`
- **Design References:** `design.md` §6.2
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/programme-results/programme-results.component.ts`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/programme-results/programme-results.component.html`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/programme-results/programme-results.component.spec.ts`
- **Depends on:** `DEL-T-1`
- **Blocks:** `DEL-T-4`
- **Estimate:** `S` (≤ 0.5d)
- **Definition of done:**
  - [x] Row menu in `programme-results.component.html` renders "Delete" option with divider and trash icon.
  - [x] Disabled state and tooltip correctly bound for QAed results and unauthorized roles.
  - [x] Clicking "Delete" initiates confirmation modal; on confirmation, result is soft-deleted and table reloads.
  - [x] Unit tests in `programme-results.component.spec.ts` verify menu rendering, action dispatch, and list reload.

---

### `DEL-T-3` — Add Contextual Action Menu with Delete to My Results Cards

- **Type:** `client`
- **Skills:** `angular-developer`, `ui-ux-pro-max`
- **Description:** Add a kebab action trigger (`⋯`) to each card in `my-work-card.component`. Attach a CDK Connected Overlay rendering an action menu with "Download PDF", "Copy link", divider, and "Delete" (using `ResultDeletionService`). Upon successful deletion, emit a `(deleted)` output event to `my-work-board.component` which reloads the board (`boardService.load(code)`) and refreshes the tab badge (`countSE.refresh()`).
- **Implements:** `DEL-R-2`, `DEL-R-4`, `DEL-AC-6`, `DEL-AC-7`, Defect gates `D4`, `D5`
- **Design References:** `design.md` §6.3, `DEL-DD-2`, `DEL-DD-3`
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/my-work-board/components/my-work-card/my-work-card.component.ts`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/my-work-board/components/my-work-card/my-work-card.component.html`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/my-work-board/components/my-work-card/my-work-card.component.spec.ts`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/my-work-board/my-work-board.component.ts`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/my-work-board/my-work-board.component.html`
- **Depends on:** `DEL-T-1`
- **Blocks:** `DEL-T-4`
- **Estimate:** `S` (≤ 0.5d)
- **Definition of done:**
  - [x] Card header contains kebab `⋯` button triggering CDK Connected Overlay.
  - [x] Menu renders in `.cdk-overlay-container` on `<body>`, escaping column scrollbars.
  - [x] Menu includes Download PDF, Copy link, and Delete with identical permission and status behavior.
  - [x] Deleting a card refreshes the board columns and decrements the "Needs My Action" badge.
  - [x] Unit tests in `my-work-card.component.spec.ts` pass.

---

### `DEL-T-4` — Comprehensive Verification and Regression Testing

- **Type:** `tests`
- **Skills:** `angular-developer`
- **Description:** Run all test suites touching `programme-results`, `my-work-board`, and `result-deletion.service`. Verify that linting passes cleanly, build completes without errors, and no existing functionality in the Science Program reporting workspace regressed.
- **Implements:** All acceptance criteria (`DEL-AC-1` to `DEL-AC-8`) and defect classes (`D1` to `D6`)
- **Design References:** `design.md` §10
- **Files (expected):** All files modified in `DEL-T-1` through `DEL-T-3`
- **Depends on:** `DEL-T-2`, `DEL-T-3`
- **Blocks:** None
- **Estimate:** `S` (≤ 0.5d)
- **Definition of done:**
  - [x] `npx jest --testPathPattern="result-deletion.service|programme-results|my-work-card"` passes 100% green.
  - [x] `npx ng lint --quiet` reports 0 errors.
  - [x] All 6 Defect Classes (`D1` through `D6`) verified by automated assertions.

---

## 4. Dependency Graph

```text
DEL-T-1 (ResultDeletionService + spec)
   ├── DEL-T-2 (SP Results table menu integration)
   └── DEL-T-3 (My Results card menu integration)
         └── DEL-T-4 (Full test suite & lint verification)
```

*Note: `DEL-T-2` and `DEL-T-3` are parallel-safe once `DEL-T-1` is complete.*

---

## 5. Test Plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `DEL-TEST-1` | Unit | `DEL-R-5`, `DEL-AC-3`, `DEL-AC-4`, `DEL-AC-5` | `src/app/pages/result-framework-reporting/services/result-deletion.service.spec.ts` |
| `DEL-TEST-2` | Unit | `DEL-R-3`, `DEL-AC-8` | `src/app/pages/result-framework-reporting/services/result-deletion.service.spec.ts` |
| `DEL-TEST-3` | Component | `DEL-R-1`, `DEL-AC-1`, `DEL-AC-2` | `src/app/pages/result-framework-reporting/pages/programme-results/programme-results.component.spec.ts` |
| `DEL-TEST-4` | Component | `DEL-R-2`, `DEL-AC-6`, `DEL-AC-7` | `src/app/pages/result-framework-reporting/pages/my-work-board/components/my-work-card/my-work-card.component.spec.ts` |

---

## 6. Rollout & Rollback Plan

### Rollout
1. Merge implementation on feature branch.
2. Verify via CI test runner (`npm run test` client).
3. Test manually in local/staging environment.

### Rollback
1. Revert commit(s) introduced by this spec.
2. Since no database migrations or backend endpoints are modified, client revert immediately restores prior UI state without side effects.
