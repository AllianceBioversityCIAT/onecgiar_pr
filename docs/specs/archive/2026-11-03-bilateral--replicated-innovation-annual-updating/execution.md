# Execution Log — Annual updating for replicated W3/Bilateral innovations

## Document Control

| Field | Value |
|---|---|
| Spec | `docs/specs/bilateral/replicated-innovation-annual-updating/` |
| Approval Mode | gated (from `proposal.md`) |
| Branch | `qa-development-2026-ss` |
| Baseline commit | `bd37a0f31` |
| Leader | Opus 5.5 (T1). Implementer and Reviewer run through the `.claude/agents/akili-*` wrappers |
| Started | 2026-09-29 |
| Commits | None yet. Per the user's standing rule, nothing is committed without an explicit go-ahead. The working tree also holds unrelated uncommitted `bilateral-overview` changes from another spec, which must stay out of these commits |

**Gate decision (2026-09-29):** after wave 1 (T-1, T-3) the user answered "continua como creas que sea lo mejor en desarrollo de software". The Leader takes this as authorization to keep going through the remaining tasks without stopping at each PASS. HALT, Pivot, budget tripwire and FATAL_FAIL still stop for the user. T-9 is HITL by definition.

**Leader deviation (applies to every task):** the Reviewer got the diff as a frozen snapshot file in the session scratchpad, not inline in the brief. This keeps the Leader's output tokens down. The snapshot is taken after the Implementer reports and is not edited afterwards, so the Reviewer still audits exactly what the Implementer produced.

## Task Execution History

### BIL-RAU-T-3 — Relocate `rd-annual-updating` to `shared/components/annual-updating/`

| Field | Value |
|---|---|
| Final status | **PASS** (attempt 1) |
| Date | 2026-09-29 |
| Attempts | 1 |
| Skills | `angular-developer` (as listed in the task) |
| Effort | medium |
| Ran in parallel with | T-1 (a different package, with no shared build output) |

**Attempt 1**

- **Files:**
  - `git mv` of 6 files into `onecgiar-pr-client/src/app/shared/components/annual-updating/`: `rd-annual-updating.component.{ts,html,scss}`, `rd-annual-updating.component.spec.ts`, `rd-annual-updating.merge-split.spec.ts` and `CLAUDE.md`.
  - `rd-general-information.module.ts`: the import path is the only change.
- **Changes:**
  - The component's `GeneralInfoBody` import is replaced by the local interface `AnnualUpdatingGeneralInfoBody`.
  - The input default changed from `new GeneralInfoBody()` to `{ discontinued_options: [], merge_split_targets: [] }`.
  - The relative imports and the scss `@use` path were updated.
  - `CLAUDE.md` was re-stamped `Verified: 2026-09-29`.
  - The old folder was removed.
- **Implementer verification:**
  - `npx jest --silent --reporters=summary --no-coverage --testPathPattern="rd-annual-updating|rd-general-information.component"` gave `Test Suites: 5 passed, 5 total` and `Tests: 241 passed, 241 total`.
  - `npm run build` succeeded, with only pre-existing warnings.
  - `git diff --cached -M --stat` shows all 6 files as renames.
- **Reviewer verdict:** PASS (checklist mode). The skip rule did not apply because the interface and default lines changed, which the task requires. Reviewer summary:
  > This is a straight move. All six files are renames, and the only code change is the structural interface plus a default value that behaves the same, both of which the task requires. `GeneralInfoBody` fits the interface without being changed, the spec assertions are the same, CLAUDE.md is moved and re-stamped, and the old folder is empty.
- **Reviewer checks:**
  - `GeneralInfoBody.is_discontinued` has no initializer, so the default change does not change behavior.
  - `InnovationTransition[]` has the same shape as the interface field.
  - The scss `@use` depth is correct.
  - `rd-general-information.component.ts` is untouched, so the disqualifier was not triggered.

- **Requirements covered:** prerequisite for `BIL-RAU-R-1` (P-2); `BIL-RAU-R-9` (the W1/W2 specs are green with unchanged assertions).
- **Decisions:** the selector `app-rd-annual-updating` and the file names are kept (DD-1).
- **Issues:** none.
- **Final verification:** 241/241 tests green and the build is green.

### BIL-RAU-T-1 — Optional `EntityManager` on the two discontinuation repositories

| Field | Value |
|---|---|
| Final status | **PASS** (attempt 2) |
| Date | 2026-09-29 |
| Attempts | 2 |
| Skills | `nestjs-expert`, `tdd` (as listed in the task) |
| Effort | medium on attempt 1, high on attempt 2 (bumped on retry) |
| Ran in parallel with | T-3 |

**Attempt 1**

- **Files:**
  - `results-investment-discontinued-options.repository.ts`: `inactiveData(…, manager?)`, plus 3 new manager-aware wrappers `findOneDiscontinuedOption`, `updateDiscontinuedOption` and `saveDiscontinuedOption`, all using `selectManager`.
  - `result-innovation-merge-split.repository.ts`: `replaceForResult(…, manager?)` using `repo = selectManager(manager, ResultInnovationMergeSplit, this)`.
  - `result-innovation-merge-split.repository.spec.ts`: 3 new cases; the existing cases are untouched.
  - New `results-investment-discontinued-options.repository.spec.ts`.
- **Implementer verification:**
  - Red run: `Tests: 11 failed, 12 passed, 23 total`.
  - Green run: `Tests: 23 passed, 23 total`.
  - `eslint --quiet` was clean after `--fix`.
- **Callers:** none changed; the new parameter is optional.
  - `inactiveData` is called from `results.service.ts` (×2), `result-innovation-package.service.ts`, `ipsr_general_information.service.ts` and `innovation-use.service.ts` (×2).
  - `replaceForResult` is called from `results.service.ts` (×2).
- **Disqualifier:** not triggered. Neither method opens its own `queryRunner` or transaction.
- **Implementer assumption (verbatim):** "rather than overriding TypeORM's inherited `findOne`/`update`/`save` (which are called directly by 4 other services with no manager), I added three new, distinctly-named manager-aware wrapper methods (`findOneDiscontinuedOption`, `updateDiscontinuedOption`, `saveDiscontinuedOption`) for T-2's forthcoming helper to call."
  - Leader adjudication: this is a design choice inside scope, not work still owed. The Reviewer confirmed it is not scope drift.
