# AGENTS.md — `bilateral-results/`

> **Scope:** the `/result-framework-reporting/entity-details/:entityId/results-review` page — a two-pane workspace where Program admins review bilateral results submitted by CGIAR Centers.
> **Parent guide:** [`../../AGENTS.md`](../../AGENTS.md) (module root).
> **Deeper guide:** [`./components/results-review-table/components/result-review-drawer/AGENTS.md`](./components/results-review-table/components/result-review-drawer/AGENTS.md) (the 1,666-LOC review drawer).

---

## 1. Purpose & user value

This is the **heart of the bilateral interoperability flow** that STAR (and other consumers) need to replicate. The page lets a Program admin:

1. See a sidebar of CGIAR Centers with pending-review counts.
2. Filter results by indicator category, status, lead center, and free-text search.
3. Open any pending result in a review drawer to inspect, edit, and approve / reject.

Without this page, the bilateral coordination loop between Science Programs and CGIAR Centers cannot close.

---

## 2. Files in this folder

```
bilateral-results/
├── bilateral-results.component.{ts,html,scss,spec.ts}      Page shell + breadcrumb + layout
├── bilateral-results.service.ts                            Feature state (signals, computed counts)
├── bilateral-results.service.spec.ts
└── components/
    ├── indicators-sidebar/                                  Centers list with pending counts
    ├── results-review-container/                            <ng-content/> wrapper
    ├── results-review-filters/                              Search input + filters drawer + chip bar
    └── results-review-table/                                Grouped table + per-row action button
        ├── results-review-table.component.{ts,html,scss,spec.ts}
        └── components/
            └── result-review-drawer/                        See dedicated AGENTS.md (drawer is its own complex world)
```

---

## 3. Layout

```
┌────────────────────────────────────────────────────────────────────┐
│  Breadcrumb: Science programs > <Initiative> > Bilateral Results   │
├────────────────┬───────────────────────────────────────────────────┤
│                │  ┌─────────────────────────────────────────────┐  │
│  Centers       │  │ Search input │ Filters btn │ Clear filters  │  │
│  Sidebar       │  ├─────────────────────────────────────────────┤  │
│  (238px)       │  │ Active chip bar (groups: indicator/status/  │  │
│                │  │  lead-center, each with removable chips)    │  │
│                │  ├─────────────────────────────────────────────┤  │
│  - All Centers │  │                                             │  │
│  - AfricaRice  │  │  Grouped table (by project_name)            │  │
│  - CIAT        │  │                                             │  │
│  - …           │  │  Code | Title | Indicator | Status | TOC    │  │
│                │  │  | Indicator | Submission date | Actions    │  │
│                │  │                                             │  │
│                │  │  [Review result] / [See result]             │  │
│                │  │                                             │  │
│                │  └─────────────────────────────────────────────┘  │
└────────────────┴───────────────────────────────────────────────────┘
```

`calc(100vh - 80px)` height (assumes shell header = 80px). Below 1115px the layout is unchanged but the table scrolls horizontally.

---

## 4. Routes & URL contract

```
/result-framework-reporting/entity-details/:entityId/results-review
  ?center=<centerCode>         optional — preselects a center in the sidebar
  ?search=<text>               optional — preseeds the search input
```

Both query params are **shareable / deep-linkable**:
- The sidebar reads `?center=` on init via `activatedRoute.snapshot.queryParams['center']` and calls `selectCenter(code, false)` (the `false` flag prevents updating the URL again).
- The filters component reads `?search=` on init via `activatedRoute.snapshot.queryParamMap.get('search')` and seeds `searchText`.
- The filters component updates `?search=` on every keystroke via `Location.replaceState()` — no history pollution.
- The sidebar updates `?center=` on every click via `router.navigate(..., { queryParamsHandling: 'merge' })`.

**⚠️ Partial URL persistence** (see §11.15 of the root AGENTS.md): the three multi-select filters (indicator category, status, lead center) are **NOT** in the URL. Page reload loses them. Replicators may want to extend URL sync for shareable filtered views.

---

## 5. State — `BilateralResultsService`

