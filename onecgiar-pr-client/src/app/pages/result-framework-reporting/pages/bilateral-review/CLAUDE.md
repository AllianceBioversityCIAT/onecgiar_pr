# bilateral-review

**Verified:** 2026-09-07 · branch qa-development-2026 · spec `changes/sp-bilateral-review-tab`
(BRT-T-1..T-8 — relocated from the legacy `bilateral-results` sidebar+filters+table page into a
single toolbar/KPI/table shell, own drawer copy, own count service).

**What this owns:** the **Bilateral review** tab of the programme shell
(`entity-details/:entityId/bilateral-review`) — one searchable, filterable, groupable list of
W3/Bilateral results reported to this program, with a review drawer for approve/reject decisions.

## Contract

- Route: `entity-details/:entityId/bilateral-review` (`routing-data.ts:630`). The legacy address
  `entity-details/:entityId/results-review` is a `redirectTo` (`:653`) — Angular preserves the
  path param and merges query params onto the new path by default, so a saved link or a
  notification's `?reviewResult=&reviewResultId=` still lands correctly (BRT-AC-11).
- URL contract (`bilateral-review.query-params.ts`) — **six keys**, all comma-separated lists where
  noted: `search`, `status` (`all|pending|approved|rejected`), `center` (CLARISA center **CODES**,
  not acronyms — matches the legacy `?center=` value space), `project`, `category`, `view`
  (`grouped|flat`). An empty selection joins to `null`, which **removes** the key under
  `queryParamsHandling: 'merge'`. `reviewResult`/`reviewResultId` are a separate, one-shot deep-link
  pair: consumed once the list is non-empty (`bilateral-review.component.ts:372-394`) then cleared
  via the same `merge`, so the six filter keys above are never touched by that clear.
- Data flow: **one** `GET_ResultToReview(code)` call per programme (all centers, no per-center
  fetch) → `BilateralResultsService.tableData`/`tableResults` → immediately fanned out to
  `BilateralReviewCountService.setFromRows(code, rows)`. The tab badge (rendered on every sibling
  tab via the band, `BRT-DD-2`) is derived from this SAME list, **not** from
  `GET api/results/pending-review` — that endpoint counts primary-role rows only, a narrower
  population than the list (which includes Contributor rows), so deriving the badge from the list
  keeps badge, chips and KPI strip identical by construction (design.md `judgment-day L-1`).
- Computed pipeline, in order (`bilateral-review.component.ts` — design.md §6.2):
  `searchFiltered` (search over `tableResults`) → `chipCounts`/`kpis` (status chip counts + KPI
  strip, both over `searchFiltered`, i.e. **before** the popover filters) → `visibleRows` (status +
  Center/Project/Category popover filters applied on top) → `groups`/`flatRows` (grouped-by-project
  or flat, built from `visibleRows`). **Consequence:** the Center/Bilateral project/Indicator
  category popover narrows the rows shown, but the chips and KPI numbers never move — they describe
  the searched list, not the currently-filtered one.
- Permission: `BilateralReviewAccessService.isProgramMember(code)` — true for a platform admin or
  when `code` is one of `api.dataControlSE.myInitiativesList` — gates the row action label
  (`canReview()` on the page, `BRT-R-14`). The drawer's own `canEditInDrawer()` calls the **same**
  service and additionally requires `status_id == 5`; the two never disagree about "who can review",
  only the drawer adds the pending-status guard on top (see the drawer's own `AGENTS.md` §3b/§11.2).
- Table: `PrGroupTableComponent` with `dataKey`/`groupRowsBy = 'project_name'`; rows render through
  one shared `#rowTpl` projected into both `prTableExpandedRow` (grouped) and a plain `<table>`
  (flat) — `BilateralReviewTableComponent`. The Actions `<td>` is `sticky right-0`. Every `!`
  Tailwind utility on that shared template exists to out-specify `PrGroupTableComponent`'s own host
  rule (`:host ::ng-deep .pr-table thead th / tbody td`), which pierces into the projected template
  ONLY when it renders inside the grouped host — the flat `<table>` is not a descendant of that host
  so the rule is inert there. Removing a `!` makes the two views diverge visually, not just render
  differently by accident. Collapse state persists per group in `userCollapsedKeys`
  (`bilateral-review-table.component.ts`) so an unrelated re-render (search, filter) never silently
  re-expands a group the user collapsed by hand — only a toolbar Expand all/Collapse all click
  clears that memory.

## Where it is used

- `shared/routing/routing-data.ts:625-636` — the route entry (`prName: 'Bilateral review'`,
  `data.rfrView: 'bilateral-review'`), fifth tab, sibling of `pages/my-work-board/`.
- `pages/dashboard-lab/components/reporting-program-band/reporting-program-band.component.ts` — the
  band injects `BilateralReviewCountService` directly at `:123` (not a host input, `BRT-DD-2`), reads
  the pending badge via the `bilateralReviewCount` computed at `:376` (shown on every tab, not just
  Bilateral review), and warms it for the current programme via the `ensure(code)` effect at `:435`
  on every band host mount.
- `openEmergingReport()` hops to the dashboard-lab host with `?reportEmerging=true&returnTab=
  bilateral-review` — `returnTab: 'bilateral-review'` is what the shell reads to hand the user back
  to this tab after the emerging-report aside closes.

## Gotchas

- ⚠️ **`status_id` comparisons are loose (`==`) everywhere in this tab** — pending/approved/rejected
  helpers, the count service, the table's tone classes — because the wire sometimes sends it as the
  string `"5"` instead of the number `5`. Don't "fix" one `==` to `===` without checking the others.
- **All filtering, sorting and counting are client-side over one request.** There is no
  per-center re-fetch and no pagination; the popover option lists (`centerFilterOptions` etc.) are
  derived from the full `tableResults`, not from `visibleRows`, so a filter never removes its own
  options from the dropdown.
- `loading` starts `true` (not `false`) so a cold page paints the skeleton, never the empty state,
  before the first response resolves.
- Rows are cleared (`tableData`/`tableResults` reset to `[]`) BEFORE the next fetch on every
  programme switch — a deliberate flash of empty table rather than a stale prior programme's rows
  under the new hero.
- The Cypress CT harness (`bilateral-review.cy.ts`, file-header banner) runs at **effective root
  zoom `1`** — `--pr-font-scale` only leaves `1` via an `index.html` inline script the CT runner
  never loads — so `cy.viewport(w, h)` lands `documentElement.clientWidth` on `w` directly in this
  harness; don't assume that generalizes to a real page with a non-default font scale.
- `cypress-axe` is **not installed** in this project. Accessibility here is checked structurally
  (accessible names, `aria-pressed`/`aria-expanded`, no native `disabled`), which is not a
  substitute for a real contrast check — the violet-gradient/chip contrast gap is a recorded,
  HITL-only gap (`requirements.md` §11), not a bug to "fix" opportunistically.
- The relocated drawer's SCSS `@use '../../../../../../../styles/fonts.scss'` must be **7 levels**
  deep from this folder, not the legacy page's 9 — a wrong depth fails to compile the stylesheet
  silently (no build error) and Angular serves the drawer completely unstyled, off-screen at the
  bottom of the page instead of as a fixed overlay. `ng build` alone cannot catch this if the drawer
  is tree-shaken out of the bundle at the time; only a build with the drawer referenced, plus a live
  `getComputedStyle` check, proves it.
