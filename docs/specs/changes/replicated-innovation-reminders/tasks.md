# Tasks — Replicated innovation reminders

## Document Control

| Field | Value |
|---|---|
| Spec path | `changes/replicated-innovation-reminders` |
| Linked | [`requirements.md`](./requirements.md) · [`design.md`](./design.md) · [`proposal.md`](./proposal.md) |
| Depth | Full |
| Ticket | INC-165323 |
| Status | in-progress |
| Budget (from design §14) | 8 tasks · ~1,350 LOC · ≤ 2 review rounds per task |
| Date | 2026-10-19 |

## 1. Pre-flight checklist

- [ ] The requirements and design are approved.
- [ ] RIR-OQ-1..5 defaults are accepted, or replaced by the user's answers.
- [ ] No in-flight spec touches `results` filters on `is_replicated`. Exception: `project_paa_replicated_innovations_2026` (INC-164073) is read-only on the same flag, so there is no conflict.
- [ ] Jest runs: `--maxWorkers=2` with a scoped `--testPathPattern`, one run at a time on this machine.

## 2. Task list

### RIR-T-1: Schema, templates and parameters migration + entities

- **Type:** db
- **Description:**
  - One migration creates `replicated_innovation_reminder_campaign`, `replicated_innovation_reminder_log` (UNIQUE `campaign_id, recipient_email`) and `initiative_melia_focal_point` (UNIQUE `initiative_id, email`).
  - It inserts the two `template` rows (bound params, `WHERE NOT EXISTS`, `created_by` via COALESCE as in `1788446000000`) and the four `global_parameters` rows (`rir_test_recipient_email`='', `rir_batch_size`='25', `rir_batch_pause_ms`='2000', `rir_stale_sending_minutes`='60').
  - TypeORM entities are added for the three tables, plus two `EmailTemplate` enum values.
  - The template HTML is a first draft for DEP-2 review.
- **Implements:**
  - RIR-R-5: storage for kind and date, and the status lifecycle.
  - RIR-R-8: the UNIQUE (`campaign_id`, `recipient_email`) clause.
  - RIR-R-11: "two distinct templates… new rows… existing rows MUST NOT be modified".
  - RIR-R-12: storage for the test address.
  - RIR-R-13: storage + active flag.
  - RIR-R-14: the batch params.
- **Files (expected):**
  - `onecgiar-pr-server/src/migrations/<ts>-RIR-CreateReminderTables.ts`
  - `onecgiar-pr-server/src/api/replicated-innovation-reminders/entities/*.entity.ts`
  - `onecgiar-pr-server/src/shared/microservices/email-notification-management/enum/email-notification.enum.ts`
- **Depends on:** —
- **Blocks:** T-2, T-4, T-5, T-7
- **Estimate:** M
- **Review:** full (migration)
- **Verification:**
  - **Falsifier:** on a local DB (not `prdb`), run `migration:run` then `migration:revert`. If any of these fails, the task fails:
    - the 3 tables exist after `up` and are gone after `down`;
    - inserting two log rows with the same (`campaign_id`, `recipient_email`) raises `ER_DUP_ENTRY`;
    - the existing `email_template_ip_experts_support*` rows are byte-identical before and after.
  - **Red run:** `npm run migration:check` fails while the entities have no migration and passes once it is added.
  - **Disqualifier:**
    - If `template.created_by` cannot be resolved without a hard-coded user id, stop and re-specify.
    - If the migration has to run against shared `prdb` to be verified, stop: hand the SQL to the user instead.
  - **Consumers:** `EmailTemplate` enum. The new values are additive; existing `switch (emailTemplate)` in `buildEmailData` keeps its `default: throw`, and the new values are lookup-only and never reach it.
- **Status:** [x] PASS 2026-10-19 — up verified on prdb (TEST), down accepted by review (see `execution.md`)
- **Definition of done:**
  - [x] Up and down verified, `migration:check` green.
  - [x] Template HTML has no doubled `''` (bound params; lesson from `submissions/CLAUDE.md`).
  - [x] Lint clean on the touched files.