- **Reviewer verdict:** FAIL. The finding, verbatim:
  > **Discovered Issue:** The no-manager SQL is not byte-identical to HEAD. The `changeActive` template literal … lost its trailing whitespace on 5 lines … This is inside the string that is sent to MySQL, so the SQL text every existing caller runs has changed. MySQL treats it the same … But it breaks the literal falsifier, and it is an unrelated edit that the task never asked for. … The new spec test "SQL text passed to manager.query is byte-identical to the no-manager call" compares the post-change with-manager SQL against the post-change no-manager SQL. It never compares against HEAD, so it cannot catch this.
  > **Violated Rule:** `tasks.md` §3 BIL-RAU-T-1, Falsifier: "Called without it, it must use `this.query` with byte-identical SQL." Description: "When `manager` is absent, SQL and behavior are identical to today (DD-6)."
  > **Remediation Suggestion:** Revert that hunk only, restoring the original trailing spaces on the 5 lines of `changeActive`. … Optionally add one assertion to pin the HEAD SQL.

**Attempt 2** (effort high)

- **Files:** the same 4 files.
  - The whitespace in `changeActive` was restored byte-for-byte from `git show HEAD`, using a raw-bytes script instead of the edit tool.
  - A test was added that pins the exact HEAD SQL, trailing whitespace included.
  - The merge-split files are unchanged from attempt 1 (same blob hashes).
- **Implementer verification:**
  - `npx jest --silent --reporters=summary --forceExit --testPathPattern="result-innovation-merge-split.repository|results-investment-discontinued-options.repository"` gave `Test Suites: 2 passed, 2 total` and `Tests: 24 passed, 24 total`.
  - `npx eslint <4 files> --quiet` was clean, run without `--fix`. The diff was unchanged after linting.
- **Reviewer verdict:** PASS. Reviewer summary:
  > The attempt-1 issue is fixed. The `changeActive` literal no longer shows up as changed in the diff … so the no-manager SQL matches HEAD byte for byte. Nothing else regressed: the implementation is the same as attempt 1 apart from that restore, and the only other new line is the pinning test.
  - The Reviewer rebuilt both SQL strings by hand and confirmed that the pinning test's `toBe` literals match them exactly.

- **Requirements covered:** NFR data integrity (the atomicity prerequisite); enables `BIL-RAU-R-3`.
- **Decisions:** the manager-aware `findOne`/`update`/`save` path is exposed as named wrappers instead of overriding the inherited TypeORM methods, because 4 other services call those methods with no manager.
- **Issues:** an editor or `--fix` pass trimmed trailing whitespace inside a SQL template literal. Kaizen candidate: tell Implementers never to run `--fix` on files that contain raw SQL literals.
- **Final verification:** 24/24 tests green and lint clean.
- **Forward pointer for T-2 and T-6 (carry in their briefs):** the extracted helper must call `findOneDiscontinuedOption`, `updateDiscontinuedOption` and `saveDiscontinuedOption`, and pass `manager` to `inactiveData` and `replaceForResult`. Do not call the inherited `findOne`/`update`/`save` directly, or T-6 case (f) (atomicity) fails.

### BIL-RAU-T-2 — Extract `applyInnovationDiscontinuation` + `resolveDiscontinuationStatus`

| Field | Value |
|---|---|
| Final status | **PASS** (attempt 2) |
| Date | 2026-09-29 |
| Attempts | 2 |
| Skills | `nestjs-expert`, `tdd` (as listed in the task) |
| Effort | high on attempt 1, xhigh on attempt 2 |
| Ran in parallel with | T-4 (client) |

**Attempt 1**

- **Files:** `results.service.ts` and `result.spec.ts`.
  - New `private applyInnovationDiscontinuation(resultId, answer: InnovationDiscontinuationAnswer, userId, manager?)`. It calls the T-1 wrappers (the forward pointer was honoured).
  - Exported the pure function `resolveDiscontinuationStatus(typeId, isDiscontinued, currentStatus)`.
  - `createResultGeneralInformation` calls both, after the P2-3597 title check and with no `manager`.
  - `result.spec.ts`: 3 mock methods added, plus a new describe block with the positive branch tests and the status table.
- **Implementer verification:**
  - `npx jest --silent --reporters=summary --forceExit --testPathPattern="results/result.spec"` → `Tests: 133 passed, 133 total`.
  - eslint clean, run without `--fix`.
  - The red run was not captured (the report said "124-ish passing baseline").
- **Reviewer verdict: FAIL.** Issue, quoted verbatim:
  > **Discovered Issue:** In the discontinued branch, the helper adds `?? []` to `discontinued_options`, which HEAD did not have … At HEAD, a W1/W2 payload with `is_discontinued: true` on type 7/2 and no `discontinued_options` threw before the first write, so nothing was stored and the error handler answered. With the change, the same payload deactivates every stored reason (`inactiveData([])`), then saves the result at status 4 with zero reasons. T-6 will call this helper inside the bilateral writer, so a crafted or buggy `{ is_discontinued: true }` would silently discontinue a bilateral result with no reasons. …
  > **Violated Rule:** `design.md` §5, Helper bullet: "the exact body of today's `results.service.ts:832-896`, both branches, moved as-is". `requirements.md` BIL-RAU-R-9.
  > **Remediation Suggestion:** Drop both `?? []` on `answer.discontinuedOptions` and keep the one on `mergeSplitTargets`. If a missing-reasons guard is wanted, it belongs in T-6 as an explicit 400 on the bilateral path, recorded as a spec decision. It should not change W1/W2 silently.
- **Advisory:**
  - Record a real red run.
  - Add a type-5 case through `createResultGeneralInformation`.
  - Widen `isDiscontinued: boolean`.

**Attempt 2** (effort xhigh)

- **Changes:**
  - Removed both `?? []` on `discontinuedOptions`.
  - Added the type-5 test through `createResultGeneralInformation`: no discontinuation repo is called and the status stays 1.
- **Red run:** a temporary `if (true)` in `resolveDiscontinuationStatus` gave `Tests: 2 failed, 132 passed, 134 total`. The file was restored and checked byte-identical against a backup.
- **Final verification:** `Tests: 134 passed, 134 total`; eslint clean, run without `--fix`.
- **Reviewer verdict: PASS.**
  > Attempt 2 fixes the attempt-1 issue, and the helper is now a token-level move of HEAD 832-896. The W1/W2 path adds no regression, and no existing assertion changed.

  The Reviewer confirmed that the only differences are:
  - identifier renames;
  - `answer.isDiscontinued && isInnovationType`, which keeps the loose `==` and the truthiness;
  - wrapper calls with a trailing `manager`.

  The status rule is still identical to HEAD 949-956.
- **Advisory (final):** `isDiscontinued: boolean` understates the real inputs (`undefined` from W1/W2, a tinyint possible in T-6). Widen it when T-6 lands.

