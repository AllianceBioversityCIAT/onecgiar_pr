# Tasks — AI-Assisted Creation: Processing Feedback, Job Lifecycle and Transparency

## 1. Scope of this task list

| Field | Value |
|---|---|
| **Module / feature** | `bilateral` / `ai-processing-feedback` |
| **Linked spec** | `requirements.md` + `design.md` (same folder) · `proposal.md` · `mockup/ai-processing-panel.html` · `judgment.md` (JD round 1 applied) |
| **Depth** | Full · **Budget (design §14):** 10 tasks · ~5,000 LOC · ≤ 1 Reviewer round per task (second FAIL escalates) |
| **Approval Mode** | gated (inherited) — say "pre-approved" at execute start to auto-pass routine gates |
| **Status** | not-started |
| **Owner / driver** | Juan Carlos Cadavid |
| **Ticket** | `APF-OQ-1` — until a Jira id exists commits use `[SPEC:bilateral/ai-processing-feedback]` |
| **Execution runtime rules** (project feedback, inherited by every brief) | targeted `npx jest <path> --silent` only · server lint `npx eslint "<files>" --quiet` · client lint `npx ng lint --quiet` · `npx tsc --noEmit -p tsconfig.app.json` on every client task · module CT once per task that touches templates · `npm run migration:check` before the first client task · plain-language progress line at every task boundary · pointer briefs, not anthologies · fixtures built from **captured real payloads** (string ids/dates, `0/1` booleans — `KZ-changes--bilateral-review-center-strip-and-phase-1`) |
| **Skill Map** (`.agents/model-routing.md`) | server → `nestjs-expert` (+ `tdd` for lifecycle/sweeper/notifications) · client logic → `angular-developer` + `tdd` · client UI → `angular-developer` + `ui-ux-pro-max` (fallback `frontend-design`) + `tailwind-design-system`, **read `onecgiar-pr-client/CLAUDE.md` §5 before markup** · API → `api-design-principles` for the two new routes |
| **Contract freeze** | `design.md` §4.1 (job payload fields, `retry`, `expectations`) and §3.1 (8 `stage` values) are frozen for both halves; the client builds against them from `APF-T-5` on and integration is proven in `APF-T-10` |

---

## 2. Pre-flight checklist

