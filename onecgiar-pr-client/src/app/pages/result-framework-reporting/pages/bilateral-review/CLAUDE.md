# bilateral-review

**Verified:** 2026-09-09 · branch qa-development-2026 · spec `changes/bilateral-review-hierarchy-ux` (BRH-T-2 — container card architecture replacing `app-pr-group-table`, monospace project-code badge, contributing-center chips, smart progressive disclosure, in-card quick filter); parents `changes/bilateral-review-viewport-and-table-polish` (BRV-T-1..T-3 — viewport lock, pinned toolbar + filter band, Alignment column, status token pairs, group accent, action emphasis), `changes/bilateral-review-ux-polish` (BRP-T-1..T-4 — filter band + Clear filters + stat bar, table density/placeholders/group-by-center, narrow cards, CT gates), `changes/bilateral-review-center-strip-and-phase` (BRC-T-1..T-3 — phase-scoped list + badge, Cycle selector, center chip strip) and `changes/sp-bilateral-review-tab` (BRT-T-1..T-8 — relocated from the legacy `bilateral-results` page into one toolbar/table shell).

**What this owns:** the **Bilateral review** tab of the programme shell (`entity-details/:entityId/bilateral-review`) — one searchable, filterable, groupable list of W3/Bilateral results reported to this program, with a review drawer for approve/reject decisions.

## Contract

- **Viewport lock + pinned chrome** (BRV-T-1): the page is a lock adopter, same mechanism as
  `programme-results` — `host: { class: 'pr-viewport-page' }` + `bilateral-review.component.scss`
  (`:host { display: block; @include vp.pr-viewport-page }`, `@use` 5 levels deep to `src/styles`).
  At ≥ 900px the host computes `position: absolute`; `#workArea` — the `.custom_scroll` wrapping
  the rows, a **template reference**, not a CSS id (see Gotchas) — is the ONLY vertical scroller.
  `documentElement.scrollHeight <= clientHeight` holds only in CT: on the real page `app-footer`
  sits outside the shell frame, so the document still "scrolls" by that footer's height, same as
  every other locked tab. Below 900px only `display` changes; the mixin emits nothing, the
  document scrolls, cards branch unchanged.
- **Pinned toolbar + filter band** (BRV-T-1, `BRV-DD-1/2`): both sit in one wrapper
  (`data-testid="bilateral-review-pinned"`, `min-[900px]:sticky min-[900px]:top-0
  min-[900px]:z-[15]`, one bottom divider, no `overflow`), measured ≤ **150px** at 1536 with the
  centers row collapsed (142 measured + 8 margin). The wrapper's own measured height feeds
  `--brv-pinned-h`, which rows/cards consume as `scroll-margin-top` (WCAG 2.4.11) so a
  keyboard-focused row is never hidden under the chrome. The **stat bar is NOT pinned** — it and
  the rows scroll beneath the chrome. The **center strip IS pinned** (it lives inside the filter
  band's Centers row, `:423-430`, itself inside the wrapper, `:29-433`, so the cap holds only with
  that row collapsed). Sibling tabs (`programme-results`, `my-work-board`) pin only the band —
  this page's wider pin is a deliberate divergence, `onecgiar-pr-client/docs/DESIGN-DEVIATIONS.md`
  #16.
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
- **Filter band** (BRP-T-1): one labeled band, Status row (segmented control) + Centers row
  (chevron `aria-expanded`/`aria-controls`, `sessionStorage['pr.bilateral.centersExpanded']`
  `'1'|'0'`). Default collapsed when `> 6` centers **or** `isNarrow()`; a stored choice always wins.
  R-21: one-shot auto-expand landing on `?center=` with no stored choice. The strip
  (`BilateralReviewCenterStripComponent`) gains `collapsed` — one summary chip when collapsed,
  unchanged 12-cap/sentinel/`selectCenter` behavior when expanded.
- **Clear filters · N** (BRP-T-1): `clearEverything()` behind `@if (activeFilterCount() > 0)` —
  five dimensions (search, status ≠ all, centers, projects, categories); `phase`/`group`/`view`
  never count. One `router.navigate` sets the five keys `null`. The popover's own clear and the
  filtered-empty state's clear are separate controls; exactly one "Clear filters" node in the
  toolbar.
