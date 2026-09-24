# Tasks — Bilateral Results: Science Program filter

## 1. Scope of this task list

- **Module / feature:** `changes/bilateral-science-program-filter`
- **Linked spec:** `docs/specs/changes/bilateral-science-program-filter/requirements.md` +
  `docs/specs/changes/bilateral-science-program-filter/design.md`
- **Sprint / target phase (if any):** —
- **Owner / driver:** Santiago Sanchez (via AKILI)
- **Status:** complete — both `BSF-T-1` and `BSF-T-2` `[x]`; commit + folder `CLAUDE.md` re-stamp pending

## 2. Pre-flight checklist

- [x] `requirements.md` is approved.
- [x] `design.md` is approved.
- [x] Open questions in `requirements.md`/`design.md` are resolved — DD-1's catalog-format question
      was checked against `bilateral-overview.fixtures.ts`/`bilateral-result-filter.spec.ts` (both
      use `SP01`..`SP11` style codes); `BSF-T-1`'s Verification still re-confirms it against a real
      API response, not just fixtures.
- [x] No CLARISA cache-table/endpoint dependency — reuses `GET_AllInitiatives`, already live.
- [x] No conflicting in-flight spec on the same files (`bilateral/center-overview-tab` and
      `changes/project-multiselect-filter` are both shipped/closed, not in-flight; this spec only
      adds to files they already touched).
- [x] No migration — client-only change; `migration:check` not applicable.

## 3. Task list

### `BSF-T-1` [x] — Add Science Program options, control, and filter wiring

- **Type:** `client`
- **Description:** Add the Science Program multiselect to the Results tab's Filters popover: a
  catalog fetch (`ResultsApiService.GET_AllInitiatives(portfolioAcronym)` → `filterOutAvisaInitiatives`
  → mapped/cached options), the `programOptions`/`programSelectOptions`/`programChips` computeds, the
  `onProgramFilterChange`/`removeProgramFilter`/`loadProgramCatalog` handlers, the `'program'`
  chip-dimension wiring (`activeChips`, `clearChip`, `clearAllFilters`), and the template control —
  all mirroring the existing Project multiselect field-for-field (per `design.md` Frontend/UX
  Component Architecture).
