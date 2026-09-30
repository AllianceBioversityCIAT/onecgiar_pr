# Requirements — Bilateral AI Processing Queue: Two Fair Lanes and the "AI processes" Drawer

## Document Control

| Field | Value |
|---|---|
| **Module** | `bilateral` |
| **Sub-feature** | `ai-processing-queue` |
| **Spec Path** | `docs/specs/bilateral/ai-processing-queue/` |
| **Type** | Change |
| **Depth** | **Full**: concurrency change in a background worker, a new API response, and a shipped UI surface replaced. Re-checked against the design in `design.md` (Budget). |
| **Approval Mode** | gated (inherited from `proposal.md`) |
| **Requirement prefix** | `AIQ` (AI Queue): `AIQ-R-n`, `AIQ-AC-n`, `AIQ-US-n`, `AIQ-OQ-n`, `AIQ-D-n` |
| **Owner** | Juan David Delgado (j.delgado@cgiar.org) |
| **Status** | approved (gated, 2026-09-29) |
| **Ticket(s)** | P2-3853 (INC-163067), parent epic P2-2338 |
| **Source of intent** | `proposal.md` (2026-09-29): decisions by the product owner in the proposal conversation; spike §12.1 |
| **Visual reference** | `mockup/ai-processes-drawer.html` (proposal phase; desktop drawer, supporting states, 375 px sheet) |
| **Builds on** | `docs/specs/archive/2026-09-15-bilateral--ai-processing-feedback/` (`APF-*`): keeps `APF-R-2/3/5/7/9`, modifies `APF-R-1/6/8/10` |
| **Baseline cited** | `docs/prd.md` G4, M4.3, AC-8, AC-9 · `docs/ux-ui/design.md` §6 drawers, §7 brand line, §9 responsive, §10 a11y, DD-9, DD-12 · `docs/trd/trd.md` W5 (RMQ ack after success), W8, ADR-006 · `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` (payload change log) |
| **Kaizen lessons applied** | `bilateral--ai-processing-feedback` **L1** (measure baseline overflow before zero-overflow gates), **L2** (keep base utility classes next to responsive variants), **L3** (all lifecycle timestamps and comparisons in DB time; HITL across hosts with different `TZ`) |
| **UI decisions delegated to the architect** | The product owner delegated the flow and the UI (2026-09-29). Resolved here: the trigger stays in the bilateral header slot of `APF-R-10`; "Finished" = the caller's jobs finished in the last 24 h, at most 10; other users appear only as a count. |

---

## 1. Executive Summary

Today a Center user who starts AI text mining for one project **cannot start another** from the same browser until the first finishes. The client tracks a single job and hides the upload form while it runs. The server queue, meanwhile, runs **one job at a time for everyone**, so two users who submit together wait on each other.

This spec makes submission **never blocking**. Up to **two jobs run at once, at most one per user**, and the rest wait in a fair order. A new **"AI processes" drawer** shows every job the user has: what is running and at which stage, what is waiting and *why*, and what finished, with a direct route to the drafts. Waiting jobs show a position, never an ETA. The spike measured the same document at 115 s and at 183 s, so any ETA would be wrong half the time.

Speed of the AI service itself (ticket AC6/AC7) is out of scope. The spike showed the time is spent inside AI Assisted, not in PRMS queueing nor in Lambda cold start (~7 s).

---

## 2. Glossary

| Term | Meaning here |
|---|---|
| **Job** | A row in `bilateral_ai_jobs`; one submission = one job (`APF` glossary) |
| **Lane** | One slot in which a job can be `PROCESSING`. Lanes are global across all users and API containers |
| **Global cap** | Max jobs `PROCESSING` at once (default **2**, env-tunable) |
| **Per-user cap** | Max jobs of one user `PROCESSING` at once (default **1**, env-tunable) |
| **Eligible job** | A `PENDING` job whose owner is below the per-user cap |
| **Fair order** | Waiting jobs start by `queue_entry_date` ascending, skipping only the ones that are not eligible |
| **Parked job** | A `PENDING` job whose start was attempted and refused (no lane, or its owner already runs one). It stays `PENDING` and is started later by re-dispatch |
| **Re-dispatch** | Starting the next eligible job(s) whenever a lane may have freed |
| **Wait reason** | Why a `PENDING` job is not running: `own_job_running` (its owner already has one running), `no_free_lane` (all lanes busy), or `starting` (eligible and a lane is free; the start is in flight, normally seconds) |
| **Jobs ahead** | Count of `PENDING` jobs (any user) with an older `queue_entry_date` |
| **Queue summary** | Lanes total, lanes in use, and the number of other users' waiting jobs, as bare numbers |
| **Drawer** | The new "AI processes" side panel (full-screen sheet below 640 px) |
| **Trigger** | The header control that opens the drawer and shows the active-job badge |
| **Active job** | A job in `PENDING` or `PROCESSING` |
| **Queue-entry clock** | `queue_entry_date = COALESCE(retried_date, created_date)` (`APF` glossary) |

