# Design — Bilateral AI Processing Queue: Two Fair Lanes and the "AI processes" Drawer

## Document Control

| Field | Value |
|---|---|
| **Spec Path** | `docs/specs/bilateral/ai-processing-queue/` |
| **Requirements** | `requirements.md` (`AIQ-R-*`) |
| **Depth** | Full (confirmed by the Budget, §14) |
| **Approval Mode** | gated |
| **Status** | approved (gated, 2026-09-29) |
| **Verified at** | commit `b3aebb013` (branch `JuanGuzman-io/p2-3853-jira-understanding`, contains all of `performance-refactor`) |
| **Exploration** | Two delegated read-only scouts (server, client) returned citations as run; the architect spot-checked `HlmDialogService` and `fonts.scss` inline |
| **Visual reference** | `mockup/ai-processes-drawer.html`. Its tokens are the light values of `colors.scss`. The mockup uses Poppins; the app font is **Manrope** (`onecgiar-pr-client/src/styles/fonts.scss:2-5`), and implementation uses the app font |
| **Kaizen lessons applied** | `bilateral--ai-processing-feedback` L1 (§6.5, §10), L2 (§6.3), L3 (§5.4, §10) |
| **Requirements amended during this phase** | `AIQ-R-5` C (real auth model), `AIQ-R-6` A (`starting`), `AIQ-R-7` B (wizard stays unlocked), `AIQ-R-9` D (drafts deep link), `AIQ-R-10` A (trigger on the create wizard): all forced by premises P-9, P-12, P-15, P-16 |

---

## 1. Summary

Every RMQ message becomes a **"run job X" request that is honoured only if X is the oldest eligible job**. Under a MySQL named lock, the handler counts running jobs and either claims X, or parks X and re-publishes the oldest eligible job instead. Fair order and both caps therefore live in the database, which is correct for any number of API containers and harmless to duplicated or lost messages. The sweeper already runs every minute; it becomes the safety net that re-publishes eligible jobs.

On the client, the single-job state in `BilateralAiService` is replaced by a **job list** fed by one new endpoint (`GET center/ai/jobs`) on one poll. The upload form never gives way to a panel. A new **"AI processes" drawer**, opened by a header trigger that replaces the chip, is the single surface for every job. Completion becomes a toast plus a badge, so the app-wide completion dialog and the inline processing panel are retired.

Accepted trade-off: a job that is not the oldest eligible is redirected by publishing the right job's id. That costs one extra broker hop, while retries keep today's `nack`-requeue unchanged (DD-3).

---

## 1A. Premise Ledger

**Count:** 23 verified · 3 `UNVERIFIED` (High 1, Low 2).
**Blast-radius triggers fired:** `live-path` (submit → dispatch chain, P-1), `shared-state` (`BilateralAiService` job members, P-12; `PrToastService`, P-15; the header chip, P-16), `consumer` (the `GET jobs/:jobId` response, the retired selectors and the localStorage key, P-22).

