# programme-results

**Verified:** 2026-09-05 · branch qa-development-2026 · fe1d7402e (spec `changes/my-work-board`, MWB-T-13 — Category / Funding source / Center became MULTI-select on the shared `ProgrammeResultsFilterService`: `selectedCategories/Origins/Centers: string[]`, one chip per value, `parseListParam`/`joinListParam` for the comma-separated params, and the brand checkbox accent widened from `.pgr-filter--section` to `.pgr-filter`); prior: 1c438f120 (adds the viewport-lock layout contract below — unconditional host class, `#workArea` scroller, band `frameLocked`/`scrollHost`; fixes the stale `canReport` value; spec `changes/sp-shell-app-viewport` SAV-T-6); prior: 6a9a45b5e (spec `changes/results-aow-column-filter`, RAC-T-1..T-5 — Area of Work column, live Section filter, `results-scope` join; prior: 2026-08-28 · branch performance-refactor · 11ba9ab1c, P2-3312)

**What this owns:** the **Results** tab of the programme shell (`entity-details/:entityId/results`) — one flat, searchable table of every result that programme reported, plus its filter row, clickable status counters, Columns picker and CSV export.

## Contract

- `ProgrammeResultsComponent` is standalone + `OnPush`, and **provides both services itself**
  (`programme-results.component.ts:150`). Neither is `providedIn: 'root'` on purpose: leaving the tab
  must drop the rows and the filters instead of leaking one programme's state into the next.
- `ProgrammeResultsService` owns **data**: `rows()`, `loading()`, `error()`, `totalReported()`,
  `isPartial()`, and `statusOptions/categoryOptions/originOptions` — derived from the rows we hold,
  never hardcoded, so a dropdown can only offer a value some row actually has. Category is then
  *narrowed* further (P2-3312, below); the other four are shown whole.
- `ProgrammeResultsFilterService` owns **filter state only** — no HTTP, no idea where rows come from:
  `searchText`, `selectedSections[]`, `selectedPhase`, `selectedStatus`, `selectedCreatedBy`,
  `activeChips()`, `hasActiveFilters()`, plus the pure predicates `matchesProgrammeResultFilters` /
  `buildStatusCounts`. **Since `changes/my-work-board` (MWB-T-13) three dimensions are MULTI-value:**
  `selectedCategories` / `selectedOrigins` / `selectedCenters`, all `string[]` — **OR inside a
  dimension, AND across them**, `[]` meaning "no filter" (they replace the old single-value
  `selectedCategory` / `selectedOrigin` / `selectedCenter`). `activeChips()` emits **one chip per
  selected value** in selection order, so `clearChip()` removes exactly that value and leaves the
  dimension's others alone. Their query params are comma-separated lists bridged by the service's own
  `parseListParam` / `joinListParam` / `sameListParam` exports (`?category=a,b`; an empty selection
  joins to `null`, which REMOVES the key under `merge`) — a legacy single-value deep link hydrates as
  a one-element array, which is why the Overview's `RFD-*` links needed no change. **The My results
  board (`pages/my-work-board/`) consumes these same three signals and the same codecs** — it used to
  keep a board-local copy (`my-work-board.service.ts` — same three signals and codec); binding the board to this service is `changes/my-work-board` `MWB-T-13` phase 2, deferred on 2026-09-05. Until then both copies must stay behaviourally identical (OR within / AND across, `a,b` URL lists).
- **Sorting belongs to `app-pr-table`.** The component only renders the glyph and colour
  (`sortArrow()` / `sortColor()`); `prSortableColumn` host-binds `aria-sort` — never set it yourself.
- The component is the only place that joins them: `filteredRows()` (`:521`), `totalLabel()` (`:530`)
  and the **mutually exclusive** view states `isFirstLoad`/`hasRows`/`isFilteredEmpty`/`isNothingYet`
  (`:539-543`) — the mockup draws three independent blocks, this does not.
- Layout invariant: header row and data rows are **one CSS grid built from the same
  `visibleColumns()` list** — `grid()` / `minWidth()` (`:500-518`) recompute from it, which is the
  only thing keeping them aligned when an optional column toggles.
- Data path: route code (`SP01`) → numeric `initiativeId` via `GET_ScienceProgramsProgress()`
  (`services/programme-results.service.ts:271`) → `GET_AllResultsWithUseRole(userId, {submitter_id})`
  (`:216`), token-guarded so a fast programme switch cannot land a stale response.
- Row activation mirrors `results-list.component.ts:634` exactly: a `W3/Bilaterals` row that is
  neither AVISA (`SGP-02`) nor `Approved` opens the bilateral **review drawer**, everything else
  Result Detail with `?phase=versionId` (`resultRoute()`, `:746`).