- **Stat bar** (`BilateralReviewKpisComponent`, BRP-T-1): one line ≥ 900px, host `data-testid="bilateral-review-statbar"` ≤ 44px there, NOT pinned (see above). Six testids: `kpi-projects`, `kpi-centers`, `kpi-pending`, `kpi-pending-toggle`, `kpi-decided`, `kpi-decided-sublabel`.
- **Table** (`BilateralReviewTableComponent`, BRP-T-2/T-3, BRV-T-2, **BRH-T-2**): grouped rendering
  is a sequence of elevated `<section class="rounded-[12px] border ... bg-[var(--pr-surface-card)]
  shadow-xs overflow-hidden">` container cards — `app-pr-group-table`/`PrGroupTableComponent` is
  **fully gone** (BRH-DD-1), in BOTH the ≥900px branch (a nested `<table>` per card) and the
  `narrow()` cards branch (own header bar, no nested table). The 52px header (wide) / 44px+ header
  (narrow) separates the parsed project code (`parseProjectIdentifier`, `BRH-DD-3` —
  `^[A-Z0-9-]+(?=-)` prefix regex) into a monospace badge from the title, renders contributing
  centers as discrete chip badges (`data-testid="bilateral-review-center-chip"`, BRH-R-3 — capped
  at 3 + a `+N` overflow chip on the narrow header, full list on wide), and a rotating chevron in a
  white button box. 7 columns in flat view and in project-grouped view; **6** only when
  `groupMode() === 'center' && view() === 'grouped'` (`showCenterColumn()`; flat view keeps the
  center column even with `?group=center`, AC-7b). `columnCount()` (7/6) drives the ONE remaining
  `colspan` site, the flat-view loading row; the grouped branch has none since BRH-T-2 (card `<div>`
  skeleton, `headerRowTpl` `<thead>`, no group-header `td`). TOC + Indicator merged
  into one **Alignment** column (`data-testid="bilateral-review-row-alignment"`): each line renders
  only when its own value is not a placeholder; both placeholders collapse to one `aria-hidden` "—"
  + one `sr-only` text naming both originals. Lead center is one line
  (`data-testid="bilateral-review-row-center"`, inner `truncate` span, `title`). Truncation always
  lives on an inner `<span>`, never the `td` (`table-layout: auto` makes `max-width` on a `td`
  inert). Status pills and card pills key off `statusToneClass`; the group-pending badge keys off
  `groupPendingBadgeClass()` (same pending pair, never recomputed independently) — all three the
  design system's **fixed fg/bg pairs** (`--pr-status-*`/`--pr-danger*`,
  client hard rule 9: **never recombine** a foreground with another background). Group headers
  carry a 3px left accent (pending tone if the group has pending rows, `--pr-border` otherwise).
  `groups` generalized to `BilateralReviewGroup { key, label, caption,
  center, results }` — project mode `key = project_name`; center mode `key = lead_center ||
  UNASSIGNED_CENTER_CODE`, pending desc then acronym asc, blank bucket always last. The component
  **owns** `expandedKeys: Set<string>` namespaced `${groupMode}::${key}` — SINGLE expansion source
  for both the wide card branch and the narrow cards branch (there is nothing else to defer to —
  `PrGroupTableComponent`'s own `dataKey`/accordion state is gone). `lastKeysByMode`/
  `userCollapsedKeysByMode` (one Map/Set PER `groupMode`) back the constructor effect's
  `previous ?? smartDefault` re-seed that fires on every new `groups()` reference (search keystroke,
  filter change, mode switch): `userCollapsedKeys` protects a manual COLLAPSE, and — since a
  BRH-T-2 attempt-2 fix — `onToggleGroup` also writes `lastKeysFor(mode)` on EVERY click so a
  manual EXPAND of a zero-pending group survives too (previously only the collapse direction was
  protected, so expanding a 0-pending card was silently re-collapsed by the next re-render). A mode
  switch alone (no `expandAllNonce` bump) re-seeds from THAT mode's own memory only, never forces
  expand-all (BRP-T-2/judgment-day L-4). Row action reads `text-[var(--pr-color-primary-700)]
  font-semibold` (+ `hover:` variant) only when `canReviewRow(row)` — pending **and** the caller may
  review; everyone else gets the neutral ghost, same predicate on cards.
- **Cards** (BRP-T-3, `narrow` fed by the page's `isNarrow`): below 900px, `ul[role=list]` of
  `li[data-testid="bilateral-review-card"]`, no `<table>`, no `overflow-x`/`overflow-y` (R-15).
  Grouped bar carries the group accent (above); flat: `sortedFlatRows` order.
- Cycle select: re-picking the shown phase is a no-op via `setPhase()`'s own guard +
  `writeValue(selectedVersionId())` re-sync — never `[emptyValue]` bound to the selected id.
- Computed pipeline order: `searchFiltered` → `chipCounts`/`kpis`/`centerStrip` (before the popover
  filters) → `visibleRows` (+ status/Center/Project/Category) → `groups`/`flatRows`.
- Permission: `BilateralReviewAccessService.isProgramMember(code)` gates `canReview()`; the
  drawer's `canEditInDrawer()` calls the same service + `status_id == 5`.

## Where it is used

- `shared/routing/routing-data.ts:625-636` — the route entry, fifth tab, sibling of
  `pages/my-work-board/`.
- `reporting-program-band.component.ts` — injects `BilateralReviewCountService` +
  `DataControlService`; the tab badge always reads the CURRENT phase, never this tab's Cycle
  selection.
- `openEmergingReport()` hops to the dashboard-lab host with `?reportEmerging=true&returnTab=
  bilateral-review`.

## Gotchas

- ⚠️ **`#workArea` is a template REFERENCE variable (`<div #workArea>`), never a CSS id — it has
  bitten this module three times.** The `BRP` CT comment and a `BRP` T-3 probe both named it as if
  it were selectable, and the `BRV` T-1 SCSS `scroll-margin-top` rule targeted `#workArea tr` and
  silently matched nothing (a source-text Jest test "proved" it; only a CT computed-style gate on a
  real row caught it). Select the work area by its class (`.custom_scroll`) or a `data-testid`, not
  `#workArea`.
- ⚠️ **PRMS `--pr-color-*-100` shades are saturated mid-tones, not tints** (`yellow-100 #fdc82f`,
  `green-100 #37de54`) — never use them as a pill/badge fill. Every status surface (row pill, card
  pill, group-pending badge) uses the fixed `--pr-status-*`/`--pr-danger*` pairs instead.
- ⚠️ **`status_id` comparisons are loose (`==`) everywhere** (pending/approved/rejected helpers,
  count service, center strip, table tone classes) — the wire sometimes sends it as `"5"`. Don't
  "fix" one `==` without checking the others.
- A 7-row CT fixture **cannot exercise the lock/pin/scroll gates** — `#workArea`'s content never
  exceeds its `clientHeight` at 1536×900. Use `FIXTURE_ROWS_TALL` (≥ 80 rows) for anything that
  scrolls the work area; the default `FIXTURE_ROWS`/9-center fixtures stay fine for layout-only
  cases.
- **All filtering/sorting/counting are client-side over one request** — popover option lists derive
  from full `tableResults`, not `visibleRows`, so a filter never removes its own options.
- `loading` starts `true` so a cold page paints the skeleton, never the empty state, first.
- ⚠️ **`ring-[var(--pr-focus-ring)]` paints nothing.** Use `focus-visible:shadow-[var(--pr-focus-ring)]` instead.
- ⚠️ **`#workArea`'s `min-[900px]:overflow-y-auto` computes `overflow-x: auto` too** at ≥ 900px (a
  `visible` axis computes to `auto` once the other axis isn't `visible`) — same coupling makes
  `.pr-table-wrap` compute `overflow-y: auto` too. A CT probe defeating the clip must override BOTH
  axes on `.custom_scroll`. Below 900px `#workArea` has no overflow rule at all.
- Narrow CT fixtures (cards, 9+ items) need **tall** viewports (1600, or 2400 for the 9-center
  fixture) — a native vertical scrollbar otherwise shaves ~15px off `documentElement.clientWidth`.
- `cypress-axe` is **not installed**. Accessibility is checked structurally — not a substitute for
  a contrast check. Contrast (pills, accents, captions) is HITL-only, pre-audited ≥ 4.5.
- The CT harness runs at effective root zoom `1` — `cy.viewport(w, h)` lands
  `documentElement.clientWidth` on `w` directly here; every CT geometry assertion still measures
  rather than assumes.
- **Cross-tab `?phase=` value-space collision (open, not fixed here):** the Results tab writes a
  **label** into the same key; this tab detects and rewrites it. The reverse hop is not isolated.
- The relocated drawer's SCSS `@use` must be **7 levels** deep from this folder (the page's own
  viewport-lock SCSS is 5); a wrong depth fails to compile silently and serves it unstyled.
- ⚠️ **Effect REGISTRATION order matters (BRC-T-1).** The "URL → state" hydrate effect (writes
  `phaseParam`) MUST be registered BEFORE the list-loading effect — reversed, the first flush
  resolves to the current phase before `?phase=` ever hydrates.
- ⚠️ **Narrow card group header is TWO stacked rows, not one 44px row (BRH-T-2 attempt 2).** The
  toggle `<button>` is `min-h-[44px] flex-col` (no fixed `h-[44px]`) — row 1 is chevron + identity +
  count/pending, row 2 (indented `pl-[32px]` to align under the title) carries the capped center
  chips (project mode) or the "N projects" caption (center mode). Don't collapse this back to one
  row "to match the wide header" — that was Reviewer FAIL #2 (center info silently disappeared
  below 900px, contradicting BRH-R-3's "truncate, don't disappear").
- `ResultToReview` has **no `result_type_name`/`result_type_id` field** — the by-program-and-centers
  payload (`results.service.ts:getResultsByProgramAndCenters`) only maps `indicator_category` (from
  `result_category`) for a result's "type". The in-card Type quick filter (`distinctCardTypes`)
  reads `indicator_category` alone; don't reintroduce an invented `result_type_name` fallback.
