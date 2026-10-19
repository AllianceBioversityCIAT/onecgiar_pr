# Tasks — Result detail: leave the not-found screen, and send IPSR codes to the IPSR module

## 1. Scope of this task list

| Field | Value |
|---|---|
| Module / feature | `results` / Result detail routing |
| Linked spec | `requirements.md` (RDN-R-1..3) + `design.md` (RDN-DD-1..3, Premise Ledger P-1..P-11) |
| Ticket | P2-3969 |
| Base branch | `performance-refactor`. Fast-forward first: this checkout is 6 commits behind `origin/performance-refactor`, and none of those commits touch these files |
| Approval Mode | gated |
| Status | complete 2026-10-19 — merged into `performance-refactor` |

## 2. Pre-flight checklist

- [ ] Branch is up to date with `origin/performance-refactor` and has its own feature branch. Never commit to `staging`.
- [ ] `onecgiar-pr-client/src/environments/environment.ts` is present. It is gitignored; copy it into the worktree if it is missing, or every client suite dies with `Tests: 0`.
- [ ] Commands run from `onecgiar-pr-client/`. Run focused Jest only (`--testPathPattern`), never the full suite.

## 3. Task list

T1, T2 and T3 touch disjoint code. T2 and T3 share `result-detail.component.ts` and its spec, so they run in sequence (T2 → T3) to avoid edit conflicts.

---

### [x] RDN-T-1 — Guard lets the navigation through when no section is mounted (Bug Mode regression)

- **Type:** client + tests
- **Description:**
  - In `UnsavedChangesGuard.canDeactivate`, add an early branch for a missing component: consume the silent flag, then return `true`. This is RDN-DD-1.
  - Add the regression tests. They must be written and seen red first.
- **Implements:**
  - RDN-R-1, scenario "Leaving the not-found screen", including its `BUT` clause (no cancel, no TypeError) and its `AND IT MUST` clause (error screen too).
  - RDN-R-1, scenario "Guard behaviour with a mounted section is unchanged", including its `AND IT MUST` clause (`UCA-R-1`, `UCA-R-2`, `UCA-DD-2`).
- **Design refs:** RDN-DD-1 (and its Step 2.3 challenge); P-1, P-2, P-3, P-4.
- **Files:**
  - `src/app/shared/guards/unsaved-changes.guard.ts`
  - `src/app/shared/guards/unsaved-changes.guard.spec.ts`
  - a new router-level spec next to it: `unsaved-changes.guard.routing.spec.ts`
