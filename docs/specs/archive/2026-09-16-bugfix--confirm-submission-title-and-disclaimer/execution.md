# Module Spec — `execution.md`

## 1. Document Control

- **Spec path:** `docs/specs/bugfix/confirm-submission-title-and-disclaimer/`
- **Approval Mode:** not recorded in `tasks.md`/`design.md` Document Control — treated as `gated` (default): every exception (HALT/blocker) surfaces to the user.
- **Executor:** `/akili-execute` Leader (this session)

## 2. Task Execution History

### `SUB-T-1` — Refresh shared title state after AI Review save + fix disclaimer copy

**Status: `[~]` blocked — awaiting human decision, not a code HALT.**

#### Attempt 1

- **Implementer changes:**
  - `onecgiar-pr-client/src/app/shared/services/api/ai-review.service.ts`: injected `CurrentResultService` (`currentResultSE`); added unconditional `this.currentResultSE.GET_resultById();` call inside `notifySectionChanged()`, alongside (not replacing) the existing gated `generalInformationSaved` bump.
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/components/submission-modal/submission-modal.component.html`: replaced disclaimer sentence with "Please note that further changes to this result can only be made during the QA process."
- **Implementer verification:** `npx ng lint --quiet` → all files pass linting. No test suite run.
- **Reviewer verdict: `FAIL`**
  1. Discovered Issue: unconditional `GET_resultById()` almost certainly breaks two existing DAC-score tests in `ai-review.service.spec.ts` (unmatched `httpMock` request tripping `verify()`); never run. Violated `tasks.md` §5 `SUB-TEST-3` / `requirements.md` §6 defect table (regression re-run gate).
  2. Discovered Issue: manual browser check from `tasks.md` `SUB-T-1` DoD bullet 5 (title renders + no jarring flash) not performed. Violated `tasks.md` §3 DoD bullet 5 / `requirements.md` §6 Scenario `BUT` clause.
  - Production code itself judged spec-conformant on both files (disclaimer string exact match; `GET_resultById()` correctly unconditional/ungated).

#### Attempt 2

- **Implementer changes:** production files unchanged from attempt 1. Added test-only fix to `onecgiar-pr-client/src/app/shared/services/api/ai-review.service.spec.ts`: in the `PATCH_saveDacScore notifies the open section` describe's `beforeEach`, stubbed `jest.spyOn(service.currentResultSE, 'GET_resultById').mockImplementation(() => undefined)` and flushed the transitively-triggered `type-by-level/get/all` request via `httpMock.expectOne(...).flush(...)`.
- **Implementer verification:**
  - `npx jest --silent --reporters=summary --no-coverage src/app/shared/services/api/ai-review.service.spec.ts` → 1 suite / 11 tests passed.
  - `npx jest --silent --reporters=summary --no-coverage src/app/pages/results/pages/result-detail/components/ai-review/ai-review.component.spec.ts` → 1 suite / 20 tests passed.
  - `npx jest --silent --reporters=summary --no-coverage src/app/pages/results/pages/result-detail/components/submission-modal/submission-modal.component.spec.ts` → 1 suite / 3 tests passed.
  - `npx ng lint --quiet` → all files pass linting.
  - Manual browser check: **not performed** — probed first (no live `claude-in-chrome` extension connection; no auth token/session supplied; declined to repurpose the repo's Cypress `cypress.env.js` credential as out-of-scope reuse). Substituted a code-level trace: `CurrentResultService.GET_resultById()` (`current-result.service.ts:33-47`) blanks only `currentResultSignal`/`resultLevelSE.currentResultTypeId`, never the plain `currentResult` field the modal (`submission-modal.component.html:13`) and identity strip read — so no new flash on those surfaces. The left sidebar (`result-sections.service.ts`, reads `currentResultSignal()`) does briefly reflow, but via the same pre-existing blanking mechanism, now reachable from a new trigger (DAC-score-only saves on non-general-information sections).
- **Reviewer verdict: `FAIL`**
  1. Jest fix (gap #1): **judged legitimate**, not a silencing — scoped to the one describe, uses `jest.spyOn` (observable, not erased), and `tasks.md` §5 `SUB-TEST-3` pre-authorizes exactly this ("mock added there" if the injected service needs one). No test in this file was ever asserting `GET_resultById()` behavior — that proof is assigned to `SUB-T-2` (Cypress), not this suite.
  2. Discovered Issue: `tasks.md` `SUB-T-1` DoD bullet 5 has two clauses — flash (substantially satisfied by the code trace, verified independently by the Reviewer against `current-result.service.ts`) and **title-renders** (not covered by anything — the unit suite now stubs the reload and `SUB-T-2` hasn't run). Violated `tasks.md` `SUB-T-1` DoD bullet 5 / `requirements.md` §6 Scenario THEN clause.
     - **Reviewer's explicit remediation guidance: do not re-spawn the Implementer** — this gap needs a human-supplied session token + confirmed dev server, or `SUB-T-2` run with real credentials, or an explicit human decision to defer bullet 5 to `tasks.md` §6 staging QA. Not agent-executable.
  - **ADVISORY (non-blocking):**
    - RELIABILITY: the now-unconditional `GET_resultById()`'s existing error handler navigates to `/` on a 404 (`current-result.service.ts:77-78`); previously only reachable on section load (benign), now also reachable from every AI Review save — a transient 404 could eject a mid-edit user. Not a spec violation (`design.md` §9 reuses the existing handler as designed) — flagged as a follow-up candidate, not a task.
    - READABILITY: the `type-by-level/get/all` `httpMock.expectOne().flush()` sits in the DAC-score describe's `beforeEach` but is actually triggered by the outer `TestBed.inject(AiReviewService)` shared by all describes in the file — cosmetic, well-commented, not gating.

## 3. Blocker — resolved via user-executed manual check

`SUB-T-1` could not close DoD bullet 5 ("confirm the new title renders") from within the agent environment: the `claude-in-chrome` browser extension was not connected (confirmed both by the attempt-2 Implementer and independently by the Leader after starting a fresh dev server on port 4500 and obtaining a session token + user from the human owner). Per the Reviewer's guidance, this is not agent-executable — option **(a)** (human runs the check) was selected by santiago.sanchez@cgiar.org.

**Manual check performed by the human owner, 2026-09-11, on `http://localhost:4200` (their own already-running dev server — not the Leader-started :4500 instance):**

