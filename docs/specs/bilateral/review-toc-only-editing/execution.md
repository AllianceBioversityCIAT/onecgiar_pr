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

### BIL-RTE-T-1 — Access helper and membership reads (in progress)

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
