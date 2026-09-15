# bilateral-overview

**What this owns:** the center Overview tab (`/bilateral/:acronym/overview`) — a KPI deck plus six
cards (Reporting status, Needs attention, Results by project, Science Program contribution, Results
by result type, Reporting pace) computed from the center's filtered result set for the selected
phase.

## Invariants

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
- **Chart colors only through `ResolvedChartTokens`** (`COV-DD-5`). `bilateral-overview.charts.ts`
  never calls `resolveChartTokens()` itself (it resolves to `''` under jsdom); the component's
  `chartTokens` computed calls it once in the browser and passes the result into every option
  builder. Status meaning lives in tile pills and the a11y table, never in a chart series color.
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
`bilateral-overview.charts.ts`, fed `model()` + `chartTokens()` + `chartOptions()` (limit, labels,
`today`). URL ↔ state sync lives in `applyUrlParams`/`writeUrl`; phase and center context live in
`BilateralContextService` (shell scope), not here.

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
- `scrollToAttention()` reads `window.matchMedia('(prefers-reduced-motion: reduce)')` directly, not
  an Angular CDK layout service — jsdom implements neither `matchMedia` nor
  `HTMLElement.prototype.scrollIntoView`, so a Jest spec must assign both by hand (not `jest.spyOn`,
  which requires a pre-existing property) and restore the originals afterward.
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
  `min-[Npx]:`/`max-[Npx]:` variant on the SAME CSS property.** Found by `bilateral-overview.cy.ts`
  and fixed in this spec: the KPI deck's grid used to mix `sm:grid-cols-2` with
  `min-[900px]:grid-cols-3`/`min-[1280px]:grid-cols-5` (same for the error state's
  `col-span`); in the compiled CSS, `sm:`'s rule was emitted AFTER both arbitrary-breakpoint rules,
  so at ≥640px width `sm:grid-cols-2` won the cascade tie and the deck never shed past 2 columns.
  Root cause is Tailwind v4 sorting named and arbitrary-bracket breakpoints into separate groups
  rather than one ascending-px order. Fix: express every breakpoint on that property the same way —
  here, `sm:` became `min-[640px]:` (Tailwind's own `sm` value) so all three sort together. The same
  risk applies anywhere else in the codebase `sm:`/`md:`/`lg:` and `min-[Npx]:` co-occur on one
  property (not audited beyond this file — see "Not verified").

## Test map

| Layer | File |
|---|---|
| Aggregate (pure) | `bilateral-overview.aggregate.spec.ts` |
| Charts (pure) | `bilateral-overview.charts.spec.ts` |
| Component (Jest, zoneless DOM) | `bilateral-overview.component.spec.ts` |
| Controls (Jest) | `components/overview-controls/overview-controls.component.spec.ts` |
| Layout (Cypress CT, real Chromium) | `bilateral-overview.cy.ts` — KPI column count, document horizontal-scroll, controls sticky proof, fixed chart heights across 1280×720 / 1280×1000 / 900×800 / 375×800 |

## Not verified

- Whether the `sm:`/arbitrary-breakpoint cascade defect above also affects other pages using the
  same mixed-breakpoint pattern — not audited beyond this folder.

**Verified:** 2026-09-14 · qa-development-2026 · 576167f86 (spec: `docs/specs/bilateral/center-overview-tab/`, `COV-T-8` H-1/H-2)
