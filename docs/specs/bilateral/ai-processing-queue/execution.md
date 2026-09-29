# Execution Log — Bilateral AI Processing Queue

## Document Control

| Field | Value |
|---|---|
| **Spec Path** | `docs/specs/bilateral/ai-processing-queue/` |
| **Branch** | `JuanGuzman-io/p2-3853-jira-understanding` (contains `origin/performance-refactor`, checked 2026-09-29) |
| **Approval Mode** | gated |
| **Leader** | Claude Opus 5.5 (T1) · Implementer `akili-implementer` wrapper (T2) · Reviewer `akili-reviewer` wrapper (T3) |
| **Started** | 2026-09-29 |

**Pre-flight (2026-09-29):** branch contains `performance-refactor` ✅ · fresh worktree had no `.env`, no client `src/environments/*.ts`, no `node_modules`; env files copied from the main checkout and `npm ci` run in both packages ✅ · `AIQ-OQ-1` / P-24 still open (needed only before `AIQ-T-11`) · single AKILI session in this checkout ✅.

**Wave 1:** `AIQ-T-1` (server) and `AIQ-T-6` (client shared) ran in parallel. They have no dependencies on each other, touch different packages, and share no `node_modules`.

---

## Task Execution History

### `AIQ-T-6` — `PrToastService`: optional action and sticky

- **Final status:** PASS · **Date:** 2026-09-29 · **Attempts:** 1
- **Skills:** `angular-developer`, `tailwind-design-system` (as listed) · **Effort:** medium

**Attempt 1**
- **Files changed:** `onecgiar-pr-client/src/app/shared/components/pr-toast/pr-toast.service.ts`, `pr-toast.component.ts`, `pr-toast.component.html`, `pr-toast.component.scss`; new `pr-toast.service.spec.ts`, `pr-toast.component.spec.ts`.
- **Disqualifier grep:** `grep -rnE "\.add\(\{[^}]*(action|sticky)" onecgiar-pr-client/src/app --include='*.ts'` returned 0 before the change. Afterwards it matches only the new specs. Consumer count `grep -rlE PrToastService`: 42 before, 44 after (the 2 new spec files).
- **Red run:** `npx jest src/app/shared/components/pr-toast --no-coverage` before the implementation: 2 failed / 5 passed. The sticky toast was removed at 60 s (`Expected: 1, Received: 0`), and `.pr-toast__action` was not found (`Received: null`).
- **Green:** 7/7 passed.
- **Falsifiers executed:**
  1. Dropping the `if (!message.sticky)` guard turned the "sticky 60 s" case red.
  2. Rendering the action button unconditionally turned "no action → no button" and "default markup identical" red.
  Both mutations were restored.
- **Build:** `npx ng build --configuration development` exit 0 (only the existing Sass `@import` deprecation warnings).
- **Evidence re-run (Leader-inline, non-author):** `npx jest src/app/shared/components/pr-toast --no-coverage` returned 7 passed. **VERIFIED**.
- **Review intensity:** a Reviewer was owed. Override (b) applies (exported shared contract `PrToastMessage`, 42 consumers), and `Consumers` ≠ `none`.
- **Reviewer:** **PASS**. `add()` takes an optional action and sticky flag. With neither field the behaviour and markup are unchanged, sticky toasts set no timer, and the button renders only when an action is present. This matches DD-10, §6.2 and §12A DD-6. Tokens exist (`colors.scss:20-21`), with no hex or rgba.
- **runtime events:** none

