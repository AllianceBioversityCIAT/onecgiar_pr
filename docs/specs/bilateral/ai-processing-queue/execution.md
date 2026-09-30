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

### `AIQ-T-5` — Client job list: model, API method, service store and poller

- **Status:** in progress (`[~]`) · **Date:** 2026-09-29
- **Skills:** `angular-developer`, `tdd` (as listed) · **Effort:** high, raised to xhigh on the retry

**Attempt 1**
- **Files changed** (all under `onecgiar-pr-client/src/app/`):
  - Model and API:
    - `shared/services/api/bilateral-api.service.ts`: `GET_bilateralAiJobs()`.
    - `pages/bilateral/bilateral-ai-job.model.ts` (+spec) and `bilateral-ai-job.fixtures.ts`: `RawBilateralAiListJob`, `NormalizedBilateralAiListJob`, `normalizeListJob`, `waitReasonCopy`, and the `rawListJob()` fixture.
  - Service:
    - `pages/bilateral/services/bilateral-ai.service.ts` (+spec): full rewrite. It keeps the list store and a single poller on the APF-R-7 cadence, diffs terminal states into sticky action toasts (one grouped toast when more than 2 finish), migrates the legacy key, and manages the hint key.
  - Compile-level adaptations to other readers:
    - Header (+spec): the chip becomes inert stubs.
    - Upload (+spec): the panel and `?job=` block are removed, `onSubmit` calls `addSubmittedJob`, and 5 specs were cut.
    - Completion dialog (+spec): `notice` is always null, and the spec is reduced to a smoke test.
    - The creator and `bilateral-page-header.cy.ts` needed no changes.
- **Contract unwrap:** confirmed at source. The server `ResponseInterceptor` returns `{response: {jobs, summary}}`.
- **Red:** the new spec failed to **compile** before the implementation, not on the call-count assertion the task names. The Reviewer accepted falsifier 1's post-change red as a substitute. This is recorded as a procedural deviation.
- **Falsifiers:**
  1. A per-job `GET_bilateralAiJob` inside the poll: `not.toHaveBeenCalled` received 6.
  2. Without the diff guard: Expected 1 toast, Received 3.
- **401 test:** a 401 stops the poll; a 500 or a network error keeps polling.
- **AIQ-D-14:** a `// @ts-expect-error` probe `jobs.set([{notAField:true}])` fails with TS2353 once the comment is removed.
- **Build and lint:** green.
- **Keyless error toasts** (now at `bilateral-ai.service.ts:505,519`): not touched, so they go on the ticket comment (§13).
- **Evidence re-run (Leader-inline):** `npx jest src/app/pages/bilateral src/app/shared/services/api/bilateral-api.service` gave 2098 passed (58 suites). `ng build --configuration development` exit 0, 0 errors. **VERIFIED**.
- **Reviewer: FAIL**
  - **Issue:** `addSubmittedJob` does not seed `previousJobsById`, and `ensurePolling()` returns early when a timer exists. A submitted job that finishes before the next poll therefore gets **no toast and no unseen badge**, and the cadence stays at 15 or 30 s. This is the multi-job case (R-7 A).
  - **Violated rules:** `AIQ-R-11` A ("tracked job reaches a terminal state → sticky toast … badge updates") and `AIQ-R-8` A (adaptive cadence measured from the most recent active job).
  - **Remediation:** seed the placeholder into `previousJobsById`, carry placeholders forward, restart the timer at the initial interval with an immediate poll, and add a test.
- **Reviewer rulings on the Implementer's judgment calls:** all conforming.
  1. The placeholder is `{jobId, jobStatus}` (state-level "at once").
  2. The generic `own_job_running` copy is fine because R-9 C belongs to T-8.
  3. The toast copy and actions match R-11 A/B and §6.4.
  4. Restart on drawer open is implemented and tested.
  5. The cut chip and dialog tests are fine because T-7, T-9 and T-10 restore or delete those surfaces in the same PR 2.
- **ADVISORY:**
  - Reliability: `openDraftsForJob` does nothing when `centerAcronym` is null. Fall back to `openDrawer`, and consider `?job=`.
  - Resilience: `setInterval` can overlap in-flight polls, so a late stale response can cause a second toast.
  - Readability: the toast label falls back to the raw UUID, and the toast strings are hardcoded English. Move them to `bilateral-ai-processes.copy.ts` in T-7 or T-8.
  - Risk: add an optional `projectName` parameter to `waitReasonCopy` for T-8.
  - Risk: the `bilateral-page-header.cy.ts:33-41` chip CT now fails at runtime. It is local-only; **T-9 owns it**.
- **Forward pointers:**
  - → `AIQ-T-8`: `waitReasonCopy(projectName?)`; move the toast strings into the copy file.
  - → `AIQ-T-9`: rewrite `bilateral-page-header.cy.ts` (the chip CT is broken at runtime since T-5).
- **runtime events:** none

**Attempt 2** (rework: the FAIL report was relayed verbatim along with the attempt history)
- **Files changed:** `pages/bilateral/services/bilateral-ai.service.ts` and `.spec.ts`.
- **What changed:**
  - `addSubmittedJob` seeds `previousJobsById`.
  - `ensurePolling()` always restarts at `POLL_INTERVAL_INITIAL` and polls immediately.
  - `pollList` carries forward placeholders the server has not listed yet.
  - `hasPolledOnce` was removed as redundant.
  - Three new tests: the Reviewer's exact scenario, carry-forward, and the cadence restart.
- **Mutations:**
  - Removing the seed turns the toast test red (0 vs 1).
  - Restoring the early return turns the cadence test red (0 vs 1).
  - Both original falsifiers still go red.
