# Requirements — A centre corrects and resubmits a rejected bilateral result in the Reporting Tool

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `bilateral/rejected-result-correction` |
| Code | `RRC` |
| Type | **Change** · Depth **Full** (review workflow, ownership transfer, notifications, and an API behaviour change on `RSB`) |
| Approval Mode | `gated` |
| Status | **approved**, user 2026-10-06 (Phase 1 gate: Continue) |
| Date | 2026-10-06 |
| Author (session) | Santiago Sanchez |
| Jira | [P2-3895](https://cgiarmel.atlassian.net/browse/P2-3895) (epic P2-3094). Assignee Juan David Delgado |
| Proposal | `proposal.md`, same folder, approved 2026-10-06. `OQ-1` (direct transfer on both paths) and `OQ-3` (contributors re-sent on resubmission) resolved |
| Depends on | `bilateral/resubmit-rejected-result` **`RSB-T-1`** (history `initiative_id`, `RESUBMIT`, readout `initiative_code`) |
| Modifies | `RSB-R-14` (API primary change: acceptance → direct transfer, `RRC-R-17`) · `QSG-R-5` (drawer read-only outside Editing/Draft → also interactive at Rejected, `RRC-R-6`) |
| Builds on | `notifications/bilateral-primary-sp-request` (`PSR`), `notifications/primary-notify-on-submit` (`PNS`), `bilateral/qa-ai-traffic-light` (`BIL-QAI`), `changes/qa-submit-stale-guard` (`QSG`), `bilateral/review-toc-only-editing` |
| Baseline | `docs/prd.md` **US-S4** (see review history and iterate before resubmission), **US-Q3**, `AC-2`, `AC-3`, `AC-5`, `AC-8`; `docs/ux-ui/design.md` bilateral result editor + notifications panel; `docs/trd/trd.md` bilateral module, review workflow |

## 2. Executive Summary

A rejected bilateral result stops being a dead end. The reporting centre reads the Science Program's reason, corrects the result **on the same record**, may move it to another SP **allocated to the project**, and sends it back for review.

| Status | Centre can edit | Centre can change primary SP | Centre can QA-check + submit |
|---|---|---|---|
| Editing / Draft | yes (unchanged) | yes, today's request flow (unchanged) | yes (unchanged) |
| **Rejected** | **yes**, status stays Rejected | **yes, takes effect at once**, allocated SPs only | **yes** → Pending Review |
| QA, Submitted, Discontinued, Pending Review, Approved | no (unchanged) | no (unchanged) | no (unchanged) |

The reviewer's justification shows in **three places**, all read-only and from one source: the rejection notification, a notice on the result next to its status, and a full rejection history.

## 3. Glossary

| Term | Meaning |
|---|---|
| **Centre user** | A user with the Center User role on the result's lead centre |
| **Admin** | Platform administrator |
| **Primary SP** | The Science Program set as primary (role 1) on the result. It reviews it |
| **Allocated SP** | An SP with a confirmed, positive allocation on the result's lead bilateral project (the rule the project + SP selector already applies) |
| **Request flow** | Today's swap: the incoming SP gets a request and becomes primary only after accepting; Submit is blocked meanwhile (`PSR`) |
| **Direct transfer** | The incoming SP becomes primary at once. No request, no acceptance, no submit block |
| **Current reason** | The comment of the **most recent** rejection recorded for the result |
| **Rejection history** | Every rejection (and resubmission) recorded for the result, ordered by date |
| **Resubmission** | Submit for review of a result in Rejected |

## 4. System Context & Scope

### In scope

- Editing, saving, QA-checking and submitting a Rejected result from the Reporting Tool.
- Changing the primary SP on a Rejected result (direct transfer, allocated SPs only).
- The current reason in the rejection notification and on the result.
- The full rejection history in the bilateral results list.
- Aligning the API resubmission (`RSB`) to the direct transfer.
- Re-sending contribution requests on resubmission.

### Out of scope

- The reviewer side (how the justification is written), the approval flow, approved notifications.
- Moving a result to an SP not allocated to its lead project.
- The primary SP flow in Editing/Draft (stays the request flow).
- W1/W2 results. Portfolio analysis of rejection reasons.
- Backfilling the SP on history rows recorded before `RSB-T-1`.
- Coordination between an API resend and an in-app edit of the same result (last write wins, accepted by the ticket).

## 5. Stakeholders / Personas

| Persona | What changes for them |
|---|---|
| Result submitter (centre user) | Can act on a rejection: read why, correct, move the SP, resubmit |
| QA reviewer (Science Program) | Corrected results return to its queue with the ordinary notice. A result moved to it arrives as a normal pending review, never as an ownership request |
| Platform admin | Same access it has today across bilateral results, now including Rejected |
| Bilateral consumer (STAR, MEL, TIP) | A resubmission naming a different primary takes effect at once (`RRC-R-17`) |

User stories:

- **`RRC-US-1`** As a centre user, I want to correct a rejected result and send it back, so that a rejection does not force me to start over. *Refines US-S4.*
- **`RRC-US-2`** As a centre user, I want to see why the result was rejected, everywhere I meet it, so that I know what to fix without chasing the reviewer. *Refines US-S4.*
- **`RRC-US-3`** As a centre user, I want to move a result rejected as "not ours" to another SP of the project, so that it reaches the SP it belongs to.

## 6. Functional Requirements

### 6.1 Correcting the result

#### `RRC-R-1` A Rejected result is editable by those who edit it in Editing (BR1, AC1)

The system MUST let a centre user or an admin edit every section of a bilateral result in Rejected, under the same permissions that apply in Editing.

##### Scenario: Centre user opens a rejected result
- GIVEN a bilateral result in Rejected in the open phase
- AND a centre user of its lead centre
- WHEN they open the result
- THEN every section is editable, exactly as in Editing
- AND the status badge reads Rejected

##### Scenario: Another centre or a plain user (AC4)
- GIVEN the same result
- WHEN a user who is neither a centre user of the lead centre nor an admin opens it
- THEN the result is read-only, as an Editing result is for that user today
- BUT it must NOT be more permissive than Editing for any user

#### `RRC-R-2` Saving never changes the status (BR2, AC2)

The system MUST keep a Rejected result in Rejected on every save, of any section, by any allowed user.

##### Scenario: Save keeps Rejected
- GIVEN a result in Rejected
- WHEN the centre user edits a field and saves
- THEN the change is stored
- AND the status is still Rejected, on the server and on screen
- BUT nothing is sent to any Science Program and no notification is emitted

##### Scenario: Corrected but never submitted
- GIVEN a result corrected and saved, never submitted
- THEN it stays Rejected indefinitely and nobody is notified

#### `RRC-R-3` Every other status keeps its lock (AC3, AC25, AC30)

The system MUST keep editing, primary SP change and submission exactly as today for Editing, Draft, Quality Assessed, Submitted, Discontinued, Pending Review and Approved, including the admin exemption for Discontinued.

##### Scenario: Pending Review and Approved stay locked
- GIVEN a result in Pending Review or Approved
- WHEN a centre user opens it
- THEN it is read-only, the primary SP cannot be changed and Submit is unavailable
- AND IT MUST be refused by the server too, with today's messages

#### `RRC-R-4` Closed phase wins (edge case)

When the reporting phase is closed, the system MUST NOT allow correcting, changing the SP of, or resubmitting a Rejected result. Existing phase rules apply unchanged.

### 6.2 Resubmitting

#### `RRC-R-5` Submit from Rejected goes to Pending Review (BR2, AC5, AC8, AC23)

The system MUST allow a centre user or an admin to submit a Rejected result for review. The submission MUST place it in Pending Review, in the primary SP's review queue, and the primary SP MUST receive the same "waiting for your review" notification it receives for any submission.

##### Scenario: Resubmission
- GIVEN a corrected result in Rejected with a primary SP and a current quality check
- WHEN the centre user submits it
- THEN the status becomes Pending Review
- AND the result appears in the primary SP's review queue
- AND the primary SP receives the ordinary "waiting for review" notification
- AND a resubmission entry is added to the history, naming the primary SP
- BUT it must NOT go back to Editing (BR2)

#### `RRC-R-6` The quality check applies unchanged (BR3, AC6, AC7)

The system MUST require a current quality check to submit a Rejected result, exactly as for Editing/Draft. A check run before the latest edit MUST be treated as out of date, and the user MUST be told to run it again. The quality check drawer MUST be interactive (run, adjust, submit) for a Rejected result, as it is for Editing/Draft.

##### Scenario: Stale check
- GIVEN a result in Rejected with a completed quality check
- WHEN the user edits a field, saves, and tries to submit without re-running the check
- THEN Submit is refused or not offered, and the user is told the check is out of date
- BUT the guard must NOT be relaxed for resubmissions

##### Scenario: Drawer at Rejected
- GIVEN a result in Rejected
- WHEN the user opens the quality check drawer
- THEN it offers Run / Make adjustments / Submit as in Editing
- AND IT MUST stay read-only for Pending Review and every other non-editable status (`QSG-R-5` otherwise unchanged)

#### `RRC-R-7` No primary SP, same refusal (AC9)

The system MUST refuse to submit a Rejected result that has no primary SP, with the same message it uses today for any result in that condition.

#### `RRC-R-8` Contributors are re-sent on resubmission (proposal `OQ-3`)

On resubmission, the system MUST send contribution requests for the contributors saved on the result **at that moment**. While the result stays in Rejected, the system MUST NOT send contribution requests or emit any contributor notification.

##### Scenario: Contributor kept
- GIVEN a result rejected while SP06 was a contributor (its request was deactivated by the rejection)
- AND the centre keeps SP06 in Contributors
- WHEN the result is resubmitted
- THEN SP06 receives a contribution request again
- BUT no request reaches SP06 before the resubmission

##### Scenario: Contributor removed
- GIVEN the centre removes SP06 from Contributors before resubmitting
- WHEN the result is resubmitted
- THEN SP06 receives nothing

### 6.3 Changing the primary SP

#### `RRC-R-9` The primary SP can be changed on a Rejected result (AC18, AC20)

The system MUST allow a centre user or an admin to change the primary SP of a Rejected result, offering **only** the SPs allocated to its lead project. Saving an SP not allocated to the project MUST be refused with the message the system already uses for that condition, and nothing changes.

##### Scenario: Two or more allocated SPs
- GIVEN a Rejected result whose lead project is allocated to SP09 (current primary) and SP12
- WHEN the centre user opens the SP selector
- THEN SP12 is offered, and no SP outside the project is
- AND an SP that already rejected the result can still be picked

#### `RRC-R-10` The change takes effect at once (BR7, AC19, AC22, AC24)

On a Rejected result, a change of primary SP MUST make the chosen SP the primary immediately. The system MUST NOT send an ownership request, ask the incoming SP to accept, block Submit for review on account of the change, or require a ToC mapping for the new SP before submitting.

##### Scenario: Direct transfer
- GIVEN a Rejected result with primary SP09, project allocated to SP09 and SP12
- WHEN the centre user picks SP12 and saves
- THEN SP12 is the primary SP at once
- AND Submit for review is available without waiting
- BUT SP12 must NOT receive an ownership request or any notification at this point
- AND IT MUST NOT ask the centre for a ToC mapping for SP12

##### Scenario: Submit after the move (AC23)
- GIVEN the result above, moved to SP12 and quality-checked
- WHEN the centre submits it
- THEN it lands in **SP12's** review queue, not SP09's
- AND SP12 receives the ordinary "waiting for review" notification, not an ownership request

##### Scenario: Change of mind
- GIVEN the centre picks SP12, then picks SP09 again before submitting
- THEN SP09 is the primary SP and nothing was sent to anyone

#### `RRC-R-11` Single allocation is explained (AC21)

When the lead project is allocated to a single SP, the system MUST make clear there is no alternative SP, rather than showing an empty or unusable selector. The rest of the result stays correctable.

#### `RRC-R-12` Editing/Draft keep today's SP flow (AC31)

For Editing and Draft, the primary SP change MUST stay exactly as today: the request flow, the first pick saved as a draft, and a repeated pick of the current primary starting a new round.

### 6.4 Reading the rejection reason

#### `RRC-R-13` The notification carries the reason (AC11, AC13, AC15)

The rejection notification MUST show the justification the SP wrote for **that** rejection, in addition to saying the result was rejected and by which SP. With no justification recorded, it MUST say *"No justification was recorded."*. A long justification MUST NOT break the notifications panel layout.

##### Scenario: Justification in the panel
- GIVEN SP09 rejects a result writing "Belongs to SP12"
- WHEN the centre user opens the notifications panel
- THEN the rejection notification shows "Belongs to SP12"

##### Scenario: Older rejection keeps its own reason
- GIVEN the result was rejected twice, with reasons A and then B
- THEN the first rejection notification shows A and the second shows B

##### Scenario: Notifications sent before this change
- GIVEN a rejection notification emitted before this change
- THEN it reads as it does today, with no justification line
- BUT it must NOT claim "No justification was recorded"

#### `RRC-R-14` The current reason is shown on the result (AC12, AC13, AC14, AC15, AC17)

When a centre user (or admin) opens a Rejected result, the system MUST show the current reason on the result, next to its status, read-only. With no justification recorded, it MUST say *"No justification was recorded."*. Once the result is in Pending Review (or any non-Rejected status), the reason MUST NOT be presented as a pending action.

##### Scenario: Reason next to the status
- GIVEN a Rejected result whose latest rejection says "Add evidence for the 2026 target"
- WHEN the centre user opens it
- THEN that text shows next to the Rejected badge
- AND no control lets the user edit, dismiss or delete it

##### Scenario: After resubmission
- GIVEN the result was resubmitted and is in Pending Review
- WHEN the centre user opens it
- THEN the reason notice is gone
- AND the rejection history is still reachable from the results list

#### `RRC-R-15` The full rejection history is readable (AC16, AC26, AC27, AC28, BR11)

The existing rejection justification modal in the bilateral results list MUST show **every** rejection of the result, in order, each with its justification (or *"No justification was recorded."*), the SP that rejected it, who recorded it and when. Resubmissions MUST appear in the same sequence. The history MUST remain readable after the result is approved, and no rejection is ever overwritten or deleted.

##### Scenario: Three rejections
- GIVEN a result rejected three times with reasons A, B, C, by SP09, SP09 and SP12
- WHEN the centre user opens the history
- THEN A, B and C show in order, each with its SP, reviewer and date
- AND the current reason on the result is C

##### Scenario: After approval
- GIVEN the same result is finally approved
- THEN the history is still reachable and shows all three rejections

##### Scenario: Rows before `RSB-T-1`
- GIVEN a rejection recorded before the SP was stored
- THEN it shows with its justification, reviewer and date, and no SP
- BUT it must NOT show a wrong SP

### 6.5 Regression and the API path

#### `RRC-R-16` Other notifications keep their wording (AC29)

Notifications for results approved, submitted, created, unsubmitted or quality assessed MUST keep their current text, character for character.

#### `RRC-R-17` The API resubmission uses the direct transfer (proposal `OQ-1`; modifies `RSB-R-14`)

When a reporting platform resubmits a Rejected result through `POST /api/bilateral/create` naming a primary SP different from the current one, the system MUST apply the same direct transfer as `RRC-R-10`: the named SP becomes primary at once and the result lands in its review queue with the ordinary notice. The endpoint, payload and response MUST NOT change.

##### Scenario: STAR moves the result
- GIVEN a Rejected result with primary SP09
- WHEN STAR resubmits it naming SP12 (allocated to the lead project)
- THEN SP12 is primary, the result is Pending Review in SP12's queue, SP12 gets the ordinary notice
- BUT SP12 must NOT receive an ownership request

#### `RRC-R-18` Observability (SHOULD)

The system SHOULD log one line per resubmission and per direct transfer (result id, previous and new SP ids, user id), with no tokens or personal data beyond ids (`.cursorrules`).

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Security** | Every server change keeps today's checks (JWT, centre role or admin, allocation). No new endpoint. Nothing logs secrets |
| **Data integrity** | A direct transfer and a resubmission are all-or-nothing: a failure leaves the previous primary and status intact |
| **Backwards compatibility** | `/api/bilateral/*` payload and response unchanged (`AC-4`). The contract doc gets a change-log row for the behaviour change (`RRC-R-17`) |
| **Accessibility** | The reason notice and the history meet WCAG 2.1 AA (`docs/ux-ui/design.md` §10): readable contrast, the notice announced as status text, the modal keyboard-operable |
| **i18n / copy** | New strings live with the existing bilateral copy constants |
| **UI library** | New UI uses Spartan components (user rule) |
| **Performance** | Opening a Rejected result adds at most one history request; the notifications panel adds no request per row |

## 8. Edge Cases

| Case | Expected |
|---|---|
| No justification recorded | Correctable and resubmittable; history entry present; notice and notification say "No justification was recorded." |
| Very long justification | Notification clamped without breaking layout; full text on the result notice and in the history |
| Lead centre association lost | Today's permission refusal and message |
| Admin corrects for a centre | Allowed (`RRC-R-1`) |
| Result originally from an external platform, corrected in-app | Allowed |
| API resend while a centre edits | Last write wins (accepted) |
| Every allocated SP already rejected it | Stays Rejected; nothing forces a resolution |
| Single-allocation project, rejected as "not ours" | No alternative (`RRC-R-11`); stays Rejected unless corrected otherwise |

## 9. Defect Classes and the Gate for Each

| Defect class | Gate that catches it | Gap |
|---|---|---|
| A status other than Rejected gets unlocked (edit, SP change, submit) | Jest table: 8 statuses × {SP change, assess, submit} on the server; client Jest table on the editability computed | — |
| A save at Rejected flips the status | Jest on the section-save paths: status untouched at 7 | **Partial.** Mocks cannot prove no other writer touches `status_id`. Substitute: the PRTest run (user) |
| Direct transfer leaves two primaries, or the old SP's ToC/requests behind | Jest on the transfer core: rows deactivated/written; regression of the existing `accept()` tests | **Partial.** Real rows checked in the PRTest run |
| Editing/Draft SP flow drifts (AC31) | Existing `updatePrimaryAssignment` / `PSR` / `PNS` Jest, scoped, unchanged and green | — |
| Notification shows the wrong rejection's reason, or other notification texts change | Jest on the description builder: two rejections → two reasons; exact-string snapshots for the five other types | — |
| Contribution requests sent during correction, or not re-sent at submit | Jest: no request writes on save at 7; requests created at submit from 7 | — |
| The reason notice/history renders wrong (layout, clamp, contrast, wrap) | **None automated** (jsdom cannot measure layout or contrast) | **Substitute:** visual check at the HITL pause in a real browser (read-only — the local stack writes to the shared DB) |
| The API path still sends a request (`RRC-R-17`) | Jest on the resubmission service: changed primary → transfer core called, `request()` not called | — |
| Non-centre user can edit | Client Jest + parity check against Editing | **Partial**, see `RRC-OQ-1` |

## 10. Open Questions

| # | Question | Default if there is no answer |
|---|---|---|
| `RRC-OQ-1` | Today the server's section writes do not check centre ownership (only status 5 is blocked). AC4 asks that other centres cannot edit a Rejected result. Is parity with Editing enough, or must this spec add a server ownership check? | **Parity with Editing (default applied).** Verified in design `RRC-P-3`: the client lock is `isEditableByCenterUser() && isCenterUserOfLeadCenter()`, so widening the status half keeps parity. Server hardening is a separate change (`RRC-K-5`) |

## 11. Requirement ID Index

| ID | Short name | Strength | Ticket |
|---|---|---|---|
| `RRC-R-1` | Rejected editable | MUST | BR1, AC1, AC4 |
| `RRC-R-2` | Save keeps Rejected | MUST | BR2, AC2 |
| `RRC-R-3` | Other statuses unchanged | MUST | AC3, AC25, AC30 |
| `RRC-R-4` | Closed phase wins | MUST | Edge case |
| `RRC-R-5` | Submit → Pending Review | MUST | BR2, AC5, AC8, AC10, AC23 |
| `RRC-R-6` | Quality check unchanged | MUST | BR3, AC6, AC7 |
| `RRC-R-7` | No primary, same refusal | MUST | AC9 |
| `RRC-R-8` | Contributors re-sent on resubmission | MUST | Proposal `OQ-3` |
| `RRC-R-9` | SP change, allocated only | MUST | BR8, AC18, AC20 |
| `RRC-R-10` | Direct transfer | MUST | BR7, BR9, BR10, AC19, AC22, AC23, AC24 |
| `RRC-R-11` | Single allocation explained | MUST | AC21 |
| `RRC-R-12` | Editing/Draft SP flow unchanged | MUST | AC31 |
| `RRC-R-13` | Reason in the notification | MUST | AC11, AC13, AC14, AC15 |
| `RRC-R-14` | Reason on the result | MUST | AC12–AC15, AC17 |
| `RRC-R-15` | Full rejection history | MUST | BR6, BR11, AC16, AC26–AC28 |
| `RRC-R-16` | Other notification texts unchanged | MUST | AC29 |
| `RRC-R-17` | API uses direct transfer | MUST | Proposal `OQ-1` |
| `RRC-R-18` | Observability | SHOULD | — |
