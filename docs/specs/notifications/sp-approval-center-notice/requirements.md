# Requirements — SP approval notice for everyone on the center

## 1. Document Control

| Field | Value |
|---|---|
| Module / Sub-feature | `notifications` / bilateral approval notice for center staff |
| Spec Path | `notifications/sp-approval-center-notice` |
| Depth | Standard (server + client, small) |
| Type | Change |
| Approval Mode | gated |
| Status | approved 2026-10-02 |
| Proposal | `proposal.md` — open questions OQ-1..OQ-4 taken at their proposal defaults (user went straight to specify); OQ-5 resolved by code reading |
| Amends | `notifications/bilateral-review-decision` NOTIF-R-3 (Approve) · `bugfix/notification-decision-center-wording` NDCW-R-2, NDCW-R-4 (Approve) |
| Baseline | `docs/prd.md` AC-8 · `docs/trd/trd.md` W4 |
| Ticket | none recorded |

## 2. Executive Summary

When a Science Program approves a W3/Bilateral result, every user who holds **any active role** on the result's lead center gets one informational inbox row reading *"**SP06**, as primary Science Program, has approved your center's result **9330** - <title>"*, with the "Decision update" and "W3/Bilateral" chips. Today only `CENTER_USER` holders get it, with different wording.

> **Data note (Pivot 2026-10-02, option 1 approved):** at execution time every active `role_by_user` row with a `center_id` is role 9 (Center User, 32 users). The any-role recipient set therefore equals the Center User set today; the visible change is the new sentence, chip and icon. The any-role lookup is kept on purpose so future non-9 center roles are covered.

## 3. Glossary

| Term | Meaning |
|---|---|
| Lead center | The result's center flagged as leading (`is_leading_result = 1`) |
| Center recipient | A user with an active role of any kind on the lead center who is not the submitter and not the approver |
| Submitter | `external_submitter`, falling back to `created_by` (NOTIF-R-3) |
| Primary SP | The result's owner Science Program (`initiative_role_id = 1`) |
| Legacy row | An approve notification stored before this change |

## 4. System Context & Scope

| In | Out |
|---|---|
| Approve: recipient set widened to any role on the lead center | Reject: recipients and copy unchanged (OQ-2 default) |
| Approve: new sentence for center recipients (inbox row + live toast) | Submitter wording — unchanged (OQ-1 default, NDCW-R-1) |
| "Decision update" chip on Approved **and** Rejected update rows (OQ-4 default) | Email (forbidden, P2-3157 BR1) |
| Check icon on the approve row | Non-lead tagged centers (OQ-3 default) |
| Legacy rows keep rendering | Backfill; new notification type; migration; other callers of the center-users lookup |

Already present, reused as is: the `W3/Bilateral` chip, the `<level> · <type> · <time ago>` meta line, click → mark read + NDDL deep link.

## 5. Stakeholders / Personas

| Persona | What changes |
|---|---|
| Center staff, any role on the lead center | Start receiving the approval notice |
| Center User (role 9) who is not the submitter | Same notice, new wording |
| Submitter | Nothing |
| SP approver | Nothing (never notified of their own action) |

## 6. Functional Requirements

### SACN-R-1 — Any center role receives the approval notice

> Today this set equals the Center User (role 9) holders — see the data note in §2.

On Approve of a bilateral result, the system SHALL create one notification of the existing approved type for every user with an active role of any kind on the lead center.

#### Scenario: Non-Center-User role on the lead center

- GIVEN result 9330 whose lead center is CIAT, and user M with an active non-`CENTER_USER` role on CIAT
- WHEN a member of SP06 approves 9330
- THEN M has one unread approve notification for 9330
- BUT it MUST NOT be sent to a user whose only CIAT role is inactive
- AND IT MUST NOT be sent to users of a center that is tagged but not lead

#### Scenario: No lead center

- GIVEN a result with no lead center flagged
- WHEN it is approved
- THEN only the submitter is notified (as today) and the approval succeeds

### SACN-R-2 — One row per person, never to the approver

The system MUST create at most one approve row per recipient per approval, and MUST NOT notify the approving user.

#### Scenario: Several roles, or also the submitter

- GIVEN user S is the submitter AND holds two roles on the lead center
- WHEN the result is approved
- THEN S receives exactly one row, with the submitter wording (SACN-R-5)

#### Scenario: Approver also holds a center role

- GIVEN approver A also has a role on the lead center
- WHEN A approves
- THEN A receives no row

### SACN-R-3 — Center sentence

