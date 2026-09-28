# Execution Log — Bilateral Results: Science Program filter

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/bilateral-science-program-filter` |
| Linked | `requirements.md`, `design.md`, `tasks.md` |
| Approval Mode | not specified in Document Control blocks read — treated as gated (no auto-continue) |
| Leader model | Sonnet 5 (T1 registry recommends `opus`; session continued on sonnet per non-blocking rule) |

## 2. Task Execution History

### `BSF-T-1` — Add Science Program options, control, and filter wiring

**Status:** PASS — `[x]`

#### Attempt 1

- **Implementer:** `akili-implementer` (agent `add1ac2cd8e91e0d3`)
- **Skill loaded:** `angular-developer`. Effort: `medium`.
- **Files changed:**
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-results-list/bilateral-results-list.component.ts`
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-results-list/bilateral-results-list.component.html`
- **Summary:** Added `programCatalogByPortfolio` cache + `programCatalogPortfoliosRequested` set, `ProgramFilterOption` type, `programOptions`/`programSelectOptions`/`programChips` computeds, `onProgramFilterChange`/`removeProgramFilter`/`loadProgramCatalog` handlers, `'program'` added to `BilateralFilterChipDimension`, `activeChips`/`clearChip` wiring, and the new `<div class="brl-filter-field" aria-label="Filter by science program">` template block mirroring the Project field. Catalog sourced from `ResultsApiService.GET_AllInitiatives(portfolioAcronym)` → `filterOutAvisaInitiatives`, keyed by `selectedPhase()?.obj_portfolio?.acronym`.
- **Implementer verification:**
  - `npx ng lint --quiet` → clean.
  - `npx jest --testPathPattern="bilateral-results-list.component" --silent --no-coverage` → 62 passed, 1 failed (pre-existing hardcoded field-order assertion in `.spec.ts`, out of scope for this task, expected to be fixed in `BSF-T-2` since design.md mandates this exact placement).
- **Not Done / Assumptions (Implementer):**
  - Label mapping chose `short_name || name || official_code` instead of the HTML-polluted `full_name` field.
  - Found `clearAllFilters()` already had `this.programFilter.set([]);` present before starting (contradicts design.md DD-2's "currently absent" claim) — did not change it.
  - Manual real-API/browser verification (tasks.md's Disqualifier + DoD checks) not performed — no live backend/browser session available in this run.
- **Reviewer:** `akili-reviewer` (agent `aa2fc84a9f0103265`)
- **Reviewer verdict:** `STATUS: FAIL`

  **Issue 1 — Option labels drop the program code**
  - **Discovered Issue:** `loadProgramCatalog` sets `label = short_name || name || code`, so a loaded `SP01` shows as `Science Program: <short name>` with no code visible anywhere (dropdown, chip, or search-filter text), breaking code-based search and disagreeing with the deep-link fallback's bare-code label.
  - **Violated Rule:** `requirements.md` `BSF-R-3` + Scenario "Filtering by one Science Program" (chip must show "SP01"); `design.md` Executive Summary / `tasks.md` BSF-T-1 ("mirroring the Project multiselect field-for-field" — `catalogProjectLabel` leads with the identifying code).
  - **Remediation Suggestion:** build the label code-first, e.g. `${code} - ${name}` (or `${code} ${name}` to match the Project separator), falling back to bare `code` when no name is available — same pattern as `catalogProjectLabel`.

  **Advisory (non-gating):**
  - READABILITY: `bilateral-results-list/CLAUDE.md` (folder doc, Verified 2026-09-18) should be updated + re-stamped in the same commit per client `CLAUDE.md` §10 — schedule for `BSF-T-2` or task close-out.
  - RELIABILITY: tasks.md's Disqualifier (real API code-format check) and DoD manual browser check remain open gates, not covered by lint/Jest — must be done before the task is marked `[x]`.
  - RISK: `ngOnInit` currently keeps only P25 phases, so in practice the catalog key is always `'P25'` — the per-portfolio cache is harmless future-proofing, no action needed.

- **Leader adjudication:** Issue 1 is a genuine spec-conformance defect (BSF-R-3 chip content), not an advisory — rework required. Advisories recorded above, not gating, not promoted to new tasks. Effort bumped to `high` for attempt 2 per rework-loop guardrail. Feedback passed verbatim to Implementer for attempt 2.

#### Attempt 2

- **Implementer:** `akili-implementer` (agent `a1eba4795e53bbccd`). Effort: `high` (bumped after attempt 1 FAIL).
- **Files changed:** `bilateral-results-list.component.ts` only — `loadProgramCatalog`'s label construction, replacing `const label = (initiative?.short_name || initiative?.name || code) as string;` with:
  ```ts
  const name = (typeof initiative?.short_name === 'string' ? initiative.short_name : typeof initiative?.name === 'string' ? initiative.name : '').trim();
  const label = name ? `${code} - ${name}` : code;
  ```
- **Implementer verification:** `npx ng lint --quiet` clean; `npx jest --testPathPattern="bilateral-results-list.component" --silent --no-coverage` → 62 passed, 1 failed (same pre-existing out-of-scope field-order assertion, expected — `BSF-T-2`'s job).
- **Reviewer:** `akili-reviewer` (agent `a435f8a2fe19707c9`)
- **Reviewer verdict:** `STATUS: PASS`
  - Confirmed the label now leads with the code (`SP01 - <name>`, or bare `SP01` with no name), satisfying `BSF-R-3` and matching `catalogProjectLabel`'s code-first pattern. Spot-checked the rest of the Science Program code paths (BSF-R-1/2/4/10) unchanged and consistent.
  - **ADVISORY (non-gating):** a minor behavior change — the old fallback chain (`||`) treated an empty-string `short_name` as falsy and fell through to `name`; the new type-check only falls through on non-string/undefined, so an empty-string `short_name` (if CLARISA ever sends one) now yields the bare code instead of `code - name`. Still satisfies BSF-R-3 either way (label still starts with the code). No action required.

**Task-level PASS achieved** (spec-conformance gate). Per Step 2.3.0, checking `tasks.md`'s Definition of Done before closing:

- [x] Lint clean.
- [x] `clearAllFilters()` resets `programFilter` (confirmed present, closes/reconfirms `BSF-R-4`).
- [ ] **Manually verified in browser** (real token, ≥2 Science Programs, filter/chip/Clear-all/URL round-trip) — **NOT DONE**. No live backend/browser session was available in either Implementer attempt.
- [ ] **Real-API disqualifier check** (tasks.md Verification: compare a real `GET_AllInitiatives` response's `official_code` values against real `submitter` values for at least one portfolio) — **NOT DONE**, same reason.
- [ ] Code committed — not done; repo convention (`feedback_no_autocommit` memory) requires explicit user go-ahead, not yet given.

**Outstanding gap per Step 2.3.0:** the task is NOT marked `[x]` despite the Reviewer PASS — the manual real-API/browser verification and the commit are still owed. Marking `[~]` in `tasks.md` and escalating to the user (Step 5) rather than closing.

#### Manual verification (user-driven) — defect found

- User ran `npm start` and opened the Results tab in a real browser (per DoD's own instruction). The dev server's error overlay showed:
  ```
  TS2339: Property 'short_name' does not exist on type 'AvisaInitiativeLike'.
  src/app/pages/bilateral/pages/bilateral-results-list/bilateral-results-list.component.ts:1021:43
  ```
- **Root cause:** `loadProgramCatalog` (L1014) calls `filterOutAvisaInitiatives(response ?? [])` with no explicit type argument. `filterOutAvisaInitiatives<T extends AvisaInitiativeLike>` cannot infer `T` from an `any`-typed `response` (from `GET_AllInitiatives`'s `Observable<any>`) in this call shape, so TypeScript falls back to the constraint type `AvisaInitiativeLike`, which has no `short_name`/`name`/`id` fields — only `official_code`-family fields. The loop body's `initiative?.short_name` / `initiative?.name` (L1021) then fail to compile.
- **Why the automated gates missed it:** neither `npx ng lint --quiet` (lint, not a full type-check) nor the scoped `npx jest --testPathPattern=...` (ts-jest transform, not the full `ngc`/build pipeline) perform the same type resolution `ng serve`/`ng build` does — a known gap already documented in this client's own `CLAUDE.md` (§9: `tsc --noEmit` doesn't catch everything a real build does). Both Implementer attempts' verification commands were insufficient to catch this class of error; a build-level check should have been included.
- **Leader adjudication:** this is a genuine, evidenced compile-breaking defect discovered via the DoD's own manual verification step — not an advisory. Rework required (attempt 3), effort held at `high`. `author ≠ auditor` gate still applies — a Reviewer re-check is required even for this narrow fix.

#### Attempt 3

- **Implementer:** `akili-implementer` (agent `a087bfed286335a3f`). Effort: `high`.
- **Files changed:** `bilateral-results-list.component.ts` only, one line in `loadProgramCatalog`:
  ```ts
  const initiatives = filterOutAvisaInitiatives<{ official_code?: string; short_name?: string; name?: string; id?: number }>(response ?? []);
  ```
  (was: `filterOutAvisaInitiatives(response ?? [])`, missing explicit type argument, which let TS fall back to the bare `AvisaInitiativeLike` constraint and broke property access on `short_name`/`name`.)
- **Implementer verification:** `npx ng build --configuration development` completed with zero TypeScript errors (verified twice, grepped for `error TS`/`ERROR`, both empty); `npx ng lint --quiet` clean; `npx jest --testPathPattern="bilateral-results-list.component" --silent --no-coverage` → 62 passed, 1 failed (same pre-existing out-of-scope `BSF-T-2` field-order assertion).
- **Reviewer:** `akili-reviewer` (agent `a65765b75a6bb96e4`)
- **Reviewer verdict:** `STATUS: PASS` — confirmed the fix is scoped to the one line, the explicit type argument satisfies `AvisaInitiativeLike`'s constraint (all fields optional), the loop body's property accesses now type-check, and BSF-R-1/2/3/4/10 are unaffected (a type-argument-only change cannot alter runtime behavior). No advisory.

**Compile error resolved.** `BSF-T-1`'s code is now spec-conformant (3 Reviewer PASSes across 3 attempts: feature complete → label fixed → compile error fixed) and builds clean.

**Final manual verification:** the user confirmed, after the attempt-3 fix, that the filter works end-to-end in a real browser session (options list real programs, filtering/chip/Clear-all/URL round-trip). `BSF-T-1` Definition of Done is satisfied except the commit, deferred to the single PR covering both `BSF-T-1` and `BSF-T-2` (PR Strategy in `tasks.md`).

**`BSF-T-1` marked `[x]` in `tasks.md`.** Proceeding to `BSF-T-2`.

### `BSF-T-2` — Regression + new-behavior test coverage

**Status:** IN PROGRESS (attempt 1 FAIL, attempt 2 pending)

#### Attempt 1

- **Implementer:** `akili-implementer` (agent `abe91e29b4edad3a0`). Skills: `angular-developer`, `tdd`. Effort: `medium`.
- **Files changed:** `bilateral-results-list.component.spec.ts` only.
- **Summary:** Fixed the pre-existing hardcoded popover field-order assertion (added `'Science Program'` between `'Project'` and `'Created by'`). Added a new `describe('Science Program filter (BSF-T-1/BSF-T-2)', ...)` block with 7 tests: selection narrows rows, chip appears with `dimension: 'program'`, chip removal restores rows without affecting an active Project filter, `clearAllFilters()` empties `programFilter()`, URL hydration on load (`?program=SP02` → `programFilter()`), catalog success (AVISA filtered, portfolio acronym asserted), catalog failure (no throw, empty options, popover still renders).
- **Implementer verification:** `npx jest --testPathPattern="bilateral-results-list.component" --silent --no-coverage` → 70 passed, 70 total. `npx ng lint --quiet` → clean.
- **Reviewer:** `akili-reviewer` (agent `a603554441a544e08`), full 4-lens mode (diff >~100 LOC).
- **Reviewer verdict:** `STATUS: FAIL`

  **Issue 1 — No test for the URL *write* path (`BSF-R-5`)**
  - **Discovered Issue:** the new hydration test only covers reading `?program=` on load; nothing asserts that selecting a program writes `?program=SP01` to the URL, or that removing the chip removes `program` from the URL. The existing test harness already supports this exact assertion style (`navigateSpy` replaying into `queryParams$`, used by the sibling `project` test at L1148-1153) — so a broken write path would leave the suite green.
  - **Violated Rule:** `requirements.md` `BSF-R-5` ("MUST serialize to and parse from `?program=...`"); Scenarios "Filtering by one Science Program" ("URL updates to include `?program=SP01`") and "Removing the filter via chip" ("`program` is removed from the URL"); the Defect-class table naming this spec file as the URL-round-trip gate; `tasks.md` BSF-T-2 lists `BSF-R-5` under Implements.
  - **Remediation Suggestion:** in `fakeAsync`, call `onProgramFilterChange(['SP01'])`, `tick()`, assert `queryParams$.value.program === 'SP01'`; then remove via `chipRemoveButton('Science Program: SP01')` (real chip path, also exercises `clearChip`'s `'program'` case), `tick()`, assert `'program' in queryParams$.value` is `false` and an unrelated active filter (e.g. `project`) survives.

  **Advisory (non-gating):**
  - RELIABILITY: catalog-failure test's `toEqual([])` would pass even if the catalog were never requested — add `expect(resultsApiSE.GET_AllInitiatives).toHaveBeenCalledWith('P25')` to prove the failing request actually ran.
  - READABILITY: fold the chip-removal test onto the real `chipRemoveButton(...)` click (covers `clearChip`'s `'program'` branch) rather than calling `removeProgramFilter` directly — same fix as the remediation above.

- **Leader adjudication:** Issue 1 is a genuine spec-conformance gap (`BSF-R-5` untested on the write side) — rework required. Advisories recorded, non-gating, not promoted to new tasks. Effort bumped to `high` for attempt 2.

#### Attempt 2

- **Implementer:** `akili-implementer` (agent `a85e3408c0339b15c`). Effort: `high`.
- **Files changed:** `bilateral-results-list.component.spec.ts` only. Added one new test (URL write-path: `onProgramFilterChange(['SP01'])` → `tick()` → `queryParams$.value['program'] === 'SP01'` with `project` untouched; then real `chipRemoveButton('Science Program: SP01').click()` → `tick()` → `program` removed from URL, `project` survives, no chip remains). Also folded in the advisory hardening (`toHaveBeenCalledWith('P25')` in the catalog-failure test). Did not touch the existing direct-call chip-removal test — avoided a near-duplicate since the new test already exercises the real click path.
- **Implementer verification:** `npx jest --testPathPattern="bilateral-results-list.component" --silent --no-coverage` → 71 passed, 71 total. `npx ng lint --quiet` → clean.
- **Reviewer:** `akili-reviewer` (agent `a0ff36ef225a8bc18`)
- **Reviewer verdict:** `STATUS: PASS` — confirmed the new test genuinely exercises the real DOM chip-click path (not a direct method call), the `project=118` survival check is not coincidental (written by the component itself through the navigate-replay mock, checked at two points), the advisory fix landed correctly, nothing else in the file changed, and `BSF-R-1..5`/`BSF-R-10` are now fully covered in both read and write directions across all four Scenarios. No advisory (diff <50 LOC).

**`BSF-T-2` PASS.** Definition of Done:
- [x] All new and existing tests green (71/71).
- [x] Client coverage thresholds (50/60/60/60) not reduced (test-only additions, no coverage-excluded paths touched).
- [x] `npx jest --testPathPattern="bilateral-results-list.component"` output captured above (for the PR description).

Marking `BSF-T-2` `[x]` in `tasks.md`.

## 3. Summary — all tasks complete

Both `BSF-T-1` and `BSF-T-2` are `[x]`. The Bilateral Results tab's Filters popover now has a Science Program multiselect, sourced from the portfolio-wide CLARISA initiatives catalog (AVISA-filtered), wired through the pre-existing `programFilter`/`filterCenterResults`/URL contract, with full chip/Clear-all/URL round-trip behavior — mirroring the Project filter field-for-field. Total: 3 rework attempts across the two tasks (one real label-format defect, one real compile error caught by manual verification, one real test-coverage gap), all resolved and independently re-verified by the Reviewer. Remaining before this can ship: a commit (single PR per `tasks.md` PR Strategy — pending explicit user go-ahead) and the folder's own `bilateral-results-list/CLAUDE.md` doc update (flagged as advisory in attempt 1's review, `onecgiar-pr-client/CLAUDE.md` §10 convention).