- **Evidence re-run (Leader-inline):** jest on `pages/bilateral` and the API service gives 2101 passed. `ng build` has 0 errors. **VERIFIED**.
- **Reviewer: PASS.**
  - The fast-terminal toast and the unseen badge are both covered, with a test at spec `:424`.
  - The cadence restart is covered at `:287`.
  - Removing `hasPolledOnce` is safe: the first poll after a reload toasts nothing, and `:392` still covers that.
  - Repeated `openDrawer` calls replace the timer and make one request per call, so they cannot cause a request storm.
  - Carry-forward is bounded in practice, because the server lists every active row of the caller.
- **ADVISORY (final):**
  - Carry-forward has no cap: a phantom placeholder could stay if the tab's user changes without a reload. Track placeholder ids and drop them after about 3 misses.
  - `pollList` has no in-flight guard, so a stale late response can re-toast. T-7 and T-8 must not call `openDrawer` from an `effect`.
  - The attempt-1 readability advisories still stand.
- **runtime events:** none

- **Final status:** PASS on attempt 2 · **Date:** 2026-09-29
- **Requirements covered:**
  - `AIQ-R-8` A, B, C, D (service half)
  - `AIQ-R-11` A (toast and badge logic, service half), B
  - `AIQ-R-7` B ("appears in the drawer at once")
- **Decisions made:**
  - The red-run deviation was accepted: the red was a compile failure, and falsifier 1 stands in for it.
  - All five Implementer judgment calls were ruled conforming.
- **Forward pointers:**
  - → `AIQ-T-7` and `AIQ-T-8`: never call `openDrawer` from an `effect`, because there is no in-flight guard.
  - → `AIQ-T-8`: add an optional `projectName` to `waitReasonCopy`, and move the toast strings into `bilateral-ai-processes.copy.ts`.
  - → `AIQ-T-9`: `bilateral-page-header.cy.ts` is stale.
  - → Ticket comment: the keyless error toasts at `bilateral-ai.service.ts:505,519`.
- **Final verification:** 2101/2101 green, build and lint clean, 4 mutations go red.
- **Budget:** 10 review rounds for 6 tasks, which is 91 % of the spec-wide 11.

### Budget tripwire — decision (2026-09-29)

- **State after T-5:** 10 review rounds for 6 tasks, against the design §14 budget of 11 total (≤ 1 per task). With 5 tasks remaining, the projection is at least 15 rounds (≥ 36 % over), and about 20 (~80 % over) at the observed ~2 rounds per task. That crosses the > 50 % tripwire.
- **Cause:** every extra round came from a real defect a Reviewer caught (env-dependent test, missed redirect, un-acked message on a decide failure, untested wake path, missing toast), not from review noise.
- **Decision:** the user replied "Continue" at the tripwire gate, so execution continues past the tripwire. `design.md` §14 was not edited; the overrun is recorded here for `/akili-archive`'s kaizen.
- **Ordering:** T-7 before T-8, serialized. Both write `internationalization/bilateral-ai-processes.copy.ts` and share the client build output and `node_modules`.

### `AIQ-T-7` — Never-blocking upload, unlocked wizard, `?job=` routing, drafts highlight

- **Status:** in progress (`[~]`) · **Date:** 2026-09-29
- **Skills:** `angular-developer`, `tailwind-design-system` (as listed) · **Effort:** high → xhigh on retry
- **Forward pointers carried:** never call `openDrawer` from an `effect()`; create `bilateral-ai-processes.copy.ts`.

**Attempt 1**
- **Files changed:**
  - `bilateral-ai-upload/*`: component, html, spec, `CLAUDE.md`
  - `bilateral-result-creator/*`: ts, html, spec
  - `my-draft-results/*`: ts, html, spec
  - new `internationalization/bilateral-ai-processes.copy.ts`
- **What changed:**
  - The upload form is always rendered.
  - On 202: `addSubmittedJob`, form reset, `clearUploadState()`, the confirmation card, and a toast with a View action that calls `openDrawer()`.
  - `?job=` calls `openDrawer`. The upload component does this in `ngOnInit`; the creator does it in its `queryParams.subscribe`.
  - My Drafts puts `?job=` into a signal. A constructor effect then applies the highlight and `scrollIntoView` once, and never calls `openDrawer`.
  - The creator's `isAiProcessing` reads only `uploading`.
  - New `chooseAnotherProject` output.
- **Falsifiers:**
  1. Restoring the `@if` wrapper gave 6 assertion reds (`input[type=file]` Received null).
  2. Restoring the `isAiProcessing` statuses gave 3 reds (Expected false, Received true).
- **Green:** 255 in the 3 folders. Build and lint clean.
- **Evidence re-run (Leader-inline):** `npx jest src/app/pages/bilateral` gave 2091 passed. `ng build` had 0 errors. **VERIFIED**.
- **Reviewer: FAIL**, 3 issues:
  1. No test shows the manual-create drawer host still hosting the upload. It was checked by inspection only. The Reviewer ruled the test is owed: it violates the tasks.md T-7 Tests line "Manual-create drawer host still hosts the upload (P-13)", and P-13 is rated High.
  2. Resubmittable after a 202 is asserted only through `disabled === false`. `canSubmit()` is checked only before the first submit, and no test runs a second submit. This violates the T-7 Disqualifier ("enabled and submittable") and `AIQ-R-7` A.
  3. The `my-draft-results/CLAUDE.md` and creator `CLAUDE.md` guides were not updated. This violates `onecgiar-pr-client/CLAUDE.md` §10.
