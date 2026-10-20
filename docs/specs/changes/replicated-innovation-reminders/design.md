# Design — Replicated innovation reminders

## Document Control

| Field | Value |
|---|---|
| Spec path | `changes/replicated-innovation-reminders` |
| Requirements | [`requirements.md`](./requirements.md) (RIR-R-1..15) |
| Depth | Full |
| Status | approved (2026-10-19) |
| Code research | Delegated to an Explore scout (2026-10-19); findings cited in §1A |
| Date | 2026-10-19 |

## 1. Summary

The feature is a new server module `api/replicated-innovation-reminders/`. It owns three things:

- two tables: **campaign** and **send log**;
- one dispatcher, reached from an hourly cron and from an admin "send now" endpoint;
- a read-only query for the pending replicated innovations.

The digests reuse the existing `template` table and handlebars rendering, and they go out through the RabbitMQ `EMAIL_QUEUE` via `EmailNotificationManagementService`. On the client, a standalone Spartan component is embedded in Admin → Phase management → Reporting.

The main constraint: PROD runs **two PM2 servers**, so every cron fires twice. Exactly-once delivery is therefore enforced in MySQL, with a status-guarded claim plus a UNIQUE send log, and never in process memory.

Cross-refs: `docs/prd.md` (G2, AC-3, AC-5, AC-8, AC-9) · `docs/trd/trd.md` (versioning, results, email microservice) · `docs/ux-ui/design.md` (admin section).

## 1A. Premise Ledger

| # | Premise | Source of truth | How verified | Status | If false |
|---|---|---|---|---|---|
| RIR-P-1 | `@Cron` fires in PRTest (Docker) and PROD (PM2, 2 servers, UTC) | Cristian, Slack 2026-10-19 | Written answer | verified | Send now remains the only trigger; drop T-5's cron |
| RIR-P-2 | Owner SP = `results_by_inititiative.initiative_role_id = 1 AND is_active = 1` | `bilateral.service.ts:1051` | Quoted predicate | verified | CC builder needs a different owner predicate |
| RIR-P-3 | Coordinator = `role_by_user.role = 5` with `initiative_id` and `active` | Migration `1664370914432-rolesInserts.ts` + `RoleEnum` | Insert order Admin..Coordinator = 5 | verified | Look up the role id by name |
| RIR-P-4 | The lead's email = `ad_users.mail` via `results.lead_contact_person_id`, with the AD user `is_active` | `submissions.service.ts:591` | Same lookup already in production | verified | The unreachable rule changes |
| RIR-P-5 | Bilateral results have `source = 'API'` | `result.entity.ts:51` `SourceEnum.Bilateral = 'API'` | Read the enum | verified | Bilateral exclusion predicate changes |
| RIR-P-6 | Active Reporting phase = `VersioningService.$_findActivePhase(AppModuleIdEnum.REPORTING)` | `versioning.service.ts:151` | Read: `status=true, is_active=true, app_module_id` | verified | Phase resolution changes |
| RIR-P-7 | A status-guarded `UPDATE … WHERE status IN (…)` is a safe claim on this MySQL | `webhook-delivery.repository.ts:83-123` | Already in production with the same 2-server topology | verified | Use `SELECT … FOR UPDATE` in a transaction |
| RIR-P-8 | Replicated copies start in Editing (status 1) in the new phase | `versioning.service.ts` replicate path | **Not verified** in data | assumed (§13) | If copies start in another status, R-1 selects nothing; adjust the status predicate |
| RIR-P-9 | The pending volume is hundreds of results, not tens of thousands | Domain knowledge | Not counted | assumed (§13) | The preview needs paging; the batch defaults change |
| RIR-P-10 | `EmailNotificationManagementService.sendEmail` is fire-and-forget (`emit`) and gives no delivery ack | `email-notification-management.service.ts:29` | Read | verified | — (this shapes DD-2: at-most-once) |

## 2. Architecture Overview

### 2.1 Where this lives

