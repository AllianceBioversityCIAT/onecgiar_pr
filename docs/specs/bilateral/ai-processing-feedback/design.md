# Design — AI-Assisted Creation: Processing Feedback, Job Lifecycle and Transparency

## Document Control

| Field | Value |
|---|---|
| **Spec Path** | `docs/specs/bilateral/ai-processing-feedback/` |
| **Linked requirements** | `requirements.md` — `APF-R-1..12`, `APF-R-20..22`, `APF-R-30/31`, `APF-AC-1..21`, defect classes D1–D11 |
| **Depth** | **Full** (re-sized in §14: schema migration + data migrations + API contract change + notifications → the Phase 0 "Standard" guess was one level low) |
| **Approval Mode** | gated |
| **Design prefix** | `APF-DD-n` |
| **Author** | AKILI specify (T1 — Fable 5.1) |
| **Date** | 2026-09-15 |
| **Baseline cited** | `docs/trd/trd.md` §6 frontend state, §8 async messaging (durable RMQ, `noAck: false`, `prefetchCount: 1`), §9 error handling & observability · `docs/ux-ui/design.md` §7, §8 (rules 4, 5, 8, 19, 21), §10 · `onecgiar-pr-server/src/api/bilateral/CLAUDE.md` §6 payload discipline, §7.5 logging · `onecgiar-pr-client/CLAUDE.md` §5 |
| **Patterns reused** | `webhook-dispatch.cron.ts` (in-process cron sweeper), `notification.service.ts#emitResultNotification` (in-app rows), `bilateral-ai.service.ts#sendResultsReadyEmail` (handlebars mail from the DB `template` table), `bilateral-ai-completion-dialog` (global outcome), `bilateral-accordion` (disclosure), `overview-controls` combobox (token-styled controls), `KZ-bilateral--center-overview-tab-1/3` |
| **Kaizen lessons applied** | `KZ-changes--bilateral-review-center-strip-and-phase-1` → all client fixtures are captured `getJob` responses (string ids, ISO dates, `0/1` booleans) · `KZ-REH-1` → tests budgeted 1.3× production · `KZ-bilateral--center-overview-tab-1` → no named + arbitrary breakpoint mix · `KZ-bilateral--center-overview-tab-3` → every widget cites a live exemplar |
| **Visual reference** | `mockup/ai-processing-panel.html` (generated this phase — five panel states + header chip + transparency banner) |

---

## 1. Summary

The server becomes the single owner of the job lifecycle: a **stage** column advanced by `processJob`, a **cron sweeper** that resolves stuck jobs into `TIMED_OUT` / `QUEUE_STALLED`, **retries that stay `PROCESSING`**, a **retry endpoint** that re-enqueues stored sources, and **one notification per terminal state** (in-app row + mail ≥ 2 min). The client stops inventing outcomes: a new `ai-processing-panel` component renders stage, elapsed time, expected range (served by the API from job history), queue position and attempt; the polling ceiling becomes a "still running" state; the completion dialog and the panel never speak at once; a header **chip** keeps a running job visible from any tab; one `ai-provenance-notice` component marks AI-originated artefacts on five surfaces. The mining service's synchronous contract is untouched.

Tier decision (`software-architect` Robust-vs-Lite gate): **LITE** — everything stays in the existing NestJS monolith and its one RMQ queue; the sweeper is a cron in the API process like `webhook-dispatch.cron.ts`; no new broker topology, no push channel. Escalation triggers examined and not met (§12 `APF-DD-2`).

---

## 2. Architecture Overview

### 2.1 Where this lives

| Layer | Touched |
|---|---|
| **Server** | `api/bilateral-ai/`: entity (+4 columns), `bilateral-ai.service.ts` (`processJob` stages, `retryJob`, `getJob` position, `getExpectations`, notifications per terminal state), `bilateral-ai.consumer.ts` (retry semantics), new `bilateral-ai-sweeper.cron.ts`, controller (+2 routes), DTOs; `api/notification/` (+1 notification type, a direct emit method for jobs, and a job-type branch in the read paths — `getAllNotifications`, pop-ups, recent activity — see §6.4); migrations (schema + data: notification type row, 2 mail templates + 1 variant flag); `docs/bilateral-result-summaries.en.md` change log |
| **Client — new** | `pages/bilateral/components/ai-processing-panel/` (page-level state view), `pages/bilateral/components/ai-provenance-notice/` (banner/badge), `pages/bilateral/bilateral-ai-job.model.ts` (normalized job + stage/stepper model, pure) |
| **Client — modified** | `services/bilateral-ai.service.ts` (normalization, adaptive polling, ceiling → still-running, panel-visible gate, resume record with center, retry), `components/bilateral-ai-upload/*` (delegates the processing state to the panel; retry via endpoint), `components/bilateral-ai-completion-dialog/*` (suppression + notice line), `components/bilateral-page-header/*` (chip), `pages/my-draft-results/*` (list header notice, card badge copy), `pages/bilateral-result-creator/*` (editor banner), result detail read-only view (badge), set-up step (`bilateral-sp-selector` / creation-way section: disclosure), `shared/services/api/bilateral-api.service.ts` (+2 calls) |
| **Client — reused, untouched** | `pr-dialog`, `bilateral-accordion`, `chart-tokens` (not needed), `material-icons-round` |
| **External** | Mining service unchanged; email microservice (RMQ) unchanged; S3 keys reused |

### 2.2 Sequence — job lifecycle with stages and terminal notifications

