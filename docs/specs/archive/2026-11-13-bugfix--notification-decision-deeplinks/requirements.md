# Requirements — Notification click destinations for bilateral decision and review-request

## 1. Document Control

| Field | Value |
|---|---|
| Module / Sub-feature | `notifications` / click navigation (bell pop-up and Notifications list) |
| Spec Path | `bugfix/notification-decision-deeplinks` |
| Depth | Lite + Bug Mode (client only, one regression test per surface) |
| Type | Bug |
| Approval Mode | gated |
| Status | approved 2026-09-24 |
| Proposal | `proposal.md` (approved 2026-09-24) |
| Extends | `notifications/bilateral-review-decision` (NOTIF-R-4), `bugfix/bilateral-approved-open-route` (route util) |
| Ships with | `bugfix/notification-decision-center-wording` (already committed on `qa-development-2026-ss`) |

## 2. Executive Summary

Three bilateral notification types open the wrong page. The Approved/Rejected decision opens Result Detail from the list and the bilateral home from the bell; the reviewer's "submitted for your review" opens the queue with no result selected. Each must land where the user can act.

## 3. Glossary

| Term | Meaning |
|---|---|
| Decision notification | `Bilateral Result Approved` / `Bilateral Result Rejected` |
| Review-request notification | `The result … was submitted for your review by <center>` (`isBilateralSubmittedNotification`) |
| Lead center | The result's center with `is_leading_result`, resolved on click by `GET_centersByResultId` |
| Review drawer | Right-side panel of the SP bilateral review queue, opened by the query params `reviewResult` (result code) and `reviewResultId` (result id) |
| Surface | Bell pop-up (`pop-up-notification-item`) or Notifications list (`update-notification`) |

## 4. Scope

| In | Out |
|---|---|
| Click destination of the 3 types above on both surfaces | Notification copy (done in the wording spec) |
| Keeping mark-as-read and pop-up close on click | Server, payload, recipients, socket |
| Reusing `resolveBilateralResultOpenRoute` for the destination rule | Other types (tagged, contribution, requests) |

## 5. Functional Requirements

### NDDL-R-1 — Decision opens the bilateral center result

The system SHALL open `/bilateral/<lead center>/result/<result code>?phase=<version id>` when a decision notification is clicked, on both surfaces.

#### Scenario: Reported case (result 9544)

- GIVEN Angel, Center User of CIMMYT, has `Your Result 9544 … has been Approved by the Science Program SP01.` and CIMMYT is the lead center of 9544, phase 36
- WHEN Angel clicks it in the Notifications list
- THEN the app opens `/bilateral/CIMMYT/result/9544?phase=36`
- BUT it MUST NOT open `/result/result-detail/9544/general-information?phase=36`
- AND IT MUST behave the same from the bell pop-up (today it goes to `/bilateral/CIMMYT/home?result=9544`)

#### Scenario: Reject

- GIVEN the same setup with a Rejected notification
- WHEN it is clicked on either surface
- THEN the destination is the same as for Approved

### NDDL-R-2 — Review request opens the drawer

The system SHALL open `/result-framework-reporting/entity-details/<SP code>/bilateral-review?reviewResult=<result code>&reviewResultId=<result id>` when a review-request notification is clicked, on both surfaces.

#### Scenario: SP reviewer

- GIVEN the SP01 member has `The result 9544 - … was submitted for your review by CIMMYT.`
- WHEN they click it in the list or in the bell
- THEN the review queue opens with the review drawer already open for 9544
- BUT it MUST NOT stop at the queue with no result selected
- AND IT MUST keep using the SP code of the role-1 initiative the payload carries (`getProgramCode`)

### NDDL-R-3 — No dead click

When the lead center cannot be resolved (empty list, request error) the decision click SHALL fall back to Result Detail `/result/result-detail/<code>/general-information?phase=<version id>` (the list's behavior today). When the SP code is missing on a review request, behavior stays as today (the pop-up closes, the anchor's default applies).

#### Scenario: Lead center lookup fails

- GIVEN the centers request errors or returns no center
- WHEN a decision notification is clicked
- THEN Result Detail opens
- BUT the click MUST NOT do nothing and MUST NOT throw

### NDDL-R-4 — Side effects preserved

A click in the bell SHALL still mark the notification read and close the pop-up, as today. The list SHALL keep opening these links in a new tab (current `target="_blank"`) and SHALL NOT start marking as read (it does not today).

### NDDL-R-5 — Other notifications unchanged

Every other notification type SHALL keep its current click behavior on both surfaces.

## 6. Non-Functional Requirements

| ID | Requirement |
|---|---|
| NDDL-NFR-1 | Client only: no server, migration, payload or `/api/bilateral/*` change |
| NDDL-NFR-2 | The destination comes from `resolveBilateralResultOpenRoute` (or one shared helper), not a third hand-written copy of the rule |
| NDDL-NFR-3 | No token, email or PII logged |

## 7. Assumptions (from the proposal's open questions)

| # | Assumption | Effect if wrong |
|---|---|---|
| OQ-1 | The bell decision click also moves from `home?result=` to `result/<code>?phase=` | Amends NOTIF-R-4 wording only |
| OQ-2 | The drawer opens with `reviewResult` + `reviewResultId`; `search=` is not needed | Verified in code (`bilateral-review.component.ts:131-133`); confirm in the browser at the HITL pause |
| OQ-3 | The list keeps a new tab after an async lead-center lookup | If a popup blocker stops it, fall back to same-tab; decided in `design.md` |

## 8. Defect Classes And Gates

| Defect class | Caught by |
|---|---|
| Wrong URL built for a notification type (either surface) | New Jest cases asserting the exact URL / router call per type and surface |
| Missing fallback (lookup fails) | Jest case with an erroring and an empty centers response |
| Drawer really opens; new tab opens after the async lookup; popup blocker | **No automated check** (jsdom cannot open a real drawer or tab). Substitute: manual look at the HITL pause on a local stack, both surfaces |

## 9. Requirement Index

| ID | Behavior |
|---|---|
| NDDL-R-1 | Decision opens the bilateral center result (list and bell) |
| NDDL-R-2 | Review request opens the review drawer |
| NDDL-R-3 | Fallbacks, no dead click |
| NDDL-R-4 | Mark-as-read, pop-up close, new tab preserved |
| NDDL-R-5 | Other types unchanged |