- **Reviewer confirmed:**
  - The form is always mounted.
  - The 202 path is correct.
  - Both `?job=` paths are correct.
  - The drafts effect cannot loop or re-scroll, and never calls `openDrawer`.
  - No hex, `rgba(` or `pi-` in the templates, and every token exists.
- **ADVISORY:**
  - Reliability: `/create?job=X` calls `openDrawer` twice (the creator subscription plus the upload `ngOnInit`), which sends two list GETs at once because there is no in-flight guard. The spec literally asks for both call sites. Fix it by making `openDrawer` a no-op when the drawer is already open on the same job, or by having only one side read `?job=`.
  - In the drawer host, "Choose another project" only hides the card.
  - The creator spec's mock has no `jobs` signal.
  - The drafts test does not assert the ring class.
  - `hover:bg-white` on the secondary button breaks the fg/bg pair rule.
  - The subtitle copy differs from the mockup.
- **Leader adjudication:** all 3 issues are in scope. The double `openDrawer` advisory is recorded as a **forward pointer → `AIQ-T-10`/`AIQ-T-11`**: watch for duplicate list GETs on `/create?job=` and consider an idempotent `openDrawer` as a follow-up.
- **runtime events:** none

**Attempt 2** (rework: the FAIL report was relayed verbatim, with the attempt history)
- **Files changed:**
  - `bilateral-manual-create-drawer-host.component.spec.ts`: new host test and an `ActivatedRoute` stub.
  - `bilateral-ai-upload.component.spec.ts`: resubmit after a 202.
  - `my-draft-results/CLAUDE.md` and `bilateral-result-creator/CLAUDE.md`: updated and re-stamped.
- **Mutations:**
  - Removing the host `<app-bilateral-ai-upload />` turns the host test red.
  - Removing `isUploading.set(false)` on success turns the resubmit test red (`canSubmit` expected true, got false).
- **Green:** 515 tests (12 suites). Build and lint are clean.
- **Evidence re-run (Leader-inline):** `npx jest src/app/pages/bilateral` gave 2092 passed. `ng build` had 0 errors. **VERIFIED**.
- **Reviewer: PASS.** All 3 issues are fixed and were verified in the files. The attempt-1 conformance findings stand.
- **ADVISORY (final):**
  - The double `openDrawer` on `/create?job=` is carried forward (the pointer to T-10/T-11 is already recorded).
  - "Choose another project" in the drawer host only hides the card.
  - The creator-spec mock has no `jobs` signal.
  - `my-draft-results/CLAUDE.md` is 121 lines, one over the 120-line cap.
  - The `hover:bg-white` fg/bg pair on the secondary button.
- **runtime events:** none

- **Final status:** PASS on attempt 2 · **Date:** 2026-09-29
- **Requirements covered:** `AIQ-R-7` A, B (form resets, confirmation, toast, wizard unlocked, no panel), C · `AIQ-R-8` D (routing half) · `AIQ-R-9` D (drafts target).
- **Decisions made:**
  - "Choose another project" resets project, SP and way in the creator. It has no listener in the drawer host.
  - The copy file was created for T-8 to extend.
