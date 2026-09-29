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