**Close-out**

- **Requirements covered:** `BIL-RAU-R-4` (S-4.1, S-4.2 rule), `BIL-RAU-R-9` (server side), `AC-8`, `AC-9`, `AC-15`, NFR one writer.
- **Decisions:** the helper takes a narrow `InnovationDiscontinuationAnswer` rather than the whole `resultGeneralInformation`.
- **Issues:** attempt 1 "hardened" moved code. Kaizen candidate: briefs for "move as-is" tasks should say "token for token, no defensive additions".
- **Forward pointers for T-6 (carry in its brief):**
  1. Because the helper has no `?? []` on `discontinuedOptions`, a bilateral payload `{ is_discontinued: true }` without `discontinued_options` will throw inside the transaction. The transaction rolls back, and the client gets an error rather than a 400.
     - The spec only requires "no confirm with zero reasons" on the client (S-11.1).
     - T-6 must **not** add `?? []` to the helper.
     - Mapping the missing-key case to a clean 400 is a spec gap. Escalate it rather than decide it silently.
  2. Widen `isDiscontinued` to accept a tinyint or boolean, per the advisory.

### BIL-RAU-T-4 — Context input + `answerChange` output on the shared component

| Field | Value |
|---|---|
| Final status | **PASS** (attempt 2) |
| Date | 2026-09-29 |
| Attempts | 2 |
| Skills | `angular-developer`, `tdd` (as listed in the task) |
| Effort | high on attempt 1, xhigh on attempt 2 |
| Ran in parallel with | T-2, then T-5 (both server) |

**Attempt 1**

- **Files:**
  - `rd-annual-updating.component.ts`:
    - new `AnnualUpdatingContext`, `@Input() context?`, `@Output() answerChange` and `ngOnChanges`, guarded on `changes['context']`;
    - context-first resolvers `resolveResultId`, `resolveIsAdmin`, `resolveEditableBase` and `resolvedResultTypeId`;
    - `buildOptions()` extracted;
    - handlers `onAnswerChange`, `onReasonToggle` and `onDescriptionChange`, each emitting once. `onTargetsChange` and `reopenDiscontinuation` now emit too.
  - `.html`: `[(ngModel)]` is split into `[ngModel]` + `(ngModelChange)` on the radio, checkbox and "Other" input.
  - New `rd-annual-updating.context.spec.ts`.
  - The folder `CLAUDE.md` gains a "Context input" section.
- **Implementer verification:**
  - `npx jest --silent --reporters=summary --no-coverage --testPathPattern="annual-updating|rd-general-information.component"`: `Test Suites: 7 passed, 7 total; Tests: 264 passed, 264 total`.
  - `npx ng lint --quiet`: clean. `npm run build`: green. One type error was fixed by widening the private `resolveResultId` return type.
  - The old specs' diff is empty.
- **Implementer assumption (verbatim):** "The folder `CLAUDE.md` is now 247 lines, over the documented 120-line cap … it was already at 192 lines (over cap) before this task … I added the required 'Context input' section rather than trimming the pre-existing overage."
  - Leader adjudication: this is not owed scope. The DoD asks for the section, not a trim.
- **Reviewer verdict: FAIL.** Two issues, quoted verbatim:
  > 1. **Discovered Issue:** Three of the falsifier cases cannot fail without the change. The cases are type 2 giving the "Innovation use is …" labels, `storedIsDiscontinued: null` giving no lock, and S-6.1 … With `currentResult` left at `{}`, the old code gives the same result for each … `DataControlService` is a root singleton, so a W1/W2 type-7 `currentResult` can still be there when the reporter moves to a bilateral type-2 result. … **Violated Rule:** `tasks.md` §3 BIL-RAU-T-4 Red run … `requirements.md` BIL-RAU-S-2.1 and S-6.1 … `.agents/reviewer.md` §3. **Remediation Suggestion:** … seed a conflicting `dataControlSE.currentResult` … Then assert that `context` wins. Add one type-7 case with `phaseYear: 2025` …
  >
  > 2. **Discovered Issue:** The docs now contradict the code. The folder `CLAUDE.md` "Contract" section still says `usesStatusTriggerWording` is "(readonly)" … `annualUpdatingEditable = isPhaseOpen && rolesSE.access?.canDdit` … "Two-way bound to `is_discontinued`" … The `AnnualUpdatingContext` JSDoc says the resolvers fall back when "a given field on it is undefined" … **Violated Rule:** `onecgiar-pr-client/CLAUDE.md` §10 "Folder docs", T-4 DoD. **Remediation Suggestion:** Update those Contract and Step 4 lines … Fix the interface JSDoc …
- **Advisory:**
  - T-8 must pass a stable `context` reference, because `ngOnChanges` rebuilds `options`.
  - `CLAUDE.md` is over the line cap.

**Attempt 2** (effort xhigh)

- **Spec changes:**
  - New helper `seedConflictingFallback()`. The type-2, `null`, S-6.1, tinyint `0`/`undefined` and `editable: false` cases now seed a conflicting fallback.
  - New case: type 7 with `phaseYear: 2025` through `context`, expecting the legacy labels.
- **Component and docs:**
  - The `CLAUDE.md` Contract and Step 4 lines are fixed.
  - The JSDoc now says the fallback applies to the whole object only.
  - The component logic is unchanged, and the JSDoc is the only `.ts` change.
- **Proof the tests bite:** with `storedIsDiscontinued` and `buildOptions` made to ignore `context`, the run gave `Tests: 10 failed, 7 passed, 17 total`. The file was restored from a backup.
- **Final verification:** `Test Suites: 7 passed, 7 total; Tests: 265 passed, 265 total`. `ng lint` clean. The old specs' diff is empty. The build was not re-run, because only a comment changed.
- **Reviewer verdict: PASS.**
  > Both issues from attempt 1 are fixed. The component logic in `t4-a2.diff` is the same as attempt 1, line by line. The only `.ts` change is the `AnnualUpdatingContext` JSDoc, which now says the fallback applies only when the whole `context` is undefined. That wording matches the code and the folder `CLAUDE.md`.
- **Advisory (final, recorded, not gating):**
  - The context spec's top docblock and the `buildWithContext` doc still say "no `currentResult` seeded", which contradicts the new conflict seeds.
  - The `isAdmin` option of `seedConflictingFallback()` is never used.
  - T-8 must pass a stable `context` reference.
  - `CLAUDE.md` is 245 lines, against a 120-line cap.

**Close-out**

