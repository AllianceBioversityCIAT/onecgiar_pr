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
