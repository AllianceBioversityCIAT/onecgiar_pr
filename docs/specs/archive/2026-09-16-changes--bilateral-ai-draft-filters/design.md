# Bilateral AI Draft Results — Search & Filter Toolbar — `design.md`

Links: `requirements.md` (same folder) · `proposal.md` · `my-draft-results/CLAUDE.md` · `bilateral-results-list` (UX reference).

## 1. Summary

Extend the AI Draft Results tab with a unified docked toolbar: **search** + **Created by** multiselect + **Project** single-select, plus a removable **chips** row. All filtering is **client-side** over `BilateralAiService.draftList()` — no API, entity, or migration changes. Filter state lives in `MyDraftResultsFilterService`, component-scoped, following the programme-results pure-predicate pattern.

---

## 2. Architecture Overview

### 2.1 Modules touched

| Layer | Path | Change |
|---|---|---|
| Filter service | `my-draft-results/services/my-draft-results-filter.service.ts` | Add dimensions: `searchText`, `selectedCreatedBy`, optional `selectedCategories`, `selectedResultLevels` |
| Page component | `my-draft-results.component.{ts,html,scss}` | Toolbar rebuild, chips, wire filtered list |
| Pure helpers | New file optional: `my-draft-results/utils/draft-filter-helpers.ts` | Creator id normalize, search haystack builder, created-by option builder |
| Tests | `my-draft-results-filter.service.spec.ts`, `my-draft-results.component.spec.ts` | Extended coverage |

**Read-only references (no edits):**

- `bilateral-results-list.component.html` — toolbar layout
- `programme-results-filter.service.ts` — multi-dimension + chip pattern
- `bilateral-result-filter.ts` — bilateral Results predicates (different payload; pattern only)

### 2.2 Data flow

```
BilateralAiService.draftList()  (GET …/ai/drafts, already loaded)
        │
        ▼
MyDraftResultsFilterService.filterDrafts(drafts)
        │  AND chain:
        │    matchesDraftSearch
        │    matchesDraftCreatedBy
        │    matchesDraftProject (existing)
        │    matchesDraftCategory (optional)
        │    matchesDraftResultLevel (optional)
        ▼
my-draft-results.component drafts() computed
        │
        ▼
groupedDraftCards()  (existing session grouping — runs on filtered drafts)
```

Search debouncing: component owns a `searchInput` signal updated on `(input)`; filter service receives debounced value via `setSearchText()` (~300ms `setTimeout`/`rxjs debounceTime` — match bilateral-results-list if it uses a pattern there).

### 2.3 Creator resolution

Draft creator identity comes from `draft.job.user_id` and optional `draft.job.user` relation (same as card badges in `my-draft-results.component.ts`).

**Filter option value:** normalized string user id (`normalizeUserId`).

**Filter option label:** display name using priority:

1. If id === current user → label **Me** (chip shows "Created by: Me")
2. Else `[first_name, last_name].join` from `job.user`
3. Else `resolvedUserNames()[userId]` (component passes map into option builder)
4. Else email from `job.user`
5. Else **Center Colleague** (fallback label, still filterable by id)

**Matching predicate:** draft passes Created by filter when `normalizeUserId(draft.job.user_id)` is in `selectedCreatedBy[]`, OR when **Me** is selected and id matches current user.

---

## 3. Data Model Changes

**None.**

---

## 4. API Surface

**No new or changed endpoints.** Continues to use:

- `GET /api/bilateral/center/ai/drafts?centerId=` via `BilateralAiService.GET_bilateralAiDrafts`

---

## 5. Server Workflow / Business Rules

N/A.

---

## 6. Frontend Plan

### 6.1 Toolbar layout

Replace the current project-only docked bar with bilateral Results parity:

```
┌─────────────────────────────────────────────────────────────────┐
│ [🔍 Search drafts…        ] │ Created by ▾ │ Project ▾          │
└─────────────────────────────────────────────────────────────────┘
│ [Search: kenya ×] [Created by: Me ×] [Project: P21 ×]  Clear all │
└─────────────────────────────────────────────────────────────────┘
```

- **Search:** 240×34px input, clear button when non-empty (`bilateral-results-list` markup)
- **Created by:** multiselect dropdown — reuse popover/checkbox pattern from bilateral Results Created by section OR compact multiselect if a shared control exists in bilateral module
- **Project:** retain existing overlay dropdown behavior; may drop internal project search when global search covers project names (implementation choice — global search is authoritative)