| Layer | Touched |
|---|---|
| Server | **new** `api/replicated-innovation-reminders/` (module, controller, service, dispatcher, cron, repositories, entities, dto), registered in `app.module.ts` + `api/modules.routes.ts` · `shared/microservices/email-notification-management/enum` (+2 `EmailTemplate` values) · `migrations/` (1 file) |
| Server, read-only | `Result`, `results_by_inititiative`, `clarisa_initiatives`, `role_by_user`, `users`, `ad_users`, `version`, `template`, `global_parameters` |
| Client | **new** standalone component under `pages/admin-section/pages/phase-management/components/replicated-innovation-reminders/` · `reporting.module.ts` / `reporting.component.html` (embed) · `shared/services/api/results-api.service.ts` (+API methods) · `internationalization/` (copy) |
| External | RabbitMQ `EMAIL_QUEUE` → email microservice → institutional SMTP |

### 2.2 Flows

```
Hourly cron (both PROD servers)        Admin "Send now"
  └─ dispatcher.dispatchDue()            └─ POST …/campaigns/:id/send
       for each due campaign ──────────────────┐
                                               ▼
               dispatcher.dispatch(campaignId, { dryRun:false })
                 1. CLAIM: UPDATE campaign SET status=SENDING
                    WHERE id=? AND status IN (PENDING, FAILED)
                    → affected=0 ⇒ another instance owns it: return
                 2. pending = repo.findPending(activePhase)            (R-1)
                 3. digests = builder.group(pending)  To=lead, CC=coord+MELIA (R-2,R-3,R-4)
                 4. if !IS_PRODUCTION ⇒ redirect To=testEmail, CC=[]    (R-12)
                 5. for each batch (size N, pause P):                   (R-14)
                      INSERT log(campaign_id, recipient_email) — UNIQUE
                        dup ⇒ skip (already sent)                       (R-8)
                      render template → sendEmail()
                 6. UPDATE campaign SET status=SENT|FAILED, sent_at, counts

Preview: GET …/campaigns/:id/preview → steps 2–3 only, no claim, no log, no send (R-9)
```

## 3. Data Model Changes

### 3.1 Entities (new)

**`replicated_innovation_reminder_campaign`** (`ReplicatedInnovationReminderCampaign`, extends `BaseEntity` for the audit columns)

| Column | Type | Notes |
|---|---|---|
| `id` | bigint PK auto | |
| `version_id` | bigint FK → `version.id`, NOT NULL | the phase |
| `kind` | varchar(20) NOT NULL | `Q4_NOTICE` \| `FINAL_REMINDER` |
| `scheduled_at` | datetime NOT NULL | **UTC** |
| `status` | varchar(20) NOT NULL default `PENDING` | `PENDING` \| `SENDING` \| `SENT` \| `FAILED` \| `CANCELLED` |
| `claimed_at` | datetime NULL | used to release stale claims |
| `sent_at` | datetime NULL | |
| `sent_count`, `skipped_count`, `failed_count`, `unreachable_count` | int NOT NULL default 0 | |
| `last_error` | varchar(500) NULL | a short message only, no addresses |
| `is_active`, `created_*`, `last_updated_*` | from `BaseEntity` | |
| Index | (`status`, `scheduled_at`) | for the due-campaign scan |

"One non-cancelled campaign per kind per phase" (R-5) is enforced in the service, because MySQL has no partial unique index. The check-then-insert race needs two admins creating the same campaign in the same second; that is accepted (§13).

**`replicated_innovation_reminder_log`** (`ReplicatedInnovationReminderLog`)

| Column | Type | Notes |
|---|---|---|
| `id` | bigint PK auto | |
| `campaign_id` | bigint FK → campaign, NOT NULL | |
| `recipient_email` | varchar(150) NOT NULL | lower-cased, trimmed; the *intended* lead, even when redirected |
| `result_ids` | text NOT NULL | comma-separated ids listed in the digest |
| `cc_count` | int NOT NULL | |
| `redirected` | tinyint NOT NULL | 1 when sent to the non-prod test address |
| `created_date` | datetime default now | |
| **UNIQUE** | (`campaign_id`, `recipient_email`) | the R-8 guard |

