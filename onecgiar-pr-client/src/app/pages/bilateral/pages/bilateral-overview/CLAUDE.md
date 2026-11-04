# bilateral-overview

**What this owns:** the center Overview tab (`/bilateral/:acronym/overview`) — a KPI deck plus six
cards (Reporting status, Needs attention, Results by project, full-width Projects by P/A, Results by P/A,
Results by result type) computed from the center's filtered result set for the selected phase.
The Reporting pace card and the "No new results yet" chip strip were removed 2026-10-26 (INC-166545,
Nicoleta); `model().pace` / `notStartedProjectIds` stay in the aggregate, unrendered.
The top-row "Needs attention" KPI tile was removed 2026-10-08 (reviewer request); the Needs attention panel stays.

## Invariants

- **Every card comes from ONE scoped row set (INC-165171, CWS-R-2, 2026-10-21).** The Total card showed
  263 (server totals) while Editing showed 267 (rows): two row sets. Now `BilateralOverviewService` asks
  `bilateral-center-results?scope=bilateral`: the server sends only `replicated_w3`, `new_w3` and
  `w1w2_tagging` rows (`overview_category`, resolved in SQL). The client never hides rows by category
  (the server is the filter); `OVERVIEW_CATEGORIES` is the 3-line DISPLAY list, the wire type keeps 5.
  The Total card renders `kpis.totalResults.categories` (three lines adding up to the headline) and **narrows
  with the filters**. Status tiles show `replicated · new`. **Projects covered** counts only projects with a NEW row
  (`new_w3`/`w1w2_tagging`); replicated-only ones are a "not counted" sub-line, same rule for "no new result yet"
  (`CWS-R-5`). `project_id` prefers a center-owned project over the lead one. `resolveOverviewCategory` derives the
  category for rows without it (older payloads, fixtures).
- **Results by project has no "No project" bar and no lead/contributing split** (Nicoleta, 15-Oct):
  bars stack *Replicated for update* vs *New in this phase*; the no-project rows are one line under
  the chart, W3 rows only (`by-project-no-project`, link `source=w3`); rows on other centers' projects
  (`unmatchedProjectRows`) are stated, not dropped. **Project labels are "code — title"** (INC-166545,
  `projectDisplayLabel`, shared by axis, a11y table, chips and the project filter): the axis truncates
  at `PROJECT_AXIS_LABEL_WIDTH` (220px), the tooltip shows the full label by `dataIndex` (escaped).
- **P/A cards (CPA-R-1/R-2, CPA-T-6).** The "Science Program contribution" card is gone. *Results by P/A* = W3 vs
  tagging results per primary P/A (`submitter`; no-P/A group last, not clickable). *Projects by P/A* (full width,
  after Results by project) = distinct center projects mapped / with W3 / tagged. Its x-axis labels are rotated 35deg + truncated at 110px (11+ groups overlapped; tooltip has the full name). `chartModel` re-sorts by
  (W3+tagging) desc then RESOLVED label and feeds option, table AND `resolveChartClick` (same `dataIndex` order).
  Labels (CPA-DD-6): projects' mapping name, then `InitiativesService` catalog, then the raw code. Clicks: by-P/A bars
  and Projects *tagged* -> Results (`program`, `category`, scope); Projects *mapped* / *with W3* -> Reporting
  (`program` only, no scope, no category). The by-P/A card needs only the results call; Projects by P/A needs both.
- **`category` + visible filters (CPA-R-3/R-4).** `category` (`w3` | `w1w2-tagging`) is a key of the shared contract
  (`filterCenterResults` reads the raw `overview_category`) and of the Overview URL (`OVERVIEW_MANAGED_QUERY_PARAMS`),
  so every card narrows with it. `overview-controls` shows a P/A multi-select and a Result category select OUTSIDE
  the popover (same token combobox + `cdkConnectedOverlay` listbox as the phase control, applied at once, no draft).
  **Never the same filter twice (INC-166545):** the popover has NO Science Program and NO Source group, and no
  Program/Source chip (Category "W1/W2 tagging" + Source "W3" had emptied every card). A pasted `?source=` becomes the
  matching `category` in `applyUrlParams` (`w3`->`w3`, `w1w2`->`w1w2-tagging`) and leaves the URL. The Results tab
  keeps Source (its unscoped rows include W1/W2 that tag nothing). "Clear" clears all (shows for a P/A or category
  alone). Overlays have right-aligned fallback positions: with P/A + Category before it the Filter button sits far
  right and the 560px popover ran off-screen. **Listbox keyboard (CPA-T-8):** options are `tabindex="-1"` (roving via
  `aria-activedescendant`); the P/A "Clear selection" button is a SIBLING of the `role="listbox"`, not a child, so
  Enter/Space on it is not swallowed by the listbox handler (it toggled the active option instead of clearing). `deepLinkParams` (Reporting/Drafts) nulls `category`; `resultsLinkParams` keeps it.
