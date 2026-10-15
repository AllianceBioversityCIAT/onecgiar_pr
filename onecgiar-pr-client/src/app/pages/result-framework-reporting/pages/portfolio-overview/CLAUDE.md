# portfolio-overview

**Verified:** 2026-10-15 · branch qa-development-2026-ss · spec changes/portfolio-overview-revamp/typology-view (TYV-T-3)

**What this owns:** the **admin-only** `/portfolio-overview` screen — reporting figures for the WHOLE
portfolio in the open phase: a KPI deck, the status section, results by indicator category, a
science-program × category matrix and the CGIAR Centers block. Ticket **P2-3304**; design block `showPortfolio` of
`PRMS Reporting.dc.html` (read 2026-08-24).

## Contract

- `PortfolioOverviewComponent` is standalone + `OnPush` and **provides its own service**
  (`portfolio-overview.component.ts:35`), so leaving the screen drops the rows.
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

## CGIAR Centers block (P2-3928; W3-only + origin filter by spec `centers-new-vs-replicated`)

- `components/centers-block/` — `PortfolioCentersBlockComponent`, rendered last, **outside** the `hasFigures()`
  branch (own data and own loading / error / empty states). Old route `admin-module/entities-overview`
  redirects here (`adminModuleRouting`). Parts: header + phase chip, 2 KPI cards (`centers-kpis`), Reporting
  status card (donut + tiles + active-filter strip). Progress by Center is gone on purpose; do not re-add.
- Data path is **its own**: `CentersService.getData()`, then **one** `GET_bilateralCenterResults(code, versionId)`
  per Center for the open **P25** phase (`resolvePhase()`). Copy: `internationalization/portfolio-centers-block.copy.ts`.
- ⚠️ **W3 only.** The endpoint returns the Center Overview rows (W1/W2 too); `loadCenter` keeps `isW3Row`
  (`source === 'API'`) at load, so every figure is W3. A result shared by several Centers counts once per Center.
  Its total therefore differs from the page's own "W3/Bilateral results" tile (counted per result, not per Center).
- Classifiers live in `centers-block.aggregate.ts`: `isW3Row`, `isReplicatedRow` (`is_replicated` ∈ 1 | '1' | true),
  `byOrigin`, `originCounts`. `CenterRowState` stores `w3Rows`; `viewRows` applies the origin per Center.
- **Origin filter** (`origin`: all | new | replicated): two `<button aria-pressed>` in the W3/Bilateral card
  (`origin-new`, `origin-replicated`), styled like the status tiles. It composes with the status filter
  (`toggleOrigin` / `toggleStatus` never touch each other; `clearFilters` resets both) and drives the donut,
  tiles and `centerTotals`. 🛑 DD-4: `kpis()` (total, % approved, Centers reporting, the New / Replicated counts)
  read **unfiltered** W3 rows and ignore the origin; the card is the control, so it must not shrink.
- Strip: `activeFilterLabel()` ("New · Pending review"). "View in Results Center" shows only when a status is set
  **and** origin is `all` (`showResultsCenterLink`), with `funding=bilateral`: Results Center cannot filter by origin.
- 🛑 **"Retry failed Centers":** a `role="status"` region shows the partial note (`centers-partial`) and **one**
  button (`centers-retry-failed`) re-requesting only failed Centers. No failures = no button. A failed Centers list
  shows `centers-error`; an empty catalogue shows `centers-empty`.

## Where it is used

- `shared/components/reporting-nav-sidebar/reporting-nav-sidebar.component.ts:218` — `sections()` puts it **first**
  in PLATFORM for admins (from `extraRoutingApp`), above `Results Center`, as designed. Icon `lucideLayoutGrid` (`:151`).