**`initiative_melia_focal_point`** (`InitiativeMeliaFocalPoint`, extends `BaseEntity`)

| Column | Type | Notes |
|---|---|---|
| `id` | bigint PK auto | |
| `initiative_id` | int FK → `clarisa_initiatives.id`, NOT NULL | |
| `name` | varchar(200) NULL | |
| `email` | varchar(150) NOT NULL | |
| `is_active` + audit | `BaseEntity` | |
| UNIQUE | (`initiative_id`, `email`) | |

### 3.2 Migrations

| File | Contents | Down |
|---|---|---|
| `<ts>-RIR-CreateReminderTables.ts` | 3 tables · 2 `template` rows (`email_template_replicated_innovation_q4_notice`, `email_template_replicated_innovation_final_reminder`), inserted with bound params and `WHERE NOT EXISTS`, following `1788446000000-AddIpEmailTemplates2026.ts` · 4 `global_parameters` rows in `platform_global_variables`: `rir_test_recipient_email` (''), `rir_batch_size` ('25'), `rir_batch_pause_ms` ('2000'), `rir_stale_sending_minutes` ('60') | Drop the 3 tables, delete the 2 templates and the 4 params by name |
| `<ts>-RIR-SeedMeliaFocalPoints.ts` | MELIA rows from the user's list; `initiative_id` resolved by `official_code` with an INSERT … SELECT, so no hard-coded ids | Delete the seeded rows by (`initiative_id`, `email`) |

The seed is a separate migration because it is blocked on DEP-1 and must not hold up the rest. Jenkins applies migrations automatically (server `CLAUDE.md` §5).

### 3.3 External data

There is no CLARISA change. MELIA is local data, not a CLARISA catalogue.

## 4. API Surface

Mount `/api/replicated-innovation-reminders`. JWT is required (default middleware). **Every route** carries `@Roles(RoleEnum.ADMIN, RoleTypeEnum.APPLICATION)` + `@UseGuards(ValidRoleGuard)` (pattern `admin-panel.controller.ts:141-143`) and the `ResponseInterceptor` envelope.

| Method + path | Request DTO | Response | Errors | Req |
|---|---|---|---|---|
| `GET /campaigns` | — | `{ phase: {id, phase_name, phase_year}, campaigns: CampaignView[], pending_total, unreachable_total }` for the active Reporting phase | 404 when there is no active phase | R-5, R-15 |
| `POST /campaigns` | `CreateCampaignDto { kind: enum, scheduled_at: ISO-8601 UTC, must be in the future }` | `CampaignView` | 400 bad kind/date · 409 duplicate kind | R-5 |
| `PATCH /campaigns/:id` | `UpdateCampaignDto { scheduled_at }` | `CampaignView` | 404 · 409 not `PENDING` | R-5 |
| `PATCH /campaigns/:id/cancel` | — | `CampaignView` | 404 · 409 not `PENDING` | R-5 |
| `GET /campaigns/:id/preview` | — | `PreviewView { digests: [{to, cc[], results[]}], totals {leads, results, cc_addresses}, unreachable[], redirected_to? }` | 404 · 409 not `PENDING`/`FAILED` | R-9, R-4 |
| `POST /campaigns/:id/send` | — | `DispatchOutcome { status, sent, skipped, failed, unreachable }` | 404 · 409 already `SENDING`/`SENT`/`CANCELLED` · 412 non-prod without a test address | R-7, R-12 |

`:id` uses `ParseIntPipe`. `CampaignView` carries `scheduled_at` in UTC; the client converts it for display. No address ever goes into a log line.

There is no bilateral or platform-report impact.

## 5. Server Workflow / Business Rules

- **`PendingInnovationRepository.findPending(versionId)`**: one parameterised SQL statement.
  - Joins: `result r` → owner `results_by_inititiative` (role 1, active) → `clarisa_initiatives` (code / short name) → LEFT `ad_users` on `lead_contact_person_id` with `is_active = 1`.
  - Filters: `r.version_id = ?`, `r.result_type_id IN (2, 7)`, `r.is_replicated = 1`, `r.status_id = 1`, `r.is_active = 1`, `r.source <> 'API'`.
  - Returns flat rows: result id, code, title, type, `version_id`, initiative id / code / short name, lead mail, lead display name, free-text `lead_contact_person`.