- **Final verification:** 2092/2092 green, build and lint clean, 4 mutations red.
- **Budget:** 12 rounds / 7 tasks (past the tripwire, continuing per the user's decision).

### `AIQ-T-8` — "AI processes" drawer, job card, copy file

- **Status:** in progress (`[~]`) · **Date:** 2026-09-29
- **Skills:** `angular-developer`, `tailwind-design-system`, `onecgiar-pr-client:spartan` (the client-scoped variant of the listed `spartan`), `frontend-design` · **Effort:** high → xhigh on retry
- **Review mode:** parallel lenses: spec+visual, and a11y (task `Review: lenses`)

**Attempt 1**
- **P-18: CONFIRMED** via Cypress CT (`ai-processes-drawer.cy.ts`, real Chromium/Electron). Cypress was downloaded with `npx cypress install`.
  - At 1280×800: right-anchored, full height, 440 px.
  - At 375×800: full-screen.
  - The CDK trap holds initial focus, `Esc` closes, and focus returns to the trigger.
  - No DD-7 fallback was needed.
  - Limits found:
    - `HlmDialogService`'s `NgComponentOutlet` cannot bind `@Input`s.
    - A `TemplateRef` passed as the first argument throws.
    - The host needs `display:contents`, otherwise its height collapses to about 511 px.
- **Files changed:**
  - New `ai-processes-drawer/*` (component, html, spec, cy, `CLAUDE.md`) and `ai-job-card/*` (component, html, spec, `CLAUDE.md`).
  - Extended `bilateral-ai-processes.copy.ts`.
  - `bilateral-ai-job.model.ts`: `waitReasonCopy(reason, projectName?)`.
- **Falsifiers:**
  1. An ETA string turns the no-ETA assertion red.
  2. Dropping the provenance notice turns the completed case red.
- **Green:** 24 new tests. Token grep clean. Build and lint clean. R-22 (MAY) not done.
- **Red-before was not reported.**
- **Evidence re-run (Leader-inline):** `npx jest src/app/pages/bilateral` gave 2116 passed. `ng build` had 0 errors. **VERIFIED**.
- **Reviewer, spec+visual lens: FAIL**, 8 issues (verbatim in `scratchpad/t8-rework.md`, relayed to the Implementer):
  1. No DD-7 shell or wrapper, so nothing opens the drawer and the elapsed tick has no owner (§6.2, DD-7, DD-9, R-9 B).
  2. A self-owned `onTabKey` trap sits on top of CDK's (DD-7).
  3. No indeterminate indicator on running cards, and elapsed time is measured from `queueEntryDate` (R-9 B, §6.3).
  4. Motion is inert, and the skeleton `animate-pulse` has no `motion-reduce` (R-9 H, §6.3).
  5. Parity gaps: "Checking every 30 seconds", the error action label, the retry explanation and last error, and the Center acronym (R-9 D, §12A).
  6. The highlight looks the same as a running card and has no test (R-8 D).
  7. Strings sit outside the copy file, and `waitReasonCopy` is not called (T-8, client CLAUDE.md §10).
  8. Visual gaps against the mockup: lane bars, finish time, gradient.
- **Reviewer, a11y lens: FAIL**, 6 issues:
  1. The self-owned trap ships to production and shrinks CDK's. The default Hlm close button cannot be reached with Tab, the scrim does not close, and the Tab wrap is never tested in a browser (DD-7, R-12 C).
  2. The dialog has no accessible name: Brain's `aria-labelledby` points at a missing id, and a second nested `role=dialog` exists (R-12 A).
  3. The skeleton `animate-pulse` has no `motion-reduce`.
  4. The highlight is color-only (R-8 D, WCAG 1.4.1).
  5. `--pr-text-subtle` (≈3.0:1) is used on readable text (design §10 AA).
  6. Hardcoded strings.
- **Leader adjudication:** all issues are in scope; overlapping items become one fix each.
  - **Spec gap resolved (execute-time decision, requirement meaning unchanged):** no task named the component that opens the dialog when `drawerOpen` is set from `?job=`, a toast **View** or **Open AI processes**. **T-8 owns the whole DD-7 shell**:
    - a no-input wrapper bound to `BilateralAiService`, with a 1 s tick while open and wired outputs;
    - a launcher that opens `HlmDialogService` on `drawerOpen()` (an effect is allowed, since opening does not poll), with `showCloseButton: false`, `closeOnOutsidePointerEvents: true` and a resolved `aria-labelledby`, and that syncs `drawerOpen(false)` on close.
  - **T-10 mounts the launcher app-wide**; T-9's trigger calls `openDrawer()`. **Forward pointer → `AIQ-T-10`:** mount the T-8 launcher next to the watcher.
- **runtime events:** none

**Attempt 2** (rework: combined verbatim FAILs plus adjudication in `scratchpad/t8-rework.md`)
- **Files changed:**
  - New `ai-processes-drawer-host.component.ts` (no-input wrapper) and `ai-processes-drawer-launcher.service.ts` (`providedIn: 'root'`; opens on `drawerOpen()` via an effect with `AI_PROCESSES_DRAWER_DIALOG_OPTIONS`; guarded against double opens; syncs `closed$` → `drawerOpen(false)`).
  - The drawer and card were changed for all 14 issues.
  - `src/styles/transitions.scss`: `@keyframes pr-ai-indeterminate`.
  - `bilateral-ai.service.ts`: additive `hasPolledOnce` and `lastPollFailed` signals for R-9 G.
- **Mutations:**
  - Removing the highlight cue turns its test red.
  - Removing the launcher close-sync turns 2 tests red.
  - The original falsifiers still go red.
- **Green:** 318 scoped Jest tests. CT 6/6: geometry ×2, a single close control, accessible name "AI processes", Tab and Shift+Tab wrap with Esc and focus restore, and scrim close.
- **Evidence re-run (Leader-inline):** `npx jest src/app/pages/bilateral` gave 2133 passed. `ng build` had 0 errors. **VERIFIED**.
- **Reviewer (a11y): PASS.** All 6 issues are fixed. There is a single CDK trap, and the name resolves. Motion-reduce covers the keyframes, the pulse and `starting:`. The highlight has a ring, sr-only text and `aria-current`. The contrast token is muted. The launcher does not re-open on Esc or scrim.
  - **ADVISORY:** a launcher race on a re-open during the close delay after the drawer's own close button; the fix is a ref-match guard. The CT mounts the probe host, not the real host. `[disabled]` in the failed branch is inert. Forced-colors focus is a repo-wide issue.
- **Reviewer (spec+visual): FAIL.** 6 of the 8 issues are fixed and L1-1 is partly fixed. The out-of-list files (the service signals and the keyframes) were accepted. Two issues remain:
  1. The wrapper never binds `expectations`, so the expected range never shows (R-9 B; adjudication (a)).
  2. **Upload different files** navigates with `{project}` only, and the creator reads neither `?project=` nor `?way=` (R-9 D "opens the creator's AI way for that project"; §12A DD-8). The Reviewer ruled this owed by T-8 and needing a scope extension.
  - **ADVISORY:** no service-spec case covers `hasPolledOnce`/`lastPollFailed`. CT is non-author in T-11 only. The empty-state CTA and title tile have no gradient.
- **Leader adjudication:**
  - Both issues are in scope.
  - **Scope extension approved** (execute-time, requirement meaning unchanged): T-8 may edit the `bilateral-result-creator/*` ts, spec and `CLAUDE.md` so the creator reads `?project=` and `?way=`. The creator was already touched in T-7.
  - The a11y launcher race is added as `[advisory-grade]`, since it is a bug in T-8's own new code.
- **runtime events:** none

**Attempt 3** (final; FAIL relayed verbatim; Leader-approved scope extension into the creator; `[advisory-grade]` launcher race)
- **Files changed:**
  - `ai-processes-drawer-host.component.ts` (+spec): `expectations('documents'|'audio')` with `shareReplay(1)`, bound to the drawer; navigation now passes `{project, way:'ai'|'manual'}`.
  - `ai-processes-drawer-launcher.service.ts` (+spec): ref-match guard on `closed$`.
  - `bilateral-query-params.ts`: `parseAiQueueProjectIdParam` / `parseAiQueueWayParam`.
  - `bilateral-result-creator.component.ts` (+spec, `CLAUDE.md`): `selectProjectFromAiQueueDeepLink` in the `?job=` branch; `job` wins when both are present.
- **Mutations:**
  - Removing `[expectations]` turns the range test red.
  - Removing the `?way=` handling turns the end-state tests red.
  - Removing the ref guard turns the two-cycle test red.
- **Green:** 2141 Jest tests (61 suites); CT 6/6 as reported by the Implementer; build and lint clean.
- **Evidence re-run (Leader-inline):** `npx jest src/app/pages/bilateral` gave 2141 passed; `ng build` had 0 errors. **VERIFIED**.
- **Reviewer (spec+visual): FAIL.**
  - Fixed: expectations, the navigation parameters, the launcher guard. The manual side effect (opening the manual-create drawer) is accepted.
  - **Remaining issue:** on a cold creator load, `?project=&way=` is silently dropped.
    - Why: `creationService.projects()` starts as `[]` (`bilateral-creation.service.ts:31`). Only the child `bilateral-project-selector` fills it, asynchronously, from its constructor effect (`bilateral-project-selector.component.ts:46-57`). The parent's `ngOnInit` runs first (`creator.ts:702-703`), so it finds no projects.
    - The end-state tests seed `projects()` before `ngOnInit`, so they cover only the warm case.
    - **Violated rules:** `AIQ-R-9` D ("opens the creator's AI way for that project"), §12A DD-8, and `AIQ-R-8` C (reloading and opening a second tab are normal paths).
    - **Remediation:** keep the parsed `{projectId, way}` as a pending one-shot value and apply it from an effect on `projects()`/`isLoadingProjects()` once the id is present. The effect must not call `openDrawer`. Add a test where `projects` is empty at init and filled later.
  - **ADVISORY:** compare ids with `Number(p.id)`; the `expectations` subscribe has no error handler; CT is still reported only by the Implementer.
- **runtime events:** none

## HALT: AIQ-T-8

- **Date:** 2026-09-29. **Trigger:** third Reviewer FAIL (3-attempt ceiling).
- **Reviewer FAIL reports:**
  - Attempt 1: spec+visual 8 issues and a11y 6 issues. Verbatim in `scratchpad/t8-rework.md`, summarized above.
  - Attempt 2: spec+visual 2 issues (expectations not bound; deep link not wired). a11y PASS.
  - Attempt 3: spec+visual 1 issue (the deep link is dropped on a cold creator load).
- **Implementer summaries:** see the attempt entries above.
  1. Built the drawer and card without a shell, with a self-owned trap.
  2. Built the shell (host and launcher) and fixed 13 of the 14 issues.
  3. Bound expectations, added the creator deep link and the race guard.
- **Final-attempt verification:** 2141/2141 Jest, build and lint clean, CT 6/6 (Implementer-reported).
- **Leader root-cause hypothesis:**
  - **Spec gap in the task boundary, not an implementation failure.**
    - T-8's Files and Description never included the create wizard.
    - R-9 D's "opens the creator's AI way for that project" depends on the creator restoring a project from the URL, and no task owned that. The project list is loaded lazily by a child component.
    - Each attempt converged; the findings went from 14 to 2 to 1, and the last one is narrow and well specified.
  - The tripwire budget was already passed with the user's approval.
- **Tree state and rollback:**
  - T-1..T-7 are committed. The working tree holds only T-8's uncommitted changes, plus `execution.md`, `tasks.md` and the pre-existing `package-lock.json`. That is the "clean — only the halted task's changes" branch of the table.
  - **The blanket restore was NOT run.** The Leader held it for the user's decision: running it would discard about 2000 reviewed lines that satisfy 13 of the 14 findings, and deleting reviewed work is an irreversible action that needs the user's confirmation.
  - No unattributed paths were found.
- **Question to the user:** authorize a 4th attempt (the pending one-shot deep link, a small fix), or accept R-9 D's cold-load case as a follow-up with the clause marked unmet, or roll back T-8.

**HALT decision (2026-09-29):** the user replied "Adelante con el intento 4". A 4th attempt was **explicitly authorized** past the 3-attempt ceiling. No rollback. Scope: only the cold-load deep link, plus an `[advisory-grade]` fix for `Number(p.id)`.

**Attempt 4** (user-authorized after the HALT)
- **Files changed:** `bilateral-result-creator.component.ts` (+spec, `CLAUDE.md` line).
- **Fix:**
  - `ngOnInit` now only parses `?project=&way=` into a one-shot `pendingAiQueueDeepLink` signal.
  - A constructor effect reads `pending`, `projects()` and `isLoadingProjects()` unconditionally. On a `Number(p.id)` match it applies `selectProject` → `onProjectSelected` → `onReportingWaySelected`.
  - If there is no match, it clears the pending value only after loading is seen to start and then finish.
  - The effect never calls `openDrawer`, and `?job=` still wins.
  - Four missing mock properties were added to the spec's `manualCreateFlow` mock.
- **Mutation:** reverting to the sync-only apply turns the cold test red (`Expected: 501, Received: undefined`).
- **Green:** creator 132; `pages/bilateral` 2142. Build and lint clean.
- **Evidence re-run (Leader-inline):** `npx jest src/app/pages/bilateral` → 2142 passed. `ng build` → 0 errors. **VERIFIED**.
- **Reviewer (spec+visual): PASS.**
  - A cold load now waits for the project list, so reload, second tab and cross-Center all work.
  - Apply order is correct: `onProjectSelected` resets the way, so the way is set after it.
  - The effect cannot loop.
  - The project selector is mounted on the `?project=` path (`creator.html:12-14`), so `getProjects` runs.
- **ADVISORY:**
  - The no-match give-up depends on observing `isLoadingProjects()` go true. If a load is batched, the pending value could stay stale. Fix: clear on the first non-empty list with no match.
  - T-11 end-to-end should include one reload → **Upload different files** case.
- **runtime events:** none

- **Final status:** PASS on attempt 4. The attempt past the ceiling was authorized by the user after the HALT. · **Date:** 2026-09-29
- **Requirements covered:**
  - `AIQ-R-9` A–G and H (announce; class half)
  - `AIQ-R-12` A, B (sizes, via the P-18 CT), C
  - `AIQ-R-8` D (highlight rendering)
  - `AIQ-R-6` C (client: no ETA)
  - `AIQ-R-22` (MAY): **not done**
- **Decisions made:**
  - P-18 CONFIRMED, so `HlmDialogService` is used and the DD-7 fallback was not needed.
  - T-8 owns the DD-7 shell (host + launcher).
  - Scope extended into the creator for R-9 D.
  - `bilateral-ai.service.ts` gained additive `hasPolledOnce` / `lastPollFailed` (R-9 G).
  - `transitions.scss` gained the `pr-ai-indeterminate` keyframes.
- **Forward pointers:**
  - → `AIQ-T-10`: inject `AiProcessesDrawerLauncherService` once, app-wide, next to the watcher. This is what makes `?job=`, toast **View** and **Open AI processes** open the dialog.
  - → `AIQ-T-9`: the trigger calls `openDrawer()`; nothing else is needed.
  - → `AIQ-T-11`:
    - CT mounts only the probe host; mount the real launcher once.
    - Run CT as a non-author.
    - Add a reload → **Upload different files** e2e case.
    - Check the base vs conditional border CSS order.
    - Record the brand-button-per-card deviation.
- **Final verification:** 2142/2142 Jest; build and lint clean; CT 6/6 (Implementer-run).
- **Budget:** 16 rounds / 8 tasks.

**Wave 2 (parallel):** `AIQ-T-9` and `AIQ-T-10` ran at the same time on disjoint files. Neither ran `ng build`; the Leader ran it after both reported.

### `AIQ-T-10` — Retire the panel and the completion dialog; mount the watcher

- **Final status:** PASS · **Date:** 2026-09-29 · **Attempts:** 1
- **Skills:** `angular-developer` (listed) · **Effort:** medium
- **Forward pointer carried:** mount `AiProcessesDrawerLauncherService` app-wide next to the watcher (from T-8).

**Attempt 1**
- **Files changed:**
  - `app.component.html`: `<app-bilateral-ai-completion-dialog />` → `<app-bilateral-ai-job-watcher />`.
  - `app.module.ts`: import and declaration swapped.
  - New `bilateral-ai-job-watcher/*` (component, spec, `CLAUDE.md`). Headless; it injects `BilateralAiService` and `AiProcessesDrawerLauncherService`.
  - Deleted with `git rm` `bilateral-ai-completion-dialog/` and `ai-processing-panel/` (incl. its `CLAUDE.md`).
  - Surface list in `ai-provenance-notice.component.ts` updated.
  - Stale comments updated in `bilateral-ai-job.model.ts` and `bilateral-ai.service.ts`.
  - One line in `bilateral-ai-upload/CLAUDE.md` (courtesy fix, outside the Files list).
- **Falsifiers:**
  1. Dialog re-added → `grep -rn app-bilateral-ai-completion-dialog src/` finds 1 hit.
  2. Unconditional poll → "no hint → zero requests" red.
- **Disqualifier:** real `BilateralAiService` with `HttpClientTesting`; only `HlmDialogService` is mocked.
- **Consumers grep:** 5 hits, all docs or absence assertions.
- **Green:** watcher 4/4, app.component 4/4, services 211, others 99 and 30. Lint clean.
- **Evidence re-run (Leader-inline, combined with T-9):**
  - `npx jest src/app` (whole client): **622 suites / 12206 passed**.
  - `ng build --configuration development`: 0 errors.
  - `ng lint --quiet`: clean.
  - Result: **VERIFIED**.
- **Reviewer: PASS.**
  - The deletions are complete.
  - The watcher sits outside both `@if` branches and both `router-outlet`s (`app.component.html:67`), so it is created once per app.
  - The hint-key semantics match T-5.
  - A launcher test sets `drawerOpen` and asserts `HlmDialogService.open` was called once. It is a true behavioural proof: it goes red if the injection is removed.
  - The provenance surfaces still number 5.
  - No ETA residue remains.
- **ADVISORY:**
  - The launcher docstring (`ai-processes-drawer-launcher.service.ts:30-35`) and the "For AIQ-T-9 / AIQ-T-10" section of `ai-processes-drawer/CLAUDE.md` still describe the mounting as future work.
  - `BilateralAiCompletionNotice` in `bilateral-ai.interfaces.ts:66-77` is now dead.
  - The watcher is also live on `/login` (pre-existing behaviour).
  - Sonar S1068 may flag the never-read injected fields.
- **runtime events:** none
- **Requirements covered:** `AIQ-R-11` A (BUT: no blocking dialog; AND: any route, app-level half) · DD-6 · DD-8.
- **Final verification:** the whole client is green (12206), build and lint are clean, and both falsifiers go red.

### `AIQ-T-9` — Header trigger replaces the chip in all three slots

- **Final status:** PASS · **Date:** 2026-09-29 · **Attempts:** 1
- **Skills:** `angular-developer`, `tailwind-design-system` (listed) · **Effort:** high

**Attempt 1**
- **Files changed:**
  - New: `ai-processes-trigger/*` (component, html, spec, `CLAUDE.md`).
  - `bilateral-page-header/*` (ts, html, spec, cy): the chip, `aliveJobForThisCenter`, `aiJobChip` and the 1 s tick are gone. The trigger is placed in the identity row (below 640 px), the nav end (640 px and up), and the `pageTitle` branch.
  - `bilateral-ai-processes.copy.ts`: a `trigger` block.
  - `bilateral-result-creator.component.spec.ts`: the mock gains `jobs`, `unseenFinishedIds` and `drawerOpen`.
- **Unseen:** `openDrawer()` already clears `unseenFinishedIds` (`bilateral-ai.service.ts:150-152`), so no service edit was needed.
- **Falsifiers:**
  1. Adding a Center gate turns "other Center" red (Received null).
  2. Removing the `pageTitle` mount turns the wizard case red.
- **Other checks:** `getTimerCount` is unchanged after mount. The chip grep returns 0. Tests: 87 in the target folders, 482 in the host pages. Lint is clean.
- **Evidence re-run (Leader-inline, combined with T-10):** whole-client jest gives 622 suites / 12206 passed. `ng build` has 0 errors, lint is clean, and the chip grep returns 0. **VERIFIED**.
- **Reviewer: PASS.**
  - No Center gate: counts come from `jobs()` by status.
  - All three slots render, and the idle, working and done states work. The accessible name starts with the visible label. `aria-expanded` follows `drawerOpen()`.
  - The KZ L2 base classes are present. Only one trigger shows at any given width. The spinner has `motion-reduce`.
  - Tokens are correct, and the chip grep returns 0.
- **ADVISORY:**
  - **Risk:** at 375 px, the wizard's top-right group (trigger plus Back button, about 290 px) likely overlaps the title, because only `pr-[140px]` is reserved there. **T-11 must measure it.**
  - The `[class.bg-…]` expanded style competes with the base utility through CSS order, so the expanded look is not guaranteed. Prefer `aria-expanded:` variants.
  - The CT file has not been run since the rewrite (T-11).
  - Latent: a host with neither `activeTab` nor `pageTitle` would render two triggers.
  - The "same instance" wording in the component doc comment is inaccurate. The gap is 6 px where the mockup has 8 px.
  - The done-state aria text "N finished" is an addition beyond R-10 C.
  - The `variant="detail"` header has no trigger, per DD-9's three slots. This is in tension with R-10 A's "every bilateral page".
- **runtime events:** none
- **Requirements covered:** `AIQ-R-10` A (BUT no Center dependency; AND create wizard), B, C.
- **Forward pointers → `AIQ-T-11`:**
  - Measure the wizard header overlap at 375 and 900 px.
  - Run `bilateral-page-header.cy.ts`.
  - Assert the expanded style.
- **Budget:** 18 review rounds across 10 tasks.

---

## Summary (T-1..T-10 complete; T-11 pending)

- All implementation tasks are `[x]`. Commits on `JuanGuzman-io/p2-3853-jira-understanding`, none pushed:
  - Server: `e1e8bf815` (T-1), `3b28d3ea2` (T-2), `9b9b1720c` (T-3), `fe541801c` (T-4).
  - Client: `4eaf5b0b6` (T-6), `c534e7028` (T-5), `0771414d6` (T-7), `3d62eb87b` (T-8), `5a85d6bc5` (T-10), plus the T-9 commit.
  - Merge of `performance-refactor`: `4f740ffc2`.
- **T-11 is pending.** It needs P-24 answered, PR 1 and PR 2 merged and deployed to prtest, the forwardRef server-boot smoke, the CT suite, the T6 visual review, the HITL, and product-owner sign-off.
- **Review rounds:** 18 across 10 tasks, against a budget of 11. The tripwire was crossed and the user chose to continue. There was one HALT (T-8), resolved by a user-authorized attempt 4.

## Post-execution fix: drawer-on-drawer (user report during local testing, 2026-09-29)

- **Report:** in the manual-create drawer (Center home → Create result → AI way), clicking **Open AI processes** after a 202 opened the AI processes dialog on top of the create drawer. Closing the dialog then returned to a reset form.
- **User decision:** opening the AI processes drawer from inside the create drawer closes the create drawer. The wizard page is unchanged.
- **Fix:**
  - New `@Output() openedAiProcesses` on `bilateral-ai-upload`, emitted from `onOpenAiProcesses()`, which still calls `openDrawer()` exactly once. The toast's **View** action now goes through the same handler.
  - `bilateral-manual-create-drawer-host.component.html:99` binds `(openedAiProcesses)="flow.closeDrawer()"` (`bilateral-manual-create-flow.service.ts:144-145`).
  - `bilateral-result-creator` does not bind the output, so the wizard behaves as before.
- **Tests:** upload spec (emits once, calls `openDrawer` once) and drawer-host spec (the emit closes `flow.drawerOpen()`).
  - **Mutation check:** without the binding, the host test fails (`Expected: false, Received: true`).
- **Verification:**
  - Implementer: `pages/bilateral` 2141 passed, build and lint clean.
  - Leader re-run: `npx jest src/app/pages/bilateral` 2141 passed. **VERIFIED**.
- **Review:** no independent Reviewer. This is a small user-directed fix outside the approved `tasks.md`, verified by the Leader re-run and the mutation. It must be covered by the PR 2 review.
- **Open from the same session:**
  - The per-user cap looked breached in the user's screenshot (P-1502 and P-1440 both Running). The source is unconfirmed: another user or server, or the old deployed consumer sharing `dev_bilateral_ai_processing`.
  - The local-server timezone shows times 5 h ahead (mysql2 running in America/Bogota).
  - At 375 px the wizard trigger overlaps the title.

## Post-execution fix: "Choose another project" in the create drawer (user report, 2026-09-29)

- **Report:** in the manual-create drawer, **Choose another project** only hid the confirmation card, and there was no way to pick another project.
- **User decision:** close the drawer so the user returns to the catalog. The drawer's project is fixed by the card that opened it.
- **Fix:** added `(chooseAnotherProject)="flow.closeDrawer()"` on the hosted upload. This is the same path the drawer's X button takes via `onDrawerClosed()`.
  - `closeDrawer()` resets only `drawerOpen` and `selectedReportingWay`.
  - The next open goes through `beginFromProject()`, so no stale project carries over.
- **Test:** the drawer-host spec checks that emitting closes `flow.drawerOpen()`. Mutation: without the binding, `Expected: false, Received: true`.
- **Verification:**
  - Implementer: 41 passed, lint clean.
  - Leader re-run: 41 passed. **VERIFIED**.
- **Review:** no independent Reviewer (a user-directed one-line fix). It is covered by the PR 2 review.

## Post-execution design tweaks from local testing (user decisions, 2026-09-29)

- `cff899dcf`: removed the running-card accent rail ("too AI"). Running cards now use the neutral `--pr-border`. The card spec asserts that no rail is rendered. 46 tests passed (Leader re-run).
- Toast width changed from 320 px to 400 px (`pr-toast.component.scss:11`), and `max-width: calc(100vw - 40px)` is kept. This applies to **every** toast in the app because the host is shared. pr-toast has 7 tests passing, and no spec asserted a width of 320.
- Neither tweak went through an independent Reviewer. Both are user-directed style changes and are covered by the PR 2 review.
- **Drawer width changed from 440 px to 520 px at ≥ 640 px (user decision; deviation from `AIQ-R-12` B / design §6.5, which specify 440 px).**
  - Where: `AI_PROCESSES_DRAWER_SHEET_CLASS` (`ai-processes-drawer.component.ts:181`). The CT geometry test now asserts 520, and `ai-processes-drawer/CLAUDE.md` records the deviation.
  - Verification: Jest 28 passed, lint clean.
  - CT: 5/6 on the first run, then 6/6 on an immediate rerun. The failure was a 375 px full-screen assertion off by about 9 px, and it happened once. **Forward pointer → `AIQ-T-11`:** treat that 375 px sheet assertion as flaky and investigate before trusting CT as a gate.
  - **Spec text still says 440 px.** Amend `requirements.md` `AIQ-R-12` B and design §6.5 at `/akili-archive`.
- **Drawer header** (`e4c755a00`): single header block, icon tile removed, subtitle at full width, lanes strip inside the header.
- **Drawer actions close the drawer** (`7a58fcae3`): View drafts, Upload different files, Report manually and Start with evidence now set `drawerOpen(false)` before navigating.
- **Drafts `?job=` deep link** (`50aa877c5`). Before this fix, the highlight never scrolled into view live. Four root causes, all fixed:
  1. `ngOnInit` read the `snapshot` once, and route reuse kept the component alive, so the query param was never read again. It now subscribes to `queryParamMap`.
  2. `queueMicrotask` ran before render. It is replaced by `afterNextRender`.
  3. The scroll container detection picked `div.mdr`, which is `overflow-y: auto` but never overflows. It now prefers the ancestor that actually overflows (`#workArea`).
  4. `scrollIntoView` scrolled the `overflow: hidden` page host and hid the Center header. Only the real scroller is scrolled now.
  - Plus: a second instant pass after 600 ms. The highlight now **persists while `?job=` is in the URL** (user decision; the old version cleared after 4 s).
  - Verified live in Chrome after a hard reload: the card is in view (top 573 within 306–994), the ring stays on after 6 s, and the host scrollTop is 0.
- **Trigger below 640 px shows only the icon and badge** (`7fa0c5a8e`, Leader-inline at the user's request). At 375 px the wizard title now ends at x 219 with an ellipsis, and the trigger starts at x 223. `aria-label` is unchanged.
- **Findings from local testing, not fixed:**
  - The local server runs in America/Bogota, so mysql2 reads UTC `DATETIME` values 5 h ahead. The drawer shows `00:00` elapsed and wrong finish times. Expected to be correct on prtest (UTC); check there.
  - Two `PROCESSING` jobs for the same user (Admin PRMS: P-1639 and P-1560) were seen at the same time while a third waited with `own_job_running`. Unconfirmed whether the old deployed consumer on the shared `dev_bilateral_ai_processing` queue took one of them. **Check in T-11**, where only new-code consumers run.
  - Mojibake in CLARISA project names (`Identificaciï¿½n`, `â€œSTDF`). This is a data issue and predates this work.
  - `bilateral-overview.component.ts:628` has the same `scrollIntoView`-on-`pr-viewport-page` pattern. Out of scope.
- **Final verification before merge (Leader):**
  - Server: `jest --testPathPattern="bilateral-ai|main.spec|bilateral-center|jwt.middleware"` gives 460 passed. `tsc` and eslint are clean.
  - Client: `jest src/app/pages/bilateral src/app/shared/components/pr-toast src/app/app.component` gives 2160 passed. `ng build --configuration development` has 0 errors, and `ng lint` is clean.
- **Env:** no new required variables. There are two new optional server variables: `BILATERAL_AI_MAX_CONCURRENT` (default 2) and `BILATERAL_AI_MAX_PER_USER` (default 1). The client needs no new `environment.ts` keys.
