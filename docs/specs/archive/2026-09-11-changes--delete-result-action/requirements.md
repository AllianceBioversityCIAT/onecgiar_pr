# Requirements: Delete Result Action in SP Results and My Results

## Document Control

- **Spec Path:** `docs/specs/changes/delete-result-action/requirements.md`
- **Parent Proposal:** [`docs/specs/changes/delete-result-action/proposal.md`](file:///Users/jcadavid/orca/workspaces/onecgiar_pr/qa-development-2026/docs/specs/changes/delete-result-action/proposal.md)
- **Module:** `results` / `result-framework-reporting`
- **Sub-feature:** `delete-result-action`
- **Type:** Change
- **Approval Mode:** gated
- **Status:** in-review
- **Author:** Antigravity (T1 Architect)
- **Date:** 2026-09-11

---

## 1. Executive Summary

This specification defines the functional and non-functional requirements for bringing the **Delete Result** capability into the **Science Program Results table** (`programme-results`) and the **My Results board** (`my-work-board` / `my-work-card`).

Currently, deleting a result is only possible from the legacy Results Center (`/result/results-outlet/results-list`). Users who work within Science Program reporting must leave their workspace to clean up unwanted drafts or erroneous results. This change brings the deletion action directly to the context where users report and manage results, while guaranteeing 100% parity with legacy role permissions, status rules, phase validations, confirmation dialogs, and backend audit logging.

---

## 2. Glossary

| Term | Definition |
|---|---|
| **SP Results** | The tabular results view for a Science Program located at `/result-framework-reporting/entity-details/<acronym>/results`. |
| **My Results** | The Kanban-style work board for a user within a Science Program at `/result-framework-reporting/entity-details/<acronym>/my-results`. |
| **Results Center** | The global cross-program search and listing view at `/result/results-outlet/results-list`. |
| **CDK Connected Overlay** | Angular CDK floating panel primitive rendered at the root `<body>` level (`.cdk-overlay-container`), bypassing `overflow: hidden` and `overflow-x: auto` clipping. |
| **QAed** | Result status with `status_id = 2` ("Quality Assessed"). Once QAed, deletion is strictly prohibited by both business rules and backend constraints. |
| **Authorized Roles** | Initiative-level roles permitted to delete results: Lead (`role_id: 3`), Co-Lead (`role_id: 4`), and Coordinator (`role_id: 5`), in addition to Platform Admin (`isAdmin`). |

---

## 3. System Context & Scope

### 3.1 PRD Alignment
- **`docs/prd.md` G1 (Quality Reporting):** Ensures reporting integrity by allowing initiative leads to prune invalid or test results before QA.
- **`docs/prd.md` US-S1 (Submitter result lifecycle):** Users need complete lifecycle management (create, edit, update, delete) within their reporting space.
- **`docs/prd.md` AC-3 (Authorization):** Role-gated operation preventing unauthorized deletions.
- **`docs/prd.md` AC-7 (Soft delete & recovery):** Deletion triggers regulated logical soft-delete and audit trail via `ResultDeletionAuditService`.

### 3.2 UI/UX Baseline Alignment
- **`docs/ux-ui/design.md` §8 Components:** Action menus must adhere to standard styling (`.pr-row-menu`), design tokens, and overlay positioning rules.
- **Destructive Action Pattern:** Delete actions MUST use red text/icon tokens (`var(--pr-color-red-600)` / `var(--pr-color-red-50)` on hover) and require explicit user confirmation.

### 3.3 Scope Boundaries
- **In Scope:**
  - Addition of "Delete" option to SP Results table row menu overlay.
  - Addition of action trigger (`⋯`) and menu with "Delete" option to My Results board cards.
  - Strict enforcement of legacy phase, role, and status checks.
  - Standard confirmation dialog (`api.alertsFe.show`).
  - Progress feedback and post-deletion cache invalidation / list reload.
  - Comprehensive automated unit tests.
- **Out of Scope:**
  - Modifications to server-side soft-delete mechanics (`manage-data/result/:id/delete`).
  - Permanent/physical database deletion.
  - Batch / bulk deletion.

---

## 4. Stakeholders / Personas Affected

| Persona | What changes for them |
|---|---|
| **Initiative Lead / Co-Lead / Coordinator** | Can delete draft results directly from SP Results or My Results without navigating away to Results Center. |
| **Result Submitter (Non-lead member)** | Sees the delete action disabled with an informative tooltip instructing them to contact their initiative lead. |
| **Platform Administrator** | Can delete results from any phase directly in SP Results and My Results. |
| **QA Reviewer** | Protected from accidental deletion of reviewed results; QAed results (`status_id == 2`) cannot be deleted by anyone. |

---

## 5. User Stories

- **`DEL-US-1` (SP Results Deletion):** As an Initiative Lead, I want to delete a draft result from the SP Results table menu, so that I can keep our initiative results catalog accurate without navigating to Results Center.
- **`DEL-US-2` (My Results Deletion):** As an Initiative Submitter with coordinator rights, I want to delete an unwanted card from My Results board, so that my "Needs My Action" list only contains valid work.
- **`DEL-US-3` (Permission & QA Lockout Clarity):** As a user without deletion rights or viewing a QAed result, I want to see the delete option clearly disabled with a tooltip explaining why, so that I understand why the action is blocked.

---

## 6. Functional Requirements

### DEL-R-1: SP Results Table Row Menu Deletion Action
The SP Results table (`programme-results.component`) SHALL display a "Delete" action item inside the row menu CDK Connected Overlay.

#### Scenario: Eligible result in SP Results table
- GIVEN a user with an authorized role (Admin or Lead/Co-Lead/Coordinator)
- AND a result in the active portfolio phase with status other than "Quality Assessed" (`status_id !== 2`)
- WHEN the user clicks the row's `⋯` trigger button
- THEN the row menu opens displaying the "Delete" item with destructive styling (`text-[var(--pr-color-red-600)]` and trash icon)
- AND IT MUST be separated from the navigation items by a visual divider.

#### Scenario: Ineligible role in SP Results table
- GIVEN a user without an authorized role (not Admin, and role is not 3, 4, or 5)
- WHEN the user opens the row menu for a result
- THEN the "Delete" item is displayed in a disabled state (`disabled`, `aria-disabled="true"`, dimmed opacity)
- AND hovering displays the tooltip: `"You are not allowed to perform this action. Please contact your leader or co-leader."`
- BUT it must NOT trigger any action or confirmation dialog when clicked.

#### Scenario: QAed status lockout in SP Results table
- GIVEN an authorized user or Admin
- AND a result with status "Quality Assessed" (`status_id === 2`)
- WHEN the user opens the row menu
- THEN the "Delete" item is disabled
- AND hovering displays the tooltip: `"You are not allowed to perform this action because the result is in the status \"QAed\"."`
- BUT it must NOT allow deletion under any circumstances.

#### Scenario: Inactive or non-current portfolio phase
- GIVEN a result whose `acronym` does NOT match the active portfolio acronym (`reportingCurrentPhase.portfolioAcronym !== result.acronym`)
- WHEN the user opens the row menu
- THEN the "Delete" item SHALL NOT be visible in the menu.

---

### DEL-R-2: My Results Card Action Menu and Deletion Trigger
Each card in the My Results board (`my-work-card.component`) SHALL provide an action trigger (`⋯`) opening a contextual menu that includes the "Delete" action.

#### Scenario: Card menu interaction in My Results
- GIVEN a card rendered in any column of the My Results board
- WHEN the user clicks the `⋯` action trigger on the card
- THEN a floating menu opens via CDK Connected Overlay positioned relative to the trigger
- AND IT MUST render outside column scroll containers to prevent any visual clipping
- AND IT MUST display "Delete" (alongside "Download PDF" and "Copy link") adhering to the exact same permission and status rules as `DEL-R-1`.

#### Scenario: Deleting from My Results
- GIVEN a user with authorized role on an editable card
- WHEN the user clicks "Delete" from the card menu
- THEN the standard confirmation dialog is displayed.

---

### DEL-R-3: Confirmation Modal and Execution Flow
Clicking an active "Delete" option in either SP Results or My Results SHALL trigger the standard confirmation dialog and execute the deletion API call.

#### Scenario: Confirmation accepted
- GIVEN the user clicks an active "Delete" option
- WHEN the confirmation modal displays
- THEN it MUST present:
  - Title: `Are you sure you want to delete the result "${result.title}"?`
  - Description: `If you delete this result it will no longer be displayed in the list of results.`
  - Confirm button text: `Yes, delete`
- AND WHEN the user clicks `Yes, delete`
- THEN a loading indicator is displayed
- AND the application calls `api.resultsSE.PATCH_DeleteResult(result.id)` (`DELETE /api/manage-data/result/${result.id}/delete`)
- AND on success, a success notification is shown: `The result "${result.title}" was deleted`
- AND IT MUST refresh the view state.

#### Scenario: Confirmation canceled
- GIVEN the confirmation modal is open
- WHEN the user clicks Cancel or closes the modal
- THEN no API call is made
- AND the result remains intact.

#### Scenario: Backend rejection (409 Conflict)
- GIVEN the deletion call fails with HTTP 409 (e.g. inactive phase or concurrent modification)
- WHEN the response returns
- THEN the application displays a warning alert (`id: 'delete-error'`) with title `Unable to delete result` and the backend message
- AND the loading indicator is dismissed.

---

### DEL-R-4: State Synchronization After Deletion
Upon successful deletion of a result:
- In **SP Results**: The table SHALL refresh its rows by invoking `ProgrammeResultsService.load()` with the current programme code.
- In **My Results**: The board SHALL refresh its cards by invoking `MyWorkBoardService.load()` and update the tab badge count via `MyWorkCountService`.

---

### DEL-R-5: Shared Deletion Domain Service
All deletion permission evaluations, status checks, confirmation dialogs, and HTTP executions SHALL be encapsulated in a single shared Angular service (`ResultDeletionService`).

#### Scenario: Rule parity guarantee
- GIVEN an update to deletion business rules or tooltips in the future
- WHEN modified in `ResultDeletionService`
- THEN both SP Results table, My Results board, and any future consumers automatically reflect the change with zero divergence.

---

## 7. Defect Classes & Verification Gate Mapping

To prevent defective or partially implemented behavior from passing automated checks, every potential defect class is paired with an explicit verification gate:

| Defect Class | Concrete Failure Mode | Verification Gate |
|---|---|---|
| **D1: Unauthorized Deletion** | A user with role_id != 3,4,5 or non-admin can click Delete. | Jest unit test asserting `disabled === true` and tooltip message for unauthorized role IDs. |
| **D2: QAed Result Deletion** | A result with `status_id === 2` allows deletion. | Jest unit test asserting `disabled === true` and QAed lockout tooltip. |
| **D3: Cross-Phase Deletion** | A result from an inactive portfolio phase displays Delete. | Jest unit test asserting `visible === false` when acronym does not match current phase portfolio. |
| **D4: Visual Menu Clipping** | Card menu in My Results gets cut off by column overflow. | Jest/DOM test verifying CDK Connected Overlay renders in `.cdk-overlay-container` on `<body>`. |
| **D5: Stale View State** | Result disappears from backend but remains visible on screen. | Jest unit test asserting `ProgrammeResultsService.load()` / `MyWorkBoardService.load()` is called on deletion success. |
| **D6: Unhandled 409 Conflict** | Error response crashes component or shows silent failure. | Jest unit test asserting warning alert displayed with backend error message on HTTP 409. |

---

## 8. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Security & Authorization** | Client-side gates mirror backend RBAC; only JWT-authenticated requests with authorized roles (Admin, 3, 4, 5) execute deletion. |
| **Auditability** | Every deletion records user ID, timestamp, and result ID via backend `ResultDeletionAuditService`. |
| **Accessibility (WCAG 2.1 AA)** | Row and card menu triggers MUST carry `aria-haspopup="menu"`, `[attr.aria-expanded]`, and accessible labels (`aria-label="More actions"`). Disabled items MUST have `aria-disabled="true"`. |
| **Visual Consistency** | Destructive action uses `--pr-color-red-600` text, subtle red background on hover (`rgba(239, 68, 68, 0.08)`), and standard 8px border radius conforming to `docs/ux-ui/design.md`. |
| **Performance** | Post-deletion reload must only fetch the active programme's rows, without requiring full page reloading or unmounting sibling tabs. |

---

## 9. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `DEL-AC-1` | Admin user on SP Results table row with `status_id = 1` | Clicks `⋯` | "Delete" option is visible and enabled. |
| `DEL-AC-2` | Lead user (role_id 3) on SP Results table row | Clicks "Delete" and confirms modal | `PATCH_DeleteResult` is called, success alert is shown, table reloads. |
| `DEL-AC-3` | Non-lead user (role_id 6) on SP Results table row | Clicks `⋯` | "Delete" is disabled with tooltip "You are not allowed to perform this action. Please contact your leader or co-leader." |
| `DEL-AC-4` | Any user on result with `status_id = 2` | Clicks `⋯` | "Delete" is disabled with tooltip "You are not allowed to perform this action because the result is in the status \"QAed\"." |
| `DEL-AC-5` | Result with acronym != current phase portfolio acronym | Clicks `⋯` | "Delete" option is not visible in menu. |
| `DEL-AC-6` | Eligible user on My Results card | Clicks `⋯` on card header | Card menu opens as overlay, showing "Delete" option. |
| `DEL-AC-7` | User deletes card from My Results board | Confirms modal | Result is deleted, board reloads, "Needs My Action" count decrements. |
| `DEL-AC-8` | Backend returns 409 Conflict | Deletion attempted | Warning alert "Unable to delete result" displays backend message without unhandled error. |

---

## 10. Requirement ID Index

- `DEL-R-1`: SP Results Table Row Menu Deletion Action
- `DEL-R-2`: My Results Card Action Menu and Deletion Trigger
- `DEL-R-3`: Confirmation Modal and Execution Flow
- `DEL-R-4`: State Synchronization After Deletion
- `DEL-R-5`: Shared Deletion Domain Service

---

## 11. Dependencies, Assumptions & Open Questions

### Upstream Dependencies
- `ApiService.alertsFe`: Unified modal alert service (`src/app/shared/services/alerts-fe.service.ts`).
- `ResultsApiService.PATCH_DeleteResult`: HTTP client method calling `DELETE /api/manage-data/result/:id/delete`.
- `DataControlService`: Holds `reportingCurrentPhase` and active result contexts.

### Assumptions
- `ProgrammeResultRow.raw` contains the raw API payload including `role_id`, `status_id`, `acronym`, and `version_id`. (Confirmed in `programme-results.service.ts`).
- CDK Overlay module is available in `ResultFrameworkReportingModule` / standalone component imports.

### Open Questions Resolved
- **OQ-1:** What options should the My Results card menu contain?
  - *Resolution:* It should contain "Delete", "Download PDF", and "Copy link", providing functional parity with the table row menu.

---

## Required Cross-References

- `docs/prd.md` (G1, US-S1, AC-3, AC-7)
- `docs/ux-ui/design.md` (§8 Components, §7 Design Tokens)
- `docs/trd/trd.md` (`manage-data` API, soft delete audit)
- [`programme-results.component.html`](file:///Users/jcadavid/orca/workspaces/onecgiar_pr/qa-development-2026/onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/programme-results/programme-results.component.html)
- [`my-work-card.component.html`](file:///Users/jcadavid/orca/workspaces/onecgiar_pr/qa-development-2026/onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/my-work-board/components/my-work-card/my-work-card.component.html)
- [`results-list.component.ts`](file:///Users/jcadavid/orca/workspaces/onecgiar_pr/qa-development-2026/onecgiar-pr-client/src/app/pages/results/pages/results-outlet/pages/results-list/results-list.component.ts)