- **Requirements covered:**
  - `BIL-RAU-R-2` (S-2.1);
  - `BIL-RAU-R-6` (S-6.1, S-6.2 client side);
  - `BIL-RAU-R-3` S-3.1, the tinyint clause;
  - `BIL-RAU-R-9`;
  - `AC-3`, `AC-5` (unit part), `AC-11`, `AC-12` (UI part).
- **Cannot prove in jsdom:** the rendered radio and the NG0103 loop. Owned by T-9.
- **Issues:** attempt 1's negative tests could not fail. Kaizen candidate: for a context-first/fallback resolver, a brief must require the negative cases to seed a conflicting fallback source.
- **Forward pointer for T-8 (carry in its brief):** bind `[context]` to a stable reference, such as a `computed()` signal value. Never use a getter or an inline literal: each new reference rebuilds `options`, which is an NG0103 risk.

### BIL-RAU-T-5 — Bilateral GET returns the stored answer

| Field | Value |
|---|---|
| Final status | **PASS** (attempt 1) |
| Date | 2026-09-29 |
| Attempts | 1 |
| Skills | `nestjs-expert`, `api-design-principles` (the task listed these; `tdd` was not assigned, because the change is additive plumbing) |
| Effort | medium |
| Ran in parallel with | T-4 attempt 2 (client) |

**Attempt 1**

**Files**
- `result.repository.ts` (+5): `getCommonFieldsBilateralResultById` now selects `r.is_replicated` and `r.is_discontinued`.
- `results.service.ts` (+33): `getBilateralResultById` spreads in `annualUpdating` only for types 7 and 2. A new private `_loadBilateralAnnualUpdatingData` does `find({result_id, is_active: true})` plus `findActiveByResult`, in parallel.
- `result.spec.ts` (+133) and `result.repository.spec.ts` (+17): new tests.

**Implementer verification**
- Command: `npx jest --silent --reporters=summary --forceExit --testPathPattern="results/result.spec|result.repository"`
- Result: `Test Suites: 4 passed, 4 total` / `Tests: 225 passed, 225 total`.
- Lint (no `--fix`): clean on the touched lines. The 5 errors in `result.repository.spec.ts` lines 1321–1449 were already there.

**Callers of `getCommonFieldsBilateralResultById`:** 2, both in `results.service.ts` (the bilateral GET and `reviewerUpdate`).

**Incident: stash/pop in a shared checkout.** The Implementer used `git stash push -- <files>` to capture a red run. The pop conflicted with T-4 attempt 2, which was editing client files at the same time. The Implementer:
- resolved the conflicts by keeping the concurrent T-4 side;
- rebuilt the index entry for `results.service.ts` by hand.

A leftover entry, `stash@{0}` ("WIP on qa-development-2026-ss: bd37a0f31"), is still in the stash list. It was not dropped and is left for the user to decide.

**Leader verification (inline)**
- `git apply --check -R t4-a2.diff` passes, so the T-4 files are exactly the reviewed state.
- The index diff for T-2 is byte-identical to the reviewed `t2-a2.diff`.
- There are no conflict markers in `src/`.

**Reviewer verdict:** PASS.
> The T-5 diff (about 188 LOC, 4 files) matches tasks.md §3 BIL-RAU-T-5, design §4.1 row 1, DD-8 and §8. The two columns are passed through from the row, and `annualUpdating` is built only for types 7/2 and left out entirely for every other type.

**ADVISORY (recorded, not gating)**
- `result.spec.ts:2053` says "2 active + 1 inactive", but the fixture only has the 2 active rows. The active filter is proven by the `where` assertion instead.
- `is_replicated` is tested only with `1` at unit level. The real 0/1 check is deferred to T-9.
- The type-2 half of the gate has no test.
- `merge_split_targets` is a superset of the design shape. It also carries `result_innovation_merge_split_id`, `origin_result_id`, `target_result_code` and `target_title`, the same as the W1/W2 GET. T-7 must not assume there are only two fields.

**Outcome**
- **Requirements covered:** `BIL-RAU-R-3` S-3.1 (the load half); `BIL-RAU-R-1` (the data for the gate).
- **Decisions:** no new raw SQL; existing repo methods are reused. Swagger was not updated, because the route returns `any` and has no response schema.
- **Issues:** the stash incident above. Kaizen candidate: Implementer briefs in a shared checkout must forbid `git stash`. For a red run, stash nothing: revert the edit temporarily in place, or use a scratch copy.
- **Final verification:** 225/225 tests green.
- **Forward pointer for T-7:** `annualUpdating.merge_split_targets` rows carry the extra fields listed above. `commonFields.is_replicated` and `commonFields.is_discontinued` are raw tinyint.

### BIL-RAU-T-7 — Bilateral client plumbing: signals, status refresh, key-scoped read-only exemption

| Field | Value |
|---|---|
| Final status | **PASS** (attempt 1) |
| Date | 2026-09-29 |
| Attempts | 1 |
| Skills | `angular-developer`, `tdd` (as listed in the task) |
| Effort | high |
| Ran in parallel with | T-6 (server) |

**Attempt 1**

- **Files:** `bilateral-creation.service.ts`, `bilateral-auto-save.service.ts`, `bilateral-result-creator.component.ts`, plus their specs and the creator `CLAUDE.md` (re-stamped).
  - Creation service: 4 new signals and `setResultStatus`. `isReplicated` is set as `Number(cf.is_replicated) === 1`. `storedIsDiscontinued` keeps the raw value.
  - Autosave service: the 3 keys now map to `generalInfo`, plus `setReadOnlyExemptions`. `updateField` and `updateFieldsBatch` pass only exempt keys while read-only.
  - **`flush()` was changed beyond the literal brief.** The early `isReadOnly()` return was narrowed. While read-only, `flush()` now dispatches only the exempt pending fields and skips structured payloads. Without this, exempt keys could never be sent.
  - Creator: a second `effect` sets the exemptions.
- **P-10 finding:** the read-only gate was already an `effect` (`bilateral-result-creator.component.ts:430-432`, `setReadOnly(!isEditableByCenterUser())`). Under DD-9, only `setResultStatus` was needed. P-10 is now **verified**.
- **Implementer verification:**
  - Red run, per suite: auto-save 4 failed / 13 passed; creation 5 failed / 57 passed; creator 7 failed / 99 passed.
  - Green run: `npx jest --silent --reporters=summary --no-coverage --testPathPattern="bilateral-auto-save|bilateral-creation|bilateral-result-creator"` → `Tests: 185 passed, 185 total`.
  - Consumers: `--testPathPattern="pages/bilateral/components"` → `Tests: 1 failed, 1168 passed, 1169 total`. The failure is `type-innovation-use.component.spec.ts`, which asserts a raw-HTML snippet. That file is not in this diff. The Reviewer judged that this diff could not have caused it, so it counts as pre-existing (consistent with memory: the client suite is broadly red on this branch).
  - `ng lint` and `npm run build` are both green.
