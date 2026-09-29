# Tasks — Bilateral AI Processing Queue

## Document Control

| Field | Value |
|---|---|
| **Spec Path** | `docs/specs/bilateral/ai-processing-queue/` |
| **Requirements / Design** | `requirements.md` (`AIQ-R-*`, `AIQ-D-*`) · `design.md` (`AIQ-DD-*`, Premise Ledger `P-*`, Budget §14) |
| **Depth** | Full |
| **Approval Mode** | gated |
| **Status** | approved (gated, 2026-09-29) |
| **Task prefix** | `AIQ-T-n` |
| **Budget** | 11 tasks · ~4,000 LOC · ≤ 1 review round per task (design §14). Tripwire: > 50 % over → stop and report |
| **PR plan** | PR 1 = server (`AIQ-T-1..4`), PR 2 = client (`AIQ-T-5..10`), `AIQ-T-11` verifies both on prtest |

**Runtime rules (project memory):** targeted server tests only, `npx jest --testPathPattern="bilateral-ai"` (never the full suite). Server `npx tsc --noEmit` whenever an entity, DTO or constructor changes. After a constructor change, grep the class name across `*.spec.ts`: `app.module.spec.ts` does not compile the DI graph. Client `npx jest <folder> --no-coverage` plus `npx ng build --configuration development` per task. A fresh worktree needs `src/environments/*.ts` and the server `.env` copied first. Re-check the branch before every commit and before reporting green.

---

## 1. Scope of this task list

Delivers `AIQ-R-1..22` as designed in `design.md`: DB-arbitrated two-lane dispatch, wake/re-dispatch, list endpoint (server); job-list service, drawer, cards, trigger, sticky action toasts, never-blocking upload, retirement of the panel and the completion dialog (client); rendered and live verification. Excludes AI Assisted speed (AC6/AC7) and the pre-existing `center/ai/*` trust model (owned by P2-3854, design §7).

## 2. Pre-flight checklist

- [ ] Branch contains `performance-refactor` (`git merge-base --is-ancestor origin/performance-refactor HEAD`).
- [ ] Server `.env` and client `src/environments/*.ts` present in the worktree.
- [ ] `AIQ-OQ-1` / P-24 (container count) answered before `AIQ-T-11`.
- [ ] No other AKILI session in this checkout.

---

## 3. Task list

### `AIQ-T-1` — Lane-cap config and prefetch from the global cap

- **Type:** server · **Estimate:** S · **Depends on:** — · **Blocks:** `AIQ-T-2`
- **Description:** Add `getBilateralAiMaxConcurrent()` (default 2) and `getBilateralAiMaxPerUser()` (default 1) to `bilateral-ai.config.ts`. They are read at call time and clamp values that are non-integer, `NaN` or `< 1` back to the default. `main.ts` sets the AI-queue `prefetchCount` from the global-cap getter; the reporting-export block keeps its literal `1`.
- **Implements:** `AIQ-R-21`; the bootstrap half of `AIQ-R-1` E ("global cap = 1 → one at a time"; the runtime half is `AIQ-T-2`).
- **Design refs:** §5.6; P-11 (config pattern, scout Q11), P-8.
- **Files:** `onecgiar-pr-server/src/api/bilateral-ai/bilateral-ai.config.ts`, `bilateral-ai.config.spec.ts`, `onecgiar-pr-server/src/main.ts`, `src/main.spec.ts`.
- **Tests:** config spec cases for unset → 2/1, `"3"` → 3, `"0"`/`"-1"`/`"abc"`/`"1.5"` → default; `main.spec.ts` asserts the AI block's `prefetchCount` equals the getter value and the export block stays 1.
- **Review:** `checklist` — pure getters plus one bootstrap option, low blast radius.
- **Verification:**
  - **Falsifier:** `BILATERAL_AI_MAX_CONCURRENT=0` must yield 2. A getter written as `Number(env.X || 2)` yields 0 and fails the `"0"` case, which is the row on which the naive and clamped readings diverge. Mutation to run post-change: remove the clamp → that case goes red.
  - **Red run:** `npx jest --testPathPattern="bilateral-ai.config|main.spec"` fails before (getters missing) and passes after.
  - **Disqualifier:** if `main.spec.ts` cannot observe `connectMicroservice` options (it asserts only calls today, scout Q13), extend its mock to capture the options. A test that does not read the options proves nothing about `prefetchCount`; report the gap instead of passing.
  - **Consumers:** `bilateral-ai.config.ts` getters are imported by `bilateral-ai.consumer.ts:4`, `bilateral-ai.service.ts`, `bilateral-ai-sweeper.cron.ts`; new getters change none of them. `src/main.spec.ts`.
- **Done criteria:** tests green; `npx tsc --noEmit` clean; the falsifier executed and observed red.
- **Skills:** `nestjs-expert`.

### `AIQ-T-2` — Dispatch service: claim-or-redirect under a named lock

- **Type:** server · **Estimate:** L · **Depends on:** `AIQ-T-1` · **Blocks:** `AIQ-T-3`, `AIQ-T-4`
- **First step (settles P-25, High):** read `@nestjs/microservices` `client/client-proxy.js` (`emit`) in the main checkout's `node_modules` and record whether `emit` dispatches without a subscriber. If it does not, `wake`/redirect publishing subscribes (fire-and-forget with an error log). Record the outcome in Done criteria. If the finding contradicts the design in any other way → Pivot Protocol.
- **Description:**
  - New `BilateralAiDispatchService` (design §2.3, §5.1, §5.2):
    - A dedicated query runner holds `GET_LOCK('prms_bilateral_ai_dispatch', 10)`, and a `finally` always runs `RELEASE_LOCK` and releases the runner.
    - Inside the lock: running count, owners at per-user cap, oldest eligible `PENDING` by `queue_entry_date` (ties by `job_id`).
    - `decide(jobId)` returns one of `run` / `resume-retry` / `park` / `redirect(E)` / `noop` / `lock-timeout`.
    - `wake(reason)` publishes the oldest eligible job for each free lane.
  - The consumer calls `decide` before `processJob`:
    - `run`/`resume-retry` → today's path, unchanged, including the `nack` retry (DD-3).
    - `park`/`noop`/`redirect` → ack (redirect publishes `{jobId: E}` under the lock).
    - `lock-timeout` → `nack`-requeue without touching attempts.
  - Claiming reuses `attemptStart`'s conditional update (P-2), made reachable from the dispatch service. Its WHERE clauses stay exactly as they are.
  - Decision logs per §5.7.
  - Wire the new service into `bilateral.module.ts` providers.
