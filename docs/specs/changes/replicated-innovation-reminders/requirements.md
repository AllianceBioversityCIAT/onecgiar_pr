# Requirements — Replicated innovation reminders

## Document Control

| Field | Value |
|---|---|
| Module | `admin` (campaigns + admin UI) · `results` (pending-innovation query) · `notifications` (email) |
| Spec path | `changes/replicated-innovation-reminders` |
| Module code | `RIR` |
| Type | Change |
| Depth | **Full**: new tables + migration, bulk email to real people, admin-only auth, and a scheduled job on 2 PROD servers |
| Approval Mode | gated (inherited from `proposal.md`) |
| Status | approved revision 2 (2026-10-23, Pivot); revision 1 approved 2026-10-19 |
| Ticket | INC-165323 (ServiceDesk) |
| Source | `proposal.md` (2026-10-19); Nicoleta's answers 2026-10-19 and 2026-10-23; Cristian's infra answers 2026-10-19 |
| Date | 2026-10-19 |

## 1. Executive Summary

PMU sets up to two **reminder campaigns** per reporting phase: a **Q4 notice** and a **final reminder**. When a campaign's date arrives, or when the admin presses **Send now**, PRMS emails about every **replicated Innovation Development / Innovation Use result still in Editing**:

- **W1/W2:** each **innovation developer** with a PRMS account gets **one digest** listing their pending innovations, with the **MELIA focal points** of the owning Science Program / Accelerator in copy. Innovations with no reachable developer go into **one summary per SP** to its MELIA focal points.
- **W3/bilateral:** one email per center to its **Center MEL focal point** only.

*(Revision 2, 2026-10-23. Revision 1 emailed the Lead Contact Person with coordinators and MELIA in copy.)* A campaign is sent **at most once per recipient**, even with two PROD servers running the scheduler. Before sending, the admin can **preview** exactly who would receive what, and can see which pending results have **no reachable lead**.

## 2. Glossary

| Term | Meaning |
|---|---|
| **Replicated innovation** | A result of type Innovation Development (7) or Innovation Use (2) whose `is_replicated` flag is set. The phase-rollover copy sets it. |
| **Pending** | A replicated innovation in the **active Reporting phase** that is active (`is_active`) and in status **Editing (1)**. |
| **Innovation developer** | A person listed in the free-text `results_innovations_dev.innovation_developers` field of an Innovation Development result. In revision 2 the developer replaces the Lead Contact Person as the recipient. |
| **Reachable developer** | A developer whose entry gives an email address that belongs to an active PRMS user (RIR-R-16, RIR-R-17). |
| **MELIA summary** | One email per owning SP to its MELIA focal points, listing that SP's W1/W2 pending results that have no reachable developer. |
| **Center MEL focal point** | The MEL contact of a CGIAR center. Used only for W3/bilateral results (RIR-R-18). |
| **Unreachable** | A pending result whose message has no recipient (RIR-R-4). |
| **Owning SP** | The Science Program / Accelerator that owns the result (owner initiative role). |
| **MELIA focal point** | A person listed as MELIA focal point for the owning SP. This is a new list; it is not a PRMS role today. |
| **Campaign** | One scheduled reminder for one phase, of kind `Q4_NOTICE` or `FINAL_REMINDER`. |
| **Digest** | The single email one developer receives for one campaign. |
| **Dispatch** | One execution that sends a campaign, started by the scheduler or by Send now. |
| **Dry run / preview** | A dispatch computation that returns recipients and contents without sending anything or writing the send log. |

## 3. System Context & Scope

- **PRD:** `G2` (reporting completeness), `AC-3` (server-side authorization), `AC-5` (phase correctness), `AC-8` (observability and notifications), `AC-9` (no secrets or PII in logs).
- **TRD:** versioning / phase (active Reporting phase), `api/results` (Result, `results_by_inititiatives`), `auth/role-by-user` (coordinators), `shared/microservices/email-notification-management` (RabbitMQ `EMAIL_QUEUE`, `template` table), `@nestjs/schedule`.
- **UX:** Admin module → **Phase management → Reporting**, below the existing replication actions (`app-other-functionalities`). This location is assumed; see RIR-OQ-1.

### In scope