---

## 3. System Context & Scope

### 3.1 Current behavior (evidence as run, 2026-09-29, commit `b3aebb013`)

| # | Today | Evidence |
|---|---|---|
| C1 | The client tracks one job: one `activeJob`, one `uploadState`, one polling timer, one localStorage key `prms.bilateral-ai.active-job` | `onecgiar-pr-client/src/app/pages/bilateral/services/bilateral-ai.service.ts:41,69,91,94` |
| C2 | The upload form renders only when `uploadState().status` is `idle`/`uploading`; while a job is alive the panel replaces it | `pages/bilateral/components/bilateral-ai-upload/bilateral-ai-upload.component.html:1,329-339` |
| C3 | The server accepts any number of jobs: `POST center/ai/jobs` saves `PENDING` and publishes, returns 202 | `onecgiar-pr-server/src/api/bilateral-ai/services/bilateral-ai.service.ts:117-176` |
| C4 | The AI queue consumer uses `prefetchCount: 1`, so one job runs at a time per API container | `onecgiar-pr-server/src/main.ts:82-93` |
| C5 | `queue_position` = count of `PENDING`/`PROCESSING` jobs with older `queue_entry_date`, computed at read time | `services/bilateral-ai.service.ts:186-208` |
| C6 | No endpoint lists a user's jobs; routes are `POST jobs`, `GET jobs/:jobId`, `POST jobs/:jobId/retry`, `GET expectations`, `GET files/signed-url`, drafts routes | `onecgiar-pr-server/src/api/bilateral-ai/bilateral-ai.controller.ts:30-122` |
| C7 | The header chip shows only the one tracked job and only for its own Center | `pages/bilateral/components/bilateral-page-header/bilateral-page-header.component.ts:52-66` |
| C8 | A global completion dialog is mounted app-wide and fires when the panel is not visible | `onecgiar-pr-client/src/app/app.component.html:65`; `services/bilateral-ai.service.ts:81-89,277-278` |
| C9 | The terminal in-app notification exists; outbound AI emails are suppressed | `onecgiar-pr-server/src/api/notification/enum/notification.enum.ts:29`; `services/bilateral-ai-notifications.service.ts:113` |
| C10 | A creator deep link `?job=<id>` resumes a job in the upload component | `bilateral-ai-upload.component.ts:167-169`; `bilateral-result-creator.component.ts:619,647` |
| C11 | Number of API containers consuming the AI queue in prtest/prod | `UNVERIFIED — confirm at source before relying on it` |

### 3.2 In scope

1. Server: fair two-lane dispatch with global and per-user caps, parking and re-dispatch, stall rule consistent with parking.
2. Server: `GET center/ai/jobs` list for the caller, with wait reason, jobs ahead and queue summary; `queue_position` semantics aligned.
3. Client: multi-job tracking with one batched poll and resume after reload.
4. Client: never-blocked submission (form resets, confirmation, toast).
5. Client: "AI processes" drawer, header trigger, completion toasts; inline panel reduced to a confirmation.
6. Copy through `src/app/internationalization/`; contract doc change log.
7. Tests: server unit (dispatch, re-dispatch, list, stall), client unit (service, drawer, trigger, upload), Cypress CT layout and reduced motion, HITL on prtest with two consumers.

### 3.3 Out of scope

- AI Assisted speed and extraction quality (ticket AC6/AC7). Measured in `proposal.md` §12.1; owned by the AI Assisted service.
- Changing the default caps in production (ops decision; env vars exist).
- Cancelling a waiting job (`AIQ-OQ-3`).
- Real-time push (sockets are off; "real time" = adaptive polling).
- Re-enabling AI emails.
- Any detail of other users' jobs beyond a count.

---

## 4. Stakeholders / Personas