### RIR-T-2: Pending-innovation and CC repository

- **Type:** server
- **Description:**
  - `PendingInnovationRepository.findPending(versionId)` and `findCcByInitiatives(ids)` are one parameterised SQL statement each, per design §5.
  - The HITL check, run by the user since it is DB-connected: a dry count on `prdb` validates P-8 and P-9.
- **Implements:**
  - RIR-R-1: every clause, i.e.
    - type IN (2, 7), replicated, status 1, active, active phase, `source <> 'API'`;
    - "MUST NOT include results from any phase other than the active Reporting phase";
    - "BUT it must NOT include C, D, E, F".
  - RIR-R-3: "coordinators and active MELIA" and "MUST NOT include SP leads, co-leads, directors"; the query selects role 5 only.
  - RIR-R-4: the data side (lead mail NULL ⇒ row still returned with the free-text contact).
- **Files (expected):** `api/replicated-innovation-reminders/repositories/pending-innovation.repository.ts` + `.spec.ts`
- **Depends on:** T-1
- **Blocks:** T-4
- **Estimate:** M
- **Review:** full
- **Verification:**
  - **Falsifier:**
    - The spec asserts that the SQL text contains each predicate: `result_type_id IN`, `is_replicated = 1`, `status_id = 1`, `r.is_active = 1`, `source <> 'API'`, `version_id = ?`, `initiative_role_id = 1`, `role = 5`, and the MELIA `is_active = 1`.
    - Removing any single predicate must turn a test red.
    - Bound params are asserted; no interpolation.
  - **What the presence-assertion cannot prove:** that the predicates select the right rows on real data. The behavioural proof is the HITL step: the user runs the repository's SQL on `prdb` for the active phase. A count of 0, or a count matching every replicated innovation in any status, means the predicate is wrong.
  - **Red run:** `npx jest --maxWorkers=2 --testPathPattern=replicated-innovation-reminders/repositories`
  - **Disqualifier:** if the `prdb` check shows replicated copies do not start in status 1 (P-8 refuted), stop and re-specify R-1 with the user and Nicoleta.
  - **Consumers:** none (no shared symbol changed)
- **Status:** [x] PASS 2026-10-19 — HITL counts on TEST and PROD recorded; pivot withdrawn (PROD: 461 leads / 1,125 results)
- **Definition of done:**
  - [x] Spec green.
  - [x] User-run `prdb` counts recorded in `execution.md`.

### RIR-T-3: DigestBuilder (pure)

- **Type:** server
- **Description:** a pure function from (pending rows, CC map) to { digests[], unreachable[] }: group by lower-cased lead mail; CC union across the digest's initiatives, deduplicated, minus To; order by SP code, then result code.
- **Implements:**
  - RIR-R-2: "exactly one email per lead", and "BUT it must NOT send L one email per result".
  - RIR-R-3: "CC union across SPs, each address once", and "AND IT MUST NOT list in CC an address that is already the To".
  - RIR-R-4: "excluded from the dispatch", "list every pending result with an unreachable lead".
- **Files (expected):** `api/replicated-innovation-reminders/digest-builder.ts` + `.spec.ts`
- **Depends on:** —, so it is **parallel-safe with T-1/T-2** (it uses its own row interface)
- **Blocks:** T-4
- **Estimate:** S
- **Review:** checklist
- **Verification:**
  - **Falsifier:** fixture with lead L, results A (SP01) and G (SP04), and a coordinator shared by SP01 and SP04, who is also L. The output must be exactly one digest with A and G, CC without L and with the shared coordinator once. Lead mails differing only in case must give one digest. A NULL mail must go to `unreachable`, not to a digest.
  - **Red run:** `npx jest --maxWorkers=2 --testPathPattern=digest-builder`
  - **Disqualifier:** if grouping needs DB access, the design is wrong: stop.
  - **Consumers:** none (no shared symbol changed)