- **Reviewer verdict:** PASS.
  > BIL-RAU-T-7 meets tasks.md §3, design.md §6.2, DD-5 and DD-9, and R-6 S-6.3 / AC-17 / D11. The exemption covers exactly three keys, and every other key is still dropped while read-only. With no exemptions set, the service behaves the same as before for every section.
  - The Reviewer traced the `flush()` leak sequence: a title staged while editable, then status 4 with the admin exemption active. `title` stays pending and unsent. Only the exempt keys go out.
- **ADVISORY (recorded, not gating):**
  - No spec pins that exact leak sequence yet.
  - The `isReadOnly` and `flush()` JSDoc are now out of date.
  - `resultTypeId` is not `Number()`-normalized, so a string `"7"` would fail `=== 7`. This is an existing assumption shared with `section-general-info`.
- **Requirements covered:** `BIL-RAU-R-6` S-6.3 (including the BUT clause); "editable without manual reload" (unit); `AC-17`; D11.
- **Decisions:** the `flush()` narrowing is recorded above as necessary to meet the task's intent.
- **Issues:** none.
- **Final verification:** 185 of 185 green.
- **Forward pointers for T-8:**
  - After the save response, call `creationService.setResultStatus(status_id)`. Both effects react to it.
  - `storedIsDiscontinued` is raw. The wrapper must normalize it with `toNullableBoolean`.
  - `resultTypeId` may need `Number()` when compared.

### BIL-RAU-T-6 — Bilateral writer accepts and persists the answer

| Field | Value |
|---|---|
| Final status | **PASS** (attempt 2 + owner-approved extension (g)) |
| Date | 2026-09-29 |
| Skills | `nestjs-expert`, `tdd`, `api-design-principles` (as listed in the task) |
| Effort | xhigh on attempt 1, max on attempt 2 |
| Review mode | Parallel lens reviewers: reliability+risk, and resilience+readability |

**Attempt 1**

- **Files:** `dto/update-bilateral-general-info.dto.ts`, `results.service.ts` (`updateBilateralGeneralInfo`), `result.spec.ts`. That is 6 new falsifier tests, (a)–(f).
- **Implementer verification:** red run 5 of 6 failing, where (a) is a regression guard. Green run: `Tests: 142 passed, 142 total`. eslint clean, run without `--fix`.
- **Atomicity.** Every helper repo call takes `manager`. Test (f) forces `inactiveData` to reject and asserts the transaction rejects, with no success response.
- **History row:** W1/W2 writes no `result-review-history` row on a discontinuation status change, so T-6 adds none either (parity).
- **Missing-array 400:** not added. This stays an open spec gap, see the T-2 forward pointer.
- **Resilience/readability lens: FAIL.** The finding, verbatim:
  > **Discovered Issue:** The Swagger schema does not document the payload element shapes, and the TS types are looser than what already exists. `discontinued_options` and `merge_split_targets` are declared `type: [Object]`, and `merge_split_targets` is `any[]`. But `InnovationTransitionDto` already exists (create-general-information-result.dto.ts:20) … The W1/W2 DTO for the same fields uses `type: () => [ResultsInvestmentDiscontinuedOption]` and `type: () => [InnovationTransitionDto]` … **Violated Rule:** tasks.md T-6 DoD, "DTO documented with Swagger decorators". design.md §4.1 row 2 … **Remediation Suggestion:** Change `merge_split_targets?: any[]` to `InnovationTransitionDto[]` … Change `discontinued_options` to `type: () => [ResultsInvestmentDiscontinuedOption]` …
  - Leader adjudication: in scope, because it is named in the DoD. This consumed attempt 1.
  - Advisory items: `returnErrorRes({debug: true})` logs the whole error object (payload values inside TypeORM `parameters`); double logging; (f) cannot prove there is no partial commit when `manager` is mocked; the literals 7 and 2 repeat the rule.
- **Reliability/risk lens:** no verdict. The agent was terminated by an API session limit (HTTP 429). This is a runtime failure, not a FAIL, so it consumed no attempt.

**Attempt 2** (effort max)

- **DTO:** now reuses `ResultsInvestmentDiscontinuedOption[]` and `InnovationTransitionDto[]`, matching W1/W2.
- **Service:** the literals 7 and 2 became `ResultTypeEnum`.
- **Test (f):** added a direct `transaction.mock.results[0].value` rejects check, and a `_logger.warn` spy that asserts no payload is logged.
- **Implementer verification:** `Tests: 142 passed, 142 total`. eslint clean, run without `--fix`.
- **Frozen diff:** `t6-a2.diff`, in the session scratchpad.
- **Review:** NOT YET RUN. Spawning both lens reviewers (a fresh reliability+risk reviewer, and a resend to the resilience reviewer) failed twice with "auto mode classifier gave no verdict". That is a transient harness failure, not a verdict.
- **Resume:** run both lens reviews on the working tree compared with the index. The index holds T-1, T-2 and T-5. Then finalize T-6.

**Owner decision (2026-09-29), closing the missing-reasons spec gap from the T-2 forward pointer.** In the owner's words: "si un resultado bilateral no continúa, o sea, es discontinuo, deberían de probar una razón. Si no la probaren, debería de aparecer un warning de: 'Por favor, prueba una razón'."

- **What changed in the spec:**
  - New scenario `BIL-RAU-S-11.3` in `requirements.md`.
  - New falsifier (g) on T-6: the server returns 400 "Please provide a reason." on the bilateral path only. W1/W2 is unchanged (R-9).
  - New falsifier (g) on T-8: a visible warning, with the confirm button disabled.
- **UI copy:** "Please provide a reason.", in English like the rest of the app.
- **How it was handled:** as an owner-approved scope extension, not as a Pivot. No design decision or requirement is overturned; only the open gap is filled.
- **Delivery for T-6:** sent to the attempt-2 Implementer as an extension. It does not count as a rework attempt. The lens reviews then cover attempt 2 plus (g).
- **Other owner instructions from the same message:**
  - Leave the leftover `stash@{0}` alone.
  - The other files in this checkout are the owner's own parallel work. Touch only this spec's files.