- **Implements:** `AIQ-R-1` A, B (first clause: stays `PENDING` with `own_job_running` state reached by park), C ("A1 and B1 run; A2 and C1 wait", "BUT it must NOT start A2 while A1 is PROCESSING"), D ("AND IT MUST enforce both caps from the database, never from in-process state", unit half), E (runtime half), F ("still occupies its lane", "BUT it must NOT let another job take the lane between attempts"); `AIQ-R-2` C; `AIQ-R-20` (claim/park/redirect/lock-timeout lines).
- **Design refs:** §2.3, §5.1, §5.2, §5.7; DD-1, DD-3; P-1, P-2, P-3, P-4, P-8, P-25.
- **Files:** `onecgiar-pr-server/src/api/bilateral-ai/services/bilateral-ai-dispatch.service.ts` (+ `.spec.ts`), `bilateral-ai.consumer.ts` (+ spec), `bilateral-ai.service.ts` (claim reachable; no behavior change to `processJob` body), `onecgiar-pr-server/src/api/bilateral/bilateral.module.ts`.
- **Tests:**
  - Decision-table spec, one case per §2.3 row.
  - Worked-example fixture: jobs A1, A2, B1, C1 with distinct `queue_entry_date` values and owners. Assert `decide(A2)` → `park`, and after B1 terminal `decide(C1)` → `run`.
  - Retry resume without the lock.
  - Lock timeout → nack without an attempts change.
  - Lock always released on a thrown error inside the critical section.
  - Consumer spec: `redirect` publishes E and acks X; `park` acks and does not call `processJob`.
- **Review:** `lenses` (concurrency, error paths) — the correctness core of the spec.
- **Verification:**
  - **Falsifier:** on the worked-example fixture, a strict-FIFO selector (drop the owner-at-cap filter) returns A2 instead of C1 → test red. Run that mutation post-change and observe red.
  - **Second falsifier:** remove `RELEASE_LOCK` from `finally` → the "lock released on throw" case goes red.
  - **Red run:** `npx jest --testPathPattern="bilateral-ai-dispatch|bilateral-ai.consumer"` fails before (service missing) and passes after. The red must be on the `decide` assertions, not on a module-resolution error. Write the spec first against an empty service stub.
  - **Disqualifier:**
    - Unit tests mock the query runner, so a green here **cannot prove** the lock serialises two containers (`AIQ-D-1`). Do not claim `AIQ-R-1` D as met; it stays open until `AIQ-T-11`.
    - If `attemptStart` cannot be reused without changing its WHERE clauses, stop and escalate: that is a design premise (P-2).
  - **Consumers:** `bilateral-ai.consumer.spec.ts` (10 `processJob` refs, ack/nack cases :40-132); `bilateral-ai.service.spec.ts` `processJob` block :1442-2104 (attempt-start :1468, :1498, 0-rows :1550, retryable :2001, final :2039, 4xx :2077, timezone block :2106-2255); `BilateralAiService` constructor unchanged unless the claim moves (if it changes, grep `new BilateralAiService\|BilateralAiService,` across `*.spec.ts`).
- **Done criteria:** all listed specs green; `npx tsc --noEmit` clean; both falsifiers executed red; P-25 outcome recorded; no `new Date(` in the new service (`grep -n "new Date(" services/bilateral-ai-dispatch.service.ts` → 0).
- **Skills:** `nestjs-expert`, `error-handling-patterns`, `tdd`.

### `AIQ-T-3` — Wake on every lane-freeing path; sweeper safety net and stall rule

- **Type:** server · **Estimate:** M · **Depends on:** `AIQ-T-2` · **Blocks:** `AIQ-T-11`
- **Description:**
  - Call `dispatch.wake(reason)` after the `COMPLETED` write and after the final `FAILED` write (4xx included) in `processJob`, and after each sweeper `TIMED_OUT` and `QUEUE_STALLED` flip (design §5.3).
  - The sweeper tick always calls `wake('sweep')`.
  - The stall rule calls `wake` before flipping, and exempts a job whose owner has a `PROCESSING` job (§5.4). All cutoffs stay in SQL. Update the stale prefetch-1 comment at `bilateral-ai-sweeper.cron.ts:124-126`.
  - A `FAILED` job the user retries re-enters through `retryJob`'s publish, routed by `decide`; no code change there, only a test.
- **Implements:** `AIQ-R-2` A, B, D ("back of fair order … obeys both caps"); `AIQ-R-3` A including "AND IT MUST write and compare every lifecycle timestamp in DB time"; `AIQ-R-4` A, B; `AIQ-R-20` (wake lines).
- **Design refs:** §5.3, §5.4; DD-2, DD-5; P-5, P-6, P-7.
- **Files:** `bilateral-ai.service.ts`, `bilateral-ai-sweeper.cron.ts` (+ specs); the sweeper constructor gains the dispatch service.
- **Tests:**
  - `wake` is called exactly once on each §5.3 path. Negative case: not called on the retryable path that rethrows.
  - The sweeper tick calls `wake` even when nothing flips.
  - Stall A: a parked job 31 min old, its owner's job `PROCESSING` with a fresh `stage_updated_date` → no flip.
  - Stall B: oldest `PENDING` past the window with no liveness → `wake` first, then flip only if still `PENDING`.
  - Timeout: a job parked 20 min, started 5 min ago → not `TIMED_OUT` (cutoff query built from `DATE_SUB(NOW()…)` on `started_date`).
  - Retry re-entry: `retryJob` → `decide` sees it as the newest.