Singleton (`providedIn: 'root'`). State across navigations is shared; `ngOnDestroy` in the table resets `searchText` defensively.

### 5.1 Public signals

```ts
entityId                   : signal<string>('')
entityDetails              : signal<any>({})
centers                    : signal<CenterDto[]>([])
currentCenterSelected      : signal<string[]>([])     // array because backend takes csv
selectedCenterCode         : signal<string | null>(null)
searchText                 : signal<string>('')
selectedIndicatorCategories: signal<string[]>([])
selectedStatus             : signal<string[]>([])
selectedLeadCenters        : signal<string[]>([])
tableData                  : signal<GroupedResult[]>(initial placeholder row)
tableResults               : signal<ResultToReview[]>([])
allResultsForCounts        : signal<ResultToReview[]>([])
showReviewDrawer           : signal<boolean>(false)
currentResultToReview      : signal<any>(null)
```

### 5.2 Computed (derived state)

| Computed | Inputs | Purpose |
|---|---|---|
| `indicatorCategoryOptions` | `tableResults()` | Sorted unique values for the indicator-category multiselect. |
| `statusOptions` | `tableResults()` | Sorted unique values for the status multiselect. |
| `leadCenterOptions` | `tableResults()` | Sorted unique values for the lead-center multiselect. |
| `pendingCountByAcronym` | `allResultsForCounts()` | `Record<centerAcronym, count>` of pending rows (`status_id == 5`). |
| `totalPendingCount` | `allResultsForCounts()` | Total pending across all centers. |
| `centerAcronymsWithResults` | `allResultsForCounts()` | `Set<string>` of acronyms with at least one result. |
| `centersToShowInSidebar` | `centers()`, `centerAcronymsWithResults()` | Filter to centers actually represented. |

**Critical**: `pendingCountByAcronym` and `totalPendingCount` derive from `allResultsForCounts`, NOT `tableResults`. This is intentional — when the user filters by a single center, `tableResults` shrinks, but the sidebar badges must keep showing global counts.

### 5.3 Methods

```ts
selectCenter(centerCode: string | null): void
  // null → currentCenterSelected = every center.code (all-centers view)
  // string → currentCenterSelected = [centerCode]

getEntityDetails(): void
  // GET /api/results-framework-reporting/clarisa-global-units?programId=<entityId>
  // → entityDetails.set(res.response.initiative)

clearBilateralTableFilters(): void
  // Resets the three multi-select filters (not searchText, not center)

refreshAllResultsForCounts(): void
  // GET /api/results/by-program-and-centers?programId=<entityId>
  //   (with all center codes joined by comma)
  // Flattens grouped response → allResultsForCounts
  // Called after Approve/Reject decisions to keep sidebar badges fresh
```

---

## 6. Effects (1 in this folder, see drawer for 3 more)

### 6.1 `ResultsReviewTableComponent.onChangeCenterSelected`

```ts
onChangeCenterSelected = effect(() => {
  const centers = this.bilateralResultsService.currentCenterSelected();
  if (centers.length > 0) {
    this.getResultsToReview(centers);
  }
  this.bilateralResultsService.tableData.set([]);
  this.bilateralResultsService.tableResults.set([]);
  this.bilateralResultsService.clearBilateralTableFilters();
});
```

Trigger: `currentCenterSelected()` change (from sidebar click OR initial URL hydration).

Side-effects (in order):
1. If non-empty array → dispatch `getResultsToReview(centers)`.
2. Clear `tableData` and `tableResults` (table flashes empty until the new fetch lands).
3. Clear the three multi-select filters (chips disappear).

The clear-then-fetch pattern produces a **visual flash** during center switches. Acceptable for the current UX, but replicators may want to keep previous data visible until the new fetch arrives.

---

## 7. Component-by-component

### 7.1 `BilateralResultsComponent` (page shell)

- Standalone (Angular 19 default).
- Reads `:entityId` from `route.params`, calls `bilateralResultsService.getEntityDetails()`.
- Renders breadcrumb. Two states based on `?center=`:
  - **Without `center`**: 3 crumbs: "Science programs > <entity> > Bilateral Results Review".
  - **With `center`**: 4 crumbs; the third becomes a back-link to the un-filtered view (`navigateToResultsReview()`).