- **Depends on:** — · **Blocks:** —
- **Estimate:** S · **Review:** `checklist` (one-line change to a shared guard; T1's consumer list is the 19 routes, covered by the existing specs)
- **Tests:**
  - **Unit — `null` and `undefined`:** `canDeactivate(null)` and `canDeactivate(undefined)` return `true`, do not throw, and consume a silent flag set beforehand. Afterwards `consumeSilent()` returns `false`.
  - **Router-level — hidden outlet:** a parent stub component renders its `<router-outlet>` only under a flag that is false, mirroring `result-detail.component.html:64`. Its child `{path:'', component: SectionStub, canDeactivate:[UnsavedChangesGuard]}` therefore never mounts. Navigate into the child, then `navigateByUrl('/other')`. The promise resolves `true` and the router URL is `/other`.
  - **Existing specs stay green:** the 9 cases in `unsaved-changes.guard.spec.ts`, and both cases in `rd-general-information-routing.canDeactivate.spec.ts`. The second one (`:103`) is the static route-table check that RDN-DD-1's challenge relies on.
- **Verification:**
  - `npx jest --silent --reporters=summary --no-coverage --testPathPattern="shared/guards|rd-general-information-routing"`
  - `npx ng lint --quiet`
- **Falsifier:** revert the null branch, with the tests left in place. The unit test goes red on `TypeError: Cannot read properties of null (reading 'hasUnsavedChanges')`, and the router-level test resolves `false` or throws `NavigationError`.
- **Red run:**
  - The new tests are run before the fix.
  - The red must come from the behavioural assertion or the TypeError itself.
  - A red from DI setup (e.g. a missing `HlmDialogService` stub; use the same stub the existing routing spec uses) does not count.
  - The router-level test must also be checked to be a real reproduction: in the red run, confirm that the child component was **not** instantiated (constructor spy count 0). Otherwise the stub did not reproduce the hidden outlet.
- **Disqualifier:** the router-level test is not evidence in either of these cases:
  - it stays green with the fix reverted, which means the hidden-outlet stub is inert;
  - it goes green because the guard was never invoked at all. Assert a `canDeactivate` spy was called once with `null`.
- **Consumers:**
  - `unsaved-changes.guard.spec.ts`;
  - `rd-general-information-routing.canDeactivate.spec.ts`;
  - the 6 section specs that reference the guard (`rd-theory-of-change`, `innovation-dev-info`, `rd-evidences`, `rd-general-information`, `rd-partners`, `rd-contributors-and-partners` `*.component.spec.ts`);
  - the 19 guarded routes (P-4);
  - Cypress: 0 hits (P-11).
- **Definition of done:**
  - the tests were red before the fix and are green after;
  - the falsifier was executed and observed red;
  - the existing guard and routing specs pass;
  - lint is clean.
- **Skills:** `angular-developer`, `tdd`.

---

### [x] RDN-T-2 — Phase chips open the module of their phase (Bug Mode regression)

- **Type:** client + tests
- **Description:**
  - `phaseLink` now receives the phase row. `app_module_id == 2` → `/ipsr/detail/{code}/general-information?phase={id}`. Anything else, including a missing value → today's `router.url` path plus `?phase={id}`. This is RDN-DD-2.
  - The template passes `phase` instead of `phase.id`.
  - The plain `href` stays (doc comment at `:240-244`).
  - Update the existing `phaseLink(34)` expectation (`result-detail.component.spec.ts:413`) to pass a row.
- **Implements:**
  - RDN-R-2, scenario "IPSR code on the Reporting route", including its `BUT` clause (no `/result/result-detail/…`).
  - RDN-R-2, scenario "Reporting code keeps today's link", including its `AND IT MUST` clause (missing `app_module_id` falls back to Reporting).
- **Design refs:** RDN-DD-2; P-7, P-11.
- **Files:**
  - `src/app/pages/results/pages/result-detail/result-detail.component.ts`
  - `src/app/pages/results/pages/result-detail/result-detail.component.html`
  - `src/app/pages/results/pages/result-detail/result-detail.component.spec.ts`
- **Depends on:** — · **Blocks:** RDN-T-3 (same files)
- **Estimate:** S · **Review:** `checklist` (signature change with a single template consumer)
- **Tests:**
  - **Unit:** `phaseLink` with these rows:
    - `{id:9, app_module_id:2}` → `/ipsr/detail/11719/general-information?phase=9`;
    - `{id:34, app_module_id:1}` → `<router path>?phase=34`;
    - `{id:34}` → `<router path>?phase=34`.
  - **Rendered:** with `resultLoadFailure` set to `'not-found'` and `availablePhases` set to two rows (one IPSR, one Reporting), read the `href` of each chip under `[data-testid="result-detail-not-found-phases"] a` from the DOM.
- **Verification:**
  - `npx jest --silent --reporters=summary --no-coverage --testPathPattern="result-detail/result-detail.component"`
  - `npx tsc -p tsconfig.app.json --noEmit`
  - `npx ng lint --quiet`
- **Falsifier:**
  - Make `phaseLink` ignore `app_module_id` again. The IPSR unit case and the IPSR chip `href` go red; the Reporting cases stay green.
  - Revert the template argument to `phase.id`. `tsc` goes red: a number passed where a row is expected.
- **Red run:** before the fix, the IPSR case fails on the `href` value (`/result/result-detail/11719/…`), not on setup.
- **Disqualifier:** the rendered test is not evidence if it finds 0 chip anchors. Assert the count is 2 before reading `href`s.
- **Consumers:**
  - `result-detail.component.html:105`;
  - `result-detail.component.spec.ts:413`;
  - Cypress: 0 hits (P-11).
- **Definition of done:**
  - red before, green after;
  - the falsifier was executed;
  - `tsc` and lint are clean.
- **Skills:** `angular-developer`, `tdd`.

---

### [x] RDN-T-3 — Redirect a resolved IPSR result to the IPSR module (Bug Mode regression)

- **Type:** client + tests
- **Description:**
  - **First step: settle P-6.** In the test environment, open one `result_type_id = 11` code under `/ipsr/detail/{code}/general-information?phase={id}`, read-only. Record the outcome in `execution.md`.
    - If it renders → the IPSR type set is `{10, 11}`.
    - If it does not → the set is `{10}`, and the exclusion is recorded (the RDN-R-3 type-11 branch).
  - Then add the RDN-DD-3 effect in `ResultDetailComponent`. It fires when all of these hold:
    - the type is in the set;
    - the result's `result_code` equals `api.resultsSE.currentResultCode`;
    - it has not fired yet for this code.
  - It calls `router.navigate(['/ipsr/detail', code, 'general-information'], { queryParams: { phase }, replaceUrl: true })`, where `phase` is `api.resultsSE.currentResultPhase`.
- **Implements:**
  - RDN-R-3, scenario "Innovation Package through the Reporting route", including its `AND IT MUST` clause (`replaceUrl`, no back-loop) and its `BUT` clause (Reporting UI does not remain; the automated part covers navigation, the visual part is a human check).
  - RDN-R-3, scenario "Non-IPSR results are untouched", including its `BUT` clause (type 7 from IPSR links is not redirected).
  - RDN-R-3, scenario "Complementary innovation (type 11)".
- **Design refs:** RDN-DD-3; P-6, P-8, P-9, P-10.
- **Files:**
  - `src/app/pages/results/pages/result-detail/result-detail.component.ts`
  - `src/app/pages/results/pages/result-detail/result-detail.component.spec.ts`
- **Depends on:** RDN-T-2 · **Blocks:** —
- **Estimate:** S · **Review:** `full` (new navigation side effect on a screen every result passes through; a loop or a wrong redirect affects all users)
- **Tests:** set `currentResultSignal` after the component is created, so the effect runs on a real signal change (`TestBed.flushEffects()` or `fixture.detectChanges()`). Cases:
  - **(a)** type 10, code `11719`, phase `9` → `navigate` called once with `['/ipsr/detail','11719','general-information']`, `{queryParams:{phase:'9'}, replaceUrl:true}`;
  - **(b)** type 7 → not called;
  - **(c)** type 10 whose `result_code` differs from `currentResultCode` → not called;
  - **(d)** the signal is set twice for the same code → called once;
  - **(e)** type 11 → called or not called, matching the P-6 outcome.
- **Verification:**
  - `npx jest --silent --reporters=summary --no-coverage --testPathPattern="result-detail/result-detail.component"`
  - `npx tsc -p tsconfig.app.json --noEmit`
  - `npx ng lint --quiet`
  - **Human check at the HITL pause**, after deploy to the test environment (the pipeline deploys `performance-refactor` on merge):
    - open an IPSR code on the Reporting route with `?phase=` → ends on `/ipsr/detail/…`;
    - browser back → does not return to the Reporting URL;
    - note any visible flash of the Reporting section.
- **Falsifier:**
  - Remove `replaceUrl` → (a) goes red.
  - Remove the code-equality condition → (c) goes red.
  - Remove the one-shot flag → (d) goes red with 2 calls.
  - Add 7 to the set → (b) goes red.
- **Red run:**
  - Before the effect exists, (a) fails on the behavioural assertion: `navigate` called 0 times.
  - (b), (c) and (d) are trivially green before the fix. They become meaningful only through their falsifiers, which must be executed.
- **Disqualifier:** (a) is not evidence if `navigate` is a spy that never sees the effect run. Confirm with (d)'s second signal write that the effect re-evaluates. A green (a) under a test that sets the signal *before* creating the component, with no flush, proves nothing.
- **Consumers:**
  - `result-detail.component.spec.ts` (43 cases; the existing `effect` at `:59-64` must keep its green-checks behaviour);
  - P-10: IPSR's type-7 links, unaffected by construction.
- **Definition of done:**
  - P-6 settled and recorded;
  - red before, green after;
  - every falsifier executed;
  - `tsc` and lint are clean;
  - the human check is recorded in `execution.md`.
- **Skills:** `angular-developer`, `tdd`.

## 4. Dependency graph

```
RDN-T-1 (guard)          ── independent
RDN-T-2 (chips) ──► RDN-T-3 (redirect)   [same component files]
```

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| RDN-TEST-1 | unit | RDN-R-1 | `shared/guards/unsaved-changes.guard.spec.ts` |
| RDN-TEST-2 | router-level | RDN-R-1 (real tree, hidden outlet) | `shared/guards/unsaved-changes.guard.routing.spec.ts` |
| RDN-TEST-3 | unit + rendered | RDN-R-2 | `result-detail.component.spec.ts` |
| RDN-TEST-4 | unit (effect) | RDN-R-3 | `result-detail.component.spec.ts` |
| RDN-MAN-1 | human, test env | RDN-R-3 `BUT` (no visible Reporting UI), back-loop | `execution.md` |

## 6. Rollout & verification

- Single PR to `performance-refactor`, with commits per task, e.g.:
  - `🔧 fix(unsaved-changes.guard) [P2-3969]: …`
  - `🔧 fix(result-detail) [P2-3969]: …`
- After merge, the pipeline deploys to test. Then:
  - repeat the prod reproduction steps (proposal §9) in test with an IPSR code;
  - move the ticket to Ready For UAT only once it is merged.

## 7. Cleanup & follow-ups

- Reverse redirect (Reporting result under the IPSR route): not opened unless someone reports it.

## 8. Roll-back plan

Revert the PR. There is no data, migration or contract to undo.
