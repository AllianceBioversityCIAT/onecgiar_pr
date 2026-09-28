# Requirements — Bilateral decision notification wording per recipient

## 1. Document Control

| Field | Value |
|---|---|
| Module / Sub-feature | `notifications` / bilateral review decision copy |
| Spec Path | `bugfix/notification-decision-center-wording` |
| Depth | Lite + Bug Mode (server + client, one regression test per side) |
| Type | Bug |
| Approval Mode | gated |
| Status | approved 2026-09-24 |
| Proposal | `proposal.md` (approved 2026-09-24) |
| Extends | `notifications/bilateral-review-decision` (NOTIF-R-2, NOTIF-R-3) |
| Ticket | none recorded |

## 2. Executive Summary

The Approved/Rejected notification says "Your Result" to every recipient, including Center Users who did not create the result. Non-submitters must read a sentence that names the center relationship instead; the submitter keeps today's text.

## 3. Glossary

| Term | Meaning |
|---|---|
| Submitter | `Result.external_submitter`, falling back to `Result.created_by` (NOTIF-R-3) |
| Center recipient | Any other recipient: an active Center User of the result's lead center (`role = CENTER_USER`) |
| Decision | Approve or Reject of a bilateral result by a Science Program member |

## 4. Scope

| In | Out |
|---|---|
| Wording of the stored row, the live socket toast, and the client list row | Who receives the notification (unchanged) |
| Split emit: submitter vs. the other recipients | Email (still forbidden for these transitions, P2-3157 BR1) |
| Rows written after the fix | Backfill of existing rows |

## 5. Functional Requirements

### NDCW-R-1 — Submitter wording is unchanged

The system SHALL keep `✅|❌ Your Result <code> - <title> has been Approved|Rejected by the Science Program <SPXX>.` for the submitter.

#### Scenario: Submitter approves-notification

- GIVEN a bilateral result whose submitter is user S and whose lead center has Center User C
- WHEN a Science Program member approves the result
- THEN S sees `✅ Your Result <code> - <title> has been Approved by the Science Program <SPXX>.`
- BUT it MUST NOT read "where your center was tagged" for S

### NDCW-R-2 — Center recipients get center wording

The system SHALL show every non-submitter recipient: `The result <code> - <title>, where your center was tagged, has been approved by the Science Program <SPXX>.` (`rejected` on Reject).

#### Scenario: Center User is not the creator (reported case, result 9561)

- GIVEN result 9561 reported by an external platform and a CIMMYT Center User C who is not the submitter
- WHEN the Science Program SP03 approves it
- THEN C sees `The result 9561 - <title>, where your center was tagged, has been approved by the Science Program SP03.`
- BUT C MUST NOT see "Your Result"
- AND IT MUST show no space before the comma (`<title>,` not `<title> ,`)

#### Scenario: Reject

- GIVEN the same setup
- WHEN the decision is Reject
- THEN C sees the same sentence with `rejected`, and the submitter sees `❌ Your Result … has been Rejected by …`

### NDCW-R-3 — Same sentence in every surface

The stored list row and the live socket notification SHALL carry the same text for a given recipient.

#### Scenario: Online recipient

- GIVEN C is online when the decision is made
- WHEN the socket toast arrives and C later opens the notifications list
- THEN both show the identical center sentence

### NDCW-R-4 — Recipients and persistence unchanged

The system MUST still create exactly one row per resolved recipient (submitter plus lead-center Center Users, emitter excluded, de-duplicated), MUST NOT filter on `user_notification_settings`, and MUST NOT send email.

#### Scenario: Submitter is also a Center User

- GIVEN S is both the submitter and a Center User of the lead center
- WHEN a decision is made
- THEN S receives one notification, with the submitter wording

### NDCW-R-5 — Old rows keep working

A stored notification with no `text` (written before this fix) SHALL keep rendering `Your Result …`.

## 6. Non-Functional Requirements

| ID | Requirement |
|---|---|
| NDCW-NFR-1 | No migration, no new notification type, no change to `/api/bilateral/*` |
| NDCW-NFR-2 | A failure resolving the split MUST NOT fail the review decision (existing never-throws posture) |
| NDCW-NFR-3 | No secrets or PII added to logs |

## 7. Assumptions (from the proposal's open questions)

| # | Assumption | Effect if wrong |
|---|---|---|
| OQ-1 | Recipients stay as they are; tagged non-lead centers do **not** start receiving the decision | Separate spec (recipient change), not this one |
| OQ-2 | CIMMYT is the flagged lead center of 9561 | If not, the user arrived by another path; investigate with the data |
| OQ-3 | `Approved` capitalised for the submitter, `approved` lowercase for centers, as requested | Trivial copy change |

## 8. Defect Classes And Gates

| Defect class | Caught by |
|---|---|
| Wrong wording per recipient (server) | New `notification.service.spec.ts` and `results.service.spec.ts` cases |
| Wrong wording in the list (client) | New `notification-type.constants.spec.ts` cases |
| `title ,` spacing | Same client case; assert the exact flattened string |
| Real end-to-end render in the UI | **No automated check**: substitute a manual look at both notification variants at the HITL pause |

## 9. Requirement Index

| ID | Behavior |
|---|---|
| NDCW-R-1 | Submitter text unchanged |
| NDCW-R-2 | Center recipients get center text (approve, reject, no stray space) |
| NDCW-R-3 | Toast and list agree |
| NDCW-R-4 | Recipients, persistence, no email unchanged |
| NDCW-R-5 | Legacy rows still render |