- Layout = sidebar + container with `<ng-content/>` wrapping filters + table.

### 7.2 `IndicatorsSidebarComponent`

- Reads `centersService.getData()` (CLARISA centers) on init.
- Reads `?center=<code>` from URL on init; if valid, selects it (without re-writing URL).
- "All Centers" entry is fixed at the top with the `list` material icon and `totalPendingCount()` badge.
- Per-center entries: `apartment` icon + acronym + pending-count badge (only when `pendingCountByAcronym()[acronym] > 0`).
- Renders only centers in `centersToShowInSidebar()`.
- Keyboard accessible: `tabindex="0"`, `role="button"`, `keydown.enter` + `keydown.space`.

**⚠️ Stale counts on deep-link** (see §11.13 of root): if the user lands with `?center=AfricaRice`, `allResultsForCounts` is **never hydrated** with other centers' data until the user clicks "All Centers" or commits a decision. Sidebar will show 0 for every other center even if they have pending results.

### 7.3 `ResultsReviewContainerComponent`

A thin `<ng-content/>` wrapper. Exists for layout / styling encapsulation. Nothing else to know.

### 7.4 `ResultsReviewFiltersComponent`

The most behavior-rich component on this page besides the drawer.

- Left side: search input (350px) + filter button (with badge if active count > 0) + clear button.
- Below: chip bar — for each active filter group, label + arrow + chips with `(onRemove)`.
- Right-side custom drawer (NOT PrimeNG `p-drawer`):
  - Pure CSS + `[class.visible]/[class.open]`.
  - Top offset = live navbar height via `ResizeObserver` watching the first match among `app-header-panel`, `header`, `nav`, `.navbar`, `.header`. Default 60px.
  - 3 multi-selects (indicator category, status, lead center) bound to **temp signals** (`tempSelectedX`).
  - Apply commits temp → service signals. Cancel discards temp.
- `onSearchChange()` → updates `searchText` signal + writes `?search=` via `Location.replaceState`.

### 7.5 `ResultsReviewTableComponent`

- PrimeNG `p-table` with `rowGroupMode="subheader"`, `groupRowsBy="project_name"`, `expandedRowKeys` pre-expands all groups.
- `filteredTableData` (computed) applies search + 3 multi-select filters client-side over `bilateralResultsService.tableData()`. Drops empty groups.
- Search field scope (verified): matches `result_code`, `result_title`, `indicator_category`, `toc_title`, `indicator`. **Does NOT match** `project_name`, `lead_center`, `submission_date`.
- Status badges (CSS classes): `approved | rejected | pending` (else-branch catch-all).
- Contributor badge: when `result.initiative_role_name === 'Contributor'`, render a "Contributor" chip next to the title.
- Action button label/icon flips on `status_id == 5 && canReviewResults()`:
  - True → "Review result" + `edit` icon.
  - False → "See result" + `visibility` icon.
- Opens the drawer via two-way bind to `bilateralResultsService.showReviewDrawer` + `currentResultToReview`.
- Output `(decisionMade)` from the drawer re-fetches both `getResultsToReview` and `refreshAllResultsForCounts`.

### 7.6 `ResultReviewDrawerComponent`

See dedicated [`./components/results-review-table/components/result-review-drawer/AGENTS.md`](./components/results-review-table/components/result-review-drawer/AGENTS.md). It is its own world.

---

## 8. API endpoints used

| Verb | Path | Caller |
|---|---|---|
| GET | `api/results-framework-reporting/clarisa-global-units?programId=<id>` | `getEntityDetails()` |
| GET | `api/results/by-program-and-centers?programId=<id>&centerIds=<csv-single>` | `getResultsToReview()` |
| GET | `api/results/by-program-and-centers?programId=<id>` (no centerIds = all) | `refreshAllResultsForCounts()` |
| GET | (delegated to `centersService.getData()`) CLARISA centers catalog | Sidebar init |
| All drawer endpoints | See drawer AGENTS.md | The drawer |

