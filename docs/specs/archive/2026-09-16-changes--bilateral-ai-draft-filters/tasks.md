# Bilateral AI Draft Results — Search & Filter Toolbar — `tasks.md`

## 1. Scope of this task list

- **Module / feature:** `bilateral` — AI Draft Results filter toolbar
- **Linked spec:** `docs/specs/changes/bilateral-ai-draft-filters/requirements.md` + `design.md`
- **Owner / driver:** Frontend (client team)
- **Status:** shipped (BADF-T-6 skipped)
- **Specify approved:** 2026-09-16 (user approval on proposal)

---

## 2. Pre-flight checklist

- [x] `proposal.md` approved
- [x] `requirements.md` approved
- [x] `design.md` approved
- [x] Open questions resolved (`BADF-OQ-1`–`OQ-3` in requirements §9)
- [x] No backend/migration work — `migration:check` N/A
- [x] No conflict with in-flight bilateral Results work (separate component)

---

## 3. Task list

### `BADF-T-1` — Extend filter service core (search + Created by predicates) — `[x]` PASS

- **Type:** `client`
- **Description:** Extend `my-draft-results-filter.service.ts` with `searchText`, `selectedCreatedBy` signals, `normalizeUserId`, pure predicates `matchesDraftSearch` and `matchesDraftCreatedBy`, and update `filterDrafts()` to AND-chain with existing `matchesDraftProject`. Export chip types and `MyDraftResultsFilterState`.
- **Implements:** `BADF-R-1`, `BADF-R-2`, `BADF-R-3`, `BADF-R-4`, `BADF-R-5`, `BADF-R-6`, `BADF-DD-4`
- **Files:** `services/my-draft-results-filter.service.ts`, optional `utils/draft-filter-helpers.ts`
- **Depends on:** —
- **Blocks:** `BADF-T-2`, `BADF-T-3`, `BADF-T-4`
- **Estimate:** `M`
- **Skills:** `angular-developer`, `tdd`
- **Definition of done:**
  - [x] Empty search / empty createdBy = pass-all for that dimension
  - [x] Search matches title, indicator, project label, creator name (unit-tested with fixtures)
  - [x] Created by OR within dimension; AND with project filter (combined test)
  - [x] **Me** option resolves to current user id in predicate
  - [x] `npx jest --silent --testPathPattern="my-draft-results-filter.service.spec" --no-coverage` green

### `BADF-T-2` — Filter chips + clearAll API — `[x]` PASS

- **Type:** `client`
- **Description:** Add `filterChipGroups(context)`, `clearChip(dimension, value)`, `clearAll()`, `activeFilterCount()` to filter service. Chips for search text, each created-by selection, project selection.
- **Implements:** `BADF-R-8`, `BADF-AC-4`, `BADF-AC-6`
- **Files:** `services/my-draft-results-filter.service.ts`
- **Depends on:** `BADF-T-1`
- **Blocks:** `BADF-T-3`
- **Estimate:** `S`
- **Skills:** `angular-developer`
- **Definition of done:**
  - [x] Chip labels human-readable ("Search: foo", "Created by: Me", "Project: …")
  - [x] `clearChip` removes one dimension value without clearing others
  - [x] `clearAll` resets every dimension including search
  - [x] Unit tests for chip generation and clear paths

### `BADF-T-3` — Rebuild docked toolbar UI — `[x]` PASS

- **Type:** `client`
- **Description:** Update `my-draft-results.component.html` toolbar: search input (240×34, clear button), Created by multiselect control, Project dropdown (existing behavior, unified row). Add chips row below. Debounce search in component (~300ms) calling `filter.setSearchText`.
- **Implements:** `BADF-R-1`, `BADF-R-7`, `BADF-R-12`, `BADF-AC-1`, `BADF-AC-3`
- **Files:** `my-draft-results.component.{html,ts,scss}`
- **Depends on:** `BADF-T-1`, `BADF-T-2`
- **Blocks:** `BADF-T-5`
- **Estimate:** `M`
- **Skills:** `angular-developer`
- **Definition of done:**
  - [x] Toolbar visible when `isDraftListLoaded() && hasAnyDrafts()`
  - [x] Search + Created by + Project on one row (wrap on mobile)
  - [x] Visual parity with `bilateral-results-list` filter bar spacing
  - [x] Lint clean: `npx ng lint --quiet` (file-scoped if possible)

### `BADF-T-4` — Wire filtered list + empty states — `[x]` PASS

- **Type:** `client`
- **Description:** Wire `drafts()` through extended `filterDrafts` with `filterContext` (projectNameMap, resolvedUserNames, currentUserId). Ensure grouping runs on filtered drafts. Verify `isFilteredEmpty()` and filtered-empty template + Clear all button.
- **Implements:** `BADF-R-9`, `BADF-R-11`, `BADF-DD-3`, `BADF-AC-5`
- **Files:** `my-draft-results.component.ts`, `.html`
- **Depends on:** `BADF-T-1`
- **Blocks:** `BADF-T-5`
- **Estimate:** `S`
- **Skills:** `angular-developer`
- **Definition of done:**
  - [x] Filter applies before session grouping
  - [x] "No drafts yet" vs "No drafts match filters" distinct copy
  - [x] Filter service still `providers: [MyDraftResultsFilterService]` on component only

### `BADF-T-5` — Component + integration tests — `[x]` PASS

- **Type:** `client`
- **Description:** Extend `my-draft-results.component.spec.ts` for search debounce, Created by filter narrows rendered cards, chip removal, Clear all, filtered empty state. Keep existing P2-3319 project filter tests green.
- **Implements:** `BADF-AC-1`–`AC-6`, defect coverage table
- **Files:** `my-draft-results.component.spec.ts`, `my-draft-results-filter.service.spec.ts`
- **Depends on:** `BADF-T-3`, `BADF-T-4`
- **Blocks:** —
- **Estimate:** `M`
- **Skills:** `angular-developer`, `tdd`
- **Definition of done:**
  - [x] Creator UX tests (`quick/draft-results-creator-ux`) still pass
  - [x] P2-3319 project filter tests still pass
  - [ ] Verification:
    ```bash
    cd onecgiar-pr-client && npx jest --silent --reporters=summary --no-coverage \
      --testPathPattern="my-draft-results-filter.service.spec|my-draft-results.component.spec"
    ```

### `BADF-T-6` — (SHOULD) Category + Result level facets — `[ ]` skipped

- **Type:** `client`
- **Description:** If time permits: add `selectedCategories`, `selectedResultLevels`, predicates, dropdowns, and chips. Options derived from loaded drafts only.
- **Implements:** `BADF-R-13`, `BADF-R-14`
- **Files:** filter service + component template
- **Depends on:** `BADF-T-3`
- **Blocks:** —
- **Estimate:** `S`
- **Skills:** `angular-developer`
- **Definition of done:**
  - [ ] Optional — task may be marked `skipped` without blocking ship of T-1–T-5
  - [ ] If implemented: unit tests for both predicates

---

## 4. Definition of done (spec level)

- [x] All MUST tasks (`BADF-T-1`–`T-5`) marked PASS
- [x] Scoped Jest green (commands above)
- [x] No regression in bilateral Results tab
- [ ] Manual smoke: Drafts tab — search, Created by Me, project combo, Clear all

---

## 5. Next step

```text
/akili-execute changes/bilateral-ai-draft-filters
```

---

*AKILI-SPECS · specified 2026-09-16*