- Campaign scheduling per phase: create, edit the date, cancel.
- Scheduled dispatch and Send now, both on the same rules.
- One digest per reachable developer, with the MELIA focal points in CC.
- One MELIA summary per SP.
- One email per center to its Center MEL focal points, for W3.
- An idempotent send log.
- A dry-run preview.
- A list of unreachable results.
- A Center MEL focal point list.
- A MELIA focal point list, seeded from the list the user provides.
- Email templates for the developer digest, the MELIA summary and the center email.
- Non-production safety: test label, plus recipient redirection.

### Out of scope

- Other result types and other statuses. Innovation packages stay out until they are replicated; that is a separate spec after the Reporting 2026 phase closes (RIR-OQ-9).
- The automatic "Inactive – not updated" closure, and telling it apart from a user-set Inactive. This is a separate spec after the phase closes.
- In-app (bell) notifications.
- Per-user opt-out.
- A UI to edit MELIA focal points.
- Free-form email text per campaign.
- Fixing free-text lead contacts or developer fields.
- Throttling values. They are configurable, and the SMTP limits are still pending from Infra.

## 4. Stakeholders / Personas

| Persona | What changes |
|---|---|
| Platform admin / PMU (Nicoleta) | Schedules, previews and sends campaigns; sees the unreachable leads |
| Innovation developer (PRMS user) | Receives one digest per campaign listing their pending innovations |
| SP/Accelerator MELIA focal point | Copied on the developer digests for their SP; receives the MELIA summary for their SP |
| Center MEL focal point | Receives one email per campaign listing their center's pending W3 innovations |
| SP/Accelerator coordinator | No longer emailed (revision 2) |
| Other users | Nothing changes. They are not emailed and have no access to the feature |

## 5. User Stories

- **RIR-US-1:** As PMU, I want to schedule a Q4 notice and a final reminder for the active phase, so that leads are reminded without me emailing them by hand. *(Refines PMU stories in `docs/prd.md` §3.)*
- **RIR-US-2:** As PMU, I want to preview a campaign before it goes out, so that I can check the recipients and content.
- **RIR-US-3:** As PMU, I want to send a campaign immediately, so that I am not tied to the scheduler.
- **RIR-US-4:** As an innovation developer, I want one email listing all my pending replicated innovations with links, so that I know exactly what to update.
- **RIR-US-5:** As PMU, I want to see the pending results that nobody can be emailed about, so that I can follow them up by hand.
- **RIR-US-6:** As a MELIA focal point, I want one email listing my SP's pending innovations that have no reachable developer, so that I can chase them.
- **RIR-US-7:** As a Center MEL focal point, I want one email listing my center's pending W3 innovations, so that I can get them updated.

## 6. Functional Requirements

### Requirement RIR-R-1: Pending innovation selection (MUST)

*(Revision 2, 2026-10-23: bilateral results are included.)*

The system MUST compute the pending set **at dispatch time**. A result is pending when **all** of these hold:

- its type is Innovation Development (7) or Innovation Use (2);
- it belongs to the active Reporting phase;
- it is replicated;
- it is in status Editing (1);
- it is active.

Each pending result is classified by its source:

- **W1/W2**: `source <> 'API'`. These are routed by RIR-R-2 / RIR-R-4.
- **W3/bilateral**: `source = 'API'`. These are routed only to the Center MEL focal point, by RIR-R-4.

#### Scenario: Only replicated Editing innovations are selected

- GIVEN the active Reporting phase has these results:
  - A: type 7, replicated, Editing, W1/W2;
  - B: type 2, replicated, Editing, W1/W2;
  - C: type 7, replicated, Submitted;
  - D: type 7, not replicated, Editing;
  - E: type 1, replicated, Editing;
  - F: type 7, replicated, Editing, inactive;
  - W: type 7, replicated, Editing, `source = 'API'`;
- WHEN a campaign is dispatched or previewed
- THEN A, B and W are pending, with A and B classified as W1/W2 and W as W3
- BUT it must NOT include C (not Editing), D (not replicated), E (wrong type) or F (inactive)
- AND IT MUST NOT include results from any phase other than the active Reporting phase.

#### Scenario: Status is evaluated at dispatch, not at scheduling

- GIVEN a campaign was created while result A was in Editing
- WHEN A is submitted before the campaign's date
- THEN A is not in any dispatched message.

### Requirement RIR-R-2: One digest per innovation developer (MUST)

*(Revision 2, 2026-10-23: the recipient is the innovation developer, not the Lead Contact Person.)*

