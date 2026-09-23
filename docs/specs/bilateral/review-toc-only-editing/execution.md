# Execution Log — Bilateral review: Science Program may edit only ToC (`BIL-RTE`)

## Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/bilateral/review-toc-only-editing/` |
| Ticket | P2-3794 (epic P2-3478) |
| Approval Mode | gated |
| Branch | `JuanGuzman-io/review-p2-3794`, fast-forwarded to `origin/performance-refactor` @ `467b73515` on 2026-09-22 (it was at `staging` = `d2ac12f9e`, 2 commits behind; neither commit touches this spec's files) |
| Worktree setup | `onecgiar-pr-server/.env` and `onecgiar-pr-client/src/environments/*.ts` copied from the `timingila` worktree; `node_modules` symlinked to the main checkout |
| Leader | Opus 5.5 (T1) · Implementer `akili-implementer` (T2) · Reviewer `akili-reviewer` (T3) |
| Budget | 10 tasks · ≈ 650 LOC · 2 review rounds on T-1…T-3, 1 elsewhere (`design.md` §14) |

## Pre-flight status (2026-09-22)

| Item | State |
|---|---|
| Branch contains `performance-refactor` | ✅ after fast-forward |
| Env files in worktree | ✅ copied |
| Migrations | none planned |
| BIL-RTE-T-0 (HITL) | Check 2 observed (prtest, 2026-09-22, owner): `clarisa_portfolios` = 1 (null acronym, 2016) · 2 P22 2022 · 3 P25 2025 · 4 (null acronym, null start). The owner adds that P25 runs to 2030. **P-7 verified**: DD-6 (`start_date ≥ 2025`) stands, and portfolio 4 with a null start counts as false. Checks 1 and 3: `not observed` (owner decision, 2026-09-22). Check 3 only sized the R-9 impact for the ticket comment. Check 1 only decides whether the ticket may call P-2 a live regression, and T-2 keeps the fix either way. P-2 stays `assumed`, and the ticket describes it as a hardening, not a regression. T-2 and T-5 are unblocked. |
| BIL-RTE-OQ-1 | default (any linked SP may decide) assumed until the owner answers |

## Task Execution History

### BIL-RTE-T-4 — Scope ToC deactivation to the saved program — **PASS**

**Attempt 1** (2026-09-22, effort high, skills `nestjs-expert`, `tdd`)
- Files: `results-toc-results.service.ts`, `results-toc-results.service.spec.ts`.
- Implementer verification: red before the change, 3 failed / 18 passed (SP Y survives Yes, SP Y survives No, stale primary). Green after, 21/21. eslint clean. P-3 re-grepped: two callers, both bilateral.
- Leader note: the Reviewer was first briefed with a placeholder instead of the diff. The diff was then delivered as a scratchpad file (`t4.diff`), which the Reviewer read in full before its verdict.
- Reviewer: **FAIL** (verbatim)

> 1. **Discovered Issue:** `_buildTocScopeInitiativeIds` adds `null` to the scope whenever `primaryInitiativeId != null`. That variable is the saving program, not the owner. When a contributor (SP Y) saves ToC metadata with `initiative_id = Y`, the scope is {Y, null}, so `_deactivateMissingRecords` / `_deactivateAllActiveRecords` deactivate the owner's legacy null-initiative rows. A contributor save changes another program's rows.
>    - **Violated Rule:** design.md §5.2 step 1 ("`null` is added when the primary is in scope, so legacy rows with a null initiative are still cleaned **for the owner**") and §12 DD-4; requirements.md R-9 / R-9.a.
>    - **Remediation Suggestion:** Resolve the owner separately: `ownerInitiativeId = _normalizeInitiativeId(initSubmitter?.initiative_id, result?.initiative_id)`. Add `null` only when `ownerInitiativeId != null && scope.has(ownerInitiativeId)`. Pass `ownerInitiativeId` into the helper. Add a red-first test: `initSubmitter` returns 50, payload `initiative_id: 99`, an active row with `initiative_ids: null` → that row is NOT deactivated, on both Yes and No. Make the existing "legacy null-initiative row" test set `initSubmitter` to 50 explicitly.
>
> ADVISORY (readability): in this method `primaryInitiativeId` means the saving program, while the design's "primary" means the owner. After the fix, consider renaming it (e.g. `savingInitiativeId`) next to `ownerInitiativeId`, so T-5 builds on the right meaning.

**Attempt 2** (2026-09-22, effort xhigh)
- Change: `ownerInitiativeId` is resolved from `initSubmitter` → `result.initiative_id` only (never the payload). `primaryInitiativeId` is renamed `savingInitiativeId` inside `updateTocResultPartial`. `null` joins the scope only when the owner is already in the scope set. Two new tests (a contributor saves Yes / No → the owner's null row stays active). The owner null-row test now mocks `initSubmitter = 50`.
- Implementer verification: red against the attempt-1 logic, 2 failed / 21 passed (the two new tests). Green 23/23. eslint clean.
- Reviewer: **PASS**. "The ToC scope is now the saving program plus the initiatives named in the payload items, with null added only when the owner is in that scope. The initSubmitter lookup filters active rows, and all three falsifiers plus the two contributor cases are tested. The rename kept the same value at every place it is used, including the arguments to _handlePlannedResult and _handleUnplannedResult."
- ADVISORY (recorded, not gating):
  - RISK: any `initiative_id` named in a payload item joins the scope (§5.2 step 1 allows this), but the ToC access rule (§5.1) checks only the top-level `initiative_id`. A contributor who lists the owner's initiative in one item would bring the owner's rows and null rows into scope. **Escalated to the owner as a possible spec gap. No task added.**
  - READABILITY: `_handleUnplannedResult`'s parameter is still named `primaryInitiativeId`. Rename it when T-5 touches the method.
- Requirements covered: BIL-RTE-R-9.a (both the `toc-metadata` and `center/toc-mapping` paths), DD-4 (both challenge findings: stale primary, null legacy rows).
- Decisions: in this method "primary" meant the *saving* program. The design's "primary" (the owner) is now a separate variable. Scope = saving ∪ item initiatives ∪ {null iff owner ∈ scope}.
- Final verification: `npx jest --testPathPattern="results-toc-results.service.spec"` 23/23 · eslint clean.
- Budget: 2 review rounds (the budget is 1 outside T-1…T-3). +1 over, cause: the design's "primary" was ambiguous against the code's variable name. Noted, not tripped (the overrun is small and the task is closed).

### BIL-RTE-T-1 — Access helper and membership reads — **PASS**

**Attempt 1** (2026-09-22, effort xhigh, skills `nestjs-expert`, `tdd`)
- Files: `RoleByUser.repository.ts` + spec (new methods `hasActiveRoleOnInitiative`, `hasActiveRoleOnAnyInitiativeLinkedToResult`, each a single `EXISTS`), new `src/api/results/bilateral-access/bilateral-access.service.ts` + spec (`assertCenterWrite`, `assertTocWrite`, `assertDecision`), `results.module.ts` (provider + export; `BilateralModule` already imports `ResultsModule`, so there's no new edge and no `forwardRef`).
- Implementer verification: the helper spec was red first (did not compile). Then `bilateral-access.service.spec|RoleByUser.repository.spec` passed, 2 suites / 59 tests. eslint clean on 5 files, `tsc --noEmit` clean, `results.module.spec` and `role-by-user.service.spec` green.
- Diff delivered to the Reviewer as a scratchpad file (`t1.diff`, 771 lines, new files included).
- Reviewer: **FAIL** (verbatim)

> 1. **Discovered Issue:** The Decision rule does not require the initiative itself to be active. `hasActiveRoleOnAnyInitiativeLinkedToResult` joins `role_by_user` to `results_by_inititiative` only. It checks `rbu.active > 0` and `rbi.is_active > 0`, but never `clarisa_initiatives.active`. The ToC rule, in the same helper, does require `ci.active > 0`, because it goes through `getContributorInitiativeAndPrimaryByResult` (resultByInitiatives.repository.ts:367-371). So one helper uses two different meanings of "an SP linked to the result". A member of a retired or deactivated initiative whose `rbi` row is still active would pass the Decision rule (approve/reject), but would be refused for the ToC write on the same result.
>    - **Violated Rule:** design.md §5.1, Decision row ("the user holds any active role on any SP actively linked to the result") read with the §5.1 ToC row, which the implementation enforces with `ci.active > 0`. Also the acceptance criterion in the Leader's brief: "Active" must hold on role_by_user, on the initiative, and on the link. tasks.md T-1 ("any initiative actively linked to result R").
>    - **Remediation Suggestion:** In `hasActiveRoleOnAnyInitiativeLinkedToResult`, add `INNER JOIN clarisa_initiatives ci ON ci.id = rbi.inititiative_id AND ci.active > 0` inside the `EXISTS`. Extend the "scopes the join…" spec to assert `ci.active > 0`. Optional: do the same in `hasActiveRoleOnInitiative`. It is safe today only because the ToC decision pairs it with the link check.
> 2. **Discovered Issue:** The 403 `warn` line has no endpoint. `_denyForbidden` logs `result=… rule=… user=…`. None of the three decisions accepts an endpoint, so a caller (T-2/T-3) cannot add it without writing a second log line of its own. The rule name maps to several endpoints (`center` covers 7 writes), so "rule" does not stand in for "endpoint".
>    - **Violated Rule:** design.md §9 ("A 403 from the helper logs result id, endpoint, rule name and user id at `warn`") and requirements.md §7 NFR Observability ("403s are logged with result id, endpoint and user id only"). T-1 lists "NFR Security/Observability" under Implements.
>    - **Remediation Suggestion:** Add an `endpoint: string` parameter to `assertCenterWrite`, `assertTocWrite` and `assertDecision` (a static route label such as `'general-info'`, never the raw URL or query string). Pass it through to `_denyForbidden` and log it. Assert it in the "logs a warn…" spec. T-2 and T-3 then pass their labels.
>
> ADVISORY (recorded, not gating):
> - RISK: `assertTocWrite` / `assertDecision` dereference `user.id` unguarded (a missing user gives a 500 instead of a 403).
> - RISK: `isUserAdmin` reads only `isAdmin[0]`. Pre-existing and mandated by DD-3, so it goes in the P2-3794 comment.
> - RELIABILITY: the Center-user persona is mocked like the non-member, and the SQL behaviour is proven only by clause-presence checks. Record it for the T-9 HITL: a Center user, and a user with two roles on one SP, against prtest.
> - RESILIENCE/PERF: the ToC path runs 3 queries (admin, role, link). The spec does not count the admin read.
> - READABILITY: the 403 text "under Science Program review" is misleading for membership denials.
> - SCOPE: `package-lock.json` is modified in the tree but is not part of T-1. Do not commit it with this task.

**Forward pointer → T-2 / T-3:** each call to the helper must pass a static endpoint label (e.g. `'general-info'`, `'title'`, `'toc-metadata'`, `'review-decision'`).

**Attempt 2** (2026-09-22, effort max)
- Changes:
  - Both membership reads now `INNER JOIN clarisa_initiatives ci … AND ci.active > 0`.
  - All three decisions take `endpoint: string`. The signatures are `assertCenterWrite(result, endpoint, user)`, `assertTocWrite(result, initiativeId, endpoint, user)` and `assertDecision(result, endpoint, user)`. The log line is `result=… endpoint=… rule=… user=…`.
  - A fail-closed guard (`!user?.id` → 403) runs before any repository call. This came from an advisory and was kept to one line plus two tests, as the Leader allowed.
- Implementer verification: `bilateral-access.service.spec|RoleByUser.repository.spec` 2 suites / 64 tests passed · eslint clean (5 files) · `tsc --noEmit` clean.
- Reviewer: **PASS**. "Both attempt-1 FAILs are fixed: all three activity conditions are enforced in both membership reads, and the helper logs the endpoint. The matrix still matches design §5.1 in every cell, admin is still checked first, the fail-closed guard throws before any repository call, and the wiring has no cycle and no forwardRef."
- ADVISORY (recorded, not gating):
  - RISK: a call with no user id gets 403 even at status 1/8, where a non-admin normally gets 409. T-3's specs must not expect 409 for such a call.
  - RISK: `endpoint` is interpolated into the log. Callers must pass string literals, never request data.
  - RELIABILITY: the SQL is proven only by substring assertions. **T-9 HITL item:** a Center user, a user with two roles on one SP, and a retired initiative, all tried in prtest.
  - PERF: the ToC path runs 3 queries (admin, role, link), and the spec does not count the admin read.
  - RISK: `isUserAdmin` reads row [0] only (pre-existing, DD-3). Mention it in the P2-3794 comment.
  - READABILITY: the 403 text "under Science Program review" is misleading for membership denials.
  - SCOPE: `package-lock.json` is not part of T-1. Excluded from the commit.
- Requirements covered: BIL-RTE-R-2 / R-5 / R-6 (rules), R-3 (admin first), NFR Security/Observability, DD-1, DD-3.
- Final verification: 64/64 · eslint clean · tsc clean.
- Budget: 2 review rounds (within the budget of 2 for T-1).

**Forward pointers → T-2 / T-3 (carry into their briefs):**
- Pass string-literal endpoint labels.
- Do not expect a 409 from `assertTocWrite` for an identity-less call.
- T-3 owner decision pending on the T-4 advisory: should the ToC rule also check each payload item's `initiative_id`?

### BIL-RTE-T-7 — Lock geography Yes/No in the drawer — **PASS**

**Attempt 1** (2026-09-22, effort medium, skill `angular-developer`)
- Root cause: the drawer already passes `[readOnly]="!canEditDataStandards()"` into both `app-geoscope-management` sites (`result-review-drawer.component.html:341,370`, unchanged). The component bound its two `app-pr-yes-or-not` fields to `isKnowledgeProduct` only, and the drawer sets the global `RolesService.readOnly` to false for any program member, so both choices were clickable for a non-admin.
- Files: `geoscope-management.component.html` (both Yes/No now bind `this.readOnly || this.api.dataControlSE.isKnowledgeProduct`, matching the sibling controls). New CT `result-review-drawer.geography-lock.cy.ts` (6 tests; mounts `GeoscopeManagementComponent`, and its `before()` pins the drawer's two call sites by reading the HTML).
- Implementer verification: red before the fix, 4/6 failing ("Found '4', expected '0'"). Green: 6 passing; drawer-folder CT 17/17; Jest `geoscope-management|result-review-drawer|section-geography|rd-geographic-location` 14 suites / 434 tests; `ng lint --quiet` clean.
- Consumers: innovation-package-creator:90, step-n1:20 and rd-geographic-location:16/:51 bind no `[readOnly]`, so the default `false` is unchanged. `section-geography` does not use the component.
- Not Done / Assumptions (verbatim): "The task's falsifier text says 'Mount the drawer' — I mounted GeoscopeManagementComponent directly instead, per the same documented precedent (approve-tooltip.cy.ts's MOUNT DECISION) that mounting ResultReviewDrawerComponent in CT is impractical (~15-service DI graph, chained HTTP effects). The chip/Approve-enabled claims (R-1.a's 'must NOT show the chip', 'Approve stays enabled', R-6.b) are therefore verified by code-path reasoning documented in the spec file (cited line numbers), not by a rendered assertion on the drawer's chip/button."
  - Leader adjudication: this changes how the test mounts, not what the task delivers. The Reviewer was asked to rule on it.
  - Environment note: the Implementer restored `cypress-real-events` with `--no-save --no-package-lock` into the shared symlinked node_modules. `package-lock.json` is untouched.
- Reviewer: **FAIL** (verbatim)

> 1. **Discovered Issue:** Nothing proves R-1.b's "the change is accepted and 'Save data standards' is offered". The admin click is proven to change `body.has_regions`. Nothing shows that the change marks the drawer as unsaved (which is what enables the Save button at html:647), or that the button is gated by `canEditDataStandards()`. The template substring checks match other blocks. The same untested step (a geography change marks the snapshot dirty) also underlies the recorded "Approve stays enabled" reasoning. If `geographicScope` ever left the normalizer, both claims would break silently. The Not Done note records the chip/Approve gap but presents the Save clause as asserted.
>    - **Violated Rule:** `docs/specs/bilateral/review-toc-only-editing/tasks.md` §BIL-RTE-T-7 Falsifier ("As an admin → the value changes and 'Save data standards' appears") and `requirements.md` R-1.b; `.agents/reviewer.md` §3 ("A presence-assertion is not a behavioral proof").
>    - **Remediation Suggestion:** Add cases to the drawer's own Jest spec, `result-review-drawer.component.spec.ts`, next to the `canApprove` block at :374. The spec already builds the drawer, so this is cheap.
>      - (a) Set `resultDetail` and call `captureDataStandardSnapshot()`. Then set `resultDetail().geographicScope.has_regions = true`, the exact change the admin's click makes. Expect `hasDataStandardUnsavedChanges()` true and `canApprove()` false.
>      - (b) Render as admin with that change and assert the "Save data standards" button is present and enabled. Also assert it is absent when `canEditDataStandards()` is false.
>      - Alternatively, narrow the `before()` regex to the Save block (html:635-655) and record R-1.b as an explicit gap in `execution.md` next to the chip/Approve gap. That is the weaker option.
>
> Reviewer accepted: the component-level mount precedent (both existing drawer CT specs mount children), the verified code-path claims (`fields.geographicScope` is the snapshot object, and the chip sits inside `@if (canEditDataStandards())` at html:635-641), the disqualifier (`@Input() readOnly = false`, ts:19) and the consumers.
>
> ADVISORY (recorded, not gating):
> - READABILITY: the CT file carries about 55 lines of header prose. Move it to `execution.md` and leave a 3-4 line pointer.
> - RISK (pre-existing, outside the diff): the second `app-geoscope-management` (html:361-373) gets an object literal as `[body]`. An admin's extra-scope Yes/No edits write into that literal and may never reach the snapshot or save payload. It is now locked for non-admins, so nothing regresses. Note it in the P2-3794 comment for the R-1.b admin path.

**Attempt 2** (2026-09-22, effort high)
- Changes: in `result-review-drawer.component.spec.ts`, a new describe block "Save data standards — R-1.b behavioral proof".
  - (a) Snapshot, then `geographicScope.has_regions = true`. Asserts `hasDataStandardUnsavedChanges()` is true and `canApprove()` is false.
  - (b) Takes the real Save block from the drawer HTML, brace-matched from the `<!-- Admin Save Changes for Data Standards -->` marker, and renders it against the real class. Asserts the button is present and enabled after the change, and that the whole block is absent when `canEditDataStandards()` is false.
  - The CT header prose is trimmed to a 4-line pointer to this entry. The component fix is unchanged.
- Falsifier: `geographicScope: geo` was removed from `normalizeDataStandardForComparison`. The file was backed up to the scratchpad, not stashed. Result: (a) red (unsaved false) and (b) red (button disabled). After the revert the file is byte-identical and the tests are green.
- Implementer verification:
  - Drawer-folder CT: 3 + 6 + 8 passing, exit 0.
  - Jest `geoscope-management|result-review-drawer`: 11 suites / 332 tests.
  - `ng lint --quiet`: clean.
- Reviewer: **PASS**. "The attempt-1 issue is closed. The new Jest cases prove that the admin's geography change marks the data standards as unsaved, blocks Approve, and enables the real 'Save data standards' button. They also prove the whole Save block disappears when `canEditDataStandards()` is false."
  - The Reviewer confirmed (b) is not circular: only the markup is swapped, and the gating and `[disabled]` binding are the real code.
  - It also confirmed the extraction fails loudly: the marker, the `@if`, depth 0, the text and the binding are all asserted.
- ADVISORY (recorded, not gating):
  - RELIABILITY: (b)'s admin half should assert `disabled === true` before the change, so it doesn't rely on the manual falsifier run.
  - READABILITY: the two whole-file `include` checks in the CT `before()` are now redundant with the Jest extraction.
  - RISK (from attempt 1, pre-existing): the drawer's second `app-geoscope-management` gets an object-literal `[body]`, so an admin's extra-scope edits may not reach the save. Put it in the P2-3794 comment.
- Recorded gap: "must NOT show the chip" and the non-admin "Approve stays enabled" rest on code-path reasoning, since the chip sits inside `@if (canEditDataStandards())` (html:635-641) and the value can't change. There is no rendered drawer mount. T-9 HITL checks it in prtest.
- Requirements covered: BIL-RTE-R-1.a, R-1.b, R-1 (inspect ≠ unsaved), R-6.b (client).
- Budget: 2 review rounds against a budget of 1 for T-7. Recorded; tripwire not treated as tripped (same cause as T-4: a second evidence round, no scope growth).

### BIL-RTE-T-3 — Enforce the ToC and Decision rules — **PASS**

**Owner decision (2026-09-22):** the item-initiative question (from the T-4 advisory) takes the simplest check that covers the need. This is DD-7, written into `design.md` §5.1 and §12 and into `tasks.md` T-3 before the Implementer was spawned.

**Attempt 1** (2026-09-22, effort high, skills `nestjs-expert`, `tdd`)
- Files:
  - `results.service.ts`
    - `BilateralAccessService` is injected.
    - `reviewBilateralResult` calls `assertDecision(result, 'review-decision', user)` inside the transaction, before the status and justification checks.
    - `updateBilateralResultTocMetadata` calls `assertTocWrite(result, initiative_id, 'toc-metadata', user)` in place of the old validator, then the new `_assertTocItemsMatchProgram` (DD-7).
    - The catch blocks translate `ForbiddenException`.
  - `bilateral-access.service.ts` + spec: a public `isAdmin(user)`, with 3 tests.
  - `result.spec.ts`: 4 ToC/DD-7 cases, "non-member approves → 403", and the REJECT-without-justification test updated.
- Implementer verification:
  - Red: 7 failed / 106.
  - Green: `result.spec|bilateral-access|results-toc-results` 13 suites / 362 tests.
  - eslint and tsc clean.
- Not Done (verbatim): "`_validateBilateralResultForUpdate` was **not deleted** — it still has 3 live callers outside this task's two named endpoints (`updateBilateralResultReview`/general-info, `updateBilateralResultTitle`, and a DAC-tag update method). The task's DoD phrasing is conditional ('removed **or has zero callers**'); since callers remain, the validator stays, per scope discipline."
  - Leader adjudication: the DoD is conditional, and the remaining callers are Center writes that T-2 replaces. **Forward pointer → T-2:** delete the validator once general-info, title and DAC-tags use `assertCenterWrite`.
- Reviewer: **FAIL** (verbatim, condensed only where marked)

> 1. **Discovered Issue:** The new required constructor param breaks bootstrap for two modules. Only `ResultsModule` provides `BilateralAccessService` (`results.module.ts:232`). `ResultsService` is also declared in its own right in `DeleteRecoverDataModule` (`delete-recover-data.module.ts:170`, imported by `app.module.ts:101`) and in `ResultsKnowledgeProductsModule` (`results-knowledge-products.module.ts:99`). Neither provides `BilateralAccessService` or imports a module that exports it. Nest resolves a provider's dependencies inside the module that declares it, so startup will throw `UnknownDependenciesException`. This is the outage from 3 Sep 2026 again: `result-innovation-merge-split.module.ts:5-22` records the same failure. The Jest runs cannot catch it. The code comment at `results.service.ts:207-209` is wrong.
>    - **Violated Rule:** `tasks.md` §BIL-RTE-T-3 Consumers; the reviewer contract's Stability & Integrity check (the application must boot); `design.md` DD-1.
>    - **Remediation:** follow the `result-innovation-merge-split.module.ts` pattern: add a `BilateralAccessModule`, import it in the three modules, check for a cycle (no forwardRef), fix the comment, and prove it by booting the app. Jest green does not count.
> 2. **Discovered Issue:** Falsifier bullet 4 ("A program user approves at status 5 → 6") is not asserted. The only approve test (`result.spec.ts:1758-1789`) checks only `status === OK` and the message. `newStatusId` at `results.service.ts:4109` is never assigned (older than this task).
>    - **Violated Rule:** `tasks.md` §BIL-RTE-T-3 Falsifier bullet 4 and DoD; `requirements.md` R-6.b.
>    - **Remediation:** assert `manager.update` was called with `(Result, { id: 100 }, objectContaining({ status_id: 6 }))`, and that `assertDecision` was called.
> 3. **Discovered Issue:** The seam tests for bullets 1 and 3 mock the helper to reject no matter what it is passed. No test asserts the arguments to `assertTocWrite` or `assertDecision`.
>    - **Violated Rule:** `tasks.md` §BIL-RTE-T-3 Falsifier bullets 1 and 3; `design.md` §10 (wiring); reviewer contract §3.
>    - **Remediation:** assert `toHaveBeenCalledWith(objectContaining({ id: 100, status_id: 5 }), SP_X, 'toc-metadata', userTest)` and `(objectContaining({ id: 100 }), 'review-decision', userTest)`, and add an allow-path test for each.
> 4. **Discovered Issue:** DD-7 adds an extra DB query on every `toc-metadata` save. `isAdmin(user)` at `results.service.ts:5240` repeats `isUserAdmin`, and the "reused" comment is wrong.
>    - **Violated Rule:** `design.md` §12 DD-7 Consequences ("no extra query"); §8 ("At most two indexed reads per guarded write").
>    - **Remediation:** run the in-memory loop first and call `isAdmin` only on a mismatch, or have `assertTocWrite` apply DD-7 after its own admin short-circuit.
>
> Adjudication highlights: DD-7 cannot be bypassed within its wording (Number() coercion; null and undefined skipped; 0, "" and NaN fail closed; runs before any write). The ForbiddenException translation is faithful. Behaviour changes that follow from the ordering:
> - a non-member's reject without justification → 403 (was 400);
> - a non-member at status ≠ 5 → 403 (was 409);
> - a reject without justification on a missing result → 400 "not found" (was 400 "Justification is required").
>
> ADVISORY:
> - RISK (highest): a residual R-9 bypass. `_updatePlannedTocResult` (`results-toc-results.service.ts:2533`) updates by `result_toc_result_id` alone. An SP-Y member can send SP X's row id with `initiative_id` omitted, and the row is overwritten and reassigned; a row of another result can be targeted too. `_handleIndicators` was not audited. → **Leader action:** folded into a DD-7 amendment under the owner's "simplest check that covers the need" mandate (design §12, tasks T-3), and carried into attempt 2.
> - RISK/OBSERVABILITY: the DD-7 403 skips `_denyForbidden` (no warn log, and the message is not in the §4.1 form). → carried into attempt 2 (the amendment requires the helper deny path).
> - RELIABILITY: a non-array `result_toc_results` gives a 500. An `Array.isArray` guard returning 400 would be cleaner.
> - RESILIENCE: the membership reads run outside the transaction's connection (minor; G-1).
> - READABILITY: remove the stale "reused" wording.

**Attempt 2** (2026-09-22, effort xhigh)
- Changes:
  - New `bilateral-access.module.ts`, imported by `ResultsModule`, `DeleteRecoverDataModule` and `ResultsKnowledgeProductsModule`, with no forwardRef.
  - Approve test asserts `status_id: 6`. Exact argument assertions on `assertTocWrite` and `assertDecision` for the deny and allow paths.
  - Public `isAdmin` removed. DD-7 now lives inside `assertTocWrite`, after its admin short-circuit.
  - DD-7 amendment: row ownership (one `find` on the payload's row ids) and `results_id` mismatch (in memory). All go through `_denyForbidden` with rule `'toc'`.
  - An `Array.isArray` guard returns 400.
  - The `_handleIndicators` audit led the Leader to add the `results_id` clause to the DD-7 amendment (design §12, tasks T-3) before review.
- Boot proof: `npm run start:dev` mapped every route, including `/api/manage-data` and `/api/results/results-knowledge-products`, and logged "Nest application successfully started". The EADDRINUSE on 3400 came after that, from another local instance. No `UnknownDependenciesException`.
- Implementer verification: jest `result.spec|bilateral-access|results-toc-results|delete-recover-data|results-knowledge-products` 21 suites / 508 tests. eslint and tsc clean.
- Reviewer: **FAIL** (verbatim)

> 1. **Discovered Issue:** The new cross-result check runs before the status check. In `bilateral-access.service.ts`, `assertTocWrite` evaluates `_itemNamesAnotherResult` (diff lines 587-593) ahead of `_isPendingReview` (595-599). So a non-admin at status 1, 3 or 8 whose payload carries a mismatched `results_id` gets 403 instead of the 409 the spec keeps. Nothing is written either way, so the order buys no security: it only saves one comparison in memory, because the status check is in-memory too. It also makes the rule inconsistent with itself, since the other two DD-7 checks run after the status check and give 409. The only accepted exception to "409 first" is the identity-less call (a T-1 forward pointer).
>    - **Violated Rule:** `design.md` §5.1, ToC write row ("409 if status ≠ 5 (kept from today); 403 otherwise"); `tasks.md` §BIL-RTE-T-3 Description ("keeping the 409 for a non-admin at status ≠ 5").
>    - **Remediation Suggestion:** move the `results_id` check to just after the status check and before the `Promise.all` membership reads. Add a helper test: a non-admin at status 1 with `results_id: RESULT_ID + 1` → `ConflictException`. Fix the doc comment at diff lines 555-557.
>
> Reviewer confirmed: issues 1–4 from attempt 1 are closed (Nest resolves DI before "successfully started", so the boot proof holds). The owner-null rule matches DD-4. `Number()` coercion is consistent and fails closed. Every check runs before any write, on every traced write path. The duplicated repositories are stateless.
>
> ADVISORY:
> - RISK: `BilateralAccessModule` also exports `RoleByUserRepository` and `ResultByInitiativesRepository`, which leak through `ResultsModule`'s re-export. Export only the service.
> - RELIABILITY: row ownership keeps `0` and `""` as ids. `updateTocResultPartial:2292` treats a falsy id as a new row, so a drawer sending `0` would get a false 403. Skip falsy ids.
> - READABILITY: several comments narrate the rework history. Trim them.

**Attempt 3** (2026-09-22, effort xhigh)
- Changes:
  - `assertTocWrite` order is admin → user-id guard → status (409) → `results_id` → membership reads → item initiative → row ownership. New test: a non-admin at status 1 with a mismatched `results_id` gets `ConflictException` and no repository call.
  - `BilateralAccessModule` exports only `BilateralAccessService`. A grep shows every importer declares the repositories itself.
  - Row ownership skips falsy row ids, as `updateTocResultPartial` does. New test.
  - Rework-history comments trimmed from production code.
- Implementer verification:
  - jest `result.spec|bilateral-access|results-toc-results|delete-recover-data|results-knowledge-products`: 21 suites / 510 tests pass.
  - eslint and tsc clean.
  - Boot `PORT=3411 npm run start:dev`: "Nest application successfully started", then "Application is running", with no DI errors.
- Environment note: the Implementer stopped its server with `pkill -f "nest start --watch"`, which matches any such process on the machine. The other local instance on 3400 was still listening afterwards.
- Reviewer: **PASS**. "The attempt-2 issue is closed … a non-admin at status ≠ 5 gets 409 before any DD-7 check can deny, as §5.1 requires … All three advisories were applied without regressions."
- ADVISORY (recorded, not gating): READABILITY. Some "rework attempt / Reviewer FAIL #n" comments remain in the spec files (`result.spec.ts`, `bilateral-access.service.spec.ts`).
- Behaviour changes recorded, following from the §5.1 ordering (for the P2-3794 comment):
  - A non-member rejecting without justification now gets 403 (was 400).
  - A non-member on `review-decision` at status ≠ 5 now gets 403 (was 409).
  - A reject on a missing result returns 400 "not found".
- Requirements covered: BIL-RTE-R-3.a (toc-metadata and review-decision), R-5, R-5.a, R-5.b, R-6, R-6.a, R-6.b (server), DD-1, DD-7 and its amendment (R-9 protection against foreign rows and results).
- Budget: 3 review rounds against a budget of 2 for T-3. Recorded. The tripwire is not treated as tripped: the third round came from the owner-mandated DD-7 amendment (added scope), not from repeated failure on the same issue.

**Forward pointers:**
- → T-2: delete `_validateBilateralResultForUpdate` once general-info, title and DAC-tags use `assertCenterWrite`, because they are its last 3 callers. Import `BilateralAccessModule`, never the service alone, in any module that declares `ResultsService`.
- → T-9 HITL: in prtest, try an SP-Y reviewer saving a ToC with an SP-X `result_toc_result_id` (expect 403), and approve/reject by a non-member.
- → P2-3794 comment: the pre-existing `newStatusId` at `results.service.ts:~4109` is never assigned, so `response.status` is undefined on review-decision. Out of scope, not fixed.

### BIL-RTE-T-2 — Enforce the Center-write rule at bilateral entry points — **PASS**

**Attempt 1** (2026-09-23, effort high, skills `nestjs-expert`, `tdd`, `api-design-principles`)
- Files:
  - `results.service.ts`: title, general-info and data-standard call `assertCenterWrite` (`'title'`, `'general-info'`, `'data-standard'`); new `assertGeographyCenterWrite`; the validator is deleted.
  - `results.controller.ts`: v1 geography guard, and the `title` Swagger text.
  - `bilateral-center.service.ts`: planned-result, toc-mapping and contributors are gated; catch blocks rethrow `HttpException`.
  - `geographic-location.service.ts` and `geographic-location.controller.ts`: the v2 guard.
  - Specs: result, results.controller, bilateral-center.service and geographic-location.service.
  - DI goes through the transitive `ResultsModule` → `BilateralAccessModule` export.
- Judgment call (Implementer): the validator's third caller was `updateBilateralResultReview` (data-standard, admin-only, writes `result.description`), not a DAC-tag method. It was gated as a behavioural no-op so the validator could be deleted.
- Red run (executed after the Leader asked; the first report inferred it from the code): HEAD's service was swapped in and restored byte-identical.
  - Case (a): `Expected: 200 Received: 409`.
  - Case (b) on bilateral-center: planned-result and contributors resolved (the write proceeded); toc-mapping threw BadRequest instead of Forbidden.
- Green run: jest `result.spec|bilateral-center.service.spec|geographic|results.controller.spec` 5 suites / 269 tests. `bilateral-center.controller.spec` 14/14 and `results.module.spec` 4/4. tsc and eslint (9 files) clean.
- Boot: **not verified**. The DB is unreachable (ETIMEDOUT, VPN down); asked the owner.
- Environment: the Leader stopped two orphaned `dist/src/main` processes from T-3's boots in this worktree (PIDs from 2026-09-22 16:55 and 17:05; one held 3411). The owner's instance on 3400 was not touched.
- Reviewer: **FAIL** (verbatim)

> 1. **Discovered Issue:** The deleted validator did two things: it loaded the result with `where: { id, source: SourceEnum.Bilateral, is_active: true }` and returned 400 "Bilateral result not found" when that failed, and it applied the status rule. Only the status rule was replaced. The title and general-info methods load with `where: { id, is_active: true }` and never check `source`. General-info even selects `source` and ignores it. Every W1/W2 result is at status 1, 2 or 3, never 5, so `assertCenterWrite` allows it. As a result, any authenticated non-admin can now rename, or rewrite the description, DAC tags and impact areas of, **any W1/W2 result, including Submitted ones**, through `PATCH api/results/bilateral/:id/title` and `/bilateral/general-info/:id`. Before this change both calls returned 400. Data-standard has the same gap: the new comment says `getCommonFieldsBilateralResultById` is "a bilateral-scoped query", but its SQL (`result.repository.ts:3464-3466`) filters only `r.id = ? AND r.is_active = 1`. None of the new tests uses a non-bilateral result on these three methods.
>    - **Violated Rule:** `tasks.md` §BIL-RTE-T-2 (the Center-write call *replaces* the validator; per design P-1 and DD-2, only the inverted status rule was meant to change); `design.md` §2.2 step 2 ("loads the result (id, **source**, status, version)"); §5.1 ("Placement: bilateral entry points only"); TRD §8; `api/results/CLAUDE.md` §7 ("`source = SourceEnum.Bilateral` drives review-workflow branching… Don't normalise this away").
>    - **Remediation Suggestion:** In title and general-info, add `'source'` to the select, and when `source !== SourceEnum.Bilateral` return `{ status: 400, message: 'Bilateral result not found' }` before any write. In data-standard, widen the check to `!currentCommonFields || currentCommonFields.source !== SourceEnum.Bilateral` and correct the comment. Add tests: a non-admin on a `SourceEnum.Result` row at status 1 gets 400 on all three, with no `manager.update` and no transaction.
> 2. **Discovered Issue:** Falsifier (b) is not asserted for the v2 geography write. No test proves `GeographicLocationController.saveGeographic` skips `saveGeoScopeV2` when `assertCenterWriteForBilateral` rejects, or that the check runs first.
>    - **Violated Rule:** `tasks.md` §BIL-RTE-T-2 Falsifier (b) ("each of the 7 writes → 403, and **no repository write mock was called**") and DoD ("(a)–(d) asserted").
>    - **Remediation Suggestion:** add `geographic-location.controller.spec.ts` mirroring `results.controller.spec.ts:256-280`: reject → `saveGeoScopeV2` not called; allow → the check is called with `(id, user)`, then `saveGeoScopeV2({ ...dto, result_id }, user)`.
>
> Reviewer confirmed: geography is at the entry points only (W1 `saveGeoScope`, `saveGeoScopeV2` and `results.service.ts:4448` untouched); non-bilateral results never reach the helper; no concrete DI risk (`GeographicLocationModule` already resolves `ResultsService` through the same `forwardRef`, and `ResultsModule` re-exports `BilateralAccessModule`); the `HttpException` rethrow only changes the new 403 path and leaks nothing; the Swagger status text matches.
>
> ADVISORY:
> - RISK (contract doc): the change log's own history records input-only and status-code changes on `/api/bilateral/center/*`, and root `CLAUDE.md` asks for an entry on every bilateral change. Consider one row.
> - RELIABILITY: planned-result and toc-mapping now return 404 for inactive or non-bilateral results (they used to write), and this is missing from the behaviour list. `saveContributors` still loads without `is_active: true`.
> - RELIABILITY: R-4.a names status 8 too; add a one-line status-8 case.
> - RESILIENCE: the helper runs inside `_dataSource.transaction` in title, general-info and data-standard. Move it just before `transaction(`.
> - READABILITY: the data-standard admin read is repeated (acceptable, and the comment explains it).
> - PERF: every W1 geography save does one extra PK read of `result` (negligible).
> - READABILITY: the general-info Swagger text doesn't mention the status-5 403.

**Attempt 2** (2026-09-23, effort xhigh)
- Changes:
  - The source check is restored on title and general-info (400 "Bilateral result not found" for non-bilateral) and widened on data-standard. Each has a `SourceEnum.Result` test.
  - New `geographic-location.controller.spec.ts`.
  - `assertCenterWrite` moved before `transaction(`. New status-8 case. `saveContributors` filters on `is_active: true`. General-info Swagger mentions the 403.
  - Change-log row 2026-09-23 in `bilateral-result-summaries.en.md`.
- Implementer verification: jest 6 suites / 277 tests; tsc and eslint (10 files) clean.
- **Boot verified by the Leader** (owner connected the VPN): `PORT=3411 npm run start:dev` on the attempt-2 tree logged "Nest application successfully started" and "Application is running http://localhost:3411". `BilateralCenterController`, `GeographicLocationController` and `ResultsController` were mapped, with no DI error. The tree was stopped by PID; the owner's 3400 instance was untouched.
- Reviewer: **FAIL**. Both attempt-1 issues are closed, with no regression. Remaining findings (verbatim):

> 1. **Discovered Issue:** In `updateBilateralGeneralInfo`, the Center-write check still runs after a write. Building `updates` calls `this._adUserService.resolveOrCreateContact(dto.lead_contact_person_data.mail, dto.lead_contact_person_data)` (`results.service.ts` around lines 5515–5522). When the mail is not already known, that inserts an `ad_users` row from data the client sent (`ad_users.service.ts:184-185`, `saveFromADUser`). So a non-admin at status 5 who sends `lead_contact_person_data` gets a row written and then a 403.
>    - **Violated Rule:** `tasks.md` §BIL-RTE-T-2 ("before any write"; Falsifier (b) "no repository write mock was called"); `design.md` §2.2 step 3; `requirements.md` R-2.
>    - **Remediation:** move `assertCenterWrite(..., 'general-info', user)` to just after the source check, before `const updates`. Add a falsifier-(b) case with `lead_contact_person_data: { mail }` asserting `resolveOrCreateContact` is not called and no transaction is opened.
> 2. **Discovered Issue:** The change-log row does not fully match the code:
>    - (a) says "all six", but seven endpoints are listed.
>    - (a) omits the new 404 on `center/contributors` for inactive results.
>    - (b) understates review-decision: before T-3, a non-member at status 5 with a valid payload **succeeded**.
>    - **Violated Rule:** `api/bilateral/CLAUDE.md` §8 (the doc and the code ship together).
>    - **Remediation:** say "all seven"; add the contributors 404; reword the review-decision sentence.
>
> ADVISORY: every W1 geography save does one extra PK read (acceptable); no DI risk.

**Attempt 3** (2026-09-23, effort xhigh)
- Changes:
  - `updateBilateralGeneralInfo` runs `assertCenterWrite('general-info')` right after the source check, before `updates` is built, before the uniqueness read and before `resolveOrCreateContact`. The duplicate call is removed.
  - New falsifier-(b) test with `lead_contact_person_data` and an `AdUserService` mock: 403, no contact write, no transaction.
  - Title and data-standard re-checked: only SELECTs or pure functions run before their checks.
  - The change-log row is corrected: seven endpoints, the contributors 404, and the review-decision 200 path from before T-3.
- Implementer verification: jest 6 suites / 278 tests; tsc and eslint clean. No module or constructor changed, so the attempt-2 boot (Leader, VPN on) stands.
- Reviewer: **PASS**. "Both attempt-2 findings are closed … no regressions."
- ADVISORY: every W1 geography save (v1/v2) does one extra PK read. Acceptable.
- Requirements covered: BIL-RTE-R-2 (R-2.a on all 7 endpoints, data unchanged, R-2.b), R-3.a (Center), R-4.a (status 1 and 8 → 2xx; red run 409 → 200), DD-1, DD-2. `_validateBilateralResultForUpdate` is deleted with zero callers, which closes the T-3 DoD pointer.
- Budget: 3 review rounds against a budget of 2 for T-2. Recorded. Round 2 was self-inflicted: the validator's deletion dropped its source check.

### BIL-RTE-T-8 — Center editor: no autosave racing the submit; pin R-7 for the Center — **PASS**

**Owner direction (2026-09-23):** "Aborda de una vez la T5 y T6. Pero asap", then T-8 as well. T-5, T-6 and T-8 ran in parallel, in separate packages and folders, under a minimal-change brief.

**Attempt 1** (2026-09-23, effort medium, skill `angular-developer`)
- Files: `bilateral-result-creator.component.ts` + spec, `section-toc.component.spec.ts`.
  - `triggerManualSave()` returns immediately while `isSubmitting()`.
  - `selectSection()` skips the flush, the wait and the error alert while submitting. The section still switches.
- Flush callers: creator `:717` (`selectSection`) and `:902` (`triggerManualSave`) are guarded. `bilateral-accordion.component.ts:59` is left untouched.
- Red: the two no-op cases went from 1 call to an expected 0.
- Disqualifier: `section-toc.spec` was green before the change (102/102), so R-7 already held for the Center.
- Green: `bilateral-result-creator.component.spec|section-toc.component.spec|bilateral-auto-save` 3 suites / 203 tests. The BIL-T-1 flush-on-navigate block stays green. `ng lint` clean.
- Not Done / Assumptions (Implementer): the section switch still proceeds while submitting, because the task names only the flush. The accordion flush was left alone, being outside the given boundary. Leader: the Reviewer adjudicated both as sound.
- Reviewer: **PASS**. "Save draft and the section-navigation flush both check isSubmitting() before writing, and the tests cover the true and false cases … The R-7 Center pin checks that the elements are absent from the real template's DOM, and it passed before the change."
- ADVISORY (recorded, not gating):
  - RELIABILITY: the accordion flush is rendered only in the wizard and the manual-create drawer, never in the editor. It cannot race a submit, since the submit dialog's overlay also blocks it. If an accordion is ever added to the editor, guard it too.
  - READABILITY: the "Yes" complement checks only `showDetailForm()`. A single DOM check would prove the "No" test can fail. "Level" is a broad substring; a data-testid would be sturdier.
- Requirements covered: DD-2 challenge mitigation (R-2.b side effect), R-7 (Center editor clause).

## Constitution Impact: BIL-RTE-T-1

- New injectable `BilateralAccessService` at `onecgiar-pr-server/src/api/results/bilateral-access/`. `ResultsModule` provides and exports it, which adds to that module's public surface.
- No new child `CLAUDE.md`/`AGENTS.md` is needed. `onecgiar-pr-server/src/CLAUDE.md` / `AGENTS.md` could list it under `api/results`, and T-9 already adds "every new bilateral write calls the helper" to the drawer `AGENTS.md`.
- CodeGraph re-index pending (`codegraph sync`).
