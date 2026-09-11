# Proposal: Delete Result Action in SP Results and My Results

## Document Control

- **Spec Path:** `docs/specs/changes/delete-result-action`
- **Slug:** `delete-result-action`
- **Type:** Change
- **Approval Mode:** gated
- **Date:** 2026-09-11
- **Author:** Antigravity (T1 Architect)

---

## Intent

Enable users with authorized roles to delete results directly from:
1. The **SP Results table** (`programme-results` at `/result-framework-reporting/entity-details/<acronym>/results`).
2. The **My Results board** (`my-results` at `/result-framework-reporting/entity-details/<acronym>/my-results`).

This action must replicate the exact business rules, permissions, status validations, and confirmation flow currently enforced in the legacy **Results Center** (`/result/results-outlet/results-list`).

---

## Problem / Current Behavior

Currently, the ability to delete a result exists **only** in the Results Center table row actions (`results-list.component.ts`).

When users (Initiative Leads, Co-Leads, Coordinators, or Admins) work within the Science Program Reporting workspace (`result-framework-reporting`):
- In the **SP Results table**, the row action menu (`⋯`) only provides:
  - *Open result*
  - *Update result* (when eligible)
  - *View indicator* (coming soon)
  - *Download PDF*
  - *Copy link*
  There is no option to delete a draft or invalid result.
- In the **My Results board**, cards have buttons to *Continue* or *Open*, but no action menu or delete trigger exists.

As a result, whenever a user needs to delete an erroneous result or discarded draft created during the reporting cycle, they are forced to leave the Science Program workspace, navigate to Results Center, search for their result, and delete it from there. This creates friction, context switching, and frustration.

---

## Proposed Outcome

1. **SP Results Table (`programme-results`):**
   - Add a "Delete" action item to the existing CDK Connected Overlay row menu.
   - Styled with destructive visual cues (red text/icon, danger hover state, separated by a divider).
   - Enforce identical visibility and disabled/tooltip rules as Results Center.
   - On deletion, display confirmation dialog, trigger backend deletion, show feedback alert, and reload the table rows.

2. **My Results Board (`my-results` / `my-work-card`):**
   - Provide a row/card action menu trigger (kebab `⋯` icon button) on each card.
   - The menu includes "Delete" (alongside secondary utilities such as "Download PDF" and "Copy link" for feature parity).
   - Same permission, phase, and status checks.
   - On deletion, display confirmation dialog, trigger backend deletion, show feedback alert, reload the board, and update the "Needs My Action" column and tab badge counts.

3. **Shared Deletion Domain Logic (`ResultDeletionHelperService`):**
   - Encapsulate permission evaluation, status checking, confirmation dialogs, and deletion API calls in a shared helper service or utility to guarantee 100% rule parity across all views.

---

## Scope

### In Scope
- Porting deletion capability to `programme-results.component` (row menu overlay).
- Adding action menu with deletion capability to `my-work-card.component` within `my-work-board`.
- Enforcing all legacy deletion rules:
  - **Phase validation:** Only results belonging to the active portfolio phase can be deleted (`reportingCurrentPhase.portfolioAcronym == result.acronym`).
  - **Role permissions:**
    - Admin: can delete any result not in QAed status.
    - Non-Admin: must have Lead (`role_id: 3`), Co-Lead (`role_id: 4`), or Coordinator (`role_id: 5`) role. If unauthorized, the option is disabled with tooltip: `"You are not allowed to perform this action. Please contact your leader or co-leader."`
  - **Status restriction:** Cannot delete if `status_id == 2` ("Quality Assessed" / "QAed"). Disabled with tooltip: `"You are not allowed to perform this action because the result is in the status \"QAed\"."`
- Confirmation modal via `api.alertsFe.show`:
  - Title: `Are you sure you want to delete the result "${title}"?`
  - Description: `If you delete this result it will no longer be displayed in the list of results.`
  - Button: `Yes, delete`
