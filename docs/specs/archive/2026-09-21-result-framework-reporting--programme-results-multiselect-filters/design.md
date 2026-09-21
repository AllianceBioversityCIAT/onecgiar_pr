# Programme Results — Phase / Status / Created by multiselect — `design.md`

## Document Control

| Field | Value |
|---|---|
| **Linked requirements** | `requirements.md` (PRM-R-1 … PRM-R-9) |
| **Status** | `draft` |
| **Budget** | **3 tasks** · **~180–240 LOC** production + **~120–180 LOC** tests · **1** review round expected |

---

## Executive Summary

Extend `ProgrammeResultsFilterService` so **Phase**, **Status**, and **Created by** use the same **multi-value array + comma URL** model as Category / Origin / Center (MWB-T-13). Swap three `app-pr-filter-select` instances to `app-pr-filter-multiselect` on Results and My Work. Update predicates, chips, `clearChip`, status pill toggles, and both URL bridge effects. **Client-only** — no TRD API or data-model change.

---

## Architecture Overview

### 2.1 Where this lives

| Layer | Path |
|---|---|
| Filter state + predicates | `programme-results/services/programme-results-filter.service.ts` |
| Query param names | `programme-results/services/programme-results-query-params.ts` (comments only; param names unchanged) |
| Results URL bridge + UI | `programme-results/programme-results.component.{ts,html}` |
| My Work URL bridge + UI | `my-work-board/my-work-board.component.{ts,html}` |
| Tests | co-located `*.spec.ts` + grep hits on shared exports |

**Server:** none.

### 2.2 Data flow (unchanged shape)

```text
[User toggles multiselect]
  → ProgrammeResultsFilterService.selectedPhases|Statuses|CreatedBy (string[])
  → matchesProgrammeResultFilters (OR per dimension)
  → filteredRows computed in host component
  → mirror effect writes ?phase=&status=&createdBy= via joinListParam
```

---

## Data Model (client filter state)

### Before → After

| Dimension | Current | After |
|---|---|---|
| Phase | `selectedPhase: string \| null` | `selectedPhases: string[]` |
| Status | `selectedStatus: string \| null` | `selectedStatuses: string[]` |
| Created by | `selectedCreatedBy: string \| null` | `selectedCreatedBy: string[]` |

Rename signals on the service; update `ProgrammeResultsFilterState` interface accordingly.

### Predicate changes (`matchesProgrammeResultFilters`)

**Phase** — replace single-value block with:

```text
if selectedPhases.length:
  row matches if ANY selected phase matches row (same normalize rules as today:
  phaseName, phaseYear, versionId, "Phase {year}", substring fallbacks)
```

**Status** — replace `selectedStatus` equality with:

```text
if selectedStatuses.length:
  normalize(row.statusName) in selectedStatuses (case-insensitive)
```

**Created by** — replace single equality with:

```text
if selectedCreatedBy.length:
  normalize(row.createdBy) matches ANY selected creator
```

When `ignoreStatus: true`, skip the entire status block (unchanged).

---

## API Design

No API change. Rows remain the single `GET_AllResultsWithUseRole` payload filtered client-side.

---

## Frontend / UX Component Architecture

### Filters popover (`programme-results.component.html`)

Replace three controls (~lines 133–214):

| Control | From | To |
|---|---|---|
| Phase | `app-pr-filter-select` + `onPhaseChange` | `app-pr-filter-multiselect` + `(changed)="filter.selectedPhases.set($event)"` with phase-specific handler if default fallback needed |
| Status | `app-pr-filter-select` + `onStatusChange` | `app-pr-filter-multiselect` + direct array bind |
| Created by | `app-pr-filter-select` + `onCreatedByChange` | `app-pr-filter-multiselect` + direct array bind |

Mirror Category/Section pattern: `[ngModel]="filter.selectedX()"`, `(changed)="..."`, `[options]="xSelectOptions()"`.

Remove obsolete helpers where unused: `selectValue`, `toFilterValue` for these three (keep only if My Work still needs for other selects).

### Status counter pills

| Method | Change |
|---|---|
| `isStatusActive(name)` | `selectedStatuses().includes(name)` (case-normalized) |
| `toggleStatus` / `onStatusCountClick` | `toggleInList(selectedStatuses, name)` — same as `toggleCategory` |