- **`findCcByInitiatives(initiativeIds[])`**: the UNION of
  - coordinators (`role_by_user` role 5, `active = 1`, joined to `users` with `active = 1` → email), and
  - MELIA (`initiative_melia_focal_point` with `is_active = 1`),
  
  keyed by initiative.
- **`DigestBuilder`** (pure, no I/O, fully unit-testable):
  - Rows without a mail go to `unreachable`.
  - The rest are grouped by lower-cased mail into a digest.
  - CC = the deduplicated union across the digest's initiatives, minus the To address.
  - Results are ordered by SP code, then result code.
- **`ReminderDispatcher`**:
  - `dispatchDue()`: releases stale `SENDING` claims older than `rir_stale_sending_minutes` (→ `FAILED`), then dispatches campaigns with status `PENDING` and `scheduled_at <= UTC now`, one at a time.
  - `dispatch(id, {dryRun})` follows the flow in §2.2. Per-digest failures are caught and counted; they never abort the loop. The final status is `SENT` when failed = 0 and `FAILED` otherwise.
  - **Retry**: Send now on a `FAILED` campaign re-claims it. The log's UNIQUE skips everyone already logged (R-8 retry scenario).
- **Non-prod redirect (R-12)**: when `env.IS_PRODUCTION !== 'true'`, To = `rir_test_recipient_email` and CC = []. The body gets an "Intended recipients" block. An empty param means 412 / `FAILED` with `last_error = 'test recipient not configured'`, and nothing is sent.
- **Rendering**:
  - The template is fetched with `TemplateRepository.findOne({ where: { name } })`. A missing row means `FAILED` with a clear `last_error` (never a crash), as in `WebhookAlertService`.
  - The template is compiled with handlebars once per dispatch.
  - Links use `${RESULTS_URL}${result_code}/general-information?phase=${version_id}`.
  - Subject: `${addLabel()} Reminder: replicated innovations pending update — ${phase_name}`; the final reminder says "Final reminder".
- **Cron**: `ReplicatedInnovationReminderCron`, `@Cron(CronExpression.EVERY_HOUR, { name: 'replicated-innovation-reminders' })`. It swallows and logs errors (pattern `webhook-dispatch.cron.ts`). Being idempotent, it is safe on both servers.
- **Transactions**: the claim is its own statement. Each log INSERT is autocommitted *before* its emit, giving at-most-once delivery: an emit that throws after its INSERT counts as `failed`, and that recipient is not retried automatically. This is the safe side for a reminder; see DD-2.

## 6. Frontend Plan

### 6.1 Routes / modules

There is no new route. `ReplicatedInnovationRemindersComponent` (standalone, `OnPush`, signals) is added to `ReportingModule.imports` and rendered in `reporting.component.html` below the two `app-other-functionalities` blocks (RIR-OQ-1 default). The Admin module guard already restricts the page; the server is the real gate.

### 6.2 Components & services

| Piece | Responsibility |
|---|---|
| `ReplicatedInnovationRemindersComponent` | Section header (phase name, pending total) · campaigns table · "Schedule" form per missing kind · per-row actions Preview / Edit date / Cancel / Send now |
| `ReminderPreviewDrawerComponent` | Totals, digests list (To, CC, results), unreachable table, redirect banner when non-prod |
| `results-api.service.ts` | `GET_reminderCampaigns`, `POST_reminderCampaign`, `PATCH_reminderCampaignDate`, `PATCH_reminderCampaignCancel`, `GET_reminderCampaignPreview`, `POST_reminderCampaignSend`. Base: `environment.apiBaseUrl + 'api/replicated-innovation-reminders/'` |
| State | Component-local signals; reload after each mutation |

### 6.3 Design system

