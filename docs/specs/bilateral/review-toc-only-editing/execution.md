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
| BIL-RTE-T-0 (HITL) | ⏳ pending with the owner — blocks T-2 and T-5 |
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

## Constitution Impact: BIL-RTE-T-1

- New injectable `BilateralAccessService` at `onecgiar-pr-server/src/api/results/bilateral-access/`. `ResultsModule` provides and exports it, which adds to that module's public surface.
- No new child `CLAUDE.md`/`AGENTS.md` is needed. `onecgiar-pr-server/src/CLAUDE.md` / `AGENTS.md` could list it under `api/results`, and T-9 already adds "every new bilateral write calls the helper" to the drawer `AGENTS.md`.
- CodeGraph re-index pending (`codegraph sync`).