```
[Upload step]  POST center/ai/jobs ─► createJob: S3 upload → row PENDING (stage=queued) → RMQ publish → 202 {jobId}
     │
     ├─ client startJob(jobId): resume record {jobId, startedAt, centerAcronym}; poll 5 s
     │
[Consumer]  @EventPattern ─► processJob(jobId)
     │   UPDATE … SET status=PROCESSING, stage=uploading, attempts+1, retrying=0, started_date=now
     │          WHERE status IN (PENDING, PROCESSING & retrying)        ── error_code/error_message PRESERVED
     │   0 rows affected (the sweeper or another consumer won) → RETURN immediately; mining is never called
     │   stage ← reading | transcribing | reading_transcribing (from source mix)   ── "estimated" on the client
     │   stage ← extracting (before the mining call)      ── the call is one opaque HTTP request (≤ 10 min)
     │   ── mining responds ──
     │   stage ← validating (normalize) → creating_drafts (draft rows) → status=COMPLETED, completed_date
     │   notify(terminal)  ← exactly once: in-app row; mail iff (terminal − queue_entry_date) ≥ 2 min
     │
     │   on retryable error & attempts < BILATERAL_AI_MAX_ATTEMPTS: UPDATE … SET retrying=1, stage=queued, error_* WHERE status=PROCESSING; nack(requeue)
     │   on final error:                       UPDATE … SET status=FAILED, error_* WHERE status=PROCESSING; notify(terminal); ack
     │
[Sweeper cron, 60 s]  queue_entry_date = COALESCE(retried_date, created_date)
                      (a) PROCESSING & started_date < now − ATTEMPT_TIMEOUT (15 min, per attempt) → FAILED/TIMED_OUT (conditional UPDATE) → notify
                      (b) PENDING & queue_entry_date < now − QUEUE_STALL (30 min) AND no row anywhere has
                          started_date OR stage_updated_date inside that window → FAILED/QUEUE_STALLED → notify
                          ── both conditions required: with prefetchCount 1 an old PENDING job is healthy while others advance
                      late mining response on a TIMED_OUT job → drafts created (reusing existing per-candidate drafts), COMPLETED, notify("after all")
     │
[Client poll]  GET center/ai/jobs/:id ─► { …existing, stage, stage_updated_date, queue_position, max_attempts, retrying }
     │   panel visible?  yes → panel renders stage/elapsed/range/position/attempt; terminal → inline outcome, dialog suppressed
     │                   no  → header chip (elapsed) on every bilateral tab; terminal → completion dialog only
     │   ceiling (30 min) & server alive → "still running", poll 30 s, record kept
     │
[Try again]  POST center/ai/jobs/:id/retry ─► 202 same id (PENDING, attempts=0) | 409 alive/completed | 403 owner | 410 sources gone
```

### 2.3 Secondary flows

- **Reload / new tab:** resume record restores polling regardless of age while the server row is non-terminal; dropped on terminal or 404.
- **Other center:** the chip compares the record's `centerAcronym` with `ctx.centerAcronym()`; a job from another center shows nothing (its outcome still arrives as dialog + notification).
- **Notification row click:** deep-links to `/bilateral/<acronym>/drafts` (success) or `/bilateral/<acronym>/create?job=<id>` (failure → panel in failed state with "Try again").

---

## 3. Data Model Changes

### 3.1 Entities

| Entity | Path | Change |
|---|---|---|
| `BilateralAiJob` | `api/bilateral-ai/entities/bilateral-ai-job.entity.ts` | + `stage` **varchar(32)** default `'queued'` · + `stage_updated_date` timestamp nullable · + `retrying` tinyint(1) default 0 · + `retried_date` timestamp nullable. `status` enum unchanged (`PENDING/PROCESSING/COMPLETED/FAILED`); new `error_code` values `TIMED_OUT`, `QUEUE_STALLED` (varchar, no enum change) |
| `NotificationType` (row) | `notifications_type` table | + row `Bilateral AI Job Finished` (`NotificationTypeEnum.BILATERAL_AI_JOB_FINISHED`) |
| `Template` (rows) | `template` table | + `email_template_bilateral_ai_no_candidates`, + `email_template_bilateral_ai_failed`; the existing results-ready template gains an optional `{{#if late}}` block ("arrived after all") |

**`stage` vocabulary — the complete server value set (8):** `queued` · `uploading` · `reading` · `transcribing` · `reading_transcribing` · `extracting` · `validating` · `creating_drafts`. Nothing else is ever written to the column. The longest value is `reading_transcribing` (20 chars), which is why the column is `varchar(32)` and not `varchar(20)`. The UI collapses `reading` / `transcribing` / `reading_transcribing` into a single step, so the stepper shows **6 UI steps against 8 server values** (§6.3, §14); `requirements.md` §2 lists the same 8.

**Queue-entry clock:** `queue_entry_date = COALESCE(retried_date, created_date)`. It is persisted as a **STORED generated column** (M1: `GENERATED ALWAYS AS (COALESCE(retried_date, created_date))`) so the stall scan and `queue_position` stay indexed; semantically it is the expression every age-based rule uses: the stall check (§5 sweeper), `queue_position` ordering (§6.2, §8), the client elapsed timer (§6.2) and the 2-minute mail rule (§5 notifications). `created_date` stays untouched by a retry so the original upload time remains readable.

### 3.2 Migrations

| # | Kind | Content | Rollback |
|---|---|---|---|
| M1 | schema | `ALTER TABLE bilateral_ai_jobs ADD stage, stage_updated_date, retrying, retried_date`; `INDEX IDX_bilateral_ai_jobs_status_started (status, started_date)`; `queue_entry_date` DATETIME GENERATED ALWAYS AS (`COALESCE(retried_date, created_date)`) STORED; `INDEX IDX_bilateral_ai_jobs_status_queue_entry (status, queue_entry_date)` | drop columns + indexes |
| M2 | data | insert `notifications_type` row | delete by name |
| M3 | data | insert two mail templates; update results-ready template body (keep previous body in the `down`) | delete / restore |