- Calling `api.resultsSE.PATCH_DeleteResult(resultId)`.
- Success / error alerts handling (including 409 conflict notifications).
- Cache invalidation and state reload on both SP Results table and My Results board.
- Unit tests for both components and the shared deletion logic.

### Out of Scope / Non-Goals
- Modifying the server-side deletion logic (`DeleteRecoverDataService` / `manage-data/result/:id/delete`).
- Hard deletion (physical removal from MySQL database) — backend already performs regulated soft delete and audit logging.
- Adding batch/bulk deletion.
- Modifying Results Center's existing deletion implementation (unless electing to refactor it onto the shared service during implementation).

---

## Affected Users, Systems, And Specs

| User / System | Impact |
|---|---|
| **Initiative Leads, Co-Leads, Coordinators** | Can manage and clean up their results without leaving the Science Program workspace. |
| **Platform Administrators** | Retain full administrative deletion rights directly from SP Results and My Results. |
| **SP Results Component** (`programme-results`) | Row menu adds "Delete" menuitem with divider. |
| **My Results Component** (`my-work-board` / `my-work-card`) | Card receives a `⋯` action trigger and CDK overlay / menu for contextual actions. |
| **`ProgrammeResultsService` & `MyWorkBoardService`** | Receive refresh triggers following successful deletion. |
| **Related Specs** | `changes/my-work-board`, `changes/sp-shell-app-viewport`. |

---

## Visual Reference

- **Source:** User screenshots from live application (qa-development-2026).
- **Location & Artifacts:**
  - `Results Center action menu`: `media_1789160334105.png` (Shows "Map to TOC", "Delete" [red], "Download PDF").
  - `Results Center table`: `media_1789160327803.png`.
  - `SP Results table action menu`: `media_1789160341102.png` (Shows current 4 items: Open result, View indicator, Download PDF, Copy link).
  - `My Results board`: `media_1789160349545.png` (Shows Kanban cards with code, category, status, origin, progress, and Continue/Open button).

---

## Requirement Delta Preview

### ADDED Requirements
- **DEL-R-1 (SP Results Row Menu Deletion):** The SP Results table row menu MUST display a "Delete" item with destructive styling (`text-[var(--pr-color-red-600)]` / danger token) separated from navigation items.
- **DEL-R-2 (My Results Card Action Menu):** Each card in the My Results board MUST include a kebab action trigger (`⋯`) opening a menu containing the "Delete" item.
- **DEL-R-3 (Role & Phase Authorization):**
  - An Admin user may delete any result in an active phase unless it is in status `QAed` (`status_id === 2`).
  - A Non-Admin user may only delete a result if they hold role 3 (Lead), 4 (Co-Lead), or 5 (Coordinator). Otherwise, the delete button is disabled with tooltip: `"You are not allowed to perform this action. Please contact your leader or co-leader."`
  - Results not belonging to the active portfolio phase (`reportingCurrentPhase.portfolioAcronym !== result.acronym`) MUST NOT display the delete action.
- **DEL-R-4 (QAed Status Lockout):** If a result is in status `Quality Assessed` (`status_id === 2`), the delete option MUST be disabled with tooltip: `"You are not allowed to perform this action because the result is in the status \"QAed\"."`
- **DEL-R-5 (Confirmation & Execution Flow):** Clicking "Delete" MUST prompt a standard confirmation modal with `title`, `description`, and `confirmText: 'Yes, delete'`. On confirm, it triggers `api.resultsSE.PATCH_DeleteResult(result.id)`.
- **DEL-R-6 (Post-Delete State Synchronization):** Upon successful deletion:
  - In SP Results: `ProgrammeResultsService.load()` is invoked to refresh the table.
  - In My Results: `MyWorkBoardService.load()` and `MyWorkCountService` are triggered to update column cards and the "Needs My Action" badge.

---

## Approach Options