| # | Claim | Class | Citation (as run) | Verified at | If false | Settled by |
|---|---|---|---|---|---|---|
| P-1 | Submit reaches dispatch as: upload `onSubmit` → `POST_bilateralAiJob` → `createJob` saves `PENDING` and calls `queue.publish({jobId})` → consumer `@EventPattern` → `processJob` → `attemptStart` | `live-path` | `bilateral-ai-upload.component.ts:579-628`; `bilateral-api.service.ts:239-241`; `bilateral-ai.service.ts:139,162`; `bilateral-ai.consumer.ts:13-24`; `bilateral-ai.service.ts:787-800` | `b3aebb013` | DD-1's claim point moves — **High** | — |
| P-2 | `attemptStart` claims with a conditional update: `{job_id, status: PENDING}`, or `{job_id, status: PROCESSING, retrying: true}` for a retry; sets `PROCESSING`, `stage=uploading`, `attempts+1`, `retrying=false`, `started_date` in DB time; returns `affected > 0` | `existence` | `bilateral-ai.service.ts:717-747` | `b3aebb013` | Duplicate starts become possible — DD-1 needs its own guard — **High** | — |
| P-3 | When `processJob` returns without throwing (not found, already `COMPLETED`, `attemptStart` 0 rows, 4xx `FAILED`), the consumer **acks** | `existence` | `bilateral-ai.consumer.ts:23-24`; `bilateral-ai.service.ts:789,792-800` | `b3aebb013` | Parking by early return would requeue forever — DD-1 changes — **High** | — |
| P-4 | A retryable failure below the ceiling writes `retrying=true, stage=queued` scoped to `PROCESSING` and rethrows; the consumer then `nack`-requeues if `attempts < max` | `existence` | `bilateral-ai.service.ts:894-904`; `bilateral-ai.consumer.ts:26-33` | `b3aebb013` | DD-3 is unnecessary — **Low** | — |
| P-5 | Terminal writes: success `COMPLETED` (unscoped, for late completion) + `notifyTerminal`; final failure `FAILED` scoped to `PROCESSING` + notify; `createJob`/`retryJob` `QUEUE_NOT_AVAILABLE` without notify; sweeper `TIMED_OUT` and `QUEUE_STALLED` + notify | `location` | `bilateral-ai.service.ts:865-884,907-926,164-169,309-314`; `bilateral-ai-sweeper.cron.ts:99-118,156-173` | `b3aebb013` | A re-dispatch hook is missed on some terminal path — **High** | — |
| P-6 | Sweeper runs `EVERY_MINUTE`; the stall rule flips the oldest `PENDING` older than the window only if no row shows `started_date`/`stage_updated_date` inside the window; its comment assumes `prefetchCount: 1` | `existence` | `bilateral-ai-sweeper.cron.ts:52,124-126,132-165` | `b3aebb013` | DD-5's stall change differs — **Low** | — |
| P-7 | `queue_entry_date` is a STORED generated column `COALESCE(retried_date, created_date)`; indexes exist on `(status, queue_entry_date)`, `(status, started_date)`, `(user_id, status)` | `data-env` | `bilateral-ai-job.entity.ts:128-137`; `migrations/1788760000000-AddBilateralAiJobStage.ts:47-62`; `migrations/1784921546787-CreateBilateralAiTables.ts:30-31` | `b3aebb013` | The fair-order and count queries need a migration — §3 changes — **High** | — |
| P-8 | Nothing under `api/bilateral-ai` uses a DataSource, transaction or lock; no `GET_LOCK` exists in the server | `existence` | `grep -rnE "DataSource\|EntityManager\|transaction\|queryRunner" src/api/bilateral-ai` → 0; `grep -rniE "GET_LOCK\|RELEASE_LOCK" src` → 0 (scout, `onecgiar-pr-server/`) | `b3aebb013` | An existing lock helper should be reused instead — **Low** | — |
| P-9 | Controller is `@Controller('center/ai')` mounted under `bilateral`, **no guards**; the caller comes from `@UserToken()`, which returns `req.user` or decodes the `auth` header **without verifying** (`id: 0` when absent); `/api/bilateral` is a JWT-middleware public route | `data-env` | `bilateral-ai.controller.ts:24-26`; `api/modules.routes.ts:92`; `shared/decorators/user-token.decorator.ts:4-25`; `auth/Middlewares/jwt.middleware.ts:24,38-57` | `b3aebb013` | `AIQ-R-5` C would be satisfied by the framework — requirement amended — **Low** | — |
| P-10 | No `GET jobs` list route exists; a bare `GET jobs` does not collide with `jobs/:jobId`, but any `GET jobs/<literal>` would (proven for `jobs/expectations`) | `existence` | `bilateral-ai.controller.ts:30-130`; `bilateral-ai.controller.spec.ts:242-308` | `b3aebb013` | Route must move — §4 changes — **Low** | — |
| P-11 | `getJob` returns `{...entity, queue_position, max_attempts}`; the DTO file is not wired in | `existence` | `bilateral-ai.service.ts:186-214`; `dto/bilateral-ai-job-response.dto.ts:3-10` | `b3aebb013` | Additive fields need a DTO change first — **Low** | — |
| P-12 | `BilateralAiService` job members and every non-spec reader: `uploadState` (header :59, upload :63/:123/html, creator :383 `isAiProcessing` locks wizard steps), `currentJob` (header :104, upload :66/:142/html :338), `currentJobId` (upload :168), `getActiveJobSnapshot` (header :62, upload :71), `startJob` (upload :169/:619), `retryJob` (upload :210), `setPanelVisible` (upload :163/:174), `completionNotice` (dialog :30), `dismissCompletionNotice`/`openDraftsFromNotice` (dialog :114/:118), `setUploadStatus` (upload :596/:624), `clearUploadState` (upload :633, creator :670) | `shared-state` | Scout grep `\b(uploadState\|currentJobId\|…\|expectations)\b` over `src cypress` `--include=*.ts,*.html`, non-spec hits as listed | `b3aebb013` | A reader is missed and breaks at compile or runtime — **High** | — |
| P-13 | The upload component renders the form only for `idle`/`uploading` and the panel for every other status; it is hosted by the creator (`html:35`) and the manual-create drawer host (`html:99`, mounted in the creator and in `bilateral-projects-panel`) | `location` | `bilateral-ai-upload.component.html:1,329-347`; `bilateral-result-creator.component.html:35`; `bilateral-manual-create-drawer-host.component.html:99`; `bilateral-projects-panel.component.html:448` | `b3aebb013` | Never-block change misses a host — **High** | — |
| P-14 | `ai-processing-panel` is mounted only by the upload component | `consumer` | `grep -rn "app-ai-processing-panel\|AiProcessingPanelComponent" onecgiar-pr-client/src --include='*.html' --include='*.ts' \| grep -v ai-processing-panel/` → mount only at `bilateral-ai-upload.component.html:337` (+ import `.ts:43`); other hits are comments (`bilateral-ai-job.model.ts:8`, `bilateral-ai.service.ts:77`) and `bilateral-ai-upload.component.spec.ts:266,297,343` | `b3aebb013` | Retiring it breaks another screen — DD-8 changes — **High** | — |
| P-15 | `PrToastService.add({key, severity, summary, detail, life})` has **no action** and always auto-removes (4 s); toasts render only in a host whose key matches (`globalUserNotification` in `app.component.html:89`) | `shared-state` | `shared/components/pr-toast/pr-toast.service.ts` (`add` → `setTimeout(remove, life ?? 4000)`); `pr-toast.component.ts:25`; `app.component.html:89` | `b3aebb013` | The action toasts of `AIQ-R-7`/`R-11` need no service change — DD-10 dropped — **Low** | — |
| P-16 | The header chip renders in two slots: identity row `< 640 px` inside the no-`pageTitle` branch (`html:210-229`) and the `activeTab()` nav `≥ 640 px` (`html:382-398`); the create wizard sets `pageTitle` and no `activeTab`, so **the chip never renders on the wizard** | `shared-state` | `bilateral-page-header.component.html:45,110,210-229,287,382-398`; `bilateral-result-creator.component.html:7` | `b3aebb013` | Trigger placement needs no third slot — DD-9 simplifies — **Low** | — |
| P-17 | The only right-side drawer with a focus trap is `bilateral-quality-assessment-dialog` (hand-rolled `onTabKey`); `HlmDialogService.open(component, {contentClass, context})` wraps the Spartan/CDK dialog and is already used by the header | `location` | `bilateral-quality-assessment-dialog.component.html:8-19`, `.ts:195-217`; `spartan/dialog/src/lib/hlm-dialog.service.ts:8,19-34`; `bilateral-page-header.component.ts:152,334` | `b3aebb013` | Drawer shell choice changes (DD-7) — **Low** | — |
| P-18 | `HlmDialogService` can present a right-anchored full-height panel (and a full-screen sheet < 640 px) through `contentClass` alone | `other` | `UNVERIFIED — confirm at source before relying on it` | `—` | DD-7 falls back to the quality-assessment shell pattern — **Low** | `AIQ-T-8`, first step |
| P-19 | My drafts reads only `?project=`; drafts are grouped by `job_id` with no DOM anchor | `existence` | `my-draft-results.component.ts:233-241,283-341`; `bilateral-query-params.ts:10-20`; `my-draft-results.component.html:237` | `b3aebb013` | The drafts deep link needs no change — **Low** | — |
| P-20 | Job normalization coerces numbers/booleans/dates (`toNumberOr`, `toBoolean` accepts `1`/`'1'`), and `buildStepperModel`, `elapsedSeconds`, `mixClass`, `errorCopy` are exported pure helpers | `existence` | `pages/bilateral/bilateral-ai-job.model.ts:107-118,120-155,210,232,239,266` | `b3aebb013` | Card logic must be written from scratch — budget +150 LOC — **Low** | — |
| P-21 | Project name and Center acronym are joinable: `job.project_id → clarisa_projects.id` (`short_name`, `full_name`), `job.center_id → clarisa_institutions.id` (`acronym`) | `data-env` | `clarisa-projects.entity.ts:17-24`; `clarisa-institution.entity.ts:15-35`; join used in `migrations/1785945611250-SetBilateralAiJobsCenterIdRequired.ts:13-16` | `b3aebb013` | The list needs a second lookup — **Low** | — |
| P-22 | Consumers of what this design changes: `GET jobs/:jobId` response is read only by the client service (`bilateral-api.service.ts:258`) and pinned in `bilateral-ai.controller.spec.ts`, `bilateral-ai.service.spec.ts:296-351`; the localStorage key only by the service and its spec (`:39,451-645`); `app-bilateral-ai-completion-dialog` only by `app.component.html:65`/`app.module.ts:18,60`; no Cypress e2e references `ai/jobs`, `ai-job-chip` or `ai-processing` | `consumer` | Scout: `grep -rn "prms.bilateral-ai\|ACTIVE_JOB_STORAGE_KEY\|active-job" onecgiar-pr-client/src onecgiar-pr-client/cypress onecgiar-pr-client/tests`; `grep -rn "ai/jobs\|ai/expectations\|ai-job-chip\|ai-processing" cypress/e2e` → exit 1; server `grep -rlE "getJob\|queue_position" --include=*.spec.ts onecgiar-pr-server` | `b3aebb013` | A reader breaks silently — **High** | — |
| P-23 | The failure email links to `/bilateral/<acr>/create?job=<id>`; mail sending is disabled | `consumer` | `bilateral-ai-notifications.service.ts:111,184-190` | `b3aebb013` | `?job=` handling must keep the creator route — **Low** | — |
| P-24 | The number of API containers consuming the AI queue in prtest/prod | `data-env` | `UNVERIFIED — confirm at source before relying on it` | `—` | None for the design (DB-enforced cap); the HITL plan changes — **Low** | Juan David / Cris, before `AIQ-T-11` |
| P-25 | Whether Nest's `ClientProxy.emit` dispatches without a subscriber (the repo never subscribes) | `other` | `UNVERIFIED — confirm at source before relying on it` (node_modules absent in the worktree) | `—` | Re-publish would be silently dropped; DD-2 must subscribe — **High** | `AIQ-T-2`, first step (read `@nestjs/microservices` `client-proxy.js` in the main checkout; today's `createJob` works in prtest, which is indirect evidence only) |
| P-26 | The completion dialog is the only app-level instantiator of `BilateralAiService`: the bilateral module is lazy, no shared code injects the service, and the service constructor resumes polling | `shared-state` | `app.component.html:65`; `app.module.ts:60`; `shared/routing/routing-data.ts:134`; `bilateral-ai.service.ts:116,233-240` (reversion reviewer, §12A) | `b3aebb013` | The watcher is unnecessary — **Low** | — |