- Result: `#9139` (Innovation Use), original manually-entered title "this is a test of innovation use 3420 AJ 09102026".
- Ran AI Review; accepted the AI-suggested title "Innovation use testing conducted by AfricaRice and CIAT Alliance under Breeding for Tomorrow initiative".
- Without reloading the page, clicked Submit to open the Confirm Submission dialog.
- **Observed (screenshot confirmed):** dialog title reads the AI-suggested title (not the stale manual one) — `SUB-R-1`/`SUB-R-2`/`SUB-AC-1` satisfied. Disclaimer reads exactly "Please note that further changes to this result can only be made during the QA process." — `SUB-R-3`/`SUB-AC-2` satisfied. No jarring flash reported.
- This also incidentally confirms the `:4200` bundle was current (not stale per the client `CLAUDE.md` §9 trap #2) — a stale bundle would have reproduced the original bug (old title, old disclaimer), and it did not.

**DoD bullet 5: closed.** No automatic rollback was needed at any point — both FAILs were substantive (real gaps, both closed: Jest suite fixed in attempt 2, manual check closed here) and the underlying code (both production files) was Reviewer-approved unchanged since attempt 1.

## 4. Final Status: `SUB-T-1` — `PASS`

- Attempts: 2 agent rework rounds (both Reviewer FAIL, both on verification-evidence gaps, not code defects) + 1 human-executed manual check closing the final gap.
- Files changed: `onecgiar-pr-client/src/app/shared/services/api/ai-review.service.ts`, `onecgiar-pr-client/src/app/pages/results/pages/result-detail/components/submission-modal/submission-modal.component.html`, `onecgiar-pr-client/src/app/shared/services/api/ai-review.service.spec.ts` (test-only).
- Verification: `npx ng lint --quiet` (clean), 3 Jest suites green (34 tests total across `ai-review.service.spec.ts`, `ai-review.component.spec.ts`, `submission-modal.component.spec.ts`), human-executed manual browser check (above).
- ADVISORY (non-blocking, recorded for future follow-up, not a new task): (1) RELIABILITY — unconditional `GET_resultById()`'s 404 handler now reachable from every AI Review save, could eject a mid-edit user on a transient 404; (2) READABILITY — the `type-by-level/get/all` `httpMock.expectOne().flush()` in the spec fix is technically triggered by the outer `beforeEach`, cosmetically placed in the inner one.
- Requirements covered: `SUB-R-1`, `SUB-R-2`, `SUB-R-3`, `SUB-AC-1`, `SUB-AC-2`.

## 5. `SUB-T-2` — Regression test: Confirm Submission shows AI-Review-saved title

**Status: `PASS`** (2 attempts; both Reviewer rounds, no HALT).

**File added:** `onecgiar-pr-client/cypress/e2e/results/confirm-submission-title.cy.ts`.

**Fixture:** result `#11598` (`result_code` `9130`, `version_id`/phase `36`, portfolio P25, "Breeding for Tomorrow"/SP01) — user-supplied after an auto-scan of the Results Center found no row satisfying "In progress + all 5 sections complete + Submit and AI Review both enabled" simultaneously. Confirmed via direct API calls (`GET /api/results/get/11598`, `GET /v2/api/results/results-validation/get/green-checks/11598`, `GET /auth/role-by-user/get/user/575`) that the fixture satisfies every gate. The spec's `before()` re-verifies this live so future drift fails with a clear message rather than mid-test.

### Attempt 1

- **Implementer changes:** authored the spec — opens the result, types+saves a manually-suffixed title, runs AI Review, captures the AI-suggested title, applies + saves the proposal, waits on a freshly-scoped `GET **/api/results/get/*` intercept (the actual regression guard), closes AI Review, opens Confirm Submission, asserts the dialog's `.description` contains the AI-suggested title, does NOT contain the stale manual title, and contains the exact disclaimer string. Cancels out (never actually submits) so the fixture stays reusable.
- **Implementer verification:** GREEN — 3 consecutive runs, all passing (57.6s/46.5s/49.4s), no flakiness; confirmed via `GET /api/results/get/11598` after all 3 runs that `status_id` stayed `"1"` (never actually submitted). RED check: reverted the two `SUB-T-1` production files to their pre-fix versions, ran the same spec — failed with a timeout on the spec's own `cy.wait('@refreshCurrentResultAfterAiSave', ...)` (no GET ever issued pre-fix), not on the title-content assertions further down. Restored both files afterward (`git checkout --`), confirmed clean, final sanity GREEN run.
- **Reviewer verdict: `FAIL`**
  1. Discovered Issue: the RED confirmation is inconclusive — it proves the pre-fix code issues no refresh GET, but never actually executes (and therefore never observed failing) the behavioral assertions that encode the bug (`expect(text).to.contain(aiSuggestedTitle)` / `.not.to.contain(manualTitle)` against `.submission-modal-dialog .description`). A mechanism-absence timeout is not proof the assertion discriminates bug-present from bug-fixed. Violated `tasks.md` `SUB-T-2` RED requirement / `requirements.md` §6 Scenario.
  - Everything else approved on this pass: correct dialog targeted (not the AI Review proposal card — satisfies the disqualifier), not a tautology, Cancel-not-Submit correct and consistent with DoD, 3-run GREEN with no flakiness.
  - **ADVISORY (non-blocking):** (1) RELIABILITY — the LLM-generated proposal is nondeterministic; a future proposal that happens to echo/contain the manual title could false-positive the regression guard; consider asserting against a fresh `GET /api/results/get/<id>` read instead of the proposal card text. (2) RESILIENCE — pinned fixture `11598`/`9130` departs from `cypress/README.md`'s "never hardcode a result id" convention; accepted given the precondition (Submit + AI Review both ungated) isn't expressible with the existing scan helper, and the `before()` live-gate fails loudly on drift. Recommend `Cypress.env('submissionReadyResultCode')` with a documented default + `this.skip()` on drift, as a future hardening, not a blocker. (3) READABILITY/RISK — several CSS-class selectors (`.description`, `.buttons`, `.field-section`, etc.) depart from the repo's `data-testid`-only convention outside `custom-fields/`; out of this task's file boundary to fix (would require editing two templates not named in `tasks.md`), recorded as a follow-up. (4) RISK — the spec leaves the AI-generated title persisted on result 11598 after each run (only the manual-suffix toggle is reversible); low impact on a shared test backend, worth a one-line note in the spec header (not applied, deferred). (5) RELIABILITY (about `SUB-T-1`, not this diff) — the now-unconditional `GET_resultById()` transiently blanks `currentResultSignal`, which per `result-detail/CLAUDE.md` empties `ResultSectionsService.sections()` until the response lands, now reachable from the DAC-score save path too; recorded for the Leader, not gating.

### Attempt 2

- **Implementer changes:** none to the committed spec or production files — attempt 2 only re-executed the RED check correctly. In a scratch (uncommitted) copy of the spec, commented out the single `cy.wait('@refreshCurrentResultAfterAiSave', ...)` line so the pre-fix run would proceed past the missing-GET point and reach the actual behavioral assertions, settling instead on the already-present `cy.wait('@saveAiSession', ...)`.
- **Implementer verification:**
  - RED (modified-wait, pre-fix production code): failed with `AssertionError: Confirm Submission dialog title: expected '...Breeding for Tomorrow initiative (e2e manual)" is about to be submitted. Please note that further changes cannot be made once approved...' to include 'Farming communities cultivate improved rice varieties across one million hectares through AfricaRice breeding advances'` — fired on the title-content `expect()`, showing both bug symptoms at once (stale `(e2e manual)` title AND the old pre-fix disclaimer wording) in the same failure. This is a genuine behavioral discrimination, not a mechanism-absence proxy.
  - Restored: both production files `git checkout --`'d clean; spec file confirmed `IDENTICAL` to its pre-edit (attempt-1, already-approved) content via diff against a backup — no scratch residue leaked into the committed version.
  - Final GREEN re-run (restored, post-fix tree, full committed spec): 1 passing (106.3s).
- **Reviewer verdict: `PASS`**
  - Confirmed the red-run failure text is self-proving independent of line numbers: it could only be produced by a browser rendering pre-fix `submission-modal.component.html` fed by pre-fix `notifySectionChanged()`. Confirmed both production files read as post-fix (disclaimer copy correct; `GET_resultById()` unconditional and outside the route-gated branch) and the committed spec retains the `refreshCurrentResultAfterAiSave` wait unchanged (nothing to re-review there — already approved in attempt 1). The sole attempt-1 FAIL reason is closed.
  - Noted as a non-blocking observation: the red run's stack trace cited line 213 vs. the committed file's line 210 for the same assertion (offset artifact of the scratch edit) — resolved unambiguously by the unique assertion message and self-proving failure content; no action needed.

**Final verification commands (for the record):**
```
npx cypress run --e2e --spec "cypress/e2e/results/confirm-submission-title.cy.ts" --browser electron
```
4 total green runs across both attempts (3 in attempt 1 + 1 final sanity in attempt 2), 1 modified-wait red run in attempt 2 proving the regression guard is real. No flakiness observed.

**Requirements covered:** `SUB-R-1`, `SUB-R-2`, `SUB-R-3`, `SUB-AC-1`, `SUB-AC-2` (regression coverage, per `tasks.md`).

**Not committed yet** — pending user go-ahead.

## 6. Spec-level summary

Both tasks (`SUB-T-1`, `SUB-T-2`) are `PASS`. `SUB-T-1` is committed (`1395244e1`). Remaining before this spec can move to `shipped` (per `tasks.md` §7 Cleanup & follow-ups): commit `SUB-T-2`'s Cypress spec, then manual QA on staging/test env per `tasks.md` §6. `SUB-OQ-1` (IPSR modal's identical disclaimer sentence) remains explicitly out of scope, to be filed as a separate spec if desired.
