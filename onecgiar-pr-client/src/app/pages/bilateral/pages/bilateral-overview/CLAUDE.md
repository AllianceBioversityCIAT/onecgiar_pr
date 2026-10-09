# bilateral-overview

**What this owns:** the center Overview tab (`/bilateral/:acronym/overview`) — a KPI deck plus six
cards (Reporting status, Needs attention, Results by project, Science Program contribution, Results
by result type, Reporting pace) computed from the center's filtered result set for the selected phase.
The top-row "Needs attention" KPI tile (`kpi-attention`, `kpis.needsAttention`, `scrollToAttention()`) was removed
2026-10-08 at reviewer request; the Needs attention panel next to Reporting status stays.

## Invariants

- **The Total results card's `newCount` is unconditional, NOT status-gated — deliberately
  different from the Reporting tab's per-project "new for review" (`BOV-DD-1`).** The Reporting
  tab's `bilateral-projects-panel` "new for review" count additionally requires `status_id ===
  pending`; this card's `newCount` is simply "not replicated" (`Number(row.is_replicated) !== 1`),
  regardless of status, so `replicatedCount + newCount` always equals `totalResults.count`
  (`BOV-R-2`/`BOV-R-2.1`). **Do not "fix" one to match the other** — intentionally different numbers
  for the same center/phase. Badges are non-interactive `<span>`s (whole card is one `<a>`, `BOV-DD-4`);
  translucent white-on-gradient pills since the mockup change (no longer the projects-panel tokens), all counts computed in one
  loop (`BOV-DD-2`).
- **Card body follows the center mockup (`quick/overview-total-results-mockup`, 2026-10-08):** count,
  divider, three label + count-chip rows — "Innovations replicated for update" = `replicatedCount`,
  "New W3/Bilateral results" = `w3Count` (all W3, not only non-replicated — user's call),
  "W1/W2 results tagging Center bilateral project" = `w1w2ContributorCount` — then the replicated /
  `+ N new` pills. The lead/contributing lines were dropped from the visible card (still in the
  `aria-label`); `w1w2LeadCount` is no longer rendered. The card keeps its primary gradient — the
  mockup's purple was explicitly NOT adopted. A progress-bar redesign (`OTR-T-1`) was tried and
  reverted earlier; don't re-attempt without re-confirming visual direction.
- **The page computes no figure itself** (`COV-DD-1`). Every number rendered comes out of
  `bilateral-overview.aggregate.ts`'s `buildOverviewModel` — the component only wires signals and
  renders. If a card shows a wrong number, the bug is in `aggregate.ts` or in the row set fed to it,
  never in `bilateral-overview.component.ts`.
- **`bilateral-query-params.ts` + `bilateral-result-filter.ts` are the ONE filter contract** shared
  with the Results tab (`COV-R-13`). `filterCenterResults(rows, params)` is the single predicate both
  tabs apply; a card figure and the Results tab's own visible count must reconcile by construction,
  not by coincidence — that reconciliation is proven live (HITL), never by a CT/Jest fixture alone.
- **`BilateralOverviewService` caches per `centerId::versionId`** (`COV-DD-8`); projects are cached
  per center only. Results and projects are two independent streams with their own loading/error
  signals (`COV-R-17`) — a results failure never nulls an already-loaded `projects` list, so
  "Projects covered" can still render `0 of N` with a "results unavailable" hint while the KPI hero
  shows the results error. A late response for a phase the user has navigated away from writes to
  its OWN cache key and is never rendered under the current one (`COV-R-21`).
- **Every deep link carries `phase` and `explicitDefaults: true`** (`COV-DD-3`,
  `deepLinkParams()`) — even when the Overview's own URL has no `?phase=`. Omitting either breaks
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
feeds `buildOverviewModel` (`bilateral-overview.aggregate.ts:220`). Chart options/tables come from
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
- `OverviewControlsComponent` is purely presentational — it owns no data, no URL, no service. Don't
  add a fetch or a router call there; emit `phaseChange` / `filtersChange` / `clearFilters` and let
  the page reconcile.
- `BilateralAiService.loadAllDrafts()` sets `draftList` from the HTTP response body **directly**
  (`data ?? []`, no `.response` unwrap) — the opposite envelope shape from
  `GET_bilateralCenterResults`/`GET_bilateralProjects`. A CT/manual stub of `GET_bilateralAiDrafts`
  must return the bare array, not `{ response: [...] }`, or `buildOverviewModel` throws
  (`drafts.filter is not a function`).
- ECharts resizes each `app-pr-viz-chart` host through a `ResizeObserver` callback that fires
  **after** a viewport change's own reflow. A CT spec that measures `document.documentElement`
  immediately after `cy.viewport(...)` catches the SVG mid-resize (still the previous width) and
  reports a false horizontal-overflow positive — wait one frame/tick before measuring.
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

- Whether the `sm:`/arbitrary-breakpoint cascade defect above also affects other mixed-breakpoint
  pages — not audited beyond this folder.
- Visual parity vs the center mockup (Total results card): human browser check pending.

**Verified:** 2026-10-08 · qa-development-2026-ss · removed top-row Needs attention KPI tile (card kept) · prior: 2026-10-08 · qa-development-2026-ss · cdc422d8e (specs: `changes/overview-replicated-new-badges`, `changes/overview-w1w2-contributor-badge`, `quick/overview-total-results-mockup`)