- **Updated-no-project line (`by-project-updated-no-project`, CNP-T-3)** sits before the generic line: replicated
  W3 innovations (type 7/2) with no project, counted by the shared `isUpdatedNoProjectRow`, hidden at 0, link
  `group=updated-no-project` + `scope`/`phase`. The generic line excludes them; the empty state needs both at 0.
  **The Overview ignores `group` in its own URL** (`applyUrlParams` forces `null`; `deepLinkParams` never emits it).
- **`bilateral-center-results` returns one row per result** (SR-164368): `results_center` is grouped per
  result (`MAX(is_leading_result)`) before the join — result 8641 was listed twice.
- **Total card style (SR-164368):** SP Overview Total General purple (`from-[#4a1d96] via-[#5c24b8] to-[#793ce8]`
  + two blurred glows, children `relative z-10`) — keep both cards in lockstep. The `OTR-T-1` progress-bar
  redesign was reverted; don't re-attempt without re-confirming visual direction.
- **The page computes no figure itself** (`COV-DD-1`): every number comes out of `aggregate.ts`'s
  `buildOverviewModel`; the component only wires signals. A wrong number is a bug in `aggregate.ts` or in the row set.
- **`bilateral-query-params.ts` + `bilateral-result-filter.ts` are the ONE filter contract** shared
  with the Results tab (`COV-R-13`). `filterCenterResults(rows, params)` is the single predicate both
  tabs apply; a card figure and the Results tab's visible count must reconcile by construction, proven live
  (HITL, `CWS-AC-9`), never by a fixture alone. Every link into Results carries `scope=bilateral`
  (`resultsLinkParams`, `CWS-R-8`/`CWS-DD-5`); links to Reporting and Drafts (`deepLinkParams`) never do.
- **`BilateralOverviewService` caches per `centerId::versionId`** (`COV-DD-8`); projects are cached
  per center only. Results and projects are two independent streams with their own loading/error signals
  (`COV-R-17`): a results failure never nulls a loaded `projects` list ("Projects covered" can show `0 of N` with a
  "results unavailable" hint). A late response for another phase writes to its OWN key (`COV-R-21`).
- **Every deep link carries `phase` and `explicitDefaults: true`** (`COV-DD-3`) even without `?phase=` in the
  Overview URL: without `explicitDefaults` the Results tab layers its own W3+Lead default on top of a figure that
  counted both; without `phase` a click can land on the wrong phase's rows.
- **The header's `'overview'` alias is retired** (`COV-R-1` B): `BilateralPageHeaderComponent.isReportingActive`
  no longer treats `activeTab === 'overview'` as Reporting. Pass `activeTab="overview"`; never alias two tabs.
- **Chart colors only through `ResolvedChartTokens`** (`COV-DD-5`): `charts.ts` never calls `resolveChartTokens()`
  (`''` under jsdom); the component's `chartTokens` computed does, once. Status meaning lives in pills and the a11y
  table, never in a series color.
- **Controls row is `sticky top-0` inside the REAL `#workArea` scroller**, not the sticky band (`COV-DD-7`); the
  phase selector renders only here. `bilateral-overview.cy.ts` measures it against the actual scroller at two
  heights, never an `overflow-hidden` ancestor (`KZ-EVM-1`).

## Data flow

`BilateralOverviewComponent` resolves `centerKey` (gated on the shell's async CLARISA-code
resolution, `resolvedCenterId`) and `effectiveVersionId` (`selectedPhase`, defaulting to Open), reads
`overviewService.entry(centerKey, versionId)`, runs the row set through `filterCenterResults`, and
feeds `buildOverviewModel` (`bilateral-overview.aggregate.ts`). Chart options/tables come from
`bilateral-overview.charts.ts`, fed `model()` + `chartTokens()` + `chartOptions()`. URL ↔ state sync
lives in `applyUrlParams`/`writeUrl`; phase and center context live in `BilateralContextService`.

## Gotchas

- ⚠️ **The APIs deliver ids as STRINGS** (`GET /api/versioning` `{ id: '34' }`, the projects payload too) although
  `Phases.id` / `BilateralProject.id` are typed `number`. Every phase/project comparison goes through `Number()`
  (`phaseVersionId()`); a strict `===` makes every real phase look unknown, strips the deep link and falls back to
  Open. **Fixtures MUST carry string ids.**
- `OverviewControlsComponent` is purely presentational (no data, URL or service): emit `phaseChange` /
  `filtersChange` / `clearFilters` and let the page reconcile.
