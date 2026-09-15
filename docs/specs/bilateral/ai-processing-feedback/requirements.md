# Requirements — AI-Assisted Creation: Processing Feedback, Job Lifecycle and Transparency

## Document Control

| Field | Value |
|---|---|
| **Module** | `bilateral` |
| **Sub-feature** | `ai-processing-feedback` |
| **Spec Path** | `docs/specs/bilateral/ai-processing-feedback/` |
| **Type** | Change (with two embedded defects, D-1 / D-2 in `proposal.md` §9) |
| **Depth** | **Full** (re-sized against the design in `design.md` §14 — schema migration + data migrations + API contract change + notifications) |
| **Approval Mode** | gated (inherited from `proposal.md`; the user may switch to `pre-approved` at any gate) |
| **Requirement prefix** | `APF` (AI Processing Feedback) — `APF-R-n`, `APF-AC-n`, `APF-US-n`, `APF-OQ-n` |
| **Owner** | Juan Carlos Cadavid (j.cadavid@cgiar.org) |
| **Status** | approved — JD round 1 applied |
| **Ticket(s)** | none yet — `APF-OQ-1` |
| **Source of intent** | `proposal.md` (2026-09-15; user-supplied screenshots of the six live screens; text-mining pipeline artifact shared by the user) |
| **Visual reference** | User screenshots (in the proposal conversation) · `mockup/ai-processing-panel.html` (generated in Phase 2: six panel states, header chip, provenance banner; corrected in JD round 1) |
| **Baseline cited** | `docs/prd.md` US-P1, AC-9 (no secrets in logs) · `docs/ux-ui/design.md` §7 tokens, §8 hard rules 4/5/8/21, §10 a11y · `docs/trd/trd.md` §6 frontend state, §8 async messaging (RMQ) · `onecgiar-pr-server/src/api/bilateral/CLAUDE.md` §6 payload contract discipline, §7.5 logging · `onecgiar-pr-client/CLAUDE.md` §5 Hard UI rules |
| **Depends on** | none (archived: `bilateral-ai-workflow` contract, `ai-drafts-redesign`, `manual-create-drawer`) |
| **Kaizen lessons applied** | `KZ-changes--bilateral-review-center-strip-and-phase-1` (fixtures carry real payload shapes — job fields arrive as strings/ISO dates), `KZ-bilateral--center-overview-tab-3` (widgets anchored to live exemplars), `KZ-REH-1` (tests budgeted at 1.2–1.5× production) |

---

## 1. Executive Summary

A center user who chooses **AI-Assisted** creation uploads sources and then stares at "Job Queued" for minutes, sometimes ending in "Processing timed out" — a message the **client invents** after 30 minutes while the server job may still be running and may later succeed and send a mail. Retries are invisible, failures and empty outcomes never notify a user who left, errors appear twice, and the results that AI produced carry no notice once promoted.

This spec makes the wait **legible** (stage, elapsed time, expected range, queue position, attempt), the outcome **honest** (only the server declares a terminal state; every terminal state notifies once, in-app and by mail), leaving the page **supported** (a persistent "AI job running" chip), and AI provenance **visible** on drafts, editor, detail and the completion dialog. The mining service's synchronous contract is untouched; every displayed word derives from data PRMS already holds or will record.

---

## 2. Glossary

| Term | Meaning here |
|---|---|
| **Job** | A row in `bilateral_ai_jobs` created by `POST /api/bilateral/center/ai/jobs`; one upload = one job |
| **Status** | Server lifecycle value: `PENDING` → `PROCESSING` → `COMPLETED` \| `FAILED` (today). This spec adds terminal error codes, not new statuses, except as design decides (`design.md`) |
| **Stage** | Finer, PRMS-controlled step inside `PROCESSING`. Exactly **8 server values**: `queued` · `uploading` · `reading` (documents only) · `transcribing` (audio only) · `reading_transcribing` (both) · `extracting` · `validating` · `creating_drafts`. The UI collapses `reading` / `transcribing` / `reading_transcribing` into one step → **6 UI steps / 8 server values** (`design.md` §6.3, §14) |
| **Queue-entry clock** | `queue_entry_date = COALESCE(retried_date, created_date)` — the moment the job entered the queue in its current life. Every age-based rule uses it: the stall check, `queue_position`, the client elapsed timer and the 2-minute mail rule. A retried job therefore starts its clocks again instead of inheriting the original upload time. Persisted as a STORED generated column so it can be indexed (`design.md` §3.2 M1) |
| **Attempt** | One consumer execution of `processJob`; the consumer requeues retryable failures up to `BILATERAL_AI_MAX_ATTEMPTS` (default 3) attempts |
| **Terminal state** | `COMPLETED` with drafts · `COMPLETED` with zero drafts ("no candidates") · `FAILED` (with `error_code`: `HTTP_5xx`, `PROCESSING_ERROR`, `QUEUE_NOT_AVAILABLE`, new `TIMED_OUT`, new `QUEUE_STALLED`) |
| **Consumer** | The RMQ `@EventPattern` handler in the API process; `prefetchCount: 1` → one job at a time per instance |
| **Mining service** | External synchronous text-mining API (`POST /prms/text-mining`); PyPDF2 / Amazon Transcribe (≤ 300 s) / Claude / OpenSearch; HTTP timeout on PRMS side `BILATERAL_AI_TEXT_MINING_TIMEOUT_MS` (default 10 min) |
| **Processing panel** | The upload component's state after submit (today: "Job Queued" / "Analyzing Content" / "Processing Failed" / no-candidates) |
| **Completion dialog** | App-wide dialog hosted in `app.component` that announces a terminal state wherever the user is |
| **Resume record** | `localStorage` key `prms.bilateral-ai.active-job` `{ jobId, startedAt }` that lets a reload or new tab resume polling |
| **Transparency notice** | A visible statement that an artefact was generated with AI assistance from the user's sources and must be reviewed |