- **Review:** `full`.
- **Verification:**
  - **Falsifier:** delete the `wake` call after `COMPLETED` → the "wake on success" case goes red; delete the owner exemption → stall A goes red. Execute both post-change.
  - **Red run:** `npx jest --testPathPattern="bilateral-ai.service|bilateral-ai-sweeper"` shows the new cases red before and green after.
  - **Disqualifier:** a green "no stall" case whose fixture has *no* running job cannot distinguish the owner exemption from the existing liveness check. The stall-A fixture must give the running job fresh activity **and** the waiting job an owner match; a fixture where the liveness check alone explains the result is inert, so rewrite it.
  - **Consumers:** `bilateral-ai-sweeper.cron.spec.ts` (stall tests :206-321, one-sweep-per-process :408-441, constructor mock); `bilateral-ai.service.spec.ts` terminal-path cases :2001-2104; the `BilateralAiSweeperCron` constructor change → `grep -rn "BilateralAiSweeperCron" onecgiar-pr-server/src --include='*.spec.ts'`.
- **Done criteria:** specs green; `tsc --noEmit` clean; both falsifiers red when mutated; `grep -n "new Date(" bilateral-ai-sweeper.cron.ts` shows no new hits versus baseline (enumerate the baseline hits first).
- **Skills:** `nestjs-expert`, `tdd`.

### `AIQ-T-4` — `GET center/ai/jobs`, `jobs_ahead` / `wait_reason`, contract doc

- **Type:** server · **Estimate:** M · **Depends on:** `AIQ-T-2` · **Blocks:** `AIQ-T-5`
- **Description:**
  - `listJobs(user)` returns the caller's active jobs plus jobs finished in the last 24 h (max 10, newest first), with `project_name` (join `clarisa_projects`) and `center_acronym` (join `clarisa_institutions`).
    - Each item has exactly the §4.1 key set.
    - The response also carries a `summary` (`lanes_total`, `lanes_busy`, `others_waiting`).
    - The 24 h cutoff is computed in SQL.
  - `getJob` adds `jobs_ahead` and `wait_reason` for `PENDING` jobs and redefines `queue_position = jobs_ahead`. A shared helper computes both, so the list and the single read cannot drift.
  - New `@Get('jobs')` placed before `jobs/:jobId`, using `@UserToken()` like its siblings.
  - Add a change-log row to `onecgiar-pr-server/docs/bilateral-result-summaries.en.md`.
- **Implements:** `AIQ-R-5` A, B ("BUT it must NOT return any other user's id, name, email, project, file name or job id"), C ("resolves to no user and the list is empty", "BUT it must NOT introduce a weaker identity check"), D; `AIQ-R-6` A (three reasons), B ("never increases", "AND … returns the same `jobs_ahead` and `wait_reason` as the list, keeping `queue_position`"), C ("BUT the API must NOT return an estimated start or finish time"); NFR performance (measured in `AIQ-T-11`).
- **Design refs:** §4.1, §4.2, §5.5, §7; DD-4; P-9, P-10, P-11, P-21, P-22.
- **Files:** `bilateral-ai.controller.ts` (+ spec), `bilateral-ai.service.ts` (+ spec), `onecgiar-pr-server/docs/bilateral-result-summaries.en.md`.
- **Tests:**
  - Key-set equality on list items against the §4.1 list, using a fixture that mixes the caller's rows with other users' rows. Assert no other `job_id` appears and the summary counts match.
  - `id: 0` caller → empty list plus summary.
  - `wait_reason` table: owner at cap → `own_job_running`; lanes full → `no_free_lane`; otherwise `starting`.
  - Monotonic `jobs_ahead`: add a newer `PENDING` row → unchanged; finish an older one → decreases.
  - `getJob` and the list agree on the same fixture.
  - Supertest: `GET /center/ai/jobs` reaches `listJobs`, not `getJob('jobs')`.
- **Review:** `full` (privacy + contract).
- **Verification:**
  - **Falsifier:** return `{...job}` spread instead of the explicit key set → the key-set test is red, because `bucket_name`/`user_id` appear. Drop the `user_id = caller` filter → the "no other `job_id`" test is red. Execute both.
  - **Red run:** `npx jest --testPathPattern="bilateral-ai.controller|bilateral-ai.service"` fails before (route/method missing) and passes after.
  - **Disqualifier:** if the privacy test's fixture contains no other user's rows, it cannot fail. Reject it as evidence.
  - **Consumers:** client `GET_bilateralAiJob` (`bilateral-api.service.ts:258`) reads `queue_position`, which is kept; `bilateral-ai.controller.spec.ts` route-order supertest :242-308; `bilateral-ai.service.spec.ts` `queue_position` :296-351, which is **updated** because older `PROCESSING` rows no longer count (design §4.1). The change log is the external consumer record.
- **Done criteria:** specs green; `tsc --noEmit`; change-log row present and matching the diff (`AIQ-D-15`); falsifiers red when mutated.
- **Skills:** `nestjs-expert`, `api-design-principles`.

### `AIQ-T-5` — Client job list: model, API method, service store and poller