- **Status:** [x] PASS 2026-10-19 (see `execution.md`)
- **Definition of done:**
  - [x] Spec green, with tdd red → green recorded.

### RIR-T-4: ReminderDispatcher

- **Type:** server
- **Description:**
  - `dispatch(id, {dryRun})` and `dispatchDue()`: status-guarded claim; stale-claim release; fetch pending → build digests; non-prod redirect with an "Intended recipients" block; refuse without a test address; batches with a pause from the global params; log INSERT before each `sendEmail`, where `ER_DUP_ENTRY` means skip; per-digest try/catch; final status SENT or FAILED with counts and a short `last_error`.
  - Template lookup and handlebars render; the subject includes `addLabel()`, the phase and the kind.
  - Logs carry counts and ids only.
- **Implements:**
  - RIR-R-1: the "Status is evaluated at dispatch" scenario (the query runs inside dispatch).
  - RIR-R-6: "dispatched and marked sent, with its counts".
  - RIR-R-7: "exactly the same rules" (a single code path).
  - RIR-R-8: both scenarios ("exactly one of them sends", and "BUT it must NOT email any of the first 40 again").
  - RIR-R-9: "MUST NOT send… write the send log or change status" (dryRun path).
  - RIR-R-11: subject identifies PRMS, phase and kind; `[PRMS Testing]` outside prod.
  - RIR-R-12: every clause, including "BUT it must NOT reach any real lead, coordinator or MELIA address" and "refuse to send" without a test address.
  - RIR-R-14.
  - NFR observability and the AC-9 no-PII logs.
- **Files (expected):** `api/replicated-innovation-reminders/reminder-dispatcher.service.ts` + `.spec.ts`, plus the campaign repository's claim/release methods
- **Depends on:** T-1, T-2, T-3
- **Blocks:** T-5
- **Estimate:** L
- **Review:** lenses (correctness-critical: concurrency + real email)
- **Verification:**
  - **Falsifier:** specs with a mocked repository and email service:
    - (a) claim `affected = 0` ⇒ `sendEmail` called 0 times;
    - (b) log insert throws `ER_DUP_ENTRY` for 40 of 100 digests ⇒ `sendEmail` called exactly 60 times;
    - (c) `sendEmail` throws on digest 3 ⇒ digests 4..n are still sent and the final status is FAILED with failed = 1;
    - (d) `IS_PRODUCTION='false'` ⇒ every call has `to=[testEmail]` and `cc=[]`;
    - (e) `IS_PRODUCTION='false'` with an empty test address ⇒ 0 sends and status FAILED;
    - (f) `dryRun` ⇒ 0 sends, 0 log inserts, 0 status updates;
    - (g) missing template ⇒ FAILED, no throw;
    - (h) the logger is never called with an `@` character.
  - **Red run:** `npx jest --maxWorkers=2 --testPathPattern=reminder-dispatcher`
  - **Disqualifier:**
    - If the guarded UPDATE cannot report `affected` on this TypeORM/MySQL driver, stop and switch to `SELECT … FOR UPDATE` per P-7's "if false".
    - If the batch pause makes a 500-digest run exceed 50 min at the default params, the defaults are wrong: report them, do not ship.
  - **Consumers:** `EmailNotificationManagementService.sendEmail` (called, unchanged); `TemplateRepository` (read only)
- **Status:** [x] PASS 2026-10-19 — 2 attempts, 55 tests green, 2 Reviewer PASS (see `execution.md`)
- **Definition of done:**
  - [x] All 8 falsifier specs green.
  - [x] No address appears in any log statement (grep the diff for `_logger` lines).

### RIR-T-5: Campaign service, controller, DTOs, cron, module wiring

- **Type:** server
- **Description:**
  - CRUD per design §4: list for the active phase, create (future UTC date, 409 on a duplicate non-cancelled kind), edit date, cancel (409 unless PENDING), preview (delegates to `dispatch` with dryRun), send (409 on a wrong status, 412 non-prod without a test address).
  - `@Roles(ADMIN, APPLICATION)` + `ValidRoleGuard` on every handler, `ResponseInterceptor`, Swagger, `ParseIntPipe`.
  - `ReplicatedInnovationReminderCron` runs hourly.
  - The module is registered in `app.module.ts` and `modules.routes.ts`.