A center recipient's approve row SHALL read: **`<SPXX>`**`, as primary Science Program, has approved your center's result `**`<code>`**` - <title>`, where `<code> - <title>` is the result link.

#### Scenario: Primary SP code known

- GIVEN 9330 is owned by SP06
- WHEN center recipient M opens the inbox
- THEN the row reads "SP06, as primary Science Program, has approved your center's result 9330 - Solar-powered cold storage adoption in Kenyan markets"
- AND "SP06" is emphasized
- BUT it MUST NOT contain "where your center was tagged" nor "Your Result"
- AND IT MUST NOT show a doubled space or a space before the comma

#### Scenario: Primary SP code unknown

- GIVEN the owner Science Program cannot be resolved at send time
- WHEN M opens the inbox
- THEN the row reads "The primary Science Program has approved your center's result <code> - <title>"
- BUT it MUST NOT show an empty bold token or a leading comma

### SACN-R-4 — Same sentence on every surface

The live (socket) notification and the stored inbox row SHALL carry the same sentence for the same recipient.

#### Scenario: Recipient online at approval time

- GIVEN M is online when 9330 is approved
- WHEN the toast arrives and M later opens the inbox
- THEN both show the SACN-R-3 sentence

### SACN-R-5 — Submitter wording unchanged

The submitter SHALL keep "✅ Your Result <code> - <title> has been Approved by the Science Program <SPXX>." (NDCW-R-1).

### SACN-R-6 — Row presentation

The approve row SHALL show: a check icon in place of the emitter's initials, the chip **"Decision update"**, the existing **"W3/Bilateral"** chip, and the existing `<level> · <type> · <time ago>` meta line; it SHALL NOT offer Accept/Decline.

#### Scenario: Reference row

- GIVEN an unread approve row for 9330 (Outcome · Innovation Use)
- WHEN it renders in the inbox
- THEN it matches `mockup/reference-row.png`: unread dot, check icon, sentence, "Decision update", "W3/Bilateral", "Outcome · Innovation Use · <time ago>"
- BUT it MUST NOT render action buttons

#### Scenario: Rejected row chip

- GIVEN any Rejected bilateral row
- WHEN it renders
- THEN its chip reads "Decision update" (text and icon otherwise unchanged)

### SACN-R-7 — Legacy rows keep rendering

An approve row stored before this change SHALL keep its current rendering: no text → "✅ Your Result …"; old center text → "The result <link>, where your center was tagged, …". Only the chip changes (SACN-R-6).

### SACN-R-8 — Approval never fails because of the notice

A failure resolving recipients, the SP code or sending the notice MUST NOT fail or roll back the approval, and MUST NOT send email.

#### Scenario: Recipient lookup fails

- GIVEN the center-roles lookup throws
- WHEN the result is approved
- THEN the approval responds success, the submitter is still notified, and a warning is logged with no PII

### SACN-R-9 — Other center-user flows unchanged

Tagging, primary-request and share-request notifications SHALL keep their current recipient sets (`CENTER_USER` only).

## 7. Non-Functional Requirements

| ID | Requirement |
|---|---|
| SACN-NFR-1 | No migration, no new notification type, no `/api/bilateral/*` change |
| SACN-NFR-2 | No email; recipients not filtered by `user_notification_settings` (NOTIF NFR-1) |
| SACN-NFR-3 | Logs carry ids only — no names, emails or tokens (`.cursorrules`) |
| SACN-NFR-4 | One extra DB query at most per approval; inbox load cost unchanged (no new joins in list endpoints) |
| SACN-NFR-5 | Copy lives in `internationalization/`; UI uses existing Spartan badge + design tokens (`docs/ux-ui/design.md` §7) |

## 8. Defect Classes And Gates

| Defect class | Caught by |
|---|---|
| Wrong recipient set (role filter, inactive rows, non-lead center, approver included, duplicates) | `results.service.spec.ts` + `RoleByUser.repository.spec.ts` new cases (server Jest, scoped) |
| Other flows widened by accident (SACN-R-9) | Existing `getUserIdsByCenter` spec still asserts `role = 9`; new method has its own spec |
| Wrong sentence / spacing / missing-code fallback | `notification-type.constants.spec.ts` exact-string cases |
| Legacy row broken | Same client spec — legacy text + no-text cases |
| Toast ≠ list | Server spec asserts the stored and emitted text are the same value; **no automated check of the toast render** → manual look at HITL |
| Chip / icon / layout vs. reference image | `notification-item.component.spec.ts` asserts chip text + icon presence; **visual match is not automatable in jsdom** → manual check (or T6 visual review) against `reference-row.png` at the HITL pause |
| Approval fails on notice error | `results.service.spec.ts` case with a throwing lookup |

## 9. Requirement ID Index

| ID | Behavior |
|---|---|
| SACN-R-1 | Any active role on the lead center receives the approve notice |
| SACN-R-2 | One row per person; approver excluded |
| SACN-R-3 | Center sentence (+ no-code fallback) |
| SACN-R-4 | Toast and list agree |
| SACN-R-5 | Submitter wording unchanged |
| SACN-R-6 | Check icon, "Decision update" chip (Approved + Rejected), W3/Bilateral, meta, no actions |
| SACN-R-7 | Legacy rows render |
| SACN-R-8 | Never fails the approval; no email |
| SACN-R-9 | Other center-user flows unchanged |