For W1/W2 pending results, the system MUST send **exactly one email per reachable developer per campaign**, listing every pending result on which that developer is listed. A result with several reachable developers appears in each of their digests. Each item shows the result code, the title, the type and the owning SP, plus a direct link to the result in the active phase. The greeting uses the matched PRMS user's name (RIR-R-17), falling back to "colleague". *(Amended 2026-10-23, T-9 advisory A5: a parsed name can merge two people.)*

A developer is **reachable** when the developer field gives them an email address (RIR-R-16) **and** that address belongs to an active PRMS user (RIR-R-17).

#### Scenario: A developer on several innovations

- GIVEN developer V is listed on pending results A, B and G
- WHEN the campaign is dispatched
- THEN V receives one email listing A, B and G, each with a link
- BUT it must NOT send V one email per result.

#### Scenario: Several developers on one innovation

- GIVEN pending result A lists developers V1 and V2, both reachable
- WHEN the campaign is dispatched
- THEN V1's digest and V2's digest both list A
- BUT it must NOT send A only to the developer marked "(Main contact)".

### Requirement RIR-R-3: CC recipients (MUST)

*(Revision 2, 2026-10-23: MELIA only; coordinators are no longer copied.)*

Each developer digest MUST be copied to the **active MELIA focal points of every owning SP** of the results it lists, deduplicated. The CC MUST NOT include coordinators, SP leads, co-leads, directors or any other role. If an owning SP has no active MELIA focal point, the digest is still sent, with the CC it has.

#### Scenario: CC union across SPs

- GIVEN V's digest lists A (owned by SP01) and G (owned by SP04)
- WHEN it is dispatched
- THEN the CC holds the active MELIA focal points of SP01 and SP04, each address once
- BUT it must NOT include a user whose only link to those SPs is a role in PRMS (coordinator, lead, co-lead)
- AND IT MUST NOT list in CC an address that is already the To recipient.

### Requirement RIR-R-4: Results without a reachable developer (MUST)

*(Revision 2, 2026-10-23: summaries to MELIA and to the Center MEL focal point replace the "unreachable, no email" rule.)*

- **MELIA summary (W1/W2):** every W1/W2 pending result with **no reachable developer** goes into **one email per owning SP**, sent to that SP's active MELIA focal points. It lists all such results of that SP. This covers results whose developer field is empty, gives no email address, or lists only addresses that are not active PRMS users.
- **Center email (W3):** every W3 pending result goes into **one email per center** (RIR-OQ-8), sent to that center's active Center MEL focal points (RIR-R-18) and to nobody else.
- **Unreachable:** a result is unreachable when its summary has no recipient. That is a W1/W2 result whose SP has no active MELIA focal point, or a W3 result with no center or with no active Center MEL focal point for its center. Unreachable results get no email and are listed on the admin screen (code, title, SP or center, and the free-text developer field).

#### Scenario: Developer missing

- GIVEN pending results H1 and H2 of SP01 have an empty developer field, and H3 of SP01 lists only a name without an email
- WHEN the campaign is dispatched
- THEN SP01's MELIA focal points receive one email listing H1, H2 and H3
- BUT it must NOT send them one email per result.

#### Scenario: External developer

- GIVEN pending result X lists one developer whose email address is not an active PRMS user
- WHEN the campaign is dispatched
- THEN X is listed in the MELIA summary of its owning SP
- BUT no email is sent to that address.

#### Scenario: W3 result

- GIVEN pending W3 result W has center C, and C has Center MEL focal point M
- WHEN the campaign is dispatched
- THEN M receives one email listing W together with C's other pending W3 results
- BUT no developer, MELIA focal point or coordinator is emailed about W.

### Requirement RIR-R-5: Campaign scheduling (MUST)

An admin MUST be able to create a campaign for the active Reporting phase, choosing a kind (`Q4_NOTICE` | `FINAL_REMINDER`) and a scheduled date-time. The admin can also edit the date-time or cancel the campaign while it is still pending. Each phase allows at most one *open* campaign (`PENDING`, `SENDING` or `FAILED`; a failed campaign is still retryable with Send now) per kind. `SENT` and `CANCELLED` campaigns remain as history and do not block a new campaign of the same kind. An admin MAY start a new campaign from a `SENT` row ("Send again"); it is an independent campaign with its own send log, so its recipients are emailed again for whatever is still pending. *(Amended 2026-10-23, mini-Pivot R-5.)* Dates are entered and shown in the admin's local time, labelled with the time zone.