> ⚠️ **Single vs all-centers fetch contract**: when exactly **1** center is selected, the URL includes `&centerIds=<code>`. When **all** centers are selected (sidebar "All Centers"), the URL omits `centerIds`. The backend interprets the absence as "all centers". Verified against `GET_ResultToReview(programId, centerIds?)` in `results-api.service.ts` lines 1454-1461.

---

## 9. User journey traces

### 9.1 Reviewer approves a result

```
1. User clicks "Review result" on a row.
2. Table sets currentResultToReview(row) and showReviewDrawer(true).
3. Drawer's load effect fires → loadResultDetail(id).
4. HTTP: GET /clarisa/projects/get/all
         GET /api/results/bilateral/<id>
         GET /clarisa/initiatives/get/all/without/result/<id>/<portfolio>
5. Normalization runs (see drawer AGENTS.md §3).
6. User clicks "APPROVE".
7. canApprove() verifies: isToCCompleted && !hasTocUnsavedChanges && !hasDataStandardUnsavedChanges.
8. Confirmation dialog opens (showConfirmApproveDialog=true).
9. User confirms → PATCH /api/results/bilateral/<id>/review-decision
                   body: { decision: 'APPROVE', justification: 'Approved' }.
10. On success: decisionMade.emit(), drawer closes (visible=false).
11. ResultsReviewTableComponent.onDecisionMade() fires:
    - getResultsToReview(currentCenters) re-fetches the table.
    - refreshAllResultsForCounts() re-fetches all centers' results to update sidebar.
12. Drawer ngOnDestroy:
    - drawerReadOnlyEffectRef.destroy()
    - RolesService.readOnly restored to original value
    - document.body.style.overflow = 'auto'
```

### 9.2 Reviewer rejects a result

Same as approve through step 6, then:
```
6. User clicks "REJECT" (button always enabled while footer is rendered).
7. Justification dialog opens (showConfirmRejectDialog=true).
8. User types into rejectJustification textarea (required, save disabled while empty).
9. User confirms → PATCH .../review-decision body: { decision: 'REJECT', justification: <user input> }.
10-12. Same as approve.
```

### 9.3 Deep-link landing with `?center=AfricaRice&search=cassava`

```
1. Browser hits /result-framework-reporting/entity-details/SP01/results-review?center=AfricaRice&search=cassava
2. BilateralResultsComponent mounts:
   - Reads :entityId (SP01), calls getEntityDetails().
3. IndicatorsSidebarComponent mounts:
   - centersService.getData() fetches centers catalog.
   - Reads ?center=AfricaRice → selectCenter('AfricaRice', false).
4. selectCenter writes currentCenterSelected = ['AfricaRice'] and selectedCenterCode='AfricaRice'.
5. ResultsReviewTableComponent.onChangeCenterSelected effect fires:
   - Clears tableData/tableResults/filters.
   - getResultsToReview(['AfricaRice']) → GET .../by-program-and-centers?programId=SP01&centerIds=AfricaRice
   - Updates tableData (grouped) + tableResults (flat).
   - Does NOT update allResultsForCounts (because only 1 center, not all).
6. ResultsReviewFiltersComponent mounts:
   - Reads ?search=cassava from queryParamMap.
   - searchText.set('cassava').
7. ResultsReviewTableComponent.filteredTableData (computed) re-runs, applies search.
8. Sidebar pending badges:
   - totalPendingCount() reads allResultsForCounts() → still empty!
   - pendingCountByAcronym() also empty.
   - Result: every center shows 0 in sidebar EXCEPT AfricaRice (because that's the only data we have).
9. User sees 1 AfricaRice card + only AfricaRice's pending count badge.
10. To fix the stale counts, user must click "All Centers" once.
```

This is the well-documented "stale counts on deep-link" gotcha. Replicators may want to call `refreshAllResultsForCounts()` unconditionally on mount.

---

## 10. Gotchas specific to this page

(Cross-references to the root AGENTS.md §11 catalog; the entries below have more page-specific detail.)

1. **Effect-based table flash** — `onChangeCenterSelected` clears table data synchronously before re-fetch. ~300ms of empty table on every center switch.

