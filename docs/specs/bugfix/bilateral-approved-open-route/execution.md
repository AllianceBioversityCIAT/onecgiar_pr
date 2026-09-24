# Execution Log — Approved W3 bilateral opens the bilateral center page

## Document Control

- Spec: `docs/specs/bugfix/bilateral-approved-open-route/` (task list file is `task.md`)
- Mode: Bug, client only
- Approval mode: gated (continue/pause asked after each task)

## Task Execution History

### BAO-T-1 — Classifier: Approved W3 with lead center → center editor

- **Final status:** PASS (2026-09-24)
- **Implementer attempts:** 1
- **Attempt 1**
  - Files changed: `onecgiar-pr-client/src/app/shared/routing/bilateral-result-open-route.util.ts`, `bilateral-result-open-route.util.spec.ts`
  - Verification: `npx jest --testPathPattern="bilateral-result-open-route.util.spec" --no-coverage` — red before change (2 failed, 8 passed: Approved name-only and id-only), green after (10/10). `ng lint` scoped to the two files: pass.
  - Reviewer verdict: `STATUS: PASS` — matches design §6; `isW3BilateralForUpdate` untouched; BAO-R-1,3,4,5,6,8 and BAO-AC-1..6 covered by behavioral assertions.
- **Implementer notes (Not Done / Assumptions, informational, no scope owed):** client has no `eslint.config.*`, so scoped `ng lint` was used; the blank-lead-center case uses `'  '` to exercise the trim; callers and stale comments deferred to BAO-T-2.
- **ADVISORY (not gating, recorded only):** `resolveBilateralResultOpenRoute` builds the center-editor command from the raw `input.leadCenter` while classification uses the trimmed value, so a padded lead center would give a padded URL segment. Pre-existing (Editing lane has the same behavior); out of scope for this spec.
- **Requirements covered:** BAO-R-1, R-3, R-4, R-5, R-6, R-8; BAO-AC-1..6
- **Decisions:** none beyond design.
- **Issues:** none.
- **Commit:** not created (awaiting user go-ahead).

### BAO-T-2 — Callers: specs and stale comments

- **Final status:** PASS (2026-09-24)
- **Implementer attempts:** 2
- **Attempt 1**
  - Files changed: `results-list.component.spec.ts` + `.ts` (comment), `programme-results.component.spec.ts` + `.ts` (comment) + folder `CLAUDE.md`, `global-search-palette.component.spec.ts` + folder `CLAUDE.md` (re-stamp only).
  - Verification: scoped Jest `results-list|programme-results|global-search-palette` (matched 4 suites, 307 tests) green; `ng lint --quiet` on touched `.ts` pass. Also repaired a pre-existing red test in the programme-results spec (fixture `statusId 3` + `statusName Approved`; util is id-first) by setting `statusId: 6`.
  - Reviewer verdict: FAIL — `programme-results/CLAUDE.md` row-activation sentence cited wrong pointers (`results-list.component.ts:634`, `resultRoute() :746`). Violated: COMPONENT-DOCS §5/§6 (BAO-T-2 DoD). All BAO-AC-7/8/9 and BAO-R-7 checks green.
- **Attempt 2** (doc-only)
  - Fixed the sentence: name-only pointer to `getResultRoute()`/`navigateToResult()`, `resultRoute()` at `:1515`, explicit no-lead-center fallback (BAO-R-3).
  - Reviewer verdict: PASS — pointers and routing claims verified against source.
- **Finding:** `smartNav.rememberResultDetailOrigin()` is harmless on the bilateral route (Editing lane already takes the same path). Mapper-gap disqualifier not triggered.
- **ADVISORY (recorded only, no new tasks):**
  - results-list spec title at ~L996 ("approved W3/Bilaterals ... result detail") now only true because that fixture has no lead center; consider adding "without a lead center".
  - No spec pins "statusId wins over a contradicting statusName" (BAO-R-6 precedence).
  - programme-results test title "opens an Approved or AVISA bilateral outside the review drawer" over-promises (asserts only `usesBilateralReviewFlow === false`).
  - Process: BAO-T-1 verification ran only the util spec, while its Consumers list names the three caller specs; a caller spec was already red after T-1.
- **Requirements covered:** BAO-R-2, BAO-R-7; BAO-AC-7, AC-8, AC-9
- **Commit:** not created (awaiting user go-ahead).

### BAO-T-3 — Browser verification and assumptions check

- **Final status:** PASS, manual (2026-09-24), performed by the user; review skip-eligible per task.md.
- **Attempts:** n/a (no code change).
- **Evidence (user report):** Approved W3/Bilaterals rows open `/bilateral/{center}/result/{code}?phase={phase}` and load; for results the user does not belong to, the page opens read-only (cannot edit). Covers BAO-AC-10 and BAO-R-10.
- **Agent-side check:** the local backend accepts the session (`GET /api/results/bilateral/28728?versionId=6` answered 404 "not found", not 401, so that row is absent from the local DB, not a routing/auth fault).
- **Premises:** BAO-P-6 (editor renders Approved closed-phase read-only without errors) verified by the user. BAO-P-7 (rows carry leadCenter) supported: the user reached the bilateral URL from the surfaces tried. BAO-P-5 (Approved `status_id = 6`) not explicitly confirmed by the user; routing still works through the name fallback (BAO-R-6).
- **Surfaces:** the user reported "everything works"; per-surface detail (Results Center / Programme Results / search) was not itemized.
- **Commit:** see git history for `[SPEC:bugfix/bilateral-approved-open-route]`.

## Summary

All tasks (BAO-T-1..T-3) complete. Client-only change, no server or migration.
