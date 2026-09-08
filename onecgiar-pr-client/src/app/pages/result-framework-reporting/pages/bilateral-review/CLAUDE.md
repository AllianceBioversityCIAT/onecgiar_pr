# bilateral-review

**Verified:** 2026-09-07 · branch qa-development-2026 · spec
`changes/bilateral-review-center-strip-and-phase` (BRC-T-1..T-3 — phase-scoped list + badge, Cycle
selector, center chip strip, CT extension); prior: `changes/sp-bilateral-review-tab` (BRT-T-1..T-8
— relocated from the legacy `bilateral-results` sidebar+filters+table page into one
toolbar/KPI/table shell, own drawer copy).

**What this owns:** the **Bilateral review** tab of the programme shell
(`entity-details/:entityId/bilateral-review`) — one searchable, filterable, groupable list of
W3/Bilateral results reported to this program, with a review drawer for approve/reject decisions.

## Contract

- Route: `entity-details/:entityId/bilateral-review` (`routing-data.ts:630`). The legacy address
  `entity-details/:entityId/results-review` is a `redirectTo` (`:653`) — Angular preserves the
  path param and merges query params onto the new path by default, so a saved link or a
  notification's `?reviewResult=&reviewResultId=` still lands correctly (BRT-AC-11).
- URL contract (`bilateral-review.query-params.ts`) — **seven keys**, all comma-separated lists
  where noted: `search`, `status`, `center` (CLARISA CODES), `project`, `category`, `view`, and
  `phase` (BRC-T-1 — a numeric `versionId`, unlike Results' own `?phase=`, which carries
  `phaseName`). `phase` absent = current phase; present-but-invalid (e.g. a label, non-numeric) or
  present-but-unknown both rewrite the URL to the current id with `replaceUrl` — `phaseParamRaw`
  (raw string, distinct from the parsed `phaseParam`) is what tells "absent" apart from
  "present-but-unparseable" so the rewrite fires on both (Reviewer fix: the two used to collapse
  into the same `null` and the rewrite never ran for a present-but-invalid value). An empty
  selection on the other six keys joins to `null`, which **removes** the key under
  `queryParamsHandling: 'merge'`. `reviewResult`/`reviewResultId` are a one-shot deep-link pair,
  consumed once the phase-scoped list load SETTLES (not "rows non-empty" — a phase-scoped list can
  legitimately be empty, BRC-R-10), then cleared via the same `merge`.
- Current phase resolution (BRC-T-1): the shell's `reportingCurrentPhase.phaseId` is normalized
  through `normalizeBilateralReviewPhaseId` (`bilateral-review.query-params.ts`) — rejects
  `null`/`undefined`/`''` **before** `Number()` and `<= 0` after (`Number(null) === 0`, so a naive
  `Number()` would silently treat "unresolved" as phase 0). While that shell value is unresolved,
  `currentPhaseId` falls back to the portfolio-filtered phase catalog's own "open" row
  (`status === true`, same fact the shell fetches) once this component's own catalog fetch has
  settled; if the catalog settles with no open phase (or fails outright), the tab shows its error
  state with Retry instead of an indefinite skeleton (BRC-R-5/AC-14).
- Data flow: **one** `GET_ResultToReview(code, undefined, versionId)` call per (programme, phase)
  pair via `loadResults(code, versionId)` — the SAME entry point for the initial load, `retry()`
  and `onDecisionMade()`, `versionId` always present → `BilateralResultsService.tableData`/
  `tableResults` → fanned out to `BilateralReviewCountService.setFromRows(code, versionId, rows)`
  **only when the selected phase equals the CURRENT phase** (BRC-R-6) — the tab's own Cycle
  selector never moves the badge the other tabs read. Cache key `CODE::<Number(versionId)>`
  (BRC-DD-1/DD-2) — `version.id` arrives as a STRING on the wire ("36"), every key/comparison
  normalizes with `Number()` first. The badge is derived from this SAME list, **not** `GET
  pending-review` (primary-role rows only, narrower).
- **Center chip strip** (`BilateralReviewCenterStripComponent`, BRC-T-2, BRC-R-1..4): below the
  status chips, one chip per distinct `lead_center` in `searchFiltered` (same base the status
  chips/KPIs use — counts are independent of the status chip and popover filters, BRC-R-4), each
  showing its **pending** count (loose `== 5`), sorted pending desc then acronym asc; a trailing
  **Not specified** chip folds in blank-`lead_center` rows. Its code is the param-safe sentinel
  `UNASSIGNED_CENTER_CODE` (`'__unassigned__'`), never `''` — an empty string cannot round-trip
  through the `?center=` csv, so the bucket would never stay pressed. Output is named
  `selectCenter`, not the design doc's literal `select` (`@angular-eslint/no-output-native`
  forbids an output aliased to a native DOM event name). Clicking a chip replaces the Center
  filter with exactly that center; clicking the pressed chip or **All centers** clears it — exactly
  one chip is `aria-pressed="true"`, none when the popover holds several. **All centers** always
  equals the KPI Pending count by construction (BRC-DD-4). Wraps (`flex-wrap`) below `md` without
  clipping and without introducing body horizontal scroll (BRC-R-20, BRC-AC-11); beyond 12 centers
  the tail collapses behind a "+N more" chip (BRC-R-21, one-way expand, no collapse-back).
