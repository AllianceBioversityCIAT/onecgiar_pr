# programme-results

**Verified:** 2026-08-28 · branch performance-refactor · f65871e71

**What this owns:** the **Results** tab of the programme shell (`entity-details/:entityId/results`) — one flat, searchable table of every result reported by that one programme, plus its filter row, clickable status counters, Columns picker and CSV export.

## Contract

- `ProgrammeResultsComponent` is standalone + `OnPush`, and **provides both services itself**
  (`programme-results.component.ts:150`). Neither is `providedIn: 'root'` on purpose: leaving the tab
  must drop the rows and the filters instead of leaking one programme's state into the next.
- `ProgrammeResultsService` owns **data**: `rows()`, `loading()`, `error()`, `totalReported()`,
  `isPartial()`, and `statusOptions/categoryOptions/originOptions` — derived from the rows we hold,
  never hardcoded, so a dropdown can only offer a value some row actually has.
- `ProgrammeResultsFilterService` owns **filter state only** — no HTTP, no idea where rows come from:
  `searchText`, `selectedSections[]`, `selectedStatus/Category/Origin`, `activeChips()`,
  `hasActiveFilters()`, plus the pure predicates `matchesProgrammeResultFilters` / `buildStatusCounts`.
- **Sorting belongs to `app-pr-table`.** The component only renders the glyph and colour
  (`sortArrow()` / `sortColor()`); `prSortableColumn` host-binds `aria-sort` — never set it in the template.
- The component is the only place that joins them: `filteredRows()` (`:521`), `totalLabel()` (`:530`)
  and the **mutually exclusive** view states `isFirstLoad`/`hasRows`/`isFilteredEmpty`/`isNothingYet`
  (`:539-543`) — the mockup draws three independent blocks, this does not.
- Layout invariant: the header row and every data row are **one CSS grid built from the same
  `visibleColumns()` list** — `grid()` and `minWidth()` (`:500-518`) are recomputed from it, which is
  the only thing keeping them aligned when an optional column toggles.
- Data path: route code (`SP01`) → numeric `initiativeId` via `GET_ScienceProgramsProgress()`
  (`services/programme-results.service.ts:271`) → `GET_AllResultsWithUseRole(userId, {submitter_id})`
  (`:216`). `load()` is token-guarded, so a fast programme switch cannot land a stale response.
- Row activation mirrors `results-list.component.ts:634` exactly: a `W3/Bilaterals` row that is
  neither AVISA (`SGP-02`) nor `Approved` opens the bilateral **review drawer**; everything else opens
  Result Detail with `?phase=versionId` (`resultRoute()`, `:746`).
- Column visibility persists in `localStorage` (`PGR_COLUMN_STORAGE_KEY`, `:91`); all four optional columns default **off**, per the design.

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

- ⚠️ **Four controls ship visible-but-disabled with a `Coming soon` tag** — real design controls with
  no honest data behind them, neither invented nor silently dropped. One `#comingSoon` template
  (`...component.html:10`). Do not "finish" one without its ticket:
  | Control | Why disabled | Ticket |
  |---|---|---|
  | Row menu → *View indicator* | no payload carries `toc_result_id` / indicator id, so there is nothing to open | P2-3395 |
  | Row checkbox (`select` column) | `PrTableComponent.selectionMode` only toggles a class, and the design has no select-all and no bulk-action bar | P2-3397 |
  | *Section* filter (multi-select) | every row's `section` is `''`, so the filter could only ever hide everything | P2-3398 |
  | Indicator line under the result title | no results payload carries a ToC indicator; filling it with the result level would be fabricated data | P2-3399 |
- ⚠️ **Row-menu labels carry `whitespace-nowrap` and the popup is `w-[248px]`, not 200px.** At 200px
  `View indicator` wrapped and dragged its pill down: label 92px + pill 89px + 6px gap + 20px padding
  = 207px of content in a 168px box. Measure before adding a longer label or a second pill.
- ⚠️ **The open row's actions cell needs `pgr-actions--open` (`z-index: 10`).** Every `td.pgr-actions`
  is sticky at `z-index: 3`, so among equals DOM order wins and the rows BELOW painted their opaque
  `background: inherit` over an open menu — their `⋯` showed through it. The menu's own `z-30` cannot
  fix that: it only ranks inside its own cell's stacking context. Elevate the CELL, never the popup.
- **`Copy link` copies the ABSOLUTE url of `resultRoute(row)`** (`resultLink()` / `copyLink()`,
  `:812-828`) — same destination as `Open result`, review-drawer deep link included, built through
  `router.createUrlTree` + `serializeUrl` (not string concat like `pdfHref`: the review branch has
  query params to encode). 🛑 Its toast key is **`globalUserNotification`** — a `<app-pr-toast>` host
  only renders its own key, and that is the one host `app.component.html:83` always mounts.