- `BilateralAiService.loadAllDrafts()` sets `draftList` from the HTTP response body **directly**
  (`data ?? []`, no `.response` unwrap) — the opposite envelope shape from
  `GET_bilateralCenterResults`/`GET_bilateralProjects`. A CT/manual stub of `GET_bilateralAiDrafts`
  must return the bare array, not `{ response: [...] }`, or `buildOverviewModel` throws
  (`drafts.filter is not a function`).
- ECharts resizes each `app-pr-viz-chart` host in a `ResizeObserver` callback **after** a viewport
  change's reflow. A CT spec measuring `document.documentElement` right after `cy.viewport(...)` sees
  the SVG mid-resize and reports a false horizontal overflow — wait one frame/tick first.
- **Rule: never mix a named Tailwind breakpoint (`sm:`/`md:`/`lg:`/`xl:`) with an arbitrary
  `min-[Npx]:`/`max-[Npx]:` variant on the SAME CSS property.** Found by `bilateral-overview.cy.ts`: Tailwind v4
  sorts named and arbitrary breakpoints into separate groups, so the KPI deck's `sm:grid-cols-2` compiled AFTER
  `min-[900px]:grid-cols-3`/`min-[1280px]:grid-cols-5` and won at ≥640px. Fix: write every breakpoint on that
  property the same way (`sm:` -> `min-[640px]:`). Not audited beyond this file — see "Not verified".

## Test map

| Layer | File |
|---|---|
| Aggregate (pure) | `bilateral-overview.aggregate.spec.ts` |
| Charts (pure) | `bilateral-overview.charts.spec.ts` |
| Component (Jest, zoneless DOM) | `bilateral-overview.component.spec.ts` |
| Controls (Jest) | `components/overview-controls/overview-controls.component.spec.ts` |
| Layout (Cypress CT, real Chromium) | `bilateral-overview.cy.ts` — KPI columns, horizontal scroll, controls sticky, fixed chart heights at 1280×720 / 1280×1000 / 900×800 / 375×800 |

## Not verified
- Whether the `sm:`/arbitrary-breakpoint cascade defect above affects other pages (not audited).
- Visual parity vs the center mockup (Total results card); updated-no-project line at 375 px (CNP-T-5): human check pending.
- Layout of the controls row (P/A + Category + Filter) at 900/1280 px and their focus rings: CPA-T-8 (Cypress CT, not run in CPA-T-6).

**Verified:** 2026-10-28 · qa-development-2026-ss · Projects by P/A rotated/truncated axis labels + controls label/combobox wrappers (CPA-T-5/T-6 rework from CPA-T-8 visual check) · prior: 2026-10-28 · qa-development-2026-ss · P/A Clear selection moved out of the listbox + option buttons `tabindex=-1` (CPA-T-6 rework from CPA-T-8 live finding, spec `bilateral/center-overview-pa-contribution`) · prior: 2026-10-28 · qa-development-2026-ss · popover drops Science Program + Source (visible P/A + Category only), `?source=` folds into `category`, right-aligned overlay fallbacks (INC-166545, spec `bilateral/center-overview-pa-contribution`) · prior: 2026-10-27 · qa-development-2026-ss · Results by P/A + full-width Projects by P/A replace the SP card; `category` + visible P/A/category filters (CPA-T-6, spec `bilateral/center-overview-pa-contribution`) · prior: 2026-10-26 · qa-development-2026-ss · Results by project labels "code — title", truncated axis + full-label tooltip (INC-166545 point 4, `quick/inc-166545-project-title-labels`) · prior: 2026-10-26 · qa-development-2026-ss · removed Reporting pace card + No new results yet chips (INC-166545, `quick/inc-166545-overview-remove-pace-not-started`) · prior: 2026-10-21 · qa-development-2026-ss · updated-no-project line + Overview ignores `group` (CNP-T-3, spec `replicated-innovations-2026-pa/center-overview-no-project-line`) · prior: 2026-10-21 · qa-development-2026-ss · Overview reads the `scope=bilateral` row set: 3 categories, Projects covered by new rows, Results links carry `scope` (CWS-T-4, spec `replicated-innovations-2026-pa/center-overview-w3-scope`) · prior: 2026-10-19 · qa-development-2026-ss · one row set with overview_category for every card, by-project replicated vs new (INC-165171) · prior: 2026-10-13 · Total results card = server totals, pills removed, one row per result (SR-164368) · prior: 2026-10-13 · Total results card adopts the SP Total General purple (SR-164368) · prior: 2026-10-08 · qa-development-2026-ss · removed top-row Needs attention KPI tile (card kept) · prior: 2026-10-08 · qa-development-2026-ss · cdc422d8e (specs: `changes/overview-replicated-new-badges`, `changes/overview-w1w2-contributor-badge`, `quick/overview-total-results-mockup`)