`npm run migration:check` must be green before any client task starts; migrations are serialized (one task).

### 3.3 CLARISA / external

None. `center_id` and `project_id` unchanged.

---

## 4. API Surface

### 4.1 Endpoints

| Method + path | Change | Auth / role | Request | Response | Errors |
|---|---|---|---|---|---|
| `GET /api/bilateral/center/ai/jobs/:jobId` | **additive** | JWT, owner (existing) | — | existing fields + `stage`, `stage_updated_date`, `queue_position` (number \| null, computed only when `PENDING`), `max_attempts` (env, default 3), `retrying` (boolean) | unchanged |
| `POST /api/bilateral/center/ai/jobs/:jobId/retry` | **new** | JWT, owner (403 otherwise) | — | `202 { jobId, jobStatus: 'PENDING' }` | `409 JOB_ALIVE` (PENDING/PROCESSING) · `409 JOB_COMPLETED` · `410 SOURCES_GONE` (an S3 key missing) · `503` queue not configured |
| `GET /api/bilateral/center/ai/expectations?mix=documents\|audio` | **new** | JWT | `mix` (exactly two classes — `documents` = no audio source, `audio` = any audio source present) | `{ mix, sampleSize, p25Minutes, p75Minutes }` or `{ mix, sampleSize, p25Minutes: null, p75Minutes: null }` when `sampleSize < 5` | `400` bad mix |

The expectations route sits under `center/ai/`, **not** under `center/ai/jobs/` — `jobs/expectations` would be swallowed by the `jobs/:jobId` parameter route unless it were declared first, a route-order dependency no reader can see. A controller test asserts it does not shadow `jobs/:jobId` (§10).

Telemetry: none new beyond structured logs (§9).

### 4.2 Bilateral contract impact

`GET center/ai/jobs/:jobId` and the two new routes live under `/api/bilateral/*` → **`bilateral-result-summaries.en.md` change log entry is a task deliverable** (root rule). Fields are additive; existing consumers unaffected.

---

## 5. Server Workflow / Business Rules

| Rule | Where | Detail |
|---|---|---|
| Stage advancement | `processJob` | Stages set with `stage_updated_date` at each PRMS-controlled step (§2.2), drawn only from the 8-value vocabulary in §3.1. Intermediate stages (`reading` / `transcribing` / `reading_transcribing` / `extracting`) are set **before** the mining call from the source mix; the client labels them "estimated". `validating`/`creating_drafts` are observed. |
| Conditional transitions | every status/stage write | `UPDATE … WHERE job_id = ? AND status = <expected>` (and `retrying` where relevant); a 0-row update means another actor won — log at `debug`, do not notify. |
| Attempt start | `processJob` opening statement | `UPDATE … SET status=PROCESSING, stage=uploading, attempts=attempts+1, retrying=0, started_date=now WHERE job_id=? AND status IN (PENDING, PROCESSING & retrying)`. It **preserves `error_code` / `error_message`** — they are the "last error" the retry panel shows (`APF-R-3`), cleared only by a successful terminal transition or by `retryJob`. It sets `retrying = 0` in the same statement, so nothing else has to remember to. **If it affects 0 rows, `processJob` returns immediately** — the sweeper or another consumer already owns the job, and calling mining for a terminated job would burn a 10-minute request and resurrect a `FAILED` row. |
| Retry semantics | consumer + `processJob` | Retryable = no HTTP status or ≥ 500 (unchanged). Attempt < `BILATERAL_AI_MAX_ATTEMPTS` (default 3): stay `PROCESSING`, `retrying = 1`, `stage = queued`, keep `error_*`; nack requeue. Final: `FAILED` + notify + ack. `processJob` accepts jobs in `PENDING` **or** `PROCESSING & retrying`. **The consumer reads the attempt ceiling from the same `BILATERAL_AI_MAX_ATTEMPTS` env as `processJob`** — no hardcoded `maxRetries = 3`; two independent ceilings strand a `retrying = 1` job that the consumer stops requeueing and the service still considers retryable. |
| Timeout & stall sweeper | `bilateral-ai-sweeper.cron.ts` (`@Cron('* * * * *')`, guarded by `isBilateralAiProcessingQueueConfigured()`) | **Attempt timeout** — `BILATERAL_AI_ATTEMPT_TIMEOUT_MS` default **15 min** (mining HTTP timeout 10 min + 5 min margin), measured from the current attempt's `started_date`; it catches a consumer or process that died mid-attempt. Whole-job worst case = `max_attempts × 15 min` = 45 min. **Stall** — `BILATERAL_AI_QUEUE_STALL_MS` default 30 min, and `QUEUE_STALLED` fires only when **both** hold: (a) the oldest `PENDING` job's `queue_entry_date = COALESCE(retried_date, created_date)` is older than the window, **and** (b) no row in `bilateral_ai_jobs` has a `started_date` or a `stage_updated_date` inside that same window — i.e. no worker activity at all. Condition (b) is the whole point: with `prefetchCount: 1` a job legitimately waits while jobs ahead of it run, so age alone would kill healthy queued jobs. Each flip is a conditional update; notify only when the update affected 1 row. |
| Late completion | `processJob` COMPLETED branch | If the row is `FAILED/TIMED_OUT` when the mining response arrives, still create drafts, set `COMPLETED`, and notify with `late = true` (results-ready mail variant). **Idempotency, before any write:** for candidate *i*, look up an existing draft for `(job_id, candidate_index)`; if one is found, reuse its `result_id` and skip creation entirely — do not create a `Result` row first and let a constraint reject the draft, which would leave an orphan `Result` and throw the job to `FAILED`. Only once that lookup-first path exists may M1 add the unique index on `(job_id, candidate_index)`; the index is a backstop for the lookup, never the mechanism. |
| Terminal notifications | new `notifyTerminal(job, outcome)` | Exactly once per terminal transition (guarded by the 1-row update). In-app row written **directly** by the new `emitBilateralAiJobNotification(userId, outcome)` (§6.4) — not through `emitResultNotification`. Mail via the existing handlebars/template path iff `terminal_date − queue_entry_date ≥ 2 min`, where `queue_entry_date = COALESCE(retried_date, created_date)`, so a retried job is measured from the retry. Failures are logged at `warn`, never thrown. |
| Retry endpoint | `retryJob(jobId, user)` | Owner check → status check → `HEAD` each S3 key (410 on the first miss) → reset (`status=PENDING, stage=queued, attempts=0, retrying=0, error_*=null, started_date=null, completed_date=null, retried_date=now`) → publish. Setting `retried_date` moves `queue_entry_date` to the retry moment, which is what keeps the sweeper from re-flipping the job on its next pass (a job that kept its original `created_date` would already be older than the stall window the instant it was re-enqueued) and what restarts the client's elapsed timer and the job's queue position. |
| Expectations | `getExpectations(mix)` | `SELECT PERCENTILE`-equivalent via ordered subquery on `TIMESTAMPDIFF(SECOND, started_date, completed_date)` for `COMPLETED` jobs in the last 90 days with the same mix class. **Two classes only:** `audio_keys` empty → `documents`; any audio key present → `audio` (a document + audio job is `audio`, because audio is what makes it slow). 10-min in-memory cache per mix; `null` percentiles when `sampleSize < 5`. |
| Logging | all | `warn` for stalls/timeouts/notification failures with `jobId`, `error_code`, counts — never emails, keys or payloads (AC-9). |