- [ ] `requirements.md` status `approved — JD round 1 applied`; `design.md` approved with JD fixes; `judgment.md` status `approved (fix-only)`.
- [ ] Open questions: `APF-OQ-6` resolved (15 min per attempt); `APF-OQ-2` copy default in design §6.3 (product may override text before `APF-T-8` closes); `APF-OQ-1` Jira id — does not block.
- [ ] **Migrations are serialized:** `APF-T-1` is the only migration-bearing task; `npm run migration:check` green before any client task.
- [ ] **Conflicting in-flight specs:** `bilateral/webhook-external-platforms` (server `api/bilateral` webhook controller) — no shared files with `api/bilateral-ai/*`; check `git status` for uncommitted edits in `pages/bilateral/components/bilateral-ai-upload`, `bilateral-page-header`, `my-draft-results`, `bilateral-result-creator` before `APF-T-6/7/8`; if present, the Leader pauses that task until they land (shared-worktree rule).
- [ ] Env on the target environment for HITL: `RABBITMQ_URL`, `BILATERAL_AI_PROCESSING_QUEUE`, mining URL/key present; consumer running (a fresh job's `started_date` moves) — otherwise `APF-T-10` is inconclusive by definition.
- [ ] Email microservice reachable on prtest (a results-ready mail arrives today) — otherwise the mail rows of the HITL are recorded as not observed.
- [ ] Provider quotas: keep the opus/sonnet/session-model rotation available (previous run lost four workers to session limits).

---

## 3. Task list

### `APF-T-1` — Schema + data migrations, entity fields, config constants

- **Type:** `db` + `server`
- **Description:** M1 (columns `stage` varchar(32) default `queued`, `stage_updated_date`, `retrying` tinyint default 0, `retried_date`; STORED generated column `queue_entry_date = COALESCE(retried_date, created_date)`; indexes `(status, started_date)` and `(status, queue_entry_date)`; unique index on `bilateral_ai_drafts (job_id, candidate_index)` **only if** the lookup-first reuse of `APF-T-2` is the code path — the index is a backstop, not the mechanism). M2 `notifications_type` row `Bilateral AI Job Finished`. M3 mail templates `email_template_bilateral_ai_no_candidates`, `email_template_bilateral_ai_failed`, and the `{{#if late}}` block in the results-ready template (previous body preserved in `down`). Entity updated; `NotificationTypeEnum.BILATERAL_AI_JOB_FINISHED`; `EmailTemplate` enum entries; config module reads `BILATERAL_AI_MAX_ATTEMPTS` (3), `BILATERAL_AI_ATTEMPT_TIMEOUT_MS` (15 min), `BILATERAL_AI_QUEUE_STALL_MS` (30 min) with defaults.
- **Implements:** data prerequisites of `APF-R-1`, `APF-R-2`, `APF-R-3`, `APF-R-4` (templates/type), `APF-R-5` (`retried_date`); no scenario closes here.
- **Design refs:** §3.1, §3.2 (M1–M3), §5 config, `APF-DD-3`, `APF-DD-4`
- **Files (expected):** `onecgiar-pr-server/src/migrations/<ts>-AddBilateralAiJobStage.ts`, `…-AddBilateralAiJobFinishedNotificationType.ts`, `…-AddBilateralAiTerminalEmailTemplates.ts`, `src/api/bilateral-ai/entities/bilateral-ai-job.entity.ts`, `src/api/notification/enum/notification.enum.ts`, `src/shared/microservices/email-notification-management/enum/email-notification.enum.ts`, `src/api/bilateral-ai/bilateral-ai.config.ts` (new, tiny)
- **Depends on:** — · **Blocks:** `APF-T-2`, `APF-T-3`, `APF-T-4`
- **Estimate:** M
- **Skills:** `nestjs-expert`
- **Tests:** migration spec pattern of the repo (up/down idempotent on a fresh schema if the repo has one; otherwise `migration:check` + a unit test on the config module defaults and env overrides).
- **Verification:** `cd onecgiar-pr-server && npm run migration:check && npx jest src/api/bilateral-ai/bilateral-ai.config.spec.ts --silent && npx eslint "src/migrations/*BilateralAi*.ts" "src/api/bilateral-ai/**/*.ts" --quiet`
- **Input that would make the check fail:** a `down` that drops the generated column before the index; a template `down` that deletes instead of restoring the results-ready body; `BILATERAL_AI_ATTEMPT_TIMEOUT_MS` defaulting to 35 min (the superseded value).
- **What this cannot prove / disqualifier:** `migration:check` proves pending-state bookkeeping, not that the migration ran on prtest — the live proof is `APF-T-10`'s `DESCRIBE bilateral_ai_jobs`. A green run with the `down` never executed is not evidence of reversibility; run `down` once locally and paste the row count.
- **Status:** `[x]` PASS — 2026-09-15, attempt 1 (see `execution.md`; `migration:check` shows the 3 migrations Pending by design — not run against the shared dev DB; live proof in `APF-T-10`)
- **Definition of done:**
  - [x] `migration:check` green; config spec green; lint clean.
  - [x] Entity, enums and config exported; no other service edited.
  - [x] Commit: `🗃️ feat(bilateral-ai) [<ticket>]: job stage, queue-entry clock, retry fields; notification type and terminal mail templates`.

### `APF-T-2` — `processJob` lifecycle: stages, conditional transitions, retry semantics, late-completion reuse, richer `getJob`

- **Type:** `server`
- **Description:** Attempt-start conditional update (`WHERE status IN (PENDING, PROCESSING & retrying)`, sets `PROCESSING`, `stage = uploading`, `attempts + 1`, `retrying = 0`, `started_date`, **preserves** `error_*`; 0 rows → return, mining never called); stage advancement (`reading | transcribing | reading_transcribing` from the mix, `extracting` before the mining call, `validating`, `creating_drafts`) each with `stage_updated_date`; retryable failure under `max_attempts` → `retrying = 1`, `stage = queued`, `error_*` recorded, status stays `PROCESSING`; final failure → `FAILED` (notify hook wired in `APF-T-3`); late-completion reuse: look up draft `(job_id, candidate_index)` before creating a `Result`, reuse `result_id`; consumer reads `BILATERAL_AI_MAX_ATTEMPTS`. `getJob` adds `stage`, `stage_updated_date`, `queue_position` (computed via `queue_entry_date`, `PENDING` only), `max_attempts`, `retrying`.
- **Implements:** `APF-R-1` A (position computed at read time, never stored) and B (stage sequence, BUT no unobservable stage claimed, AND existing fields unchanged); `APF-R-3` (scenario, BUT no `FAILED` until final, AND-IT-MUST final `FAILED` with last code); `APF-R-2` A AND-IT-MUST (late response idempotent — reuse); `APF-AC-1`, `APF-AC-2`, `APF-AC-5`; JD: JA-5, JA-9, JB-2, JB-3
- **Design refs:** §2.2, §5 (stage advancement, conditional transitions, retry semantics, late completion), `APF-DD-1`, `APF-DD-3`
- **Files (expected):** `src/api/bilateral-ai/services/bilateral-ai.service.ts` (+ spec), `src/api/bilateral-ai/bilateral-ai.consumer.ts` (+ spec), `src/api/bilateral-ai/dto/bilateral-ai-job-response.dto.ts` (new, documents the payload)
- **Depends on:** `APF-T-1` · **Blocks:** `APF-T-3`, `APF-T-4`
- **Estimate:** L
- **Skills:** `nestjs-expert`, `tdd`
- **Tests:** repository-mock spec asserting each `UPDATE`'s `WHERE status` clause and payload (attempt start preserves `error_code`/`error_message`, sets `retrying: 0`); 0-row attempt start → `textMining.extract` **not** called; stage sequence per mix (documents → `reading`, audio → `transcribing`, both → `reading_transcribing`); retryable 503 on attempt 1 → status `PROCESSING`, `retrying: 1`, `stage: queued`, error recorded; final attempt → `FAILED` with last `error_code`; late completion on a `TIMED_OUT` row → existing drafts reused, **zero** new `Result` saves for existing candidates, status `COMPLETED`; `getJob` position from a mocked count using `queue_entry_date`; consumer nack/ack decision driven by the config value (test with `max_attempts = 2`). Rewrite the existing FAILED-bounce case (`bilateral-ai.service.spec.ts` ~line 1062) to the new semantics — record the old assertion in the spec comment.
- **Verification:** `cd onecgiar-pr-server && npx jest src/api/bilateral-ai --silent && npx eslint "src/api/bilateral-ai/**/*.ts" --quiet`
- **Input that would make the check fail:** attempt-start update writing `error_code: null` (the preserve test fails); `stage` set to `extracting` after the mining call instead of before; a second `resultRepository.save` for an existing candidate index; consumer with a literal `3`.
- **What this cannot prove / disqualifier:** repository mocks prove the SQL intent, not MySQL's row-affected semantics under two processes — the multi-instance race is an accepted risk (requirements §9 D1); a mocked `queue_position` proves the expression, the live count is `APF-T-10`.
- **Status:** `[x]` PASS — 2026-09-15, attempt 1 (see `execution.md`; forward pointers to T-3/T-4 recorded there)
- **Definition of done:**
  - [x] Spec green (including the rewritten bounce case); lint clean; no controller/route change yet.
  - [x] `@akili-spec bilateral/ai-processing-feedback` comment on the conditional-update helper.
  - [x] Commit: `✨ feat(bilateral-ai) [<ticket>]: job stages, conditional transitions, retries stay PROCESSING, late-completion reuse`.

### `APF-T-3` — Sweeper cron, terminal notifications (in-app direct rows + mail rule), notification read-path branch

- **Type:** `server`
- **Description:** `bilateral-ai-sweeper.cron.ts` (`@Cron` every minute, guarded by the queue env): (a) `PROCESSING & started_date < now − ATTEMPT_TIMEOUT` → `FAILED/TIMED_OUT`; (b) `PENDING & queue_entry_date < now − QUEUE_STALL` **and** no row with `started_date` or `stage_updated_date` inside the window → `FAILED/QUEUE_STALLED`; every flip conditional, notify only on 1 row affected; `warn` logs without payload. `notifyTerminal(job, outcome)`: in-app row written **directly** (`result_id NULL`, `target_user = job.user_id`, `text` with outcome + mix + duration, deep link), mail iff `terminal − queue_entry_date ≥ 2 min` via the template path (results-ready / no-candidates / failed / results-ready `late`), never throws. Wire `notifyTerminal` into `processJob`'s `COMPLETED`, final `FAILED`, and late-completion branches (`late = true`). Notification read paths (`getAllNotifications`, pop-ups, recent activity) gain a branch for `BILATERAL_AI_JOB_FINISHED`: `LEFT JOIN` result, no initiative requirement.
- **Implements:** `APF-R-2` A (scenario, BUT not inside window, AND late response re-notifies), B (scenario, BUT not merely old while others advance, AND `warn` without payload), C (one sweep per process, no double-notify); `APF-R-4` (table, scenario, BUT no mail under 2 min, AND never fail the job, AND row visible to the uploader); `APF-R-22`; `APF-AC-3`, `APF-AC-4`, `APF-AC-6`; JD: JA-1, JA-2, JB-1, JA-16, JA-11
- **Design refs:** §2.2, §5 (sweeper, terminal notifications, late completion), §6.4, `APF-DD-2`, `APF-DD-4`
- **Files (expected):** `src/api/bilateral-ai/bilateral-ai-sweeper.cron.ts` (new + spec), `src/api/bilateral-ai/services/bilateral-ai.service.ts` (+ spec: notify wiring), `src/api/bilateral-ai/services/bilateral-ai-notifications.service.ts` (new + spec — keeps `bilateral-ai.service.ts` from growing), `src/api/notification/notification.service.ts` (+ spec: emit method + read-path branch), `src/api/bilateral-ai/bilateral-ai.module.ts`
- **Depends on:** `APF-T-2` · **Blocks:** `APF-T-4`, `APF-T-10`
- **Estimate:** L
- **Skills:** `nestjs-expert`, `tdd`, `error-handling-patterns`
- **Tests:** sweeper with a repository mock and a frozen clock: `PROCESSING` 14 min old → untouched, 16 min → `TIMED_OUT`; `PENDING` 31 min old with another job advanced 5 min ago → untouched; same with no activity in 30 min → `QUEUE_STALLED`; 0-row update → no notify; notify called once per flip. `notifyTerminal`: each terminal outcome → exactly one persisted notification row (assert the saved entity: `result_id null`, `target_user`, `text` contains "2 documents · 6 min", link) and mail iff ≥ 2 min; late variant; mail failure swallowed with `warn`. Read path: a job-type row is returned by the bell query for the uploader and excluded for another user; a result-type row still requires the initiative relation (regression). Consumer + service wiring: final failure triggers one notify.
- **Verification:** `cd onecgiar-pr-server && npx jest src/api/bilateral-ai src/api/notification --silent && npx eslint "src/api/bilateral-ai/**/*.ts" "src/api/notification/**/*.ts" --quiet`
- **Input that would make the check fail:** stall check without the liveness condition (the "another job advanced" fixture flips); mail sent for a 90-second job; notification built through `emitResultNotification` (the emitter-equals-recipient drop makes the persisted-row assertion fail); read query still `innerJoin`ing `obj_result`.
- **What this cannot prove / disqualifier:** cron scheduling itself and mail delivery are not unit-testable — `APF-T-10` observes one real sweep flip (forced by a dead consumer) and one real mail; if prtest has no mail transport the mail rows are recorded as not observed, never as passed.
- **Status:** `[x]` PASS — 2026-09-15, attempt 2 (attempt 1 FAIL: sweeper windows untested with a frozen clock — see `execution.md`)
- **Definition of done:**
  - [x] Specs green; lint clean; sweeper inert when the queue env is missing (test).
  - [x] Commit: `✨ feat(bilateral-ai) [<ticket>]: sweeper for timed-out and stalled jobs; one notification per terminal state; bell read path for job rows`.

### `APF-T-4` — Retry and expectations endpoints, contract doc change log

- **Type:** `server` + `docs`
- **Description:** `POST /api/bilateral/center/ai/jobs/:jobId/retry` (owner 403 · `PENDING/PROCESSING` 409 `JOB_ALIVE` · `COMPLETED` 409 `JOB_COMPLETED` · missing S3 key 410 `SOURCES_GONE` · reset per design §5 with `retried_date = now` · republish · 202 same id). `GET /api/bilateral/center/ai/expectations?mix=documents|audio` (two classes; P25–P75 minutes over 90 days of `COMPLETED` jobs; `null` when `sampleSize < 5`; 10-min in-memory cache; 400 on bad mix) declared so it never shadows `jobs/:jobId`. Swagger for both. `bilateral-result-summaries.en.md` change-log entry for the additive `GET jobs/:jobId` fields and the two routes.
- **Implements:** `APF-R-5` (scenario, BUT 409 alive/completed, AND owner-only + no re-upload + 410); `APF-R-6` D AND-IT-MUST (served by the API) and BUT (< 5 samples → nulls); `APF-R-21`; `APF-AC-7`, `APF-AC-20`; JD: JA-7, JA-8
- **Design refs:** §4.1, §4.2, §5 (retry endpoint, expectations), `APF-DD-5`, `APF-DD-9`
- **Files (expected):** `src/api/bilateral-ai/bilateral-ai.controller.ts` (+ spec), `services/bilateral-ai.service.ts` (`retryJob`, `getExpectations` + spec), `dto/bilateral-ai-expectations.dto.ts`, `onecgiar-pr-server/docs/bilateral-result-summaries.en.md`
- **Depends on:** `APF-T-2` (`retried_date`, stage reset) · **Blocks:** `APF-T-10`
- **Estimate:** M
- **Skills:** `nestjs-expert`, `api-design-principles`
- **Tests:** controller spec: `GET center/ai/expectations` resolves to the expectations handler and `GET center/ai/jobs/expectations` still 404s as a job id (route-order proof); retry matrix 202/409/409/403/410 with the storage `HEAD` mocked; reset payload asserted (`attempts 0`, `retrying 0`, `error_* null`, `started_date null`, `retried_date` set, `created_date` untouched); expectations: 6 samples → percentiles, 4 samples → nulls, cache hit skips the query, bad mix → 400.
- **Verification:** `cd onecgiar-pr-server && npx jest src/api/bilateral-ai --silent && npx eslint "src/api/bilateral-ai/**/*.ts" --quiet && grep -n "center/ai/jobs/:jobId\|center/ai/expectations\|jobs/:jobId/retry" docs/bilateral-result-summaries.en.md`
- **Input that would make the check fail:** the expectations route declared after `jobs/:jobId` under the old path; retry allowed on `PROCESSING`; `created_date` reset on retry; three mix classes.
- **What this cannot prove / disqualifier:** S3 `HEAD` is mocked — the 410 path is exercised live in `APF-T-10` by deleting a key; percentiles are only as good as prtest's history (fallback copy expected if < 5).
- **Status:** `[x]` PASS — 2026-09-15, attempt 1 (see `execution.md`)
- **Definition of done:**
  - [x] Specs green; lint clean; change-log entry present with date and field list.
  - [x] Commit: `✨ feat(bilateral-ai) [<ticket>]: retry endpoint reusing stored sources; expectations from job history; contract change log`.

### `APF-T-5` — Client job model and service: normalization, stepper model, adaptive polling, still-running, one surface, retry, expectations

- **Type:** `client`
- **Description:** `bilateral-ai-job.model.ts` (pure): `normalizeJob` (ids/dates/booleans from captured payloads), `buildStepperModel` (6 UI steps from status/stage/mix incl. `estimated` flags), `elapsedSeconds(job, now)` from `queue_entry_date`, `mixClass` (two classes), `errorCopy(code)` with a default arm. `BilateralAiService`: normalize on each poll; intervals 5 s → 15 s (after 2 min) → 30 s (still-running); ceiling → `status: 'still_running'` (record kept); `pollJob` branches on HTTP status (404/410 → drop record + stop; 401 → stop; others → keep polling); `panelVisible` signal gating `announce()`; resume record `{ jobId, startedAt, centerAcronym }` kept until terminal/404; `retryJob(jobId)` → endpoint then restart polling on the same id; `expectations(mix)` cached per session; remove the "Processing timed out" copy. `BilateralApiService` +2 calls.
- **Implements:** `APF-R-7` (scenario, BUT no client failure, AND resume regardless of age, AND stop on 404/410); `APF-R-8` A/B (service side of the single surface); `APF-R-9` (service side: same id, disabled while alive); `APF-R-20`; `APF-R-6` C/D model parts; `APF-AC-11`, `APF-AC-13` (gate: not visible → notice set), `APF-AC-14` (copy table); JD: JA-10, JA-12 (model is input-driven), JA-13
- **Design refs:** §6.2 (model, service, API), `APF-DD-6`, `APF-DD-7`, `APF-DD-9`
- **Files (expected):** `onecgiar-pr-client/src/app/pages/bilateral/bilateral-ai-job.model.ts` (+ spec), `services/bilateral-ai.service.ts` (+ spec), `shared/services/api/bilateral-api.service.ts` (+ spec), `pages/bilateral/bilateral-ai-job.fixtures.ts` (captured `getJob` payloads: pending with position, processing per stage, retrying, failed per code, completed)
- **Depends on:** — (contract frozen in design §4.1/§3.1; runs in parallel with the server tasks) · **Blocks:** `APF-T-6`, `APF-T-7`
- **Estimate:** L
- **Skills:** `angular-developer`, `tdd`
- **Tests:** model — every fixture normalizes (string `attempts` → number, `retrying: 1` → true, ISO dates); stepper per (status, stage, mix) incl. `estimated` on the three inferred stages; `errorCopy` for the eight codes + one unmapped (`HTTP_418`) → default arm; service with fake timers — 30 min alive → `still_running`, interval 30 s, record kept; 404 → record dropped, timer stopped; 401 → stopped; 500 → keeps polling; `panelVisible` true → no `completionNotice`, false → notice; `retryJob` → API called, polling restarted same id; expectations cached (API called once per mix). Existing cases asserting the timed-out copy rewritten to `still_running` (record the old assertion in a comment).
- **Verification:** `cd onecgiar-pr-client && npx tsc --noEmit -p tsconfig.app.json && npx jest src/app/pages/bilateral/bilateral-ai-job.model.spec.ts src/app/pages/bilateral/services/bilateral-ai.service.spec.ts src/app/shared/services/api/bilateral-api.service.spec.ts --silent && npx ng lint --quiet && ! grep -rn "Processing timed out" src/app/pages/bilateral/`
- **Input that would make the check fail:** a fixture with numeric ids only (the normalization tests cannot go red — reject it); `status: 'failed'` set at the ceiling; a `catch` that swallows 404; `errorCopy` throwing on an unknown code.
- **What this cannot prove / disqualifier:** fake timers prove the schedule, not the real interval under tab throttling; the live cadence is observed in `APF-T-10` (poll count over 2 minutes from the network log — not evidence if the tab was backgrounded).
- **Status:** `[x]` PASS — 2026-09-15, attempt 1 (see `execution.md`; forward pointers to T-6 recorded there)
- **Definition of done:**
  - [x] `tsc`, Jest, lint green; grep gate 0 for the removed copy; no template change in this task.
  - [x] Commit: `♻️ refactor(bilateral-ai) [<ticket>]: job model, adaptive polling, still-running ceiling, single-surface gate, retry and expectations`.

### `APF-T-6` — Processing panel component and upload integration

- **Type:** `client`
- **Description:** `AiProcessingPanelComponent` (presentational, input-driven, no internal loading state): stepper (6 steps; vertical < 640 px via `min-[640px]:` only), elapsed `mm:ss` ticking each second from `queue_entry_date`, expected range or fallback copy, queue position line, attempt/retrying badge with last error, source-mix line, "you can leave" line, `aria-live="polite"` region, outcomes (completed / no candidates / failed with `errorCopy` + "Try again" + "Upload different files" / still running) each ≤ 160 px; tokens `--pr-danger*` for failure, info pair for badges; `motion-reduce` on the active-dot pulse. `BilateralAiUploadComponent` replaces its inline processing/failed/no-candidates blocks with the panel, registers `panelVisible` on mount/destroy, "Try again" → `service.retryJob`, 410 → back to the form with the message; accepts `?job=<id>`.
- **Implements:** `APF-R-6` A (scenario, AND update in place without flashing), B (scenario, BUT no percentage/bar, AND `aria-live`), C (scenario, AND stepper reset not failed), D (render side); `APF-R-7` render (still-running state); `APF-R-8` A (inline outcome only) and C (copy by code, BUT no raw server text); `APF-R-9` (scenario, BUT disabled while alive, AND 410 → form); `APF-AC-8`, `APF-AC-9`, `APF-AC-10`, `APF-AC-12`, `APF-AC-14`, `APF-AC-15`; JD: JA-4, JA-12, JA-13
- **Design refs:** §6.2 (panel, upload), §6.3, `APF-DD-1`, `APF-DD-7`, mockup states 1–6
- **Files (expected):** `pages/bilateral/components/ai-processing-panel/ai-processing-panel.component.{ts,html,spec.ts}` (no SCSS unless `:host`), `components/bilateral-ai-upload/bilateral-ai-upload.component.{ts,html,spec.ts}`
- **Depends on:** `APF-T-5` · **Blocks:** `APF-T-9`, `APF-T-10`
- **Estimate:** L
- **Skills:** `angular-developer`, `ui-ux-pro-max` (fallback `frontend-design`), `tailwind-design-system`
- **Tests (Jest, rendered DOM):** each fixture state renders the documented copy (queued with position, processing per stage with `estimated` captions, retrying badge + last error, still running, failed per code, completed, no candidates); no `%` anywhere; `aria-live` region text changes on stage change; position refresh re-renders without a skeleton/loading node; every action is a `<button>` with a name; "Try again" disabled while alive; upload component: terminal while mounted → inline outcome and `completionNotice` stays null (through the real service); 410 → form visible with message; `?job=` opens the panel for that id.
- **Verification:** `cd onecgiar-pr-client && npx tsc --noEmit -p tsconfig.app.json && npx jest src/app/pages/bilateral/components/ai-processing-panel src/app/pages/bilateral/components/bilateral-ai-upload --silent && npx ng lint --quiet && ! grep -rnE "#[0-9a-fA-F]{3,8}\b|pi pi-|rgba?\(" src/app/pages/bilateral/components/ai-processing-panel/*.html src/app/pages/bilateral/components/bilateral-ai-upload/*.html && for v in $(grep -rhoE "var\(--pr-[a-z0-9-]+\)" src/app/pages/bilateral/components/ai-processing-panel/*.html src/app/pages/bilateral/components/bilateral-ai-upload/*.html | sort -u | sed 's/var(\(.*\))/\1/'); do grep -q -- "$v:" src/styles/colors.scss || { echo "MISSING TOKEN $v"; exit 1; }; done` (CT for this component lands in `APF-T-9`; say so in the report)
- **Input that would make the check fail:** `var(--pr-status-rejected-fg)` (token gate); a progress `<progress>` or `%` string; `sm:` beside `min-[640px]:` on one property; the dialog and the panel both rendering the outcome.
- **What this cannot prove / disqualifier:** class presence for sticky/orientation/heights is not layout — `APF-T-9` measures; `aria-live` announcement is asserted as text mutation, not as screen-reader output (accepted, D10).
- **Status:** `[x]` PASS — 2026-09-15, attempt 2 (attempt 1 FAIL: live region wrapped the ticking clock, estimated steps unmarked, mix duplicated — see `execution.md`)
- **Definition of done:**
  - [x] `tsc`, Jest, lint, hex/rgba/PrimeIcons and **token-existence** gates green.
  - [x] Every number visible is in text; no SCSS beyond `:host`.
  - [x] Commit: `✨ feat(bilateral-ai) [<ticket>]: processing panel — stages, elapsed, expectation, queue position, single outcome surface`.

### `APF-T-7` — Header "AI job running" chip and set-up "coming soon" disclosure

- **Type:** `client`
- **Description:** Chip in `bilateral-page-header` (left of the drafts badge): visible iff a job is alive for the current center (service state or resume record with matching `centerAcronym`), text "AI job running · mm:ss" ticking from `queue_entry_date`, `routerLink` to the upload step with `queryParams { job }`, accessible name includes the elapsed time, `motion-reduce:` no pulse, hidden at terminal. Set-up step: wrap "Contributing Science Programs — coming soon" in `bilateral-accordion`, collapsed by default.
- **Implements:** `APF-R-10` (scenario, BUT not other centers / after terminal, AND keyboard + name + reduced motion); `APF-R-11` (scenario, BUT SP selection and cards unchanged); `APF-AC-16`, `APF-AC-17`; JD: JA-17
- **Design refs:** §6.2 (header), §6.3 (chip), `APF-DD-8`, `APF-DD-11`, mockup header strip
- **Files (expected):** `components/bilateral-page-header/bilateral-page-header.component.{ts,html,spec.ts}`, the set-up step template that hosts the contributing-SP block (`bilateral-result-creator` or `bilateral-sp-selector` — locate at execute) + spec
- **Depends on:** `APF-T-5` · **Blocks:** `APF-T-9`, `APF-T-10`
- **Estimate:** S
- **Skills:** `angular-developer`, `tailwind-design-system`
- **Tests:** chip present with elapsed in name when the service reports an alive job for `AfricaRice`; absent for `CIMMYT`; absent after `completed`; `routerLink`/`queryParams` asserted; set-up: block collapsed by default, expands on click, SP selection and the two cards unchanged (existing cases untouched).
- **Verification:** `cd onecgiar-pr-client && npx tsc --noEmit -p tsconfig.app.json && npx jest src/app/pages/bilateral/components/bilateral-page-header <set-up spec path> --silent && npx ng lint --quiet && <token-existence gate over the two templates as in APF-T-6>`
- **Input that would make the check fail:** chip rendered from `uploadState` alone without the center match (the CIMMYT case fails); a `<div (click)>` chip.
- **What this cannot prove / disqualifier:** overflow of the tab strip with the chip at 375 px is layout → `APF-T-9` CT.
- **Status:** `[x]` PASS — 2026-09-15, attempt 2 (attempt 1 FAIL: accordion DI crash in the manual-create drawer, middot, elapsed token — see `execution.md`)
- **Definition of done:**
  - [x] Specs green (header spec's existing cases untouched); `tsc`; lint; token gate.
  - [x] Commit: `✨ feat(bilateral-page-header) [<ticket>]: AI job running chip; set-up coming-soon block collapsed`.

### `APF-T-8` — Provenance notice component on five surfaces, completion dialog line

- **Type:** `client`
- **Description:** `AiProvenanceNoticeComponent` (`variant: banner | badge | line`, one copy constant, info token pair, full sentence in `aria-label`/`title` for the badge). Mount: Draft Results list header (line, when ≥ 1 AI draft), draft card (badge — replaces the ad-hoc `bp-ai-badge` copy), promoted result editor (banner, dismissible per session via `sessionStorage`, only when `creation_method = 'AI'`), result detail read-only view (badge), completion dialog (line above actions on success).
- **Implements:** `APF-R-12` (scenario, table of five surfaces, BUT absent on manual results, AND persists after edits); `APF-AC-18`; `APF-R-8` B and `APF-AC-13` (terminal while elsewhere → dialog only, unchanged otherwise — regression test through the real service with `panelVisible = false`)
- **Design refs:** §6.2 (notice, dialog), §6.3 provenance tokens, `APF-DD-10`
- **Files (expected):** `components/ai-provenance-notice/ai-provenance-notice.component.{ts,html,spec.ts}`, `pages/my-draft-results/my-draft-results.component.{html,spec.ts}`, `pages/bilateral-result-creator/bilateral-result-creator.component.{html,spec.ts}` (or `section-general-info` header — locate at execute), the read-only detail template + spec, `components/bilateral-ai-completion-dialog/bilateral-ai-completion-dialog.component.{html,spec.ts}`
- **Depends on:** — (disjoint from `APF-T-6/7`; check the pre-flight uncommitted-edits rule for `my-draft-results` and `bilateral-result-creator`) · **Blocks:** `APF-T-10`
- **Estimate:** M
- **Skills:** `angular-developer`, `tailwind-design-system`
- **Tests:** notice per variant renders the constant; badge exposes the sentence in `aria-label`; each surface: present for an AI fixture (`creation_method: 'AI'` / draft), absent for manual; editor banner dismiss persists in `sessionStorage` and returns on a new session; banner still present after an edit event; dialog success shows the line, failure does not.
- **Verification:** `cd onecgiar-pr-client && npx tsc --noEmit -p tsconfig.app.json && npx jest src/app/pages/bilateral/components/ai-provenance-notice src/app/pages/bilateral/pages/my-draft-results src/app/pages/bilateral/components/bilateral-ai-completion-dialog <editor and detail spec paths> --silent && npx ng lint --quiet && <token-existence gate over the touched templates>`
- **Input that would make the check fail:** presence keyed on `is_ai_generated` truthiness of the string `"0"` (the manual fixture shows the notice); a status colour on the badge.
- **What this cannot prove / disqualifier:** copy acceptance is product's (`APF-OQ-2`) — a green test with the default sentence is not sign-off; record the sentence in the HITL table for the user to approve.
- **Status:** `[x]` PASS — 2026-09-15, attempt 2 (attempt 1 FAIL: no test for "persists after edits" — see `execution.md`)
- **Definition of done:**
  - [x] Specs green (drafts/creator/dialog existing cases untouched); `tsc`; lint; token gate.
  - [x] Commit: `✨ feat(bilateral) [<ticket>]: AI provenance notice on drafts, editor, detail and completion dialog`.

### `APF-T-9` — Cypress CT layout gate (panel + header chip), reduced motion, build

- **Type:** `tests`
- **Description:** `ai-processing-panel.cy.ts`: mount with fixtures at 1280×800, 900×800, 375×800 — stepper horizontal ≥ 640 (six step boxes share one row: distinct `left`, equal `top`) and vertical at 375 (distinct `top`), `document.documentElement.scrollWidth ≤ clientWidth`, outcome blocks (`still running`, `failed`, `no candidates`) `getBoundingClientRect().height ≤ 160`, reduced motion: stub `matchMedia('(prefers-reduced-motion: reduce)')` in `onBeforeLoad` and assert the active dot has `animation-name: none`. `bilateral-page-header.cy.ts` (or extend the existing header CT if one exists): chip present at 375 with the four tabs → no horizontal overflow of the tab strip. `npm run build:dev` once.
- **Implements:** `APF-R-19`-class layout properties of the panel (design §6.3 responsive), `APF-R-18` reduced motion (D10 substitute), `APF-R-10` AND keyboard/name at 375; `APF-AC-19` partial; requirements §9 D7, D10
- **Design refs:** §6.3, §10 CT row
- **Files (expected):** `pages/bilateral/components/ai-processing-panel/ai-processing-panel.cy.ts`, `components/bilateral-page-header/bilateral-page-header.cy.ts` (new or extended)
- **Depends on:** `APF-T-6`, `APF-T-7` · **Blocks:** `APF-T-10`
- **Estimate:** M (two CT runs ≈ 2 × 2 min — say so in the progress line)
- **Skills:** `angular-developer`
- **Tests (CT):** as described; measure on the real elements, never on an `overflow-hidden` ancestor (`KZ-EVM-1`); wait for fonts/ResizeObserver with a bounded poll on `scrollWidth` stability, not a fixed `cy.wait`.
- **Verification:** `cd onecgiar-pr-client && CT_DEV_SERVER_PORT=<free port> npx cypress run --component --spec "src/app/pages/bilateral/**/*.cy.ts" && npm run build:dev`
- **Input that would make the check fail:** a step box with `min-w-[180px]` (six boxes overflow 900 px); the chip pushing the tab strip past `clientWidth` at 375; a pulse keyframe not disabled under the stubbed media query.
- **What this cannot prove / disqualifier:** CT proves layout with fixtures, not data — reconciliation is `APF-T-10`; a CT run whose dev server compiled with the primeicons noise but reported a failing spec is a real failure (memory: judge by spec results). The `build:dev` proves AOT of the new components only if they are reachable from a route (they are, via the upload step).
- **Status:** `[~]` PIVOT PENDING — 2026-09-15: panel CT 3/3 green and `build:dev` green; header CT red because the pre-existing tab strip already overflows at 375 px without the chip (see `execution.md` → Pivot Record `APF-T-9`; user decision required)
- **Definition of done:**
  - [ ] CT green at all viewports; `build:dev` green.
  - [ ] Commit: `✅ test(bilateral-ai) [<ticket>]: CT layout gate for the processing panel and header chip`.

### `APF-T-10` — Live HITL on prtest, folder guide, evidence and archive items

- **Type:** `tests` + `docs`
- **Description:** With the server tasks deployed locally against prtest: two accounts start jobs 30 s apart (doc + audio) → position 1 visible on the second; stage progression with timestamps; chip on Reporting/Results tabs; leave and return (reload) → panel resumes; terminal outcome on exactly one surface (once on the panel, once elsewhere); one mail received (≥ 2 min job) and one notification row in the bell; force a stall (stop the consumer, wait 31 min) → `QUEUE_STALLED` once; force a timeout (kill the consumer mid-attempt) → `TIMED_OUT` after 15 min; retry a failed job → 202 same id, panel back to queued; delete a key → 410 → form. Poll cadence from the network log over 2 min. `DESCRIBE bilateral_ai_jobs` shows the new columns. Screenshots per state. Folder guide `ai-processing-panel/CLAUDE.md` (invariants: input-driven, no client-declared failure, single surface via `panelVisible`, `queue_entry_date` clock, token gate) and a gotcha line in `bilateral-ai-upload`'s guide if one exists. Record archive-time items (design.md §4 screen row, TRD §8 note on the sweeper pattern, model-routing, parent bilateral guide still missing).
- **Implements:** live closure of `APF-R-2` A/B, `APF-R-4`, `APF-R-5` (410 path), `APF-R-6`, `APF-R-7`, `APF-R-8`, `APF-R-10`, `APF-R-12` (copy for `APF-OQ-2` sign-off); `APF-AC-21`; requirements §9 D5 (mail), D11
- **Design refs:** §10 Live HITL row, §9
- **Files (expected):** `components/ai-processing-panel/CLAUDE.md` (new), `docs/specs/bilateral/ai-processing-feedback/execution.md` (evidence table), `evidence/*.png`
- **Depends on:** `APF-T-3`, `APF-T-4`, `APF-T-6`, `APF-T-7`, `APF-T-8`, `APF-T-9` · **Blocks:** —
- **Estimate:** L (the stall/timeout forcing alone is ~50 min of wall clock; say so up front)
- **Skills:** `angular-developer`, Orca embedded browser per project memory (set viewport after `goto`, ×1.2 zoom)
- **Verification:** the HITL table in `execution.md` with one row per check above, each with the observed value and a screenshot; `DESCRIBE` output; mail screenshot; notification row screenshot.
- **Input that would make the check fail:** the second job never shows position 1 (consumer not serial or position computed wrongly); the panel and the dialog both open; a mail for a 60-s job; `QUEUE_STALLED` fired while the other job was advancing.
- **What this cannot prove / disqualifier:** **inconclusive** if the consumer is not running on the target (no `started_date` moves), if the mail transport is off (mail rows "not observed"), or if job history has < 5 samples (fallback copy is then the expected reading, not a defect). A screenshot without the elapsed/position visible is not evidence.
- **Definition of done:**
  - [ ] HITL table complete with zero unexplained mismatches (findings raised before close-out).
  - [ ] Guide written and stamped; archive items recorded in `execution.md`.
  - [ ] Commit: `✅ test(bilateral-ai) [<ticket>]: HITL evidence, processing-panel guide`.

---

## 4. Dependency graph

```
APF-T-1 (migrations · entity · config)
   └── APF-T-2 (processJob lifecycle · getJob) ──► APF-T-3 (sweeper · notifications · bell branch) ─┐
                                              └──► APF-T-4 (retry · expectations · contract doc) ──┤
APF-T-5 (client model + service, against the frozen contract)                                        │
   ├── APF-T-6 (processing panel + upload) ──┐                                                       │
   └── APF-T-7 (header chip + set-up)        ├──► APF-T-9 (CT + build) ──► APF-T-10 (HITL · guide) ◄─┘
APF-T-8 (provenance notice ×5 + dialog line) ┘ (disjoint; joins at T-10)
```

**Parallel-safe branches:** `APF-T-1→2→3/4` (server) runs concurrently with `APF-T-5→6/7` and `APF-T-8` (client); `APF-T-3` and `APF-T-4` are disjoint after `T-2`; `T-6`, `T-7`, `T-8` are disjoint files. Width cap: 2 workers per wave (project rule). `T-10` waits for everything and needs the server half deployed locally.

---

## 5. Coverage matrix (scenario / clause → owning task)

| Requirement · clause | Task(s) |
|---|---|
| R-1 A position computed at read · B stage sequence · B BUT unobservable stage · B AND fields unchanged | T-2 · doc T-4 · live T-10 |
| R-2 A attempt timeout · A BUT inside window · A AND late response idempotent + re-notify | T-3 (sweeper, notify) · T-2 (reuse) · live T-10 |
| R-2 B stall with liveness · B BUT not merely old · B AND warn without payload · C one sweep / no double | T-3 · live T-10 |
| R-3 retry stays PROCESSING · BUT no FAILED until final · AND final FAILED with code | T-2 (+ T-3 notify) |
| R-4 table · scenario deep links · BUT no mail < 2 min · AND never fail job · AND row visible in bell | T-3 (+ T-1 templates/type) · live T-10 |
| R-5 scenario · BUT 409 alive/completed · AND owner-only + no re-upload + 410 | T-4 · live T-10 (410) |
| R-6 A queued copy · A AND update in place · B stages · B BUT no percentage · B AND aria-live · C retrying · C AND stepper not failed · D range · D BUT < 5 samples · D AND served by API | T-6 (render) · T-5 (model) · T-4 (API) · live T-10 |
| R-7 still running · BUT no client failure / copy removed · AND resume regardless of age · AND stop on 404/410 | T-5 · T-6 (render) |
| R-8 A inline only · B dialog only (AC-13) · C copy by code · C BUT no raw text | T-5 (gate) · T-6 (inline, copy) · T-8 (dialog regression, AC-13) · live T-10 |
| R-9 same id · BUT disabled while alive · AND 410 → form | T-5 · T-6 · live T-10 |
| R-10 chip · BUT other centers / after terminal · AND keyboard, name, reduced motion | T-7 · T-9 (375) · live T-10 |
| R-11 disclosure · BUT selection/cards unchanged | T-7 |
| R-12 five surfaces · BUT absent on manual · AND persists after edits | T-8 · live T-10 (copy sign-off) |
| R-18 reduced motion (D10 substitute) | T-9 |
| R-20 adaptive intervals · R-21 cache · R-22 copy with mix/duration | T-5 · T-4 · T-3 |
| R-30 / R-31 (MAY) | not scheduled — design §13 |
| NFR honesty · performance · reliability · requests · security · compat · a11y · design system · i18n | T-6 (copy) · T-4/T-3 (queries, sweeper) · T-2/T-3 (conditional updates) · T-5 (intervals) · T-4 (403) · T-4 (change log) · T-6/T-9 (aria/motion) · T-6/T-7/T-8 (token gate) |

Every `APF-AC-n` is named in at least one task; AC-21 closes only in T-10.

---

## 6. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `APF-TEST-1` | unit (server) | migrations/config defaults | `bilateral-ai.config.spec.ts` |
| `APF-TEST-2` | unit (server) | R-1, R-3, R-2 A reuse, AC-1/2/5 | `bilateral-ai.service.spec.ts`, `bilateral-ai.consumer.spec.ts` |
| `APF-TEST-3` | unit (server) | R-2, R-4, R-22, AC-3/4/6 | `bilateral-ai-sweeper.cron.spec.ts`, `bilateral-ai-notifications.service.spec.ts`, `notification.service.spec.ts` |
| `APF-TEST-4` | unit (server) | R-5, R-6 D, R-21, AC-7 | `bilateral-ai.controller.spec.ts`, `bilateral-ai.service.spec.ts` |
| `APF-TEST-5` | unit (client, pure + service) | R-7, R-8 gate, R-9, R-20, AC-11/14 | `bilateral-ai-job.model.spec.ts`, `bilateral-ai.service.spec.ts` |
| `APF-TEST-6` | component (Jest) | R-6, R-8 A/C, R-9, AC-8/9/10/12/15 | `ai-processing-panel.component.spec.ts`, `bilateral-ai-upload.component.spec.ts` |
| `APF-TEST-7` | component (Jest) | R-10, R-11, AC-16/17 | `bilateral-page-header.component.spec.ts`, set-up spec |
| `APF-TEST-8` | component (Jest) | R-12, R-8 B, AC-18 | `ai-provenance-notice.component.spec.ts` + four surface specs |
| `APF-TEST-9` | Cypress CT | layout, R-18 motion, AC-19 partial | `ai-processing-panel.cy.ts`, header CT |
| `APF-TEST-10` | live HITL | AC-21, D5, D11, copy sign-off | `execution.md` evidence + screenshots |

Client coverage stays ≥ 50/60/60/60; server thresholds unaffected.

---

## 7. Rollout & verification

- [ ] **PR strategy (~5,000 LOC > 400): two chained PRs against `staging`.**
  - **PR 1 — server lifecycle** (`APF-T-1`…`APF-T-4`): "review the conditional-update helper and the sweeper conditions first; the migrations are additive; old clients keep working; contract change log included; nothing visible changes in the UI yet."
  - **PR 2 — client feedback** (`APF-T-5`…`APF-T-10`): links PR 1; "review the service ceiling/surface gate first, then the panel; out of scope: mining callbacks, cancel, consumer scaling; HITL table attached."
- [ ] CI green on both (lint, Jest, build, `migration:check:ci`, SonarCloud).
- [ ] Deploy order: server (migrations run by the pipeline — verify on TEST; PROD pipeline does not run migrations, per the OTP runbook lesson) → client.
- [ ] Manual QA on TEST: repeat the HITL table rows for one job per mix class; product signs off the provenance copy (`APF-OQ-2`).
- [ ] Downstream: none (`/api/bilateral/*` additive; change log updated).

---

## 8. Cleanup & follow-ups

- [ ] Spec status → `shipped`; `/akili-archive` applies the archive items recorded in `execution.md`.
- [ ] Follow-ups (design §13): `APF-R-30` cancel; `APF-R-31` mining callbacks; consumer scaling decision (`APF-OQ-4`); `bilateral-results-list` `asCurrentResult` string-id fix (separate quick).
- [ ] Resolve `APF-OQ-1` in commit history before the PRs if the ticket arrives late.

---

## 9. Roll-back plan

1. Revert PR 2 → old upload states return (client-side ceiling copy is gone from the code, so a reverted client still shows the old "timed out" — acceptable for a rollback window).
2. Revert PR 1 code → sweeper stops, retries bounce again, `getJob` still returns the extra columns (harmless).
3. Migrations `down` (M3 restores the results-ready body; M2 deletes the type row; M1 drops columns/indexes). Rows already flipped to `TIMED_OUT`/`QUEUE_STALLED` stay `FAILED`.
4. No feature flag; the sweeper and consumer are inert without the queue env.

---

## Required cross-references

- `docs/specs/bilateral/ai-processing-feedback/requirements.md` · `design.md` · `proposal.md` · `judgment.md` · `mockup/ai-processing-panel.html`
- `docs/prd.md` · `docs/ux-ui/design.md` · `docs/trd/trd.md`
- `onecgiar-pr-client/CLAUDE.md` §5 · `onecgiar-pr-client/docs/COMPONENT-DOCS.md` · `onecgiar-pr-server/src/api/bilateral/CLAUDE.md` §6/§7.5 · `onecgiar-pr-server/docs/bilateral-result-summaries.en.md`
- `.agents/model-routing.md` (Skill Map) · `.agents/leader.md` (delegation thresholds)
