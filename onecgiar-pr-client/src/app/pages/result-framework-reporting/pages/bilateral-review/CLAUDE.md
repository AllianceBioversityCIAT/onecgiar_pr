# bilateral-review

**Verified:** 2026-09-08 · branch qa-development-2026 · spec `changes/bilateral-review-ux-polish`
(BRP-T-1..T-4 — filter band + Clear filters + stat bar, table density/placeholders/group-by-center,
narrow cards, CT gates); parents `changes/bilateral-review-center-strip-and-phase` (BRC-T-1..T-3 —
phase-scoped list + badge, Cycle selector, center chip strip) and `changes/sp-bilateral-review-tab`
(BRT-T-1..T-8 — relocated from the legacy `bilateral-results` page into one toolbar/table shell).

**What this owns:** the **Bilateral review** tab of the programme shell
(`entity-details/:entityId/bilateral-review`) — one searchable, filterable, groupable list of
W3/Bilateral results reported to this program, with a review drawer for approve/reject decisions.

## Contract

- Route: `entity-details/:entityId/bilateral-review` (`routing-data.ts:630`). The legacy address
  `entity-details/:entityId/results-review` is a `redirectTo` (`:653`) — path param and query
  params both survive (BRT-AC-11).
- URL contract (`bilateral-review.query-params.ts`) — **eight keys**: `search`, `status`, `center`
  (CLARISA codes), `project`, `category`, `view`, `phase` (BRC-T-1, a numeric `versionId` — unlike
  Results' own `?phase=`, which carries `phaseName`; `phaseParamRaw` vs the parsed `phaseParam`
  tells "absent" apart from "present-but-unparseable" so both rewrite to the current id), and
  `group` (BRP-T-2, eighth key, `project|center`, absent/invalid → `project`). Empty selections
  join to `null`, which **removes** the key under `queryParamsHandling: 'merge'`.
  `reviewResult`/`reviewResultId` are a one-shot deep-link pair, consumed once the phase-scoped
  list load SETTLES (not "rows non-empty" — BRC-R-10), then cleared the same way.
- Current phase resolution (BRC-T-1): `normalizeBilateralReviewPhaseId` rejects
  `null`/`undefined`/`''` **before** `Number()` (`Number(null) === 0`, so a naive `Number()` would
  treat "unresolved" as phase 0) and `<= 0` after. Falls back to the phase catalog's own "open" row
  once this component's own fetch settles; no open phase (or a failed fetch) → error state with
  Retry, never an indefinite skeleton (BRC-R-5/AC-14).
- Data flow: **one** `GET_ResultToReview(code, undefined, versionId)` per (programme, phase) via
  `loadResults` (initial load, `retry()`, `onDecisionMade()` all share it) → fanned out to
  `BilateralReviewCountService.setFromRows` **only when the selected phase equals the CURRENT
  phase** (BRC-R-6) — the tab's own Cycle selector never moves the tab badge. Cache key
  `CODE::<Number(versionId)>` — `version.id` arrives as a STRING on the wire.
- **Filter band** (BRP-T-1, replaces the old status-chip row + strip mount): one labeled band,
  Status row (segmented control, same `bilateral-review-chip-*` testids/`setStatus` semantics as
  before) + Centers row (chevron `aria-expanded`/`aria-controls`, `sessionStorage
  ['pr.bilateral.centersExpanded']` `'1'|'0'`). Default collapsed when `> 6` centers **or**
  `isNarrow()` (`matchMedia('(max-width: 899px)')`, copied from `my-work-board`); a stored choice
  always wins over the default. R-21: one-shot auto-expand when landing on `?center=` with no
  stored choice and the default would collapse it. The strip (`BilateralReviewCenterStripComponent`)
  gains `collapsed` — renders exactly one summary chip ("All centers N" / "`ACRONYM` N ✕" /
  "K centers ✕") and suppresses "+N more"; expanded, unchanged BRC behavior (12-cap, sentinel code
  `UNASSIGNED_CENTER_CODE`, `selectCenter` output, sorted pending desc then acronym asc).
- **Clear filters · N** (BRP-T-1): the toolbar's old always-visible clear button is **replaced** by
  `clearEverything()` behind `@if (activeFilterCount() > 0)`. `activeFilterCount` is **five**
  dimensions — search, status ≠ all, centers, projects, categories; `phase`/`group`/`view` never
  count. One `router.navigate` sets the five keys `null`, touches none of `view`/`group`/`phase`,
  fires no list request. The popover header's clear (`clearFilters` — centers/projects/categories
  only) and the filtered-empty state's clear (`clearAllFilters` — adds search + status) are
  separate controls that still exist; exactly one "Clear filters" node lives in the toolbar.
- **Stat bar** (`BilateralReviewKpisComponent`, BRP-T-1, rewritten in place, same inputs/outputs):
  one line ≥ 900px, host `data-testid="bilateral-review-statbar"` ≤ 44px there (icons dropped to
  hold the cap). All six testids kept: `kpi-projects`, `kpi-centers`, `kpi-pending`,
  `kpi-pending-toggle`, `kpi-decided`, `kpi-decided-sublabel`.