---

## 6. Frontend Plan

### 6.1 Routes / modules

No new routes. The upload step accepts `?job=<id>` (already used by the notification deep link) to open the panel for a specific job.

### 6.2 Components & services

| Unit | Kind | Responsibility |
|---|---|---|
| `bilateral-ai-job.model.ts` | pure module | `normalizeJob(raw)` (ids/dates/booleans from the real payload — `KZ-…-center-strip-and-phase-1`), including `queueEntryDate = retried_date ?? created_date`; `buildStepperModel(job)` → the **6 UI steps** with `done / active / pending / estimated` flags from `status + stage + source mix` (the three server reading values map to one step); `elapsedSeconds(job, now)` measured from `queueEntryDate`, not `created_date`, so a retry restarts the timer; `mixClass(job)` → `documents \| audio`; `errorCopy(error_code)` table (`APF-R-8` C) with a **default arm** — an unmapped code renders "The AI service reported an error ({code}). Try again or contact support." The server can emit any `HTTP_<status>`, so the eight mapped codes are the known set, not the possible set, and a missing arm would render an empty failure block. |
| `AiProcessingPanelComponent` | standalone, presentational (`components/ai-processing-panel/`) | Inputs: normalized job, expectation, `now` tick. Renders stepper, elapsed `mm:ss`, expected range or fallback copy, queue position, attempt/retrying badge, source mix line, "you can leave" line, terminal outcomes (success / no candidates / failed with `errorCopy`) and the **still-running** state; emits `retry`, `openDrafts`, `reset`. `aria-live="polite"` region for stage/outcome text. **Input-driven with no internal loading state:** it owns no request and no spinner, so a poll that changes `queue_position` or `stage` re-renders the bound values in place — there is no skeleton or empty frame between polls (`APF-R-6` A AND-IT-MUST). Exemplar for tokens/controls: `overview-controls.component.html` (trigger/button styling), `bilateral-progress-aside` (step list). |
| `BilateralAiService` (modified) | root | `normalizeJob` on every poll; adaptive interval (5 s → 15 s after 2 min → 30 s in still-running), measured from `queueEntryDate`; ceiling → `status: 'still_running'` (no failure); `panelVisible` signal (set/unset by the upload component on mount/destroy) gates `announce()` → dialog suppressed while visible; resume record `{ jobId, startedAt, centerAcronym }` kept until terminal or a drop condition; `retryJob(jobId)` calls the endpoint and restarts polling on the same id; `expectations(mix)` cached per session for the two mix classes. **`pollJob` branches on the HTTP status of a failed poll** — this is the terminating condition that replaces the removed ceiling, so it is specified, not inherited: **404 / 410** → the job is gone, drop the resume record and stop the timer; **401** → stop silently, the session is gone and a retry would only produce more 401s; **anything else** (network blip, 500, 503) → keep polling on the current interval. Today's poller swallows every error identically, so all three arms are new behaviour. |
| `BilateralAiUploadComponent` (modified) | existing | Replaces its inline processing/failed/no-candidates blocks with `<app-ai-processing-panel>`; "Try again" → `service.retryJob`; on 410 → back to the form with the message. |
| `BilateralAiCompletionDialogComponent` (modified) | existing | Adds the provenance line on success; unchanged otherwise (suppression lives in the service). |
| `BilateralPageHeaderComponent` (modified) | existing | Chip `app-ai-job-chip` (inline template or tiny component): visible iff a job is alive **for this center**; text "AI job running · mm:ss" (elapsed from the record), `routerLink` to `/bilateral/<acronym>/create` with `queryParams { job }`; `motion-reduce:` no pulse. Sits left of the drafts badge in the tab row (`nav` end slot). |
| `AiProvenanceNoticeComponent` | standalone (`components/ai-provenance-notice/`) | `variant: 'banner' | 'badge' | 'line'`; copy from one constant (`APF-OQ-2` overrides text only); info token pair; badge carries the full sentence as `aria-label`/`title`. Used on: drafts list header (line), draft card (badge — replaces the ad-hoc `bp-ai-badge` copy), editor (banner, dismissible per session via `sessionStorage`), detail (badge), completion dialog (line). |
| Set-up step (modified) | existing (`bilateral-result-creator` / SP selector section) | "Contributing Science Programs — coming soon" wrapped in `bilateral-accordion` collapsed by default. |
| `BilateralApiService` (+2) | shared | `POST_bilateralAiJobRetry(jobId)`, `GET_bilateralAiJobExpectations(mix)`. |