- Spartan helm primitives already in the client: button, table, input, dialog / alert-dialog for the Send now confirmation (the confirmation states "N leads will receive an email"), sheet for the preview drawer, and badge for status.
- Dates are entered in the browser's local time and shown with a "(your local time; server runs UTC)" hint, then converted to UTC ISO before the POST.
- States: loading skeleton · empty ("No campaigns scheduled for this phase") · error toast · `SENDING` row with a spinner, actions disabled.
- Copy lives in `internationalization/replicated-innovation-reminders.copy.ts`. Buttons have labels and the confirmation dialog traps focus.
- Phone width is not a target, because the admin section is desktop-only. It should still not overflow at ≥ 1024 px.

### 6.4 Real-time

None. Email only (non-goal: in-app notifications).

## 7. Security & Authorization

- Admin-only on every route, at server level (R-10, AC-3).
- DTOs use `ValidationPipe({ whitelist: true, transform: true })`; `kind` is checked with `@IsIn`, and `scheduled_at` with `@IsISO8601` plus a future-date check in the service.
- Logs carry campaign id, counts and duration only. No emails, names, bodies or `RESULTS_URL` (AC-9, `.cursorrules`).
- PII at rest: the log stores recipient emails. That is acceptable (same class as `users` / `ad_users`) and is visible only to admins through the preview.

## 8. Performance & Capacity

- The pending query touches a few hundred rows in the active phase. The existing indexes on `result.version_id` and the `results_by_inititiative` FKs cover it. Target: preview < 10 s.
- Emission: with batch 25 and pause 2 s, 500 digests take ~40 s, well inside one cron tick. The values are tunable without a deploy once Infra answers (DEP-3).
- No new dependencies: `handlebars` is already present.

## 9. Observability

- `Logger(ReminderDispatcher.name)`:
  - `dispatch start campaign=<id> kind=<kind> phase=<versionId>`;
  - `dispatch end campaign=<id> status=<s> sent=<n> skipped=<n> failed=<n> unreachable=<n> ms=<t>`;
  - `claim lost campaign=<id>` at debug level;
  - a stale-claim release is a warning.
- Outcome counts persist on the campaign row (R-15).

## 10. Testing Plan

| Level | What |
|---|---|
| Unit (server) | `DigestBuilder`: grouping, CC union, To∉CC, unreachable split, ordering · dispatcher: claim lost → no send; log-duplicate → skip; per-digest failure → continue + `FAILED`; non-prod redirect; missing test address → refuse; missing template → `FAILED` · DTO validation · service rules (duplicate kind 409, frozen when not `PENDING`) |
| Repository (server) | SQL text asserts every predicate of R-1 (type IN, replicated, status 1, active, source, version) and owner role 1; CC query asserts role 5 + active flags |
| Controller (server) | Each route declares `@Roles(ADMIN, APPLICATION)` + `ValidRoleGuard` (metadata reflection) |
| Client (Jest) | Component: renders campaigns, empty state, disables actions while `SENDING`, converts local→UTC on create, confirmation shows the recipient count; API service URL/method |
| Live (HITL) | Dry run against `prdb` compared with a hand-written SQL count · PRTest send with redirect to the tester's address · real 403 as non-admin · rendered email reviewed by the user and Nicoleta |

All Jest runs use `--maxWorkers=2` and a `--testPathPattern` scoped to the touched files.

## 11. Backwards Compatibility & Rollout

- Purely additive: new tables, endpoints, templates and params. No existing row or contract changes.
- Rollout:
  1. Merge; Jenkins applies the migrations.
  2. Set `rir_test_recipient_email` on PRTest and smoke-test.
  3. Seed MELIA (DEP-1).
  4. The user and Nicoleta approve the rendered copy (DEP-2).
  5. Infra answers on SMTP limits (DEP-3) → tune the batch params.
  6. Nicoleta schedules the Q4 campaign.
- Rollback: cancel the pending campaigns (no deploy needed). The migration `down` drops everything. With no campaigns, the cron is a no-op.

## 12. Design Decisions

### RIR-DD-1: The campaign table drives both the cron and Send now

