# bilateral-overview

**What this owns:** the center Overview tab (`/bilateral/:acronym/overview`) — a KPI deck plus six
cards (Reporting status, Needs attention, Results by project, Science Program contribution, Results
by result type, Reporting pace) computed from the center's filtered result set for the selected phase.
The top-row "Needs attention" KPI tile was removed 2026-10-08 (reviewer request); the Needs attention panel stays.

## Invariants

- **Every card comes from ONE scoped row set (INC-165171, CWS-R-2, 2026-10-21).** The Total card showed
  263 (server totals) while Editing showed 267 (rows): two row sets. Now `BilateralOverviewService` asks
  `bilateral-center-results?scope=bilateral`: the server sends only `replicated_w3`, `new_w3` and
  `w1w2_tagging` rows (`overview_category`, resolved in SQL). The client never hides rows by category
  (the server is the filter); `OVERVIEW_CATEGORIES` is the 3-line DISPLAY list, the wire type keeps 5.
  The Total card renders `kpis.totalResults.categories` — three lines that add up to the headline —
  and **narrows with the filters**. Status tiles show `replicated · new`. **Projects covered** counts
  only projects with a NEW row (`new_w3`/`w1w2_tagging`); replicated-only projects are a sub-line ("not
  counted"), and the "No new results yet" strip uses the same rule (`CWS-R-5`). `project_id` prefers a
  center-owned project over the lead one. `bilateral-center-overview-totals` is no longer called.
  `resolveOverviewCategory` derives the category for rows without it (older payloads, fixtures).
- **Results by project has no "No project" bar and no lead/contributing split** (Nicoleta, 15-Oct):
  bars stack *Replicated for update* vs *New in this phase*; the no-project rows are one line under
  the chart, W3 rows only (`by-project-no-project`, link `source=w3`); rows on other centers' projects
  (`unmatchedProjectRows`) are stated, not dropped.
- **Updated-no-project line (`by-project-updated-no-project`, CNP-T-3)** sits before the generic line: replicated
  W3 innovations (type 7/2) with no project, counted by the shared `isUpdatedNoProjectRow`, hidden at 0, link
  `group=updated-no-project` + `scope`/`phase`. The generic line excludes them; the empty state needs both at 0.
  **The Overview ignores `group` in its own URL** (`applyUrlParams` forces `null`; `deepLinkParams` never emits it).
- **`bilateral-center-results` returns one row per result** (SR-164368): `results_center` is grouped per
  result (`MAX(is_leading_result)`) before the join — result 8641 was listed twice.
- **Card style (2026-10-08):** count, divider, three label + count-chip rows. **Since 2026-10-13 (SR-164368)
  the card uses the SP Overview Total General purple** (`from-[#4a1d96] via-[#5c24b8] to-[#793ce8]` + two
  blurred glows, children `relative z-10`) — keep both cards in lockstep. The `OTR-T-1` progress-bar
  redesign was reverted; don't re-attempt without re-confirming visual direction.
- **The page computes no figure itself** (`COV-DD-1`). Every number rendered comes out of
  `bilateral-overview.aggregate.ts`'s `buildOverviewModel` — the component only wires signals and
  renders. If a card shows a wrong number, the bug is in `aggregate.ts` or in the row set fed to it,
  never in `bilateral-overview.component.ts`.
- **`bilateral-query-params.ts` + `bilateral-result-filter.ts` are the ONE filter contract** shared
  with the Results tab (`COV-R-13`). `filterCenterResults(rows, params)` is the single predicate both
  tabs apply; a card figure and the Results tab's own visible count must reconcile by construction,
  not by coincidence — that reconciliation is proven live (HITL), never by a CT/Jest fixture alone.
  The old `includeProjectTagging` gap (tagging rows counted here, missing in Results) is closed by
  `CWS-R-8`: every link into Results carries `scope=bilateral` (`resultsLinkParams`, `CWS-DD-5`); links to
  Reporting and Draft Results (`deepLinkParams`) never do. Live reconciliation is HITL (`CWS-AC-9`).
- **`BilateralOverviewService` caches per `centerId::versionId`** (`COV-DD-8`); projects are cached
  per center only. Results and projects are two independent streams with their own loading/error
  signals (`COV-R-17`) — a results failure never nulls an already-loaded `projects` list, so
  "Projects covered" can still render `0 of N` with a "results unavailable" hint while the KPI hero
  shows the results error. A late response for a phase the user has navigated away from writes to
  its OWN cache key and is never rendered under the current one (`COV-R-21`).
- **Every deep link carries `phase` and `explicitDefaults: true`** (`COV-DD-3`,
  `deepLinkParams()` / `resultsLinkParams()`) — even when the Overview's own URL has no `?phase=`. Omitting either breaks
  the reconciliation: without `explicitDefaults` the Results tab layers its own W3+Lead default on
  top of a figure that already counted both; without `phase` a click can land on the wrong phase's
  rows.
- **The header's `'overview'` alias is retired.** `BilateralPageHeaderComponent.isReportingActive`
  used to treat `activeTab === 'overview'` as Reporting; that branch is gone (`COV-R-1` B) and the
  only caller passes `'reporting'` explicitly. Don't reintroduce the alias to "activate two tabs at
  once" — pass `activeTab="overview"` and let the Overview tab alone go active.
- **Chart colors only through `ResolvedChartTokens`** (`COV-DD-5`). `bilateral-overview.charts.ts` never calls `resolveChartTokens()` itself (`''` under jsdom);
  the component's `chartTokens` computed calls it once and passes the result into every option builder — status meaning lives in tile pills and the a11y table, never in a chart series color.
- **Controls row is `sticky top-0` inside the REAL `#workArea` scroller**, not the sticky band
  (`COV-DD-7`) — the phase selector must render only here, same reason the SP shell kept it out of
  the band. `bilateral-overview.cy.ts` measures this against the actual scroller at two heights,
  never against an `overflow-hidden` ancestor (`KZ-EVM-1`: a tautological measurement can pass while
  the real sticky binding is wrong).

## Data flow

`BilateralOverviewComponent` resolves `centerKey` (gated on the shell's async CLARISA-code
resolution, `resolvedCenterId`) and `effectiveVersionId` (`selectedPhase`, defaulting to Open), reads
`overviewService.entry(centerKey, versionId)`, runs the row set through `filterCenterResults`, and
feeds `buildOverviewModel` (`bilateral-overview.aggregate.ts`). Chart options/tables come from
`bilateral-overview.charts.ts`, fed `model()` + `chartTokens()` + `chartOptions()`. URL ↔ state sync
lives in `applyUrlParams`/`writeUrl`; phase and center context live in `BilateralContextService`.

## Gotchas

- ⚠️ **The APIs deliver ids as STRINGS.** `GET /api/versioning` answers `{ id: '34', … }` and the
  center projects payload does the same, although `Phases.id` / `BilateralProject.id` are typed
  `number` (H-1/H-2 of this spec). Every phase and project comparison therefore goes through
  `Number()` — here `phaseVersionId()` guards the selection match, the strip-unknown effect,
  `effectiveVersionId` and the controls' select options. A strict `===` silently makes every real
  phase look unknown: the deep link is stripped and the page falls back to Open. **Fixtures MUST
  carry string ids**, or a spec passes against a payload shape that never existed in production.
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
  `min-[Npx]:`/`max-[Npx]:` variant on the SAME CSS property.** Found by `bilateral-overview.cy.ts`:
  the KPI deck's grid mixed `sm:grid-cols-2` with `min-[900px]:grid-cols-3`/`min-[1280px]:grid-cols-5`
  (same for the error state's `col-span`); Tailwind v4 sorts named and arbitrary-bracket breakpoints
  into separate groups rather than one ascending-px order, so `sm:`'s rule compiled AFTER both and
  won the cascade tie at ≥640px — the deck never shed past 2 columns. Fix: express every breakpoint
  on that property the same way (`sm:` → `min-[640px]:`). Same risk anywhere else `sm:`/`md:`/`lg:`
  and `min-[Npx]:` co-occur on one property (not audited beyond this file — see "Not verified").

## Test map

| Layer | File |
|---|---|
| Aggregate (pure) | `bilateral-overview.aggregate.spec.ts` |
| Charts (pure) | `bilateral-overview.charts.spec.ts` |
| Component (Jest, zoneless DOM) | `bilateral-overview.component.spec.ts` |
| Controls (Jest) | `components/overview-controls/overview-controls.component.spec.ts` |
| Layout (Cypress CT, real Chromium) | `bilateral-overview.cy.ts` — KPI column count, document horizontal-scroll, controls sticky proof, fixed chart heights across 1280×720 / 1280×1000 / 900×800 / 375×800 |

## Not verified
- Whether the `sm:`/arbitrary-breakpoint cascade defect above affects other pages (not audited).
- Visual parity vs the center mockup (Total results card); updated-no-project line at 375 px (CNP-T-5): human check pending.

**Verified:** 2026-10-21 · qa-development-2026-ss · updated-no-project line + Overview ignores `group` (CNP-T-3, spec `replicated-innovations-2026-pa/center-overview-no-project-line`) · prior: 2026-10-21 · qa-development-2026-ss · Overview reads the `scope=bilateral` row set: 3 categories, Projects covered by new rows, Results links carry `scope` (CWS-T-4, spec `replicated-innovations-2026-pa/center-overview-w3-scope`) · prior: 2026-10-19 · qa-development-2026-ss · one row set with overview_category for every card, by-project replicated vs new (INC-165171) · prior: 2026-10-13 · Total results card = server totals, pills removed, one row per result (SR-164368) · prior: 2026-10-13 · Total results card adopts the SP Total General purple (SR-164368) · prior: 2026-10-08 · qa-development-2026-ss · removed top-row Needs attention KPI tile (card kept) · prior: 2026-10-08 · qa-development-2026-ss · cdc422d8e (specs: `changes/overview-replicated-new-badges`, `changes/overview-w1w2-contributor-badge`, `quick/overview-total-results-mockup`)