- Rows and bilateral rows navigate to `entity-details/:code/results` (the programme's Results tab).

## Gotchas

- 🛑 **The payload carries EVERY phase** (6094 rows on prtest, 259 open). `apply()` narrows to
  `phase_status === 1` **before** counting; with none open it falls back to the newest `version_id` and flips
  `closedPhase()` (amber "Viewing a closed phase" banner).
- ⚠️ **Status dots resolve by `status_id`, never by `status_name`.** Same map as
  `programme-results.component.ts:101`; unknown ids fall back to the `not-started` foreground. The
  names in the payload (`Editing`, `Pending Review`, …) are labels only — colouring by name would
  invent a sixth status colour (UI rule 9).
- ⚠️ **Column order is `programme · TOTAL · categories`**, verified in the design template, not
  inferred from a rendering: a row emits `pr.code`, `pr.name`, `pr.total`, then `pr.cells`. Putting
  TOTAL last silently misaligns every figure against its header.
- ⚠️ **`cells` is positional** — index `i` of a row is `categories()[i]`. Both come from the same
  `computed`, so they cannot drift; do not sort one without the other.
- **Categories are derived from the rows**, never hardcoded (real data: seven, incl. `Other output` / `Other outcome`).
- **The counters and the category bars are deliberately NOT clickable**: no surface lists the whole portfolio
  filtered by status or category, so the destination would be invented (raised on P2-3304).
- **The bilateral fill uses `--pr-chart-2-muted` (`#8b7cc4`)** — the design's colour, valid here
  because it is a NON-TEXT graphic (3.52:1 on the divider track, WCAG 1.4.11). 🛑 Never use it for
  text: see `docs/DESIGN-DEVIATIONS.md` §1 vs §8, the same hex answering two different questions.
- **`isPartial()` is the honesty guard**: if `meta.total` exceeds what we asked for, the screen says
  the figures are partial rather than passing a truncated portfolio off as the whole thing.
- 🛑 **Two counts, two questions.** `total()` (`services/portfolio-overview.service.ts:195`) is the open-phase
  count (feeds the KPI tile); `fetchedCount()` (`:182`) is the raw server count captured in `load()` before
  `apply()`'s phase filter. The partial banner ("Showing the first N results") MUST bind to `fetchedCount()`.
- ⚠️ **"Replicated" means `is_replicated`, not "innovation".** The card-3 label "Innovations replicated from
  2025" assumes replicated W3 rows are innovations only (premise P-3, checked on prod 2026-10-14). If that
  stops holding, change the label — the counter itself does not filter by result type.
- 🛑 **`tests/mocks/spartanBrainMock.ts` must declare every input a Helm host directive re-exposes**, or NG0311:
  `BrnSeparator` (`orientation`/`decorative`, deck), `BrnTooltip` (`brnTooltip`/`position`/`hideDelay`/
  `showDelay`/`tooltipDisabled`, Rejected tile) and `BrnTabs` (`activationMode`, typology tabs).

## Status section & removed rankings (2026-10-14, spec `…/remove-rankings-status-copy`)

- Copy: `internationalization/portfolio-overview.copy.ts` (only what that spec added); donut caption is a
  parameter. Rejected-tile hint: `statusHints` + `hlmTooltip`.
- Guide link: `STATUS_GUIDE_URL` (`shared/constants/portfolio-links.constants.ts`), typed `string` (not `''`,
  or templates narrow it to `never`). Empty = not rendered. Pending OQ-1: set it when the guide exists.
- 🛑 **Removed on purpose, do not re-add:** the Program and Center ranking cards ("competition" feedback) and
  "Progress by Center" (stakeholder item 9: no planning data for W3, so no "progress").

## Results by typology (2026-10-15, spec `changes/portfolio-overview-revamp/typology-view`)

- `components/typology-block/` between the status section and the matrix, inside `hasFigures()` (skeleton testid
  `portfolio-overview-skeleton-typology`); type -> level map in `typology.aggregate.ts` (pure).
- Center dimension is lead-only + W3-only; rows A->Z, catch-all last, no ranking. The `rows` input
  (`data.openRows()`) is the hook for the family #6 global filters.

## Pending

- Drill-down destinations for the status counters and the category bars — product decision, P2-3304.
