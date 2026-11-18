# Requirements — Center focal point routing for replicated-innovation reminders

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/rir-center-focal-routing` |
| Module | `notifications` (server `api/replicated-innovation-reminders`, client Admin → Phase management → Reporting) |
| Type | Change |
| Deliverable | software |
| Depth | Standard |
| Approval Mode | gated |
| Status | approved 2026-11-13 |
| Ticket | SR-167303 (Freshservice), extends INC-165323 |
| Extends | `docs/specs/archive/2026-10-26-changes--replicated-innovation-reminders` (RIR-R-1…R-18) |
| Proposal | `proposal.md` (approved 2026-11-13) |
| Requirement prefix | `RCF-R-n` |

## 1. Executive Summary

A Center that runs its own follow-up (ICARDA first) can opt in to receive **all** of its pending replicated innovations, W1/W2 and W3, in **one** email to its Center focal points. Its developers then get no reminder for those innovations. The PMU manages the Center focal point list and the opt-in from Admin, with no SQL or migration needed. Centers that do not opt in behave exactly as before.

## 2. Glossary

| Term | Meaning |
|---|---|
| **Lead Center** | The Center on the result's active leading-center row (as RIR already resolves it). |
| **Opted-in Center** | A Center whose "focal point receives all reminders" setting is on. |
| **Center focal point** | A row of the existing Center MEL focal point list (RIR-R-18): name, email, active flag. |
| **Center email** | The `CENTER:<code>` message type that RIR already sends for W3 results. |

## 3. System Context & Scope

Current behavior (verified at `5518acc45`):
- W3 rows (`source = 'API'`) go to the lead Center's focal points. W1/W2 Innovation Development rows go to their reachable developers, with the P/A MELIA in CC. All other W1/W2 rows go to the P/A MELIA summary. — `onecgiar-pr-server/src/api/replicated-innovation-reminders/digest-builder.ts:175-200`
- The Center email has no CC. — `digest-builder.ts:255-263`
- Center focal points are loaded only for the lead Centers of W3 rows. — `reminder-dispatcher.service.ts:205-210`
- The Center template body says "your center has {{resultCount}} **bilateral** innovation(s)". — `onecgiar-pr-server/src/migrations/1791700000000-RIR-RecipientModelV2.ts:371`
- The focal point list has no API. The controller exposes only campaign endpoints. — `replicated-innovation-reminders.controller.ts:49-131`
- ICARDA has one focal point (Enrico Bonaiuti). — `1791800000000-RIR-SeedCenterMelFocalPoints.ts:117`

**In scope:** per-Center opt-in; routing of W1/W2 rows of opted-in Centers to the Center email; MELIA CC on Center emails that list W1/W2 rows; Center template copy; Admin API + UI for focal points and opt-in; ICARDA opted in at release.

**Out of scope:**
- Center review workflow (SR point 4)
- Developer role lists (SR point 3)
- Full exclusion of a Center (option 1)
- Admin editing of P/A MELIA focal points
- Developer and MELIA email copy
- Per-P/A rules

## 4. Stakeholders / Personas

| Persona | What changes |
|---|---|
| Platform admin / PMU (Nicoleta) | Manages Center focal points and the opt-in in Admin; sees the new routing in the preview. |
| Center focal point (ICARDA) | Receives one email listing all ICARDA-led pending innovations, W1/W2 + W3. |
| Developers of an opted-in Center | No longer receive a reminder for innovations led by that Center. |
| P/A MELIA focal points | Copied on Center emails for the W1/W2 rows of their P/A. No longer get a MELIA summary for those rows. |

## 5. Functional Requirements

### Requirement RCF-R-1: Per-Center opt-in setting (MUST)

The system MUST store, per CGIAR Center, whether its focal points receive **all** reminders for innovations it leads. The default for every Center MUST be off. The setting MUST be independent of the focal point contacts: adding or removing a contact does not change it.

#### Scenario: Default

- GIVEN a Center that no admin has ever configured
- WHEN a campaign is dispatched
- THEN that Center is treated as not opted in.

### Requirement RCF-R-2: Routing for an opted-in Center (MUST)

Every pending result (RIR-R-1) whose lead Center is opted in MUST be listed in that Center's single Center email, whatever its source (W1/W2 or W3) and type (Innovation Development or Innovation Use). Those results MUST NOT appear in any developer digest or MELIA summary.

#### Scenario: ICARDA opted in

- GIVEN ICARDA is opted in and has active focal point E
- AND pending W1/W2 Innovation Development D1 (SP01, developer V reachable), W1/W2 Innovation Use U1 (SP04) and W3 W1 are led by ICARDA
- WHEN the campaign is dispatched
- THEN E receives one email listing D1, U1 and W1
- BUT V must NOT receive a digest listing D1
- AND IT MUST NOT list D1 or U1 in the SP01 or SP04 MELIA summary.

#### Scenario: Developer on several Centers' innovations

- GIVEN developer V is listed on D1 (led by opted-in ICARDA) and D2 (led by non-opted CIMMYT)
- WHEN the campaign is dispatched
- THEN V receives a digest listing only D2
- AND ICARDA's Center email lists D1.

### Requirement RCF-R-3: Non-opted Centers unchanged (MUST)

For results whose lead Center is not opted in, or which have no lead Center, routing, recipients and CC MUST be identical to RIR-R-2/R-3/R-4.

#### Scenario: No Center opted in

- GIVEN no Center is opted in
- WHEN a preview is built for the same pending data
- THEN the messages, recipients, CC and unreachable list equal those produced before this change.

### Requirement RCF-R-4: CC on the Center email (MUST)

A Center email MUST be copied to the active MELIA focal points of every owning SP of the **W1/W2** results it lists, deduplicated, without any address that is already a To recipient. W3 results MUST NOT add CC recipients.

#### Scenario: W3-only Center email

- GIVEN a non-opted Center C whose Center email lists only W3 results
- WHEN it is dispatched
- THEN its CC is empty (as today).

#### Scenario: Mixed Center email

- GIVEN ICARDA's email lists D1 (SP01) and W1 (W3, owned by SP02)
- WHEN it is dispatched
- THEN the CC holds SP01's MELIA focal points
- BUT it must NOT hold SP02's MELIA focal points only because of W1.

### Requirement RCF-R-5: Opted-in Center without an active focal point (MUST)

If an opted-in Center has no active focal point, its results MUST be listed as unreachable (reason "no Center focal point") and MUST NOT fall back to developers or MELIA summaries.

### Requirement RCF-R-6: Center email copy (MUST)

The Center email body MUST NOT describe the listed innovations as "bilateral". Apart from that word, the approved copy stays unchanged, for every Center.

### Requirement RCF-R-7: Manage Center focal points (MUST)

An admin MUST be able to, from Admin → Phase management → Reporting:
- list the focal points per Center (name, email, active);
- add one (Center, name, email);
- edit its name or email;
- deactivate or reactivate it.

Deactivated focal points MUST NOT receive mail (RIR-R-18). Contacts MUST NOT be hard-deleted.

#### Scenario: Add a contact

- GIVEN ICARDA has Enrico active
- WHEN an admin adds Joren Verbist with a valid email
- THEN the list shows both as active, and the next preview's ICARDA email has both in To.

#### Scenario: Validation

- GIVEN an admin adds a focal point
- WHEN the email is malformed, empty, or already exists for that Center
- THEN the system rejects it with a clear message
- AND IT MUST NOT create a second row for the same Center and email.

### Requirement RCF-R-8: Manage the opt-in (MUST)

An admin MUST be able to see and toggle each Center's opt-in in the same screen. The change MUST take effect at the next preview or dispatch.

#### Scenario: Toggle with no active contact

- GIVEN ICARDA has no active focal point
- WHEN an admin turns its opt-in on
- THEN the system allows it AND shows a warning that ICARDA-led results will be unreachable (RCF-R-5).

### Requirement RCF-R-9: Admin-only (MUST)

Every new endpoint MUST be restricted to application admins, exactly like the campaign endpoints (RIR-R-10).

#### Scenario: Non-admin

- GIVEN a logged-in user without the app Admin role
- WHEN they call any focal point or opt-in endpoint
- THEN the server answers 403 and nothing changes.

### Requirement RCF-R-10: Preview shows the routing (MUST)

The existing preview (RIR-R-9) MUST show each Center email's To, CC and listed results, including W1/W2 results routed by RCF-R-2, without sending anything.

### Requirement RCF-R-11: ICARDA at release (MUST)

After release, ICARDA MUST be opted in, with its focal point list as confirmed by Enrico/Nicoleta (OQ-1). The default, until confirmed: Enrico only, as today.

## 6. Non-Functional Requirements

| ID | Requirement |
|---|---|
| RCF-NFR-1 | Exactly-once delivery (RIR-R-8) is preserved: message keys stay `CENTER:<code>`. |
| RCF-NFR-2 | The non-prod recipient redirect (RIR-R-12) applies to Center emails, as today. |
| RCF-NFR-3 | No change to `/api/bilateral/*` or any W3 form. The W3/Fetcher rule does not apply. |
| RCF-NFR-4 | Migrations are reversible, and `npm run migration:check` stays clean. |

## 7. Defect classes → gate

| Defect class | Gate |
|---|---|
| Wrong routing (a developer still emailed, or a row dropped or duplicated) | `build()` unit specs with opted / non-opted / mixed fixtures (RCF-R-2/3/5) |
| Regression for non-opted Centers | Equality spec: same fixture, no opt-ins, output = pre-change output (RCF-R-3) |
| Wrong CC | Builder spec on mixed W1/W2 + W3 rows (RCF-R-4) |
| Non-admin can change contacts | Controller guard spec + PRTest manual 403 check (RCF-R-9) |
| Malformed or duplicate contacts | Service/DTO spec + the existing unique index (RCF-R-7) |
| Copy still says "bilateral" | Migration up/down on prdb + template grep (RCF-R-6) |
| Compile errors the test runner hides | `npx tsc --noEmit -p` server and `ng build` / type-check client |
| UI layout/visual | No automated check. Human check at the PRTest HITL pause |
| Real volume in PROD (ICARDA email size) | Read-only PROD count shared with the user before the send (accepted manual step) |

## 8. Open Questions

| ID | Question | Default |
|---|---|---|
| OQ-1 | ICARDA recipients: Enrico, Joren, or both? | Enrico only until confirmed. The admin can add Joren from the UI |
| OQ-2 | CC MELIA for W3 rows in the Center email? | No (RCF-R-4) |

## 9. Requirement ID Index

| ID | Title | Strength |
|---|---|---|
| RCF-R-1 | Per-Center opt-in setting | MUST |
| RCF-R-2 | Routing for an opted-in Center | MUST |
| RCF-R-3 | Non-opted Centers unchanged | MUST |
| RCF-R-4 | CC on the Center email | MUST |
| RCF-R-5 | Opted-in Center without an active focal point | MUST |
| RCF-R-6 | Center email copy | MUST |
| RCF-R-7 | Manage Center focal points | MUST |
| RCF-R-8 | Manage the opt-in | MUST |
| RCF-R-9 | Admin-only | MUST |
| RCF-R-10 | Preview shows the routing | MUST |
| RCF-R-11 | ICARDA at release | MUST |
