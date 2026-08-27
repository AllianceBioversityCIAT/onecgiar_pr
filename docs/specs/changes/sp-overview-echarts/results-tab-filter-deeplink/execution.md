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