- Cycle select (`app-pr-filter-select`, single, options = `knownPhases`): re-picking the shown
  phase is a no-op enforced entirely in `setPhase()` (rejects a non-numeric re-emit) +
  `writeValue(selectedVersionId())` re-sync — **never** via `[emptyValue]` bound to the selected
  id, which would make the component's own `hasValue` getter (`value !== emptyValue`) permanently
  false and the trigger would never show the phase name (BRC-AC-6).
- Computed pipeline, in order (`bilateral-review.component.ts` — design.md §6.2):
  `searchFiltered` (search over `tableResults`) → `chipCounts`/`kpis`/`centerStrip` (all over
  `searchFiltered`, i.e. **before** the popover filters) → `visibleRows` (status + Center/Project/
  Category popover filters applied) → `groups`/`flatRows`. **Consequence:** the popover narrows the
  rows shown, but the chips, KPI numbers and center strip never move.
- Permission: `BilateralReviewAccessService.isProgramMember(code)` gates the row action label
  (`canReview()`, `BRT-R-14`); the drawer's `canEditInDrawer()` calls the same service plus
  `status_id == 5` — the two never disagree about "who can review".
- Table: `PrGroupTableComponent`, `groupRowsBy = 'project_name'`; rows render through one shared
  `#rowTpl` (grouped + flat). The Actions `<td>` is `sticky right-0`. Collapse state persists per
  group (`userCollapsedKeys`) so search/filter re-renders never silently re-expand a group the user
  collapsed.

## Where it is used

- `shared/routing/routing-data.ts:625-636` — the route entry, fifth tab, sibling of
  `pages/my-work-board/`.
- `reporting-program-band.component.ts` — injects `BilateralReviewCountService` AND, since
  BRC-T-1, `DataControlService` (resolves the CURRENT phase the same way this page does); reads
  `bilateralReviewCount = count(programCode(), currentPhaseId())()` (shown on every tab, always
  the current phase, never this tab's own selection); warms it via `ensure(code, currentPhaseId)`
  on every band host mount (no-op while the phase has not resolved).
- `openEmergingReport()` hops to the dashboard-lab host with `?reportEmerging=true&returnTab=
  bilateral-review`.

## Gotchas

- ⚠️ **`status_id` comparisons are loose (`==`) everywhere in this tab** (pending/approved/rejected
  helpers, the count service, the center strip, the table's tone classes) because the wire
  sometimes sends it as the string `"5"`. Don't "fix" one `==` to `===` without checking the others.
- **All filtering, sorting and counting are client-side over one request** — no per-center
  re-fetch, no pagination; popover option lists are derived from full `tableResults`, not
  `visibleRows`, so a filter never removes its own options from the dropdown.
- `loading` starts `true` so a cold page paints the skeleton, never the empty state, first.
- **Cross-tab `?phase=` value-space collision (open follow-up, not fixed here):** the Results tab
  writes a **label** (`phaseName`) into the same `?phase=` key, and band tab links use
  `queryParamsHandling="preserve"`, so a Results → Bilateral review hop lands that label — this tab
  detects and rewrites it back to the current id (see Contract above). The **reverse** hop
  (Bilateral review's numeric `?phase=` preserved onto the Results tab, which expects a label) is
  NOT isolated by either tab; nothing strips or translates it today.
- The count numerals inside BOTH the status chips and the center strip use
  `--pr-text-subtle`, which measures ≈ 2.8–3.0:1 contrast — below AA, but identical on both rows
  (inherited gap, not a T-2 regression); HITL-only per `requirements.md` §11, not a bug to fix
  opportunistically.
- ⚠️ **The CT harness (`bilateral-review.cy.ts`) must stub `PhasesService` and
  `resultsSE.GET_versioning`, or every mount throws.** BRC-T-1 made the constructor call
  `fetchPhaseCatalogFallback()` (→ `api.resultsSE.GET_versioning`) whenever `PhasesService.phases
  .reporting` is empty; neither BRC-T-1 nor BRC-T-2 updated this CT's `mountPage()` (their own
  verification only ran Jest), so the real, unstubbed `PhasesService` left every mount broken until
  BRC-T-3 added a `PHASE_CURRENT` fixture (`obj_portfolio.id` matching the programme's
  `portfolioId`) via an explicit `PhasesService` provider. A 9-row single-group fixture at
  `cy.viewport(840, 900)` also trips a NATIVE vertical scrollbar that shaves ~15px off
  `documentElement.clientWidth` — unrelated to any wrap-clip regression; use a taller viewport
  (1600) instead of loosening `assertEffectiveWidth`'s tolerance.
- Runs at **effective root zoom `1`** (`--pr-font-scale` only leaves `1` via an `index.html` inline
  script the CT runner never loads) — `cy.viewport(w, h)` lands `documentElement.clientWidth` on
  `w` directly in this harness; don't assume that generalizes to a real page with a non-default
  font scale.
- `cypress-axe` is **not installed**. Accessibility here is checked structurally (accessible names,
  `aria-pressed`/`aria-expanded`, no native `disabled`) — not a substitute for a contrast check.
- The relocated drawer's SCSS `@use` must be **7 levels** deep from this folder, not the legacy
  page's 9 — a wrong depth fails to compile silently and serves the drawer unstyled, off-screen.
- ⚠️ **Effect REGISTRATION order matters (BRC-T-1).** The "URL → state" hydrate effect (writes
  `phaseParam`) MUST be registered BEFORE the list-loading effect (reads it via
  `selectedVersionId`) — reversed, the first flush resolves to the current phase before `?phase=`
  ever hydrates, firing a throwaway request and writing a stale badge entry.