- **Implements:**
  - RIR-R-5: both scenarios ("rejects it", "BUT it must NOT reject a FINAL_REMINDER", "Sent campaigns are frozen").
  - RIR-R-6: within one hour.
  - RIR-R-7: endpoint.
  - RIR-R-9: endpoint.
  - RIR-R-10: "server responds 403" and "no campaign is changed and no email is sent".
  - RIR-R-15: counts in `CampaignView`.
- **Files (expected):** `api/replicated-innovation-reminders/{module,controller,service,cron}.ts` + `dto/*` + specs · `app.module.ts` · `api/modules.routes.ts`
- **Depends on:** T-4
- **Blocks:** T-6, T-8
- **Estimate:** M
- **Review:** full (auth)
- **Verification:**
  - **Falsifier:**
    - A controller spec reflects the `roles` metadata and the guards on **every** handler; a handler missing the decorator turns the test red.
    - Service specs:
      - a duplicate `Q4_NOTICE` gives 409;
      - `FINAL_REMINDER` beside `Q4_NOTICE` gives 201;
      - editing or cancelling a SENT campaign gives 409;
      - a past `scheduled_at` gives 400.
    - The cron spec checks that it calls `dispatchDue` and swallows errors.
    - A module compile spec checks the DI graph.
  - **What reflection cannot prove:** that the guard really returns 403 at runtime. That is covered by T-8's live check.
  - **Red run:** `npx jest --maxWorkers=2 --testPathPattern=replicated-innovation-reminders`
  - **Disqualifier:** if `ValidRoleGuard` does not support `RoleTypeEnum.APPLICATION` on this route shape, stop. Do not invent a new guard.
  - **Consumers:** `app.module.ts` imports and `modules.routes.ts` (additive); existing bootstrap specs (`app.module.spec.ts`) must stay green, so run them in this task's pattern.
- **Status:** [x] PASS 2026-10-19 — 2 attempts, 113 tests green, 2 Reviewer PASS; no red run recorded (see `execution.md`)
- **Definition of done:**
  - [x] Specs green, Swagger tags present, lint clean on the touched files.

### RIR-T-6: Admin UI in Phase management → Reporting

- **Type:** client
- **Description:**
  - The API methods are added to `results-api.service.ts`.
  - `ReplicatedInnovationRemindersComponent` (standalone, OnPush, signals, Spartan) is embedded in `reporting.component.html` and imported in `ReportingModule`. It has:
    - a campaigns table with a status badge and counts;
    - a schedule form per missing kind, taking local time and converting to UTC;
    - Edit date / Cancel / Preview / Send now;
    - an alert dialog stating "N leads will receive an email";
    - a preview sheet showing the digests, the unreachable table and a redirect banner;
    - loading, empty and error states, and actions disabled while SENDING.
  - Copy goes in `internationalization/`. Load the `spartan` and `angular-developer` skills.
- **Implements:**
  - RIR-R-4: the UI list.
  - RIR-R-5: "entered and shown in the admin's local time with an explicit time-zone label".
  - RIR-R-7: "explicit confirmation that states the number of recipients".
  - RIR-R-9: the UI.
  - RIR-R-10: "only reachable inside the Admin module".
  - RIR-R-15: the UI.
