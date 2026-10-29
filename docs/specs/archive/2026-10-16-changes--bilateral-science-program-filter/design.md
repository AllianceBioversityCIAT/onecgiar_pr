# Design — Bilateral Results: Science Program filter

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/bilateral-science-program-filter` |
| Depth | Lite |
| Requirements | `requirements.md` (`BSF-R-1..5`, `BSF-R-10`) |
| Architecturally significant? | No — no new module/service/persistence/data-flow; extends one existing component with a client-side options source already used elsewhere in the app |

## Executive Summary

Everything except the **UI** and its **options source** already exists: the `program` URL contract
(`bilateral-query-params.ts`), the `filterCenterResults` predicate, and the component's
`programFilter` signal (already read from and written to the URL). This design adds:

1. An **options source** — `ResultsApiService.GET_AllInitiatives(portfolioAcronym)`, an existing,
   non-admin-gated CLARISA endpoint already used elsewhere in the app, filtered/mapped the same way
   `result-creator.component.ts` already does for a comparable initiative picker.
2. The **control, chip, and handlers** in `bilateral-results-list.component.ts`/`.html`, mirroring
   the Project multiselect (`PMF-*`) field-for-field.

No backend change. No contract change. Option B from `proposal.md` (a new endpoint) is **not
needed** — see Design Decision 1.

## Architecture Overview

```
Filters popover (bilateral-results-list.component.html)
  └── app-pr-filter-multiselect [Science Program]     ← NEW markup, existing component
        [options]="programSelectOptions()"            ← NEW computed
        [ngModel]="programFilter()"                    ← EXISTING signal
        (changed)="onProgramFilterChange($event)"      ← NEW handler
                     │
                     ▼
        programFilter (WritableSignal<string[]>)        ← EXISTING, already wired to:
                     │
                     ▼
        currentContractParams().program                 ← EXISTING
                     │
                     ▼
        filterCenterResults(rows, params)                ← EXISTING predicate (bilateral-result-filter.ts)
                     │
                     ▼
        filteredResults()  →  table rows                 ← EXISTING

        syncUrlParams() / URL hydration on load           ← EXISTING (program already in
                                                              RESULTS_TAB_MANAGED_QUERY_PARAMS and
                                                              already parsed into programFilter)
```

Options source (new, parallel to the existing project catalog, simpler — no per-year scoping):

```
onInit / portfolio change
  └── ResultsApiService.GET_AllInitiatives(portfolioAcronym)   ← EXISTING API method
        → filterOutAvisaInitiatives(response)                  ← EXISTING util (drops SGP-02/AVISA)
        → map to { value: official_code, label }                ← NEW mapping
        → cache by portfolioAcronym                              ← NEW, mirrors projectCatalogByYear
        → programOptions (computed)                               ← NEW
```

## Extended Directory Structure

No new files. All changes land in the existing feature folder:

```
onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-results-list/
├── bilateral-results-list.component.ts     # + signals, computed, handlers, catalog fetch
├── bilateral-results-list.component.html   # + one <div class="brl-filter-field"> block
└── bilateral-results-list.component.spec.ts # + new test cases
```

## Data Model

No changes. `BilateralQueryParams.program: string[]` and `BilateralCenterResult.submitter` are
untouched and already typed.

## API Design

No new endpoint. Reuses `ResultsApiService.GET_AllInitiatives(portfolioId?: string)`
(`GET {apiBaseUrl}clarisa/initiatives[/:portfolioId]`), which already:

- returns `{ response: Initiative[] }` with `official_code`, `short_name`, `name`, `id` per entry
  (same shape the result-creator's initiative picker consumes).
- is not gated by `isAdmin` at the HTTP-service level (the admin gate seen in
  `result-creator.component.ts` is local to that component's own wrapper method, not the endpoint).

## Backend Module Design

Not applicable — no backend change.

## Frontend / UX Component Architecture

### New signals / computed (`bilateral-results-list.component.ts`)

| Name | Shape | Purpose |
|---|---|---|
| `programCatalogByPortfolio` | `WritableSignal<ReadonlyMap<string, ProgramFilterOption[]>>` | Cache, mirrors `projectCatalogByYear` but keyed by portfolio acronym (Science Programs don't vary by phase year the way center projects do). |
| `programCatalogPortfoliosRequested` | `Set<string>` (private) | One request per portfolio acronym per page lifetime — mirrors `projectCatalogYearsRequested` (`PMF-NFR-1` pattern: a failing portfolio is never retried). |
| `programOptions` | `computed<ProgramFilterOption[]>` | Union of the cached entries for the current portfolio, sorted case-insensitively by label — mirrors `projectOptions`. |
| `programSelectOptions` | `computed<ProgramFilterOption[]>` | `programOptions()` plus any URL-selected code missing from the catalog, labelled with the bare code, so a deep link stays ticked/removable — mirrors `projectSelectOptions` (`PMF-DD-3`). |
| `programChips` | `computed<{ code: string; label: string }[]>` | One entry per `programFilter()` value; label from `programSelectOptions()` match, else the bare code — mirrors `projectChips`. |

`ProgramFilterOption = { value: string; label: string }` (new local type, next to the existing
`ProjectFilterOption`).

### New handlers

| Name | Behavior |
|---|---|
| `onProgramFilterChange(values: string[])` | Normalizes to unique trimmed codes, `programFilter.set(...)`, `syncUrlParams()` — mirrors `onProjectFilterChange`. |
| `removeProgramFilter(code: string)` | `programFilter.update(codes => codes.filter(c => c !== code))`, `syncUrlParams()` — mirrors `removeProjectFilter`. |
| `loadProgramCatalog(portfolioAcronym: string)` (private) | Fetches once per portfolio acronym not yet requested; on success maps+dedupes+caches; on error, records the attempt and leaves the cache empty for that portfolio (never retried this page lifetime) — mirrors `loadProjectCatalog`. Called from the existing effect/subscription that already tracks `selectedPhase()`. |

### Existing surfaces to extend (not replace)

- `BilateralFilterChipDimension` — add `'program'` to the union.
- `activeChips` computed — add a loop over `programChips()` pushing `{ dimension: 'program', value: chip.code, label: `Science Program: ${chip.label}` }`, positioned after the `project` loop (same order as the popover: Project, then the new Science Program, then Created by).
- `clearChip(chip)` — add a `case 'program': this.removeProgramFilter(chip.value); return;` branch.
- `clearAllFilters()` — add `this.programFilter.set([]);` next to the existing `this.projectFilter.set([])` line (currently absent — `programFilter` is not yet reset by Clear all, a small existing gap this change also closes; `BSF-R-4`).
- `RESULTS_TAB_MANAGED_QUERY_PARAMS` — **no change**, `BILATERAL_PROGRAM_QUERY_PARAM` is already listed.
- URL hydration (`params.program` → `this.programFilter.set(...)`) — **no change**, already implemented (`COV-R-14`/`COV-DD-3` hydration path).

### Template (`bilateral-results-list.component.html`)

One new `<div class="brl-filter-field" aria-label="Filter by science program">` block, placed
immediately after the existing Project field (line ~164) and before Created by (line ~166),
structurally identical to the Project block:

```html
<div class="brl-filter-field" aria-label="Filter by science program">
  <label class="brl_filter_group_label">Science Program</label>
  <app-pr-filter-multiselect
    [options]="programSelectOptions()"
    optionLabel="label"
    optionValue="value"
    placeholder="Science Program"
    countLabel="programs"
    [filter]="true"
    [ngModel]="programFilter()"
    (changed)="onProgramFilterChange($event)"></app-pr-filter-multiselect>