| Persona | What changes for them |
|---|---|
| Result submitter, Center staff (bilateral AI reporting) | Can queue several projects in a row; sees every job, its stage and why it waits; finds results from the drawer |
| Other Center users sharing the queue | Two users run at once instead of one; nobody can hold both lanes |
| Platform admin / ops (Juan David, Cris) | Two env vars tune the lanes; `MAX_CONCURRENT=1` restores today's single lane |
| AI Assisted service | Receives at most 2 concurrent calls from PRMS (spike: 2 and 3 concurrent calls succeeded) |

---

## 5. User Stories

- **`AIQ-US-1`**: As a Center user, I want to submit evidence for another project while one is processing, so that I am never blocked. *(Refines US-S1: creating results; here via AI-assisted drafts.)*
- **`AIQ-US-2`**: As a Center user, I want to see all my AI jobs with their stage and why they wait, so that I trust they will finish without me watching. *(No direct PRD story; extends the archived `APF` feedback stories.)*
- **`AIQ-US-3`**: As a Center user, I want to jump from a finished job to its drafts, or retry a failed one, so that I act on the outcome in one click.
- **`AIQ-US-4`**: As a Center user, I want my job to start as soon as a lane frees even if another user submitted many jobs, so that the queue is fair.
- **`AIQ-US-5`**: As ops, I want the lane counts tunable without a deploy, so that I can react if AI Assisted degrades.

---

## 6. Functional Requirements

### 6.1 Server: dispatch

#### `AIQ-R-1`: Fair two-lane dispatch (MUST)

The system SHALL run at most **global cap** jobs in `PROCESSING` at once, and at most **per-user cap** per user, starting waiting jobs in fair order.

- **Scenario A: two users at once**
  - GIVEN no job is running
  - WHEN user A and user B each submit one job within the same second
  - THEN both jobs reach `PROCESSING` without either waiting for the other
- **Scenario B: same user, second project**
  - GIVEN user A has one job `PROCESSING` and a lane is free
  - WHEN user A submits a job for another project
  - THEN the new job stays `PENDING` with wait reason `own_job_running`
  - AND IT MUST start automatically when A's running job reaches a terminal state
- **Scenario C: fair order (worked example)**
  - GIVEN jobs A1, A2, B1, C1 submitted in that order (letters = owners) and no job running
  - WHEN dispatch runs
  - THEN A1 and B1 run; A2 and C1 wait
  - AND when B1 finishes, **C1** starts (the oldest eligible), not A2
  - AND when A1 finishes, A2 starts
  - BUT it must NOT start A2 while A1 is `PROCESSING`, even when a lane is free
- **Scenario D: cap holds across containers**
  - GIVEN two API containers consume the AI queue
  - WHEN five jobs from five users are submitted together
  - THEN at no instant are more than 2 jobs `PROCESSING`
  - AND IT MUST enforce both caps from the database, never from in-process state
- **Scenario E: single-lane fallback**
  - GIVEN global cap = 1
  - WHEN several users submit
  - THEN exactly one job runs at a time in `queue_entry_date` order, which is today's behavior
- **Scenario F: retry keeps its lane**
  - GIVEN a `PROCESSING` job enters a retry (`retrying = 1`, `APF-R-3`)
  - WHEN dispatch runs
  - THEN that job still occupies its lane and its owner's slot
  - BUT it must NOT let another job take the lane between attempts

#### `AIQ-R-2`: Waiting jobs always start (MUST)

A parked job SHALL start once it becomes eligible and a lane is free, without user action.

- **Scenario A: re-dispatch on terminal transition**
  - GIVEN job X is parked and the only running job reaches `COMPLETED`, `FAILED`, or is failed by the sweeper
  - WHEN that transition is written
  - THEN re-dispatch starts X within one dispatch cycle
- **Scenario B: safety net**
  - GIVEN a lane is free and an eligible job is parked, but the re-dispatch after the last terminal transition was lost (process crash)
  - WHEN the sweeper runs
  - THEN it re-dispatches the eligible job(s)
- **Scenario C: duplicates are harmless**
  - GIVEN a job receives two start messages
  - WHEN both are processed
  - THEN the job runs once; the second message is acknowledged without calling the mining service
- **Scenario D: user retry enters fair order**
  - GIVEN a `FAILED` job is retried (`APF-R-5`/`APF-R-9`)
  - WHEN it re-enters the queue
  - THEN it goes to the back of fair order (`queue_entry_date` = retry time) and obeys both caps

#### `AIQ-R-3`: Timeouts measure running time only (MUST)

