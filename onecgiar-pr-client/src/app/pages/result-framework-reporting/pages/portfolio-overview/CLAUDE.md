# portfolio-overview

**Verified:** 2026-10-16 · branch qa-development-2026-ss · spec changes/portfolio-overview-revamp/global-filters (GLF-T-5)

**What this owns:** the **admin-only** `/portfolio-overview` screen — figures for the WHOLE portfolio in the open
phase: KPI deck, status, results by typology, progress against ToC KPIs, CGIAR Centers, W3/Bilateral projects. Ticket **P2-3304**;
design block `showPortfolio` of `PRMS Reporting.dc.html` (read 2026-08-24).

## Contract

- `PortfolioOverviewComponent` is standalone + `OnPush` and **provides its own service**, so leaving the screen
  drops the rows. The typology block reads from it; the ToC KPI, Centers and Projects blocks have **their own** data paths.
- `PortfolioOverviewService` owns **data, the global selection and every aggregation**: `totals()`, `categories()`,
  `bilateralBars()`, `versionId()` (first row's `version_id`), all `computed` off one signal, never accumulated by hand.
- The component owns only **view state**: `bilateralExpanded`, the `phaseYear()` shared by the eyebrow and the ToC KPI
  subtitle, the four mutually exclusive states `isLoading` / `hasError` / `isEmpty` / `hasFigures`, and the URL mirror.
- Page data: **one** `GET_AllResultsWithUseRole(userId, { limit: 20000 })`, no `submitter_id` (all the roles allow).
- Route: `extraRoutingApp` (`shared/routing/routing-data.ts`), `canActivate: [CheckAdminGuard]`. **Guarded, not
  merely hidden** (client CLAUDE.md §7).
- `kpis()` has 8 breakdown fields (`w1w2New/NewSubmitted/NewEditing/Replicated`, same four `bilateral…`). **Replicated** = `is_replicated` ∈ `1 | '1' | true`, else **New**. **Editing** = `Number(status_id) === 1`; every
  other status (missing too) is **Submitted**. Submitted + Editing = New, so New + Replicated reconciles.

## Global filters (2026-10-16, spec `changes/portfolio-overview-revamp/global-filters`)

- **Bar** `components/filter-bar/` (`app-portfolio-filter-bar`, no inputs, reads the service): Program, Project, Center, Typology, Status. Mounted inside `hasFigures()` above the deck, so never while loading, on error or phase-empty.
- **State** lives in the service: `selection` (changed only via `setSelection` / `toggleValue` / `clearDimension` / `clearAll`), `filteredRows()` / `filteredTotal()`, `filtersPending()`, `dimensions` (the Project / Center map, **one** request per load + Retry), `dimensionIndex`. Pure logic in `services/portfolio-filters.ts`.
- **URL mirror** (DD-11): the page reads `?program=&project=&center=&typology=&status=` **once**, applies it when rows exist (the service sanitizes; Project / Center after the map), then an effect writes `router.navigate([], { queryParams, queryParamsHandling: 'merge', replaceUrl: true })`. A signal is the only state; never read the URL back.
- 🛑 **Sub-switch order** inside `hasFigures()`: `filtersPending()` -> section skeletons (testid `portfolio-overview-skeleton-filters`); else `filteredTotal() === 0` -> no-match panel (`portfolio-no-match`, Clear all); else deck, status, typology. The ToC KPI block sits **outside** the sub-switch (renders in every case).
- **Block inputs:** typology `[rows]=filteredRows()`; ToC KPI `programs` + `notAffected`; Projects `programs`, `centers`, `notAffected` (from `notAffectedBy('toc' | 'projects', selection)`); Centers `selection`, `dimensionIndex`, `[dimensionsVersionId]="data.dimensionIndex() ? data.versionId() : null"` (only once the map is ready, else Project shows as "Not affected by: Project").
- 🛑 **DD-7, do not re-add a local status highlight:** the status tiles and donut call `toggleValue('status', key)` (`aria-pressed` from `selection().status`); the old local status-filter signal and its toggle are gone. The strip shows when ANY dimension is active; **View in Results Center** only when `resultsCenterLinkable` (<= 1 Program, <= 1 Status).
- **Typology Center view is lead-only by design** (it counts the lead Center); the global Center filter matches lead + contributing Centers, so their numbers can differ. Not a bug.

## KPI deck (2026-10-14, spec `changes/portfolio-overview-kpi-breakdown`)

- Three cards: **Total** (W1/W2 new + W3 new + the two replicated, reconciling to the total), **W1/W2** and
  **W3/Bilateral** (New -> Submitted / Editing, separator, replicated line). Click targets: card 1
  `navigateToResultsCenter('all')`, card 2 `'w1w2'`, card 3 `'bilateral'`; test ids `kpi-total-*`, `kpi-w1w2-*`, `kpi-bilateral-*`.

## CGIAR Centers block (P2-3928; W3-only + origin filter by spec `centers-new-vs-replicated`)

- `components/centers-block/` — `PortfolioCentersBlockComponent`, rendered before the Projects block, **outside** the `hasFigures()` branch (own data and own loading / error / empty states). Old route `admin-module/entities-overview` redirects here (`adminModuleRouting`). Parts: header + phase chip, 2 KPI cards (`centers-kpis`), Reporting status card (donut + tiles + active-filter strip). Progress by Center is gone on purpose; do not re-add.
- Data path is **its own**: `CentersService.getData()`, then **one** `GET_bilateralCenterResults(code, versionId)` per Center for the open **P25** phase (`resolvePhase()`). Copy: `internationalization/portfolio-centers-block.copy.ts`.
- ⚠️ **W3 only.** The endpoint returns the Center Overview rows (W1/W2 too); `loadCenter` keeps `isW3Row` (`source === 'API'`) at load, so every figure is W3. A result shared by several Centers counts once per Center. Its total therefore differs from the page's own "W3/Bilateral results" tile (counted per result, not per Center).
- Classifiers live in `centers-block.aggregate.ts`: `isW3Row`, `isReplicatedRow` (`is_replicated` ∈ 1 | '1' | true), `byOrigin`, `originCounts`. `CenterRowState` stores `w3Rows`; `viewRows` applies the origin per Center.
- **Origin filter** (`origin`: all | new | replicated): two `<button aria-pressed>` in the W3/Bilateral card (`origin-new`, `origin-replicated`), styled like the status tiles. It composes with the status filter (`toggleOrigin` / `toggleStatus` never touch each other; `clearFilters` resets both) and drives the donut, tiles and `centerTotals`. 🛑 DD-4: `kpis()` (total, % approved, Centers reporting, the New / Replicated counts) read **unfiltered** W3 rows and ignore the origin; the card is the control, so it must not shrink.
- Strip: `activeFilterLabel()` ("New · Pending review"). "View in Results Center" shows only when a status is set **and** origin is `all` (`showResultsCenterLink`), with `funding=bilateral`: Results Center cannot filter by origin.
- 🛑 **"Retry failed Centers":** a `role="status"` region shows the partial note (`centers-partial`) and **one** button (`centers-retry-failed`) re-requesting only failed Centers. No failures = no button. A failed Centers list shows `centers-error`; an empty catalogue shows `centers-empty`.

## W3/Bilateral projects (2026-10-16, spec `changes/portfolio-overview-revamp/w3-projects-section`)

- `components/projects-block/` (`app-portfolio-projects-block`, input `versionId`), the **last** section, after Centers. Own data path: `GET_PortfolioBilateralProjects(versionId)` -> `GET api/results-framework-reporting/portfolio/bilateral-projects` (admin only, server-side). Copy group `projects` in `portfolio-overview.copy.ts`.
- Center labels come from `CentersService.getData()` (`acronym || name || code`, same mapping as Centers); it fires HTTP on construction, so page specs must mock it.
- 🛑 **Mount rule:** under `@if (!data.loading())` (`versionId` is resolved) but **outside** `hasFigures()` (WPS-DD-7): a phase with no result rows must still answer "0 reporting projects". **No page skeleton** (JD-10); the block has its own states.
- ⚠️ Gotchas: P/A bars can sum to more than the total (a project may map to several P/As; totals count it once). Projects with no Center count under **Unassigned** (last). On a closed phase the year is that phase's, so figures can differ from Center Overview, which reads the active year (WPS-P-7).

## Where it is used

- `shared/components/reporting-nav-sidebar/reporting-nav-sidebar.component.ts:218` — first in PLATFORM for admins (`extraRoutingApp`). Bilateral and ToC KPI rows open `entity-details/:code/results`.

## Gotchas

- 🛑 **The payload carries EVERY phase** (6094 rows on prtest, 259 open). `apply()` narrows to
  `phase_status === 1` **before** counting; with none open it falls back to the newest `version_id` and flips
  `closedPhase()` (amber "Viewing a closed phase" banner).
- ⚠️ **Status dots resolve by `status_id`, never by `status_name`.** Same map as
  `programme-results.component.ts:101`; unknown ids fall back to the `not-started` foreground. The
  names in the payload (`Editing`, `Pending Review`, …) are labels only — colouring by name would
  invent a sixth status colour (UI rule 9).
- **The counters and the category bars are NOT clickable** (no surface lists the portfolio by status or category, P2-3304).
- **The bilateral fill uses `--pr-chart-2-muted` (`#8b7cc4`)** — the design's colour, valid here
  because it is a NON-TEXT graphic (3.52:1 on the divider track, WCAG 1.4.11). 🛑 Never use it for
  text: see `docs/DESIGN-DEVIATIONS.md` §1 vs §8, the same hex answering two different questions.
- **`isPartial()` is the honesty guard**: if `meta.total` exceeds what we asked for, the screen says the figures are partial.
- 🛑 **Two counts, two questions.** `total()` (`services/portfolio-overview.service.ts:195`) is the open-phase
  count (feeds the KPI tile); `fetchedCount()` (`:182`) is the raw server count captured in `load()` before
  `apply()`'s phase filter. The partial banner ("Showing the first N results") MUST bind to `fetchedCount()`.
- ⚠️ **"Replicated" means `is_replicated`, not "innovation".** Card-3's "Innovations replicated from 2025" assumes replicated W3 rows are innovations only (P-3, prod 2026-10-14); if that stops holding, change the label.
- 🛑 **`tests/mocks/spartanBrainMock.ts` must declare every input a Helm host directive re-exposes**, or NG0311:
  `BrnSeparator` (`orientation`/`decorative`, deck), `BrnTooltip` (`brnTooltip`/`position`/`hideDelay`/
  `showDelay`/`tooltipDisabled`, Rejected tile) and `BrnTabs` (`activationMode`, typology tabs).

## Status section & removed rankings (2026-10-14, spec `…/remove-rankings-status-copy`)

- Copy: `internationalization/portfolio-overview.copy.ts`. Rejected-tile hint: `statusHints` + `hlmTooltip`.
- Guide link: `STATUS_GUIDE_URL` (`shared/constants/portfolio-links.constants.ts`), typed `string` (not `''`,
  or templates narrow it to `never`). Empty = not rendered. Pending OQ-1: set it when the guide exists.
- 🛑 **Removed on purpose, do not re-add:** the Program and Center ranking cards ("competition" feedback),
  "Progress by Center" (stakeholder item 9: no planning data for W3, so no "progress") and the Program x category
  matrix with search, filters, paging, column picker and Excel export (TKP-R-9). Level counts per Program live in
  Typology; the export returns with family #9 `filtered-detail-export`.

## Results by typology (2026-10-15, spec `changes/portfolio-overview-revamp/typology-view`)

- `components/typology-block/` after the status section, inside `hasFigures()` (skeleton testid
  `portfolio-overview-skeleton-typology`); type -> level map in `typology.aggregate.ts` (pure).
- Center dimension is lead-only + W3-only; rows A->Z, catch-all last, no ranking. Its `rows` input is `data.filteredRows()`.

## Progress against ToC KPIs (2026-10-15, spec `changes/portfolio-overview-revamp/toc-kpi-progress`)

- `components/toc-kpi-block/`, order typology -> ToC KPI -> Centers, **inside** `hasFigures()` (skeleton testid
  `portfolio-overview-skeleton-toc-kpi`): it never mounts or requests while loading, so `[versionId]` is already
  resolved and `[year]` is `phaseYear()`, never `''`. Do not move it out of the gate: null then a number = 2 calls.
- **Own data path**: `GET_PortfolioTocCoverage(versionId)` (`toc-results/portfolio-coverage`, admin-only on the
  server), one request per version and per Retry; a failure shows the block's error and leaves the page intact.
- Rule: a KPI = distinct indicator, covered by >= 1 pooled W1/W2 result in QA or Submitted (W3 never covers).
  % half-up, 100% only if covered = total, 0% only if covered = 0; total = 0 reads "No ToC KPIs in this phase".
- 🛑 **No ranking**: rows in natural code order (`naturalCodeCompare`), no sort control. Only the name is
  interactive (`(programmeOpen)` -> `openProgramme`); counts, bars and the summary are not links (P2-3304).

## Pending

- Drill-down destinations for the status counters and the category bars — product decision, P2-3304.