**State boundary:** job state in `BilateralAiService` (root); panel visibility in the same service (single source for the surface rule); expectation cache per session in the service; provenance is a pure function of `creation_method`/draft-ness — no new store.

### 6.3 Design system usage

- **Stepper:** **6 UI steps against the 8 server `stage` values** (§3.1) — `Queued · Uploading · Reading / Transcribing · Extracting · Validating · Creating drafts`; the server's `reading`, `transcribing` and `reading_transcribing` all light the third step, and the source mix decides its label. Vertical on `< 640 px`, horizontal ≥ 640 px (`min-[640px]:` only — no named breakpoints in this component); step dot 20 px, done = filled `--pr-color-primary-300` with `check`, active = ring `--pr-color-primary-300` + pulse (`motion-reduce:animate-none`), pending = `--pr-border`; estimated steps show a dotted connector + "estimated" caption in `--pr-text-subtle`.
- **Elapsed / range:** `font-mono tabular-nums`, `--pr-text-heading` for elapsed, `--pr-text-secondary` for range copy.
- **Badges:** queue position and attempt use the info pair (`--pr-status-submitted-fg/bg`); no status colours for progress (hard rule 9 spirit).
- **Outcomes:** success = existing `pr-dialog--promote` identity; failed = icon disc in `--pr-danger` on `--pr-danger-soft`, sitting on a `--pr-danger-bg` surface where a surrounding block is needed, + one-line cause + primary "Try again" + ghost "Upload different files"; no candidates = neutral info; still running = info with the two channels named. All ≤ 160 px tall blocks except the stepper card. (The `--pr-status-rejected-*` pair does not exist in `colors.scss` — the danger family is the failure palette; see the token-existence gate, `APF-AC-19`.)
- **Chip:** `h-[24px] rounded-full border border-[var(--pr-border)] bg-[var(--pr-surface-card)] px-[8px] text-[11.5px]`, `auto_awesome` icon 14 px, elapsed in `tabular-nums`; focus ring + solid focus border like `overview-controls`.
- **Provenance notice:** banner `bg-[var(--pr-status-submitted-bg)] text-[var(--pr-status-submitted-fg)] border-l-4`, icon `auto_awesome`; badge = pill same pair; line = 12.5 px secondary text with the icon.
- **Icons:** `material-icons-round` (`auto_awesome`, `schedule`, `check`, `refresh`, `error_outline`, `info`). Tokens only; grep gates.
- **Copy (English literals):** "Queued · {n} jobs ahead of you · waiting for a free AI worker" · "Uploading your sources to the AI service" · "Reading your documents (estimated)" · "Transcribing audio (estimated)" · "Extracting results (estimated)" · "Validating and mapping" · "Creating drafts" · "Retrying (attempt 2 of 3) — the AI service did not answer; trying again" · "Still running — we'll notify you here and by email when it finishes" · "You can leave this page. We'll notify you here and by email." · provenance default: "Generated with AI assistance from your sources. Review and edit before submitting."

### 6.4 Notification UX

In-app bell rows (existing notifications page) get a new type rendered with the `auto_awesome` icon: "AI-assisted processing finished — {n} drafts ready for {center} · 2 documents · 6 min" / "…found no results" / "…failed: {plain cause}" / "…drafts arrived after all". Every row carries the **source mix and the duration** (`{n} documents` / `{n} audio files`, and whole minutes from `queue_entry_date` to the terminal date), which is what satisfies `APF-R-22` without a second copy table. Mail bodies mirror the rows and link to the Drafts tab or the upload step.

**Write path.** A row for `notification_type = BILATERAL_AI_JOB_FINISHED` is written **directly**, the way `emitApplicationAnouncement` writes its rows — not through `emitResultNotification`. Two properties of that emitter make it unusable here: it requires a result to hang the row on, and it drops every recipient equal to the emitter, which is exactly the uploader this notification is addressed to. The row is `result_id NULL`, `target_user = job.user_id`, `text` = the outcome copy above, plus the deep link (`/bilateral/<acronym>/drafts` on success, `/bilateral/<acronym>/create?job=<id>` on failure). A call-count mock on the old emitter would pass while nothing was persisted, so the test asserts the **persisted row** (§10).

**Read path.** `getAllNotifications`, the pop-ups and the recent-activity feed all `innerJoin` the result and require `obj_result_by_initiatives.initiative_role_id = 1`. A job row has no result at all, and AI results link through `results_by_projects` rather than initiatives, so an unmodified read path renders nothing and `APF-R-4` is unmeetable however correctly the row was written. Each of those read paths gains a branch for this notification type: `LEFT JOIN` the result instead of `innerJoin`, and **no** `obj_result_by_initiatives` requirement. This is the only server change outside `api/bilateral-ai/` and `api/notification/`'s emit surface, and it is what the "visible in the bell" acceptance in `APF-R-4` is measured against.

---

## 7. Security & Authorization

- Retry endpoint: JWT + owner check (`job.user_id === user.id`), 403 otherwise; no admin bypass in v1.
- `queue_position` counts jobs across users but exposes only a number.
- Expectations endpoint returns aggregates only.
- AC-9: sweeper and notification logs carry `jobId`, codes, counts — no emails, S3 keys, file names or mining payloads.
- Mail templates render only counts, center acronym and links (as today).

