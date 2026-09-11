# portfolio-overview

**Verified:** 2026-08-24 · branch performance-refactor · b3181e828

**What this owns:** the **admin-only** `/portfolio-overview` screen — reporting figures for the WHOLE
portfolio in the open phase: a status strip, results by indicator category, a bilateral summary, and
a science-program × category matrix. Ticket **P2-3304**; design block `showPortfolio` of
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

## Pending

- Drill-down destinations for the status counters and the category bars — product decision, P2-3304.