- **Context:** PMU must own the dates (R-5), and Send now must follow identical rules (R-7).
- **Decision:** One `dispatch(id)` with two callers. The cron only selects due campaigns.
- **Alternatives:** dates hard-coded in the cron (rejected: PMU cannot change them) · EventBridge (rejected: infra outside the repo; P-1 makes it unnecessary).
- **Consequences:** a pending campaign is dispatched within ≤ 60 min of its time (R-6).

### RIR-DD-2: Exactly-once in MySQL; at-most-once per recipient

- **Context:** 2 PROD servers fire every cron (P-1), and `sendEmail` gives no ack (P-10).
- **Decision:** a status-guarded claim UPDATE (P-7 pattern), plus the UNIQUE(`campaign_id`, `recipient_email`) log row written **before** each emit.
- **Alternatives:**
  - an in-memory lock (rejected: per-process);
  - log after emit (rejected: a crash between emit and log re-sends on retry, violating R-8);
  - `SELECT … FOR UPDATE` (workable, but the codebase already has the guarded-UPDATE pattern).
- **Consequences:** an emit failure after its log row is never auto-retried. It is counted as `failed` and visible; PMU can follow up. A duplicate reminder is worse than a missing one.

### RIR-DD-3: MELIA focal points as a dedicated table

- **Context:** MELIA is not a PRMS role (R-13).
- **Decision:** `initiative_melia_focal_point`, seeded by migration.
- **Alternatives:** a new role in `role` (rejected: `ValidRoleGuard` compares `userRole <= required`, so a new role id interacts with permission checks and client gates) · a JSON value in `global_parameters` (rejected: unvalidated, error-prone).
- **Consequences:** changes need SQL or a migration until an editing UI exists (§13).

### RIR-DD-4: Non-prod recipient redirect is mandatory

- **Context:** the local stack and PRTest can reach the real SMTP server (DEP-4 unknown). The memory "browser checks hit shared prdb" records that the local stack writes to the shared DB and the prod mailer.
- **Decision:** outside `IS_PRODUCTION=true`, send everything to `rir_test_recipient_email` with no CC; refuse when that param is empty.
- **Alternatives:** rely on `[PRMS Testing]` labels (rejected: real people still receive the mail).
- **Consequences:** the PRTest smoke cannot test the real CC delivery; the preview covers the content.

### RIR-DD-5: A separate module, not `admin-panel`

- **Context:** `admin-panel` is already large and owns user reports.
- **Decision:** a new `api/replicated-innovation-reminders/` module, owning its entities, cron and controller.
- **Alternatives:** add the routes to `admin-panel` (rejected: mixes a scheduled job into a report controller) · put it under `notification` (rejected: in-app semantics, user settings).

### RIR-DD-6: The UI is embedded in Phase management → Reporting

- **Context:** campaigns are per phase, and the replication action lives on that page (RIR-OQ-1 default).
- **Decision:** a standalone Spartan component imported into the NgModule-based `ReportingModule`.
- **Alternatives:** a new admin tab (more room, but loses the phase context). It is reversible: the component can be moved to its own tab without server changes.

### Step 2.3 reversion challenge

There are no reversions. No DD removes, disables or inverts any shipped behaviour: everything is additive, and existing templates and replication are untouched. The challenge is not applicable.

## 13. Open Gaps & Follow-ups

| Item | Handling |
|---|---|
| RIR-P-8: replicated copies start in Editing | Verify with a `prdb` count during T-2's HITL check before relying on it |
| RIR-P-9: volume | The dry run during T-2's HITL check gives the real counts |
| Duplicate-kind race (two admins in the same second) | Accepted; trivially fixable by cancelling one |
| MELIA editing UI | Deferred; SQL/migration until then |
| SMTP limits (DEP-3) | Tune `rir_batch_size` / `rir_batch_pause_ms`; no deploy needed |
| The emit has no delivery ack | Accepted (DD-2); failures are counted |

## 14. Budget (tripwire for `/akili-execute`)

| Measure | Estimate |
|---|---|
| Tasks | 8 |
| LOC | ~1,350 (server ~600 + tests ~300 · migrations incl. 2 HTML templates ~250 · client ~200) |
| Review rounds | 2 per task at most; 1 expected |

These match the **Full** depth declared in Phase 0, so the depth does not change.
