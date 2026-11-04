# Proposal — Replicated innovation reminders

## Document Control

| Field | Value |
|---|---|
| Spec path | `changes/replicated-innovation-reminders` |
| Slug | `replicated-innovation-reminders`, derived from the free-text argument (INC-165323 request) |
| Type | Change |
| Approval Mode | gated |
| Source | ServiceDesk INC-165323 "Notification for innovation leads" (Nicoleta Trifa, 2026-10-14) + her replies (2026-10-19). Marc Schut is in CC. |
| Commitment | ~1 week of development and testing (confirmed to the requester) |
| Depends on | none |
| Parallel-safe | yes (new tables and module only; it touches no shared contract) |
| Status | approved → specified (2026-10-19) |
| Date | 2026-10-19 |

---

## 1. Intent

Automatically email the leads of **replicated innovations that nobody updated in the current phase**. PMU sets the send dates (a Q4 notice and a final reminder in January) without a developer.

## 2. Problem / Current Behavior

- Each phase rollover copies innovations into the new phase. The copy sets `results.is_replicated = 1`, the copy starts in **Editing**, and the original owners are expected to update it and submit it.
- PRMS has **no reminder** for this. Each year PMU checks by hand which replicated innovations are still untouched and emails the P/As and innovation leads one by one.
- Most of the building blocks already exist:

| Building block | Where |
|---|---|
| Replicated flag | `results.is_replicated` (`result.entity.ts:473`), set by `versioning.service.ts` |
| Who to email | `results.lead_contact_person_id` → `ad_user.mail`. `SubmissionsService._findLeadContactPerson` already resolves it |
| Coordinators | `role_by_user` with `role = 5` (`RoleEnum.COORDINATOR`) plus `initiative_id` |
| Mail transport | `EmailNotificationManagementService.sendEmail` → RabbitMQ `EMAIL_QUEUE`. Templates live in the `template` table (handlebars). `addLabel()` adds `[PRMS Testing]` outside production |
| Scheduler | `@nestjs/schedule` is global. Crons already run (`webhook-dispatch.cron.ts`, `bilateral-ai-sweeper.cron.ts`, CLARISA) |

## 3. Proposed Outcome

Once a campaign's date arrives, or when the admin presses **Send now**:

1. PRMS finds every result that meets all of these conditions:
   - type is Innovation Development (7) or Innovation Use (2);
   - it is in the active reporting phase;
   - `is_replicated = 1`;
   - status is **Editing (1)**;
   - it is active.
2. It groups those results by **Lead Contact Person**. Each lead gets **one personalised digest** listing their pending innovations, with a direct link to each.
3. Each email goes in **CC** to the **coordinators** and **MELIA focal points** of the result's primary Science Program / Accelerator. Directors, leads and co-leads are not copied.
4. Every recipient is recorded in a **send log**. Running the same campaign again never emails the same person twice.
5. The admin sees the results whose lead contact has **no linked account** (free text only, no email), so PMU can follow them up by hand.

## 4. Scope

- **Server:**
  - a query for pending replicated innovations;
  - a digest builder;
  - a campaign dispatcher, run by a daily cron and by a "send now" endpoint, both on the same code path;
  - a send-log table;
  - two email templates (Q4 notice, final reminder), inserted by migration;
  - storage for the MELIA focal points;
  - admin-only endpoints guarded by `@Roles(ADMIN, APPLICATION)`.
- **Client:** an admin-section page with:
  - a list of campaigns per phase (type, scheduled date, status, sent at, number of recipients);
  - the ability to create or edit a scheduled date;
  - a **preview / dry-run** showing who would receive what, without sending;
  - a **Send now** button with confirmation;
  - the list of results with no reachable lead.
- **Data:** a migration for the new tables and templates, plus a seed of the MELIA focal points list (the user provides it).

## 5. Non-Goals

- Reminders for other result types or other statuses (Quality Assessed, Submitted, Pending Review…).
- In-app (bell) notifications. Email only.
- Per-user opt-out through `user-notification-settings`. This is a PMU compliance reminder; see OQ-4.
- Fixing the free-text lead contacts. PMU handles those by hand.
- Editing the MELIA list from a UI. It is seeded by migration in v1; see Approach.
- Arbitrary custom email text per campaign. The copy is fixed per template, and PMU reviews it before go-live.

## 6. Affected Users, Systems, And Specs

