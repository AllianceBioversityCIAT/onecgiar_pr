# Primary request decision state — Requirements

## 1. Document Control

| Field | Value |
|---|---|
| **Spec** | `bugfix/primary-request-decision-state` (prefix `PRDS`) |
| **Depth / Mode** | Lite · Bug Mode |
| **Proposal** | `proposal.md` (root cause confirmed there, §9) |
| **Status** | approved (Santiago Sanchez, 2026-10-21) |
| **Date** | 2026-10-21 |
| **Assumptions (proposal OQ-1/OQ-2, pending user confirmation)** | Chip reads **Accepted / Rejected** (user wording 2026-10-21); caption names the SP code (*"Accepted by SP03"*), no person, no date |

## 2. Executive Summary

A primary Science Program request row in the Notifications inbox shows a decision state (caption + chip) **only after the primary SP approves or rejects the bilateral result**, derived from the result's current status — never from the system-written ACCEPTED request row that PRA creates at Center submit.

## 3. Glossary

| Term | Meaning |
|---|---|
| Primary row | Inbox request row with `request_type = 'primary'` |
| Result status | `obj_result.status_id`: 5 Pending Review · 6 Approved · 7 Rejected |
| Decision state | The footer caption ("… by …") + decision chip on a request row |

## 4. Scope

In: primary rows in the Notifications inbox (`Received`). Out: contribution / contributor request rows, update rows, the bell, the review drawer, server, data.

## 5. Personas

SP lead / member of the primary Science Program reading the inbox. QA validating P2-3157.

## 6. Functional Requirements

### PRDS-R-1 — No decision state before the SP decides

A primary row SHALL show no decision caption and no decision chip unless the result status is Approved (6) or Rejected (7).

#### Scenario: Reproduction (PRTest 9864)
- GIVEN a primary row with `request_status_id = 2` (system-written at Center submit), `approved_by` = the Center submitter
- AND the result status is 5 (Pending Review)
- WHEN the inbox renders the row
- THEN no decision caption and no decision chip are rendered
- BUT it must NOT render "Accepted by <person>" nor an "Accepted" chip
- AND IT MUST still render "Needs your review" and "Click here to validate the bilateral result"

#### Scenario: Result still editing / other status
- GIVEN a primary row and the result status is anything other than 6 or 7 (e.g. 1 Editing, 4 Discontinued)
- WHEN the row renders, regardless of `request_status_id` (2 or 3)
- THEN no decision caption and no decision chip are rendered

### PRDS-R-2 — Decision state after the SP decides

A primary row SHALL show the SP's actual decision, taken from the result status.

#### Scenario: SP approved
- GIVEN a primary row and the result status is 6
- WHEN the row renders
- THEN the chip reads **Accepted** (accepted style) and the caption reads **Accepted by <primary SP code>**
- BUT it must NOT name any person nor show the request row's `aprovaed_date`

#### Scenario: SP rejected
- GIVEN a primary row and the result status is 7
- WHEN the row renders
- THEN the chip reads **Rejected** (declined style) and the caption reads **Rejected by <primary SP code>**

### PRDS-R-3 — "Needs your review" only while there is something to review

The primary row's type chip SHALL read "Needs your review" only while the result status is 5; otherwise it SHALL read a neutral kind label ("Primary Science Program request"). The validate CTA keeps today's status-5 gate.

#### Scenario: Decided result
- GIVEN a primary row and the result status is 6 or 7
- WHEN the row renders
- THEN the type chip reads "Primary Science Program request"
- BUT it must NOT read "Needs your review" nor show the validate CTA

### PRDS-R-4 — Non-primary rows unchanged

Contribution and bilateral-contributor request rows SHALL keep today's "Accepted by <person> · date" / "Declined by <person> · date" footer and chip.

#### Scenario
- GIVEN a contribution request row with `request_status_id = 2` and an approver
- WHEN it renders
- THEN it shows "Accepted by <first last> · <date>" and the Accepted chip, exactly as today

## 7. Non-Functional Requirements

- No API, payload, schema or data change. No new design tokens — reuse the existing `notification_decision_chip_accepted` / `_declined` styles.
- Copy lives in the existing copy file (no inline literals for new strings).

## 7.1 Defect classes → gate

| Defect class | Caught by |
|---|---|
| Decision shown on a pending/editing primary row (the bug) | Jest regression spec PRDS-R-1 (red on current code) |
| Wrong chip/caption after approve/reject | Jest specs PRDS-R-2 |
| "Needs your review" leaking after decision | Jest spec PRDS-R-3 |
| Contribution rows regress | Existing NOTIF-T-10/15/16 specs + PRDS-R-4 spec |
| Real payload lacks `obj_result.status_id` or primary SP code on decided rows (jsdom can't see the server) | **No automated check** → HITL on PRTest (result 9864 pending; one approved and one rejected primary row) |

## 8. Requirement ID Index

| ID | Title |
|---|---|
| PRDS-R-1 | No decision state before the SP decides |
| PRDS-R-2 | Decision state after the SP decides |
| PRDS-R-3 | "Needs your review" only while Pending Review |
| PRDS-R-4 | Non-primary rows unchanged |

## 9. Amendment (2026-10-21, PRDS-T-2)

The PRDS-R-2 **SP rejected** scenario is unreachable in the inbox while `bugfix/primary-notify-on-submit-regression` PNR-DD-3/4 stands. The server hides a primary card whose result is Rejected, because the result goes back to the Center (`PRIMARY_PREPARATION_STATUS_IDS` in `share-result-request.service.ts`). The client `rejected` branch is kept as a harmless guard. This was observed on PRTest with result 9742 and accepted by the user.