---

## 3. System Context & Scope

### 3.1 Context

- **Product:** `docs/prd.md` US-P1 (know where my reporting stands), AC-9 (no secrets in logs — job payloads, emails and file names never logged beyond what exists).
- **UX:** `docs/ux-ui/design.md` §8 hard rule 4 (dialogs close without applying, keyboard), rule 5 (empty/error states ≤ 160 px, one line + ghost action), rule 8 (tokens only), rule 21 (icon set); §10 a11y (`aria-live` for status changes, reduced motion).
- **Technical:** `docs/trd/trd.md` §8 (RMQ queues are durable, consumers ack/nack, `noAck: false`); `api/bilateral/CLAUDE.md` §6 (every `/api/bilateral/*` payload change updates `bilateral-result-summaries.en.md` change log — `GET center/ai/jobs/:id` is inside that perimeter), §7.5 (never log emails, payloads).
- **Current code facts** (verified 2026-09-15, `proposal.md` §3): polling 5 s / ceiling 30 min client-side; consumer 3 attempts × 10-min mining timeout; mail only on `COMPLETED` with `result_count > 0`; `getJob` returns the full entity (`status`, `attempts`, `created_date`, `started_date`, `completed_date`, `result_count`, `error_code`, `error_message`).

### 3.2 In scope

1. Server job lifecycle: stage + queue position exposed; hard job timeout; stale-job sweeper; retry visible without bouncing through `FAILED`; idempotent retry endpoint; one notification per terminal state (in-app + mail).
2. Client processing panel: stage stepper, elapsed time, expected range from history, queue position, attempt badge, "you can leave" line; "still running" state at the polling ceiling; single error surface; error copy by `error_code`; "Try again" without re-upload.
3. Persistent "AI job running" chip in the bilateral header while a job is alive.
4. AI transparency notices: drafts list header, draft cards (align copy), promoted result editor and detail, completion dialog.
5. Set-up step: collapse the "Contributing Science Programs — coming soon" block.
6. Payload contract documentation update for the additive job fields.
7. Tests: server unit (lifecycle, sweeper, retry, notifications), client unit (service ceiling/surfaces, panel states, chip), CT layout for the panel, live HITL on a real job.

### 3.3 Out of scope

- Any change to the mining service (its synchronous contract, progress callbacks — `APF-OQ-3`).
- Consumer scaling / `prefetchCount` (`APF-OQ-4`); WebSocket push; cancelling a queued job (`APF-OQ-5`, MAY).
- Drafts card redesign, manual form, promotion flow (archived specs).
- Persisting the resume record server-side across devices (a job started on device A is discoverable on device B through the Drafts tab and the in-app notification, not through the chip).

---

## 4. Stakeholders / Personas

| Persona (`docs/prd.md` §3) | What changes |
|---|---|
| **Center staff (result submitter)** | Understands the wait, can leave and return, gets one honest outcome, sees what AI produced |
| **Center focal point** | Sees provenance on results before submitting them for review |
| **SP reviewer** | Sees the AI transparency notice on promoted results under review |
| **PRMS operators** | Stalled jobs surface as `QUEUE_STALLED` / `TIMED_OUT` rows instead of eternal `PENDING`/`PROCESSING` |
| **Mining team** | Unchanged contract; may later add stage callbacks |

---

## 5. User Stories