2. **Stale sidebar counts on deep-link** — See §9.3 above. Mitigation: explicit `refreshAllResultsForCounts()` on init.

3. **Partial filter URL persistence** — Only `?center=` and `?search=` are URL-backed. The three multi-selects are memory-only.

4. **Client-side filtering** — All filtering happens in the browser via `filteredTableData` computed. For large datasets (>500 rows per center) this becomes sluggish. Replicators with bigger data should move filtering to the server.

5. **Status loose equality** — Pending checks use `r.status_id == 5` (NOT `===`). Verified against `bilateral-results.service.ts:79`. Backend sometimes returns `5` as number, sometimes `"5"` as string.

6. **`searchText` ngOnDestroy reset** — `ResultsReviewTableComponent.ngOnDestroy()` resets `searchText.set('')`. Without this, navigating away and back would show a stale search.

7. **Sidebar shows zero centers initially** — `centersToShowInSidebar` filters by `centerAcronymsWithResults`. Until the first results-fetch resolves, ALL centers are shown (because `withResults.size === 0` triggers the "show all" branch). After the first fetch, only centers with results remain. This is correct but can surprise replicators who don't trace the computed dependency.

---

## 11. Recommended tests

```ts
describe('BilateralResultsService', () => {
  it('initializes entityId, searchText, selectedCenterCode, and drawer state with empty defaults');
  it('selectCenter(null) sets currentCenterSelected to every center.code');
  it('selectCenter(centerCode) sets currentCenterSelected to a single-item array');
  it('clearBilateralTableFilters() clears the three multi-select filters together');
  it('indicatorCategoryOptions() returns a sorted unique list from tableResults() and ignores falsy values');
  it('pendingCountByAcronym() counts only rows whose status_id == 5 and groups by lead_center');
  it('pendingCountByAcronym() ignores pending rows with null or empty lead_center keys');
  it('totalPendingCount() returns the count from allResultsForCounts(), NOT tableResults()');
  it('centersToShowInSidebar() returns all centers when centerAcronymsWithResults() is empty');
  it('centersToShowInSidebar() filters centers() to only those with results');
  it('refreshAllResultsForCounts() flattens grouped response into allResultsForCounts');
});

describe('ResultsReviewFiltersComponent', () => {
  it('hydrates searchText from ?search= query param on init');
  it('openFiltersDrawer() copies selected filters into tempSelected* signals');
  it('applyFilters() commits tempSelected* back to the service and closes the drawer');
  it('cancelFilters() restores tempSelected* from service and closes without mutating');
  it('removeFilter() removes one chip from the correct backing signal');
  it('onSearchChange() updates searchText and writes ?search= via Location.replaceState()');
});

describe('ResultsReviewTableComponent', () => {
  it('onChangeCenterSelected effect fires on currentCenterSelected change and clears table before fetch');
  it('getResultsToReview includes &centerIds= when exactly 1 center is selected');
  it('getResultsToReview omits centerIds when all centers are selected');
  it('filteredTableData applies search + 3 filters and drops empty groups');
  it('action button shows "Review result" + edit icon when status_id == 5 && canReviewResults');
  it('action button shows "See result" + visibility icon otherwise');
  it('onDecisionMade re-fetches results AND refreshAllResultsForCounts');
});
```

Cypress E2E:
1. Land on `?center=&search=` deep-link; verify sidebar selection and search input hydrate.
2. Apply 3 multi-select filters; verify chips render and table filters.
3. Cancel filter drawer; verify temp state rolls back.
4. Approve a result; verify table refreshes and sidebar badge decrements.
5. Reject a result with justification; verify justification dialog requires non-empty text.

---

## 12. See also

- [`./components/results-review-table/components/result-review-drawer/AGENTS.md`](./components/results-review-table/components/result-review-drawer/AGENTS.md) — the review drawer deep-dive.
- [`../../AGENTS.md`](../../AGENTS.md) — module-level architecture, API contracts, glossary.
- [`./bilateral-results.service.ts`](./bilateral-results.service.ts) — canonical source for the state contract.
