# programme-results

**Verified:** 2026-08-21 · branch performance-refactor · eed5bb706

**What this owns:** the **Results** tab of the programme shell (`entity-details/:entityId/results`) — one flat, searchable table of every result reported by that one programme, plus its filter row, clickable status counters, Columns picker and CSV export.

## Contract

- `ProgrammeResultsComponent` is standalone + `OnPush`, and **provides both services itself**
  (`programme-results.component.ts:150`). Neither is `providedIn: 'root'` on purpose: leaving the tab
  must drop the rows and the filters instead of leaking one programme's state into the next.
- `ProgrammeResultsService` owns **data**: `rows()` (mapped `ProgrammeResultRow[]`), `loading()`,
  `error()`, `totalReported()`, `isPartial()`, and the derived option lists
  `statusOptions/categoryOptions/originOptions` — derived from the rows we hold, never hardcoded, so a
  dropdown can only ever offer a value some row actually has.
- `ProgrammeResultsFilterService` owns **filter state only** — no HTTP, no idea where rows come from:
  `searchText`, `selectedSections[]` (multi), `selectedStatus`, `selectedCategory`, `selectedOrigin`,
  plus `activeChips()` / `hasActiveFilters()` and the pure predicates
  `matchesProgrammeResultFilters` / `buildStatusCounts` that the spec drives directly.
- **Sorting belongs to `app-pr-table`**, not to either service. The component only renders the arrow
  glyph and the active colour (`sortArrow()` / `sortColor()`); `prSortableColumn` host-binds
  `aria-sort` itself — do not set it in the template.
- The component is the only place that joins them: `filteredRows()` (`:521`) = filter over data;
  `totalLabel()` (`:530`); and the **mutually exclusive** view states `isFirstLoad` / `hasRows` /
  `isFilteredEmpty` / `isNothingYet` (`:539-543`) — the mockup draws three independent blocks, this
  does not.
- Layout invariant: the header row and every data row are **one CSS grid built from the same
  `visibleColumns()` list** — `grid()` and `minWidth()` (`:500-518`) are recomputed from it, which is
  the only thing keeping them aligned when an optional column toggles.
- Data path: route code (`SP01`) → numeric `initiativeId` via `GET_ScienceProgramsProgress()`
  (`services/programme-results.service.ts:271`) → `GET_AllResultsWithUseRole(userId, {submitter_id})`
  (`:216`). `load()` is re-entrant and token-guarded, so a fast programme switch cannot land a stale
  response.
- Row activation mirrors `results-list.component.ts:634` exactly: a `W3/Bilaterals` row that is
  neither AVISA (`SGP-02`) nor `Approved` opens the bilateral **review drawer**; everything else opens
  Result Detail with `?phase=versionId` (`resultRoute()`, `:746`).
- Column visibility persists in `localStorage` under `pr.programmeResults.visibleColumns`
  (`PGR_COLUMN_STORAGE_KEY`, `:91`); all four optional columns default **off**, per the design.

## Where it is used

- `src/app/shared/routing/routing-data.ts:582-593` — the route entry (`prName: 'Program results'`,
  `data.rfrView: 'results'`). It `loadComponent`s this component directly instead of
  `loadDashboardLab`: this surface reads results, it does not drive the ToC reporting tables.
- `pages/dashboard-lab/components/reporting-program-band/reporting-program-band.component.html:161-172`
  — the third tab anchor ("Results", label at `:171`), whose href comes from `resultsPath()`
  (`reporting-program-band.component.ts:139`) and whose highlight comes from `activeTab` (`:71`).
- This tab renders that same band at `programme-results.component.html:22-29` with
  `[showToolbar]="false"` (the band's toolbar belongs to the Reporting tab; this tab owns its own
  filter row) and `[canReport]="false"` (the emerging-result CTA opens a modal this surface does not
  host).

## Gotchas

- ⚠️ **Five controls ship visible-but-disabled with a `Coming soon` tag** — each one is a real design
  control that has no honest data or no decided behaviour, so it is neither invented nor silently
  dropped. One `#comingSoon` template, one wording, five places (`...component.html:10`). Do not
  "finish" one without its ticket:
  | Control | Why disabled | Ticket |
  |---|---|---|
  | Row menu → *View indicator* | no payload carries `toc_result_id` / indicator id, so there is nothing to open | P2-3395 |
  | Row menu → *Copy link* | which link it copies (detail vs PDF report) is an open product decision | P2-3396 |
  | Row checkbox (`select` column) | `PrTableComponent.selectionMode` only toggles a class, and the design has no select-all and no bulk-action bar | P2-3397 |
  | *Section* filter (multi-select) | every row's `section` is `''`, so the filter could only ever hide everything | P2-3398 |
  | Indicator line under the result title | no results payload carries a ToC indicator; filling it with the result level would be fabricated data | P2-3399 |