**Extension (g), implemented in attempt 2.**
- **The guard:** in `updateBilateralGeneralInfo` only, after `assertCenterWrite` and before any write or the transaction. When `is_discontinued === true`, the type is 7/2, and `discontinued_options` is missing, not an array, or `[]`, it throws `BadRequestException('Please provide a reason.')`, which the method's catch returns as a 400.
- **Red run:** 2 of 3 failed, with `TypeError … reading 'map'` inside the helper. The `false` case passed.
- **Green run:** `npx jest --silent --reporters=summary --forceExit --testPathPattern="results/result.spec"` gave `Tests: 145 passed, 145 total`. eslint is clean, run without `--fix`.
- **Frozen diff:** `t6-a2g.diff`.

**Lens reviews of attempt 2 + (g).**
- **Resilience/readability lens: PASS.**
  > The attempt-1 DTO issue is resolved, (g) follows S-11.3 exactly, and none of the six original falsifiers regressed.
- **Reliability/risk lens (fresh retry after the 429): PASS.**
  > The status comes only from the stored value, authorization runs before (g) and before every write, every helper path gets `manager` inside the one transaction, a missing key triggers no discontinuation code, and (g) matches S-11.3. The existing tests and the W1/W2 writer are unchanged.

**ADVISORY (recorded, not gating).**
- **R1, RISK, high, escalated to the owner.** This is a pre-existing SQL injection that is now reachable from a second endpoint. `results-investment-discontinued-options.repository.ts:76-80` builds `in (${options.toString()})` from client-supplied `investment_discontinued_option_id` values, and there is no ValidationPipe. A value such as `"1) OR (1=1"` turns the deactivate statement into a table-wide UPDATE. The W1/W2 path was already exposed the same way. The endpoint is JWT-gated.
  - Cheap bilateral fix: extend (g) to reject any row whose id is not a positive integer.
  - Proper fix: bind the ids in `inactiveData` as placeholders. This is behaviour-neutral for W1/W2.
  - Not applied, because an advisory never widens scope without the owner.
- **R2.** A list made only of `is_active: false` rows passes (g).
- **R3.** `[null]` gives a 500 (rolled back) instead of a 400. `[{}]` gives a loose `findOne`. Both are closed by the R1 row check.
- **R4.** A status change writes no `result-review-history` row. This is parity with W1/W2, and a known gap against `api/results/CLAUDE.md` §7.
- **R5.** `returnErrorRes({debug: true})` logs whole driver errors, which can include the "Other" text, and returns the driver message to the client. This is pre-existing.
- **R6.** There is no test pinning "non-admin at status 5 with no reasons → 403, not 400".
- **Readability.** In (f), `warnSpy` is never restored. The 7/2 check is duplicated. The guard's `'in'` check is redundant.

**Outcome.**
- **Requirements covered:** `BIL-RAU-R-3` (S-3.2, S-3.3), `BIL-RAU-R-4` (S-4.1, S-4.2), `BIL-RAU-R-10`, S-11.3 (server half), and `AC-6`..`AC-9`, `AC-16`.
- **Final verification:** 145/145 green.
- **Forward pointer for T-8:**
  - A save can return 400 "Please provide a reason."; show it as an error in the block.
  - The client's warning plus disabled confirm are falsifier (g) on T-8.
  - Send only ticked reasons, with `is_active: true`.

### Owner decision — new task BIL-RAU-T-10 (2026-09-29)

Advisory R1 from the T-6 reliability/risk lens was a pre-existing SQL injection in `inactiveData`, now also reachable from the bilateral path. It was escalated to the owner, who chose option 1, a proper fix: "Yo creo que hay que arreglarlo bien … asegúrate de que no se vaya a romper ningún flujo de ese llamado … ni para W1, W2 ni para W3."

`BIL-RAU-T-10` was added to `tasks.md`:
- bind the ids as query parameters;
- every caller spec must stay green;
- the T-1 pin test is intentionally updated.

It was added with the owner's explicit approval, so it does not break the rule that an advisory never becomes a task without that approval.

**Budget impact:** tasks go from 9 to 10. The budget tripwire was acknowledged by the owner's decision.

### BIL-RAU-T-10 — Bind the discontinued-option ids in `inactiveData` (SQL injection fix)

| Field | Value |
|---|---|
| Final status | **PASS** (attempt 1) |
| Date | 2026-09-29 |
| Attempts | 1 |
| Skills | `nestjs-expert`, `tdd` |
| Effort | max (security) |
| Review | Parallel lenses: security+risk, and reliability |
| Ran in parallel with | T-8 (client) |

**Attempt 1**

**Files**
- Changed: `results-investment-discontinued-options.repository.ts` and its spec.
- Checked and left untouched: `result-innovation-merge-split.repository.ts`. Its only `${}` is a JS Map key, not SQL. The Leader confirmed the file is identical to its T-1 state.

**Change**
- Before: `not in (${options.toString()})`
- After: `not in (?,?)` with params `[user_id, result_id, ...options]`
- The activate branch was changed the same way.
- `placeholders = options.map(() => '?').join(',')`.
- With an empty list, behavior is unchanged: one query, no `in (`, params `[user_id, result_id]`.
- Routing through `manager ?? this.dataSource` is unchanged.

**Implementer verification**
- Red: `Tests: 3 failed, 13 passed, 16 total`
- Green: `Tests: 16 passed, 16 total`
- Callers: `npx jest … --testPathPattern="results/result\.spec|results/result\.repository\.spec|result-innovation-package\.service|ipsr_general_information\.service\.spec|innovation-use\.service"` gives `Test Suites: 9 passed, 9 total`, `Tests: 273 passed, 273 total`.
- eslint clean, run without `--fix`.
- An edit dropped the trailing whitespace in the SQL literal. The Implementer noticed it and restored it themselves.

**Existing assertions that changed (the "must be noted" clause)**
1. The T-1 pin test. It now pins the bound SQL and params. The owner approved this change.
2. The T-1 test "without a manager, runs on this.dataSource.query as today". Its params expectation went from `[USER, RESULT_ID]` to `[USER, RESULT_ID, ...options]`. This goes beyond the single exception the task named. Both Reviewers judged it a direct consequence of the fix, not drift, and the Leader accepts it on that basis.