- **Type:** client · **Estimate:** L · **Depends on:** `AIQ-T-4` (contract), `AIQ-T-6` (toast action) · **Blocks:** `AIQ-T-7`, `AIQ-T-8`, `AIQ-T-9`, `AIQ-T-10`
- **Description:**
  - **Model and API:** `NormalizedBilateralAiListJob`, `normalizeListJob` and `waitReasonCopy` in `bilateral-ai-job.model.ts`, reusing the coercion helpers (P-20). `GET_bilateralAiJobs()` in `bilateral-api.service.ts`.
  - **Service state:** `jobs`, `summary`, `drawerOpen`, `highlightJobId`, `unseenFinishedIds`, `openDrawer(jobId?)`, `addSubmittedJob(response)` (optimistic insert).
  - **Poller:**
    - One poller for the list, with the `APF-R-7` cadence measured from the most recent active job's `queueEntryDate`.
    - Stops when there are no active jobs and the drawer is closed.
    - Terminal diffs between polls produce one sticky action toast per job, or a single grouped toast when more than 2 finish in one poll. Toasts use key `globalUserNotification`.
  - **Storage:**
    - Hint key `prms.bilateral-ai.has-active-jobs`: set on submit, cleared when a poll finds no active job.
    - The legacy `prms.bilateral-ai.active-job` is read once, its job id is kept for highlight, and the key is removed.
  - **Removed members:** the single-job members listed in design §6.2. `clearUploadState()` is narrowed to the upload form (DD-11).
  - Fix the two keyless error toasts at `:486,:500` only if touched; otherwise note them in the ticket comment (design §13).
- **Implements:** `AIQ-R-8` A ("one list request per poll", "AND IT MUST keep the adaptive cadence"), B, C ("AND a legacy … record is read once, its job included, and the key removed"), D (service half: `openDrawer(job)` sets highlight); `AIQ-R-11` A (toast + badge logic, "AND IT MUST work on any route" — service half), B; `AIQ-R-7` B ("the new job appears in the drawer at once": `addSubmittedJob`).
- **Design refs:** §6.2, §6.4; DD-6, DD-10, DD-11; P-12, P-15, P-20, P-22, P-26.
- **Files:** `onecgiar-pr-client/src/app/pages/bilateral/bilateral-ai-job.model.ts`, `pages/bilateral/services/bilateral-ai.service.ts` (+ spec), `shared/services/api/bilateral-api.service.ts`.
- **Tests:**
  - HTTP count: 3 active jobs over 2 ticks → exactly 2 `GET …/ai/jobs` calls and 0 `GET …/ai/jobs/:id`, using fake timers.
  - Cadence buckets.
  - Stop when idle, restart on submit.
  - Terminal diff → one toast per job, `sticky: true`, with an action. 3 terminal → 1 grouped toast.
  - Legacy key migration.
  - Hint set/cleared.
  - Normalization from a **captured real list response**, taken on prtest after `AIQ-T-4` deploys, or else from the §4.1 shape with string ids and `retrying: 1`.
- **Review:** `full`.
- **Verification:**
  - **Falsifier:** re-introduce a per-job `GET_bilateralAiJob` inside the poll → the HTTP-count test is red (6 ≠ 2). Remove the diff guard so every poll re-toasts finished jobs → the "one toast per job" test is red on the second tick. Execute both.
  - **Red run:** `npx jest src/app/pages/bilateral/services --no-coverage` shows the new cases red before (members missing) and green after. The red must be on the call-count assertion, not a compile error; stub the members first.
  - **Disqualifier:** a toast test with synchronous HTTP mocks that resolve inside the first change detection cannot exercise the two-poll diff. Use fake timers and two distinct responses, or the green is not evidence.
  - **401 handling:** keep `handlePollError`'s stop-on-401 for the list poll, so P2-3854's future 401s end polling cleanly (covered by one test).
  - **Consumers:** every non-spec reader in P-12 (header :59/:62/:104, upload :63/:66/:71/:123/:142/:163/:168/:174/:209/:596/:619/:624/:633 and html, creator :383/:670, completion dialog :30/:114/:118). Specs: `bilateral-ai.service.spec.ts` (103 hits), `bilateral-ai-upload.component.spec.ts`, `bilateral-page-header.component.spec.ts` :838-949, `bilateral-page-header.cy.ts` :34-41, `bilateral-ai-completion-dialog.component.spec.ts` :168-183, `bilateral-result-creator.component.spec.ts` :26/:32/:423/:431. **This task must leave the build green:** readers that later tasks rewrite get minimal compile-level adaptations here, and each later task owns its reader's behavior.
- **Done criteria:** service spec green; `npx ng build --configuration development` green (compile gate `AIQ-D-14`: assigning a wrong-shaped item into `jobs` must fail the build); falsifiers red when mutated.
- **Skills:** `angular-developer`, `tdd`.

### `AIQ-T-6` — `PrToastService`: optional action and sticky

- **Type:** client · **Estimate:** S · **Depends on:** — · **Blocks:** `AIQ-T-5`
- **Description:** `add()` accepts optional `action { label, run }` and `sticky`. `pr-toast.component` renders the action as a focusable button that runs and then dismisses. A sticky toast is not auto-removed. Without the new fields, behavior is identical: 4 s life, same markup.
- **Implements:** support for `AIQ-R-7` B ("toast confirms with a **View** action") and `AIQ-R-11` A ("sticky toast … staying until closed or acted on").
- **Design refs:** DD-10; P-15.
- **Files:** `onecgiar-pr-client/src/app/shared/components/pr-toast/pr-toast.service.ts`, `pr-toast.component.{ts,html}`, new `pr-toast.service.spec.ts`, `pr-toast.component.spec.ts`.
- **Tests:**
  - No-new-fields → removed after `life ?? 4000` (fake timers).
  - `sticky` → still present after 60 s.
  - Action button exists only with `action`, calls `run`, then removes.
  - Button is keyboard-focusable.
