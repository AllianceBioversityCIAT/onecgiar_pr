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
| Status | approved (2026-10-19) |
| Ticket | INC-165323 (ServiceDesk) |
| Source | `proposal.md` (2026-10-19); Nicoleta's answers 2026-10-19; Cristian's infra answers 2026-10-19 |
| Date | 2026-10-19 |

## 1. Executive Summary

PMU sets up to two **reminder campaigns** per reporting phase: a **Q4 notice** and a **final reminder**. When a campaign's date arrives, or when the admin presses **Send now**, PRMS emails every Lead Contact Person who still owns **replicated Innovation Development / Innovation Use results in Editing**. Each lead gets **one digest** listing their pending innovations. The email is copied to the **coordinators and MELIA focal points** of the owning Science Program / Accelerator. A campaign is sent **at most once per recipient**, even with two PROD servers running the scheduler. Before sending, the admin can **preview** exactly who would receive what, and can see which pending results have **no reachable lead**.

## 2. Glossary

| Term | Meaning |
|---|---|
| **Replicated innovation** | A result of type Innovation Development (7) or Innovation Use (2) whose `is_replicated` flag is set. The phase-rollover copy sets it. |
| **Pending** | A replicated innovation in the **active Reporting phase** that is active (`is_active`) and in status **Editing (1)**. |
| **Lead** | The result's **Lead Contact Person**: the AD user linked in General Information (`lead_contact_person_id`). |
| **Unreachable lead** | A pending result whose lead has no linked AD user or whose AD user has no email address (for example, the free-text contact on older results). |
| **Owning SP** | The Science Program / Accelerator that owns the result (owner initiative role). |
| **Coordinator** | A user with the Coordinator role (`RoleEnum.COORDINATOR`) on the owning SP. |
| **MELIA focal point** | A person listed as MELIA focal point for the owning SP. This is a new list; it is not a PRMS role today. |
| **Campaign** | One scheduled reminder for one phase, of kind `Q4_NOTICE` or `FINAL_REMINDER`. |
| **Digest** | The single email one lead receives for one campaign. |
| **Dispatch** | One execution that sends a campaign, started by the scheduler or by Send now. |
| **Dry run / preview** | A dispatch computation that returns recipients and contents without sending anything or writing the send log. |

## 3. System Context & Scope

- **PRD:** `G2` (reporting completeness), `AC-3` (server-side authorization), `AC-5` (phase correctness), `AC-8` (observability and notifications), `AC-9` (no secrets or PII in logs).
- **TRD:** versioning / phase (active Reporting phase), `api/results` (Result, `results_by_inititiatives`), `auth/role-by-user` (coordinators), `shared/microservices/email-notification-management` (RabbitMQ `EMAIL_QUEUE`, `template` table), `@nestjs/schedule`.
- **UX:** Admin module → **Phase management → Reporting**, below the existing replication actions (`app-other-functionalities`). This location is assumed; see RIR-OQ-1.

### In scope

- Campaign scheduling per phase: create, edit the date, cancel.
- Scheduled dispatch and Send now, both on the same rules.
- One digest per lead, with the coordinators and MELIA focal points in CC.
- An idempotent send log.
- A dry-run preview.
- A list of unreachable leads.
- A MELIA focal point list, seeded from the list the user provides.
- Two email templates (Q4 notice, final reminder).
- Non-production safety: test label, plus recipient redirection.

### Out of scope

- Other result types (including IPSR type 10, Innovation Package) and other statuses.
- In-app (bell) notifications.
- Per-user opt-out.
- A UI to edit MELIA focal points.
- Free-form email text per campaign.
- Fixing free-text lead contacts.
- Throttling values. They are configurable, and the SMTP limits are still pending from Infra.

## 4. Stakeholders / Personas

| Persona | What changes |
|---|---|
| Platform admin / PMU (Nicoleta) | Schedules, previews and sends campaigns; sees the unreachable leads |
| Result submitter (innovation lead) | Receives one digest per campaign listing their pending innovations |
| SP/Accelerator coordinator, MELIA focal point | Copied on the digests for their SP's innovations |
| Other users | Nothing changes. They are not emailed and have no access to the feature |

## 5. User Stories

- **RIR-US-1:** As PMU, I want to schedule a Q4 notice and a final reminder for the active phase, so that leads are reminded without me emailing them by hand. *(Refines PMU stories in `docs/prd.md` §3.)*
- **RIR-US-2:** As PMU, I want to preview a campaign before it goes out, so that I can check the recipients and content.
- **RIR-US-3:** As PMU, I want to send a campaign immediately, so that I am not tied to the scheduler.
- **RIR-US-4:** As an innovation lead, I want one email listing all my pending replicated innovations with links, so that I know exactly what to update.
- **RIR-US-5:** As PMU, I want to see the pending results whose lead cannot be emailed, so that I can follow them up by hand.

## 6. Functional Requirements

### Requirement RIR-R-1: Pending innovation selection (MUST)

The system MUST compute the pending set **at dispatch time**. A result is pending when **all** of these hold:

- its type is Innovation Development (7) or Innovation Use (2);
- it belongs to the active Reporting phase;
- it is replicated;
- it is in status Editing (1);
- it is active;
- it is not bilateral-sourced (`source = 'API'`; see RIR-OQ-3).

#### Scenario: Only replicated Editing innovations are selected