#### Scenario: Duplicate kind

- GIVEN the phase already has a pending `Q4_NOTICE`
- WHEN the admin creates another `Q4_NOTICE` for the same phase
- THEN the system rejects it with a clear message
- BUT it must NOT reject a `FINAL_REMINDER` for the same phase.

#### Scenario: Send again after a sent campaign

- GIVEN the phase has a `SENT` `Q4_NOTICE`
- WHEN the admin creates another `Q4_NOTICE` ("Send again")
- THEN the system accepts it as a new pending campaign
- BUT it must NOT modify the sent campaign or its send log.

#### Scenario: Sent campaigns are frozen

- GIVEN a campaign has been sent
- WHEN the admin tries to edit its date or cancel it
- THEN the system rejects the change.

### Requirement RIR-R-6: Scheduled dispatch (MUST)

A background job MUST dispatch every pending campaign whose scheduled date-time has passed, within **one hour** of that time.

#### Scenario: Due campaign

- GIVEN a pending campaign is scheduled for 2026-11-15 13:00 UTC
- WHEN the job runs at or after that time (no later than 14:00 UTC)
- THEN the campaign is dispatched and marked sent, with its counts.

### Requirement RIR-R-7: Send now (MUST)

An admin MUST be able to dispatch a pending campaign immediately, after an explicit confirmation that states the number of recipients. Send now MUST apply exactly the same rules as the scheduled dispatch (RIR-R-1 to RIR-R-4 and RIR-R-8).

### Requirement RIR-R-8: Exactly-once delivery (MUST)

A campaign MUST be dispatched **at most once**, and each recipient MUST receive **at most one** digest per campaign. This MUST hold when two PROD servers run the job at the same moment, when Send now and the job overlap, or when a dispatch is retried after a partial failure.

#### Scenario: Two servers fire together

- GIVEN two server instances run the job at the same minute for the same due campaign
- WHEN both try to dispatch
- THEN exactly one of them sends
- AND each lead receives one email.

#### Scenario: Retry after partial failure

- GIVEN a dispatch failed after sending to 40 of 100 leads
- WHEN the campaign is retried
- THEN only the remaining 60 leads are emailed
- BUT it must NOT email any of the first 40 again.

### Requirement RIR-R-9: Dry-run preview (MUST)

An admin MUST be able to preview any pending campaign. The preview returns:

- per message, grouped by type (developer digest, MELIA summary, center email): the To addresses, the CC list and the listed results;
- the totals;
- the unreachable list.

The preview MUST NOT send any email, write the send log or change the campaign's status.

### Requirement RIR-R-10: Admin-only access (MUST)

Every campaign, preview, send and unreachable-list endpoint MUST be restricted to application admins on the server (`AC-3`). The admin UI MUST only be reachable inside the Admin module.

#### Scenario: Non-admin caller

- GIVEN a logged-in user without the app Admin role
- WHEN they call any of these endpoints
- THEN the server responds 403
- AND no campaign is changed and no email is sent.

### Requirement RIR-R-11: Email content (MUST)