### 6.2 `MyDraftResultsFilterService` rewrite shape

```typescript
export type MyDraftResultsFilterDimension =
  | 'search' | 'project' | 'createdBy' | 'category' | 'resultLevel';

export interface MyDraftResultsFilterState {
  searchText: string;
  selectedProjectId: string | null;
  selectedCreatedBy: string[];      // user ids; 'me' sentinel expanded at apply time
  selectedCategories: string[];     // SHOULD
  selectedResultLevels: string[];   // SHOULD — '3' | '4' normalized strings
}

export interface MyDraftResultsFilterChip {
  label: string;
  dimension: MyDraftResultsFilterDimension;
  value: string;
}
```

**Pure predicates** (exported for unit tests):

- `matchesDraftSearch(draft, state, context)` — `context` carries `projectNameMap`, `creatorDisplayName(draft)`, `currentUserId`
- `matchesDraftCreatedBy(draft, state, currentUserId)`
- `matchesDraftProject` — unchanged
- `matchesDraftCategory(draft, state)` — `extracted_mds.indicator`
- `matchesDraftResultLevel(draft, state)` — `Number(draft.result?.result_level_id)`

**Service methods:**

- `setSearchText`, `toggleCreatedBy`, `selectProject`, `clearChip(dimension, value)`, `clearAll`
- `filterDrafts(drafts, context)` — applies all predicates
- `filterChipGroups(context)` — computed labels for chip row
- `hasActiveFilters`, `activeFilterCount`

### 6.3 Component integration

- `allDrafts()` = `bilateralAiService.draftList()` (unchanged)
- `drafts()` = `filter.filterDrafts(allDrafts(), filterContext())` where `filterContext` includes `projectNameMap`, `initiativeNameMap`, `resolvedUserNames`, `currentUserId`
- `hasAnyDrafts()` = `allDrafts().length > 0` (unchanged — toolbar shows when loaded + has drafts)
- `isFilteredEmpty()` = `hasAnyDrafts() && drafts().length === 0` (extend if grouping changes count — filter at draft level before group)

**Grouping:** Apply filter **before** session grouping so a group only appears if it contains ≥1 matching draft.

### 6.4 Optional child component

If `my-draft-results.component.html` exceeds ~500 lines after toolbar work, extract `my-draft-results-toolbar` as a presentational child with `@Input`/`@Output` or signal inputs. Not mandatory for v1.

### 6.5 Design system

- Tailwind + `--pr-*` CSS variables (same as current `mdr-toolbar-docked`)
- Reuse class naming prefix `mdr-` for draft-specific hooks; mirror `brl_` spacing from Results tab where practical
- a11y: `role="search"` on toolbar, `aria-label` on inputs, keyboard-dismiss overlays

---

## 7. Security & Authorization

No change. Draft list already scoped by `centerId` from `BilateralContextService`. Created by filter only exposes users already visible on cards.

---

## 8. Testing Strategy

| File | Focus |
|---|---|
| `my-draft-results-filter.service.spec.ts` | Each predicate empty vs active; AND combination; normalizeUserId; search haystack |
| `my-draft-results.component.spec.ts` | Search input debounce; Created by narrows list; chips remove; filtered empty state; Clear all |

Verification commands (scoped):

```bash
cd onecgiar-pr-client && npx jest --silent --reporters=summary --no-coverage \
  --testPathPattern="my-draft-results-filter.service.spec|my-draft-results.component.spec"
```

---

## 9. Design Decisions

| ID | Decision | Rationale |
|---|---|---|
| **`BADF-DD-1`** | Client-side only | Center-scoped draft counts are small; matches P2-3319 |
| **`BADF-DD-2`** | No URL params v1 | Drafts tab has no existing query-param contract; avoids scope creep |
| **`BADF-DD-3`** | Filter before group | Session groups should not show empty shells when inner drafts filtered out |
| **`BADF-DD-4`** | Created by value = user id | Stable key; labels computed for display only |
| **`BADF-DD-5`** | **Me** as synthetic option | Same UX as Programme Results / bilateral Results |

---

## 10. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Duplicated creator name logic | Extract `buildCreatorDisplay(draft, context)` pure helper shared by cards + filter |
| TypeORM string ids | `normalizeUserId` mirrors `normalizeProjectId` |
| Debounce flakiness in tests | Use fakeAsync/tick or inject debounce ms constant |

---

*AKILI-SPECS · approved 2026-09-16*