- **Table** (`BilateralReviewTableComponent`, BRP-T-2/T-3): `groups` generalized to
  `BilateralReviewGroup { key, label, caption, center, results }` — project mode `key =
  project_name` (unchanged order); center mode `key = lead_center || UNASSIGNED_CENTER_CODE`,
  pending desc then acronym asc, **blank bucket always last** regardless of its count.
  `dataKey`/`groupRowsBy` bind to `"key"` (not `project_name`). The component **owns**
  `expandedKeys: Set<string>` namespaced `${groupMode}::${key}` — the single expansion source for
  both the `app-pr-group-table` branch (seeds `[expandedRowKeys]`, `onToggleGroup` writes it) and
  the cards branch (reads/writes it directly, no `app-pr-group-table` there); `userCollapsedKeys`
  is namespaced too, so a manual collapse survives a `?group=` round trip and a mode switch never
  force-expands or bumps the nonce. Row: category column dropped (caption under the title
  instead), role tag inline after the code, placeholders render `<span aria-hidden>—</span>` +
  `sr-only` original text + `title`, dates `d MMM y` right-aligned, Actions `td`/`th` gain
  `!border-l` (BRT never had one — a corrected premise, not a regression).
- **Cards** (BRP-T-3, `narrow` input fed by the page's `isNarrow`): below 900px, `ul[role=list]`
  of `li[data-testid="bilateral-review-card"]`, no `<table>`, no `overflow-x`/`overflow-y` in this
  branch (R-15). Grouped: a `<button aria-expanded>` bar per group gated on the same owned
  `expandedKeys`; flat: `sortedFlatRows` order.
- Cycle select: re-picking the shown phase is a no-op via `setPhase()`'s own guard +
  `writeValue(selectedVersionId())` re-sync — never `[emptyValue]` bound to the selected id (would
  make `hasValue` permanently false, BRC-AC-6).
- Computed pipeline order: `searchFiltered` → `chipCounts`/`kpis`/`centerStrip` (before the popover
  filters) → `visibleRows` (+ status/Center/Project/Category) → `groups`/`flatRows`. The popover
  narrows rows shown; chips, stat bar and center strip never move.
- Permission: `BilateralReviewAccessService.isProgramMember(code)` gates the row action
  (`canReview()`); the drawer's `canEditInDrawer()` calls the same service + `status_id == 5`.

## Where it is used

- `shared/routing/routing-data.ts:625-636` — the route entry, fifth tab, sibling of
  `pages/my-work-board/`.
- `reporting-program-band.component.ts` — injects `BilateralReviewCountService` + `DataControlService`
  (resolves the CURRENT phase the same way this page does); the tab badge always reads the current
  phase, never this tab's own Cycle selection.
- `openEmergingReport()` hops to the dashboard-lab host with `?reportEmerging=true&returnTab=
  bilateral-review`.

## Gotchas

- ⚠️ **`status_id` comparisons are loose (`==`) everywhere** (pending/approved/rejected helpers,
  count service, center strip, table tone classes) — the wire sometimes sends it as `"5"`. Don't
  "fix" one `==` without checking the others.
- **All filtering/sorting/counting are client-side over one request** — popover option lists derive
  from full `tableResults`, not `visibleRows`, so a filter never removes its own options.
- `loading` starts `true` so a cold page paints the skeleton, never the empty state, first.
- ⚠️ **`ring-[var(--pr-focus-ring)]` paints nothing.** The token is a box-shadow triple
  (`colors.scss:311`); feeding it to `--tw-ring-color` (what `ring-[...]` does) is inert. Every new
  focusable control uses `focus-visible:shadow-[var(--pr-focus-ring)]` instead.
- ⚠️ **`#workArea`'s `min-[900px]:overflow-y-auto` computes `overflow-x: auto` too** at ≥ 900px
  (CSS: a `visible` axis computes to `auto` once the other axis isn't `visible`) — same coupling
  makes `.pr-table-wrap` (`overflow-x: auto` only) compute `overflow-y: auto` too. A CT probe that
  wants to defeat the wrap's clip must override BOTH axes on `.custom_scroll`, or the ambient
  coupling silently re-clips it (why the 1024 FAIL-input case targets two selectors, not one).
  Below 900px `#workArea` has no overflow rule at all (the `min-[900px]:` prefix is inactive) — the
  page scrolls natively there, no second-scroller concern.
- Narrow CT fixtures (cards, 9+ items) need **tall** viewports (1600, or 2400 for the 9-center
  fixture) — a native vertical scrollbar otherwise shaves ~15px off `documentElement.clientWidth`,
  unrelated to any real regression.
- `cypress-axe` is **not installed**. Accessibility is checked structurally (accessible names,
  `aria-pressed`/`aria-expanded`, no native `disabled`) — not a substitute for a contrast check.
  Contrast (badges, captions, placeholders, warning badge) is HITL-only.
- The CT harness runs at **effective root zoom `1`** (`--pr-font-scale` only leaves `1` via an
  `index.html` inline script the CT runner never loads) — `cy.viewport(w, h)` lands
  `documentElement.clientWidth` on `w` directly here; don't assume that generalizes to a real page
  with a non-default font scale. Every CT geometry assertion still measures `clientWidth` rather
  than assuming it, per the harness's own disqualifier.
- **Cross-tab `?phase=` value-space collision (open, not fixed here):** the Results tab writes a
  **label** into the same key; this tab detects and rewrites it (see Contract). The reverse hop
  (this tab's numeric id landing on Results) is not isolated by either tab.
- The relocated drawer's SCSS `@use` must be **7 levels** deep from this folder, not the legacy
  page's 9 — a wrong depth fails to compile silently and serves the drawer unstyled.
- ⚠️ **Effect REGISTRATION order matters (BRC-T-1).** The "URL → state" hydrate effect (writes
  `phaseParam`) MUST be registered BEFORE the list-loading effect — reversed, the first flush
  resolves to the current phase before `?phase=` ever hydrates.