**ADVISORY (4R — recorded, not gating):**
- Readability/convention: the new `&__action` block is SCSS. `onecgiar-pr-client/CLAUDE.md` §5 is Tailwind-first ("don't add to" legacy SCSS), and `.scss` was not in the task's Files list. It was accepted because it matches the component's existing BEM classes.
- Reliability: if `action.run()` throws in `runAction`, `remove()` is skipped and the sticky toast stays. Consider remove-first or `try/finally` when `AIQ-T-5` attaches navigation callbacks.
- Resilience: sticky toasts can pile up with no limit across polls (R-11 B's grouping only limits each poll).
- Readability: `PrToastAction` is not re-exported from `pr-toast/index.ts`.
- Evidence: the "keyboard-focusable" check is `tabIndex !== -1`, which is weak. `focus()` + `document.activeElement` would test it directly. No test covers "close removes a sticky toast", but that code is unchanged.
- Risk (a11y): a sticky toast with a button sits inside `role="alert"`. Contrast and the focus ring belong to the HITL check in `AIQ-D-10`.

- **Requirements covered:** support for `AIQ-R-7` B (View action) and `AIQ-R-11` A (sticky).
- **Decisions made:**
  - The Reviewer got the diff through a scratchpad file path instead of inline (237 lines). This is a Leader economy deviation and the content is identical.
  - Spec inconsistency noted by the Reviewer: the "falsified-if" cell of P-15 (design.md:51) reads "DD-10 dropped", while §6.2, §12A and DD-10 keep it. The implementation follows DD-10. The spec was not edited.
- **Issues encountered:** none.
- **Final verification:** 7/7 green, build green, both falsifiers red when mutated.

### `AIQ-T-1` — Lane-cap config and prefetch from the global cap

- **Final status:** PASS · **Date:** 2026-09-29 · **Attempts:** 2
- **Skills:** `nestjs-expert` (listed) + `tdd` (Leader-added: the falsifier-driven clamp is a business rule where test-first pays) · **Effort:** medium → high (bumped on the retry)

**Attempt 1**
- **Files changed:** `onecgiar-pr-server/src/api/bilateral-ai/bilateral-ai.config.ts`, `bilateral-ai.config.spec.ts`, `onecgiar-pr-server/src/main.ts`, `src/main.spec.ts`.
- **What changed:**
  - `getBilateralAiMaxConcurrent()` (default 2) and `getBilateralAiMaxPerUser()` (default 1), sharing a non-exported helper `readClampedPositiveIntEnv`. Unset, empty, non-integer, `NaN` and values below 1 fall back to the default.
  - `main.ts`: the AI queue now sets `prefetchCount: getBilateralAiMaxConcurrent()`. The export block keeps its literal `1`.
- **Red:**
  - The config spec did not compile before the change (missing exports).
  - `main.spec` failed on behaviour before the `main.ts` edit: `Expected: 2, Received: 1`.
- **Green:** 27 passed.
- **Falsifier:** writing the getter as `Number(env.X || 2)` failed "clamps 0 back to the default" with `Expected: 2, Received: 0` (also -1, abc, 1.5). The clamp was restored.
- **tsc:** clean.
- **Evidence re-run (Leader-inline):** `npx jest --testPathPattern="bilateral-ai.config|main.spec"` gave 27 passed. VERIFIED.
- **Review intensity:** a Reviewer was owed. `Consumers` ≠ `none`, and override (b) applies (new exported symbols).
- **Reviewer:** **FAIL**, verbatim:
  > **Discovered Issue:** In `onecgiar-pr-server/src/main.spec.ts:124-165`, the new assertions only run inside `if (reportingQueueConfigured)` / `if (aiQueueConfigured)`. Those flags read `process.env` values that `import 'dotenv/config'` in `main.ts:1` loads from whatever `.env` the machine has. The spec never sets `BILATERAL_AI_PROCESSING_QUEUE`, `REPORTING_METADATA_EXPORT_QUEUE` or `RABBITMQ_URL` itself, and nothing under `.github/` provides a `.env`. Without a `.env`, both flags are false and the test passes without checking any option. The Implementer's red run ("Expected 2 Received 1") only worked because their local `.env` configures the AI queue. A secondary gap: `BILATERAL_AI_MAX_CONCURRENT` is unset in the test, so the expected value equals the default 2. A regression to a hardcoded `prefetchCount: 2` would still pass.
  > **Violated Rule:** `tasks.md` §3 `AIQ-T-1`, Verification → Disqualifier ("A test that does not read the options proves nothing about `prefetchCount`; report the gap instead of passing"). Also Tests: "`main.spec.ts` asserts the AI block's `prefetchCount` equals the getter value and the export block stays 1". This must hold on every run, not only on machines with a `.env`.
  > **Remediation Suggestion:** Set the queue env vars and `BILATERAL_AI_MAX_CONCURRENT='3'` in the spec, and save/restore them. Drop the conditionals and assert 3 / 1 / called twice. Add an unconfigured-path case. Re-run the red with `.env` moved aside.
- **Advisory (attempt 1):**
  - Reliability: `Number()` accepts `'0x10'`, `'1e1'` and `' 3 '`. A stricter `/^\d+$/` check is optional.
  - Readability: keep the doc comment explaining that these getters clamp while the older three do not.
  - Risk: `main.ts` importing the pure config module is low risk.
- **runtime events:** none

**Attempt 2** (rework; the FAIL report was relayed verbatim along with the attempt history)
- **Files changed:** `onecgiar-pr-server/src/main.spec.ts` only. `main.ts` was mutated temporarily for the falsifiers and restored.
- **What changed:**
  - The spec sets `RABBITMQ_URL`, both queue names and `BILATERAL_AI_MAX_CONCURRENT='3'` before `runMain()`, and saves/restores them (plus `PORT`) in `beforeEach`/`afterEach`.
  - Unconditional assertions: `connectMicroservice` ×2, reporting `prefetchCount === 1`, AI `prefetchCount === 3` (a literal, so the test is not tautological).
  - A second case covers the unconfigured path. It sets the queue vars to `''` rather than deleting them, so dotenv cannot repopulate them.
- **Red 1:** with `.env` moved aside and `main.ts` hardcoded to `prefetchCount: 1`, the result was `Expected: 3, Received: 1`.
- **Red 2:** with a hardcoded `prefetchCount: 2`, the result was `Expected: 3, Received: 2`.
- **Green:** 28 passed. **tsc:** clean. `.env` was restored and never printed.
- **Evidence re-run (Leader-inline):** the same jest command gave 28 passed. **VERIFIED**.
- **Reviewer:** **PASS**. The assertions no longer depend on the environment, the non-default `3` catches a hardcoded 2, the unconfigured path is correct under dotenv, the env is restored (the earlier `PORT` leak is fixed too), and the placeholder values are not secrets. No advisory.
- **runtime events:** none

- **Requirements covered:** `AIQ-R-21`; the bootstrap half of `AIQ-R-1` E.
- **Decisions made:** `tdd` added to the skill set (reason above). The Reviewer got diffs through scratchpad file paths (242 and 119 lines) instead of inline.
- **Issues encountered:** attempt 1's `main.spec` passed only because this machine has a `.env`. The Reviewer caught it.
- **Final verification:** 28/28 green, tsc clean, clamp falsifier red, prefetch falsifiers red with and without `.env`.
- **Budget:** design §14 allows ≤ 1 review round per task, and this task used 2. The budget is exceeded for this task, but it stays inside the 50 % tripwire across the spec (2 tasks, 3 rounds).

### `AIQ-T-2` — Dispatch service: claim-or-redirect under a named lock

- **Status:** in progress (`[~]`) · **Date:** 2026-09-29
- **Skills:** `nestjs-expert`, `error-handling-patterns`, `tdd` (as listed) · **Effort:** xhigh (concurrency core). On the retry it stays xhigh rather than going to max: the Effort dial says never to max a cheaper tier, so the escalation is instead the more detailed brief with verbatim FAILs.
- **Review mode:** parallel lens reviewers (the task's `Review: lenses`): A = concurrency, B = error paths. Both also check baseline spec conformance.

**Attempt 1**
- **P-25 finding:** `onecgiar-pr-server/node_modules/@nestjs/microservices/client/client-proxy.js:57-68` (v11.0.4). `emit()` calls `connectableSource.connect()` unconditionally, so it **dispatches without a subscriber**. The existing fire-and-forget publisher stays. No pivot.
- **Files changed:**
  - New: `services/bilateral-ai-dispatch.service.ts` and `.spec.ts`.
  - Modified: `bilateral-ai.consumer.ts` and `.spec.ts`, `services/bilateral-ai.service.ts`, `api/bilateral/bilateral.module.ts`.
- **`attemptStart`:** now non-private. Its WHERE clauses at `bilateral-ai.service.ts:731-741` are unchanged.
- **Deviation:** `processJob(jobId, { skipClaim?: boolean })`. The `run` outcome passes `skipClaim: true` because the claim already happened under the lock. Without it, the second `attemptStart` would affect 0 rows and abort. Callers that pass only the job id behave as before. **Both reviewers accepted it**, per design §2.1 ("`processJob` runs a job already claimed") and DD-1.
- **Red:** 12 failed / 7 passed against the stub, on the `decide` assertions.
- **Green:** 266 passed (12 suites).
- **Falsifiers:**
  1. Dropping the owner-at-cap filter made `decide(C1)` return `redirect A2` where `run` was expected: red.
  2. Dropping `RELEASE_LOCK` from `finally` turned the throw-path tests red.
- **tsc:** clean. **`new Date(`:** 0.
- **Evidence re-run (Leader-inline):** `npx jest --testPathPattern="bilateral-ai"` gave 266 passed, and `tsc` was clean. **VERIFIED**.
- **Reviewer A (concurrency): FAIL** — 2 issues (verbatim in the rework brief; summarized here):
  1. When the owner is at the per-user cap, `decide` parks X without calling `oldestEligible`, so a free lane plus an eligible E is never redirected. This violates `design.md` §2.3 (park only when "nothing else eligible") and `AIQ-DD-1`. Remediation: run `oldestEligible` when the owner is at cap, redirect if it finds a job and park otherwise, and split the worked-example test.
  2. The claim goes through the service's pooled `jobRepository`, not `queryRunner.manager`. This violates `design.md` §5.2 ("acquire, decide, claim and release must share that connection"). Remediation: `attemptStart(job, manager?)` using the `selectManager` pattern, with the WHERE clause unchanged.
- **Reviewer B (error paths): FAIL** — 2 issues:
  1. `decide()` in the consumer is outside any try block. A throw leaves the message neither acked nor nacked, so it holds a prefetch slot. With prefetch = 2, two DB blips freeze the consumer. Separately, if `queryRunner.release()` throws after the claim, the job is stranded as `PROCESSING`. This violates the tasks.md T-2 rule ("today's path… including the `nack` retry (DD-3)"), `AIQ-DD-3`, and `onecgiar-pr-server/CLAUDE.md` §7. Remediation: try/catch that nack-requeues, and a guarded `release()`.
  2. The `skipClaim` branch of `processJob` is untested; `attemptNumber` decides retry vs final. This violates the tasks.md T-2 Consumers line (`processJob` block) and `AIQ-R-1` F. Remediation: service-spec cases (no `attemptStart`; a non-PROCESSING row returns early; max-1 → retry, max → FAILED).
- **ADVISORY (A):**
  - Re-read the job under the lock to avoid a stale read.
  - The `resume-retry` path could claim a `PENDING` row without the lock if it flipped in the meantime. The window is milliseconds and goes against DD-1.
  - `wake`'s `reservedOwners` publishes too little when the per-user cap is above 1.
- **ADVISORY (B):**
  - `queryRunner.connect()` sits outside the try in `decide`/`wake`, which breaks `wake`'s "never throws" before T-3 wires it in.
  - If a fire-and-forget redirect publish fails, two jobs are parked with no message in flight. The recovery is the T-3 sweeper wake, so **T-2 must not ship without T-3** (they already share PR 1).
  - The `GET_LOCK`-throws and lock-timeout paths are missing service-level tests.
  - The worked example has no A1/B1 rows; the "after B1 finishes" state lives only in a comment.
  - The consumer nack test dropped its `processJob` assertion.
- **Leader adjudication:** all 4 issues are in scope for T-2, with no Pivot. Advisories are recorded and are not scope. **Forward pointer → `AIQ-T-3`:** move `queryRunner.connect()` inside the try in `wake()` before wiring it into the terminal paths (advisory B1), and note that the sweeper wake is the recovery for a lost redirect.
- **runtime events:** none

**Attempt 2** (rework: both FAIL reports were relayed verbatim along with the attempt history)
- **Files changed:** same set as attempt 1, plus `services/bilateral-ai.service.spec.ts`.
- **Fixes:**
  - A1: only `runningCount >= globalCap` parks immediately. When the owner is at cap, the flow falls through to `oldestEligible`, which returns `redirect(E)` or `park`. The worked example is split into park (A1+B1 running) and redirect('C1') with publish asserted (B1 finished).
  - A2: `attemptStart(job, manager?)` via `selectManager`, with WHERE/SET unchanged. `decide` passes `queryRunner.manager`.
  - B1: the consumer wraps `decide` in try/catch → nack-requeue, with attempts untouched. `releaseRunner()` logs and swallows errors, and is used in both `finally` blocks.
  - B2: four `processJob(skipClaim)` service-spec cases.
- **Green:** `npx jest --testPathPattern="bilateral-ai"` gave 272 passed (12 suites). tsc and eslint `--quiet` are clean. `new Date(` count: 0.
- **Falsifiers** (all executed, red, and restored):
  - Original 1 (owner filter): both worked-example tests flip.
  - Original 2 (`RELEASE_LOCK`): the throw-path test goes red.
  - (i) Park-without-redirect: `redirect('C1')` Received `park`.
  - (ii) Consumer try/catch removed: an uncaught `DB connection lost`.
  - (iii) `attemptNumber = attempts+1`: max-1 flips to FAILED.
- **Evidence re-run (Leader-inline):** 272 passed, tsc clean. **VERIFIED**.
- **Reviewer A (concurrency): PASS.** Both fixes are confirmed, and the attempt-1 properties did not regress:
  - one connection for lock, counts, claim and release;
  - redirect is published before release;
  - lock-timeout happens before the claim;
  - a retrying job keeps its lane;
  - nothing can throw after a claim.
  - R-1 D stays open until T-11.
- **Reviewer B (error paths): PASS.**
  - `decide` failure → nack-requeue, with no `processJob` call (spec `:102-114`).
  - Cleanup cannot throw.
  - `GET_LOCK` throwing is handled.
  - The skipClaim cases test real behaviour.
  - P-2 WHERE clauses are unchanged.
  - The §5.7 log lines are present and secret-free.
- **ADVISORY (final, recorded and not scope):**
  - Readability: duplicate comment block at `bilateral-ai-dispatch.service.ts:117-124`.
  - Known bounded case: if the claim UPDATE commits and the driver then errors, the consumer nacks. The redelivery is a `noop`, and the job sits `PROCESSING` until the sweeper marks it `TIMED_OUT`. Caps are never exceeded.
  - Risk: `resume-retry` → `processJob` claims without the lock if the row flipped to `PENDING` in the gap. The window is milliseconds and contradicts DD-1's "only writer".
  - `wake`'s `reservedOwners` publishes too little when the per-user cap is above 1. It is safe because `decide` re-checks.
  - `wake()` still has `queryRunner.connect()` outside the try, so its "never throws" docstring is false when the DB is down.
  - Pin `BILATERAL_AI_MAX_ATTEMPTS` in the skipClaim `describe` so a local `.env` cannot change the result.
  - `releaseRunner` swallowing has no test.
- **runtime events:** none

- **Final status:** PASS on attempt 2 (both lenses) · **Date:** 2026-09-29
- **Requirements covered:**
  - `AIQ-R-1` A, B (park half), C, D (unit half only; **not** claimed as met, since live proof is `AIQ-T-11`), E (runtime half), F
  - `AIQ-R-2` C
  - `AIQ-R-20` (claim / park / redirect / lock-timeout lines)
- **Decisions made:**
  - P-25 settled: `emit` dispatches without a subscriber (`client-proxy.js:57-68`, v11.0.4), so no subscribe wrapper is needed.
  - Deviation accepted by both reviewers: `processJob(jobId, { skipClaim })`, per design §2.1 and DD-1.
  - Effort stayed at xhigh on the retry (no max on T2).
- **Forward pointers → `AIQ-T-3` (must be copied into its brief):**
  1. Move `queryRunner.connect()` inside the try in `wake()` before wiring `wake` into the `processJob` terminal paths. Otherwise a DB error at wake time could turn a `COMPLETED` job into a consumer retry.
  2. The sweeper `wake('sweep')` is the only recovery for a lost redirect publish and for the claim-committed-then-error case above. **T-2 must not ship without T-3** (both are in PR 1).
- **Issues encountered:** attempt 1 misread the §2.3 park row and claimed on a pooled connection. The error-path gap came from `decide` moving the DB work outside `processJob`'s try.
- **Final verification:** 272/272 green, tsc and lint clean, 5 falsifiers red when mutated.
- **Constitution Impact:** new provider `BilateralAiDispatchService` inside the existing `bilateral` module. There is no new module or boundary and no public HTTP surface change. A CodeGraph re-index is pending (`codegraph sync` at archive).
- **Budget check:**
  - Review rounds so far: T-6 1, T-1 2, T-2 2 (each round ran 2 parallel lens verdicts). That is 5 rounds for 3 tasks, against the design §14 budget of ≤ 1 per task, so 67 % over pro-rata and 45 % of the spec-wide 11-round budget spent.
  - LOC is within the task's L estimate. **Surfaced to the user at the continue gate.**

### `AIQ-T-3` — Wake on every lane-freeing path; sweeper safety net and stall rule

- **Status:** in progress (`[~]`) · **Date:** 2026-09-29
- **Skills:** `nestjs-expert`, `tdd` (as listed) · **Effort:** high → xhigh on the retry
- **Forward pointers carried from T-2** (`[advisory-grade]` in the brief): `connect()` moved inside `wake()`'s try; a wake failure can never change a job's outcome.

**Attempt 1**
- **Files changed:** `services/bilateral-ai.service.ts` (+spec), `services/bilateral-ai-dispatch.service.ts` (+spec), `bilateral-ai-sweeper.cron.ts` (+spec).
- **What changed:**
  - `wakeDispatch()` helper with try/catch, called after the COMPLETED write and after the final FAILED write.
  - Sweeper: a wake after each TIMED_OUT flip, the DD-5 owner exemption with a wake before the flip, and `wake('sweep')` always at the end of the tick. The stale prefetch-1 comment is updated.
- **Deviation:** `BilateralAiService` and `BilateralAiDispatchService` now depend on each other, resolved with `forwardRef()` on both constructors. That touches the dispatch service file, which is not in the Files list. **The Reviewer accepted it**: nothing uses the other service at construction time, and the only cross-call happens at request time.
- **First report had a `Not Done` gap:** the retry re-entry test (listed in Tests) was skipped, and falsifier 2's red was a mock `TypeError` instead of an assertion. I sent the task back for the remainder (not counted as an attempt):
  - Added: a `retried_date` via raw CURRENT_TIMESTAMP test and a dispatch ordering test.
  - The sweeper mocks now classify builders by SQL fragment.
  - Falsifier 2 now goes red on an assertion (`update` not called: Expected 0, Received 1).
  - Added a dedicated AC-11 timeout test.
- **`new Date(` in the sweeper:** 3 baseline hits, all in comments. After the change, the same 3, shifted.
- **Falsifier 1:** removing the wake after COMPLETED gives `Expected 1, Received 0`.
- **Green:** 284 passed. **tsc / eslint:** clean.
- **Evidence re-run (Leader-inline):** 284 passed, tsc clean. **VERIFIED**.
- **Reviewer: FAIL**:
  - **Issue:** no test covers the wake after a TIMED_OUT flip (`bilateral-ai-sweeper.cron.ts:135`). Deleting that line leaves the suite green, because the tick-end `wake('sweep')` satisfies every assertion.
  - **Violated rule:** tasks.md T-3 Tests ("`wake` is called exactly once on each §5.3 path") and design §5.3, row "Sweeper `TIMED_OUT` after each flip".
  - **Remediation:** a two-stale-attempts test (3 wakes, checked with invocationCallOrder), an affected: 0 case, and a mutation run.
- **Reviewer checks that held:**
  - COMPLETED, final FAILED and TIMED_OUT each wake once; the tick always wakes; the retryable path does not wake.
  - All cutoffs are in SQL.
  - `queue_entry_date` is a STORED generated column, `COALESCE(retried_date, created_date)` (`bilateral-ai-job.entity.ts:128-137`).
  - The mock rework maps 1:1 onto the old tests.
- **ADVISORY:**
  - **Spec gap (Leader to surface):** under the defaults (timeout 15 min, stall window 30 min), the owner exemption can almost never trigger. A job still PROCESSING always has a `started_date` inside the stall window, so the existing liveness check already returns first. AIQ-R-4 A is met through liveness. The T-3 Disqualifier's "fresh activity **and** discriminating" cannot both hold; the only fixture that discriminates models a state the defaults rule out. Recorded as a spec defect, not rework.
  - **Resilience:** the wake before the flip cannot actually save the job. The PENDING-scoped UPDATE runs milliseconds later, before any consumer can claim, so DD-5's "flip only if still PENDING" is nominal.
  - **Tests:** the per-branch catch in `sweep()` can swallow a mock throw for an unclassified query. Assert `logger.error` was not called in the stall cases.
  - **Readability:** the timeout wake and the tick wake both log `reason='sweep'`.
  - AC-11 is proven by SQL shape only; the live proof is T-11.
  - **Risk:** the forwardRef cycle has never been resolved in a real Nest DI graph. **Smoke-test app boot before T-11.**
- **Leader adjudication:** the issue is in scope. I also added one item to the rework as task conformance (not new scope): the task Description asks for a wake "after each sweeper `TIMED_OUT` and `QUEUE_STALLED` flip", and the Reviewer found only the tick wake follows a QUEUE_STALLED flip.
- **runtime events:** none

**Attempt 2** (rework: the FAIL report was relayed verbatim along with the attempt history and the Leader's task-conformance addition)
- **Files changed:** `bilateral-ai-sweeper.cron.ts` and `.spec.ts`.
- **What changed:**
  - Discriminating tests for the TIMED_OUT per-flip wake: two affected flips give 3 wakes, one of them strictly between the updates; affected 0 gives 1 wake.
  - A new wake after the QUEUE_STALLED flip (placed after `notifyTerminal`, separate from the §5.4 pre-flip wake), with tests: affected gives 3 wakes; affected 0 gives 2.
- **Mutations:**
  - Deleting the TIMED_OUT post-flip wake: `Expected 3, Received 1`.
  - Deleting the QUEUE_STALLED post-flip wake: `Expected 3, Received 2`.
- **Green:** 288 passed. tsc and eslint are clean.
- **Evidence re-run (Leader-inline):** 288 passed, tsc clean. **VERIFIED**.
- **Reviewer: PASS.** Every §5.3 path has a wake, and deleting any one of them turns a test red:
  - COMPLETED: 1.
  - Final FAILED: 1 (only if the write was affected).
  - TIMED_OUT: 1 per affected flip.
  - QUEUE_STALLED: 1 pre-flip plus 1 post-flip when affected.
  - Tick: always 1.
  - Retryable: none.
  - The forwardRef cycle is safe, and wake failures are swallowed.
- **ADVISORY (final):**
  - Resilience: the DD-5 pre-flip wake cannot rescue the job.
  - Tests: assert that `logger.error` was not called in the stall cases (the catch can hide mock throws).
  - Readability: all four sweeper wakes log `reason='sweep'`. Distinct reasons would help.
  - Risk: **smoke-test app boot (real DI graph with the forwardRef cycle) before T-11**.
- **runtime events:** none

- **Final status:** PASS on attempt 2 · **Date:** 2026-09-29
- **Requirements covered:**
  - `AIQ-R-2` A, B, D
  - `AIQ-R-3` A, including DB time
  - `AIQ-R-4` A, B (A in practice through the liveness check; see the spec defect below)
  - `AIQ-R-20` (wake lines)
- **Decisions made:**
  - Accepted the forwardRef deviation (dispatch service file touched).
  - Implemented the T-2 forward pointers.
  - The task-conformance QUEUE_STALLED post-flip wake was added by the Leader from the task Description.
- **Spec defect (surfaced to the user, not reworked):** with the default timeout (15 min) and stall window (30 min), the DD-5 owner exemption almost never triggers, because the liveness check returns first. The T-3 Disqualifier ("fresh activity **and** discriminating") cannot both hold.
- **Forward pointer → `AIQ-T-11`:** smoke-test server boot (real Nest DI with the `BilateralAiService` ↔ `BilateralAiDispatchService` forwardRef) before the HITL.
- **Final verification:** 288/288 green; tsc and lint clean; 4 wake mutations and the owner-exemption mutation go red.
- **Budget:** review rounds are now T-6 1, T-1 2, T-2 2, T-3 2 = 7 rounds for 4 tasks, 64 % of the spec-wide 11.

### Merge: `origin/performance-refactor` → spec branch (2026-09-29, at the user's request)

- **Commit:** `4f740ffc2`. It brought in 16 commits, including P2-3854 `be208ead2` (JWT verified on `/api/bilateral/center/*`) and P2-3848 (QA AI text suggestions).
- **Conflicts:** none. `bilateral.module.ts` auto-merged: our `BilateralAiDispatchService` plus their `ResultFieldRevision` entity.
- **Checks after the merge:**
  - Server `tsc` clean.
  - Server `jest --testPathPattern="bilateral-ai|bilateral-center|jwt.middleware|bilateral-quality"`: 698 passed.
  - Client `jest` for pr-toast, bilateral-result-creator and bilateral-quality-assessment-dialog: 230 passed.

### `AIQ-T-4` — `GET center/ai/jobs`, `jobs_ahead` / `wait_reason`, contract doc

- **Final status:** PASS · **Date:** 2026-09-29 · **Attempts:** 1
- **Skills:** `nestjs-expert`, `api-design-principles` (as listed) + `tdd` (Leader-added: the key-set and privacy falsifiers are contract tests) · **Effort:** high
- **Review mode:** parallel lenses (privacy/auth, contract/correctness). The task carries privacy (override f) and an external contract.

**Attempt 1**
- **Files changed:** `bilateral-ai.controller.ts` (+spec), `services/bilateral-ai.service.ts` (+spec), `onecgiar-pr-server/docs/bilateral-result-summaries.en.md`.
- **What was added:**
  - `@Get('jobs')`, declared before `jobs/:jobId`.
  - `listJobs(user)`: active jobs plus up to 10 finished in the last 24 h (the cutoff is computed in SQL), plus a `summary`.
  - A private helper, `computeQueueWait`, shared by `listJobs` and `getJob`. `getJob` adds `jobs_ahead`/`wait_reason` and sets `queue_position = jobs_ahead`.
  - A new `ClarisaProjectsRepository` injection. The constructor grows from 18 to 19 parameters; the only hand-built spec is `bilateral-ai.service.spec.ts`, confirmed by grep.
- **Auth finding (after P2-3854):**
  - `app.module.ts:143-150` does not exclude `api/bilateral/center/ai/jobs`, so `JwtMiddleware` verifies the token (`jwt.middleware.ts:134,153`).
  - `@UserToken()` returns `request.user` first (`user-token.decorator.ts:7-9`).
  - Design §7 already describes this post-P2-3854 state, so there was no Pivot.
- **Key set:**
  - Item: `job_id, status, stage, stage_updated_date, project_id, project_name, program_code, center_id, center_acronym, document_count, audio_count, has_text, queue_entry_date, started_date, completed_date, result_count, error_code, attempts, max_attempts, retrying, jobs_ahead, wait_reason`.
  - Summary: `lanes_total, lanes_busy, others_waiting`.
- **Red:** both spec files failed to compile before the change (missing `listJobs`/`jobs_ahead`, constructor arity).
- **Green:** 296 passed (12 suites).
- **Falsifiers:**
  1. A `{...job}` spread leaked `bucket_name`, `document_keys`, `audio_keys` and `document_keys_raw`; the key-set test went red.
  2. Dropping the `user_id` filter leaked user 99's rows into caller 42's list (`Expected length 1, Received 3`).
- **Change-log row:** dated 2026-09-29, at the top of `bilateral-result-summaries.en.md`. It cites AIQ-T-4/AIQ-D-15 and records the new endpoint, the key set, the summary, the additive fields and the `queue_position` redefinition.
- **tsc / eslint:** clean.
- **Evidence re-run (Leader-inline):** `npx jest --testPathPattern="bilateral-ai"` gave 296 passed, tsc clean. **VERIFIED**.
- **Reviewer, privacy/auth lens: PASS.**
  - The route is signature-verified; the new route is declared before `:jobId` (proved by supertest).
  - Both reads are scoped to the caller, and all SQL is parameterized.
  - `summary` contains counts only; there is no entity spread.
  - `getJob` still filters on `{job_id, user_id}`.
  - The privacy fixture mixes in user 99's rows; the `id: 0` case returns an empty list.
  - No log lines were added.
- **Reviewer, contract lens: PASS.**
  - The key set matches §4.1 exactly.
  - `wait_reason` precedence follows §5.5 and never contradicts dispatch.
  - `jobs_ahead` counts older PENDING jobs only, so it is monotonic.
  - The helper is shared; the 24 h cutoff is in SQL without timezone skew.
  - The change-log row matches the diff.
  - All six listed tests exist; the updated `:296-351` spec is stricter.
- **ADVISORY (recorded, not scope):**
  - **Privacy risk:** if `user.id` were ever `undefined`, TypeORM would drop the `user_id` key from `find({where})` and return every user's active jobs. The middleware (`jwt.middleware.ts:134`) prevents this today. A one-line guard `if (!userId) return empty` would close it. `getJob` has the same older pattern.
  - **Evidence gap:** no app-level test shows `/api/bilateral/center/ai/jobs` answers 401 without `auth`. It was verified by reading the code only.
  - **Spec drift:** `requirements.md:217` (R-5 C, "no header → empty list") predates P2-3854; the middleware now returns 401. Align it at archive.
  - **Contract drift:** `dto/bilateral-ai-job-response.dto.ts:88-96` still describes the old `queue_position` and lacks `jobs_ahead`/`wait_reason`. It is not wired in (P-11) and not in the T-4 Files list. Follow-up.
  - **Ties:** `jobs_ahead` uses a strict `LessThan` on a one-second `queue_entry_date`, while dispatch breaks ties by `job_id`, so same-second jobs under-count by one. The count is still monotonic.
  - **Performance (NFR, measured in T-11):** `listJobs` runs 2–3 counts per PENDING item (N+1). With about 10 PENDING jobs that is around 30 counts per poll, above §8's "two counts". Suggest computing the owner and global counts once. The Clarisa lookup loads every column.
  - **Test gap:** there is no fixture with a job finished 1 h ago or 25 h ago.
  - **Readability:** R-6 A says "has a PROCESSING job" where the code (and §5.5) says "at cap". The two differ only when the per-user cap is above 1.
- **runtime events:** none
- **Requirements covered:** `AIQ-R-5` A, B, C, D; `AIQ-R-6` A, B, C (server); NFR performance deferred to `AIQ-T-11`.
- **Decisions made:** `tdd` added. No spec edits.
- **Forward pointers:**
  - → `AIQ-T-5`: the list shape above is the contract. `dto/bilateral-ai-job-response.dto.ts` is stale; do not model the client on it.
  - → `AIQ-T-11`: measure the `GET center/ai/jobs` p95 with about 10 PENDING items (the N+1 advisory), and add an app-level 401 probe.
- **Final verification:** 296/296 green; tsc and lint clean; both falsifiers red when mutated.
- **Budget:** T-4 took 1 round. The spec now stands at 8 rounds for 5 tasks (73 % of the spec-wide 11).