---

## 2. Architecture Overview

### 2.1 Where this lives

| Layer | Component | Change |
|---|---|---|
| Server | `api/bilateral-ai/services/bilateral-ai-dispatch.service.ts` (new) | Named lock, eligibility, claim-or-redirect decision, `wake(reason)` re-publish |
| Server | `bilateral-ai.consumer.ts` | Delegates to the dispatch decision before `processJob`; retry via re-publish (DD-3) |
| Server | `bilateral-ai.service.ts` | `processJob` runs a job already claimed; terminal paths call `wake`; `listJobs`; `getJob` adds `jobs_ahead`, `wait_reason` |
| Server | `bilateral-ai-sweeper.cron.ts` | Safety-net `wake`; stall rule tries dispatch before flipping |
| Server | `bilateral-ai.config.ts`, `main.ts` | Two cap getters; `prefetchCount` = global cap |
| Client | `pages/bilateral/services/bilateral-ai.service.ts` | Job list store + one poller; single-job members removed |
| Client | `components/ai-processes-drawer/` (new), `components/ai-job-card/` (new), `components/ai-processes-trigger/` (new) | Drawer, cards, header trigger |
| Client | `bilateral-ai-upload`, `bilateral-page-header`, `bilateral-result-creator`, `my-draft-results`, `app.component` | Never-block, trigger slots, wizard unlock, `?job=` highlight, dialog unmount |
| Client | `shared/components/pr-toast` | Optional action + optional sticky life (DD-10) |

### 2.2 Sequence — submit, claim, park, re-dispatch