- **Files (expected):** `onecgiar-pr-client/src/app/pages/admin-section/pages/phase-management/components/replicated-innovation-reminders/*` · `pages/reporting/reporting.{module.ts,component.html}` · `shared/services/api/results-api.service.ts` · `internationalization/replicated-innovation-reminders.copy.ts`
- **Depends on:** T-5 (contract). It can start from design §4 in parallel once the DTOs are frozen.
- **Blocks:** T-8
- **Estimate:** L
- **Review:** checklist
- **Verification:**
  - **Falsifier:** Jest specs:
    - an empty list renders the empty state;
    - a row with status SENDING has its Send now/Cancel disabled;
    - creating with local `2026-11-15T08:00` in UTC−5 POSTs `2026-11-15T13:00:00.000Z`;
    - the confirm dialog text contains the preview's lead count;
    - the API methods hit the exact URL and verb.
  - **Gap:** jsdom cannot judge layout. A visual check of the section at ≥ 1024 px happens at T-8's HITL step, and it must be read-only: no clicks on Send now in browser checks (memory: browser checks hit shared prdb).
  - **Red run:** `npm run test:local -- --testPathPattern=replicated-innovation-reminders`
  - **Disqualifier:** if `ReportingModule` cannot import a standalone component without breaking `reporting.component.spec.ts`, stop and move the UI to a standalone admin tab per DD-6's reversibility note, after asking the user.
  - **Consumers:**
    - `reporting.component.html/module` and its spec, plus `phase-management.component.spec.ts`: run them.
    - `results-api.service.ts` (additive methods): run its spec.
- **Status:** [x] PASS 2026-10-19 — 2 attempts (Review 1 FAIL: DST, contact column, sent-at), 379 tests green, Review 2 PASS (see `execution.md`)
- **Definition of done:**
  - [x] Specs green, including the existing reporting and results-api specs.
  - [x] Lint clean on the touched files.

### RIR-T-7: MELIA focal points seed

- **Type:** db
- **Description:** a migration seeding `initiative_melia_focal_point` from the user's list, with `initiative_id` resolved by `official_code` (INSERT … SELECT). The `down` deletes exactly those pairs. **Blocked on DEP-1.**
- **Implements:** RIR-R-13: "seeded from the list the user provides".
- **Files (expected):** `onecgiar-pr-server/src/migrations/<ts>-RIR-SeedMeliaFocalPoints.ts`
- **Depends on:** T-1 · DEP-1
- **Blocks:** T-8 (a real send needs MELIA)
- **Estimate:** S
- **Review:** checklist
- **Verification:**
  - **Falsifier:** after `up` on a local DB, `SELECT COUNT(*)` equals the number of list rows. If an `official_code` from the list does not exist in `clarisa_initiatives`, the migration must **fail loudly** (pre-check count), not silently insert fewer rows.
  - **Red run:** n/a (no test gate); the migration's up/down plus the count check is the gate.
  - **Disqualifier:** if the list gives SP names instead of codes and a name is ambiguous, stop and ask the user.
  - **Consumers:** none (no shared symbol changed)
- **Status:** [x] PASS 2026-10-19 — applied on prdb (TEST), 16 rows / 13 codes; down accepted by review (see `execution.md`)
- **Definition of done:**
  - [x] Up and down verified locally.
  - [x] The count matches the list.

### RIR-T-8: PRTest smoke + copy review (HITL)

- **Type:** rollout
- **Description:** the user runs these, as they need PRTest and real accounts:
  1. Set `rir_test_recipient_email` on PRTest.
  2. As a non-admin, call `GET /campaigns`: expect a **real 403**.
  3. As admin, create a Q4 campaign, preview it, and compare the counts with T-2's SQL.
  4. Send now: only the test address receives the mail, with "Intended recipients" shown.
  5. Wait one cron tick on a second campaign scheduled a few minutes ahead: it is sent exactly once.
  6. Forward the rendered email to Nicoleta for copy approval (DEP-2).
  7. Confirm the SMTP limits (DEP-3) before the first PROD send.
- **Implements:**
  - RIR-R-10: live 403.
  - RIR-R-12: live redirect.
  - RIR-R-6: live cron.
  - RIR-R-11: copy approval.
  - The defect-class rows "rendered email looks broken" and "real people emailed during testing".