- **Implements:** `BSF-R-1`, `BSF-R-2`, `BSF-R-3`, `BSF-R-4`, `BSF-R-10`
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-results-list/bilateral-results-list.component.ts`
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-results-list/bilateral-results-list.component.html`
- **Depends on:** `—`
- **Blocks:** `BSF-T-2`
- **Estimate:** `M`
- **Review:** `checklist`
- **Verification:**
  - **Falsifier:** with rows fixtured across `submitter: 'SP01'` and `'SP02'` (as in
    `bilateral-overview.fixtures.ts`), selecting `SP01` in the new control leaves only `SP01` rows
    visible in `filteredResults()`, and a "Science Program: <label>" chip appears with `dimension:
    'program'` in `activeChips()`.
  - **Red run:** `npx jest --testPathPattern="bilateral-results-list.component" ` — the new
    assertions added in `BSF-T-2` (this task lands the production code; `BSF-T-2` lands and runs the
    spec, per the two-task split — see that task's Red run for the actual fail-before/pass-after
    command).
  - **Disqualifier:** if a real (non-fixture) `GET_AllInitiatives` response's `official_code` values
    do **not** match the `submitter` format/codes seen in real bilateral rows for at least one test
    portfolio (manual check — call the endpoint with a real token per
    `onecgiar-pr-client/CLAUDE.md` §2, compare codes against a real `GET /api/results/bilateral-center-results`
    response), abandon this task's catalog source and escalate to the user per `design.md`'s Budget
    tripwire (DD-1's stated fallback to Option B) rather than shipping a filter that silently
    matches nothing.
  - **Consumers:** `BilateralFilterChipDimension`, `activeChips`, `clearChip`, `clearAllFilters` are
    shared within this one component only — no external consumer. `programFilter`,
    `RESULTS_TAB_MANAGED_QUERY_PARAMS`, URL hydration are pre-existing and unmodified by this task
    (only newly *read/written from* the new control) — no other file imports them from this
    component; the shared `program` contract (`bilateral-query-params.ts`,
    `bilateral-result-filter.ts`) itself is not edited.
- **Definition of done:**
  - [ ] Code merged via `<emoji> <type>(<scope>) [ticket]: <description>` (e.g. `✨ feat(bilateral-results-list): add Science Program filter`). — deferred to the single PR covering both `BSF-T-1` and `BSF-T-2` (per PR Strategy below); pending explicit user go-ahead to commit.
  - [x] Lint clean (`npx ng lint --quiet`).
  - [x] `clearAllFilters()` now resets `programFilter` (closes the DD-2 gap).
  - [x] Manually verified in browser by the user (real session): a TS2339 compile error was caught
        and fixed in attempt 3 (see `execution.md`); after the fix, the user confirmed the filter
        works end-to-end.
  - [x] No secret/token logged (`.cursorrules`) — no token/secret appears anywhere in the diff.

### `BSF-T-2` [x] — Regression + new-behavior test coverage

- **Type:** `tests`
- **Description:** Extend `bilateral-results-list.component.spec.ts` with cases for the Science
  Program filter: selection narrows rows, chip removal restores rows, "Clear all" clears the
  selection, URL hydration on load (`?program=SP02` → preselected + filtered), and the catalog-load
  path (success populates `programOptions`, failure/empty leaves the control rendered with no
  options per `BSF-R` "no options available" scenario).
- **Implements:** `BSF-R-1`, `BSF-R-2`, `BSF-R-3`, `BSF-R-4`, `BSF-R-5`
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-results-list/bilateral-results-list.component.spec.ts`
- **Depends on:** `BSF-T-1`
- **Blocks:** `—`
- **Estimate:** `S`
- **Review:** `checklist`
- **Verification:**
  - **Falsifier:** each new `it(...)` fails against `main`/pre-`BSF-T-1` code (the control/handlers
    don't exist yet) and passes once `BSF-T-1` lands.
  - **Red run:** `npx jest --testPathPattern="bilateral-results-list.component"` — run once on the
    branch **before** `BSF-T-1`'s handlers exist (new assertions fail/error), then again **after**
    (green). Both runs recorded in the task's execution log.
  - **Disqualifier:** if a new assertion only passes because it duplicates an existing Project-filter
    test's mock setup without actually exercising `program` (a copy-paste that silently asserts on
    `project` state) — re-check names of touched signals in each new test.
  - **Consumers:** none (test-only file).
- **Definition of done:**
  - [x] All new and existing tests in this spec file green (71/71, incl. 2 rework rounds — label-format and TS2339 fixes in `BSF-T-1`, URL write-path gap in `BSF-T-2`; see `execution.md`).
  - [x] Client coverage thresholds (50/60/60/60) not reduced (test-only additions).
  - [x] `npx jest --testPathPattern="bilateral-results-list.component"` output captured in `execution.md` — ready to paste into the PR description.

## Requirement → Task Coverage

| Requirement / Scenario | Task |
|---|---|
| `BSF-R-1` control shown | `BSF-T-1`, `BSF-T-2` |
| `BSF-R-2` selection narrows rows (scenario: filter by one SP) | `BSF-T-1`, `BSF-T-2` |
| `BSF-R-3` removable chip (scenario: remove via chip) | `BSF-T-1`, `BSF-T-2` |
| `BSF-R-4` Clear all clears program too | `BSF-T-1`, `BSF-T-2` |
| `BSF-R-5` URL round-trip (scenario: deep link preselected) | `BSF-T-1` (wiring, already existed for read/write paths), `BSF-T-2` (asserts it) |
| `BSF-R-10` options from real catalog, not only loaded rows | `BSF-T-1` (catalog fetch, not row-derived) |
| Scenario: no options available / catalog loading | `BSF-T-2` |

## PR Strategy

Single PR — both tasks touch the same 3 files in the same component, total estimate is well under
400 LOC (Budget: ~90–120 LOC), and splitting would only add PR-chaining overhead for no isolation
benefit (no backend/frontend boundary here to split along).

**Recommended first task:** `BSF-T-1`.
