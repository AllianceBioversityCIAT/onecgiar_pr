# portfolio-overview

**Verified:** 2026-10-14 · branch qa-development-2026-ss · spec changes/portfolio-overview-revamp/remove-rankings-status-copy

**What this owns:** the **admin-only** `/portfolio-overview` screen — reporting figures for the WHOLE
portfolio in the open phase: a KPI deck, the status section, results by indicator category, a
science-program × category matrix and the CGIAR Centers block. Ticket **P2-3304**; design block `showPortfolio` of
`PRMS Reporting.dc.html` (read 2026-08-24).

## Contract

- `PortfolioOverviewComponent` is standalone + `OnPush` and **provides its own service**
  (`portfolio-overview.component.ts:35`), so leaving the screen drops the rows instead of holding a
  whole portfolio in memory for the rest of the session.
- `PortfolioOverviewService` owns **data and every aggregation**: `totals()` (status strip),
  `categories()` / `categoryBars()`, `bilateralTotal()` / `bilateralBars()`, `programmeRows()`
  (the matrix) and `footer()`. All are `computed` off one signal — never accumulated by hand.
- The component owns only **view state**: `sortKey` / `sortAsc`, `bilateralExpanded`, plus the four
  mutually exclusive states `isLoading` / `hasError` / `isEmpty` / `hasFigures`.
- Data path: **one** call to `GET_AllResultsWithUseRole(userId, { limit: 20000 })`
  (`services/portfolio-overview.service.ts:189`) — no `submitter_id`, so it returns everything the
  caller's roles allow.
- Route: `extraRoutingApp` in `shared/routing/routing-data.ts`, `path: 'portfolio-overview'`,
  `canActivate: [CheckAdminGuard]`. **Guarded, not merely hidden** — the design gates it on
  `isAdmin`, and hiding a nav entry is never enough (client CLAUDE.md §7).

- `kpis()` adds 8 breakdown fields: `w1w2New`, `w1w2NewSubmitted`, `w1w2NewEditing`, `w1w2Replicated` and the
  same four as `bilateralNew…` / `bilateralReplicated`. **Replicated** = `is_replicated` ∈ `1 | '1' | true`;
  anything else is **New**. **Editing** = `Number(status_id) === 1`; every other status (missing too) is
  **Submitted**. Submitted + Editing = New, so New + Replicated reconciles to the source's count.

## KPI deck (2026-10-14, spec `changes/portfolio-overview-kpi-breakdown`)

- Three cards (the 4th, "Science programs", and `scrollToMatrixSection()` were removed):
  1. **Total** — W1/W2 new, W3/Bilateral new, W1/W2 replicated, W3/Bilateral replicated (4 parts that
     reconcile to the total), a translucent separator between the new and replicated pairs.
  2. **W1/W2** — New → Submitted / Editing, separator, "Replicated from previous years".
  3. **W3/Bilateral** — same shape, last line "Innovations replicated from 2025".
- All 3 cards keep their click targets: card 1 `navigateToResultsCenter('all')`, card 2 `'w1w2'`, card 3 `'bilateral'`; test ids are `kpi-total-*`, `kpi-w1w2-*`,
  `kpi-bilateral-*`.

## CGIAR Centers block (P2-3928, 7-Oct-2026)

- `components/centers-block/` — `PortfolioCentersBlockComponent` (`app-portfolio-centers-block`), rendered
  last in `portfolio-overview.component.html`, **outside** the `hasFigures()` branch: it has its own data and
  its own loading / error / empty states, so it shows even when the programme payload is empty or fails.
- Moved as-is from Admin › All P/As and Centers (P2-3858 + P2-3893). Ángel, #dev-prms-pr 7-Oct-2026: the
  separate page was a duplicated module — Centers block into the Portfolio overview, rest unchanged, page
  removed ("La respuesta son las 3"). The old route `admin-module/entities-overview` redirects to
  `/portfolio-overview` (`shared/routing/routing-data.ts`, `adminModuleRouting`).
- Data path is **its own**, not this page's service: `CentersService.getData()` then **one**
  `GET_bilateralCenterResults(code, versionId)` per Center, for the open **P25** phase picked from
  `PhasesService` (`resolvePhase()`). Copy: `internationalization/portfolio-centers-block.copy.ts`.
- ⚠️ Its W3/Bilateral total is NOT the same number as the page's "W3/Bilateral results" KPI tile: the
  tile counts results whose `source_name` is W3/Bilaterals; the block sums each Center Overview, where a
  result counts for every Center that leads **or** contributes to it. Two questions, two numbers.
- The old dead centre code of this page (`centerDistributionRows`, `centerBilateralOption`…) is untouched
  and still unused; the block does not read it.