- GIVEN the active Reporting phase has these results:
  - A: type 7, replicated, Editing;
  - B: type 2, replicated, Editing;
  - C: type 7, replicated, Submitted;
  - D: type 7, not replicated, Editing;
  - E: type 1, replicated, Editing;
  - F: type 7, replicated, Editing, inactive;
- WHEN a campaign is dispatched or previewed
- THEN exactly A and B are pending
- BUT it must NOT include C (not Editing), D (not replicated), E (wrong type) or F (inactive)
- AND IT MUST NOT include results from any phase other than the active Reporting phase.

#### Scenario: Status is evaluated at dispatch, not at scheduling

- GIVEN a campaign was created while result A was in Editing
- WHEN A is submitted before the campaign's date
- THEN A is not in the dispatched digest.

### Requirement RIR-R-2: One digest per lead (MUST)

The system MUST send **exactly one email per lead per campaign**, listing all of that lead's pending results. Each item shows the result code, the title, the type and the owning SP, plus a direct link to the result in the active phase.

#### Scenario: A lead with several pending innovations

- GIVEN lead L owns pending results A, B and G
- WHEN the campaign is dispatched
- THEN L receives one email listing A, B and G, each with a link
- BUT it must NOT send L one email per result.

### Requirement RIR-R-3: CC recipients (MUST)

Each digest MUST be copied to the **coordinators and active MELIA focal points of every owning SP** of the results it lists, deduplicated. The CC MUST NOT include SP leads, co-leads, directors or any other role.

#### Scenario: CC union across SPs

- GIVEN L's digest lists A (owned by SP01) and G (owned by SP04)
- WHEN it is dispatched
- THEN the CC holds the coordinators and MELIA focal points of SP01 and SP04, each address once
- BUT it must NOT include a user whose only role on those SPs is Lead or Co-lead
- AND IT MUST NOT list in CC an address that is already the To recipient.

### Requirement RIR-R-4: Unreachable leads (MUST)

The system MUST exclude unreachable leads from the dispatch and MUST list every pending result with an unreachable lead on the admin screen (code, title, SP, free-text contact if any).

#### Scenario: Free-text contact

- GIVEN pending result H has a free-text lead contact and no linked AD user
- WHEN the admin opens the preview
- THEN H appears in the unreachable list with its free-text contact
- AND no email is attempted for H.

### Requirement RIR-R-5: Campaign scheduling (MUST)

An admin MUST be able to create a campaign for the active Reporting phase, choosing a kind (`Q4_NOTICE` | `FINAL_REMINDER`) and a scheduled date-time. The admin can also edit the date-time or cancel the campaign while it is still pending. Each phase allows at most one non-cancelled campaign per kind. Dates are entered and shown in the admin's local time, labelled with the time zone.

#### Scenario: Duplicate kind

- GIVEN the phase already has a pending `Q4_NOTICE`
- WHEN the admin creates another `Q4_NOTICE` for the same phase
- THEN the system rejects it with a clear message
- BUT it must NOT reject a `FINAL_REMINDER` for the same phase.

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

- per lead: the To address, the CC list and the listed results;
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

The two campaign kinds MUST use two distinct templates, stored as new rows in the `template` table. Existing template rows MUST NOT be modified. Each subject MUST identify PRMS, the phase and the reminder kind. Outside production, the subject MUST carry the existing `[PRMS Testing]` label.

### Requirement RIR-R-12: Non-production safety (MUST)

When `IS_PRODUCTION` is not `true`, every dispatched digest MUST go **only** to a configured test address, with no CC. The intended To and CC are shown inside the body so the content can be reviewed. If no test address is configured, the dispatch MUST refuse to send outside production.

#### Scenario: PRTest send

- GIVEN `IS_PRODUCTION=false` and a configured test address T
- WHEN a campaign is dispatched
- THEN every digest goes only to T
- BUT it must NOT reach any real lead, coordinator or MELIA address.

### Requirement RIR-R-13: MELIA focal points (MUST)

The system MUST store MELIA focal points per SP/Accelerator (name, email, active flag), seeded from the list the user provides. Inactive entries MUST NOT be copied.

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
| Wrong CC (leads or co-leads included, duplicates) | Unit spec of the recipient builder |
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
| AS-1 | PROD runs 2 PM2 servers on UTC; PRTest runs a Docker container; `@Cron` fires on every instance (Cristian, 2026-10-19) |
| AS-2 | "Owning SP" = the owner initiative of the result |

## 10. Open Questions (defaults applied unless the user objects)

| ID | Question | Default |
|---|---|---|
| RIR-OQ-1 | Where does the UI live? | Phase management → Reporting, under the replication actions |
| RIR-OQ-2 | Should contributing SPs' coordinators and MELIA also be copied? | No, owner SP only |
| RIR-OQ-3 | Should bilateral (`source='API'`) innovations be included? | Excluded |
| RIR-OQ-4 | Should leads be able to opt out? | No opt-out |
| RIR-OQ-5 | Which test address is used outside production? | A global parameter, set by the user |

## 11. Requirement ID Index

| ID | Title | Strength |
|---|---|---|
| RIR-R-1 | Pending innovation selection | MUST |
| RIR-R-2 | One digest per lead | MUST |
| RIR-R-3 | CC recipients | MUST |
| RIR-R-4 | Unreachable leads | MUST |
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