- ⚠️ **`section` and `indicator` are absent from the payload, not merely empty.** `toProgrammeResultRow`
  hardcodes both to `''` (`programme-results.service.ts:134-135`): `get/all/roles/filter` has no AoW
  field, and the only endpoint that does (`by-program-and-centers`) is server-hard-filtered to the
  bilateral review queue. `updated` is mapped defensively from `last_updated_date`/`updated_date` and
  is also blank today. Verified live on prtest 2026-08-21 by listing the item keys — see the field
  inventory in the interface docstring before re-litigating this.
- ⚠️ **The ticket ids inside the two service docstrings are swapped** (they read `indicator → P2-3398`,
  `section → P2-3399`). The template and Jira are right: **3398 = Section filter, 3399 = indicator
  line**. Trust Jira, and fix a docstring if you touch it.
- **Filtering, sorting and counting are all client-side over ONE request** (`limit` 2000,
  `PROGRAMME_RESULTS_PAGE_LIMIT`). Reason, not laziness: the endpoint is already server-scoped to one
  programme by `submitter_id` (SP01 = 476 rows), the status counters must describe the whole programme
  rather than the current page — a server-paginated table can only count what it holds, which would
  make the pills lie — and the design has no pagination and no "load more" anywhere. It is **guarded**:
  if `meta.total` exceeds what we asked for, `isPartial()` flips and `totalLabel()` says "N of M"
  instead of passing a truncated list off as the whole programme. Do not add server paging without
  moving the counters server-side too.
- **`statusCounts()` filters with `{ ignoreStatus: true }`** (`:528`). Counting the already
  status-filtered rows would leave every pill but one at zero and break the clickable counters.
- **Status colours are fg/bg PAIRS** (`STATUS_TOKENS`, `:99`), copied verbatim from
  `result-header.component.ts:17` so a status looks identical here and on the result page. Never
  recombine a foreground with another background, never add a sixth status colour (UI-RULES rule 9).
  Unknown `status_id` falls back to the `not-started` pair, not to a new colour.
- **The Columns picker is a deliberate local duplicate.** The same inline picker already exists in
  `results-list.component.ts:47-140` and in `bilateral-results-list.component.ts`; it was written
  locally here because extracting it would mean editing two live screens. Follow-up (own PR): lift all
  three into `shared/components/pr-columns-picker/`. Do not "DRY" it as a side effect of another
  ticket.
- 🛑 **Never use `custom-fields/pr-select` (or any `custom-fields` field) on this surface.** Those
  components render `.pr-field.mandatory` / `.pr-select.mandatory`, and the green-check machinery
  counts those nodes by **CSS class through a DOM scan** (`DataControlService.someMandatoryFieldIncomplete`,
  `shared/services/data-control.service.ts:208` and `:224`) — a filter dropdown that happens to sit
  inside a scanned container is read as an incomplete mandatory field. The filter row uses the shared
  `app-pr-filter-select` / `app-pr-filter-multiselect` (they render `.custom_select`, invisible to that
  scan) reskinned to 40px via `.pgr-filter ::ng-deep`, borrowed from `.pr-band-filter` so the two
  toolbars cannot drift.
- CSV export reuses `bilateral-results-list.component.ts:299`, **not** `ExportTablesService` — that
  service only writes `.xlsx` through exceljs, so wiring the design's "Export CSV" button to it would
  hand the user a spreadsheet under a CSV label. `cellText()` is the single row→text function shared by
  the cells and the export, so they can never disagree.

## Open product questions — P2-3400 (business decision, blocks QA sign-off)

- **Single table vs per-category tables.** P2-2017 ("Develop results view by Indicator Category",
  *Ready To Develop*, Ángel) approves several tables reached from cards with a left-hand menu; the live
  Claude Design shows one table with search + filters. We built the design, as instructed — if P2-2017
  still stands, QA will reject this tab for not matching it.
- **Name collision.** P2-3169 and P2-3317 already call a Centers-panel tab "Results tab". If this one
  keeps the same name, QA reports and user feedback will not distinguish them.
- **"Origin" is an assumption.** Nothing in the app is called Origin; it is wired to the result's
  funding source (`source_name`: `W1/W2` | `W3/Bilaterals`) as the closest existing field. If product
  meant something else, both the filter and the column change.