- Column visibility persists in `localStorage` (`PGR_COLUMN_STORAGE_KEY`, `:91`); the four optional columns default **off**, per the design.

## Layout: viewport lock (spec `changes/sp-shell-app-viewport`, SAV-T-4/T-6)
- Host: `host: { class: 'pr-viewport-page' }` — **unconditional** (unlike `dashboard-lab`'s
  route-gated class; this surface only ever serves Results). `:host { display: block; @include
  vp.pr-viewport-page; }` lives in the `.scss`, NOT the inline `styles` array — Angular emits
  `styleUrls` content BEFORE inline `styles` at equal specificity, so an inline `display: block`
  there would silently beat the mixin's `display: flex` instead of losing to it (real bug caught in review).
- `#workArea` wraps the filter row + status counters + table (the ONE scroller ≥900px); band gets
  `[frameLocked]="true" [scrollHost]="workAreaEl()"`. **`< md`:** unchanged — document scrolls, band
  stays `sticky`.

## Area of Work column + live Section filter (`changes/results-aow-column-filter`, RAC-T-1..T-5)

- **One extra request, joined client-side by id.** `ProgrammeResultsService.loadScope(programId,
  versionId)` calls `GET_ResultsScope` (`results-api.service.ts`) against the server's new
  `results-framework-reporting/results-scope` endpoint — the SAME `result_scope` CTE the Overview's
  `getScopeBuckets` reduces to counts (`RAC-DD-1`/`DD-2`), returning one `{ result_id, key, kind,
  codes[] }` row per program-linked result, **any role, no funding-source filter**. Token-guarded like
  `load()`, refetched when the selected phase's `versionId` changes. State: `scope` (a
  `Map<number, ResultScope>` or `null`), `scopeLoading`, `scopeError`.
- **`joinResultScope(row, scope, scopeVersionId, scopeLoading, scopeError)`** (module-level pure
  function, `services/programme-results.service.ts:169`) is the ONLY place a row's `section` /
  `aowCodes` / `sectionState` / `sectionSort` are derived — `rows()` maps every raw row through it.
  `sectionState` is one of `'ready' | 'loading' | 'error' | 'version-mismatch'`: loading → skeleton
  cell (never `—`); error → `—` + a `title` explaining the buckets could not be loaded; a row whose
  OWN `versionId` differs from the phase the loaded buckets were fetched for → `'version-mismatch'`
  (A-1) — rendered like an error, not silently mis-bucketed. Only `'ready'` carries a real `section`.
- **Bucket-key vocabulary is shared with the Overview's `?scope=`** (`RAC-DD-3`): `AOW<nn>` (upper-case
  work-package acronym) · `INTERMEDIATE` · `EOI_2030` · `UNTAGGED`. `sectionLabel()`
  (`services/programme-results-section-labels.ts`) maps the three fixed keys to *Intermediate
  outcomes* / *2030 outcomes* / *Not tagged*; AoW keys render as their raw code. The two placeholder
  constants this file used to reference (`intermediate-outcomes` / `2030-outcomes`) are gone —
  replaced by the real fixed keys, never live before this spec.
- **`?section=`** (`services/programme-results-query-params.ts`,
  `PROGRAMME_RESULTS_SECTION_QUERY_PARAM`) is a comma-separated list of bucket keys, deliberately NOT
  namespaced — it is the exact same string the Overview's `?scope=` carries (`RAC-DD-3`), so an
  Overview breakdown row's *View results* button or a scope-active chart click lands here already
  filtered (`RAC-R-4`, see `pages/dashboard-lab/CLAUDE.md`'s `onOverviewLink`). Hydrates like every
  other param — chip, filter, badge — without rewriting the URL (anti-loop rule, `RAC-R-4.1`).
- **R-7 (SHOULD), fail-soft:** `ProgrammeResultsService.loadUnits(programId)`
  (`programme-results.service.ts:500`) fetches `clarisa-global-units` to append the AoW name beside
  its code in `sectionOptions()` (`AOW01 · Market Intelligence`). Token-guarded like
  `load()`/`loadScope()` but NOT the same failure contract — an empty/failed response just leaves
  `unitNames` at `{}` and every option label falls back to the bare code. Never treat a missing name as an error state the way `scopeError` does.
- **Live-verified (RAC-T-5, 2026-09-04, SP01 + SP12, phase "Reporting 2026" / `versionId` 36).** For
  every bucket key, the Results tab's count under `?section=<key>&origin=W1/W2` equals the Overview
  breakdown's total for that key on the **owner** population (`result.repository.ts` `submitter_id`
  filter, `initiative_role_id = 1`). Where they differ, the delta is exactly the count of
  `results-scope` ids that belong to the bucket but never appear in this programme's owned rows at
  all (contributor-only, `RAC-DD-6` / A-5) — confirmed by diffing the raw `results-scope` payload
  against `rows()`, not asserted. SP01: AOW01 (33 vs 32, Δ1), AOW03 (6 vs 4, Δ2), AOW04 (2 vs 1, Δ1)
  all explained by contributor-only ids; AOW02/AOW05/INTERMEDIATE/EOI_2030/UNTAGGED matched exactly.
  SP12: only AOW01 (5 vs 3, Δ2) had a contributor-only delta; every other key matched exactly. Median
  `results-scope` latency: SP01 61 ms, SP12 123 ms (3 runs each, target p95 < 300 ms). The Area of Work
  column renders real codes/labels (`AOW01`, `AOW02`, `Not tagged`, …) and the search box finds rows by AoW code (`AOW02` → 4 rows on SP01, 5 on SP12).

