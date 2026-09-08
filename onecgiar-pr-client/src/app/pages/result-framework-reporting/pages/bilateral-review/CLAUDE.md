# bilateral-review

**Verified:** 2026-09-07 · branch qa-development-2026 · spec
`changes/bilateral-review-center-strip-and-phase` (BRC-T-1 — phase-scoped list + badge, Cycle
selector); prior: `changes/sp-bilateral-review-tab` (BRT-T-1..T-8 — relocated from the legacy
`bilateral-results` sidebar+filters+table page into one toolbar/KPI/table shell, own drawer copy).

**What this owns:** the **Bilateral review** tab of the programme shell
(`entity-details/:entityId/bilateral-review`) — one searchable, filterable, groupable list of
W3/Bilateral results reported to this program, with a review drawer for approve/reject decisions.

## Contract

- Route: `entity-details/:entityId/bilateral-review` (`routing-data.ts:630`). The legacy address
  `entity-details/:entityId/results-review` is a `redirectTo` (`:653`) — Angular preserves the
  path param and merges query params onto the new path by default, so a saved link or a
  notification's `?reviewResult=&reviewResultId=` still lands correctly (BRT-AC-11).
- URL contract (`bilateral-review.query-params.ts`) — **seven keys**, all comma-separated lists
  where noted: `search`, `status` (`all|pending|approved|rejected`), `center` (CLARISA center
  **CODES**, not acronyms — matches the legacy `?center=` value space), `project`, `category`,
  `view` (`grouped|flat`), and `phase` (BRC-T-1 — a numeric `versionId`, NOT a phase label; unlike
  Results' own `?phase=`, which carries `phaseName`). An empty selection joins to `null`, which
  **removes** the key under `queryParamsHandling: 'merge'`. `reviewResult`/`reviewResultId` are a
  separate, one-shot deep-link pair: consumed once the phase-scoped list load SETTLES (not on
  "rows non-empty" — a phase-scoped list can legitimately be empty, BRC-R-10) then cleared via the
  same `merge`, so the seven filter keys above are never touched by that clear.
- Phase scoping (BRC-T-1): `selectedVersionId` defaults to the shell's current phase
  (`dataControlSE.reportingCurrentPhase.phaseId`, tracked via `reportingPhaseVersion()` — a plain
  object, not a signal), overridden by a valid `?phase=` matching `knownPhases` (the program's own
  portfolio's phases from `PhasesService`, current first then year desc); an unknown `?phase=`
  rewrites the URL back to the current id. Every list request (initial load, `retry()`,
  `onDecisionMade()`) is the SAME `loadResults(code, versionId)`, always carrying `versionId`; a
  phase switch on the SAME program re-expands every group and bumps `expandAllNonce` (a program
  switch does not). Entity details fetch once per programme CODE, in a SEPARATE effect that never
  re-fires on a phase switch.
- Data flow: **one** `GET_ResultToReview(code, undefined, versionId)` call per (programme, phase)
  pair (all centers, no per-center fetch) → `BilateralResultsService.tableData`/`tableResults` →
  fanned out to `BilateralReviewCountService.setFromRows(code, versionId, rows)` **only when the
  selected phase equals the CURRENT phase** (BRC-R-6) — the tab's own Cycle selector never moves
  the badge the other tabs read. Cache key `CODE::<Number(versionId)>` (BRC-DD-1/DD-2, supersedes
  the parent spec's code-only key `BRT-DD-2`) — `version.id` is a bigint column serialized as a
  STRING on the wire ("36"), every key/comparison normalizes with `Number()` first. The tab badge
  (every sibling tab, via the band) is derived from this SAME list, **not** `GET pending-review`
  (primary-role rows only, narrower) — badge, chips and KPI strip stay identical by construction
  (design.md `judgment-day L-1` of the parent spec).
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
  service plus requires `status_id == 5`; the two never disagree about "who can review" — the
  drawer only adds the pending-status guard (see the drawer's own `AGENTS.md` §3b/§11.2).
- Table: `PrGroupTableComponent` with `dataKey`/`groupRowsBy = 'project_name'`; rows render through
  one shared `#rowTpl` projected into both `prTableExpandedRow` (grouped) and a plain `<table>`
  (flat) — `BilateralReviewTableComponent`. The Actions `<td>` is `sticky right-0`. Every `!`
  Tailwind utility on that shared template out-specifies `PrGroupTableComponent`'s own host rule
  (`:host ::ng-deep .pr-table thead th / tbody td`), which pierces the projected template ONLY
  inside the grouped host — the flat `<table>` isn't a descendant, so the rule is inert there;
  removing a `!` makes the two views diverge visually. Collapse state persists per group in
  `userCollapsedKeys` (`bilateral-review-table.component.ts`) so search/filter re-renders never
  silently re-expand a group the user collapsed — only a toolbar Expand/Collapse all click does.

## Where it is used

- `shared/routing/routing-data.ts:625-636` — the route entry (`prName: 'Bilateral review'`,
  `data.rfrView: 'bilateral-review'`), fifth tab, sibling of `pages/my-work-board/`.
- `pages/dashboard-lab/components/reporting-program-band/reporting-program-band.component.ts` — the
  band injects `BilateralReviewCountService` (not a host input, `BRT-DD-2`) AND, since BRC-T-1,
  `DataControlService` (to resolve the CURRENT phase the same way this page does); reads the
  pending badge via `bilateralReviewCount = count(programCode(), currentPhaseId())()` (shown on
  every tab, not just Bilateral review — always the current phase, never the tab's own selection),
  and warms it via `ensure(code, currentPhaseId)` on every band host mount — a no-op while the
  phase has not resolved.
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
- ⚠️ **Effect REGISTRATION order matters here (BRC-T-1).** The "URL → state" hydrate effect
  (writes `phaseParam`) MUST be registered BEFORE the list-loading effect (reads `phaseParam` via
  `selectedVersionId`) — effects flush in registration order on their first run. Reversed, the
  first flush resolves `selectedVersionId` to the CURRENT phase before `?phase=` ever hydrates,
  firing a throwaway request and writing a stale badge entry under the current phase's key. Caught
  by a test asserting the count service's current-phase key stays cold when `?phase=<Q>` is set.
- ⚠️ **Never bind `app-pr-filter-select`'s `[emptyValue]` to the Cycle select's own current value**
  to make re-picking a no-op — its `hasValue` getter is `value !== emptyValue`, so a mirrored
  `emptyValue` makes `hasValue` permanently `false` and the trigger never shows the phase name
  (BRC-AC-6). The no-op-on-repick rule (BRC-AC-8b) lives entirely on the page side instead
  (`setPhase()` checks `selectedVersionId()` and rejects a non-numeric emit).
