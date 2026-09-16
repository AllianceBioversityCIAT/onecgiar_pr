# Programme Results — Phase / Status / Created by multiselect — `tasks.md`

## 1. Scope

- **Module / feature:** `result-framework-reporting/programme-results-multiselect-filters`
- **Linked spec:** `requirements.md` + `design.md`
- **Status:** `complete`
- **Prefix:** `PRM`

---

## 2. Pre-flight checklist

- [x] `requirements.md` approved
- [x] `design.md` approved
- [x] PRM-OQ-1 accepted (phase empty → `[defaultPhase()]`, not all phases)
- [x] No conflicting in-flight spec on `ProgrammeResultsFilterService`

---

## 3. Task list

### PRM-T-1 — Filter service: array state, predicates, chips, toggles

- **Type:** client + tests
- **Description:** Convert `selectedPhase` / `selectedStatus` / `selectedCreatedBy` to `string[]` signals on `ProgrammeResultsFilterService`. Update `ProgrammeResultsFilterState`, `matchesProgrammeResultFilters`, `activeChips`, `clearChip`, dimension clear helpers, and `toggleStatus` (use `toggleInList`). Add `clearPhases`, `clearStatuses`, `clearCreatedBy(creator?)` mirroring category helpers.
- **Implements:** PRM-R-4, PRM-R-7; predicates for PRM-R-1, PRM-R-2, PRM-R-3
- **Design refs:** PRM-DD-1, PRM-DD-3
- **Files (expected):**
  - `onecgiar-pr-client/.../programme-results/services/programme-results-filter.service.ts`
  - `onecgiar-pr-client/.../programme-results/services/programme-results-filter.service.spec.ts`
- **Depends on:** —
- **Estimate:** M
- **Skills:** `angular-developer`
- **Definition of done:**
  - [ ] Phase OR-match preserves existing normalize rules (phaseName, year, versionId)
  - [ ] Status OR-match; `ignoreStatus` unchanged
  - [ ] Created-by OR-match
  - [ ] One chip per array element for all three dimensions
  - [ ] `clearChip` removes single value; status/created-by clear to `[]`
- **Verification:**
  - **Pass:** `cd onecgiar-pr-client && npx jest --silent --reporters=summary --no-coverage --testPathPattern="programme-results-filter.service.spec"`
  - **Fail if:** any predicate scenario from PRM-R-1..3 lacks a spec case; OR semantics not asserted with multi-value arrays
  - **Falsifier:** a test with `selectedPhases: ['A','B']` and rows in A-only, B-only, neither — expect only A and B rows pass

---

### PRM-T-2 — Results tab: multiselect UI, URL bridge, status pills, phase default

- **Type:** client + tests
- **Description:** Swap Phase/Status/Created by to `app-pr-filter-multiselect` in `programme-results.component.html`. Update URL hydrate/mirror effects to `parseListParam` / `joinListParam` / `sameListParam`. Update `isStatusActive`, `onStatusCountClick`, `clearChip` phase fallback to `[defaultPhase()]`, `clearAll`, remove obsolete single-select handlers. Update `programme-results-query-params.ts` header comment to document multi-value for phase/status/createdBy.
- **Implements:** PRM-R-1, PRM-R-2, PRM-R-3, PRM-R-5, PRM-R-6, PRM-R-9; scenarios for status pills (PRM-R-2)
- **Design refs:** PRM-DD-2, PRM-DD-4
- **Files (expected):**
  - `onecgiar-pr-client/.../programme-results/programme-results.component.{html,ts}`
  - `onecgiar-pr-client/.../programme-results/programme-results.component.spec.ts`
  - `onecgiar-pr-client/.../programme-results/services/programme-results-query-params.ts` (comments)
- **Depends on:** PRM-T-1
- **Estimate:** M
- **Skills:** `angular-developer`
- **Definition of done:**
  - [ ] Three multiselects in Filters popover; no `app-pr-filter-select` for phase/status/createdBy
  - [ ] `?status=Editing,Submitted` hydrates and filters correctly
  - [ ] Legacy `?status=Submitted` still works
  - [ ] Load without `?phase=` → `[defaultPhase()]` after loading completes
  - [ ] Clear filters retains phase default; status/created-by fully cleared
  - [ ] Status pill toggles multiselect membership
- **Verification:**
  - **Pass:** `cd onecgiar-pr-client && npx jest --silent --reporters=summary --no-coverage --testPathPattern="programme-results.component.spec"`
  - **Also run if query map touched:** `npx jest --silent --reporters=summary --no-coverage --testPathPattern="dashboard-lab.scope.spec"`
  - **Fail if:** hydrate sets phase while `loading()` true; mirror writes empty string params; single-select handlers remain
  - **Falsifier:** test with `queryParams` `{ status: 'A,B' }` must hydrate two statuses — if only first is applied, FAIL
  - **Presence gap:** multiselect keyboard a11y not proven by Jest — note for HITL

---

### PRM-T-3 — My Work board parity + module doc stamp

- **Type:** client + tests + docs
- **Description:** Apply same multiselect controls and URL array bridge on `my-work-board.component.{html,ts}`. Fix any compile errors from renamed filter signals. Update `programme-results/CLAUDE.md` Contract bullet for filter dimensions. Re-stamp `**Verified:**` line.
- **Implements:** PRM-R-8
- **Design refs:** PRM-DD-5
- **Files (expected):**
  - `onecgiar-pr-client/.../my-work-board/my-work-board.component.{html,ts}`
  - `onecgiar-pr-client/.../my-work-board/my-work-board.component.spec.ts`
  - `onecgiar-pr-client/.../programme-results/CLAUDE.md`
- **Depends on:** PRM-T-2
- **Estimate:** S
- **Skills:** `angular-developer`
- **Definition of done:**
  - [ ] My Work filter popover shows multiselect for phase/status/createdBy
  - [ ] URL share between Results and My Work for same params still works
  - [ ] `CLAUDE.md` documents array-shaped phase/status/createdBy
- **Verification:**
  - **Pass:** `cd onecgiar-pr-client && npx jest --silent --reporters=summary --no-coverage --testPathPattern="my-work-board.component.spec"`
  - **Fail if:** My Work still references `selectedPhase()` as scalar; build errors in my-work-board
  - **Falsifier:** spec asserting `filter.selectedStatuses()` is `string[]` after URL hydrate with comma list

---

## 4. Dependency graph

```text
PRM-T-1 (filter service)
  └── PRM-T-2 (Results UI + URL + pills)
        └── PRM-T-3 (My Work parity + CLAUDE.md)
```

---

## 5. PR strategy

**Single PR** (~300–420 LOC total). Logical commit split optional:

1. `PRM-T-1` service + filter specs
2. `PRM-T-2` + `PRM-T-3` UI hosts

No server changes; no migration check.

---

## 6. Estimated LOC

| Area | LOC |
|---|---|
| Filter service | ~80–100 |
| Results component | ~60–80 |
| My Work component | ~40–60 |
| Tests | ~120–180 |
| **Total** | **~300–420** |

---

## 7. Manual HITL (post-Jest)

- [ ] SP01 Results tab: open Filters, select 2 statuses + 2 phases — table and chips match
- [ ] Copy URL, reload — selections restore
- [ ] Status pills work with multiselect
- [ ] Clear filters — phase retained, others cleared
- [ ] Tab to multiselect, Escape closes panel (keyboard)