| Affected | How |
|---|---|
| PMU / admin (Nicoleta) | Schedules campaigns, previews them, and presses Send now |
| Innovation Lead Contact Persons | Receive the digest |
| SP/Accelerator coordinators + MELIA focal points | In CC |
| `api/` (new module, e.g. `replicated-innovation-reminders/`) | Query, dispatcher, cron, endpoints |
| `shared/microservices/email-notification-management` | New `EmailTemplate` entries, lookup-only like `IP_EXPERTS_SUPPORT_2026` |
| `onecgiar-pr-client/.../admin-section/pages/` | New page |
| Related specs | `changes/notifications-revamp` (notification UI patterns), and `submissions/CLAUDE.md` (the templates-in-DB rule: a new row per template, never an `UPDATE` of an existing one) |

## 7. Visual Reference

- Source: None.
- Location: none.
- Notes: the UI is a small admin-only page made of a table, a date field, and preview and send buttons, built with Spartan components that already exist. A mockup is optional; it can be generated at `/akili-specify` if wanted. The email body will go to Nicoleta for review as HTML before go-live.

## 8. Requirement Delta Preview

### ADDED Requirements

- **R1.** The system finds pending replicated innovations: types 7 and 2, active reporting phase, `is_replicated = 1`, status Editing, active.
- **R2.** It sends one digest per Lead Contact Person, CC'ing the coordinators and MELIA focal points of each result's primary SP/Accelerator.
- **R3.** An admin can create campaigns (Q4 notice / final reminder) with a scheduled date-time per phase.
- **R4.** A daily scheduled job dispatches due, unsent campaigns, and Send now dispatches one immediately. Both use the same code path.
- **R5.** Dispatch is idempotent. A (campaign, recipient) pair already in the send log is never sent again.
- **R6.** A dry-run preview lists recipients, CCs and innovations without sending anything.
- **R7.** The admin page lists the pending results whose lead contact cannot be emailed: no `lead_contact_person_id`, or an inactive AD user with no mail.
- **R8.** All endpoints are admin-only on the server, not just hidden in the UI (AC-3).

### MODIFIED Requirements

- None. Replication, submission and the existing emails do not change.

### REMOVED Requirements

- None.

## 9. Approach Options

### A. How the send is triggered

| Option | Pros | Cons |
|---|---|---|
| **A1. Campaign table + daily cron + Send now (same dispatcher)** ✅ | PMU owns the dates; the dispatcher is testable; Send now works even if the cron does not run | Needs one table and a cron |
| A2. Send now only (no schedule) | Smallest | Nicoleta has to remember the dates, and the ticket asks for scheduling |
| A3. AWS EventBridge rule → endpoint | Works on Lambda | Infra change outside the repo and not deployable by agents; dates would be fixed in infra, not by PMU |

### B. Where the MELIA focal points live

| Option | Pros | Cons |
|---|---|---|
| **B1. New table `initiative_melia_focal_point` (initiative_id, email, name, is_active), seeded by migration** ✅ | Explicit and auditable; it grants no app permissions; editing UI can come later | Changes to the list need a migration or SQL until there is a UI |
| B2. New role "MELIA" in `role` / `role_by_user`, managed in User Management | Reuses the existing admin UI | `ValidRoleGuard` compares `userRole <= required`. A new role id silently interacts with permission checks and client role gates, and that is risky inside 1 week |
| B3. `global_parameters` text value (SP code → emails) | No migration for the table | Hard to edit safely and not validated |

### C. Recipient grouping

| Option | Pros | Cons |
|---|---|---|
| **C1. One email per lead; CC = union of the coordinators and MELIA of all SPs in that lead's list** ✅ | One email per person, as agreed | A coordinator can appear in CC of several leads' emails. That is expected |
| C2. One email per (lead, SP) | Cleaner CC | More emails per lead, against what was agreed |

## 10. Recommended Approach

**A1 + B1 + C1.** It is the smallest safe path that gives PMU control of the dates inside the 1-week commitment.

- A `replicated_innovation_reminder_campaign` table (`phase_id`, `kind` = `Q4_NOTICE | FINAL_REMINDER`, `scheduled_at`, `sent_at`, `status`, audit columns) and a `replicated_innovation_reminder_log` table (`campaign_id`, `recipient_email`, `result_ids`, `sent_at`, with UNIQUE(`campaign_id`, `recipient_email`)).
- One `dispatch(campaignId, { dryRun })` service:
  1. claim the campaign (status `SENDING`) so overlapping runs cannot both send;
  2. query the pending innovations;
  3. group them by lead;
  4. render the template;
  5. `sendEmail` per lead, inserting the log row before the emit;
  6. mark the campaign `SENT` with counts.