---

## 8. Performance & Capacity

- `getJob`: +1 indexed count query (`status IN (PENDING, PROCESSING) AND COALESCE(retried_date, created_date) < :myQueueEntryDate`) — the queue-entry clock, so a retried job counts from its retry and not from its original upload. P95 < 150 ms on prtest (measured in T-final HITL with the DB reachable; not evidence if the DB is remote-throttled — report the spread). — served by `IDX_bilateral_ai_jobs_status_queue_entry` (M1 generated column).
- Sweeper: two indexed range scans per minute; < 1 s at 10k rows.
- Client: one poll timer shared by panel and chip; intervals 5/15/30 s; the elapsed tick is a 1 s `setInterval` that only updates a signal (no HTTP).
- Expectations: one aggregate query per mix per 10 min per process.

---

## 9. Observability

- Server logs: `info` on stage transitions (jobId, stage), `warn` on TIMED_OUT/QUEUE_STALLED/notification failure, `error` on final FAILED — structured, no payloads.
- Row fields (`stage_updated_date`, `retried_date`, `error_code`) make a stuck job diagnosable from the table alone.
- Client: no new logging; states are visible in the panel.

---

## 10. Testing Plan (forward-looking)

| Layer | Strategy |
|---|---|
| **Server unit** | `processJob` stage sequence per source mix (the 8 `stage` values); conditional-update semantics (repository mock asserting `WHERE status`); **attempt-start statement preserves `error_code`/`error_message` and sets `retrying = 0`**; **attempt-start affecting 0 rows → `processJob` returns and the mining client is never called**; **the consumer's attempt ceiling comes from `BILATERAL_AI_MAX_ATTEMPTS`, not a literal 3 (set the env to 2 and assert the consumer stops requeueing at 2)**; retry keeps `PROCESSING`; final failure notifies once; late completion after `TIMED_OUT` creates drafts + `late` mail; **a second run of the late-completion branch reuses the existing draft for `(job_id, candidate_index)` and creates no duplicate `Result` rows**; sweeper flips a `PROCESSING` job only outside the 15-min attempt window; **sweeper does NOT flip an old `PENDING` job while another row has a recent `started_date` / `stage_updated_date`, and does flip it when nothing anywhere moved**; `retryJob` 202/409/403/410 and `retried_date` set; `getExpectations` percentiles for the two mix classes + `< 5` samples → nulls; 2-minute mail rule measured from `queue_entry_date`. Notification: **the persisted row is asserted (`result_id NULL`, `target_user = job.user_id`, outcome text with mix + duration) — not a call count — and is then read back through the read endpoint to prove it is visible in the bell.** |
| **Server contract** | DTO/response snapshot of `getJob` vs `bilateral-result-summaries.en.md` change log (Reviewer check). Controller test: `GET center/ai/expectations?mix=documents` resolves to the expectations handler and **does not shadow or get shadowed by `jobs/:jobId`** (a request for `jobs/expectations` must not reach the job handler with `jobId = 'expectations'`). |
| **Client pure** | `normalizeJob` from **captured real responses** (string `attempts`, `retrying: 0/1`, ISO dates), including `queueEntryDate` falling back to `created_date` when `retried_date` is null and the elapsed time restarting after a retry; `buildStepperModel` per status/stage/mix — all 8 server `stage` values map onto the 6 UI steps; `errorCopy` per code (table-driven) **plus one unmapped code (`HTTP_418`) hitting the default arm**. |
| **Client service** | fake timers: 30 min alive → `still_running`, interval 30 s, record kept; terminal → record dropped; **404 and 410 → record dropped and the timer stopped (polling stops); 401 → stops silently; 500 → polling continues**; `panelVisible` true → no `completionNotice`; false → notice; `retryJob` restarts polling same id; adaptive intervals. |
| **Client components** | panel: each state renders the documented copy, no `%`, `aria-live` text changes, buttons named; **a poll that only changes `queue_position` re-renders the number in place with no skeleton and no loading frame** (`APF-R-6` A); upload: terminal inline only; dialog: provenance line; header: chip iff alive for this center, name includes elapsed, hidden after terminal, **rendered left of the drafts badge**; provenance notice on the five surfaces (present for AI, absent for manual); set-up disclosure collapsed. |
| **CT** | panel at 1280 / 900 / 375 (stepper orientation switch at 640, no horizontal scroll, block heights ≤ 160 px for outcome states); header with chip at 375 (no tab-strip overflow). **Reduced motion:** stub `matchMedia` for `prefers-reduced-motion: reduce` in `onBeforeLoad`, mount the panel and the header, assert the active step dot and the chip carry no animation class and compute to `animation-name: none` (`requirements.md` §9 D10 — jsdom cannot evaluate the query). |
| **Live HITL (prtest)** | two accounts start jobs 30 s apart (doc + audio): queue position 1 visible; stage progression; chip on Reporting/Results tabs; leave and return; one outcome surface; mail received once; notification row; retry a failed job (force with a bad key) → 202 same id; 410 path by deleting a key. Inconclusive if the consumer is not running on prtest — check `started_date` moves first. |
| **Compile gates** | `tsc --noEmit -p tsconfig.app.json` per client task; `build:dev` once; `migration:check` before client tasks. |

---

## 11. Backwards Compatibility & Migration Plan

- Additive columns with defaults; existing rows read `stage = queued`, `retrying = 0`.
- Old clients ignore new fields; the removed client-side timeout copy affects only the new client.
- Rollout: server first (migrations M1–M3 + code) — the old client keeps working on the new server; then the client.
- Rollback: revert client; revert server code (sweeper stops); migrations' `down` drops columns/rows. Jobs flipped to `TIMED_OUT`/`QUEUE_STALLED` remain `FAILED` rows (harmless).
- No feature flag; the sweeper is inert when the queue env is not configured (same guard as the consumer).

