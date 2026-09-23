# Execution Log — Bilateral Contributor Tagging

## Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/notifications/bilateral-contributor-tagging/` |
| Tickets | P2-3793 (US P2-3792, epic P2-3487) |
| Approval Mode | gated (inherited from `proposal.md`) — every task stops at the continue/pause gate |
| Branch | `JuanGuzman-io/review-p2-3793-understanding`, at `d2ac12f9e` = `origin/performance-refactor` tip (base branch confirmed) |
| Leader | Claude Opus 5.5 (T1) · Implementer `akili-implementer` (sonnet, T2) · Reviewer `akili-reviewer` (opus, T3) |
| Budget | 7 tasks · ~900 LOC · 2 review rounds. Escalate beyond 9 tasks or ~1,200 LOC |
| Started | 2026-09-22 |

### Environment setup (2026-09-22)

- Worktree had no `onecgiar-pr-server/.env`, no `onecgiar-pr-client/src/environments/*.ts` and no `node_modules`. Copied the env files from the main checkout (`~/GitHub/CGIAR/onecgiar_pr`, same commit `d2ac12f9e`, clean lockfiles) and symlinked both packages' `node_modules` to it. All four are gitignored.
- `docs/specs/kaizen-log.md` absent → no Active Lessons.
- Pre-existing uncommitted change `package-lock.json` (root) is not part of this spec; left untouched.

## Task Execution History

### BCT-T-1 — Extract the project-owner resolver — PASS (2026-09-22)

- **Attempts:** 1 · **Effort:** medium-high · **Skills:** `nestjs-expert`, `tdd` (per task list, no deviation)
- **Requirements covered:** BCT-R-1 / BCT-R-7 (resolution part), BCT-NFR-5 (partial, see advisory 1), BCT-R-12 (existing texts untouched); design §5.1, BCT-DD-1

**Attempt 1**
- Files: `onecgiar-pr-server/src/api/bilateral/utils/project-owner-center.util.ts` (new — `buildCenterIndex`, `resolveProjectOwnerCenter`, types) · `project-owner-center.util.spec.ts` (new) · `api/notification/services/result-tagged-notification.service.ts` (private `resolveProjectCenterCode` delegates; one `centerRepo.find()` per call) · `result-tagged-notification.service.spec.ts` (one fixture + one mock-interaction assertion)
- Verification: `npx jest --testPathPattern="project-owner-center.util"` red (module missing) → `1 passed, 6 tests`; `npx jest --testPathPattern="result-tagged-notification.service"` → `1 passed, 14 tests`; eslint on the 4 files quiet. `tsc --noEmit` not run.
- Reviewer: **PASS** — behavior-preserving extraction matching §5.1 / DD-1; the four DoD cases plus the alias-without-Center case are covered.

**Decisions**
- Leader: an alias hit whose code is absent from `clarisa_center` returns `{ code, institutionId: null }`, preserving today's behavior (the old method returned the alias code unchecked). Org code set but unmatched still falls through to the alias.
- Leader + Reviewer ruling on the Disqualifier: the existing assertion `centerRepo.findOne toHaveBeenCalledWith({ where: { institutionId: 67 } })` became `centerRepo.find toHaveBeenCalled()`. Ruled a mock-interaction change, not an outcome change: the fixture has no `sourceCenterAcronym`, so `getUserIdsByCenter('CENTER-06')` can only pass through the org-code path, and the util spec's two-Center org-hit case pins index selection.