- A daily cron (`@Cron` with a name, logging start, finish and outcome, as `webhook-dispatch.cron.ts` does) calls `dispatch` for due campaigns. **Send now** calls the same method.
- The two templates are new rows in `template`, inserted by migration with bound parameters (lesson from `submissions/CLAUDE.md`: no doubled `''`).
- The client admin page shows campaigns, the dry-run preview, Send now, and the list of unreachable leads.

## 11. Risks, Dependencies, And Open Questions

| ID | Item | Mitigation / owner |
|---|---|---|
| RK-1 | ~~Prod runtime: does `@Cron` fire?~~ **Resolved 2026-10-19 (Cristian):** PRTest runs in Docker and PROD runs under PM2. Both processes are long-lived, so `@Cron` runs normally. Lambda is not involved | No action |
| RK-1b | **PROD has 2 backend servers behind Apache, so every cron fires twice** | The campaign claim MUST be an atomic DB update (`UPDATE … SET status='SENDING' WHERE id=? AND status='PENDING'`, and only the server that gets `affectedRows = 1` sends). The send log's UNIQUE(`campaign_id`, `recipient_email`) is the second guard. An in-memory lock is not enough |
| RK-1c | **The servers run on UTC** (Colombia is UTC−5) | Store `scheduled_at` in UTC, and have the UI show it and take input in the admin's local time with an explicit label. The cron runs hourly, so a campaign fires within the hour of its date and time, not at a single fixed daily hour |
| RK-2 | **The local stack writes to shared `prdb` and uses the prod mailer.** A test send would email real leads. Whether PRTest has a mail sandbox is unknown | Ask Juanda how mail behaves in PRTest (`IS_PRODUCTION=false` there and `true` in PROD). Dry-run first. Outside production every subject carries `[PRMS Testing]`, and recipients outside production are overridden to the tester's address (to be specified). Never press Send now in browser checks |
| RK-3 | **SMTP limits are unknown:** the institutional SMTP server, per minute, per day, and recipients per message including CC. Cristian asked for an Infra/Networks ticket | Open the Infra ticket (DEP-3). Meanwhile, design for throttled emits (batch size and pause as config) and measure the real recipient and CC counts with the dry-run |
| DEP-3 | Infra/Networks answer on the SMTP limits | It does not block development, but it does block the first real send |
| DEP-4 | Juanda confirms how mail behaves in PRTest (real recipients or sandbox) | Blocks the PRTest smoke test |
| RK-4 | The Lead Contact Person is free text on older results | R7 list. PMU follows those up by hand (agreed) |
| DEP-1 | **The MELIA focal points list** (user providing it) | Blocks the B1 seed, not the rest of the work |
| DEP-2 | Nicoleta reviews the email copy (Q4 notice and final reminder) | Draft at specify; she approves before the first send |
| OQ-1 | Should "primary SP" for CC be the owner initiative (`results_by_inititiatives`, `initiative_role_id = 1`)? Or also the contributing ones? | Proposal: owner only |
| OQ-2 | Include bilateral (`source = 'API'`) innovations? They start in Pending Review, so the Editing filter almost always excludes them | Proposal: exclude explicitly |
| OQ-3 | Does "Innovation Use" include IPSR (type 10)? | Proposal: no, type 2 only, as asked |
| OQ-4 | Should a lead be able to opt out via notification settings? | Proposal: no, because it is a compliance reminder |
| OQ-5 | Should the final reminder include only results still in Editing at that moment? | Yes. The query runs at dispatch time, not when the campaign is created |

## 12. Success Criteria

- The dry-run against the active phase returns the same set as a hand-written SQL check: types 2 and 7, `is_replicated = 1`, status 1, active.
- Each lead receives exactly one email per campaign. A second dispatch of the same campaign sends zero emails.
- The CC holds only coordinators and MELIA, never leads, co-leads or directors.
- A non-admin user gets 403 on every endpoint.
- Nicoleta can schedule and send the Q4 campaign herself with no developer involved.
- Delivered within the 1-week commitment.

## 13. Next Step

```text
/akili-specify changes/replicated-innovation-reminders
```
