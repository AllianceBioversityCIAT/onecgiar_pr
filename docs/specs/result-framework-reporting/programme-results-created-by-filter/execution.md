# Execution Log: `result-framework-reporting/programme-results-created-by-filter`

## Document Control
- **Spec Path:** `docs/specs/result-framework-reporting/programme-results-created-by-filter/`
- **Owner:** session Leader
- **Started:** 2026-09-03
- **Branch:** `qa-development-2026`
- **Triad:** Leader (Cursor Grok 4.6, T1) · Implementer `akili-implementer` (cursor-grok-4.6-high-fast, T2) · Reviewer `akili-reviewer` (claude-sonnet-5-thinking-high, T3)
- **Approval Mode:** gated
- **Budget (design.md §1):** 2 tasks / ~160 LOC / 1 review round
- **Leader decisions at start:**
  - Document order: `CBF-T-1` then `CBF-T-2` (T-2 depends on `selectedCreatedBy`).
  - Skills: `angular-developer` + `tdd` for T-1 (predicate/chips; red→green requested in the task). No deviation from `tasks.md`.
  - Effort: `medium` (well-specified Lite task).

---

## Task Execution History

## Task `CBF-T-1` — Add the Created by filter dimension (service + options + chips)

- **Status:** PASS · **Date:** 2026-09-03 · **Attempts:** 1
- **Implementer:** `akili-implementer` · effort `medium` · skills `angular-developer`, `tdd`
- **Reviewer:** `akili-reviewer` · lens checklist (medium)

### Attempt 1
- **Files changed (4, all `programme-results/services/`):**
  - `programme-results-filter.service.ts` — eighth dimension: type, state, `normalize` predicate, chip after Center, `clearCreatedBy` / `clearChip` / `clearAll`
  - `programme-results-filter.service.spec.ts` — two-author + blank fixture cases
  - `programme-results.service.ts` — `createdByOptions = optionsOf(rows, row => row.createdBy)`
  - `programme-results.service.spec.ts` — sorted / deduped / no-blank options
- **Verification (Implementer):**
  ```
  cd onecgiar-pr-client && npm run test -- --testPathPattern="programme-results-filter.service.spec|programme-results.service.spec" --silent --reporters=summary --no-coverage
  Test Suites: 2 passed, 2 total
  Tests:       72 passed, 72 total
  ```
  TDD: red first (15 failed / 57 passed on the new fixture cases), then green. Filter service has no `Router` / `ActivatedRoute` import. No template, URL, or `package.json` edits.
- **Reviewer verdict:** `STATUS: PASS` — CBF-T-1's predicate, options, chip, and clear-all wiring match `CBF-R-1` / `CBF-R-2` and `CBF-DD-1`; tests are behavioral (two-author + blank fixture), not presence-only. Reviewer independently re-ran the scoped command: 72/72.
- **ADVISORY (4R, not gating, not tasked):** none material. Reviewer noted `@akili-spec` comments are unused on sibling dimensions in the same file (style nit).
- **Requirements covered:** `CBF-R-1` (THEN only that person; BUT NOT blank option; combine THEN + BUT chips; case-insensitive) · `CBF-R-2` chip + `clearChip` + `clearAll` (service half) · `CBF-AC-1` · `CBF-AC-2` (service half).
- **Decisions:** none beyond the spec. `tdd` as tasked.
- **Issues:** none. Unrelated dirty `reporting-guide.service.ts` left out of this task's commit.

---