---

## 12. Design Decisions (ADRs)

### `APF-DD-1` — Stages are set by PRMS and labelled "estimated" where inferred

- **Context:** the mining call is one opaque HTTP request; real progress needs callbacks the mining team does not expose (`APF-OQ-3`). **Covers: `APF-R-1` B, `APF-R-6` B, `APF-R-31`.**
- **Decision:** `stage` advances at PRMS-controlled points; the three stages inside the mining call are pre-set from the source mix and rendered with an "estimated" caption; no percentage anywhere.
- **Alternatives:** (a) wait for mining callbacks — blocks on another team; (b) a fake time-based progress bar — dishonest, the exact complaint we are fixing.
- **Consequences:** coarse but truthful progress; a clean seam (`stage`) for `APF-R-31`.

### `APF-DD-2` — LITE tier: cron sweeper in the API process, no new topology

- **Context:** stuck jobs need a resolver; options range from a cron to a dedicated worker service or RMQ dead-letter/TTL exchanges. **Covers: `APF-R-2` A/B/C, `APF-US-5`.**
- **Decision:** `@Cron` sweeper in the API process (precedent `webhook-dispatch.cron.ts`), guarded by the queue env; conditional updates make multi-instance runs safe.
- **Robust-vs-Lite gate:** triggers examined — independent scaling (no: jobs are minutes, volume tens/day), divergent availability (no), regulatory isolation (no), measure a monolith cannot meet (no). → LITE. Revisit condition recorded: if jobs/day exceed ~500 or the API is scaled to > 3 instances, move the consumer + sweeper to a worker deployable.
- **Alternatives:** RMQ TTL + dead-letter (handles stall but not processing timeout; more broker config); separate worker (Robust, unjustified).

### `APF-DD-3` — Retries stay `PROCESSING`; `FAILED` is terminal only

- **Context:** today a retryable error flips `FAILED` then back to `PROCESSING`, so the client can observe a false terminal state. **Covers: `APF-R-3`, `APF-R-6` C.**
- **Decision:** `retrying = 1` + `stage = queued` during requeue; `FAILED` only after the final attempt.
- **Reversion challenge (§2.3 of the command — this removes a delivered behaviour):** *what does removing the FAILED bounce break?* (1) Callers reading `FAILED` mid-retry: only the client poller (which showed "failed" then "processing" — a bug). (2) **The attempt-start statement can no longer clear `error_code`/`error_message`** — with no `FAILED` bounce, those two fields are the only record of the last error, and the retry panel reads them; they are preserved on attempt start and cleared only by a successful terminal transition or `retryJob`. (3) **Nothing else resets `retrying` to 0** once the bounce through `FAILED` is gone, so the attempt-start statement sets it in the same `UPDATE`. (4) **The attempt-start conditional update can now legitimately affect 0 rows** (the sweeper flipped the job to `TIMED_OUT` while the message sat in the queue), which previously could not happen; `processJob` returns immediately on that miss rather than calling mining for a terminated job. (5) The consumer's hardcoded `maxRetries = 3` becomes a second, independent ceiling next to `BILATERAL_AI_MAX_ATTEMPTS`; both now read the same env. (6) The consumer's `getJobRaw` attempts check is unaffected. (7) The existing `bilateral-ai.service.spec.ts` cases asserting the bounce (if any) are rewritten. **Outcome: proceed** — items 2–5 are specified in §5 and tested in §10.
- **Consequences:** `processJob` must accept `PROCESSING & retrying` rows; `started_date` is reset per attempt, so the sweeper's timeout is **per attempt** (`BILATERAL_AI_ATTEMPT_TIMEOUT_MS`, 15 min = the 10-min mining HTTP timeout + 5 min margin) and exists to catch a consumer that died mid-attempt. Whole-job worst case = `max_attempts × 15 min` = 45 min, documented in the range copy and in `APF-R-2` A.

### `APF-DD-4` — One notification per terminal state, in-app always, mail after 2 minutes

- **Context:** today only success mails; failures/no-candidates are silent for a user who left. **Covers: `APF-R-4`, `APF-R-22`.**
- **Decision:** new notification type `BILATERAL_AI_JOB_FINISHED` with an outcome payload; templates for no-candidates and failed; `late` variant on results-ready; 2-minute rule for mail evaluated server-side.
- **Alternatives:** mail always (spam for quick jobs); in-app only (misses users who log out).
- **Consequences:** two data migrations; the notifications page renders one more type.

### `APF-DD-5` — Retry re-enqueues stored sources; never re-uploads

- **Context:** "Try again" re-uploads everything and can create a duplicate job while the first is alive. **Covers: `APF-R-5`, `APF-R-9`.**
- **Decision:** `POST …/retry` resets the same row and republishes; 409 while alive; 410 when a key is gone (files expire by bucket policy).
- **Consequences:** the client keeps the same `jobId`; the resume record survives the retry.

### `APF-DD-6` — The client never declares a terminal state (**reversion — challenged**)

- **Context:** `MAX_POLL_DURATION` produced "Processing timed out" with no server truth behind it (D-1). **Covers: `APF-R-7`.**
- **Decision:** the ceiling switches to `still_running` (slower polling, record kept); terminal states come only from the server (which now has its own timeout, `APF-DD-2`).
- **Reversion challenge:** *what does removing the client timeout break?* (1) **The only terminating condition polling had.** The ceiling was what stopped eternal polling for a row the server lost; today's poller swallows every HTTP error identically, so nothing else would ever stop the timer. It is replaced by an explicit status branch in `pollJob` (§6.2): 404/410 → drop the record and stop; 401 → stop silently; anything else → keep polling. This is new behaviour that must be written, not a property the code already has. (2) `bilateral-ai.service.spec.ts` cases that assert the timed-out copy — rewritten to assert `still_running`. (3) Nothing else reads `status === 'failed'` from the ceiling path. **Outcome: proceed** — item 1 is specified in §6.2 and tested in §10.