- **Scenario A**
  - GIVEN a job waited 20 minutes parked and then started
  - WHEN the sweeper evaluates it 5 minutes after it started
  - THEN it is not `TIMED_OUT` (the attempt timeout counts from the attempt's `started_date`, `APF-R-2`)
  - AND IT MUST write and compare every lifecycle timestamp in DB time (`KZ L3`)

#### `AIQ-R-4`: Stall rule is consistent with parking (MUST)

`QUEUE_STALLED` SHALL fire only when the queue has no live worker activity, never because jobs are legitimately parked.

- **Scenario A: parked behind a live job**
  - GIVEN user A's job has been `PROCESSING` for 10 minutes with fresh stage updates, and A's second job has waited 31 minutes
  - WHEN the sweeper runs
  - THEN A's second job is NOT failed with `QUEUE_STALLED`
- **Scenario B: truly stalled**
  - GIVEN the oldest `PENDING` job has waited longer than the stall window and no job shows worker activity in that window
  - WHEN the sweeper runs
  - THEN re-dispatch is attempted first, and `QUEUE_STALLED` fires only if the job still cannot start (`APF-R-2` B)

### 6.2 Server: reading the queue

#### `AIQ-R-5`: List my AI jobs (MUST)

`GET /api/bilateral/center/ai/jobs` SHALL return the caller's active jobs plus the caller's jobs finished in the last 24 h (at most 10 finished, newest first), across all Centers the caller can access, and a queue summary.

- **Scenario A: content per job**
  - GIVEN the caller has one running, two waiting and three finished jobs
  - WHEN they call the endpoint
  - THEN each job carries: id, status, stage, project id and name, program code, Center acronym, document/audio/text counts, `queue_entry_date`, `started_date`, `completed_date`, `result_count`, `error_code`, `attempts`, `retrying`, and for `PENDING` jobs `wait_reason` and `jobs_ahead`
  - AND the summary carries `lanes_total`, `lanes_busy`, `others_waiting`
- **Scenario B: privacy**
  - GIVEN other users have running and waiting jobs
  - WHEN the caller lists their jobs
  - THEN other users' jobs appear only inside the summary counts
  - BUT it must NOT return any other user's id, name, email, project, file name or job id
- **Scenario C: auth**
  - GIVEN a request with no `auth` header
  - THEN the caller resolves to no user and the list is empty, exactly as the existing `center/ai/*` routes resolve the caller (`@UserToken()`)
  - BUT it must NOT introduce a weaker identity check than the existing `center/ai/*` routes (the pre-existing trust model is fixed by P2-3854, not here; see `design.md` §7)
- **Scenario D: empty**
  - GIVEN the caller has no jobs in the window
  - THEN the list is empty and the summary is still returned

#### `AIQ-R-6`: Position and wait reason are honest (MUST)

- **Scenario A: wait reason**
  - GIVEN a `PENDING` job whose owner has a `PROCESSING` job
  - THEN its `wait_reason` is `own_job_running`; otherwise, while all lanes are busy, it is `no_free_lane`; otherwise it is `starting`
- **Scenario B: monotonic position**
  - GIVEN a `PENDING` job
  - WHEN it is read repeatedly while it waits
  - THEN `jobs_ahead` never increases
  - AND `GET jobs/:jobId` returns the same `jobs_ahead` and `wait_reason` as the list, keeping `queue_position` for backward compatibility (`APF-R-1` modified)
- **Scenario C: no ETA anywhere**
  - BUT the API must NOT return an estimated start or finish time for a waiting job

### 6.3 Client: submission and tracking

#### `AIQ-R-7`: Submission never blocks (MUST)

- **Scenario A**
  - GIVEN a job is running for project P-1
  - WHEN the user opens the upload for project P-2
  - THEN the upload form is available and submittable
- **Scenario B: after submit**
  - GIVEN the user submits evidence for P-2
  - AND the create wizard's steps stay unlocked while jobs run (today they lock while a job is alive)
  - WHEN the server returns 202
  - THEN the form resets to empty, a confirmation shows "P-2 was added to the AI queue" with **Open AI processes** and **Choose another project**, and a toast confirms with a **View** action
  - AND the new job appears in the drawer at once
  - BUT it must NOT replace the upload form with a processing panel (`APF-R-6` modified)
- **Scenario C: submit fails**
  - GIVEN the server rejects the submission (4xx/5xx or network)
  - THEN the form keeps the user's files and text and shows the error inline (current error surface); no job is added

#### `AIQ-R-8`: Track many jobs and resume (MUST)

- **Scenario A: one poll for N jobs**
  - GIVEN the user has 3 active jobs
  - WHEN the client polls
  - THEN it issues **one** list request per poll, never one request per job
  - AND IT MUST keep the adaptive cadence of `APF-R-7` (5 s → 15 s → 30 s), measured from the most recent active job's queue entry
- **Scenario B: stop when idle**
  - GIVEN no active jobs remain
  - THEN polling stops; it restarts on the next submission or when the drawer opens
- **Scenario C: resume**
  - GIVEN the user reloads, or opens a second tab
  - THEN active jobs are shown again and polling resumes, without any stored single-job record
  - AND a legacy `prms.bilateral-ai.active-job` record is read once, its job included, and the key removed (**REMOVED**: the single-job record)
- **Scenario D: deep link**
  - GIVEN the URL carries `?job=<id>` (C10)
  - THEN the drawer opens with that job highlighted

### 6.4 Client: the drawer and the trigger

#### `AIQ-R-9`: "AI processes" drawer (MUST)

The drawer SHALL list the caller's jobs in three groups, in this order: **Running**, **Waiting**, **Finished** (last 24 h). Each group has a count; empty groups are hidden.

- **Scenario A: header**
  - THEN the drawer shows the title, the line "You can keep working or leave this page. Each job finishes on its own and its results go to My drafts", and a lanes strip "N of M lanes in use · K jobs from other users are waiting"
- **Scenario B: running card**
  - THEN it shows project, program, source counts, live elapsed time (from `started_date`), the current stage from the server, the per-mix expected range (`GET center/ai/expectations`, `APF-R-6` D), and an **indeterminate** progress indicator
  - BUT it must NOT show a percentage
- **Scenario C: waiting card**
  - THEN it shows time in queue, the wait reason in words ("Starts when your job for <project> finishes" / "Waiting for a free lane") and the position ("Next" when `jobs_ahead = 0`, else "N ahead")
  - BUT it must NOT show an estimated start time
- **Scenario D: finished cards**
  - GIVEN `COMPLETED` with drafts → "N drafts ready" + **View N drafts** (opens My drafts of the job's Center with `?job=<id>`; the job's session group is scrolled into view and highlighted)
  - GIVEN `COMPLETED` with zero drafts → "No results found in this evidence" + **Report manually**
  - GIVEN `FAILED` → a plain-language reason from `error_code` + **Try again** ("Uses the same files, no re-upload", `APF-R-5`; disabled while the job is still alive) + **Upload different files** (opens the creator's AI way for that project); a 410 on retry shows that the files are gone
  - AND IT MUST keep the panel's detail it replaces: "estimated" captions on inferred stages, the attempt badge ("Attempt X of Y") while retrying, the source-mix line, the expected-range fallback copy, and the AI provenance notice on completed cards (`APF-R-12` surface moves from the dialog to the card)
- **Scenario E: taking longer**
  - GIVEN a running job passes the client ceiling (`APF-R-7` still running)
  - THEN its card shows "Still working. You don't need to do anything; we'll notify you", with the running styling, never an error styling
- **Scenario F: footer**
  - THEN the drawer ends with "Time depends on the evidence: from about 30 seconds to a few minutes, longer with audio. You'll get a notification in the bell when each job finishes."
- **Scenario G: loading / error / empty**
  - GIVEN the first list request is in flight → skeleton cards
  - GIVEN a list request fails → the last known list stays, with a one-line "Couldn't refresh. Retrying…" notice; the next poll retries
  - GIVEN no jobs → empty state "No AI processes yet" + **Start with evidence**
- **Scenario H: live changes**
  - WHEN a job changes group (waiting → running → finished)
  - THEN the card moves with a short transition and the change is announced through a polite live region
  - AND IT MUST disable transitions under `prefers-reduced-motion: reduce`

#### `AIQ-R-10`: Header trigger (MUST)

- **Scenario A: placement**
  - THEN the trigger lives where the `APF-R-10` chip lives (nav end slot ≥ 640 px, identity row < 640 px) on every bilateral page, for every Center
  - AND IT MUST also render on the create wizard (the header's `pageTitle` variant), where the chip does not render today and where the user uploads evidence
  - BUT it must NOT depend on the Center the job was started from (`APF-R-10` modified)
- **Scenario B: states**
  - GIVEN no active and no unseen finished jobs → "AI processes", quiet styling, no badge
  - GIVEN active jobs → spinning ring + badge = active count
  - GIVEN no active jobs but unseen finished ones → success badge = unseen count; opening the drawer marks them seen
- **Scenario C: accessible name**
  - THEN the accessible name includes the counts ("AI processes: 1 running, 2 waiting") and `aria-expanded` reflects the drawer

#### `AIQ-R-11`: Completion surfaces (MUST)

- **Scenario A**
  - GIVEN a tracked job reaches a terminal state
  - THEN a **sticky** toast announces it ("P-1941 is ready: 4 drafts" + **Open drafts**, or the failure line + **View**), staying until closed or acted on; the trigger badge updates, and the bell notification arrives as today (C9)
  - AND IT MUST work on any route of the app, not only bilateral pages, when the browser has active jobs (today the app-wide dialog keeps the tracker alive everywhere)
  - BUT it must NOT open the blocking global completion dialog (`APF-R-8` modified, C8)
- **Scenario B: several at once**
  - GIVEN two jobs finish within the same poll
  - THEN two toasts are shown, one per job, or one grouped toast ("2 jobs finished") when more than 2 finish in one poll

#### `AIQ-R-12`: Accessibility and responsive (MUST)

- **Scenario A: dialog semantics**
  - THEN the drawer is a modal dialog with a label, traps focus, closes on `Esc` and on the scrim, and returns focus to the trigger
- **Scenario B: sizes**
  - THEN at ≥ 640 px the drawer is a right side panel of 440 px (max 100 %); below 640 px it is a full-screen sheet
  - AND IT MUST cause no page-level horizontal overflow at 375, 900 and 1280 px
- **Scenario C: keyboard**
  - THEN every action in every card is reachable with `Tab` and visible focus uses the primary focus accent

### 6.5 Should / May

- **`AIQ-R-20`** (SHOULD): The server SHOULD log each dispatch decision (claimed / parked + reason / re-dispatched) with job id and counts only, no emails or file names (AC-9).
- **`AIQ-R-21`** (SHOULD): The two caps SHOULD be read at call time from `BILATERAL_AI_MAX_CONCURRENT` and `BILATERAL_AI_MAX_PER_USER`, so a restart is enough to change them; invalid or missing values fall back to 2 and 1.
- **`AIQ-R-22`** (MAY): The drawer MAY remember which groups the user collapsed (per-browser convenience).

---

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Correctness under concurrency** | Never more than global cap jobs `PROCESSING`; verified with two consumers (`AIQ-D-1`) |
| **Performance** | `GET center/ai/jobs` p95 < 300 ms on prtest data; a poll costs 1 request regardless of job count |
| **Availability** | A lost re-dispatch recovers within one sweeper tick (`AIQ-R-2` B) |
| **Security / privacy** | JWT-gated like every `center/ai/*` route; zero fields of other users' jobs (`AIQ-R-5` B); no secrets, emails or file names in logs (AC-9) |
| **Backwards compatibility** | `GET jobs/:jobId` keeps every current field incl. `queue_position` (additive only); change log in `bilateral-result-summaries.en.md` |
| **Accessibility** | WCAG 2.1 AA per design.md §10; `aria-live` announcements; reduced motion honoured |
| **Internationalization** | All new strings in `src/app/internationalization/` (DD-9) |
| **Styling** | Tailwind-first, `material-icons-round`, only tokens that exist in `colors.scss` (DD-12) |
| **Observability** | `AIQ-R-20`; terminal outcomes already logged (`APF`) |

---

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `AIQ-AC-1` | No job running | Users A and B submit together | Both reach `PROCESSING` (`AIQ-R-1` A) |
| `AIQ-AC-2` | A has one job running | A submits for another project | New job `PENDING`, `wait_reason = own_job_running`; starts when the first ends (`AIQ-R-1` B) |
| `AIQ-AC-3` | A1, A2, B1, C1 in order | B1 finishes | C1 starts, A2 still waits (`AIQ-R-1` C) |
| `AIQ-AC-4` | Two consumers, five users | All submit | `PROCESSING` count ≤ 2 at every sample (`AIQ-R-1` D) |
| `AIQ-AC-5` | Global cap = 1 | Several submit | One at a time in `queue_entry_date` order (`AIQ-R-1` E) |
| `AIQ-AC-6` | A job is retrying | Dispatch runs | It keeps its lane (`AIQ-R-1` F) |
| `AIQ-AC-7` | X parked, running job terminal | Transition written | X starts (`AIQ-R-2` A) |
| `AIQ-AC-8` | Eligible parked job, free lane, lost re-dispatch | Sweeper runs | Job starts (`AIQ-R-2` B) |
| `AIQ-AC-9` | Duplicate start message | Both handled | Mining called once (`AIQ-R-2` C) |
| `AIQ-AC-10` | Retried failed job | Re-enters queue | Back of fair order, caps obeyed (`AIQ-R-2` D) |
| `AIQ-AC-11` | Parked 20 min, running 5 min | Sweeper runs | Not `TIMED_OUT` (`AIQ-R-3`) |
| `AIQ-AC-12` | Parked 31 min behind a live job | Sweeper runs | Not `QUEUE_STALLED` (`AIQ-R-4` A) |
| `AIQ-AC-13` | Caller with mixed jobs; others' jobs exist | List called | Own jobs with all fields; others only as counts (`AIQ-R-5` A/B) |
| `AIQ-AC-14` | Waiting job read repeatedly | While waiting | `jobs_ahead` never increases; list and single read agree (`AIQ-R-6` B) |
| `AIQ-AC-15` | Job running for P-1 | User submits for P-2 | Form resets, confirmation + toast, job in drawer (`AIQ-R-7` B) |
| `AIQ-AC-16` | 3 active jobs | Client polls | 1 request per poll (`AIQ-R-8` A) |
| `AIQ-AC-17` | Legacy single-job key present | App loads | Job shown; key removed (`AIQ-R-8` C) |
| `AIQ-AC-18` | Drawer with each job state | Rendered | Cards match `AIQ-R-9` B–F; no `%`, no ETA |
| `AIQ-AC-19` | Job terminal while user is on a non-bilateral route | Poll returns | Sticky toast with action; no global dialog (`AIQ-R-11` A) |
| `AIQ-AC-20` | Drawer open | `Esc` / scrim / close | Closes, focus back on trigger (`AIQ-R-12` A) |
| `AIQ-AC-21` | 375 / 900 / 1280 px | Drawer and trigger rendered | Sheet below 640 px, 440 px panel above; no page overflow (`AIQ-R-12` B) |

Cross-cutting ACs referenced, not restated: `AC-8` (observability and notifications), `AC-9` (security and secrets).

---

## 9. Defect Taxonomy & Quality Gates

| ID | Defect class | Gate | Falsifying input | What this gate CANNOT prove |
|---|---|---|---|---|
| `AIQ-D-1` | Lane cap exceeded under concurrent claims | Server Jest on the claim decision (counts in → start/park out) **plus HITL on prtest with two consumers** (local API + prtest API on the same queue), sampling `PROCESSING` count | Five simultaneous submissions yield 3 `PROCESSING` | Unit tests mock the DB and cannot prove the lock; only the HITL can |
| `AIQ-D-2` | Parked job starves | Jest: terminal transition → re-dispatch called; sweeper tick → re-dispatch; HITL: second job of same user starts on its own | Remove the re-dispatch call → parked job never starts | Crash timing in production |
| `AIQ-D-3` | Wrong order (strict FIFO or owner-blind) | Jest on the worked example fixture A1, A2, B1, C1 | Strict FIFO starts A2 before C1 | — |
| `AIQ-D-4` | Other users' data leaks | Jest asserting the exact key set of the list response with other users' rows in the fixture | Any `user_id`/project/file of another user in the payload | — |
| `AIQ-D-5` | Client still blocked | Jest DOM: after a 202 the upload form is rendered and empty; no panel replaces it | Keep the `@if` on `uploadState().status` → form missing | — |
| `AIQ-D-6` | Poll fan-out (N requests) | Jest counting HTTP calls with 3 active jobs across 2 ticks | Per-job `GET jobs/:id` polling → 6 calls | — |
| `AIQ-D-7` | Double or blocking completion surface | Jest: terminal state → toast set, `completionNotice` never set | Dialog opened on completion | — |
| `AIQ-D-8` | Dishonest copy (%, ETA) | Jest DOM on every card state: no `%` and no time-of-start string in waiting cards | "Starts in ~2 min" rendered | Wording tone → human check at the HITL pause |
| `AIQ-D-9` | Layout: drawer width, sheet < 640 px, trigger visibility, page overflow | Cypress CT at 375 / 900 / 1280 with fonts loaded; bounding-rect of drawer and trigger; `documentElement.scrollWidth ≤ clientWidth`; baseline overflow of the tab strip measured first (`KZ L1`) | Drawer 440 px at 375 px → overflow | — |
| `AIQ-D-10` | a11y: focus trap, `Esc`, focus return, live region, reduced motion | Jest DOM for focus and `aria-live` text; Cypress CT with `prefers-reduced-motion: reduce` stubbed, computed `animation-name: none` | Focus stays inside after close; pulsing dot under reduced motion | Contrast and focus-ring visibility → human check at HITL |
| `AIQ-D-11` | Hard-rule drift (hex, other icon sets, undefined tokens) | Grep gates: new templates contain no hex / `rgba(` / `pi-`; every `var(--pr-…)` used exists in `colors.scss` | A well-formed `var(--pr-x)` that does not exist | — |
| `AIQ-D-12` | Time-zone skew between consumer and sweeper | All new timestamp writes/compares in SQL (`bilateralAiDbNow`, `DATE_SUB(NOW(), …)`); grep gate: no `new Date(` in new dispatch/sweeper code; HITL with consumer and sweeper on hosts with different `TZ` (`KZ L3`) | JS `new Date()` cutoff → stall fires minutes early | — |
| `AIQ-D-13` | Payload-shape drift (string ids/dates, `0/1` booleans) | Client fixtures copied from a captured real list response; normalization tests | `jobs_ahead: "2"`, `retrying: 1` | — |
| `AIQ-D-14` | Compiler-only defect | Server `npx tsc --noEmit`; client `ng build` (dev) | Wrong-shaped assignment into a typed DTO | — |
| `AIQ-D-15` | Contract doc drift | Reviewer diffs DTOs against the `bilateral-result-summaries.en.md` change log | New field with no log line | — |
| `AIQ-D-16` | Visual quality vs. mockup ("feels premium") | **No automated gate.** Substitute: T6 visual review of CT screenshots against `mockup/ai-processes-drawer.html`, then product-owner check at the HITL pause | — | Recorded as a human-judged property |

---

## 10. Dependencies & Assumptions

### Upstream
- RMQ AI queue and consumer (`main.ts`, `bilateral-ai.consumer.ts`); MySQL `bilateral_ai_jobs`; AI Assisted `POST /prms/text-mining`; `GET center/ai/expectations` (`APF-R-6` D); bell notifications (C9).

### Downstream
- `bilateral-page-header`, `bilateral-ai-upload`, `bilateral-result-creator` (`?job=` deep link), `my-draft-results` (target of "View drafts"), `app.component` (hosts the completion dialog), `bilateral-result-summaries.en.md`.

### Assumptions
- AI Assisted tolerates 2 concurrent calls from PRMS. Evidence: spike §12.1 (2 and 3 concurrent → all 200, isolated). Degradation under sustained load is unmeasured; the cap is tunable.
- My drafts can be filtered to one job (`draft.job_id` exists: `my-draft-results.component.ts:287`). Exact filter UX is settled in design.

---

## 11. Open Questions

| ID | Question | Status |
|---|---|---|
| `AIQ-OQ-1` | How many API containers consume the AI queue in prtest/prod (C11)? | Open, does not block design (the DB-enforced cap works for any count). Owner: Juan David / Cris, settled before the HITL |
| `AIQ-OQ-2` | Finished window | **Resolved**: last 24 h, max 10 (architect, delegated) |
| `AIQ-OQ-3` | Cancel a waiting job? | Out of scope; product owner may request later |
| `AIQ-OQ-4` | Does AI Assisted expose a priority PRMS could raise (`Priority: Low` seen in its logs)? | Open, outside this spec; owner: AI Assisted team |
| `AIQ-OQ-5` | Trigger placement: bilateral header vs. global top bar | **Resolved**: bilateral header slot (`APF-R-10`); the global shell stays untouched |

---

## 12. Out-of-Band Notes

- Rollback: set `BILATERAL_AI_MAX_CONCURRENT=1` to return to one lane; the client changes are independent of the lane count.
- Branch: spec branch contains all of `performance-refactor` (bilateral work never bases on `staging`).

---

## Required cross-references

- `docs/prd.md`: G4, M4.3, US-S1, AC-8, AC-9
- `docs/ux-ui/design.md`: §6 drawers, §7 brand line, §9 responsive, §10 a11y, DD-9, DD-12
- `docs/trd/trd.md`: W5, W8, ADR-006
- `onecgiar-pr-server/docs/bilateral-result-summaries.en.md`: change log for `center/ai/jobs` and `jobs/:jobId`
- Archived `APF` spec: `docs/specs/archive/2026-09-15-bilateral--ai-processing-feedback/requirements.md`