## Where it is used

- `src/app/shared/routing/routing-data.ts:582-593` — the route entry (`prName: 'Program results'`,
  `data.rfrView: 'results'`). It `loadComponent`s this directly, not `loadDashboardLab` (reads results,
  does not drive the ToC reporting tables).
- `pages/dashboard-lab/components/reporting-program-band/reporting-program-band.component.html:161-172`
  — the third tab anchor ("Results", label at `:171`), whose href comes from `resultsPath()`
  (`reporting-program-band.component.ts:139`) and whose highlight comes from `activeTab` (`:71`).
- This tab renders the same band (`programme-results.component.html:24-34`) with `[showToolbar]="false"`
  (owns its own filter row) and `[canReport]="true"` (the CTA renders, but `openWhereToReport()`
  navigates to `entity-details?whereToReport=true&returnTab=results` — `returnTab: 'results'`
  (`programme-results.component.ts:828`) is what sends the hub back here; the hub modal itself is
  hosted there, not on this tab).

## Gotchas

- ⚠️ **Three controls (down from four) still ship visible-but-disabled with a `Coming soon` tag** —
  real design controls with no honest data behind them. One `#comingSoon` template (`...component.html:10`);
  do not "finish" one without its ticket. The *Section* filter row that used to be in this table is
  GONE — closed by `changes/results-aow-column-filter` (P2-3398), see "Area of Work column + live Section filter" below:
  | Control | Why disabled | Ticket |
  |---|---|---|
  | Row menu → *View indicator* | no payload carries `toc_result_id` / indicator id, so there is nothing to open | P2-3395 |
  | Row checkbox (`select` column) | `PrTableComponent.selectionMode` only toggles a class, and the design has no select-all and no bulk-action bar | P2-3397 |
  | Indicator line under the result title | no results payload carries a ToC indicator; filling it with the result level would be fabricated data | P2-3399 (other half — the AoW half is now the column below) |
- ⚠️ **Row-menu labels carry `whitespace-nowrap`; the popup is `w-[248px]`, not 200px** — at 200px `View indicator` wrapped. Measure before adding a longer label.
- ⚠️ **The open row's actions cell needs `pgr-actions--open` (`z-index: 10`).** Every `td.pgr-actions`
  is sticky at `z-index: 3`, so DOM order wins and the rows BELOW painted their opaque background over
  an open menu. The popup's own `z-30` cannot fix it — elevate the CELL, never the popup.
- **`Copy link` copies the ABSOLUTE url of `resultRoute(row)`** (`resultLink()` / `copyLink()`, `:812-828`)
  — same destination as `Open result`, built through `router.createUrlTree` + `serializeUrl`, not
  string concat like `pdfHref` (the review branch has query params to encode). 🛑 Its toast key must
  be **`globalUserNotification`**: a `<app-pr-toast>` host only renders its own key, and that is the one `app.component.html:83` always mounts.
- ⚠️ **`indicator` is absent from the payload, not merely empty.** `toProgrammeResultRow` hardcodes it
  to `''` (`programme-results.service.ts:134-135`): `get/all/roles/filter` has no ToC-indicator field,
  and the only endpoint that does (`by-program-and-centers`) is server-hard-filtered to the bilateral
  review queue. `updated` is mapped defensively and is also blank today. `section` is DIFFERENT since
  `changes/results-aow-column-filter` (RAC-T-2) — see "Area of Work column + live Section filter" below;
  it is no longer a hardcoded `''`, it is `joinResultScope`'s output. Read the field inventory in the
  interface docstring before re-litigating either.
