# Execution Log: `changes/sp-overview-echarts/results-tab-filter-deeplink`

## Document Control
- **Spec Path:** `docs/specs/changes/sp-overview-echarts/results-tab-filter-deeplink/`
- **Owner:** j.cadavid@cgiar.org
- **Started:** 2026-08-27
- **Branch:** `qa-development-2026` (spec branch — shared-file write discipline applies)
- **Triad:** Leader (Claude Fable 5, T1) · Implementer `akili-implementer` wrapper (sonnet, T2) · Reviewer `akili-reviewer` wrapper (opus, T3)
- **Approval Mode:** gated
- **Budget (design.md §1):** 2 tasks / ~150 LOC / 1 review round
- **Leader decisions at start:**
  - Task order **RFD-T-2 → RFD-T-1** (tasks.md allows either; T-1 hydrates `center`, which needs T-2's `selectedCenter` to compile). Serial — both edit `programme-results.component.ts/.spec`.
  - Skills: `angular-developer` for both; `tdd` added for RFD-T-1 only (effect/anti-loop logic benefits from red→green; T-2 is a pattern copy of the Origin filter).
  - Effort: `medium` for both (well-specified Lite tasks).

---

## Task Execution History

## Task `RFD-T-2` — Center filter dimension (service, options, toolbar select, chip)

- **Status:** PASS · **Date:** 2026-08-27 · **Attempts:** 1
- **Implementer:** `akili-implementer` (sonnet) · effort `medium` · skills `angular-developer`
- **Reviewer:** `akili-reviewer` (opus) · lens checklist

### Attempt 1
- **Files changed (7, all `programme-results/`):** `services/programme-results-filter.service.ts` (+spec), `services/programme-results.service.ts` (+spec), `programme-results.component.ts`, `.html`, `.spec.ts` — +112 / −14.
- **Verification (Implementer, full suite):**
  - `npx jest --silent --reporters=summary --no-coverage` → 478 suites passed, 6732 tests passed
  - `npx ng lint --quiet` → All files pass linting
  - `git diff --stat` → 7 files under `programme-results/` only; no `package.json`/lockfile
- **Reviewer verdict:** `STATUS: PASS` — "implements every clause of RFD-R-3 (predicate on `row.center`, blank-free derived options, `Center: X` chip, clear/clear-all, `app-pr-filter-select` at `w-[150px]` after Origin) with behavioral rather than presence-only test evidence, and stays inside the declared scope."
- **HITL diff check (DoD):** Reviewer confirmed the new control at `programme-results.component.html:175-184` is `app-pr-filter-select` (never `custom-fields/pr-select`). Recorded as satisfied.
- **ADVISORY (4R, not gating, not tasked):**
  - RELIABILITY — a `By.directive(PrFilterSelectComponent)` count assertion in the component spec would automate the "wrong filter component" blind spot (requirements §9 accepts it as manual).
  - READABILITY — `onOriginChange('all')` mid-test reset in the single-select test reads assertion-less; a comment or a separate `it` would clarify.

- **Requirements covered:** RFD-R-3 (all clauses: THEN/AND, BUT NOT blank option, AND IT MUST `app-pr-filter-select`).
- **Decisions:** executed before RFD-T-1 (see Document Control).
- **Issues:** Reviewer's report was not auto-relayed on completion; Leader requested it via message — no rework, no re-review.

## Task `RFD-T-1` — URL ↔ filter bridge (hydrate + mirror) with param constants

- **Status:** PASS · **Date:** 2026-08-27 · **Attempts:** 1
- **Implementer:** `akili-implementer` (sonnet) · effort `medium` · skills `angular-developer` + `tdd` (Leader addition — effect/anti-loop logic; deviation from task list recorded in Document Control)
- **Environment note (mid-task):** sibling spec `viz-chart-echarts` was executed in a separate worktree by another session and merged into this branch during this task (`4e4a68e03`, `7db6c30ca`; `family.md` row #2 → `done`). Its files are disjoint from this task's, but it added `echarts` to `package.json` and this worktree's `node_modules` lacked it — the Implementer's full-suite run would have failed on `pr-viz-chart.component.spec.ts` for a cause outside its diff. Leader instructed the Implementer (single writer on the tree) to run `npm ci` before verification rather than running an install beside an active worker.
- **Reviewer:** `akili-reviewer` (opus) · lens checklist

### Attempt 1
- **Files changed (3, all `programme-results/`):** `services/programme-results-query-params.ts` (NEW — `@akili-spec` tagged contract for sibling #3), `programme-results.component.ts` (+68: `queryParams` signal, hydrate effect, mirror effect), `programme-results.component.spec.ts` (+112: route stub with `BehaviorSubject<ParamMap>` + synced snapshot, cases a–g).
- **TDD note (Implementer):** first pass read the filter signals inside the hydrate effect outside `untracked`, making them dependencies and reopening the hydrate ↔ mirror loop (a dropdown change re-ran hydrate, which stomped the value back to null). Caught red by the pre-existing "renders a Center chip" test + new cases (d)/(e); fixed by wrapping the compare/write in `untracked` so hydrate depends only on `queryParams()`.
- **Verification:**
  - Implementer run: 479/480 suites — the one failure was `pr-viz-chart.component.spec.ts` ("Cannot find module 'echarts/core'"), environmental (see Environment note). Lint: All files pass.
  - Leader, after `npm ci` with the tree quiet: `npx jest --silent --reporters=summary --no-coverage` → **480 passed / 480 total, 6758 tests passed**. Implementer re-ran after `npm ci` with the same result.
  - `git diff --stat` → 2 modified + 1 new under `programme-results/`; no `package.json`/lockfile.
- **Reviewer verdict:** `STATUS: PASS` — "hydrate tracks only `queryParams()` with every filter read and write inside `untracked`, mirror tracks only the four filter signals and diffs against `route.snapshot.queryParamMap` inside `untracked` before calling `navigate` with `merge` + `replaceUrl: true` and `null` for cleared keys — and the spec proves the anti-loop clause the way the DoD demands, through the subject rather than the snapshot alone." Reviewer confirmed removing `if (!changed) return;` turns cases (f), (a), (c) red (DoD FAIL input bites); filter service router-free (RFD-DD-1); `merge` preserves `phase`/`reviewResult*`.
- **ADVISORY (4R, not gating, not tasked):**
  - RELIABILITY — effect declaration order (hydrate before mirror) is load-bearing; case (a) fences the regression but no comment names it.
  - READABILITY — `queryParams` docstring attributes `initialValue` to the design, which never mentions it; restate as "seed the first hydrate run from the snapshot".
  - COVERAGE — RFD-R-2 "clearing a chip removes only that param" has no direct assertion (falls out of the mirror effect covered by d/e); a `clearChip` case asserting the other keys survive would close it cheaply.

- **Requirements covered:** RFD-R-1 (Deep link · Value matches nothing · No params, all BUT/AND IT MUST clauses) · RFD-R-2 (Copy link; BUT NOT push/drop; AND IT MUST NOT loop).
- **Decisions:** `tdd` assigned (Leader); paid off — the loop defect was caught by a red test before review.
- **Issues:** environment gap (`echarts` not installed after sibling merge) — resolved by `npm ci`; no code impact.

---

## Summary

- **All tasks complete:** RFD-T-2 (PASS, 1 attempt) · RFD-T-1 (PASS, 1 attempt). **Budget:** 2 tasks / ~150 LOC / 1 review round → actual 2 tasks / ~295 changed lines incl. ~190 of spec code (production ≈ 95) / 1 review round each. Within budget on tasks and rounds; LOC over the estimate only on test code.
- **Requirements:** RFD-R-1, RFD-R-2, RFD-R-3 — all scenarios and clauses covered with behavioral tests; RFD-AC-1/2/4 green; RFD-AC-3 (manual deep link on the running app) pending at validate/HITL.
- **Contract for sibling #3:** `services/programme-results-query-params.ts`.
- **Pending at archive (spec branch):** `../family.md` row #1 → `done`; query-param contract note in `programme-results/CLAUDE.md` (pending item).