### Option 1: Dedicated `ResultDeletionService` (Recommended)
Extract the deletion evaluation, confirmation dialog, execution, and toast logic into a shared Angular service (e.g. `ResultDeletionService` under `shared/services/` or `result-framework-reporting/services/`).
- **Pros:**
  - Complete DRY adherence; 100% behavioral consistency between SP Results, My Results, and optionally Results Center.
  - Testable in isolation with thorough Jest unit tests covering all matrix cases (Admin, non-admin with roles 3/4/5, unauthorized roles, QAed status, closed phase).
  - Clean component code: `programme-results` and `my-work-card` simply inject and call `resultDeletionService.canDelete(row)` and `resultDeletionService.delete(row, onSuccess)`.
- **Cons:**
  - Slight initial setup of a new service file.

### Option 2: Component-Level Method Duplication
Implement `canDeleteResult()` and `onDeleteResult()` independently inside `programme-results.component.ts` and `my-work-card.component.ts`.
- **Pros:**
  - No new service file.
- **Cons:**
  - Logic duplication across two different page directories.
  - Fragile to maintenance; future role/status rule changes risk falling out of sync.

### Option 3: Global Result Action Directive
Create an Angular directive or popup component that binds to any DOM trigger.
- **Pros:**
  - High UI abstraction.
- **Cons:**
  - Unnecessary overhead and complexity given that `programme-results` uses a CDK Connected Overlay and `my-work-card` needs lightweight integration.

---

## Recommended Approach

**Option 1 (`ResultDeletionService`):**
1. Create `ResultDeletionService` providing:
   - `getDeleteEligibility(result: ProgrammeResultRow | CurrentResult): { visible: boolean; disabled: boolean; tooltip: string }`
   - `deleteWithConfirmation(result: ProgrammeResultRow | CurrentResult, onDeleted?: () => void): void`
2. Update `programme-results.component`:
   - Add divider and "Delete" button in `pr-row-menu`.
   - Wire disabled state and tooltip.
   - On success callback, refresh `data.load(this.programmeCode())`.
3. Update `my-work-card.component`:
   - Add kebab trigger button (`lucideMoreHorizontal`) in the card header.
   - Render overlay menu with "Delete" (plus "Download PDF" and "Copy link" if desired).
   - On success callback, emit event or call board reload.

---

## Risks, Dependencies, And Open Questions

- **Risk 1: Payload differences between Results Center and Framework Reporting:**
  - *Mitigation:* We confirmed that `ProgrammeResultRow` carries `raw: Record<string, any>`, which holds the identical `role_id`, `status_id`, `acronym`, and `version_id` properties returned by `GET /api/results/get/all/roles/filter/{userId}`.
- **Risk 2: Menu clipping in My Results:**
  - *Mitigation:* In `my-work-board`, cards live within vertically scrolling flex columns. The card action menu must use CDK Connected Overlay (as done in `programme-results`) or ensure it is rendered outside column overflow boundaries so it doesn't clip.
- **Open Question 1:** In `my-work-card`, should the kebab menu contain *only* "Delete", or also include "Download PDF" and "Copy link"? *(Recommendation: Include "Download PDF", "Copy link", and "Delete" to provide full card-level utility matching the table).*

---

## Success Criteria

1. An Initiative Lead or Admin viewing the **SP Results table** can click `⋯` on an eligible result and see an active "Delete" action.
2. Clicking "Delete" opens the confirmation dialog, successfully soft-deletes the result, and removes it from the table without requiring a page refresh.
3. An Initiative Lead or Admin viewing the **My Results board** can open the card's menu and delete the result, updating the column and tab counter immediately.
4. QAed results (`status_id == 2`) and results from users without roles 3/4/5 show the delete action disabled with the accurate descriptive tooltip.
5. All automated unit tests in `programme-results` and `my-work-card` pass cleanly.

---

## Next Step

Upon user approval of this proposal, proceed to detailed specification:

```text
/akili-specify changes/delete-result-action
```