### Chips (`activeChips`)

Replace single chip per dimension with loops (copy category pattern):

```text
for (phase of selectedPhases()) → chip { dimension: 'phase', value: phase }
for (status of selectedStatuses()) → chip …
for (creator of selectedCreatedBy()) → chip …
```

### `clearChip` / clear helpers

| Dimension | `clearChip(value)` | `clearAll()` |
|---|---|---|
| phase | Remove one value; if `[]` → `[defaultPhase()]` via host callback | Host sets `[defaultPhase()]` after `clearAll()` (existing) |
| status | Remove one from array | `[]` |
| createdBy | Remove one from array | `[]` |

Service methods: `clearPhases(phase?)`, `clearStatuses(status?)`, `clearCreatedBy(creator?)` — mirror `clearCategory`.

### URL bridge (`programme-results.component.ts`)

**Hydrate effect:**

- `phase`: `parseListParam(params.get('phase'))` — if result empty after load and no URL param, set `[defaultPhase()]` (not `null`)
- `status`: `parseListParam(...)` + `sameListParam` guard
- `createdBy`: `parseListParam(...)` + `sameListParam` guard

**Mirror effect:**

- `phase`: `joinListParam(selectedPhases())` — special case: when array equals `[defaultPhase()]` only, still write param (preserves shareable default context) OR write same as today (single phase string) — **both equivalent for one default**
- `status`: `joinListParam(selectedStatuses())`
- `createdBy`: `joinListParam(selectedCreatedBy())`

Use `sameListParam` for phase hydrate compare (order-sensitive, consistent with other multi dims).

### My Work board

Same template swaps in filter popover section. Update URL hydrate/mirror effects to use arrays + `parseListParam` / `joinListParam`. Phase still synced with `effectivePhase()` — when effective phase changes, set `selectedPhases` to `[effectivePhase()]` if that remains the product rule (read `my-work-board.component.ts` phase effect ~1098).

---

## Design Decisions

### PRM-DD-1 — Reuse MWB-T-13 multi-value infrastructure

**Decision:** Use existing `parseListParam`, `joinListParam`, `sameListParam`, `toggleInList`, and `app-pr-filter-multiselect` — do not introduce a second multiselect pattern.

**Rejected:** Keeping single-select with a faux "multi" UX (not requested).

### PRM-DD-2 — Phase default remains sticky, not "all phases"

**Decision:** Empty phase selection after user action collapses to `[defaultPhase()]`, not `[]` meaning all phases. External **Clear filters** resets to `[defaultPhase()]`. This preserves `quick/filters-clear-button-everywhere` and load-order fix behavior.

**Reversion challenge (Step 2.3):** Removing sticky default would show rows from every phase by default and break Overview → Results deep links that assume one active phase context. **Keep sticky default.**

### PRM-DD-3 — Status empty array = no status filter

**Decision:** `selectedStatuses = []` shows all statuses (same as `selectedStatus = null` today). Status pills add/remove members; none active when array empty.

### PRM-DD-4 — URL param names unchanged

**Decision:** Keep `phase`, `status`, `createdBy` keys; only the **value shape** becomes comma-separated. Single legacy values remain valid.

**Kaizen lesson:** Grep `PROGRAMME_RESULTS_QUERY_PARAM_MAP` consumers before marking tasks done (`KZ-…-created-by-filter-1`).

### PRM-DD-5 — My Work included in same spec

**Decision:** Same PR — shared service change forces My Work template + URL bridge update.

**Rejected:** Results-only change would leave My Work with broken types or inconsistent UX.

---

## Budget (Step 2.4)

| Metric | Estimate |
|---|---|
| Tasks | 3 |
| Production LOC | ~180–240 |
| Test LOC | ~120–180 |
| Review rounds | 1 (2 if URL bridge regression) |

Depth **Standard** is appropriate — patterned but touches shared service + two hosts + status pills.

---

## Risks

| Risk | Mitigation |
|---|---|
| URL hydrate ↔ mirror loop | Keep `untracked` + `sameListParam` guards; extend existing component specs |
| Phase load race | Retain `loading()` guard from `phase-filter-missing-phases-prod` with array state |
| Shared export spec drift | Grep map + run `dashboard-lab.scope.spec.ts` in verification |