- **Files (expected):** `docs/specs/changes/replicated-innovation-reminders/execution.md` (evidence only)
- **Depends on:** T-5, T-6, T-7 · DEP-2, DEP-3, DEP-4
- **Blocks:** —
- **Estimate:** S
- **Review:** checklist
- **Verification:**
  - **Falsifier:**
    - Any of these fails the task:
      - a non-admin gets anything other than 403;
      - any address other than the test address receives mail;
      - the cron campaign arrives twice, or not within 60 min.
    - The preview counts must equal T-2's SQL counts.
  - **Red run:** n/a (no test gate)
  - **Disqualifier:** if PRTest is not on the commit under test (memory: PRTest deploys performance-refactor), the evidence is void, so re-deploy first.
  - **Consumers:** none (no shared symbol changed)
- **Definition of done:**
  - [ ] Evidence for each of the 7 steps recorded in `execution.md`.
  - [ ] Nicoleta's approval of the copy recorded.

## 3. Dependency graph

```
RIR-T-1 ──► RIR-T-2 ──┐
RIR-T-3 (parallel) ───┴─► RIR-T-4 ──► RIR-T-5 ──► RIR-T-6 ──┐
RIR-T-1 ──► RIR-T-7 (blocked: DEP-1 MELIA list) ────────────┴─► RIR-T-8 (HITL)
```

Parallel-safe: T-3 alongside T-1/T-2. T-7 at any time after T-1, once the list arrives. T-6 can start from the frozen DTO contract while T-5 is in review.

## 4. Test plan / clause coverage

| Requirement clause | Task | Test |
|---|---|---|
| R-1 predicates and "BUT must NOT include C,D,E,F" | T-2 | repository spec + `prdb` HITL count |
| R-1 "MUST NOT include other phases" | T-2 | `version_id = ?` assertion |
| R-1 "status evaluated at dispatch" | T-4 | dispatcher fetches pending inside `dispatch` (spec f / call order) |
| R-2 one digest; "must NOT one per result" | T-3 | builder spec |
| R-3 CC union, dedup; "MUST NOT include lead/co-lead" | T-2 (role 5 only), T-3 (union) | repository + builder specs |
| R-3 "MUST NOT list To in CC" | T-3 | builder spec |
| R-4 exclude + list | T-3 (split), T-2 (data), T-6 (UI) | builder spec, UI spec |
| R-5 duplicate kind 409; "must NOT reject FINAL_REMINDER"; frozen when sent | T-5 | service spec |
| R-5 local time + TZ label | T-6 | UI spec (UTC conversion) |
| R-6 within 1 h | T-5 (hourly cron), T-8 | cron spec + live |
| R-7 same rules + confirmation with count | T-4 (single path), T-6 (dialog) | dispatcher + UI specs |
| R-8 two servers; retry "must NOT email first 40 again" | T-1 (UNIQUE), T-4 (claim, dup-skip) | migration check + dispatcher specs a/b |
| R-9 no send / log / status change | T-4 | dispatcher spec f |
| R-10 403 + nothing changed | T-5 (metadata), T-8 (live) | controller spec + live |
| R-11 new rows, untouched old rows, subject label | T-1, T-4 | migration check + dispatcher spec |
| R-12 redirect; "must NOT reach real addresses"; refuse without test address | T-4, T-8 | dispatcher specs d/e + live |
| R-13 storage, inactive excluded, seed | T-1, T-2, T-7 | migration + repository spec + seed count |
| R-14 batches | T-4 | dispatcher spec |
| R-15 outcome visibility | T-5, T-6 | service + UI specs |

## 5. Rollout & verification

- [ ] Commits use `✨ feat(replicated-innovation-reminders) [INC-165323]: …`, with no apostrophes in the subject. They are made only on the user's go-ahead, and `src/a.py` is never staged.
- [ ] CI green: lint, tests, build, `migration:check:ci`, SonarCloud.
- [ ] T-8 HITL evidence is complete before Nicoleta schedules the Q4 campaign.

## 6. Roll-back plan

1. Cancel all `PENDING` campaigns from the UI. This stops every send without a deploy.
2. Revert the PR(s).
3. `npm run migration:revert` ×2: the seed first, then the schema.
4. No downstream consumers to notify. The feature is internal.