- **Review:** `checklist` — additive, but shared by 42 files.
- **Verification:**
  - **Falsifier:** make `sticky` ignored → the 60 s case is red. Render the action button unconditionally → the "no action → no button" case is red.
  - **Red run:** `npx jest src/app/shared/components/pr-toast --no-coverage` fails before (no spec / fields) and passes after.
  - **Disqualifier:** if any existing caller passes an object with an `action` or `sticky` key for another purpose, stop and rename the fields. Check with `grep -rnE "\.add\(\{[^}]*(action|sticky)" onecgiar-pr-client/src/app --include='*.ts'` → expected 0 (baseline).
  - **Consumers:** 42 files inject `PrToastService` (`grep -rlE "PrToastService" onecgiar-pr-client/src/app --include='*.ts' | wc -l` → 42), 16 of them specs. All use the old fields only, so no change is expected. The grep above guards that.
- **Done criteria:** tests green; `ng build` green; falsifiers red when mutated.
- **Skills:** `angular-developer`, `tailwind-design-system`.

### `AIQ-T-7` — Never-blocking upload, unlocked wizard, `?job=` routing, drafts highlight

- **Type:** client · **Estimate:** M · **Depends on:** `AIQ-T-5` · **Blocks:** `AIQ-T-10`, `AIQ-T-11`
- **Description:**
  - **Upload:** the upload form is always rendered. On 202: `addSubmittedJob`, reset the form, show the confirmation card ("<project> was added to the AI queue" + **Open AI processes** + **Choose another project**) and the action toast. Submit errors keep files and text (today's `handleUploadError`). `?job=` → `openDrawer(job)`; `startJob` is removed.
  - **Creator:** `isAiProcessing` reads only the upload's `uploading` status (DD-11), and the `?job=` path selects the AI way and calls `openDrawer(job)` (P-23).
  - **My drafts:** reads `?job=`; the matching session group gets an `id`, is scrolled into view and highlighted once (P-19).
  - Update `bilateral-ai-upload/CLAUDE.md`.
- **Implements:** `AIQ-R-7` A, B ("form resets … confirmation … toast", "AND the create wizard's steps stay unlocked", "BUT it must NOT replace the upload form with a processing panel"), C; `AIQ-R-8` D (routing half); `AIQ-R-9` D (the drafts deep-link target).
- **Design refs:** §6.1, §6.2; DD-11; §12A rows DD-9/DD-11; P-13, P-19, P-23.
- **Files:** `pages/bilateral/components/bilateral-ai-upload/*` (+ spec, `CLAUDE.md`), `pages/bilateral/pages/bilateral-result-creator/*` (+ spec), `pages/bilateral/pages/my-draft-results/*` (+ spec), `pages/bilateral/bilateral-query-params.ts`, `internationalization/bilateral-ai-processes.copy.ts` (confirmation strings).
- **Tests:**
  - Upload after a mocked 202: the form element is present and empty, the confirmation text is present, and `querySelector('app-ai-processing-panel')` is null. This rewrites the spec at `:266,297,343`.
  - Error keeps files.
  - Creator: `isAiProcessing` is false while the service lists active jobs; the spec at `:419-432` is rewritten.
  - Creator `?job=` → AI way + `openDrawer`.
  - Drafts `?job=` → group id present and `scrollIntoView` called.
  - Manual-create drawer host still hosts the upload (P-13).
- **Review:** `full`.
- **Verification:**
  - **Falsifier:** restore the `@if (uploadState().status === 'idle' || …)` wrapper → the "form present after 202" case is red. Restore `isAiProcessing`'s pending/processing statuses → the creator case is red. Execute both.
  - **Red run:** `npx jest src/app/pages/bilateral/components/bilateral-ai-upload src/app/pages/bilateral/pages/bilateral-result-creator src/app/pages/bilateral/pages/my-draft-results --no-coverage`.
  - **Disqualifier:** a "form present" assertion that queries a CSS class rather than the real `<form>`/input element is a presence check on markup, not on behavior. Assert the file input is enabled and submittable.
  - **Consumers:** hosts of `app-bilateral-ai-upload`: `bilateral-result-creator.component.html:35`, `bilateral-manual-create-drawer-host.component.html:99` (mounted in the creator and `bilateral-projects-panel.component.html:448`); `?job=` producer `bilateral-ai-notifications.service.ts:183-186`; specs listed in Tests.
- **Done criteria:** specs green; `ng build` green; falsifiers red when mutated; `CLAUDE.md` updated.
- **Skills:** `angular-developer`, `tailwind-design-system`.

### `AIQ-T-8` — "AI processes" drawer, job card, copy file

- **Type:** client · **Estimate:** L · **Depends on:** `AIQ-T-5` · **Blocks:** `AIQ-T-9`, `AIQ-T-10`, `AIQ-T-11`
- **First step (settles P-18):** prototype `HlmDialogService.open` with a right-sheet `contentClass`. Measure in a browser that the panel is right-anchored and full height, is 440 px at 1280, is full-screen at 375, traps focus and restores it. If not, use the quality-assessment shell pattern (DD-7 fallback). Record the outcome in Done criteria.
- **Description:**
  - **`ai-processes-drawer`:** title, sub-line, lanes strip, groups Running / Waiting / Finished with counts (empty groups hidden), footer copy, and a polite live region announcing group changes. States: skeleton; refresh-error notice that keeps the last list; empty state with **Start with evidence**.
  - **`ai-job-card`:** input-driven, with variants running / waiting / completed / no-candidates / failed / still-running and design §12A parity items:
    - "estimated" captions, attempt badge, source-mix line.
    - Expected range with the fallback copy.
    - Provenance notice on completed cards.
    - **Try again** disabled while the job is alive; **Upload different files**; **View N drafts** / **Report manually**.
  - **Copy file:** `bilateral-ai-processes.copy.ts` holds all strings.
  - **Motion:** transitions with `motion-reduce:` variants.
  - **MAY `AIQ-R-22`:** remember collapsed groups in `localStorage`, wrapped in try/catch.
- **Implements:** `AIQ-R-9` A, B ("BUT it must NOT show a percentage"), C ("BUT it must NOT show an estimated start time"), D (actions + "AND IT MUST keep the panel's detail it replaces"), E, F, G, H (announce + "AND IT MUST disable transitions under `prefers-reduced-motion`", class half; the computed-style proof is `AIQ-T-11`); `AIQ-R-12` A, B (sizes; overflow proof is `AIQ-T-11`), C; `AIQ-R-8` D (highlight rendering); `AIQ-R-6` C (client: no ETA rendered); `AIQ-R-22`.
- **Design refs:** §6.2, §6.3, §6.5; DD-7, DD-8 parity; §12A; P-17, P-18, P-20; mockup `mockup/ai-processes-drawer.html`.
- **Files:** `pages/bilateral/components/ai-processes-drawer/*`, `pages/bilateral/components/ai-job-card/*` (component, spec, `CLAUDE.md`), `internationalization/bilateral-ai-processes.copy.ts`.
- **Tests:**
  - Card DOM per variant from real-shape fixtures (string ids, `retrying: 1`): no `%` character; no `/\b(in|starts in|about)\s+~?\d+\s*(s|sec|min)/i` in waiting cards; "Attempt 2 of 3" while retrying; provenance notice present on completed; Try again disabled when status is alive.
  - Drawer: group order and counts, empty-group hiding, skeleton on first load, refresh-error keeps cards, empty state.
  - Live region text changes on a waiting → running transition.
  - Focus is trapped, `Esc` closes, focus returns to the element that opened it.
- **Review:** `lenses` (a11y, visual fidelity).
- **Verification:**
  - **Falsifier:** render `jobs_ahead` as "Starts in ~2 min" → the no-ETA regex is red. Drop the provenance notice → the completed case is red. Execute both.
  - **Red run:** `npx jest src/app/pages/bilateral/components/ai-processes-drawer src/app/pages/bilateral/components/ai-job-card --no-coverage`.
  - **Disqualifier:** jsdom cannot measure layout, contrast or computed animation. Any Jest assertion on widths, overflow or `animation-name` is not evidence and must not be written here. Those belong to `AIQ-T-11` (CT) and the T6 review.
  - **Consumers:** new components; `app-ai-provenance-notice` gains a sixth mount site while the dialog's goes away in `AIQ-T-10` (its surface list at `ai-provenance-notice.component.ts:4-6` is updated there).
- **Done criteria:** specs green; `ng build` green; falsifiers red when mutated; P-18 outcome recorded; token-existence grep: every `var(--pr-[a-z0-9-]+)` in the new templates exists in `onecgiar-pr-client/src/styles/colors.scss`; no hex / `rgba(` / `pi-` in the new templates.
- **Skills:** `angular-developer`, `tailwind-design-system`, `spartan`, `frontend-design`.

### `AIQ-T-9` — Header trigger replaces the chip in all three slots

- **Type:** client · **Estimate:** M · **Depends on:** `AIQ-T-8` · **Blocks:** `AIQ-T-11`
- **Description:**
  - **New `ai-processes-trigger`:** ring + badge + accessible name ("AI processes: N running, M waiting") + `aria-expanded`. States idle / working / done-unseen. It opens the drawer.
  - **Header:** in `bilateral-page-header`, remove the chip markup, `aliveJobForThisCenter`, `aiJobChip` and the 1 s tick. Place the trigger in the identity-row slot (< 640 px), the nav end slot (≥ 640 px) **and** the `pageTitle` branch (P-16).
  - Keep base utility classes next to responsive variants (`KZ L2`).
- **Implements:** `AIQ-R-10` A ("BUT it must NOT depend on the Center", "AND IT MUST also render on the create wizard"), B, C.
- **Design refs:** §6.2, §6.5; DD-9; §12A row DD-9; P-16.
- **Files:** `pages/bilateral/components/ai-processes-trigger/*`, `pages/bilateral/components/bilateral-page-header/*` (+ spec, cy).
- **Tests:**
  - Rewrite `bilateral-page-header.component.spec.ts:832-949`:
    - Trigger present for any Center, in `activeTab` mode and in `pageTitle` mode.
    - Badge = active count; done state shows the unseen count and is cleared when the drawer opens.
    - Accessible name contains the counts.
    - No 1 s timer scheduled (fake timers: `jest.getTimerCount()` unchanged after mount).
  - Rewrite `bilateral-page-header.cy.ts:56-70` for the new selector.
- **Review:** `full` (shared header, 6 hosts).
- **Verification:**
  - **Falsifier:** keep a Center check → the "other Center" case is red. Omit the `pageTitle` slot → the wizard case is red. Execute both.
  - **Red run:** `npx jest src/app/pages/bilateral/components/bilateral-page-header src/app/pages/bilateral/components/ai-processes-trigger --no-coverage`.
  - **Disqualifier:** visibility at 375 px cannot be proven in Jest. The chip's former CT gate is re-established in `AIQ-T-11` with the baseline tab-strip overflow measured first (`KZ L1`).
  - **Consumers:** header hosts: `bilateral-results-list.component.html:1`, `bilateral-overview.component.html:2`, `my-draft-results.component.html:1`, `bilateral-home.component.html:1`, `bilateral-result-creator.component.html:7,218`. Selector `[data-testid="bilateral-ai-job-chip"]`: `grep -rn "bilateral-ai-job-chip" onecgiar-pr-client/src onecgiar-pr-client/cypress` must be 0 after this task, except in history docs.
- **Done criteria:** specs green; `ng build` green; falsifiers red when mutated; chip selector grep = 0.
- **Skills:** `angular-developer`, `tailwind-design-system`.

### `AIQ-T-10` — Retire the panel and the completion dialog; mount the watcher

- **Type:** client · **Estimate:** S · **Depends on:** `AIQ-T-7`, `AIQ-T-8` · **Blocks:** `AIQ-T-11`
- **Description:**
  - Create the headless `app-bilateral-ai-job-watcher`. It injects `BilateralAiService` and starts polling when the hint key is set. Replace `<app-bilateral-ai-completion-dialog />` at `app.component.html:65` with it, and swap the `app.module.ts:18,60` import.
  - Delete `bilateral-ai-completion-dialog/` and `ai-processing-panel/` (component, spec, cy, `CLAUDE.md`).
  - Update `ai-provenance-notice.component.ts:4-6` (surface list: dialog → drawer card) and the stale comments at `bilateral-ai-job.model.ts:8` and `bilateral-ai.service.ts:77,84`.
- **Implements:** `AIQ-R-11` A ("BUT it must NOT open the blocking global completion dialog", "AND IT MUST work on any route" — app-level half); DD-6, DD-8.
- **Design refs:** §6.2 Retired; DD-6, DD-8; §12A rows DD-6/DD-8; P-14, P-22, P-26.
- **Files:** `onecgiar-pr-client/src/app/app.component.html`, `app.module.ts`, new `pages/bilateral/components/bilateral-ai-job-watcher/*`, deletions as listed.
- **Tests:**
  - Watcher spec: with the hint key set, one list request fires on init; without it, zero.
  - `app.component` spec (if it renders the template): the watcher is present and the dialog selector absent.
- **Review:** `checklist` — removal plus a thin component.
- **Verification:**
  - **Falsifier:** leave the dialog mounted → the `grep -rn "app-bilateral-ai-completion-dialog" onecgiar-pr-client/src` check returns > 0. Make the watcher poll unconditionally → the "no hint → zero requests" case is red.
  - **Red run:** `npx jest src/app/pages/bilateral/components/bilateral-ai-job-watcher --no-coverage` plus the grep above.
  - **Disqualifier:** a watcher test that mocks `BilateralAiService` entirely cannot prove the app-level instantiation that P-26 needs. Use the real service with a mocked `HttpClient`.
  - **Consumers:** `grep -rn "app-ai-processing-panel\|AiProcessingPanelComponent\|app-bilateral-ai-completion-dialog\|BilateralAiCompletionDialogComponent" onecgiar-pr-client/src onecgiar-pr-client/cypress` → only docs after this task (baseline hits enumerated in design P-14/P-22).
- **Done criteria:** specs green; `ng build` green; consumer grep clean; falsifiers red when mutated.
- **Skills:** `angular-developer`.

### `AIQ-T-11` — Rendered verification, visual review, HITL on prtest

- **Type:** tests · rollout · **Estimate:** M · **Depends on:** `AIQ-T-3`, `AIQ-T-4`, `AIQ-T-7`, `AIQ-T-8`, `AIQ-T-9`, `AIQ-T-10` · **Blocks:** —
- **First step:** confirm P-24 (containers consuming the prtest queue) with Juan David / Cris, and confirm both PRs are deployed to prtest (the pipeline deploys on merge; do not measure within minutes of a merge).
- **Description:**
  1. **Cypress CT** (new `ai-processes-drawer.cy.ts`, `ai-processes-trigger`/header CT):
     - Viewports 375×800, 900×800 and 1280×800. Manrope and Material Icons Round are asserted loaded (`document.fonts.check`).
     - Drawer bounding rect: 440 px right-anchored at ≥ 640 px, full viewport below 640 px.
     - `documentElement.scrollWidth ≤ clientWidth`.
     - Trigger visible in each header mode, with the tab-strip baseline `scrollWidth` measured before any overflow assertion (`KZ L1`).
     - Reduced motion via CDP emulation (technique of the retired `ai-processing-panel.cy.ts:72-79`) → computed `animation-name: none` on the pulse and bar.
  2. **T6 visual review:** CT screenshots against `mockup/ai-processes-drawer.html`, recorded in `execution.md`.
  3. **HITL on prtest,** with local API `TZ=America/Bogota` and prtest API (UTC) both consuming the prtest queue:
     - Five users submit together; sample `SELECT COUNT(*) FROM bilateral_ai_jobs WHERE status='PROCESSING'` every 5 s.
     - Run the A1, A2, B1, C1 order.
     - A user's second job starts on its own.
     - The drawer updates live.
     - A toast appears on a non-bilateral route.
     - `GET center/ai/jobs` p95 measured.
     - Product-owner check of the wording (`AIQ-D-8`) and of the look (`AIQ-D-16`).
- **Implements:** `AIQ-R-1` D ("at no instant are more than 2 jobs `PROCESSING`" — the live proof); `AIQ-R-2` A/B (live); `AIQ-R-9` H (computed reduced motion); `AIQ-R-10` A (visibility per slot); `AIQ-R-11` A (any route, live); `AIQ-R-12` B ("AND IT MUST cause no page-level horizontal overflow at 375, 900 and 1280 px"); NFR performance; `AIQ-AC-4`, `AC-21`; gates `AIQ-D-1`, `D-2`, `D-9`, `D-10`, `D-12`, `D-16`.
- **Design refs:** §10; P-24.
- **Files:** `pages/bilateral/components/ai-processes-drawer/ai-processes-drawer.cy.ts`, `pages/bilateral/components/bilateral-page-header/bilateral-page-header.cy.ts`, `docs/specs/bilateral/ai-processing-queue/execution.md` (evidence).
- **Tests:** as described. CT runs through `npm run test:ct:batch` scoped to the two specs.
- **Review:** `full`.
- **Verification:**
  - **Falsifier:** set the drawer to a fixed 440 px below 640 px → the 375 px overflow assertion is red. With `BILATERAL_AI_MAX_CONCURRENT=3` temporarily on one consumer, the HITL sample must show 3 `PROCESSING` rows, which proves the sampler can see a cap breach. Restore afterwards.
  - **Red run:** CT on the pre-`AIQ-T-8` code fails (component missing). For the HITL, the prefetch-1 baseline shows `PROCESSING` ≤ 1 with two users, which is the "before".
  - **Disqualifier:**
    - A HITL run in which only one consumer was alive cannot prove `AIQ-R-1` D. Report it as inconclusive; do not pass it.
    - If the icon or text font is not loaded in CT, geometry readings are not evidence (`changes--aow-identity-column-starvation` KZ-2).
    - If the 5-s samples miss the overlap window, for example because jobs finish in under 5 s, lengthen the evidence (a PDF like `4549e36f`, ~115 s) or report the spread.
  - **Consumers:** none (verification only).
- **Done criteria:** CT green at 3 viewports; falsifier observed; T6 review recorded; HITL evidence (sample log, order observed, p95) in `execution.md`; product-owner sign-off on wording and look.
- **Skills:** `angular-developer`; T6 visual review per `AGENTS.md` Model Routing (cross-host dispatch).

---

## 4. Dependency graph

```
AIQ-T-1 ─► AIQ-T-2 ─┬─► AIQ-T-3 ─────────────────────────────┐
                    └─► AIQ-T-4 ─► AIQ-T-5 ─┬─► AIQ-T-7 ─┐    │
AIQ-T-6 ───────────────────────► (AIQ-T-5)  ├─► AIQ-T-8 ─┼─► AIQ-T-10 ─► AIQ-T-11
                                            │            └─► AIQ-T-9 ──────► (AIQ-T-11)
```

- **Parallel-friendly:** `AIQ-T-6` runs from the start, in parallel with the server chain. After `AIQ-T-2`, `AIQ-T-3` and `AIQ-T-4` are independent. After `AIQ-T-5`, `AIQ-T-7` and `AIQ-T-8` are independent.
- No cycles.

---

## 5. Test plan (scenario / clause ownership)

| Requirement clause | Owning task |
|---|---|
| R-1 A · B (+ auto start) · C (all + BUT) · E · F (+ BUT) | T-2 (B's "starts automatically" → T-3) |
| R-1 D "at no instant > 2" · AIM "from the database" | T-2 (unit) + **T-11 (live proof)** |
| R-2 A · B · D | T-3 · R-2 C → T-2 |
| R-3 A (+ AIM DB time) | T-3 |
| R-4 A · B | T-3 |
| R-5 A · B (BUT) · C (+ BUT) · D | T-4 |
| R-6 A · B (+ AND) · C (BUT, server) | T-4 · R-6 C client → T-8 |
| R-7 A · B (form reset, confirmation, AND wizard unlocked, BUT no panel) · C | T-7 · "appears in the drawer at once" → T-5 · toast action → T-6 |
| R-8 A (+ AIM cadence) · B · C (+ AND legacy) | T-5 · R-8 D → T-5 (state) + T-7 (routing) + T-8 (highlight) |
| R-9 A–G · D (+ AIM parity) · H (announce) | T-8 · D drafts target → T-7 · H AIM computed reduced motion → T-11 |
| R-10 A (+ BUT, + AIM wizard) · B · C | T-9 · visibility per slot → T-11 |
| R-11 A (toast + badge) · B | T-5 · sticky → T-6 · BUT no dialog + AIM any route → T-10 (app-level) + T-11 (live) |
| R-12 A · C | T-8 · R-12 B sizes → T-8, AIM no overflow → T-11 |
| R-20 | T-2 (claim/park/redirect) + T-3 (wake) |
| R-21 | T-1 · R-22 (MAY) → T-8 |
| NFR performance (p95) | T-11 |
| `AIQ-D-1..16` | D-1 T-2+T-11 · D-2 T-3+T-11 · D-3 T-2 · D-4 T-4 · D-5 T-7 · D-6 T-5 · D-7 T-5+T-10 · D-8 T-8+T-11 · D-9 T-11 · D-10 T-8+T-11 · D-11 T-8 · D-12 T-2/T-3+T-11 · D-13 T-5 · D-14 every task · D-15 T-4 · D-16 T-11 |

Every scenario and every `BUT` / `AND IT MUST` clause above has a named owner. No gap is discharged by citing a different requirement.

---

## 6. Rollout & verification

1. PR 1 (server) → `performance-refactor` → prtest deploys automatically. The old client keeps working (additive API).
2. PR 2 (client) → prtest.
3. `AIQ-T-11` HITL on prtest.
4. Jira: after merge, move P2-3853 through the normal transitions and document what shipped, deviations included (project rule).

## 7. Cleanup & follow-ups

- Folder guides updated in `AIQ-T-7`, `AIQ-T-8`, `AIQ-T-10` (own deliverables).
- Unverified `center/ai/*` identity → P2-3854 (add `bilateral-ai.controller.ts` to its Affected list). Keyless error toasts → P2-3853 comment, if not fixed in `AIQ-T-5`.
- Follow-up: shared `pr-drawer` extraction.

## 8. Roll-back plan

- Fast: `BILATERAL_AI_MAX_CONCURRENT=1` plus a restart restores one lane (`AIQ-R-1` E).
- Full: revert PR 2, then PR 1. After reverting PR 1, re-publish every `PENDING` job once, because parked jobs have no message in flight (design §11).

---

## Required cross-references

`requirements.md` · `design.md` (Premise Ledger, §12A, Budget) · `proposal.md` §12.1 · `docs/trd/trd.md` W5, ADR-006 · `docs/ux-ui/design.md` §6, §7, §9, §10 · `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` · `AGENTS.md` Skill Map and Model Routing.
