# Execution Log — bilateral/qa-ai-text-suggestions (`BIL-QTS`)

## Document Control

| Field | Value |
|---|---|
| Spec | `docs/specs/bilateral/qa-ai-text-suggestions/` |
| Approval Mode | gated |
| Branch | `JuanGuzman-io/ai-review-inline-edits` (contains `origin/performance-refactor` tip `f70d25801`) |
| Leader | Claude Code, `opus` (T1) · Implementer `akili-implementer` (T2) · Reviewer `akili-reviewer` (T3) |
| Started | 2026-09-29 |

## Task Execution History

### `BIL-QTS-T-1` — Settle P-11 and write the contract addition

- **Final status:** PASS
- **Date:** 2026-09-29
- **Attempts:** 1
- **Requirements covered:** `BIL-QTS-R-7`, `BIL-QTS-R-11`; P-11 settled

**P-11 evidence (owner, prtest, 2026-09-29):**
- `JSON_KEYS` query over every `sections.<key>`: only `verdict, score, comments, strengths, issues, fields` across the five section keys. No `suggestions`, no unknown key.
- 129 rows, 0 null `sections`. By status × shape: `completed` 4 sections (19) · `completed` 5 sections (25) · `skipped_kp_rule` 5 sections (4) · `unavailable` `{}` (81). Every row accounted for.
- Prod not queried: **owner decision 2026-09-29** ("ciérralo así, sigue con el contrato"), bounded by P-13 (no code reader of section keys outside P-8's set) and by DD-2 affecting only future writes.

**Attempt 1**
- Files changed: `docs/bilateral-module/integration-contracts.md` (new subsection "Suggestions (`sections.general_information.suggestions`)", key/type/rule table, R-8 drop-rule table, *For the AI team* block, change-log row 2026-09-29), `design.md` §1A (P-11 row + Count line 14/14 verified).
- Implementer verification: `grep -n "suggestions" docs/bilateral-module/integration-contracts.md` → lines 736–828, limits 30/300 at :762–763, change log :828 states `contract_version` stays `0.2`; `grep -n '"contract_version"'` → single literal `0.2` at :524.
- Evidence re-run (Leader-inline): **VERIFIED** — 9 `suggestions` matches; `"contract_version": "0.2"` at :524 only.
- Reviewer: **PASS** — all seven R-8 drop rows present verbatim, R-6/R-7 hold, no bump, no secret/host, scope limited to the two files.
- runtime events: none

**ADVISORY (Reviewer, non-gating):**
- The verification grep, read literally, also matches :736/:755/:757 (example, heading, intro) which don't repeat 30/300; the limits live in the table and change log, so intent is met.
- The *For the AI team* block is self-contained only together with its subsection's example and table; its bullets say "the word limit" without numbers, and it omits proposal §12's clause that PRMS renders suggestions as plain text and never sends them back to the AI. R-11 is SHOULD. Recorded; not turned into scope — owner to decide before sending the block to Daniela.

**Decisions made:**
- No skills assigned (docs-only task).
- Implementer set P-11 "Settled by" to `—` and updated the ledger Count line to keep the ledger consistent; accepted.

**Final verification:** PASS.

### `BIL-QTS-T-2` — Server: allow-list rebuild and suggestion normalizer (write + read)

- **Final status:** PASS
- **Date:** 2026-09-29
- **Attempts:** 1
- **Requirements covered:** `BIL-QTS-R-6`, `BIL-QTS-R-8`, `BIL-QTS-R-9`, `BIL-QTS-R-10` (served half)

**Attempt 1**
- Files changed: `onecgiar-pr-server/src/api/bilateral/services/quality-assessment/bilateral-quality-rules.ts` (`QualitySuggestions`, optional `suggestions` on `QualitySectionResult`, `countWordsLikeClient`, `normalizeSuggestions`), `bilateral-quality-assessment.client.ts` (`sanitizeScores` allow-list rebuild, normalizer with `sent`, `event=bilateral_quality_assessment_suggestions` count-only log line), `bilateral-quality-assessment.service.ts` (`serveSections` in `toDto`, normalizer without `sent`), and the three matching `*.spec.ts`. `isValidAiResponse` untouched.
- Red run (production files set aside, specs kept): (a) 31-word title kept, (d) `suggestions: 42` kept, (e) `evidence.debug` persisted, (g) DTO served a 40-word title — assertion failures, not compile errors.
- Implementer verification: `npx jest --silent --reporters=summary --forceExit --testPathPattern="quality-assessment"` → 5 suites / 252 tests passed; tsc red demo (`suggestions: { title: 1 }` → TS2322) then clean; eslint on changed files clean (5 pre-existing errors in unrelated `src/api/results/result.repository.spec.ts`).
- Evidence re-run (Leader-inline): **VERIFIED** — 252 passed, `npx tsc --noEmit` exit 0, eslint on the folder exit 0.
- Reviewer: **PASS** — normalizer follows §5 steps 1–7, every R-8 row covered, counter bit-for-bit with the client (fixture (h) is a real falsifier), `fields` kept, read path normalizes without `sent`, no suggestion text in any log call.
- runtime events: none

**ADVISORY (Reviewer, non-gating):**
1. Reliability: no fixture pins R-8's "Section" row (`suggestions` on `evidence` must be absent).
2. Readability: `client.spec.ts` "logs one line naming only the drop/keep counts" asserts `not.toContain('description text')`, which the fixture never contains; assert against `'A fine description'` / `'w0'`.
3. Resilience: `countSuggestionDrops` counts nothing for a non-object `suggestions` (e.g. `42`), so no log line fires for that garbage.
4. Readability: `normalizeSuggestionField` doc names `toDto`; `serveSections` is the direct caller.
5. Risk (low): allow-list writes absent keys as `undefined`; JSON serialization drops them, stored shape unchanged.

**Decisions made:**
- Skills: `nestjs-expert`, `tdd` (as listed). Effort `high` (stored/served shape).
- Log line event name `bilateral_quality_assessment_suggestions` chosen by the Implementer (spec pins only its content); accepted.

**Issues encountered:**
- The Implementer produced the red run with a tagged `git stash` of the three production files (applied by SHA, dropped by tag). No other session's stash was touched; stash list verified afterwards.
- Pre-flight: `.env` and `environment*.ts` copied from the sibling worktree `pipefish`; server `npm ci` run.

**Final verification:** PASS.

### `BIL-QTS-T-3` — Client: view type and `markStale()`

- **Final status:** PASS
- **Date:** 2026-09-29
- **Attempts:** 1
- **Requirements covered:** `BIL-QTS-R-4` (client stale state), `BIL-QTS-R-10` (typed read)

**Attempt 1**
- Files changed: `onecgiar-pr-client/src/app/pages/bilateral/services/bilateral-quality-assessment-ui.service.ts` (optional `suggestions` on the section type, `markStale()`), `…/bilateral-quality-assessment-ui.service.spec.ts` (`describe('markStale')`, two specs).
- Red run: `npx jest --no-coverage bilateral-quality-assessment-ui.service -t "markStale"` → 1 failed on `expect(service.assessment()?.is_current).toBe(false)`, Received `true` (guarded call, no TypeError).
- Implementer verification: target suite 22/22; consumers `bilateral-quality-assessment bilateral-result-creator bilateral-field-quality-flag` → 4 suites / 154 passed; `npx tsc -p tsconfig.app.json --noEmit` clean; `npx ng lint --quiet` → All files pass linting.
- Evidence re-run (Leader-inline): **VERIFIED** — 4 suites / 154 passed, tsc exit 0.
- Reviewer: **PASS** — shape matches server `QualitySuggestions`; `markStale()` writes a new object (P-13 disqualifier not triggered); nothing else in the service changed.
- runtime events: none

**Decisions made:**
- Skills: `angular-developer` (as listed). Effort `low`–`medium`. Client `npm ci` run in the worktree.

**Final verification:** PASS.

### `BIL-QTS-T-4` — Client: GI edit block in the drawer

- **Final status:** PASS (attempt 3)
- **Date:** 2026-09-29
- **Attempts:** 3
- **Requirements covered:** `BIL-QTS-R-1`, `R-2` (field side), `R-3`, `R-4` (footer/UI), `R-5`, `R-10` (rendered), NFR accessibility
- **Budget tripwire:** design budgets 2 review rounds; T-4 took 3. Escalated to the owner after attempt 2 FAIL; owner approved attempt 3 ("Continue", 2026-09-29).

**Attempt 1** — Reviewer **FAIL**
- Files changed: `onecgiar-pr-client/src/app/pages/bilateral/components/bilateral-quality-assessment-dialog/bilateral-quality-assessment-dialog.component.{ts,html,scss,spec.ts}`
- Implementer verification: 29/33 new specs red before; dialog 62/62, consumers 185/185 green; tsc and ng lint clean. Leader re-run VERIFIED.
- FAIL findings: (1) Save disabled after a failed save — `dirty` used `draft ≠ currentTitle` while T-5 writes `creationService` before the flush; (2) prefill / reopen reseed / Apply-enables-Save untested; (3) no visible "AI suggestion" label, buttons not named per field; (4) save outcome not announced via `aria-live`; (5) new SCSS blocks with hard px and a violet content surface instead of Tailwind utilities with violet on Apply only.
- runtime events: none

**Decision (execute-time spec edit, 2026-09-29):** `design.md` §6.1 amended — new input `lastSaveResult {field, ok, seq}`, `savedTitle`/`savedDescription` baselines moved only on `ok`, `dirty` = draft ≠ baseline, outcome announced in `aria-live`. `tasks.md` T-4 inputs and T-5 bind list amended. Requirement meaning unchanged (implements R-2 *Save fails* and NFR Accessibility). Rejected alternative: reordering T-5 (conflicts with DD-3).

**Attempt 2** (effort xhigh) — Reviewer **FAIL**
- Files changed: same four files; SCSS blocks removed in favour of Tailwind utilities; `lastSaveResult`, baselines, `saveStatusAnnouncement`, AI-suggestion caption, per-field `aria-label`s; all five advisory-grade items done.
- Implementer verification: new specs for issues 1/3/4 red against attempt-1 code; dialog 72/72, consumers 195/195; tsc and ng lint clean. Leader re-run VERIFIED (195 passed, tsc 0, lint clean).
- FAIL findings: (1) `settleSaveResult` effect reads `draftTitle()` tracked, so after a successful save the baseline follows every keystroke and the field never becomes dirty again (Save stays disabled, unsaved strip never shows) — violates §6.1 "moved … **only** on `lastSaveResult.ok`", R-2 "until the next change", R-5; remediation `untracked()` + specs. (2) Lightbulb icon and "AI suggestion" eyebrow coloured `--pr-color-primary-400` — violates client Hard UI rules 7/12 and §6.2 (violet on Apply only).
- ADVISORY: baseline should move to the value emitted by Save, not the draft at settle time (typing during an in-flight save); identical repeat announcements rely on `savingField` toggling; §6.1 "or the saved value changes" wording vs open-only seeding; Material icons vs Lucide rule 21 (pre-existing).
- runtime events: none

**Decision (execute-time spec edit, 2026-09-29, owner-approved):** `design.md` §6.1 baselines move only on `lastSaveResult.ok`, **to the value that field's Save emitted** (not the draft at settle time), so text typed during an in-flight save stays dirty. Carries into T-5's Reviewer brief.

**Attempt 3** (effort xhigh) — Reviewer **PASS**
- Files changed: `bilateral-quality-assessment-dialog.component.{ts,html,spec.ts}` (`.scss` unchanged from attempt 2).
- Changes: `pendingSavedTitle`/`pendingSavedDescription` recorded before emit; `settleSaveResult` tracks only `lastSaveResult()`, other reads `untracked()`; violet removed from the decorative lightbulb and "AI suggestion" eyebrow (Apply keeps `brandSoft`).
- Red run: 8 new specs `save-result baseline settle` title/description (a)–(d); on attempt-2 code (b) `canSaveTitle()` expected true got false and (c) `savedTitle()` expected 'A' got 'B', for both fields.
- Implementer verification: dialog 80/80; consumers `bilateral-quality-assessment bilateral-result-creator bilateral-field-quality-flag` → 4 suites / 203 passed; `npx tsc -p tsconfig.app.json --noEmit` clean; `npx ng lint --quiet` pass.
- Evidence re-run (Leader-inline): **VERIFIED** — 203 passed, tsc 0, lint pass.
- Reviewer: **PASS** — amended §6.1 conforms; both attempt-2 issues closed; violet only on Apply.
- runtime events: none

**ADVISORY (final Reviewer, non-gating):**
- Reliability: clear `pendingSavedTitle`/`pendingSavedDescription` on drawer open to remove the ordering dependency on the creator.
- Readability: the 13-line doc comment on `settleSaveResult` narrates the attempt-2 bug; two lines would do.

**Forward pointers to T-5 (carry in its brief):**
- Bind `lastSaveResult` as a **new object per save** with incrementing `seq`, and toggle `savingField` around each save (identical repeat announcements rely on it — attempt-2 advisory).
- Set `lastSaveResult` only after a drawer Save settles.

**Implementer assumptions accepted:** Description has no required rule (only word limit); Title named first when both dirty; KP id 6 as a local constant; placeholder-title regex copied from `section-general-info.component.ts`.

**Final verification:** PASS.

### `BIL-QTS-T-5` — Client: creator wiring (save through autosave, stale on success, Check again)

- **Final status:** PASS (attempt 2)
- **Date:** 2026-09-29
- **Attempts:** 2
- **Requirements covered:** `BIL-QTS-R-1` *Not editable* (source), `R-2` *Save a new title* / *Save fails*, `R-4` *After a save* / *Check again*

**Attempt 1** — Reviewer **FAIL**
- Files changed: `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-result-creator/bilateral-result-creator.component.{ts,html,spec.ts}` — `savingGiField`, `lastGiSaveResult`, `handleGiFieldSaveRequested()` (write `creationService` → `updateField` → flush `generalInfo` → `waitForSectionSave` → error alert / `markStale()` + success alert), `handleGiRecheckRequested()` = `submitResult()`; dialog inputs/outputs bound.
- Red run: handlers removed → (a)/(c) failed with `TypeError: … is not a function` (not assertion-level, as tasks.md asks).
- Implementer verification: creator 106/106; consumers 221; tsc and ng lint clean. Leader re-run VERIFIED: 5 suites / 222 passed (one-test count difference vs the report on the same command; both fully green), tsc 0, lint pass.
- FAIL findings: (1) falsifier (a)'s flush mock snapshotted `staged` when the gate opened, not at `flush` call time (real flush takes its batch synchronously, `bilateral-auto-save.service.ts:214-218`), so flush-before-updateField passed — violates T-5 Timing rule / P-2. (2) Folder `bilateral-result-creator/CLAUDE.md` not updated or re-stamped (client CLAUDE.md §10, src/CLAUDE.md §22). Leader's convention-file lookup missed this folder guide.
- runtime events: none

**Attempt 2** (effort xhigh) — Reviewer **PASS**
- Files changed: same three + `bilateral-result-creator/CLAUDE.md` (re-stamped 2026-09-29, two entries). Mock snapshots+clears at call time; `invocationCallOrder` assertion; `[advisory-grade]` `catch` on the drawer save handler (rejected flush → error alert, `ok:false`).
- Mutation red: flush-before-updateField → (a) red on `invocationCallOrder` (Expected < 9, Received 10); Check again → `submitAfterQualityDecision` → (c) red on `run` toHaveBeenCalledTimes(1) (Received 0); catch removed → new test fails with uncaught rejection. All reverted.
- Implementer verification: creator 107/107; consumers 5 suites / 223; tsc clean; ng lint pass.
- Evidence re-run (Leader-inline): **VERIFIED** — 223 passed, tsc 0, lint pass.
- Reviewer: **PASS** — ordering matches DD-3; `ok:true` only after `markStale()`; both error paths `ok:false` without stale; §6.1 amendment conforms.
- runtime events: none

**ADVISORY (non-gating):**
- `bilateral-result-creator/CLAUDE.md` is 154 lines vs the 120-line cap in `onecgiar-pr-client/docs/COMPONENT-DOCS.md` §4 (was ~139 before this task) — trim at archive.
- The new `catch` logs nothing; consider `LoggerService` without the error body.
- `invocationCallOrder[0]` relies on per-test mock reset; `.at(-1)` would be sturdier.
- (attempt 1) The drawer save does not emit `manualSave$`, which `section-general-info` uses to push the saved lead contact into `creationService` for the Innovation Developer prefill. DD-3 is silent on it. **Owner to decide at T-6.**
- (attempt 1) A `waitForSectionSave` 15 s timeout with no error reports success (same as `triggerManualSave`).

**Decisions made:** skills `angular-developer`, `tdd`; effort `high` → `xhigh` on rework. `manualSave$` deliberately not added.

**Final verification:** PASS.

## Spec Amendment — 2026-09-29 (P2-3848)

- **Trigger:** P2-3848 (Enhancement, epic P2-2338; INC-163884 insumo 5) linked by the owner. Gap review against its AC1–AC11.
- **Owner decisions (2026-09-29):** AC1/AC2 beyond Title/Description out of scope (PO notified on Slack); AC5 under owner validation, no technical dependency; build AC3 (re-run on drawer close), AC6/7 (labels), AC8 (Accept & save, Apply removed), AC11 (provenance in the existing `result_field_revision`, no migration — owner pointed at `api/ai/entities`).
- **Spec edits:** `requirements.md` R-3 amended, R-12 and R-13 added, OQ-3 reversed, out-of-scope updated; `design.md` §4 new endpoint, §2.2/§6.2 amended, DD-7…DD-9, budget amendment row; `tasks.md` T-7…T-9 added, T-6 now depends on T-9 with a step 7a. Correction-closure sweep for `Apply` / OQ-3 done (T-4's historical text left as delivered).
- **Budget:** original 6 tasks / 2 review rounds; after T-5 the run stood at 6 → now 9 tasks, rounds re-estimated +2. Approved by the owner ("Si, adelante").

### `BIL-QTS-T-7` — Server: field-revision endpoint with server-decided provenance

- **Final status:** PASS (attempt 2)
- **Date:** 2026-09-29
- **Attempts:** 2
- **Requirements covered:** `BIL-QTS-R-13` (server half)

**Attempt 1** — Reviewers (parallel lens mode, security surface): security lens **PASS**, conformance lens **FAIL**
- Files changed: `onecgiar-pr-server/src/api/bilateral/{bilateral-center.controller.ts, bilateral-center.controller.spec.ts, bilateral.module.ts, services/bilateral-center.service.ts, services/bilateral-center.service.spec.ts}`, new `dto/create-bilateral-field-revision.dto.ts`. `recordFieldRevision` reuses `assertSubmittable`, scopes the assessment to the result, re-runs `normalizeSuggestions`, writes one `ResultFieldRevision` (`proposal_id` null, `change_reason 'bilateral_qa_drawer:assessment=<id>'`); route-level `ValidationPipe({ whitelist: true })`; `ResultFieldRevision` registered in the bilateral module (entity unchanged, no migration).
- Red evidence: mutation-based after implementation — (a) comparison forced false, (c) trusting client provenance, (d) exception type swap.
- Implementer verification: `bilateral-center|quality-assessment` 7 suites / 395; `api/ai` 30; tsc and eslint clean. Leader re-run VERIFIED: 9 suites / 425 (= 395 + 30).
- FAIL findings (conformance): (1) falsifier (d) mock returned null for any query, so removing the `result_id` scoping stayed green; (2) `onecgiar-pr-server/src/api/bilateral/CLAUDE.md` dto tree lists `/center/*` routes but the new one was missing.
- runtime events: none

**Decision (execute-time spec edit, 2026-09-29):** `design.md` §4 error codes amended to `400` invalid/unknown result or refused state (same refusal as `assess`) · `404` unknown or foreign assessment · `400` bad field — the row contradicted itself ("same guard" vs "404 unknown result").

**Attempt 2** (effort high) — Reviewer **PASS**
- Files changed: service + spec, DTO (`@MaxLength(10000)` on `old_value`) + new `dto/create-bilateral-field-revision.dto.spec.ts`, `api/bilateral/CLAUDE.md` (dto tree line, Verified re-stamped). `[advisory-grade]`: save wrapped → generic `InternalServerErrorException` (no `QueryFailedError` parameters reach the filter/logs); success log after `await save`; trim padding in (a); `mockResolvedValueOnce` in (g); `finally` in (f).
- Mutation red: `result_id` stripped from the where → (d) red; MaxLength removed → boundary test red; try/catch removed → raw QueryFailedError leaks, test red; trim removed → (a) red. All restored.
- Implementer verification: 9 suites / 426 + DTO spec 3/3; tsc, eslint clean.
- Evidence re-run (Leader-inline): **VERIFIED** — `bilateral-center|quality-assessment|api/ai|create-bilateral-field-revision` 10 suites / 429 passed, tsc 0, eslint 0.
- Reviewer: **PASS** — both issues closed; §4 as amended conforms; forged provenance impossible; no text in logs.
- runtime events: none

**ADVISORY (non-gating):**
- **Security, pre-existing, out of scope (owner informed 2026-09-29):** `JwtMiddleware.publicRoutes` includes `'/api/bilateral'` matched with `req.path.includes`, so every `/api/bilateral/center/*` route is treated as public and invalid tokens are ignored; `@UserToken()` then decodes the `auth` payload without verifying the signature (`auth/Middlewares/jwt.middleware.ts:20-58`, `shared/decorators/user-token.decorator.ts:23-34`). Confirmed by the Leader reading the code; not exercised against a server.
- The throttler skips `/api/bilateral/*`; `old_value` now capped at 10000.
- `result_field_revision` text columns are `utf8mb3`: a 4-byte character makes the insert fail → fail-soft 500, row lost. Pre-existing schema; known gap.
- Reusing `assertSubmittable` refuses when the owner SP is missing or Innovation Use MDS is incomplete, so a drawer save in that state records no row (fail-soft).
- `assessment_id` may be any assessment of the same result, not only the latest.
- Bare `catch {}` drops the error; logging only `err.code` would aid diagnosis.

**Decisions made:** skills `nestjs-expert`, `api-design-principles`, `tdd`; `bilateral-result-summaries.en.md` not updated (design §4: no `/api/bilateral/*` consumer payload change).

**Final verification:** PASS.