*(Revision 2, 2026-10-23: Nicoleta's copy.)*

Each message type (developer digest, MELIA summary, center email) MUST use its own template, stored in the `template` table. The two RIR template rows from revision 1 are updated to the new copy. Template rows that this feature did not create MUST NOT be modified.

- **Subject:** "Reminder: innovations pending a {phase year} update – {phase name}", for example "Reminder: innovations pending a 2026 update – Reporting 2026". The final reminder starts with "Final reminder:" instead of "Reminder:" (RIR-OQ-6).
- **Greeting:** the digest opens with "Dear {developer name}". The MELIA summary and the center email address their focal points.
- **Body:** Nicoleta's text of 2026-10-23, verbatim:
  - the count of innovations reported in previous years with no update in the current period;
  - a table with Result ID, Innovation (title · type) and Science Program / Accelerator;
  - the update and Inactive guidance;
  - the automatic-closure sentence.
- **Label:** outside production, the subject MUST carry the existing `[PRMS Testing]` label.

#### Scenario: Copy approval

- GIVEN the rendered templates
- WHEN Nicoleta reviews them at the HITL step
- THEN the text matches her 2026-10-23 copy
- BUT the first real send MUST NOT happen before she approves it (DEP-2).

### Requirement RIR-R-12: Non-production safety (MUST)

When `IS_PRODUCTION` is not `true`, every dispatched digest MUST go **only** to a configured test address, with no CC. The intended To and CC are shown inside the body so the content can be reviewed. If no test address is configured, the dispatch MUST refuse to send outside production.

#### Scenario: PRTest send

- GIVEN `IS_PRODUCTION=false` and a configured test address T
- WHEN a campaign is dispatched
- THEN every digest goes only to T
- BUT it must NOT reach any real developer, MELIA or Center MEL address.

### Requirement RIR-R-13: MELIA focal points (MUST)

The system MUST store MELIA focal points per SP/Accelerator (name, email, active flag), seeded from the list the user provides. Inactive entries MUST NOT be copied.

### Requirement RIR-R-16: Developer field parsing (MUST)

The system MUST read the developers of a pending Innovation Development result from the free-text `innovation_developers` field. It extracts **every** listed person: the name, plus the email address when one is given. Emails are trimmed and compared case-insensitively.

- An entry with a name but no email address is not reachable.
- An empty or blank field means the developer is missing.
- The same address listed twice on one result counts once.
- Text that is not an address (numbering, the "(Main contact)" mark, institution notes) MUST NOT become a recipient.

Innovation Use results have no developer field. Their routing is RIR-OQ-7, and the default is the MELIA summary.

#### Scenario: Mixed entries

- GIVEN a field "1. Ana Perez <a.perez@cgiar.org> (Main contact) 2. Juan Ruiz 3. B.Lee@CGIAR.org"
- WHEN it is parsed
- THEN the developers are Ana Perez (a.perez@cgiar.org), Juan Ruiz (no email) and b.lee@cgiar.org
- BUT "Main contact" and "1." are NOT recipients.

### Requirement RIR-R-17: PRMS account rule (MUST)

A parsed developer address is reachable only when it matches the email of an **active PRMS user** (`users.active = 1`, compared case-insensitively). Addresses that match no active user, for example external partners, MUST NOT receive mail. Their results follow RIR-R-4.

### Requirement RIR-R-18: Center MEL focal points (MUST)

The system MUST store Center MEL focal points per CGIAR center (name, email, active flag), seeded from the Program/Accelerator Teams dashboard (DEP-5). Inactive entries MUST NOT receive mail. The list changes with HR changes in P/As and Centers, so it MUST be re-exported and reloaded before each campaign (Nicoleta, 2026-10-23).

### Requirement RIR-R-14: Throttled emission (SHOULD)

Dispatch SHOULD publish digests in configurable batches with a configurable pause between batches, so it can respect the SMTP limits once Infra confirms them (DEP-3). Defaults are conservative until then.

### Requirement RIR-R-15: Campaign outcome visibility (SHOULD)

The admin screen SHOULD show, per campaign: the kind, the scheduled date-time, the status (`Pending | Sending | Sent | Failed | Cancelled`), the sent-at time, the number of emails sent and the number of unreachable results.

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| Correctness under concurrency | Exactly-once per (campaign, recipient) with 2 PROD servers (RIR-R-8), enforced by the database and not by process memory |
| Timeliness | A due campaign is dispatched within 60 min of its scheduled time; the servers run on UTC |
| Performance | Preview for the active phase returns in < 10 s at the current data volume (hundreds of results) |
| Security | Admin-only server-side (`AC-3`). No email addresses, tokens or bodies in logs; only counts and IDs (`AC-9`) |
| Observability | Every dispatch logs start, finish, campaign id, sent / skipped / failed counts and duration (`AC-8`) |
| Reliability | A failure in one digest does not stop the others; the campaign ends `Failed` with counts and can be retried (RIR-R-8) |
| Data | One migration (new tables, template rows, MELIA seed) with a working `down`; `migration:check` green |
| Accessibility / i18n | The admin UI uses existing Spartan components; its copy goes through `internationalization/` |

## 8. Defect classes → gate

| Defect class this spec can produce | Gate that catches it |
|---|---|
| Wrong pending set (type / status / phase / replicated / bilateral filters) | Repository spec over SQL assertions, plus a **dry run against `prdb`** compared to a hand-written SQL count at the HITL pause |
| Duplicate emails (two servers, retry) | Service spec simulating a lost claim and a pre-existing log row; a DB UNIQUE constraint covered by the migration |
| Wrong CC (coordinators, leads or co-leads included, duplicates) | Unit spec of the recipient builder |
| A developer lost, or a non-address read as a recipient | Parser spec over the real field patterns from the PROD extract (several people, name without email, mixed case) |
| Email sent to an external address | Builder spec for RIR-R-17, plus a PROD count of matched vs unmatched developer addresses at a HITL pause |
| Real people emailed during testing | RIR-R-12 unit spec, plus a PRTest smoke where only the test address receives mail (after DEP-4) |
| Non-admin access | Controller and guard spec, plus a real 403 on PRTest |
| Rendered email looks broken (layout, links) | **No automated check.** Substitute: the rendered HTML is sent to Nicoleta and the user for review at a HITL pause before the first real send |
| SMTP rejects or throttles the bulk run | **Unmeasurable until Infra answers (DEP-3).** Accepted risk, mitigated by RIR-R-14 batches and retry-safe dispatch |
| Scheduler does not fire in PROD | Cristian confirmed PM2 is long-lived. Residual risk is covered by Send now |

## 9. Dependencies & Assumptions

| ID | Item |
|---|---|
| DEP-1 | MELIA focal point list from the user. Blocks the seed task only |
| DEP-2 | Nicoleta approves the email copy before the first real send |
| DEP-3 | Infra/Networks ticket on SMTP limits. Blocks the first real PROD send, not development |
| DEP-4 | Juanda confirms PRTest mail behaviour. RIR-R-12 makes this safe either way |
| DEP-5 | The Center MEL focal point list. The user exports it from the Program/Accelerator Teams dashboard (Roles filter, Center MEL role; the "MELIA Focal Point" role is the P/A list already seeded by T-7). Blocks the center seed only |
| AS-1 | PROD runs 2 PM2 servers on UTC; PRTest runs a Docker container; `@Cron` fires on every instance (Cristian, 2026-10-19) |
| AS-2 | "Owning SP" = the owner initiative of the result |

## 10. Open Questions (defaults applied unless the user objects)

| ID | Question | Default |
|---|---|---|
| RIR-OQ-1 | Where does the UI live? | Phase management → Reporting, under the replication actions |
| RIR-OQ-2 | Should contributing SPs' coordinators and MELIA also be copied? | No, owner SP only |
| RIR-OQ-3 | Should bilateral (`source='API'`) innovations be included? | **Closed 2026-10-23:** included, routed to the Center MEL focal point (Nicoleta) |
| RIR-OQ-4 | Should leads be able to opt out? | No opt-out |
| RIR-OQ-5 | Which test address is used outside production? | A global parameter, set by the user |
| RIR-OQ-6 | What is the subject of the final reminder? | The same copy, starting with "Final reminder:" instead of "Reminder:" |
| RIR-OQ-7 | Innovation Use has no developer field. Should it go to the MELIA summary, or to the developers of the linked innovation? | **Closed 2026-10-23 (Nicoleta):** P/A MELIA focal points, combined in the same MELIA summary as Innovation Development results without a developer address |
| RIR-OQ-8 | Which center routes a W3 result to its Center MEL focal point? | **Closed 2026-10-23 (Nicoleta):** the center that submitted the result, which by default is the lead center. Implemented as the lead center |
| RIR-OQ-9 | Are innovation packages included? | No, not until a separate spec replicates them |

## 11. Requirement ID Index

| ID | Title | Strength |
|---|---|---|
| RIR-R-1 | Pending innovation selection | MUST |
| RIR-R-2 | One digest per innovation developer | MUST |
| RIR-R-3 | CC recipients (MELIA only) | MUST |
| RIR-R-4 | Results without a reachable developer | MUST |
| RIR-R-5 | Campaign scheduling | MUST |
| RIR-R-6 | Scheduled dispatch | MUST |
| RIR-R-7 | Send now | MUST |
| RIR-R-8 | Exactly-once delivery | MUST |
| RIR-R-9 | Dry-run preview | MUST |
| RIR-R-10 | Admin-only access | MUST |
| RIR-R-11 | Email content / templates | MUST |
| RIR-R-12 | Non-production safety | MUST |
| RIR-R-13 | MELIA focal points | MUST |
| RIR-R-14 | Throttled emission | SHOULD |
| RIR-R-15 | Campaign outcome visibility | SHOULD |
| RIR-R-16 | Developer field parsing | MUST |
| RIR-R-17 | PRMS account rule | MUST |
| RIR-R-18 | Center MEL focal points | MUST |