```text
User A submits P-2 while A's P-1 runs and B's job runs (2 lanes busy)
  client POST /center/ai/jobs ──► createJob: save PENDING, publish {jobId: A2}   → 202
                                         │
  consumer(A2) ──► dispatch.decide(A2) ── GET_LOCK('prms_bilateral_ai_dispatch')
                     running=2 ≥ cap → PARK A2 (no write) ── RELEASE_LOCK ── ack
  … B's job completes ──► processJob writes COMPLETED ──► dispatch.wake('terminal')
                     GET_LOCK · running=1 · oldest eligible = C1 (A still runs P-1) ·
                     publish {jobId: C1} · RELEASE_LOCK
  consumer(C1) ──► dispatch.decide(C1): oldest eligible = C1 → claim (attemptStart) → RELEASE_LOCK
                     → processJob(C1) … mining … COMPLETED → wake('terminal')
  … A's P-1 completes ──► wake → oldest eligible = A2 → publish {A2} → consumer claims A2
  sweeper (every minute) ──► wake('sweep') when running < cap and an eligible job exists
client polls GET /center/ai/jobs (1 request) → drawer re-renders; terminal → toast + badge
```

### 2.3 The decision the consumer makes for message `{jobId: X}`

| Row state of X | Lanes / owner | Outcome |
|---|---|---|
| Not found, `COMPLETED`, or `FAILED` | — | ack, no-op |
| `PROCESSING` and `retrying = 1` | holds its own lane | resume the retry attempt (no lock needed; P-2) |
| `PROCESSING` and not retrying | — | ack, no-op (another consumer owns it) |
| `PENDING`, X is the oldest eligible, lanes free | — | claim X under the lock, release, run `processJob(X)` |
| `PENDING`, another job E is the oldest eligible, lanes free | — | park X (no write), publish `{jobId: E}` under the lock, ack |
| `PENDING`, no free lane, or X's owner at per-user cap and nothing else eligible | — | park X, ack |
| Lock not acquired within 10 s | — | `nack`-requeue the message (not a job failure; attempts untouched) |

---

## 3. Data Model Changes

### 3.1 Entities

None. The design reads existing columns: `status`, `user_id`, `queue_entry_date`, `started_date`, `stage_updated_date`, `retrying` (P-7).

### 3.2 Migrations

None. The fair-order query (`status = PENDING`, ordered by `queue_entry_date`) uses `IDX_bilateral_ai_jobs_status_queue_entry`; the per-user count uses `IDX_bilateral_ai_jobs_user_status` (P-7).

### 3.3 External data

The list joins `clarisa_projects` (name) and `clarisa_institutions` (acronym) read-only (P-21). No CLARISA calls.

---

## 4. API Surface

### 4.1 Endpoints

| Method | Path | Change |
|---|---|---|
| `GET` | `/api/bilateral/center/ai/jobs` | **New.** Caller's active jobs + finished in the last 24 h (max 10) + `summary` |
| `GET` | `/api/bilateral/center/ai/jobs/:jobId` | **Additive:** `jobs_ahead`, `wait_reason` (PENDING only). `queue_position` kept, now defined as `jobs_ahead` (it excluded nothing before; the count of older `PROCESSING` rows drops out because a running job is never "ahead" in a lane model) |

