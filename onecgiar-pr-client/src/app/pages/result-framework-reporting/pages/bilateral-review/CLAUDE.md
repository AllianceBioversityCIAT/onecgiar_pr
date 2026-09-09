# bilateral-review

**Verified:** 2026-09-09 · branch qa-development-2026 · spec `changes/bilateral-review-hierarchy-ux` (**BRH-T-1 attempt 2** — consolidated 2-row pinned band, token-styled Filter popover replacing `app-pr-filter-select`/`-multiselect`, KPI ribbon wrap fixing the 375px document overflow, page CT re-based off the superseded gates; BRH-T-2 — container card architecture replacing `app-pr-group-table`, monospace project-code badge, contributing-center chips, smart progressive disclosure, in-card quick filter; **BRH-T-3** — semantic result-type badges, per-row 3px status accent, hover-copy hardening, text selection); parents `changes/bilateral-review-viewport-and-table-polish` (BRV-T-1..T-3 — viewport lock, pinned toolbar + filter band, Alignment column, status token pairs, group accent, action emphasis), `changes/bilateral-review-ux-polish` (BRP-T-1..T-4 — filter band + Clear filters + stat bar, table density/placeholders/group-by-center, narrow cards, CT gates), `changes/bilateral-review-center-strip-and-phase` (BRC-T-1..T-3 — phase-scoped list + badge, Cycle selector, center chip strip) and `changes/sp-bilateral-review-tab` (BRT-T-1..T-8 — relocated from the legacy `bilateral-results` page into one toolbar/table shell).

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
- **Pinned 2-row band** (BRV-T-1 · **BRH-T-1**, `BRV-DD-1/2`, `BRH-DD-5/6`): everything sits in one
  wrapper (`data-testid="bilateral-review-pinned"`, `min-[900px]:sticky min-[900px]:top-0
  min-[900px]:z-[15]`, one bottom divider, no `overflow`) — Row 1 (Search + Filter popover trigger
  + Status segmented control | Group-by / View / Expand-all cluster) and Row 2
  (`bilateral-review-filter-band`: KPI metric ribbon + dismissible chips + Clear all). BRH-T-1
  folded away the separate stat bar AND the collapsible Centers row, so the band has ONE height.
  ⚠️ **Measured (CT, BRH-T-1 attempt 2): 87px at 1536 — but 132px at 1280 and at 840, over
  `BRH-R-10`'s 110px budget.** Row 1's two clusters are 748px + 462px intrinsic, so below ~1290px
  they wrap to two lines (95px) and the wrapper busts the cap; the only gate today runs at 1536.
  Not a BRH-T-1-attempt-2 regression (measured identical before the popover/ribbon work) — open
  item, needs a Row 1 compression decision (design.md §4.4 pins Search at 240px). The wrapper's own
  measured height feeds `--brv-pinned-h`, which rows/cards consume as `scroll-margin-top`
  (WCAG 2.4.11) so a keyboard-focused row is never hidden under the chrome. Sibling tabs
  (`programme-results`, `my-work-board`) pin only the band — this page's wider pin is a deliberate
  divergence, `onecgiar-pr-client/docs/DESIGN-DEVIATIONS.md` #16.
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
- **Filter popover — four dimensions, ZERO shared filter components** (BRP-T-1 · **BRH-T-1 attempt
  2**, HITL fix #2): the popover (`bilateral-review-filter-popover`, opened by
  `bilateral-review-filter-button`, ≤ 400px wide) no longer hosts `app-pr-filter-select` /
  `app-pr-filter-multiselect` — those rendered the legacy full-height purple chevron block and grey
  placeholder box, off-grammar against the Overview "Filters" popover
  (`dashboard-lab.component.html`, the reference). Every control is now OWNED markup:
  - **Cycle** (`?phase`) — a 2-column **pill grid**, `bilateral-review-cycle-select` wrapping
    `bilateral-review-cycle-option` `<button [attr.aria-pressed]>`; selected look derives straight
    from `selectedVersionId()`, so a re-pick cannot desync a child's internal value.
  - **Center** (`?center`), **Bilateral project** (`?project`), **Indicator category**
    (`?category`) — identical **checkbox lists**: `bilateral-review-filter-options-<dim>` (a
    `max-h-[160px] overflow-y-auto` box) of `bilateral-review-filter-option-<dim>`
    `<button role="checkbox" [attr.aria-checked]>` + `bilateral-review-filter-option-label`, an
    uppercase section label with a `bilateral-review-filter-count-<dim>` badge, and a
    `bilateral-review-filter-search-<dim>` option-search `<input>` that appears **only above 8
    options** (`FILTER_OPTION_SEARCH_THRESHOLD`) so a 3-category list is never cluttered.
    ⚠️ Option search filters the OPTION LIST, not the rows — `bilateral-review-search` is the row
    one. Toggling writes the page signal directly (`toggleCenterFilterOption`, …); the existing
    "state → URL" effect reflects it, so all eight query-param bindings are untouched.
  - No CVA child means no deferred `[ngModel]` write: Jest reads `aria-checked`/`aria-pressed`
    synchronously and every `await fixture.whenStable()` those assertions needed is gone.
  - **Escape (`document:keydown.escape`) has TWO containment guards** (Reviewer round 2) — it is a
    `document:` listener on a page that also hosts the review drawer. An Escape raised inside
    `app-result-review-drawer` is left entirely alone (the drawer owns it); every other Escape
    dismisses the popover (client hard rule 4) but moves focus to the trigger **only** when the
    event came from inside `.brt-filter-container` (trigger + popover — the same boundary
    `onDocumentClick` uses). Stealing focus from wherever the user was is the worse a11y bug.
  - **The three option-search needles are popover-local view state and reset on EVERY close path**
    (`closeFilterPopover`, the trigger's own close, the outside-click close, Escape) **and on both
    clears** (`clearFilters`, `clearEverything`). Left behind, a needle hid a SELECTED option on the
    next open — the Row 2 chip reading `Center: CIP` over an empty list.
  - The option list's empty state is `copy.toolbar.filterOptionsNoMatches`; the four now-unreferenced
    `*FilterPlaceholder` keys went with the CVA children.
- **Clear filters · N** (BRP-T-1): `clearEverything()` behind `@if (activeFilterCount() > 0)` —
  five dimensions (search, status ≠ all, centers, projects, categories); `phase`/`group`/`view`
  never count. One `router.navigate` sets the five keys `null`. The popover's own clear and the
  filtered-empty state's clear are separate controls; exactly one "Clear filters" node in the
  toolbar.
- **KPI metric ribbon** (was the `BilateralReviewKpisComponent` stat bar, BRP-T-1 → **BRH-T-1**):
  the standalone `bilateral-review-statbar` host is GONE — the six figures now live inline in Row 2
  of the pinned band as `bilateral-review-metric-ribbon`, beside the active-filter chips. Same six
  testids: `kpi-projects`, `kpi-centers`, `kpi-pending`, `kpi-pending-toggle`, `kpi-decided`,
  `kpi-decided-sublabel`. ⚠️ The ribbon is `flex-wrap min-w-0` with `whitespace-nowrap` on the ITEMS
  (BRH-T-1 attempt 2, `BRH-R-11`) — as one unbreakable run its 448px of content overflowed the
  375px viewport (`documentElement.scrollWidth` 464 vs 360) and put a horizontal scrollbar on the
  DOCUMENT. Don't re-flatten it to a single nowrap row.
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
  carry a 3px left accent (pending tone if the group has pending rows, `--pr-border` otherwise) —
  **on the toggle `<button>` ONLY** (BRH-T-3 forward-pointer fix: the group `<section>` used to
  carry the SAME accent, stacking two 3px edges at the card's left boundary; removed from the
  `<section>` in both the wide and narrow branches). Each RESULT (not group) also carries its own
  3px left accent, `rowAccentClass(row)` — a SEPARATE method from `groupAccentClass`, keyed off the
  row's own status (`!border-l-[var(--pr-status-in-progress-fg)]` pending /
  `!border-l-[var(--pr-status-approved-fg)]` approved / `!border-l-[var(--pr-danger)]` rejected /
  `!border-l-[var(--pr-border)]` neutral, design.md §4.3) — on the leftmost `<td>` (a `<tr>` has no
  reliable left-border box in the separated-borders table model) in the wide/nested table, and on
  the `<li>` itself in the narrow card branch. `groups` generalized to `BilateralReviewGroup { key, label, caption,
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
- Cycle pills: re-picking the shown phase is a no-op via `setPhase()`'s own guard ALONE — the
  `writeValue(selectedVersionId())` re-sync and the `cycleSelect` viewChild are gone with the CVA
  child (BRH-T-1 attempt 2); a pill's pressed look is derived from `selectedVersionId()` every
  render, so it is structurally incapable of going stale.
- Computed pipeline order: `searchFiltered` → `chipCounts`/`kpis`/`centerStrip` (before the popover
  filters) → `visibleRows` (+ status/Center/Project/Category) → `groups`/`flatRows`.
- Permission: `BilateralReviewAccessService.isProgramMember(code)` gates `canReview()`; the
  drawer's `canEditInDrawer()` calls the same service + `status_id == 5`.
  ⚠️ **`canReview()` is a plain method and must stay one — but its promise is "re-read on this
  page's next RENDER", not "every tick".** The page is `OnPush` and `myInitiativesList` is a plain
  array on `DataControlService`; for a non-admin member nothing marks the view dirty when membership
  lands (`rolesSE.isAdmin` goes false → false, notifying nothing), so a row can sit on `See` until
  the user's next interaction. Until BRH-T-1 attempt 2 the `[ngModel]` filter controls hid this —
  `NgModel._updateValue()` defers a `markForCheck()` on this view's own CDR to a microtask. Closing
  the last gap needs a reactive `myInitiativesList` (the P2-3322 treatment `RolesService` already
  has); app-wide, out of this spec. Do NOT "fix" it with `ngDoCheck`: measured in CT, a
  `ViewContainerRef.createComponent`-mounted component (what the router outlet does) runs
  `ngDoCheck` exactly ONCE, at init.

## Page CT re-base (`bilateral-review.cy.ts`, BRH-T-1 attempt 2)

48 tests, all green. The 24 gates that went red when T-1/T-2 replaced the surfaces they asserted
were rewritten to the BRH requirements, not deleted — 19 of them carry an
`@akili-spec changes/bilateral-review-hierarchy-ux (BRH-T-1 attempt 2)` note saying what replaced
what. In summary:

| Superseded gate | Became |
|---|---|
| `bilateral-review-statbar` host + its ≤44px / not-pinned claims | KPI figures measured inside Row 2's `bilateral-review-metric-ribbon` (`BRH-R-10`) |
| `bilateral-review-centers-toggle`, center-strip wrap, `Centers · N`, the collapse round trip | DROPPED — no collapsible centers row exists; popover open/close is covered by the AC-15 focus-order and BRV-AC-3b popover-bounds gates |
| `.pr-table-wrap`, group-header `td`, `colspan=6`, "6 headers grouped by center", 40px group bar | `bilateral-review-group-card` sections + the 52px card header (`BRH-R-1/2`) |
| Pinned chrome ≤150px with the centers row collapsed | `BRH-R-10`: pinned wrapper ≤110px at 1536 (measured 87) + firstRow − workArea ≤130px |
| Cycle `app-pr-filter-select` `.text`/`.option` queries | `bilateral-review-cycle-option` `aria-pressed` on the owned pill grid |
| `app-pr-filter-multiselect` `.text` label reads | `bilateral-review-filter-option-<dim>` `aria-checked` on the owned checkbox lists |
| 375px `assertEffectiveWidth(…, 360)` "harness quirk" | restored to the requested 375 once the real ribbon overflow was fixed; the full AC-4 fixture is back too |

Added on top of the re-base (Reviewer round 2), so the popover's prose claims have detectors:
`bilateral-review.cy.ts` asserts the opened popover contains **zero**
`app-pr-filter-select`/`app-pr-filter-multiselect`/`.pr-filter-*`/legacy `.field`/`.options` nodes
and measures **≤ 400px** wide (plus an anti-vacuity check that the four owned controls are present);
`bilateral-review.component.spec.ts` gained nine behavioural tests for the keyboard contract, the
containment guards, the 8-option threshold, needle narrowing / empty state / reset, and the Project
and Category toggles (previously only Center was exercised).

Every other `assertEffectiveWidth` call still asserts its own requested width; only the CT viewport
HEIGHT was ever raised (375×3000) to clear the taller BRH cards.

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
  ⚠️ **But don't reach for that explanation first at 375px.** A 15px shave there was blamed on an
  unavoidable `min-h-screen` harness quirk and the gate re-based to 360; it was actually the metric
  ribbon overflowing HORIZONTALLY — that scrollbar ate 15px of viewport HEIGHT, and `min-height:
  100vh` then forced the vertical one. Fixing the overflow restored a clean 375. Rule of thumb: if
  `documentElement.scrollWidth > clientWidth`, the shave is a symptom, not the harness.
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
  ⚠️ **`indicator_category`'s ACTUAL source is the `result_type` catalog table**, not an indicator:
  `result.repository.ts:getResultsByProgramAndCenters` selects `rt.name AS result_category` (joined
  `result_type rt ON r.result_type_id = rt.id`) and the service aliases it to `indicator_category`,
  falling back to the literal string `'Not Applicable'` when no type is set. The values are the
  `result_type` migration rows: `'Policy Change'`, `'Innovation use'`, `'Innovation Development'`,
  `'Capacity Sharing for Development'`, `'Knowledge Product'`, `'Other output'`/`'Other outcome'`.
  This is what `resultTypeToneClass`/`hasResultTypeBadge` (BRH-T-3, BRH-R-7) key their semantic
  badge colors on — case/whitespace-normalized lookup, neutral `slate` fallback for anything
  unmapped, badge suppressed via the shared `isPlaceholder` check for the `'Not Applicable'`
  fallback (never invent a display value the server didn't send).
- **`copyText`'s clipboard write is awaited, not fire-and-forget (BRH-T-3).** `navigator.clipboard
  .writeText(...)` returns a Promise that REJECTS on a denied permission — the checkmark
  (`copiedKey.set(...)`) now sets only in `.then()`, with a no-op `.catch()`, so a denied prompt
  never shows a false "Copied!". `stopPropagation` still runs synchronously regardless of how the
  promise settles.
- **Text selection (`cursor-text select-text`, BRH-R-5) is WIDE-header-only for the project code
  chip and title** — both live inside the narrow header's `<button>` (whole-row toggle), so adding
  selectable text there without `stopPropagation` on every text node risks an accidental
  expand/collapse on a selection drag; the narrow group header intentionally does NOT get this
  treatment (unchanged from before BRH-T-3). Result Code and the Alignment column's TOC/Indicator
  spans DO get it in both branches — neither sits inside a clickable ancestor.
- **Hover-copy buttons are NOT header-only** (BRH-T-3 remainder, BRH-US-4) — Result Code
  (`bilateral-review-row-code`) and the Alignment cell/caption both carry their own copy button in
  BOTH the wide table and narrow card branches, same `copyText(text, key, $event)` engine as the
  project title/code button. Keys are `'code:' + row.result_code` / `'alignment:' + row.result_code`
  — unique per row so two checkmarks can't light together. `alignmentCopyText(row)` builds the
  clean copy string (`toc_title`/`indicator`, `isPlaceholder`-filtered, joined `' · '` — the SAME
  join `cardCaption` uses, but WITHOUT category/center); the button is omitted entirely when
  `alignmentBothPlaceholder(row)` (nothing real to copy). Wide buttons are `h-5 w-5`, hover-revealed
  via `group` (on `<tr>`) + `group-hover:opacity-100`/`focus-visible:opacity-100` — matching the
  pre-existing project-title button's always-visible convention would have been simpler but the
  Leader asked for hover-reveal here. Narrow buttons are always-visible `h-[44px] w-[44px]` (R-11
  touch target; narrow has no reliable hover) — this is why the two branches use different sizes/
  visibility for the "same" button, not a design drift. The exact code text now lives on an inner
  `data-testid="bilateral-review-row-code-value"` span (added so Jest's exact-text assertions on
  the code don't pick up the copy button's icon ligature text) — the outer `bilateral-review-row-code`
  testid is unchanged and still the one to query for "does this row have a code cell" checks.
- ⚠️ **Every table variant is `table-fixed` with ONE shared `<colgroup>` (BRH-T-3 attempt 2/3, HITL
  live-page finding, BRH-R-1).** Before this, each nested per-card `<table>` used `table-layout:
  auto`, so a card's OWN content decided its own column widths — on the live page, Lead
  Center/Status/Alignment/Submission Date/Actions drifted left-right between cards, and one
  card's headers even wrapped. `columnWidths()` (component) returns one px-width array — **`96px`
  code / `''` title / `110px` center [project mode only] / `120px` status / `220px` alignment /
  `100px` date / `100px` actions** (attempt-3 re-balance; measured via CT: Title = 530.5px @1280,
  250.5px @1000 — the WIDEST column at both, satisfying BRV-R-3's "Title is the merged column's
  primary beneficiary") — rendered by `colgroupTpl` as the FIRST child of every `<table>`: the
  nested grouped table in both modes AND the flat table. Title is the ONLY column with no entry,
  so `table-fixed` hands it 100% of the remainder; its `min-w-[280px]` (`th`/`td`) was DROPPED for
  the same reason. Other columns' pre-existing `min-w-*` classes were left alone (smaller than
  their colgroup width, harmless no-ops under `table-fixed`).
- ⚠️ **The Contributor chip lives on its OWN stacked line under the code+copy-button line**
  (`flex flex-col`, BRH-T-3 attempt 3, Reviewer FAIL) — NOT inline with the code any more. Under
  `table-fixed`'s hard 96px code column, code text + the "Contributor" chip (~76px) + the copy
  button (20px) on ONE line was ~155-165px in a ~76px content box, painting over the Title cell
  (a real production shape per `BRP-AC-8`, not a fixture-only edge case). Stacked, each line only
  needs to fit alone. The type badge (BRH-R-7) got the same class of fix: `whitespace-nowrap
  truncate max-w-full` (+ a `title` attr) so a long category name never wraps onto a 2nd/3rd line
  now that Title is narrower at 1000px — a wrapped badge would have inflated row height in a shape
  no test measured before Gate 7's badge-offsetHeight check.
- ⚠️ **A `<section overflow-hidden>` measuring its own `scrollWidth <= clientWidth` is a
  TAUTOLOGY, not a behavioral proof (BRH-T-3 attempt 3, Reviewer FAIL).** `bilateral-review-group-
  card` sections clip their own content (`overflow-hidden`) and wrap a `div.overflow-x-auto`
  around the nested `<table>` — the section's own scrollWidth can never exceed its clientWidth no
  matter how wide the table inside renders. Both `bilateral-review-table.cy.ts` Gate 1 and Gate 7
  now measure the REAL scroller (`.overflow-x-auto`, found via `querySelector` inside the section
  — `null` on a COLLAPSED card, which renders no nested table at all; skip, don't fail, but assert
  at least one scroller was actually checked so the test can't pass vacuously) and the `<table>`'s
  own `scrollWidth` against that scroller's `clientWidth`.
- ⚠️ **The type badge (BRH-R-7) has a browser rendering floor `mt-*`/`leading-*` CANNOT close.**
  Measured via `getBoundingClientRect()`: a persistent ~3.5px gap sits between the `line-clamp-2`
  title `<p>`'s own bottom and the badge's top even at `mt-0` — a `-webkit-line-clamp` box-model
  quirk in this Chromium build, not a Tailwind/class problem. The badge is shrunk to `mt-0 py-0
  leading-[12px]` (as tight as it can legibly get while keeping the `border` design.md §4.2
  requires); the two-line-title-with-badge row still measures 66.5px, so `bilateral-review.cy.ts`'s
  "Row height gate" cap for that ONE shape is re-based `64 -> 68` (measured + 1.5px buffer, same
  convention its other two caps already use). The one-line-no-badge (44px) and one-line-with-badge
  (49.5px) shapes were re-measured too and still fit their EXISTING caps unchanged.
