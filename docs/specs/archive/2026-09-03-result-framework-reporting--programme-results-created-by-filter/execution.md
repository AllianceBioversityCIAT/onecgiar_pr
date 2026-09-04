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

## Task `CBF-T-2` — Popover control + URL hydrate/mirror

- **Status:** in progress · **Date:** 2026-09-03 · **Attempts so far:** 1 (FAIL)
- **Implementer:** `akili-implementer` · attempt 1 effort `medium` · skills `angular-developer`, `tdd` (Leader added `tdd` for hydrate/mirror proofs; dropped `ui-ux-pro-max` — copy Center, do not invent tokens)
- **Reviewer:** `akili-reviewer` · lens checklist (medium)

### Attempt 1
- **Files changed:**
  - `programme-results-query-params.ts` — `createdBy` const + type + map
  - `programme-results.component.ts` — `createdBySelectOptions`, hydrate/mirror key, `onCreatedByChange`
  - `programme-results.component.html` — row 3 two-column Center | Created by (`app-pr-filter-select`)
  - `programme-results.component.spec.ts` — CBF-T-2 cases
- **Verification (Implementer, scoped):** 3 suites / 150 tests passed
- **Reviewer verdict:** `STATUS: FAIL`
- **FAIL findings (verbatim):**
  1. **Discovered Issue:** Adding the `createdBy` entry to `PROGRAMME_RESULTS_QUERY_PARAM_MAP` breaks a pre-existing, unrelated test (`dashboard-lab.scope.spec.ts:318`) that pins the map to exactly `['phase','status','category','origin','center']`. Verified by running `npx jest --testPathPattern="dashboard-lab.scope.spec"` → 1 failed, 22 passed. This suite is outside CBF-T-2's expected-files list and outside the Implementer's scoped verification command, so it was never observed, but it is a real regression the diff introduces into the shared package.
     - **Violated Rule:** `.agents/reviewer.md` §Audit Checklist — "Stability & Integrity … are there any potential memory leaks, unhandled errors, or bad imports introduced?" — a diff that flips a previously-green suite to red on the same package fails this bar, independent of CBF-T-2's own file list.
     - **Remediation Suggestion:** Update the assertion at `dashboard-lab.scope.spec.ts:318` from the exhaustive `toEqual(['phase','status','category','origin','center'])` to a non-exhaustive check matching the test's own stated intent (its title says "no `scope` entry", and line 319 already does `expect(Object.values(PROGRAMME_RESULTS_QUERY_PARAM_MAP)).not.toContain('scope')`) — e.g. `expect(Object.keys(PROGRAMME_RESULTS_QUERY_PARAM_MAP)).not.toContain('scope')`. This is a one-line test fix, not a spec change, and keeps the OSF-T-4 BUT clause intact while un-pinning a key count this Lite spec is entitled to grow additively per `CBF-DD-1`.
- **ADVISORY (not gating):** popover Jest case is presence/parent, not a live keyboard interaction; HITL was unrun at Reviewer time.
- **Leader HITL (after Implementer report, before rework):** live `entity-details/SP01/results` at 1345px. Filter open: Center | Created by same row; `app-pr-filter-select` present; no `pr-select`; no horizontal overflow; `a.field` tabindex 0, Enter opens options (47 names); pick Adane Tufa → chip `Created by: Adane Tufa`, badge `2 === 2` chips, URL `?phase=Reporting%202026&createdBy=Adane%20Tufa`.
- **Leader adjudication:** FAIL is in-scope. Shared exported map; sibling pin is over-broad vs its own OSF-T-4 “no `scope`” clause. One-line pin update, not a spec pivot.

### Attempt 2
- **Implementer:** `akili-implementer` · effort `high` (retry bump) · skill `angular-developer` only (one-line pin; `tdd` dropped)
- **Files changed:**
  - `dashboard-lab.scope.spec.ts` — line 318 `toEqual([...5 keys])` → `not.toContain('scope')`; line 319 values check unchanged
- **Verification (Implementer):**
  - `dashboard-lab.scope.spec`: 1 suite / 23 tests passed
  - programme-results scoped trio: 3 suites / 150 tests passed
- **Reviewer verdict:** `STATUS: PASS` — pin now matches OSF-T-4 “no `scope` entry”; `createdBy` may stay on the map; key-count unpin is what `CBF-DD-1` allows. Diff 1 LOC; ADVISORY suppressed (under 50-LOC floor).
- **Final status:** PASS · **Date:** 2026-09-03 · **Attempts:** 2
- **Requirements covered:** `CBF-R-1` (popover `app-pr-filter-select`; status recount; combine) · `CBF-R-2` (badge === chips; `clearAll` keeps `defaultPhase`) · `CBF-R-3` (hydrate/mirror `createdBy`, unknown name, no-param) · `CBF-AC-2` · `CBF-AC-3` · `CBF-AC-4`
- **Decisions:** sibling pin updated rather than reverting the map. HITL recorded on attempt 1 (Leader).
- **Issues:** budget §1 was 1 review round; T-2 used 2 (FAIL then PASS). Overrun cause: scoped verification missed the shared-map consumer. Recorded; no pivot.
- **HITL (DoD):** see Attempt 1 Leader HITL. Control is `app-pr-filter-select`.

---

## Summary

Both tasks PASS. Created by is an eighth clientside filter on the programme Results tab: service + options (T-1), popover + `?createdBy=` URL (T-2). Sibling OSF-T-4 pin no longer enumerates map keys.

Pending at archive (not this commit): `programme-results/CLAUDE.md` “seven dimensions” → “eight”.

---