</div>
```

No new SCSS — `brl-filter-field` / `brl_filter_group_label` already style the Project/Created-by
fields identically; the new field inherits them for free (`docs/ux-ui/design.md` component-reuse
rule; `filters-list.scss` already covers this strip).

## Shared Contracts or Package Extensions

None. `bilateral-query-params.ts` and `bilateral-result-filter.ts` (shared across all four Bilateral
tabs) are not touched.

## Design Decisions

### DD-1 — Reuse `GET_AllInitiatives`, not a new `/api/bilateral/center/programs` endpoint (Option A)

**Decision:** source Science Program options from the existing
`ResultsApiService.GET_AllInitiatives(portfolioAcronym)`, filtered through the existing
`filterOutAvisaInitiatives` util, instead of building the Option-B endpoint from `proposal.md`.

**Why:** verified during this spec that `Initiative.official_code` (CLARISA, e.g. `SP01`) is the
same code family as `BilateralCenterResult.submitter` (confirmed against
`bilateral-overview.fixtures.ts` / `bilateral-result-filter.spec.ts`, which both use `SP01`..`SP11`
style codes) and the same format the "MY SCIENCE PROGRAMS" sidebar displays via `initiativeCode`.
The endpoint is already called from `result-creator.component.ts` for a comparable purpose and is
not admin-gated at the HTTP layer.

**Trade-off accepted:** this catalog is **portfolio-scoped, not centre-scoped** — it lists every
Science Program in the active portfolio, not only the ones with rows at this centre (unlike the
Project filter, which is deliberately centre-scoped per `PMF-*`). This is intentional here: Science
Programs are a small, portfolio-wide, mostly-stable list (the sidebar's own "OTHER SCIENCE
PROGRAMS" section already shows programs beyond the user's own), so a portfolio-wide list is the
more useful default and avoids inventing a new centre-scoping query the backend does not compute
anywhere else. If real-data verification (see the task's manual-check gate) shows this produces an
unusably long list, the fallback is Option B, unchanged from `proposal.md`.

**Reversion check (Step 2.3, N/A):** this decision does not revert any shipped behavior — the
Science Program filter does not exist in the Results tab UI today.

### DD-2 — `clearAllFilters()` gap closed as part of this change, not filed separately

**Discovery:** `clearAllFilters()` already resets `projectFilter`, `statusFilter`, `typeFilter`,
`methodFilter`, `createdByFilter`, `searchQuery` — but not `programFilter`, even though
`programFilter` already exists today (pre-dating this spec). Since `programFilter` currently has no
UI, this gap is invisible; once the new control exists it would leave a phantom active filter after
"Clear all". Folding the one-line fix into this change (`BSF-R-4`) is smaller than filing a separate
bugfix for a defect this same spec is what makes user-visible.

## Budget (Step 2.4)

| Signal | Estimate |
|---|---|
| Tasks | 2 (1 implementation task covering options source + control + wiring; 1 test task) |
| LOC | ~90–120 (new computed/handlers/catalog fetch ~50–60 LOC in `.ts`, ~10 LOC in `.html`, ~30–50 LOC of new spec assertions) |
| Review rounds | 1 |

This is comfortably inside **Lite** — no depth change needed. If implementation reveals Option A's
catalog doesn't line up with `submitter` codes for a real portfolio (DD-1's fallback), that is a
budget-tripwire event: stop and escalate to the user before building Option B under this same Lite
spec, since Option B (new endpoint) would need at least a Standard-depth backend design pass.