### `APF-DD-7` — One outcome surface, decided by panel visibility in the service

- **Context:** panel and dialog both fire from `announce()`. **Covers: `APF-R-8` A/B.**
- **Decision:** the upload component registers `panelVisible` on mount/destroy; `announce()` sets `completionNotice` only when the panel is not visible. The panel renders the outcome itself.
- **Alternatives:** route-based check (`/create` in URL) — brittle with the drawer host; suppress the panel instead (loses the in-context outcome).

### `APF-DD-8` — Chip in the header, driven by the same service signal

- **Context:** the user asked whether they can leave; today nothing tells them a job is alive once they navigate. **Covers: `APF-R-10`, `APF-US-2`.**
- **Decision:** `bilateral-page-header` renders the chip from `uploadState()` + resume record when `centerAcronym` matches; links to the panel via `?job=`.
- **Alternatives:** a global toast (dismissed and gone); a sidebar indicator (outside the center context).

### `APF-DD-9` — Expected range from job history, served by the API

- **Context:** an expectation must be true (`requirements.md` §7 Honesty). **Covers: `APF-R-6` D, `APF-R-21`.**
- **Decision:** P25–P75 of `completed − started` per mix class over 90 days, ≥ 5 samples, 10-min cache; otherwise fallback copy.
- **Alternatives:** hard-coded "2–5 min" (false the day audio arrives); client-side estimate from the drafts it can see (partial data).

### `APF-DD-10` — One provenance component, five surfaces, one sentence

- **Context:** provenance today is a drafts-only badge with ad-hoc copy. **Covers: `APF-R-12`, `APF-US-4`.**
- **Decision:** `AiProvenanceNoticeComponent` with three variants and a single copy constant; presence keyed on `creation_method = 'AI'` / draft-ness; persists after edits.
- **Alternatives:** per-surface strings (drift); a status colour (semantics collision — hard rule 9).

### `APF-DD-11` — Collapse "coming soon" with `bilateral-accordion`

- **Context:** a non-actionable block sits inside a decision step. **Covers: `APF-R-11`.**
- **Decision:** wrap it in the existing accordion, collapsed by default; no new component.
- **Alternatives:** remove (loses the roadmap signal the product team wanted visible).

---

## 13. Open Gaps & Follow-ups

- `APF-OQ-2` copy: design ships the default sentence; product may override the text before the transparency task closes.
- `APF-OQ-6` **resolved:** the timeout is per attempt, `BILATERAL_AI_ATTEMPT_TIMEOUT_MS` default 15 min; ops may tune via env. Not an open gap any more — recorded here only as the pointer.
- `APF-R-30` cancel and `APF-R-31` callbacks deferred.
- Follow-up outside this spec: `bilateral-results-list` `asCurrentResult` string-id compare (archive item from `center-overview-tab`).

---

## 14. Budget (Step 2.4)

| Signal | Estimate |
|---|---|
| **Tasks** | 10 (M: migrations · S: consumer/retry semantics · M: sweeper + notifications · S: retry + expectations endpoints · S: contract doc · M: client model + service · L: processing panel + upload integration · S: header chip · M: provenance notice ×5 + set-up disclosure · M: CT + HITL + guide) |
| **LOC** | ~5,000 total — server production ~850 (Judgment Day round 1 added ~150: the notification read-path branch in §6.4 and the lookup-first draft upsert in §5) · server tests ~900 · client production ~1,300 (panel ~450, model ~200, service ~250, notice ~120, chip ~60, edits ~220) · client tests ~1,700 (1.3× — `KZ-REH-1`) · CT ~120 · docs ~80 |
| **Review rounds** | ≤ 1 per task (10 max); a second FAIL escalates |
| **Depth check** | Phase 0 said Standard; the finished design carries a schema migration, two data migrations, a contract change under `/api/bilateral/*`, a cron and notifications → **Full** (this document already carries rollout, rollback, observability). Not a split: the server and client halves share the status contract and ship in two chained PRs. |

**Scope constants this budget assumes:** **6 UI steps / 8 server `stage` values** (§3.1, §6.3), **2 mix classes**, **1 attempt timeout of 15 min** with a 45-min whole-job worst case, and **5 provenance surfaces**. A change to any of them moves the panel and model estimates.

`/akili-execute` treats these as a tripwire: > 50 % over → report the delta at the task boundary and stop for the user unless the spec is `pre-approved`. Runtime rules per project feedback: targeted `npx jest <path>`, `tsc --noEmit` per client task, module CT once per template task, plain-language progress line per task boundary.

---

## Required cross-references

- `docs/specs/bilateral/ai-processing-feedback/requirements.md` · `proposal.md` · `mockup/ai-processing-panel.html`
- `docs/prd.md` (US-P1, AC-3, AC-9) · `docs/ux-ui/design.md` (§7, §8, §10) · `docs/trd/trd.md` (§6, §8, §9)
- `onecgiar-pr-server/src/api/bilateral/CLAUDE.md` §6, §7.5 · `onecgiar-pr-server/docs/bilateral-result-summaries.en.md`
- `onecgiar-pr-client/CLAUDE.md` §5 · `docs/specs/archive/2026-07-31-bilateral-ai-workflow/bilateral-ai-integration-handoff.md`