- **`APF-US-1`** — As center staff who just uploaded sources, I want to see what the AI is doing and how long it has taken, so that I know whether to wait or come back later. *(Refines US-P1)*
- **`APF-US-2`** — As center staff, I want to leave the page while the job runs and still be told where I am and how I will learn the outcome, so that a long job never blocks my other work.
- **`APF-US-3`** — As center staff, I want exactly one clear message when the job ends — success, nothing found, failed, timed out — with what I can do next, so that I never see two contradicting messages or a failure that later turns out to be a success.
- **`APF-US-4`** — As a focal point or SP reviewer, I want every AI-generated draft and result to say so, so that I review it with the right expectation.
- **`APF-US-5`** — As an operator, I want stuck jobs to resolve themselves into a terminal state with a cause, so that no user waits on a job nobody is processing.

---

## 6. Functional Requirements

### 6.1 Server lifecycle

#### `APF-R-1` — Stage and queue position exposed on the job (MUST)

`GET /api/bilateral/center/ai/jobs/:jobId` SHALL return, in addition to today's fields, `stage`, `stage_updated_date`, `queue_position` (for `PENDING` jobs only), `max_attempts`, and `retrying`.

- **Scenario A — pending**
  - GIVEN two older jobs are `PENDING` or `PROCESSING` for the same consumer pool
  - WHEN the job is read
  - THEN `status = PENDING`, `stage = queued`, `queue_position = 2` (count of non-terminal jobs whose `queue_entry_date` is older than this job's)
  - BUT it must NOT rank by `created_date`: "older" is measured on `queue_entry_date = COALESCE(retried_date, created_date)`, so a retried job takes its place at the back of the queue
  - AND IT MUST compute the position at read time from `bilateral_ai_jobs` — never store it.
- **Scenario B — processing stages**
  - GIVEN the consumer picked the job
  - WHEN `processJob` advances
  - THEN `stage` moves through `uploading` → (`reading` when `document_keys` is non-empty and/or `transcribing` when `audio_keys` is non-empty) → `extracting` → `validating` → `creating_drafts`, each with `stage_updated_date`
  - BUT it must NOT claim a stage PRMS cannot observe: the mining call is one request, so `reading`/`transcribing`/`extracting`/`validating` are set **before** the call from the source mix and advance to `creating_drafts` only when the response returns (`design.md` decides the intermediate model; the UI copy must say "estimated" for those)
  - AND IT MUST leave every existing field unchanged (`bilateral-result-summaries.en.md` change log updated).

#### `APF-R-2` — Server-owned timeout and stale-job sweeper (MUST)

The server SHALL be the only party that declares a job timed out or stalled.

- **Scenario A — attempt timeout**
  - GIVEN a job in `PROCESSING` whose current attempt's `started_date` is older than `BILATERAL_AI_ATTEMPT_TIMEOUT_MS` (default **15 min** = the 10-min mining HTTP timeout + 5 min margin)
  - WHEN the sweeper runs
  - THEN the job becomes `FAILED` with `error_code = TIMED_OUT`, `completed_date` set, and the terminal notifications of `APF-R-4` fire once
  - BUT it must NOT flip a job whose attempt is still inside the window — the timeout is measured **per attempt**, from the attempt's `started_date`, and exists to catch a consumer or process that died mid-attempt, not to cap the whole job
  - AND IT MUST leave the whole-job worst case at `max_attempts × 15 min` = **45 min** (3 attempts today), which is the figure the panel's range copy and the "still running" state are sized against
  - AND IT MUST accept a late mining response for a `TIMED_OUT` job idempotently: drafts are still created, status becomes `COMPLETED`, and a **second** notification "results arrived after all" is sent (never a silent overwrite).
- **Scenario B — the queue is not moving**
  - GIVEN the oldest `PENDING` job's `queue_entry_date` is older than `BILATERAL_AI_QUEUE_STALL_MS` (default 30 min)
  - AND GIVEN no job in `bilateral_ai_jobs` has a `started_date` or a `stage_updated_date` inside that same window (no consumer activity anywhere)
  - WHEN the sweeper runs
  - THEN that job becomes `FAILED` with `error_code = QUEUE_STALLED` and notifies once
  - BUT it must NOT flip a job merely because it is old while other jobs are advancing: with `prefetchCount: 1` a healthy job legitimately waits behind up to `max_attempts × attempt timeout` per job ahead of it, so **both** conditions are required — job age alone is never sufficient
  - AND IT MUST log the stall at `warn` level without payload, keys or emails (AC-9).
- **Scenario C — sweeper cadence**
  - GIVEN the API process is running
  - WHEN the interval elapses (default 60 s)
  - THEN one sweep runs per process; concurrent instances MUST NOT double-notify (guard on a status transition that only one `UPDATE … WHERE status = …` wins).

#### `APF-R-3` — Retries visible, never bouncing through FAILED (MUST)

- GIVEN a retryable failure (HTTP ≥ 500 or network) on attempt *n* < `max_attempts`
- WHEN the consumer requeues
- THEN the job stays `PROCESSING` with `retrying = true`, `attempts = n`, `error_code`/`error_message` recording the last error, and `stage` reset to `queued`
- BUT it must NOT set `status = FAILED` until the final attempt fails
- AND IT MUST set `FAILED` with the last `error_code` after attempt `max_attempts` (3 today, configurable), then notify once.

#### `APF-R-4` — One notification per terminal state (MUST)

Every terminal state SHALL produce exactly one in-app notification for the job's user and, when the job ran ≥ 2 minutes (`queue_entry_date` → terminal), exactly one email.

| Terminal state | In-app | Mail template | Copy intent |
|---|---|---|---|
| `COMPLETED`, `result_count > 0` | yes | `BILATERAL_AI_RESULTS_READY` (exists) | n drafts ready → Draft Results |
| `COMPLETED`, `result_count = 0` | yes | new `BILATERAL_AI_NO_CANDIDATES` | nothing extracted; try with more context |
| `FAILED` any code | yes | new `BILATERAL_AI_FAILED` | cause in plain words; "Try again" link |
| `TIMED_OUT` → later `COMPLETED` | yes | `BILATERAL_AI_RESULTS_READY` with "after all" variant | drafts arrived late |

- GIVEN a job reaches a terminal state
- WHEN notifications are produced
- THEN the in-app row deep-links to the Draft Results tab (`/bilateral/<acronym>/drafts`) or to the upload step with `?job=<id>` for failures
- BUT it must NOT send a mail for a job that ended under 2 minutes (`queue_entry_date` → terminal) while the uploader's tab is still polling (the dialog is enough) — the 2-minute rule is the only gate, evaluated server-side
- AND IT MUST be **visible in the bell / notifications list for the uploader**: a job notification carries no result, so the read paths must not require one. Writing the row is not enough — the acceptance is the row rendering through the read endpoint (`design.md` §6.4)
- AND IT MUST never fail the job because a notification failed (log at `warn`, continue).

#### `APF-R-5` — Idempotent "Try again" (MUST)

`POST /api/bilateral/center/ai/jobs/:jobId/retry` SHALL re-enqueue the **same** stored sources.

- GIVEN a job in a terminal `FAILED` state (any code)
- WHEN the user retries
- THEN the job is reset to `PENDING` (`attempts = 0`, error fields cleared, `created_date` kept for provenance, `retried_date = now`) and re-published; response 202 with the same `jobId`
- AND IT MUST move the job's **queue-entry clock**: `queue_entry_date = COALESCE(retried_date, created_date)` now resolves to the retry moment, so the stall check, `queue_position`, the client elapsed timer and the 2-minute mail rule all restart with the retry instead of inheriting the original upload time
- BUT it must NOT accept a retry while `status ∈ {PENDING, PROCESSING}` (409) nor for `COMPLETED` (409)
- AND IT MUST be callable only by the job's owner (403 otherwise) and MUST not require re-uploading files (S3 keys reused; if a key is missing, 410 with a message that tells the user to upload again).

### 6.2 Client — processing feedback

#### `APF-R-6` — Staged, time-aware processing panel (MUST)

While a job is alive, the upload component SHALL show: the stage stepper, elapsed time (mm:ss, updating every second, from `queue_entry_date`), an expected range, the queue position when `PENDING`, the attempt badge when `attempts > 1` or `retrying`, and the "You can leave this page — we'll notify you here and by email" line.

- **Scenario A — queued**
  - GIVEN `status = PENDING`, `queue_position = 2`
  - WHEN the panel renders
  - THEN the first step is active with copy "Queued · 2 jobs ahead of you · waiting for a free AI worker", elapsed time runs, the expected range reads "usually n–m min once processing starts"
  - AND IT MUST update the position on every poll without flashing (no skeleton on refresh).
- **Scenario B — processing stages**
  - GIVEN `status = PROCESSING`, `stage = extracting`, 1 document + 1 audio
  - WHEN the panel renders
  - THEN steps `uploading` and `reading/transcribing` are done, `extracting` active, later steps pending; the source mix is stated ("1 document · 1 audio file")
  - BUT it must NOT show a percentage or a progress bar that claims precision PRMS does not have — the stepper and the elapsed time are the progress
  - AND IT MUST announce stage changes through an `aria-live="polite"` region.
- **Scenario C — retrying**
  - GIVEN `retrying = true`, `attempts = 2`, `max_attempts = 3`
  - WHEN the panel renders
  - THEN a badge reads "Retrying (attempt 2 of 3)" with the last error in one plain line
  - AND IT MUST keep the stepper (reset to queued) rather than the failed state.
- **Scenario D — expected range**
  - GIVEN at least 5 completed jobs with the same source mix class in the last 90 days
  - WHEN the range is computed
  - THEN it is the P25–P75 of `completed_date − started_date` of those jobs, rounded to minutes
  - BUT it must NOT show a range when fewer than 5 samples exist — it shows "This usually takes a few minutes; audio takes longer" instead
  - AND IT MUST use exactly **two** mix classes: `documents` (no audio source) and `audio` (any audio source present) — there is no third "mixed" class
  - AND IT MUST be served by the API at `GET /api/bilateral/center/ai/expectations?mix=documents|audio`, never computed client-side from partial data.

#### `APF-R-7` — The client never declares a failure (MUST)

- GIVEN polling has run for the client ceiling (30 min) and the server still says `PENDING`/`PROCESSING`
- WHEN the ceiling is reached
- THEN the panel switches to a **"Still running"** state: "Your job is still being processed. We'll notify you here and by email when it finishes.", polling slows to every 30 s and continues, the resume record is kept
- BUT it must NOT set `status = failed` nor show "Processing timed out" — that copy is removed from the client
- AND IT MUST resume polling after a reload while the server job is alive, regardless of `startedAt` age (the record is dropped only on a terminal server state or when the server returns 404)
- AND IT MUST stop polling on **404 / 410** — the job is gone, so the resume record is dropped and the timer cleared. Removing the client ceiling removes the only previous terminating condition, so this is now the terminating condition and must be written, not assumed (a 401 stops polling silently; any other error keeps polling).

#### `APF-R-8` — One error surface, error copy by code (MUST)

- **Scenario A — on the upload step**
  - GIVEN the user is viewing the processing panel
  - WHEN the job reaches a terminal state
  - THEN the panel shows the outcome and the completion dialog is **suppressed**
  - BUT it must NOT open both.
- **Scenario B — elsewhere**
  - GIVEN the user navigated away (any route, same tab, or a resumed tab)
  - WHEN the job reaches a terminal state
  - THEN only the completion dialog opens (existing behaviour)
  - AND IT MUST keep the dialog's "Review drafts" as the only navigation.
- **Scenario C — copy by code**
  - GIVEN `error_code ∈ {HTTP_413, HTTP_415, HTTP_502, HTTP_503, PROCESSING_ERROR, TIMED_OUT, QUEUE_STALLED, QUEUE_NOT_AVAILABLE}`
  - WHEN the failed state renders (panel or dialog)
  - THEN the message names the cause in plain words and the action (retry, upload smaller files, try later, contact support) — one table in the client, tested per code
  - BUT it must NOT show raw server messages or stack fragments.

#### `APF-R-9` — "Try again" reuses the job (MUST)

- GIVEN a `FAILED` job shown in the panel or the dialog
- WHEN the user clicks "Try again"
- THEN the client calls the retry endpoint (`APF-R-5`), the panel returns to the queued step for the same `jobId`, and no new upload happens
- BUT it must NOT be enabled while the job is alive (`PENDING`/`PROCESSING`)
- AND IT MUST, on 410 (sources gone), reset the panel to the upload form with the explanation.

#### `APF-R-10` — Persistent "AI job running" chip (MUST)

- GIVEN a job is alive for the current center (resume record present or polling active)
- WHEN any bilateral tab renders
  - THEN the center header shows a chip "AI job running · 04:12" (elapsed, updating each second) next to the drafts badge, linking to the upload step's processing panel (`/bilateral/<acronym>/create?job=<id>`)
- BUT it must NOT appear for other centers' jobs nor after a terminal state (it turns into the drafts badge count change + dialog/notification)
- AND IT MUST be keyboard reachable with an accessible name that includes the elapsed time, and respect `prefers-reduced-motion` (no pulsing).

#### `APF-R-11` — Set-up step: collapse "coming soon" (SHOULD)

- GIVEN the set-up step (primary SP + creation method)
- WHEN it renders
- THEN the "Contributing Science Programs — coming soon" block is collapsed behind a one-line disclosure ("Contributing programs · coming soon ›") so the decision step shows only what the user can act on
- BUT it must NOT change the primary SP selection or the two creation cards.

### 6.3 Transparency

#### `APF-R-12` — AI transparency notice (MUST)

Every AI-originated artefact SHALL carry a notice: "Generated with AI assistance from your sources. Review and edit before submitting."

| Surface | Placement |
|---|---|
| Draft Results list | one line under the tab title when ≥ 1 AI draft exists |
| Draft card | existing "AI Result" badge, copy aligned to the notice (`title`/`aria-label`) |
| Promoted result editor (`/bilateral/<acronym>/result/:id`) | a dismissible-per-session info banner at the top of the form when `creation_method = 'AI'` |
| Result detail (read-only) | a static badge next to the status pill |
| Completion dialog | one line above the actions |

- GIVEN a result with `creation_method = 'AI'` (or a draft)
- WHEN any of the surfaces renders
- THEN the notice is present, uses the info token pair (not a status colour), and the badge/notice text is in the accessible name
- BUT it must NOT appear on manually created results (`creation_method ≠ 'AI'`)
- AND IT MUST persist after the user edits the result (provenance is about origin, not current content — `APF-OQ-2` may override the wording, not the presence).

### 6.4 Should / May

- **`APF-R-20`** (SHOULD) The polling interval SHOULD adapt: 5 s during the first 2 minutes, 15 s until the ceiling, 30 s in "still running".
- **`APF-R-21`** (SHOULD) Job history for the expected range SHOULD be served from a small aggregate query with a 10-minute in-memory cache on the server.
- **`APF-R-22`** (SHOULD) The in-app notification row SHOULD show the job's source mix and duration.
- **`APF-R-30`** (MAY) Cancel a `PENDING` job (`CANCELLED` status honoured by the consumer before calling mining) — `APF-OQ-5`.
- **`APF-R-31`** (MAY) When the mining team exposes progress callbacks, refine `stage` from them (Option 2 in `proposal.md`).

---

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Honesty** | No copy states a fact the server does not hold; "estimated" appears wherever a stage is inferred rather than observed |
| **Performance** | `getJob` adds ≤ 1 extra query (queue position) and stays < 150 ms P95 on prtest; sweeper runs in < 1 s for 10k rows (indexed `status`, `started_date`) |
| **Reliability** | Sweeper and consumer never double-flip: every status transition is a conditional `UPDATE … WHERE status = <expected>`; notification sending is fire-and-forget with `warn` logging |
| **Requests (client)** | Polling ≤ 12/min in the first 2 min, ≤ 4/min after, ≤ 2/min in "still running"; the chip shares the service's single poll (no second timer) |
| **Security / privacy** | Retry endpoint owner-only (403); `AC-9`: no emails, keys, payloads in logs; notification bodies carry counts and codes, not source file names beyond what the mail template already shows |
| **Backwards compatibility** | `GET jobs/:id` additive only; the `/api/bilateral/*` change log updated; old clients ignore new fields |
| **Accessibility** | `aria-live` for stage changes; chip and badges named with their values; reduced motion honoured; dialog rule 4 |
| **Design system** | Tokens only, Tailwind utilities, SCSS `:host` only, `material-icons-round`; grep gates `#[0-9a-fA-F]{3,8}` = 0, `pi pi-` = 0, `rgba?(` = 0 in new templates; never mix named and arbitrary breakpoints on one property (`KZ-bilateral--center-overview-tab-1`). **Token existence gate:** every `var(--pr-…)` name used in a new or changed template must exist in `onecgiar-pr-client/src/styles/colors.scss` — extract `var\(--pr-[a-z0-9-]+\)` from the templates, `grep` each name in `colors.scss`, zero misses. A hex/icon/rgba gate is blind to a well-formed `var()` that names a token nobody defined |
| **i18n** | English literals like the sibling components; mail templates in the DB `template` table |

---

## 8. Acceptance Criteria

| ID | Given | When | Then | Covers |
|---|---|---|---|---|
| `APF-AC-1` | 2 jobs ahead | read job | `stage = queued`, `queue_position = 2`, all old fields intact | R-1 A |
| `APF-AC-2` | consumer runs a doc + audio job | processJob | stages advance `uploading → reading/transcribing → extracting → validating → creating_drafts`, each with a timestamp | R-1 B |
| `APF-AC-3` | attempt `started_date` older than `BILATERAL_AI_ATTEMPT_TIMEOUT_MS` (15 min) | sweep | `FAILED / TIMED_OUT`, one notification; a later mining response still creates drafts and re-notifies — **and a second run of that late branch creates no duplicate `Result` rows** (the draft for `(job_id, candidate_index)` is reused) | R-2 A |
| `APF-AC-4` | oldest `PENDING` older than the stall window **and** no `started_date` / `stage_updated_date` anywhere inside it | sweep | `FAILED / QUEUE_STALLED`, one notification, `warn` log without payload; an old job stays untouched while any other job is advancing | R-2 B |
| `APF-AC-5` | retryable 503 on attempt 1 | requeue | `PROCESSING`, `retrying = true`, `attempts = 1`, `stage = queued`; not `FAILED` | R-3 |
| `APF-AC-6` | job completes with 0 drafts after 3 min | terminal | 1 in-app + 1 `NO_CANDIDATES` mail; under 2 min → in-app only | R-4 |
| `APF-AC-7` | `FAILED` job, owner | `POST …/retry` | 202 same id, `PENDING`, re-published; alive → 409; other user → 403; keys gone → 410 | R-5 |
| `APF-AC-8` | `PENDING`, position 2, mix class `documents` or `audio` (no third class) | panel | "Queued · 2 jobs ahead", elapsed timer from `queue_entry_date`, expected range text from `GET …/ai/expectations?mix=` | R-6 A/D |
| `APF-AC-9` | `PROCESSING / extracting` | panel | stepper state per stage, source mix stated, no percentage, `aria-live` announces | R-6 B |
| `APF-AC-10` | `retrying`, attempt 2/3 | panel | "Retrying (attempt 2 of 3)" + last error line, stepper at queued | R-6 C |
| `APF-AC-11` | 30 min polling, server alive | ceiling | "Still running" state, polling at 30 s, no failed state, record kept | R-7 |
| `APF-AC-12` | terminal while on the panel | render | inline outcome only, dialog suppressed | R-8 A |
| `APF-AC-13` | terminal while elsewhere | render | dialog only | R-8 B |
| `APF-AC-14` | each `error_code` | failed render | plain-words cause + action; no raw server text | R-8 C |
| `APF-AC-15` | `FAILED` job | Try again | retry endpoint called, same id, panel back to queued; disabled while alive; 410 → upload form | R-9 |
| `APF-AC-16` | job alive | any bilateral tab | header chip with elapsed time, links to the panel; gone at terminal; not for other centers | R-10 |
| `APF-AC-17` | set-up step | render | "coming soon" collapsed behind a disclosure; SP selection and cards unchanged | R-11 |
| `APF-AC-18` | AI draft / AI result / manual result | render surfaces | notice present on all five AI surfaces; absent on manual; present after edits | R-12 |
| `APF-AC-19` | new / changed templates | grep | 0 hex / `pi pi-` / `rgba(`; no named+arbitrary breakpoint mix; **every `var(--pr-…)` name resolves in `onecgiar-pr-client/src/styles/colors.scss`, zero misses** | NFR |
| `APF-AC-20` | `bilateral-result-summaries.en.md` | review | change-log entry for the additive `GET jobs/:id` fields | NFR compat |
| `APF-AC-21` | live job on prtest (doc + audio) | HITL | stepper, elapsed, chip, single outcome surface, mail received, notification row — screenshots per state | R-6, R-8, R-10 live |

Cross-cutting project ACs that apply without restating: `AC-3` (authorization), `AC-9` (secrets).

---

## 9. Defect Classes → Gates

| # | Defect class | Gate | Input that would make the gate fail | Blind spot / substitute |
|---|---|---|---|---|
| D1 | Wrong lifecycle transition (double flip, FAILED bounce, sweeper on a live job) | Server Jest on `processJob` / sweeper with a repository mock asserting conditional `UPDATE … WHERE status` and call counts | a sweeper fixture with `started_date` inside the window flipping to `TIMED_OUT` | race under two API instances is not unit-testable → **HITL on prtest with two instances is not available**; accepted risk, mitigated by conditional updates |
| D2 | Client-declared failure / false timeout | Client Jest with fake timers advancing 30 min while the mock server keeps `PROCESSING` | any `status: 'failed'` set without a server terminal state | — |
| D3 | Double surface (panel + dialog) | Client Jest on the **`panelVisible` signal**, not the router: `panelVisible` true → the panel renders the outcome inline and `completionNotice` stays unset; `panelVisible` false → `completionNotice` is set and no inline outcome exists | a terminal state that sets `completionNotice` while `panelVisible` is true | a router-only test proves nothing — the design decides by `panelVisible` (`APF-DD-7`), and the drawer host can show the panel on any URL |
| D4 | Dishonest copy (percentage, wrong stage, invented range) | Jest snapshot-free DOM assertions per stage; range test with 4 vs 5 samples | a `%` string in the panel; a range with 4 samples | wording judgement (does "estimated" read honestly) → human check at the HITL pause |
| D5 | Notification duplication or silence | Server Jest: each terminal state → exactly one `createNotification` + `sendEmail` call (or none under 2 min); late completion → second "after all" | two mail calls for one terminal state | mail delivery itself → HITL: one real mail received |
| D6 | Payload-shape drift (string dates/ids, `retrying` as `0/1`) | Client fixtures built from a **captured real `getJob` response** (`KZ-…-center-strip-and-phase-1`); `Number()`/`Boolean()` normalization tests | fixture with `attempts: "2"` and `retrying: 1` | — |
| D7 | Layout / responsive (stepper wraps, chip overflows header at 375) | Cypress CT for the panel at 1280 / 900 / 375 and the header with the chip at 375; `scrollWidth ≤ clientWidth` | chip `min-w` pushing the tab strip into overflow | measured on the real scroller |
| D8 | Hard-rule drift (hex, PrimeIcons, rgba, breakpoint mix, **undefined design token**) | grep gates in DoD (`APF-AC-19`), including the token-existence gate: extract `var\(--pr-[a-z0-9-]+\)` from new/changed templates and `grep` each name in `onecgiar-pr-client/src/styles/colors.scss` | one `rgba(` in a template; **`--pr-status-rejected-fg`** — a well-formed `var()` naming a token that does not exist (only `--pr-danger` / `--pr-danger-soft` / `--pr-danger-bg` do), which the hex/icon/rgba gates pass and the browser renders as an unset colour | — |
| D9 | Contract doc drift | Reviewer checks `bilateral-result-summaries.en.md` change log against the DTO diff | new field with no log line | — |
| D10 | a11y (aria-live, names, reduced motion) | Jest DOM assertions for `aria-live` region text changes on stage change and for the chip name containing the time. **Reduced motion moves to Cypress CT**: stub `matchMedia` for `prefers-reduced-motion: reduce` in `onBeforeLoad`, mount the panel and the chip, assert no animation class and a computed `animation-name: none` | a pulsing active step dot under `prefers-reduced-motion: reduce`; chip as `<div (click)>` | jsdom evaluates no media query, so a `motion-reduce` class assertion there measures nothing — that row is deleted, not kept as weak evidence. Focus visibility / contrast → HITL by eye (recorded as not measured) |
| D11 | Live behaviour (queue position under concurrency, mail, notification row, chip across tabs) | **HITL on prtest**: two jobs started 30 s apart from two accounts; screenshots per state | position never > 0 | the only proof of C1; inconclusive if the consumer is not running on prtest — check first |

**Accepted risk:** multi-instance sweeper races (D1) and copy tone (D4) have no automated gate; both are named at the HITL pause.

---

## 10. Dependencies & Assumptions

### Upstream

- RMQ configured on the target environment (`RABBITMQ_URL`, `BILATERAL_AI_PROCESSING_QUEUE`); the consumer runs inside the API process (`main.ts`).
- Mining service reachable (`BILATERAL_AI_TEXT_MINING_URL`, key, timeout) — unchanged.
- Email microservice + DB `template` rows: new templates require a data migration.
- In-app notification module (`api/notification`) accepts a programmatic row for a user.

### Downstream

- None outside PRMS; `/api/bilateral/*` consumers see additive fields only.

### Assumptions

- `prefetchCount: 1` stays for now (`APF-OQ-4`); queue position is therefore meaningful.
- Job history on prtest has ≥ 5 completed jobs per mix class within 90 days; otherwise the fallback copy shows (by design).
- The mining service does not expose progress; intermediate stages are inferred and labelled "estimated".

---

## 11. Open Questions

- **`APF-OQ-1`** — Jira ticket id. *Commit messages only.*
- **`APF-OQ-2`** — Final transparency copy and whether SP reviewers see the notice (default: yes, static badge). *Design proceeds with the default wording; product can override text before T-final.*
- **`APF-OQ-3`** — Will the mining team expose stage/progress callbacks? *Does not block; `APF-R-31` MAY.*
- **`APF-OQ-4`** — Is `prefetchCount: 1` intentional (Bedrock cost) or incidental? *Decides whether "queue position" stays long-term; UI ships it either way.*
- **`APF-OQ-5`** — Cancel a queued job? *MAY; not scheduled.*
- **`APF-OQ-6`** — **RESOLVED (Judgment Day round 1, 2026-09-15):** the timeout is **per attempt**, `BILATERAL_AI_ATTEMPT_TIMEOUT_MS` default **15 min** (the 10-min mining HTTP timeout + 5 min margin), measured from the attempt's `started_date`. Its purpose is catching a dead consumer or process mid-attempt, not capping the job; the whole-job worst case is `max_attempts × 15 min` = 45 min. **Ops may tune the value via the env var** without a code change. A whole-job 35-min unit was rejected: the mining client aborts at 10 min, so a live attempt can never reach it.

---

## 12. Out-of-Band Notes

- The text-mining artifact the user shared documents the mining service only (synchronous; no job layer). The job layer facts in §3.1 come from `onecgiar-pr-server/src/api/bilateral-ai/*` and `onecgiar-pr-client/src/app/pages/bilateral/services/bilateral-ai.service.ts` as of `2c818e451`.
- The archived handoff (`2026-07-31-bilateral-ai-workflow/bilateral-ai-integration-handoff.md` §6 "Qué responde mining → PRMS") is the response contract the stage model must not contradict.
- `bilateral-results-list.component.ts` `asCurrentResult` string-id compare (archive item from `center-overview-tab`) is unrelated and stays a separate quick fix.

---

## Required cross-references

- `docs/specs/bilateral/ai-processing-feedback/proposal.md`
- `docs/prd.md` (US-P1, AC-3, AC-9) · `docs/ux-ui/design.md` (§7, §8, §10) · `docs/trd/trd.md` (§6, §8)
- `onecgiar-pr-server/src/api/bilateral/CLAUDE.md` §6, §7.5 · `onecgiar-pr-server/docs/bilateral-result-summaries.en.md`
- `onecgiar-pr-client/CLAUDE.md` §5 Hard UI rules
- `docs/specs/archive/2026-07-31-bilateral-ai-workflow/bilateral-ai-integration-handoff.md`