- ⚠️ **The ticket ids in the two service docstrings are swapped** — Jira and the template are right:
  **3398 = Section filter, 3399 = indicator line**.
- **Filtering, sorting and counting are all client-side over ONE request** (`limit` 2000,
  `PROGRAMME_RESULTS_PAGE_LIMIT`) — the endpoint is already scoped to one programme by `submitter_id`
  (SP01 = 476 rows), the counters must describe the WHOLE programme (server paging could only count
  what it holds), and the design has no pagination. **Guarded**: if `meta.total` exceeds what we asked,
  `isPartial()` flips and `totalLabel()` says "N of M". Do not add server paging without moving the counters server-side too.
- **`statusCounts()` filters with `{ ignoreStatus: true }`** (`:528`); counting already-filtered rows
  would zero every pill but one and break the clickable counters.
- **Status colours are fg/bg PAIRS** (`STATUS_TOKENS`, `:99`), verbatim from
  `result-header.component.ts:17`. Never recombine a fg with another bg, never add a sixth (UI-RULES
  rule 9); an unknown `status_id` falls back to the `not-started` pair.
- **The Columns picker is a deliberate local duplicate** of `results-list.component.ts:47-140` and
  `bilateral-results-list.component.ts` — extracting it means editing two live screens. Do not "DRY"
  it in passing; that is its own PR into `shared/components/pr-columns-picker/`.
- 🛑 **Never use `custom-fields/pr-select` (or any `custom-fields` field) on this surface.** They emit
  `.pr-field.mandatory`, and the green-check DOM scan (`DataControlService.someMandatoryFieldIncomplete`,
  `shared/services/data-control.service.ts:208`, `:224`) counts those nodes by CSS class — a filter
  dropdown inside a scanned container reads as an incomplete mandatory field. Use the shared
  `app-pr-filter-select` / `app-pr-filter-multiselect` (`.custom_select`, invisible to the scan), reskinned to 40px via `.pgr-filter ::ng-deep` borrowed from `.pr-band-filter`.
- ⚠️ **The Category dropdown is the ONLY narrowed one (P2-3312).** It offers the five Results
  Framework `result_type`s (`STANDARD_RF_CATEGORIES`, RF order, only those some row has) and then one
  `Other` bucket for `Capacity change` / `Other outcome` / `Other output` / `Impact contribution`. The
  bucket travels as the sentinel `__other__` — as one VALUE inside `selectedCategories` AND inside the
  comma-separated `category` query param — so `matchesProgrammeResultCategory` must stay its only
  reader (chips relabel it "Other"). Since MWB-T-13 it is one selection among many, not a mode:
  `['Knowledge product', '__other__']` is RF-KPs OR every non-RF row, not a contradiction. The
  ticket names the six RF *indicators*; five entries because both policy ones are one `result_type`,
  kept in `result_type` language so the pill agrees with the column beside it. 🛑 Exact non-RF values
  stay filterable — the Overview cards deep-link `category=Other output`, so `buildCategoryFilterOptions`
  re-adds the selected one rather than leave the pill blank.
- ⚠️ **`Update result` (P2-3508) delegates eligibility, it does not re-derive it.** `canUpdateResult()`
  runs the same branch as `results-list.component.ts:483`: non-AVISA `W3/Bilaterals` →
  `api.canUpdateBilateral`, everything else → `api.shouldShowUpdate`. Both read fields this row does
  **not** map (`initiative_entity_map`, `initiative_entity_user`), which is why `row.raw` keeps the untouched payload item. Fork the rule and this screen offers an update the old list refuses.
- ⚠️ **`app-change-phase-modal` is mounted LAZILY** (`@if (changePhaseModalMounted())`). Its
  `ngOnInit` fires `getCurrentPhases()` + `GET_phaseReportingInitiatives()`; an eager mount cost two
  requests per visit and broke every component spec. It reads the result off
  `DataControlService.currentResult`, so set that **before** raising `chagePhaseModal` (do not rename).
- CSV export reuses `bilateral-results-list.component.ts:299`, **not** `ExportTablesService` (xlsx only, so "Export CSV" would hand out a spreadsheet). `cellText()` backs both cells and export.

## Open product questions — P2-3400 (business decision, blocks QA sign-off)

- **Single table vs per-category tables:** P2-2017 approves several tables behind cards + a left menu; the live design shows one filtered table, which is what we built. If P2-2017 stands, QA rejects this.
- **Name collision:** P2-3169 / P2-3317 already call a Centers-panel tab "Results tab". And `Origin` is an assumption — wired to `source_name`, the closest existing field.