## Where it is used

- `shared/components/reporting-nav-sidebar/reporting-nav-sidebar.component.ts:218` — `sections()`
  pulls it out of `extraRoutingApp` for admins and puts it **first** in PLATFORM, above
  `Results Center`, which is where the design places it. Icon `lucideLayoutGrid`
  (`sectionIcons`, `:151`).
- Rows and bilateral rows navigate to `entity-details/:code/results` (the programme's Results tab).

## Gotchas

- 🛑 **The payload carries EVERY phase, not just the open one** (6094 rows on prtest, of which 259
  are the open phase). `apply()` narrows to `phase_status === 1` **before** anything is counted —
  mixing phases would add 2022 results to a 2026 counter. If nothing is open it falls back to the
  newest `version_id` and flips `closedPhase()`, which is what renders the design's amber
  "Viewing a closed phase. Figures are final."
- ⚠️ **Status dots resolve by `status_id`, never by `status_name`.** Same map as
  `programme-results.component.ts:101`; unknown ids fall back to the `not-started` foreground. The
  names in the payload (`Editing`, `Pending Review`, …) are labels only — colouring by name would
  invent a sixth status colour (UI rule 9).
- ⚠️ **Column order is `programme · TOTAL · categories`**, verified in the design template, not
  inferred from a rendering: a row emits `pr.code`, `pr.name`, `pr.total`, then `pr.cells`. Putting
  TOTAL last silently misaligns every figure against its header.
- ⚠️ **`cells` is positional** — index `i` of a row is `categories()[i]`. Both come from the same
  `computed`, so they cannot drift; do not sort one without the other.
- **Categories are derived from the rows**, never hardcoded, so a column can only ever exist if some
  result has that type. Real data shows seven, including `Other output` / `Other outcome`.
- **The counters and the category bars are deliberately NOT clickable.** The design makes each a
  drill-down, but no surface lists the whole portfolio filtered by status or category, so the
  destination would be invented. Raised on P2-3304 instead of shipping a dead control.
- **The bilateral fill uses `--pr-chart-2-muted` (`#8b7cc4`)** — the design's colour, valid here
  because it is a NON-TEXT graphic (3.52:1 on the divider track, WCAG 1.4.11). 🛑 Never use it for
  text: see `docs/DESIGN-DEVIATIONS.md` §1 vs §8, the same hex answering two different questions.
- **`isPartial()` is the honesty guard**: if `meta.total` exceeds what we asked for, the screen says
  the figures are partial rather than passing a truncated portfolio off as the whole thing.
- 🛑 **Two different counts answer two different questions — don't conflate them.** `total()`
  (`services/portfolio-overview.service.ts:195`) is `rows().length`, i.e. the **open-phase-filtered**
  count; it correctly feeds the "Total Portfolio Results" KPI tile. `fetchedCount()` (`:182`) is the
  **raw row count actually returned by the server in this page**, captured in `load()` before
  `apply()`'s phase filter runs. The partial-results banner ("Showing the first N results") MUST bind
  to `fetchedCount()`, never `total()` — binding it to the post-filter number was the bug fixed by
  spec `bugfix/portfolio-overview-partial-counts` (2026-09-14): with historical volume exceeding the
  page `LIMIT`, `total()` could read far lower than what was actually fetched, understating the
  banner's own "first N" claim.
- ⚠️ **"Replicated" means `is_replicated`, not "innovation".** The card-3 label "Innovations replicated from
  2025" assumes replicated W3 rows are innovations only (premise P-3, checked on prod 2026-10-14). If that
  stops holding, change the label — the counter itself does not filter by result type.
- 🛑 **`tests/mocks/spartanBrainMock.ts` must declare every input a Helm host directive re-exposes**, or NG0311:
  `BrnSeparator` (`orientation`/`decorative`, deck) and `BrnTooltip` (`brnTooltip`/`position`/`hideDelay`/
  `showDelay`/`tooltipDisabled`, Rejected tile).

## Status section & removed rankings (2026-10-14, spec `…/remove-rankings-status-copy`)

- Copy: `internationalization/portfolio-overview.copy.ts` (only what that spec added); donut caption is a
  parameter. Rejected-tile hint: `statusHints` + `hlmTooltip`.
- Guide link: `STATUS_GUIDE_URL` (`shared/constants/portfolio-links.constants.ts`), typed `string` (not `''`,
  or templates narrow it to `never`). Empty = not rendered. Pending OQ-1: set it when the guide exists.
- 🛑 **Removed on purpose:** the Program and Center ranking cards (stakeholder "competition" feedback). Do not re-add.

## Pending

- Drill-down destinations for the status counters and the category bars — product decision, P2-3304.