**Callers checked (owner's condition: W1/W2, W3, IPSR, Innovation Use)**
- All 6 call sites pass `X.map(el => el.investment_discontinued_option_id)` or `[]`:
  - `results.service.ts:328/382`, the shared helper used by both W1/W2 and W3
  - `result-innovation-package.service.ts:771`
  - `ipsr_general_information.service.ts:214`
  - `innovation-use.service.ts:129/169`
- The disqualifier was not triggered.
- Limit of this evidence: the caller specs mock `inactiveData`. What actually protects the callers is the combination of:
  - the exact SQL and params pins,
  - the verified argument shape at every caller,
  - the unchanged positional signature.
- Nothing ran the SQL against MySQL. T-9 on prtest covers the real run for W3, and the owner can smoke W1/W2 there as well.

**Reviewer verdicts**
- Reliability lens: **PASS**.
  > For every real caller in W1, W2 and W3, the bound form produces the same predicates, the same order, the same empty-list behaviour and the same manager routing, and the new tests fail if interpolation comes back.
- Security+risk lens: first attempt died on an API 429 with no verdict; the retry gave **PASS**.
  > No client value can reach the SQL text in `inactiveData` any more. The placeholders are built safely and their order matches the params order. No other client-value interpolation remains in either repo file.

**ADVISORY (recorded, not gating)**
- A malformed entry with a `null`/`undefined` id no longer throws. It binds to NULL: `NOT IN (…, NULL)` deactivates nothing, and the caller loop's `findOne` with an undefined key can match an arbitrary row of that result.
  - No caller builds such an entry, and the UI never sends one.
  - Suggested follow-up: reject non-integer ids, either in `inactiveData` or with `@IsInt({each: true})` / `@ArrayMaxSize` on the DTO.
- Very large arrays add no new exposure, since the size is already capped by the body limit and `max_allowed_packet`.

**Outcome**
- Requirements covered: NFR Security; `BIL-RAU-R-9` and `BIL-RAU-R-3` (no regression, based on the pins plus the caller survey).
- Final verification: 16/16 repository tests and 273/273 caller tests green.

### BIL-RAU-T-8 — Bilateral wrapper `app-bilateral-annual-updating` — PASS (attempt 3)

**Attempt 1** (effort high)

The Implementer was cut off once by an API 429 and resumed with its context intact.

**Files**
- New: `components/bilateral-annual-updating/` (wrapper, Spartan confirm dialog and service, `CLAUDE.md`).
- `section-general-info.component.{ts,html,spec.ts}`.
- The two type-specific `CLAUDE.md` pointers.
- `bilateral-auto-save.service.ts`: added a new `lastGeneralInfoResponse` signal as the save-response hook. This file is outside T-8's file list.

**Implementer verification**
- `bilateral-annual-updating|section-general-info`: `Tests: 77 passed, 77 total`.
- Regression: `Tests: 311 passed, 311 total`.
- Lint and build green.

**Reviewer verdict: FAIL**, 6 issues. The full report is in the session; summary:
1. The ungrouped `setSectionFields('general-info', …)` in `section-general-info.component.ts:342` wipes the `'annual-updating'` MDS group on every Title/Description/Lead edit, so an unanswered result can count as complete. Violates R-7/S-7.1, AC-13, falsifier (e) and design §6.2.
2. `flush()` only dispatches the request, so a 400 on confirm never reaches `saveError()`, and `confirming` resets too early. Violates S-11.3 and falsifier (g).
3. `lastGeneralInfoResponse` is not cleared in `reset()`, so a stale `status_id` can be applied to a different result. Violates design §6.2.
4. The button and the warning use hand-written SCSS with hex colours instead of Spartan `hlmBtn variant="outline"` plus Tailwind. Violates design §6.3, UX §7 rule 1 and client CLAUDE §5 #8.
5. **Mark as discontinued** is still enabled on a locked result. Violates R-6.
6. Falsifiers (a), (b), (c), (e) and (g) cannot fail as written: the tracker and the template are mocked, and the fixture has a single reason.

**Leader adjudication**
- All 6 issues are in scope.
- For Issue 1 the Leader picked remediation (a): `section-general-info` publishes its own items under group `'core'`. The changed arity of the existing `setSectionFields` assertions is an approved exception to "spec green unchanged", and each changed assertion is listed in the attempt-2 report. The tracker service is not changed.

**Advisory, recorded**
- Yes flushes right away because the service has no timer, so R-11's "~800 ms" premise is false. An invalid staged Title could make the Yes fail.
- `storedIsDiscontinued` is not refreshed from the response.
- `rolesSE.isAdmin` is a plain property and can go stale.
- The auto-save file is outside T-8's file list.
- `section-general-info/CLAUDE.md` does not exist, so that DoD item is N/A.
- The load-error and dialog strings are new copy.

**Attempt 2** (effort xhigh), sent with the full FAIL report verbatim.

**Changes**
- Issue 1: the section's own MDS items move to group `'core'`. Eight existing `setSectionFields` assertions gained the `'core'` argument; this is the approved exception. A new test uses the real tracker.
- Issue 2: added a `waitForSave()` poll.
- Issue 3: `reset()` now clears `lastGeneralInfoResponse`, with an id guard. From the advisory: `storedIsDiscontinued` is synced from the response.
- Issue 4: switched to `hlmBtn variant="outline"` plus Tailwind; the SCSS is reduced to `:host`.
- Issue 5: the button is gated on `context().editable`.
- Issue 6: new rendered-markup tests, plus an unticked reason in the fixture for (c).
- Template: the nested `@if` was flattened into siblings. The Reviewer judged the need for `markForCheck` a test-harness artefact; the app uses default change detection with zone.js.

**Implementer verification:** 86/86 green, regression 318/318 green, lint and build green.

**Reviewer verdict: FAIL.** Issues 1 and 3–6 are confirmed resolved and the tests can fail. One issue remains:
> **Discovered Issue:** On a real 400, `waitForSave()` waits the full 15 s before showing the error. `hasPendingFor('general-info')` counts a field status of `'error'` as pending (`bilateral-auto-save.service.ts:313-316`) … The creator's loop has the extra exit `&& !this.autoSaveService.hasErrorFor(section)` (line 1014). The wrapper copied the loop without that exit. The new test … drives `hasPendingFor` to `false` while `hasErrorFor` is `true`. The real service can never be in that state, so the test passes and the defect ships.
> **Remediation Suggestion:** Add `&& !this.autoSaveService.hasErrorFor('general-info')` to the `waitForSave()` loop condition … Change the timing test so the mocks model the real service …

**Advisory:**
- Drive the rendered tests through `stub.answerChange.emit()`.
- Add a `setStoredIsDiscontinued()` setter.
- Bookkeeping to record: the auto-save file sits outside T-8's file list; the flush-on-Yes judgment call; the `section-general-info` CLAUDE.md DoD item does not apply.

**Attempt 3** (effort max, the last one allowed): sent with the remaining issue verbatim. Only `waitForSave()` and its tests may change.

- **Change:** the `waitForSave()` loop now also exits on `!hasErrorFor('general-info')`, the same as `waitForSectionSave`.
- **Tests:**
  - The timing test takes both mocks from one real-status variable: `'saving'` → `'error'`.
  - A new success test covers `'saving'` → `'saved'`.
  - The fault was proven by temporarily reverting the new condition. The test then failed with `confirming()` still true at 250 ms.
- **Implementer verification:** `bilateral-annual-updating|section-general-info` 87/87 green; regression 319/319 green; lint and build green.
- **Reviewer verdict:** PASS.
  > The remaining Issue 2 is fixed and the test for it can now fail. `waitForSave()` loops only while `hasPendingFor('general-info') && !hasErrorFor('general-info') && elapsed < SAVE_TIMEOUT_MS`, the same exits as `waitForSectionSave` … With attempt 2's fixes, all six attempt-1 issues are now resolved.
  - The Reviewer compared hunk headers of the attempt-2 and attempt-3 diffs. Nothing changed outside `waitForSave`, its tests and `CLAUDE.md`.

**Final: PASS on attempt 3**

- **Requirements covered:** `BIL-RAU-R-1` (S-1.1, S-1.2), `R-2` (S-2.2, catalogue reuse), `R-5` (S-5.1), `R-7` (S-7.1), `R-11` (S-11.1, S-11.2, S-11.3 client half). ACs: `AC-1`, `AC-2`, `AC-4` (unit), `AC-10`, `AC-13`, `AC-18`, `AC-19`. Defects: D5, D6, D10.
- **Decisions and deviations recorded:**
  - The `'core'` MDS group for section-general-info. Eight existing `setSectionFields` assertions gained the `'core'` argument; this is the approved exception.
  - `bilateral-auto-save.service.ts` was changed although it is outside T-8's Files list. Changes: the `lastGeneralInfoResponse` hook and its clearing in `reset()`. Design §2.1 lists this service as a changed layer.
  - Yes flushes immediately, because the service has no autosave timer. R-11's "~800 ms" premise is false. The Reviewer accepted this against design §2.2 step 2.
  - The `section-general-info` CLAUDE.md DoD item does not apply: that folder has no `CLAUDE.md`. The two type-specific pointers were updated.
  - New copy: the load-error text and the dialog wording, which mirrors W1/W2's `saveConfirmationModal`.
- **Advisory, for T-9 to watch:**
  - Editing another Section 1 field while the discontinuation save is in flight can hold "Saving…" for up to 15 s.
  - `rolesSE.isAdmin` is a plain property and can be stale.
  - The rendered-markup tests call `markForCheck()` instead of firing `answerChange.emit()` on the stub.
- **Cannot prove in jsdom:** placement, rendered wording, NG0103 in the real multi-select, and the dialog focus trap. T-9 owns these.

### BIL-RAU-T-9 — Real-browser + DB verification on prtest (HITL)

| Field | Value |
|---|---|
| Final status | **PASS** (owner-attested) |
| Date | 2026-09-29 |
| Executed by | Santiago Sanchez (owner), on prtest |

- **Checklist handed to the owner:**
  1. Yes, then reload.
  2. No with zero reasons: the warning appears and the button is disabled.
  3. Merge reason with a W1/W2 target and a W3 target, then confirm: the result becomes Discontinued, read-only, with no Submit.
  4. Admin Reopen, then save: the page becomes editable without a reload.
  5. A non-replicated result shows no block.
  6. A W1/W2 replicated result is unchanged.
  7. DB reads of `result`, `results_investment_discontinued_options` and `result_innovation_merge_split`.
- **Owner's verdict, verbatim:** "funciona perfecto validé tambien que se guardara en base de datos y si se guarda".
- **Evidence gap:** the DoD asked for screenshots and DB readings attached here. None were attached; the only evidence is the owner's statement above. The owner did not report which specific checklist steps or result ids were covered.
- **Covers:** `AC-1`, `AC-3`, `AC-4`, `AC-5` (rendered), `AC-12`, `AC-14`, `AC-15` (W1/W2 rendered), `AC-17`, `AC-18`; defect classes D7 and D8, as attested.

## Summary

- **Outcome:** all 10 tasks are `[x]`. The owner added T-10, a SQL injection fix, during execution. The owner also extended T-6 and T-8 with S-11.3: "Please provide a reason."
- **Review rounds:**
  - PASS on the first attempt: T-3, T-5, T-7, T-10.
  - PASS on the second attempt: T-1, T-2, T-4, T-6.
  - PASS on the third attempt: T-8.
  - No HALT, no Pivot.
  - Real defects caught by review:
    - a W1/W2 behavior change (the `?? []` in T-2);
    - tests that could never fail (T-4, T-8);
    - SQL whitespace drift (T-1);
    - a wipe of the MDS group, a stale status taken from another result, a 400 that was never shown, and a button enabled on a locked result (all T-8);
    - a pre-existing SQL injection (T-10).
- **Budget:** 9 tasks were planned; 10 ran (the tenth was added by the owner). Review rounds ran above the ~14 estimate, driven by T-8 (3 rounds) and the lens reviews on T-6 and T-10.
- **Environment incidents:**
  - API 429 limits, recovered by retries.
  - Classifier outages.
  - A `git stash` collision during T-5, after which stash was banned in briefs.
  - The owner's parallel commit `28a4bd678` reset the index. Baselines were then rebuilt from frozen diffs, and no work was lost.
- **Open follow-ups (not in scope):**
  - Reject non-integer or null discontinued-option ids: nested `@IsInt` or an `inactiveData` guard.
  - `returnErrorRes({debug: true})` logs whole driver errors.
  - A status change on discontinuation writes no `result-review-history` row. This matches W1/W2.
  - A lock notice for type 2 at status 4 (design §13).
  - Trim the over-cap `CLAUDE.md` files (shared `annual-updating`, `type-innovation-use`).
  - Kaizen candidates: ban `git stash`/`--fix` in briefs; "move as-is means token for token"; a fallback resolver needs conflicting-seed negative tests; mocks must model real service states.
- **Commits:** none yet. They are pending the owner's go-ahead, as three PRs (server / component move / bilateral).

## Constitution Impact: BIL-RAU-T-3

- **Module reshaped:** the `rd-annual-updating` component moved from `pages/results/.../rd-general-information/components/` to `shared/components/annual-updating/`, so a shared component was added.
- **Child guide:** its `CLAUDE.md` moved with it and was re-stamped. No new guide is needed.
- **Parent indexes:** `onecgiar-pr-client/src/CLAUDE.md` may need to list the new shared component under `shared/components`. `/akili-archive` should check this.
- **CodeGraph:** a re-index is pending, because the paths moved.