- ⚠️ **`section` and `indicator` are absent from the payload, not merely empty.** `toProgrammeResultRow`
  hardcodes both to `''` (`programme-results.service.ts:134-135`): `get/all/roles/filter` has no AoW
  field, and the only endpoint that does (`by-program-and-centers`) is server-hard-filtered to the
  bilateral review queue. `updated` is mapped defensively from `last_updated_date`/`updated_date` and
  is also blank today. Verified live on prtest 2026-08-21 by listing the item keys — see the field
  inventory in the interface docstring before re-litigating this.
- ⚠️ **The ticket ids in the two service docstrings are swapped.** Jira and the template are right:
  **3398 = Section filter, 3399 = indicator line**. Fix a docstring if you touch it.
- **Filtering, sorting and counting are all client-side over ONE request** (`limit` 2000,
  `PROGRAMME_RESULTS_PAGE_LIMIT`). Reason, not laziness: the endpoint is already server-scoped to one
  programme by `submitter_id` (SP01 = 476 rows), the status counters must describe the whole programme
  rather than the current page — a server-paginated table can only count what it holds, which would
  make the pills lie — and the design has no pagination and no "load more" anywhere. It is **guarded**:
  if `meta.total` exceeds what we asked for, `isPartial()` flips and `totalLabel()` says "N of M"
  instead of passing a truncated list off as the whole programme. Do not add server paging without
  moving the counters server-side too.
- **`statusCounts()` filters with `{ ignoreStatus: true }`** (`:528`) — counting already-filtered rows
  would leave every pill but one at zero and break the clickable counters.
- **Status colours are fg/bg PAIRS** (`STATUS_TOKENS`, `:99`), copied verbatim from
  `result-header.component.ts:17` so a status looks identical here and on the result page. Never
  recombine a foreground with another background, never add a sixth (UI-RULES rule 9). An unknown
  `status_id` falls back to the `not-started` pair.
- **The Columns picker is a deliberate local duplicate** of `results-list.component.ts:47-140` and
  `bilateral-results-list.component.ts`; extracting it means editing two live screens. Do not "DRY"
  it in passing — follow-up is its own PR into `shared/components/pr-columns-picker/`.
- 🛑 **Never use `custom-fields/pr-select` (or any `custom-fields` field) on this surface.** They emit
  `.pr-field.mandatory`, and the green-check DOM scan (`DataControlService.someMandatoryFieldIncomplete`,
  `shared/services/data-control.service.ts:208`, `:224`) counts those nodes by CSS class — a filter
  dropdown inside a scanned container reads as an incomplete mandatory field. Use the shared
  `app-pr-filter-select` / `app-pr-filter-multiselect` (`.custom_select`, invisible to the scan),
  reskinned to 40px via `.pgr-filter ::ng-deep` borrowed from `.pr-band-filter`.
- ⚠️ **`Update result` (P2-3508) delegates eligibility, it does not re-derive it.** `canUpdateResult()`
  runs the same branch as `results-list.component.ts:483`: non-AVISA `W3/Bilaterals` →
  `api.canUpdateBilateral`, everything else → `api.shouldShowUpdate`. Both read fields this row does
  **not** map (`initiative_entity_map`, `initiative_entity_user`), which is why `row.raw` keeps the
  untouched payload item. Fork the rule and this screen offers an update the old list refuses.
- ⚠️ **`app-change-phase-modal` is mounted LAZILY** (`@if (changePhaseModalMounted())`). Its
  `ngOnInit` fires `getCurrentPhases()` + `GET_phaseReportingInitiatives()`; mounting it eagerly cost
  two requests per visit and broke every component spec on `getCurrentPhases` of an undefined mock.
  It reads the result off `DataControlService.currentResult`, so set that **before** raising
  `chagePhaseModal` (historical misspelling — do not rename).
- CSV export reuses `bilateral-results-list.component.ts:299`, **not** `ExportTablesService` (which
  only writes `.xlsx`, so "Export CSV" would hand out a spreadsheet). `cellText()` is the one row→text
  function behind both the cells and the export, so they cannot disagree.

## Open product questions — P2-3400 (business decision, blocks QA sign-off)

- **Single table vs per-category tables:** P2-2017 approves several tables behind cards + a left menu;
  the live design shows one filtered table, which is what we built. If P2-2017 stands, QA rejects this.
- **Name collision:** P2-3169 / P2-3317 already call a Centers-panel tab "Results tab".
- **`Origin` is an assumption** — wired to `source_name`, the closest existing field.