**List item** (snake_case like today's response): `job_id`, `status`, `stage`, `stage_updated_date`, `project_id`, `project_name`, `program_code`, `center_id`, `center_acronym`, `document_count`, `audio_count`, `has_text`, `queue_entry_date`, `started_date`, `completed_date`, `result_count`, `error_code`, `attempts`, `max_attempts`, `retrying`, `jobs_ahead` and `wait_reason` (PENDING only, else `null`).

**Summary:** `lanes_total` (global cap), `lanes_busy` (count `PROCESSING`), `others_waiting` (count `PENDING` with `user_id ≠ caller`).

**Excluded from the list** on purpose: `bucket_name`, `document_keys`, `audio_keys`, `text_context`, `response_snapshot`, `error_message`, `user_id`. The client needs counts, not keys, and `error_code` drives the copy (P-20 `errorCopy`).

### 4.2 Bilateral contract impact

Additive only. One change-log row in `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` (newest-first table): the new list route and the two new `jobs/:jobId` fields, plus the redefinition of `queue_position` (`AIQ-D-15`).

---

## 5. Server Workflow / Business Rules

### 5.1 Eligibility (the single source of fair order)

- **Running count:** jobs with `status = PROCESSING` (retrying ones included, which is `AIQ-R-1` F).
- **Owners at cap:** users whose `PROCESSING` count ≥ per-user cap.
- **Oldest eligible:** the `PENDING` job with the smallest `queue_entry_date` whose owner is not at cap. Ties break by `job_id` for determinism.
- Evaluated only while holding the named lock, so two containers never both see "one lane free" and both claim.

### 5.2 Named lock

`GET_LOCK('prms_bilateral_ai_dispatch', 10)` and `RELEASE_LOCK` run on **one dedicated query runner**: MySQL named locks are session-scoped, so acquire, decide, claim and release must share that connection. The lock is held only for counts, the claim update and a publish. It is never held across the mining call. A `finally` always releases the lock and the runner.

### 5.3 Where `wake` is called (every path that can free a lane, P-5)

| Path | Call |
|---|---|
| `processJob` success (`COMPLETED`) | after the write, before `notifyTerminal` returns |
| `processJob` final failure (`FAILED`, incl. 4xx) | after the scoped write |
| Sweeper `TIMED_OUT` | after each flip |
| Sweeper `QUEUE_STALLED` | after each flip |
| Sweeper tick | always, as the safety net (`AIQ-R-2` B) |
| `createJob` / `retryJob` | unchanged: they publish their own job; the consumer decision routes it |
| `QUEUE_NOT_AVAILABLE` writes | none: the broker is down, a publish would fail too; the sweeper tick recovers when it returns |

`wake` publishes the oldest eligible job for **each** free lane (at most `cap − running` messages), under the lock. A job that already has a message in flight may get a second one, which is harmless (P-2 conditional claim, `AIQ-R-2` C).

### 5.4 Stall rule (`AIQ-R-4`)

Before flipping, the sweeper calls `wake('sweep')`. It flips the oldest `PENDING` job to `QUEUE_STALLED` only when both hold: the existing liveness count finds no `started_date`/`stage_updated_date` inside the window (P-6), **and** the job is not waiting on its owner's `PROCESSING` job. A parked job behind a live job is never stalled. The comment at `bilateral-ai-sweeper.cron.ts:124-126` is updated. All cutoffs stay in SQL (`DATE_SUB(NOW(), …)`, `KZ L3`).

### 5.5 Wait reason and jobs ahead (read time, `AIQ-R-6`)

- `jobs_ahead` = count of `PENDING` jobs with `queue_entry_date` older than this job's. It never increases while the job waits: newer jobs are not counted, and retried jobs move to the back.
- `wait_reason`: `own_job_running` if the owner is at cap; else `no_free_lane` if running ≥ global cap; else `starting`.

### 5.6 Caps

`getBilateralAiMaxConcurrent()` (default 2) and `getBilateralAiMaxPerUser()` (default 1) in `bilateral-ai.config.ts`, read at call time like the existing getters. Unlike those getters, they clamp non-integer or `< 1` values to the default (`AIQ-R-21`). `main.ts` sets the AI queue's `prefetchCount` from the global-cap getter, so one container can run both lanes; the reporting-export block keeps its own literal `1`.

### 5.7 Logging (`AIQ-R-20`)

One `log` line per decision: `claimed` / `parked(reason)` / `redirected(to E)` / `lock-timeout` / `wake(reason, published n)`, with job ids and counts only. No emails, file names or payloads (AC-9; the existing payload `log` in the text-mining client is out of scope).

---

## 6. Frontend Plan

### 6.1 Routes / modules

No new route. The drawer is opened in place. `?job=<id>` on any bilateral page opens the drawer with that job highlighted. The creator keeps its `?job=` behavior for the email link (P-23): it selects the AI way and opens the drawer. My drafts learns `?job=<id>` (P-19).

### 6.2 Components & services

| Unit | Responsibility | Reqs |
|---|---|---|
| `BilateralAiService` (refactored) | `jobs` signal (normalized list items), `summary` signal, `drawerOpen`, `highlightJobId`, `unseenFinishedIds` (session memory), `openDrawer(jobId?)`; one poller calling `GET_bilateralAiJobs`, with the `APF-R-7` cadence measured from the most recent active job's `queueEntryDate`; stops when no job is active and the drawer is closed; terminal-transition detection by diffing consecutive polls → toast. Keeps `retryJob`, `expectations`, `setUploadStatus`/`setUploadProgress` (upload progress only), drafts members. **Removes** `activeJob`, `currentJob`, `currentJobId`, `startJob`, `panelVisible`/`setPanelVisible`, `completionNotice`, `dismissCompletionNotice`, `openDraftsFromNotice`, `getActiveJobSnapshot`, the storage record (read once and removed, `AIQ-R-8` C) | R-8, R-11 |
| `bilateral-ai-job.model.ts` | Adds `NormalizedBilateralAiListJob` + `normalizeListJob` (reusing the coercion helpers, P-20) + `waitReasonCopy` | R-5, R-6, D-13 |
| `bilateral-api.service.ts` | `GET_bilateralAiJobs()` (naming convention, inline `environment.apiBaseUrl` like its AI siblings) | R-5 |
| `ai-processes-drawer` | Dialog shell (DD-7), header (title, sub-line, lanes strip), groups Running / Waiting / Finished, footer copy, skeleton / refresh-error / empty states, polite live region | R-9, R-12 |
| `ai-job-card` | Presentational, input-driven; variants `running` (stage from `buildStepperModel`, elapsed, expected range), `waiting` (reason + position), `completed`, `no-candidates`, `failed`, `still-running`; outputs `viewDrafts`, `retry`, `reportManually` | R-9 |
| `ai-processes-trigger` | Button with ring, badge, accessible name; states idle / working / done | R-10 |
| `bilateral-ai-upload` | Form always rendered; on 202 → reset form, show confirmation card, toast, `openDrawer` not forced; submit errors unchanged; `?job=` → `openDrawer(job)` | R-7 |
| `bilateral-page-header` | Chip markup and its tick removed; trigger placed in the two existing slots **and** in the `pageTitle` branch (P-16) | R-10 |
| `bilateral-result-creator` | `isAiProcessing` stops reading job status (it reads `uploadState().status === 'uploading'` only), so steps stay unlocked while jobs run | R-7 |
| `my-draft-results` | Reads `?job=`; the matching session group gets an `id`, is scrolled into view and highlighted once | R-9 D |
| `pr-toast` | Optional `action { label, run }` and `sticky` (no auto-remove) on `add()`; renders the action as a button; default behavior unchanged (DD-10). Completion toasts are sticky | R-7, R-11 |
| `bilateral-ai-job-watcher` (new, headless) | Mounted where the completion dialog was (`app.component.html:65`); keeps the service alive app-wide so polling and toasts work off bilateral routes; polling only when `prms.bilateral-ai.has-active-jobs` is set | R-8, R-11 |
| `internationalization/bilateral-ai-processes.copy.ts` (new) | Every new string (DD-9 pattern `XXX_COPY`) | NFR i18n |

**Retired:** `ai-processing-panel` (DD-8), `bilateral-ai-completion-dialog` (DD-6; its `app.component` mount point is reused by the watcher). `clearUploadState()` is narrowed to the upload form (DD-11).

### 6.3 Design system usage (from the mockup)

| Element | Tokens / rule |
|---|---|
| Accent (trigger ring, running rail, primary buttons, stepper) | `--pr-color-primary-300/400` gradient; `brand-*` Tailwind utilities |
| Surfaces | `--pr-color-primary-25/50/100/200` tints for lanes strip, reason rows, footer |
| Status | success `--pr-status-approved-fg/bg`; danger `--pr-danger`, `--pr-danger-soft`; no-candidates uses the existing warning token pair (exact names settled by the token-existence gate, `AIQ-D-11`) |
| Icons | `material-icons-round` only: `auto_awesome`, `description`, `graphic_eq`, `hourglass_top`, `person`, `group`, `check_circle`, `search_off`, `error_outline`, `refresh`, `arrow_forward`, `schedule`, `task_alt`, `close` |
| Type | Manrope (app font); timers in `font-mono` (JetBrains Mono, tabular) |
| Motion | card enter 450 ms and group move 350 ms with ease-out; indeterminate bar slide; pulse dot; all removed under `prefers-reduced-motion` via `motion-reduce:` utilities |
| Styling | Tailwind-first; SCSS only for `@keyframes`; base classes kept beside responsive variants (`KZ L2`) |

### 6.4 Notification UX

Terminal transition detected by the poll → toast with action (`Open drafts` / `View`), badge update, bell as today (C9). Toasts use key `globalUserNotification` (P-15). More than 2 terminal transitions in one poll → one grouped toast (`AIQ-R-11` B).

### 6.5 Responsive

Drawer: `min(440px, 100%)` right panel at ≥ 640 px; full-screen sheet below 640 px. The trigger follows the chip's two slots plus the `pageTitle` branch. Tab-strip baseline overflow is measured before any zero-overflow gate (`KZ L1`).

---

## 7. Security & Authorization

- The list is scoped to `user_id = caller.id` and projects no other user's data; the summary is counts only (`AIQ-R-5` B, `AIQ-D-4`).
- **Pre-existing trust model (P-9), not changed here:** `center/ai/*` routes have no guard and `@UserToken()` decodes the `auth` header without verifying its signature when the middleware did not set `req.user`. The new route inherits exactly this model (`AIQ-R-5` C). The fix is owned by **P2-3854** ("Bilateral Center endpoints (/api/bilateral/center/*) accept unverified user tokens"), whose scope covers `center/ai/*`. Once it lands, an invalid token on `GET center/ai/jobs` returns 401; the client poller already stops on 401 (`bilateral-ai.service.ts:370` `handlePollError`), and `AIQ-T-5` keeps that behaviour.
- No secrets, emails or file names in the new logs (AC-9).

---

## 8. Performance & Capacity

- AI Assisted load: at most 2 concurrent calls from PRMS (spike: 2–3 concurrent → all 200).
- List query: one indexed select on `(user_id, status)` plus a 24 h finished window, two left joins, and two counts on `(status, …)`. The table holds 93 rows today (read-only query, 2026-09-29). Target p95 < 300 ms.
- Client: one request per poll regardless of job count (`AIQ-D-6`). The poll stops when idle.
- Lock: held for milliseconds (counts + one update + ≤ 2 publishes). The 10 s acquire timeout only matters if a holder hangs; the `finally` release bounds it.

---

## 9. Observability

Dispatch decision logs (§5.7). Existing terminal logs and notifications unchanged. The HITL samples `SELECT COUNT(*) … WHERE status = 'PROCESSING'` every 5 s to prove `AIQ-AC-4`.

---

## 10. Testing Plan (forward-looking)

| Layer | What | Gate |
|---|---|---|
| Server Jest | dispatch decision table (§2.3) incl. worked example A1/A2/B1/C1, retry resume, lock timeout; `wake` on every §5.3 path; stall rule A/B; `listJobs` key set with other users' rows; `jobs_ahead` monotonic; cap getters clamp | `npx jest --testPathPattern="bilateral-ai"` (never the full suite) |
| Server compile | `npx tsc --noEmit` | `AIQ-D-14` |
| Client Jest | service poll count, terminal diff → toast, legacy key migration, `?job=`; upload never-block; creator unlock; card states (no `%`, no ETA); drawer focus/`Esc`/return focus/live region; trigger states and name; toast action | `npx jest <path> --no-coverage` per touched folder; `ng build` (dev) |
| Cypress CT | drawer 375 / 900 / 1280 with Manrope + icons loaded, bounding rects, `documentElement.scrollWidth ≤ clientWidth`; trigger in all three header slots; reduced motion via CDP emulation (the `ai-processing-panel.cy.ts:72-79` technique) | `npm run test:ct:batch` scoped |
| Grep gates | no hex, no `rgba(`, no `pi-` in new templates; every `var(--pr-…)` exists in `colors.scss`; no `new Date(` in dispatch/sweeper code | `AIQ-D-11`, `AIQ-D-12` |
| T6 visual | CT screenshots vs. `mockup/ai-processes-drawer.html` | `AIQ-D-16` |
| HITL on prtest | two consumers (local API + prtest API) on the prtest queue, local `TZ=America/Bogota` vs prtest UTC; five submissions from five users; `PROCESSING` count sampled; A1/A2/B1/C1 order; parked job starts on its own; drawer live | `AIQ-D-1`, `D-2`, `D-12` |

---

## 11. Backwards Compatibility, Rollout & Rollback

- API is additive; `queue_position` is kept (redefined as `jobs_ahead`, logged in the change log).
- Deploy server first. With the old client, `createJob` still returns 202 and the old single-job polling of `GET jobs/:jobId` keeps working. Then deploy the client.
- **Rollback:** `BILATERAL_AI_MAX_CONCURRENT=1` restores one lane with no deploy (`AIQ-R-1` E). A full revert of the server PR restores prefetch-1 dispatch; parked `PENDING` rows are then picked up by normal consumption only if they have a message in flight, so a revert must be followed by one re-publish of `PENDING` jobs (documented in the PR).
- Legacy localStorage record: read once, job included, key removed.

---

## 12. Design Decisions

### `AIQ-DD-1` — Claim-or-redirect under a MySQL named lock

- **Context:** caps must hold across containers (P-24 unknown), and fair order must skip owners at cap.
- **Decision:** every message asks to run X; under `GET_LOCK` the handler claims X only if X is the oldest eligible job, otherwise parks X and publishes the oldest eligible job (§2.3). Reuses the existing conditional claim (P-2) and early-return ack (P-3).
- **Alternatives:** (a) `prefetchCount: 2` plus an in-memory owner check, rejected because the cap multiplies per container and races across containers; (b) nack-requeue ineligible messages, rejected because it spins and reorders; (c) a `SELECT … FOR UPDATE` mutex row like `bilateral-quality-assessment.service.ts:226`, rejected because it needs a lock row or table (migration) for a lock MySQL already provides by name.
- **Consequences:** a new query runner per decision; the dispatch service is the only writer of `PENDING → PROCESSING`.

### `AIQ-DD-2` — `wake` on every lane-freeing path, sweeper as safety net

- **Context:** parked jobs have no message in flight (P-3 acked them).
- **Decision:** §5.3 table; the sweeper already ticks every minute (P-6), so a lost wake costs at most ~1 minute.
- **Alternatives:** a delayed-retry exchange in RMQ (rejected: new broker topology, ADR-006 keeps RMQ minimal); client-triggered wake (rejected: the server must own progress, `APF-DD-6`).
- **Consequences:** P-25 must be settled first: if `emit` needs a subscriber, `wake` subscribes (fire-and-forget with error log).

### `AIQ-DD-3` — Retries keep nack-requeue, but only for the message's own job

- **Context:** under DD-1 a message for X can end up running E. Today a retry `nack`s the delivered message (P-4), and the consumer reads the attempts of `payload.jobId`.
- **Decision:** the consumer only runs `processJob` for the job named in the message. Redirects publish a fresh `{jobId: E}` instead of running E in place. So a nack still requeues a message that names the retrying job, and P-4 semantics hold unchanged. The retrying job resumes via the §2.3 `retrying = 1` row, without the lock.
- **Alternatives:** run E in place and republish on retry (rejected: the consumer's attempts check reads the wrong job and needs rewriting).
- **Consequences:** a redirect costs one extra broker hop (milliseconds); retries are unchanged.

### `AIQ-DD-4` — Position = older `PENDING` count, reason separate; no ETA

- **Context:** the spike showed 115–183 s for the same document; fair order depends on which running job ends first.
- **Decision:** §5.5. Monotonic and cheap; the reason explains the skip.
- **Alternatives:** simulate the exact fair order (rejected: depends on unknown finish order); ETA from expectations (rejected: the variance is larger than the estimate, `AIQ-R-6` C).

### `AIQ-DD-5` — Stall rule tries dispatch first and exempts owner-waits

§5.4. **Alternative:** drop the stall rule (rejected: it is the only detector of a dead consumer, `APF-R-2` B).

### `AIQ-DD-6` — Retire the app-wide completion dialog (**reversion, challenged**)

- **Context:** with N jobs, a blocking modal per completion interrupts work; `AIQ-R-11`.
- **Decision:** delete `app-bilateral-ai-completion-dialog` and replace its mount (`app.component.html:65`, `app.module.ts:18,60`) with the headless watcher; completion = sticky toast with action + badge + bell; the provenance surface moves to the drawer's completed card.
- **Challenge result:** see §12A.

### `AIQ-DD-7` — Drawer shell on `HlmDialogService`, fallback to the quality-assessment shell

- **Context:** a focus-trapped right drawer is needed; the only hand-rolled one has been copied four times (its folder `CLAUDE.md`).
- **Decision:** open the drawer through `HlmDialogService` (CDK focus trap, `Esc`, focus restore) with a right-sheet `contentClass`. If P-18 fails, copy the quality-assessment shell pattern (`onTabKey`) instead.
- **Alternatives:** Spartan `sheet` (no bilateral consumer today, P-17); extracting a shared `pr-drawer` (right idea, out of scope, and a fifth copy would make that extraction worse, which is why CDK comes first).

### `AIQ-DD-8` — Retire `ai-processing-panel` (**reversion, challenged**)

- **Context:** the upload never shows a job again (`AIQ-R-7`), and the panel's only mount is the upload (P-14).
- **Decision:** delete the component, its spec, its CT and its `CLAUDE.md`. The stage mapping survives in `buildStepperModel` (P-20), which the card reuses.
- **Challenge result:** see §12A.

### `AIQ-DD-9` — Trigger replaces the chip in both slots and adds the `pageTitle` branch

- **Decision:** P-16. The Center gate and the 1 s header tick are removed; the trigger has no timer of its own (elapsed times live only in the open drawer).
- **Challenge result (reversion of the Center gate):** see §12A.

### `AIQ-DD-10` — Extend `PrToastService` additively

- **Decision:** add optional `action` and `sticky` to `add()`; absent → today's behavior byte for byte. Consumers need no change (optional fields).
- **Alternative:** actionless toasts (rejected: `AIQ-R-7`/`R-11` need the jump to drafts from any page).

### `AIQ-DD-11` — Creator wizard unlock (**reversion, challenged**)

- **Decision:** `isAiProcessing` (`bilateral-result-creator.component.ts:383`) reads only the upload's own `uploading` status. Steps no longer lock while jobs run.
- **Challenge result:** see §12A.

## 12A. Reversion challenges (Step 2.3)

One reviewer, one question ("what does removing this break that the replacement does not cover?"), run 2026-09-29 against `b3aebb013`. Every breakage found is now addressed in the design; none is accepted silently.

| DD | Breakage found (reviewer citation) | Resolution in this design |
|---|---|---|
| DD-6 dialog | **Polling dies off bilateral routes.** The dialog, mounted in `AppModule`, was the only thing instantiating `BilateralAiService` app-wide (`app.component.html:65`, `app.module.ts:60`; lazy bilateral module `routing-data.ts:134`; resume in the service constructor `:116,233-240`) | New headless `app-bilateral-ai-job-watcher` replaces the dialog at the same mount point. It injects the service, and the service starts polling only when the per-browser hint `prms.bilateral-ai.has-active-jobs` is set (written on submit, cleared when a poll returns no active job). Users who never submitted make zero extra requests |
| DD-6 dialog | A toast auto-hides after 4 s; the dialog was sticky because a toast was once reported as "no feedback at all" (`bilateral-ai-completion-dialog.component.ts:15-18`; `pr-toast.service.ts:32-34`) | Completion toasts are **sticky** (DD-10) until closed or acted on; the badge persists until the drawer opens |
| DD-6 dialog | The success provenance line is one of the five `APF-R-12` surfaces (`ai-provenance-notice.component.ts:4-6`; dialog `.html:33-37`) | The drawer's completed card renders `app-ai-provenance-notice`, so the surface moves and the count stays five |
| DD-6 dialog | Copy lost: plural draft count + Center name, no-candidates text, server error message (`.ts:51-66`) | The card copy carries plural count + Center acronym and the no-candidates line; failures use `errorCopy(error_code)` (the list omits `error_message` on purpose, §4.1) |
| DD-8 panel | Lost: "estimated" step captions, retry heading + attempt badge ("Attempt X of Y"), source-mix line, expected-range fallback ("This usually takes a few minutes; audio takes longer"), "Checking every 30 seconds", `errorCopy` action labels, "Try again" disabled while alive, "Upload different files" / "Start another", heading-only `aria-live` (`ai-processing-panel.component.html:19-193`, `.ts:15,129-148`) | The card keeps all of them except "Start another", which is redundant because the form is always there. "Upload different files" on a failed card opens the creator's AI way for that project. Upload spec `:266,297,343` is rewritten in the upload task |
| DD-8 panel | `panelVisible` becomes dead code (`bilateral-ai.service.ts:277`; upload `.ts:163,174`) | Removed with the panel (already in §6.2 removal list) |
| DD-9 chip | `?job=` has a second producer, the failure-notification link to `/bilateral/<acr>/create?job=` (`bilateral-ai-notifications.service.ts:183-186`), consumed by the creator (`:619-625,647-649`) and by upload `startJob` (`:167-169`) | The creator keeps selecting the AI way on `?job=` and calls `openDrawer(job)`; `startJob` is gone. Header spec `:832-901` (Center gate, aria text, href) and CT `bilateral-page-header.cy.ts:56-70` are rewritten in the trigger task |
| DD-9 chip | Aria text "open the processing panel" becomes wrong (`bilateral-page-header.component.ts:117`) | The trigger's name is the new `AIQ-R-10` C string |
| DD-11 wizard | Unlocked steps let `onProjectSelected` clear the reporting way (`creator.ts:657`) and let re-choosing "AI" call `clearUploadState()`, which today also wipes `currentJobId`/`currentJob` while polling continues (`creator.ts:670`; service `:505-513`) | Harmless once jobs no longer live in `uploadState`: `clearUploadState()` is narrowed to the upload form only. The spec at `creator.spec.ts:419-432` is rewritten. Opening "Manual" while jobs run is allowed on purpose |

---

## 13. Open Gaps & Follow-ups

| Item | Owner |
|---|---|
| P-18, P-24, P-25 (`UNVERIFIED`) | `AIQ-T-8` / Juan David–Cris / `AIQ-T-2` |
| **Security finding (pre-existing):** `center/ai/*` trusts an unverified `auth` decode on a JWT public route (P-9). Tracked in **P2-3854**; its "Affected" list names only `bilateral-center.controller.ts`, so add `bilateral-ai.controller.ts` (`@Controller('center/ai')`, every route uses `@UserToken()`) there. Not fixed in this spec | Juan David (P2-3854) |
| Service error toasts without `key` never render on bilateral pages (`bilateral-ai.service.ts:486,500`, P-15). Fixed in passing only if the refactor touches those lines; otherwise noted on the ticket | `AIQ-T-5` |
| Stale folder guides: `bilateral-ai-upload/CLAUDE.md` (single-job model, stale line refs) and the retired panel's guide. Updated in the tasks that change those folders (own deliverable, not a lifecycle write) | `AIQ-T-7`, `AIQ-T-10` |
| AI Assisted speed (AC6/AC7) and priority (`AIQ-OQ-4`) | AI Assisted team |
| Shared `pr-drawer` extraction | follow-up |

---

## 14. Budget (Step 2.4)

| Signal | Estimate |
|---|---|
| **Tasks** | 11 (unchanged after the reversion challenge; +~120 LOC for the watcher, sticky toast, card parity): server 4 (caps + prefetch · dispatch + consumer · wake paths + sweeper · list + getJob + contract doc) · client 6 (model + API + service · toast action · upload + creator + drafts `?job=` · drawer + card + copy · trigger + header · retire panel and dialog) · 1 CT + HITL |
| **LOC** | ~4,000: server prod ~480 · server tests ~650 · client prod ~1,150 (service ~260, drawer ~260, card ~220, trigger ~90, upload/creator/drafts/header edits ~180, toast ~50, copy ~90) · client tests ~1,350 (≈1.2× prod) · CT ~160 · docs ~60 · retired code removed ~−900 not counted |
| **Review rounds** | ≤ 1 per task; a second FAIL escalates |
| **Depth check** | Full confirmed: concurrency in a worker, a new API route, a contract change, a retired shared surface. Not a split: server and client share the list contract; shipped as 2 chained PRs (server, then client) |

`/akili-execute` tripwire: > 50 % over tasks or LOC → stop at the task boundary and report.

---

## Required cross-references

- `requirements.md` (`AIQ-R-1..22`, `AIQ-D-1..16`)
- `docs/trd/trd.md` W5 (ack after success), W8, ADR-006 (RMQ)
- `docs/ux-ui/design.md` §6 drawers, §7 brand line, §9, §10, DD-9, DD-12
- `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` change log
- Archived `APF` design: `docs/specs/archive/2026-09-15-bilateral--ai-processing-feedback/design.md` (`APF-DD-6/7/8` superseded in part by `AIQ-DD-6/8/9`)