**ADVISORY (4R, non-gating)**
1. Risk/Resilience: `resolveProjectCenterCode` runs inside the per-project loop (`result-tagged-notification.service.ts:107-108`), so `centerRepo.find()` runs once per project, including alias-only projects that made no query before. No output change (~15 rows).
2. Readability: `expect(centerRepo.findOne).not.toHaveBeenCalled()` in the alias test (spec ~:161) can no longer fail. Left untouched under the T1 Disqualifier.
3. Readability: `toHaveBeenCalledTimes(1)` would state the once-per-call contract more directly.
4. Reliability: `buildCenterIndex` keeps the last row on a duplicated `institutionId` (old `findOne` kept the DB's first). Only matters if the column is not effectively unique.
5. Verification: `tsc --noEmit` not run for T1.

**Forward pointers (to be copied into the named task's brief)**
- → **BCT-T-4** (edits this service): load the Center index once in `notifyTaggedBilateralProjects` / the new emitter and pass it to the resolver instead of per project (advisory 1, BCT-NFR-5); replace or delete the dead `findOne` not-called assertion deliberately (advisory 2).
- → **BCT-T-2 / BCT-T-3**: load the index once per call site with `buildCenterIndex(await centerRepo.find())`; do not copy the per-project pattern.
- → **BCT-T-7**: include server `npx tsc --noEmit` in the closing gates (advisory 5).

**Final verification:** green as above. Gate: gated mode — stopped for the user.

### BCT-T-2 — Add `owner_center_institution_id` to the projects catalog — PASS (2026-09-22, attempt 2)

Run in parallel with BCT-T-4 (disjoint files: `clarisa/clarisa-projects/*` vs `api/notification/*`), per user instruction 2026-09-22.

**Attempt 1 — Reviewer FAIL**
- Files: `clarisa-projects.service.ts` (injects `Repository<ClarisaCenter>`, one `find()` per `findAll`, spreads rows and adds the field through the T1 resolver) · `clarisa-projects.module.ts` (`TypeOrmModule.forFeature([ClarisaCenter])`, no cycle) · `clarisa-projects.controller.ts` (Swagger text) · `clarisa-projects.service.spec.ts` (5 cases)
- Verification: `npx jest --testPathPattern="clarisa-projects"` → 3 suites / 9 tests passed; eslint quiet; `npx tsc --noEmit -p .` exit 0. No real red run: the Implementer argued it instead.
- Reviewer FAIL (verbatim summary): the Falsifier is not covered. The only Alliance fixture (null org, `CIAT`) has the Center absent from the index and asserts `null`, which pins the failure condition. A `findAll` that reads `organizationCode` / `obj_organization` alone would pass all 5 tests. Violated: `tasks.md` BCT-T-2 Falsifier (line 62); `design.md` BCT-DD-4 Alternatives. Remediation: add a null-org, known-acronym case with the Center present that asserts its institution id; retitle the absent-Center test as the T1 decision; run a real red run.
- Leader rulings on the Reviewer's answers: (2) a failing Center load that breaks the whole catalog is **advisory** (BCT-NFR-1 covers save/submit/ingest only); (3) the `{ ...project }` spread does not affect serialization (no `ClassSerializerInterceptor`, `toJSON`, getters or lazy relations).
- ADVISORY: optionally degrade to `buildCenterIndex([])` with a warning if the Center load throws. `clarisa/` now imports from `api/bilateral/utils` (inverted layering, no runtime cycle); consider moving the resolver and alias map to `shared/` if a third consumer appears. `find()` includes inactive Centers, the same as T1.
- Rework: effort raised medium → high; the verbatim FAIL was sent to the same Implementer (attempt 2).

**Attempt 2: Reviewer PASS**
- Files: `clarisa-projects.service.spec.ts` only. Production code is byte-identical to attempt 1.
- Change: two positive alias cases, `CIAT` → `CENTER-03`/91 and `BIOVERSITY` → `CENTER-02`/42, both checked against `w3-center-alias.constants.ts`. The absent-Center case was retitled to describe the T1 decision.
- Verification:
  - Red run, with the pre-T2 service restored via `git show HEAD:…`: `Tests: 7 failed, 1 passed, 8 total`. Only `should be defined` passed.
  - Green run: `clarisa-projects.service` 1 suite / 8 tests; `clarisa-projects` 3 suites / 11 tests.
  - eslint on the 4 files: quiet.
- Reviewer: **PASS**. The Falsifier is now covered, and an `organizationCode`/`obj_organization`-only implementation would go red. Swagger and DoD are met.
- **Summary:**
  - Attempts: 2.
  - Effort: medium, then high.
  - Skills: `nestjs-expert`, `api-design-principles`.
  - Requirements covered: BCT-R-3 (data), BCT-NFR-3, BCT-NFR-5; design DD-4, §4.
- **ADVISORY (final):** the three from attempt 1 remain: the catalog does not degrade gracefully, the layering is inverted, and the index includes inactive Centers.
- **Forward pointer → BCT-T-6:** the field is `owner_center_institution_id` (number | null), and it is null when unresolved or when the alias Center is missing from `clarisa_center`.

### BCT-T-4 — Tagging emitter for bilateral submissions — PASS (2026-09-22, attempt 2)

Ran in parallel with BCT-T-2.

**Attempt 1: Reviewer FAIL**
- Files:
  - `api/notification/services/result-tagged-notification.service.ts`:
    - `notifyBilateralContributorsOnSubmission`
    - optional `leadIn` on `emitFor`
    - `loadCenterIndex()`, called once per call
    - the T1 delegate `resolveProjectCenterCode` removed; `notifyTaggedBilateralProjects` now resolves in memory
    - constructor gains `ResultsCenter` / `ResultsByProjects` repos
  - `notification.module.ts`: registers both entities in `forFeature`
  - spec: 28 tests; the T1-sanctioned `findOne` assertion was replaced by `find toHaveBeenCalledTimes(1)`
- Verification:
  - red first (method missing)
  - `npx jest --testPathPattern="result-tagged-notification.service"`: 28 passed
  - `npx tsc --noEmit` clean
  - eslint quiet
- T1 forward pointers applied: Center index loaded once (BCT-NFR-5); dead assertion replaced.
- Reviewer rulings on the Leader's questions:
  - AC36 is met by this method: a non-lead AfricaRice project is a project target, and the submitter is removed downstream.
  - Pool funding outcomes and texts are unchanged (BCT-R-12).
  - The dedup fixtures are real, and the Disqualifier does not fire (`result_id` is already phase-specific).
  - NFR-2 is covered structurally.
  - `error.message` in the log is acceptable.
- Reviewer FAIL, all test-only:
  1. No assertion that `emitterUserId` reaches `emitResultNotification`, and no AC36 fixture. Violates the DoD, the §5 row "R-7 · AC36" and BCT-R-7.
  2. No log-content assertion for ids-only warnings. Violates the §5 row "NFR-6" and BCT-NFR-6.
  3. The lead-in fallbacks (code; `a CGIAR Center`) are untested. Violates design §10 and §5.3 step 2.
- ADVISORY:
  - Rename the lead-skip test once the AC36 fixture exists.
  - `JSON.stringify(error)` on a non-Error could print an arbitrary object.
  - The result is read twice per submit.
  - The NFR-2 test only documents the point.
- Rework: effort raised high → xhigh. The verbatim FAIL went to the same Implementer (attempt 2).

**Attempt 2: Reviewer PASS**
- Files: spec only. The Implementer reports production code byte-identical to attempt 1.
- Added:
  - AC36 test: a non-lead project owned by `AR` → `getUserIdsByCenter('AR')`, project type, `lastEmitCall()[3] === EMITTER`.
  - Exact-string `logger.warn` assertions on the unresolved-project, degraded-lead-in and catch warnings.
  - Lead-in fallback tests: code `AR-CODE-Z` with no acronym; no leading row → `a CGIAR Center`.
  - Renamed the lead-skip test.
- Verification:
  - `npx jest --testPathPattern="result-tagged-notification.service"`: 31 passed.
  - `npx tsc --noEmit` clean.
  - eslint quiet.
- Reviewer: **PASS**. All three issues are fixed, and each new test fails if its behavior regresses.
- **Summary:**
  - Attempts: 2.
  - Effort: high → xhigh.
  - Skills: `nestjs-expert`, `tdd`.
  - Requirements covered: BCT-R-7..R-12 (status guard for R-10), BCT-NFR-1, NFR-2, NFR-6; design §5.3, §5.4, DD-5.
- **ADVISORY (final):**
  - `not.toContain('5')` / `'IITA'` add nothing beyond the exact string, and `'5'` is fragile if an id changes.
  - The warn spies don't silence output.
  - Carried from attempt 1: `JSON.stringify(error)` on a non-Error; the result is read twice per submit.
- **Forward pointer → BCT-T-5:**
  - The public entry point is `ResultTaggedNotificationService.notifyBilateralContributorsOnSubmission(resultId, emitterUserId)`. It never throws, and it guards status 5 + bilateral itself.
  - The service constructor now also takes `ResultsCenter` / `ResultsByProjects` repos. That doesn't matter to `BilateralService`, which receives the service through DI as `@Optional()`.

### Budget tripwire — 2026-09-22 (after T1, T2, T4)

- Actual so far: ~910 LOC (about 3/4 tests) across 3 of 7 tasks. Review rounds: T2 took 2 and T4 took 2, against a budget of 2 for the whole spec. The ~1,200 LOC escalation line is certain to be crossed once T3, T5 and T6 land.
- Cause: the falsifier-driven test depth. No scope was added, and there are still 7 tasks.
- **User decision (Juan David, 2026-09-22):** accepted going past the LOC line and continuing; T3 and T6 to run in parallel.

### BCT-T-6 — Lock and auto-select derived Centers in the form — PASS (2026-09-22, attempt 2)

Run in parallel with BCT-T-3 (the client and the server are disjoint).

**Attempt 1: Reviewer FAIL**
- Files:
  - `section-contributors.component.ts`: `ProjectOption.ownerCenterInstitutionId`; computed `lockedCenterInstitutionIds`; `unionLockedCentersIntoSelection()` used by `onProjectsChange` and `hydrateLeadAndSelection`; lock guards in `availableCentersComputed`, `onCentersChange` and `removeCenter`.
  - `.spec.ts`: 10 new tests. One existing `toEqual` shape gained `ownerCenterInstitutionId: null`.
  - Component `CLAUDE.md`: `Verified:` stamp, trap entry, test count.
- Verification:
  - Red run: `7 failed, 130 passed, 137 total`.
  - Green run: 2 suites, 137 tests, readonly spec included.
  - `ng lint`: clean.
- Reviewer rulings on the Leader's questions:
  1. Hydration order is safe: `hydrateWhenReady` waits for `centersReady && projectsReady`, and `projectsReady` is set after `availableProjects`.
  2. A project change persists once, and removing a locked chip persists nothing.
  3. The child CLAUDE.md edit is in scope, per the `onecgiar-pr-client/CLAUDE.md` §10 "Folder docs" rule. It is not a lifecycle side-effect write.
  4. The changed shape assertion is acceptable, and is not weaker.
- Reviewer FAIL (both test-only):
  1. The second half of R-4 is untested ("user then removes CIP → payload drops it"). Violates the §5 R-4 row and BCT-R-4.
  2. Union vs. replace is untested: every fixture starts with an empty selection. Violates the §5 R-1 row "keep user-selected Centers", BCT-R-1 and design §6.2.
- ADVISORY:
  - CLAUDE.md says "añadió 8" but 10 tests were added; the trap entry is misplaced.
  - A locked chip still shows an active "×".
  - The chip test does not pin the no-persist effect.
  - The late-catalog order is not documented by a test.
  - `ownerCenterInstitutionId?` should be required per §6.2.
- **Leader decision:**
  - The chip "×" is folded into the rework as scope already owned by T6, not as advisory growth. The BCT-R-3 scenario reads "tries to remove a locked Center, **including the chip**", and T7's manual gate would read an active × as "enabled".
  - The fix mirrors the lead chip (`@if` + `sc-chip-readonly`) in `section-contributors.component.html`, which is in the same component folder.
  - The CLAUDE.md count is corrected in the same pass.
- Rework: effort raised high → xhigh; the verbatim FAIL was sent to the same Implementer (attempt 2).

### BCT-T-3 — Derive owner Centers on save and on ingest — PASS (2026-09-22, attempt 2)

Ran in parallel with BCT-T-6.

**Attempt 1: parallel lens review (2 Reviewers). Data integrity PASS; resilience and test quality FAIL**
- Files:
  - `bilateral.service.ts`: public `ensureDerivedContributingCenters`; ingest call at :500, after `handleContributingCenters`.
  - `bilateral.service.spec.ts`: 10 tests.
  - `services/bilateral-center.service.ts`: call in `saveContributors` after the whole `sync*` block, guarded by `dto.contributing_bilateral_projects !== undefined`.
  - `bilateral-center.service.spec.ts`: 2 call-site tests; a stub on the `BilateralService` mock.
- Verification:
  - Real red run: method renamed, TS2551 in both specs.
  - Green run: 2 suites, 184 tests.
  - tsc clean; eslint quiet.
  - No constructor change; no existing assertion changed.
- Implementer's Not Done / Assumptions (verbatim): "The ingest call-site ordering … is verified by direct source inspection, not by an end-to-end `create()` test … I placed the `saveContributors` call after the *entire* sync* block … partners/programs don't touch `results_center`."
- **Data-integrity lens: PASS.**
  - The method follows §5.2 steps 1–7. It never deactivates and never calls `updateCenter`.
  - A reactivation writes only `{ is_active, last_updated_by }`.
  - A lead-flagged code (active or not) is skipped before the lookup.
  - The `leadingRows` query has no active filter, consistent with `syncContributingCenters`.
  - `SourceEnum` has only `Result` / `Bilateral='API'`, so the guard is correct.
  - Ingest order confirmed (:404 → :475 → :490 → :500).
- **Resilience and test-quality lens: FAIL** (Leader ruling: in scope, since it names design §10 / tasks §5 deliverables):
  1. No test pins either call site's position. The ingest `create()` is untested, and form-save ordering relative to `syncContributingCenters` is not asserted.
  2. The no-op tests can pass on a swallowed crash. The `is_active` filter is not pinned. The NFR-6 warnings are loosely matched, and "No CLARISA project found" is untested.
- ADVISORY:
  - The first-row lookup (`getAllResultsCenterByResultIdAndCenterId`, unordered) can leave two active rows on legacy duplicates. **Leader directed this into the rework as in scope**: it is tied to the falsifier "yields two CIP rows" and to the code's own "no duplicate" claim.
  - Check-then-insert race with no unique index. It already exists in the siblings; no migration allowed.
  - A single outer try/catch means one failed write stops the remaining codes.
  - The pool-funding test title says "no lookup" but does not assert it.
- **Spec gap raised for the user (both lenses): BCT-R-3 scenario 2 vs. design §5.2 guard.**
  - R-3 says a direct `PATCH` that omits CIP while its project remains still leaves CIP active.
  - The §5.2 guard, plus the T3 falsifier "a save without `contributing_bilateral_projects` triggers the lookup", means a centers-only PATCH deactivates CIP and nothing re-adds it.
  - The form always sends both keys (BCT-P-1), so the UI is safe; direct API callers are not.
  - Awaiting the user's decision; the guard stays as designed in the meantime.
- Rework: effort raised xhigh → max. The verbatim FAIL plus the directed lookup fix went to the same Implementer (attempt 2).

### Spec amendment — BCT-R-3 scenario 2 (2026-09-22)

- **User decision (Juan David):** narrow R-3 rather than widen the guard (the Leader's recommendation). Widening would have contradicted the T3 falsifier "a save without `contributing_bilateral_projects` triggers the lookup" and made every centers-only save pay the lookup.
- Amended:
  - `requirements.md` R-3 scenario 2: GIVEN a `PATCH` that includes the project list, plus a NOTE on the centers-only case.
  - `design.md` §1 accepted trade-off.
  - `tasks.md` §5 R-3 row.
- Correction closure sweep. Forward (old wording): `design.md:104` ("BCT-R-3, second scenario") still holds, because the form round-trip carries both keys. `tasks.md:74` cites the scenario by title, unchanged. Backward: `proposal.md` R-2 ("a direct API caller may be surprised") is historical and now narrower in practice; left as is. No code change.

**BCT-T-6 attempt 2 — Reviewer PASS**
- Files:
  - `.spec.ts`: two new tests. One checks that the auto-select is a union, not a replace (OTHER + CIP in both the selection and the payload). The other covers the second half of R-4 (after unlocking, `removeCenter(CIP)` drops it from the payload). The chip test also pins "no persist".
  - `.component.html`: a locked chip gets `sc-chip-readonly` and its × is hidden, mirroring the lead chip.
  - `CLAUDE.md`: count and position fixed.
  - `.ts`: unchanged from attempt 1.
- Leader decision (c) was tried and reverted. Dropping `?` on `ownerCenterInstitutionId` broke 13 existing spec literals under `tsc -p tsconfig.spec.json`. The Reviewer accepted keeping it.
- Verification:
  - jest: 2 suites / 139 tests. The readonly spec renders the real template and stays green.
  - `ng lint` clean.
- Reviewer: **PASS**. Every falsifier and every §5 row for T6 has a test that goes red on a wrong implementation. The chip reuses the existing readonly state, with no new token or copy.
- Leader inline fix after PASS: `CLAUDE.md` "BCT-T-6 añadió 10" → "12" (per the Reviewer: baseline 111, 111 + 12 = 123). Docs only.
- **Summary:**
  - Attempts: 2 · Effort: high → xhigh · Skills: `angular-developer`, `tdd`.
  - Requirements covered: BCT-R-1 (client scenarios), R-3 (incl. chip), R-4 (client half), NFR-4 (client guard); design DD-4, §6.
- **ADVISORY (final):** no Jest test checks the hidden × on a locked chip (the component spec stubs the template, and the readonly spec has no locked fixture).
- **Forward pointer → BCT-T-7:** the manual browser gate must check explicitly that a locked Center shows as disabled in the multiselect **and** that its chip has no × while its project is selected. It must also check that the multiselect does not emit `ngModelChange` on a programmatic model set (Jest cannot prove this).

**BCT-T-3 attempt 2: both lenses PASS**
- Files:
  - `bilateral.service.ts`: the per-code lookup changed from `getAllResultsCenterByResultIdAndCenterId` (unordered first row) to `find({ where: { result_id, center_id } })`. If any row is active it does nothing; otherwise it reactivates the lowest-id row (`{ is_active, last_updated_by }` only); otherwise it inserts.
  - `bilateral.service.spec.ts`:
    - `arrangeCreateHarness()` in `describe('create() — call-site ordering (BCT-T-3 / reusable by T5)')`.
    - Ingest ordering via `invocationCallOrder`.
    - A real-method ingest test with a throwing `save`, which asserts 201 and the exact log line.
    - The mock now honours `is_active`, with a test that an inactive project is ignored.
    - Both warnings are pinned to exact strings.
    - Tests for legacy duplicates and for lowest-id reactivation.
    - `logger.error` not-called assertions on most no-op tests.
    - The false "covered end-to-end elsewhere" comment is fixed.
  - `bilateral-center.service.spec.ts`: derivation is ordered after the real (spied) `syncContributingCenters`.
  - `bilateral-center.service.ts`: unchanged.
- Verification:
  - jest: 2 suites / 191 tests. tsc clean; eslint quiet.
  - Real red checks, performed and reverted: dropping `is_active` fails 2 tests; the old lookup fails 3; deleting the ingest call site fails 2; putting derivation before the sync fails the ordering test.
- Data-integrity lens: **PASS**.
  - The lead skip still runs before the lookup.
  - Any active row means no write.
  - Reactivation picks a deterministic numeric lowest id and touches nothing else.
  - The amended R-3 round-trip ends with exactly one active row.
- Resilience/test lens: **PASS**. Both attempt-1 issues are fixed with tests that fail on the wrong code, and the `find()` change is correct for the entity's int `id` and boolean `is_active`.
- **Summary:**
  - Attempts: 2.
  - Effort: xhigh → max.
  - Skills: `nestjs-expert`, `tdd`, `error-handling-patterns`.
  - Requirements covered: BCT-R-1..R-5 (R-3 as amended), NFR-1, NFR-3..NFR-6; design DD-2, §5.2.
- **ADVISORY (final):**
  - Five no-op/dedup tests still lack `logger.error` not-called. Nothing slips through, because the insert and reactivate tests catch it, but the two dedup tests cannot fail on their own.
  - Check-then-insert race with no unique index on `results_center (result_id, center_id)`. Same as the sibling sync code; the no-migration rule applies.
  - A single outer try/catch means one failed write stops the remaining codes; they converge on the next save.
- **Forward pointers → BCT-T-5:**
  - Reuse `arrangeCreateHarness()` for the ingest announce and `keep_editing` cases.
  - Assert derivation's `invocationCallOrder` < `announcePendingReview`'s, because BCT-R-9 needs the derived row to exist before the tagging read.
  - Assert the announcement runs after the transaction closure. Both call sites of `emitBilateralSubmittedNotification` move behind `announcePendingReview`.

### BCT-T-5 — `announcePendingReview` at both hooks — PASS (2026-09-22, attempt 2)

**Attempt 1: Reviewer FAIL**
- Skills: `nestjs-expert` plus **`tdd` (Leader deviation from tasks.md)**. Every earlier task in this spec failed its first review on tests that passed against a wrong implementation.
- Files:
  - `bilateral.service.ts`: `announcePendingReview` (two independent try/catch blocks, submitted then tagging); a trailing `@Optional()` `ResultTaggedNotificationService`; the ingest call at :556.
  - `services/bilateral-center.service.ts`: the `submitForReview` call at :2052.
  - Both specs: 6 `announcePendingReview` tests, the harness stub moved, 2 ingest `keep_editing` tests, and a test that `saveContributors` never announces.
- Verification:
  - Real red run (method renamed): TS2339.
  - Green run: 2 suites, 199 tests.
  - tsc clean; eslint quiet.
  - Grep for `new BilateralService(`: 1 hit, updated.
  - No DI cycle (BCT-P-10 holds).
- Existing assertions changed: the submit test now targets `announcePendingReview`, plus an assertion that the direct call no longer fires.
- Reviewer: production code conforms in full (call sites, post-commit position, §5.5 order, optional dependency, no cycle).
- Leader questions:
  - The derivation-before-announce assertion is absent. Ruled **advisory**: not in T5's falsifier, DoD or §5 rows.
  - Submit-side post-commit ordering is untested. Ruled **not required**: design §10 names post-commit for ingest only, and the code was verified by reading it.
- **FAIL:** the `keep_editing` tests swap in a hand-written copy of T4's status guard, so deleting the real guard stays green. This violates the T5 falsifier bullet 5, the §5 row "R-10 · `keep_editing`", design §10 and BCT-R-10.
- ADVISORY:
  - The post-commit anchor is `enrichBilateralResultResponse`, not the closure resolving.
  - No derivation-before-announce assertion.
  - The submit test's title overclaims.
  - The negative `keep_editing` submitted-emit check may be vacuous.
  - No `logger.error` `toHaveBeenCalledTimes(1)` check.
  - `@Optional()` is not proven under `new`.
- Rework:
  - Effort raised high → xhigh.
  - The verbatim FAIL goes back to the same Implementer.
  - Also in this pass: the vacuous-check advisory, because it touches the same tests.
  - Offered as optional and non-gating: the ordering and closure-closed assertions.

**BCT-T-5 attempt 2: Reviewer PASS**
- Files (spec files only; production code unchanged since attempt 1):
  - `bilateral.service.spec.ts`:
    - The two `keep_editing` tests now build a real `ResultTaggedNotificationService` via `arrangeRealTaggingService(statusId)`. Status 1 → no tagging emit. Status 5 → tagging emit to `[99]` plus the submitted notification.
    - The harness transaction mock sets `closed` after `await cb({})`, and the ingest announce asserts `closed === true`.
    - Derivation is asserted to run before announce.
  - `bilateral-center.service.spec.ts`: the submit test compares `invocationCallOrder`.
- Verification:
  - Red check: with the real T4 guard commented out, the negative test fails (`Received number of calls: 1`). The guard was restored afterwards; the Leader confirmed `result-tagged-notification.service.ts:156-162` is intact.
  - Green: 2 suites / 199 tests. tsc clean; eslint quiet.
- Reviewer: **PASS**. The `keep_editing` scenario runs the real guard, and every T5 falsifier and DoD item holds.
- **Summary:**
  - Attempts: 2 · Effort: high → xhigh.
  - Skills: `nestjs-expert`, `tdd` (Leader deviation, recorded above).
  - Requirements covered: BCT-R-10 (submit, ingest, `keep_editing`), the BCT-R-7/R-8 trigger, BCT-NFR-1; design DD-3, §2.2, §5.5.
- **ADVISORY (final):**
  - The submit-side ordering assertion (`bilateral-center.service.spec.ts` ~:1721) only proves "after the transaction call started", not "after commit". Its comment overclaims. The production code is post-commit (`:2046` → `:2052`), and the spec never required this test.
  - The negative `keep_editing` test does not itself assert that the tagging path was reached; the positive twin covers it.
  - `svc.__transactionState` is an ad-hoc property on the service under test.

### BCT-T-7 — Contract note and manual gates — partial (2026-09-22)

Docs and rollout task; there is no Implementer/Reviewer loop.
- **Change-log entry:** added by the Leader at the user's explicit request (2026-09-22). One row dated 2026-09-22 in `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` → "Change log (maintainers)", citing P2-3793. It says no field was added, removed or renamed (BCT-R-6, design §4.1).
- **Pre-merge automated gates, run by the Leader on the full working tree (all green):**
  - Server focused jest (`project-owner-center|clarisa-projects|bilateral.service.spec|bilateral-center.service.spec|result-tagged-notification`): 7 suites / 247 tests.
  - `npx tsc --noEmit` exit 0. eslint on the 13 touched server files, quiet. `nest build` exit 0 (covers the T1 advisory 5 `tsc` pointer).
  - Client `section-contributors` jest: 2 suites / 139 tests. `ng lint` clean. `ng build` exit 0.
- **Manual gates, not run.** Each needs the deploy (automatic on merge to `performance-refactor`) or access only the user has:
  - `npm run migration:check`: **not-run**. The `.env` copied from the main checkout points at an environment DB the user has not confirmed. No entity or migration file changed (verified with `git status`).
  - prtest: an Alliance-descended contributing project derives its Center. **not-run**
  - Browser: the derived Center shows disabled **and** its chip has no × while its project is selected; the multiselect emits no `ngModelChange` on a programmatic set (T6 forward pointer). **not-run**
  - Bell text for scenario 7 contains ` of your center` and the result link (BCT-P-7). **not-run**
  - `SHOW CREATE TABLE result_review_history` includes `UPDATE` in `action` (BCT-P-11). **not-run**
  - Tell Ángel that Part A goes beyond P2-3792 (BCT-OQ-1). **not done**
- Status: `[~]` until the manual gates are recorded.
