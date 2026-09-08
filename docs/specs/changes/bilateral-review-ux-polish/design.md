# Design — Bilateral review: UX/UI polish

## Document Control

| Attribute | Value |
|---|---|
| **Spec path** | `docs/specs/changes/bilateral-review-ux-polish/` |
| **Module code** | `BRP` |
| **Depth** | Standard (compact) — §12 re-checked |
| **Approval Mode** | pre-approved (owner, 2026-09-07) |
| **Status** | approved — Phase 2 gate auto-approved (pre-approved mode); judgment-day one pass, fix-only, applied 2026-09-07 (`judgment.md`, 8 severe families fixed) |
| **Skills** | `angular-developer`, `ui-ux-pro-max`, `frontend-design`; kaizen `KZ-REH-1`, `KZ-REH-2`, `KZ-MWB-2/3`; memories `project-hitl-looks-catch-what-diff-reviews-miss`, `project-fixtures-real-cold-boot-shapes` |
| **Budget (§12)** | 4 tasks · ~850 added source LOC · ~900 test LOC · ≤ 1 review round per task; tripwire > 1200 source or any third attempt |

---

## 1. Summary

Four additive changes inside `pages/bilateral-review/`: (1) the status chips and the centers strip become one **filter band** — a segmented status control and a **collapsible** centers row with tonal count badges — plus a toolbar **Clear filters · N**; (2) the four KPI cards become a one-line **stat bar**; (3) the table gets **row density** (2-line title clamp, inline role tag, category caption, single-line status, muted "—" placeholders, hover) and a **Group: Project | Center** mode with a restyled group header; (4) below 900 px the rows render as **cards**. No server change, no band change, no drawer change, `#workArea` stays the only scroller.

---

## 2. Premises (verified in code, 2026-09-07 — scout report)

| Premise | Where | Fact |
|---|---|---|
| Table views | `bilateral-review-table.component.html:15-66, 68-107, 109-169, 170-192` | one shared `#rowTpl` (9 `td`s with `!`-prefixed utilities) and `#headerRowTpl`; grouped via `app-pr-group-table` (`dataKey="project_name" groupRowsBy="project_name"`, `prTableGroupHeader` = `td[colspan=9]` with chevron/name/centers/summary), flat via plain `div.overflow-x-auto > table` |
| `PrGroupTableComponent` | `shared/components/pr-table/pr-group-table.component.ts:92-112, 167-178` | `keyField = dataKey \|\| groupRowsBy`, plain `@Input`s (not signals); the component owns its expansion `Set` seeded from `expandedRowKeys`; the wrapper's `expandedRowKeys` effect (`bilateral-review-table.component.ts:102-121`) re-seeds on every new `groups` reference and, on a nonce change, forces all and **clears `userCollapsedKeys`** — so a mode switch must NOT bump the nonce; the table component becomes the single owner of expansion state for both branches |
| Sticky header | `pr-table.component.scss:8-16`; `programme-results.component.ts:648-656` | only under a nested `overflow-y:auto` wrapper; no sibling pins a header vertically → R-7 dropped |
| Group building | `bilateral-review.component.ts:444-453` | `groups` = `Map` keyed by `row.project_name ?? ''` → `{ project_id, project_name, results }`, insertion order, empties dropped by the table (`filteredGroups`, table `.ts:88`) |
| Collapse memory | table `.ts:98-132` | `userCollapsedKeys: Set<string>` keyed by the group key; `expandAllNonce` forces all and clears the set |
| Clear filters | page `.ts:814-826`; `.html:113, 216-224, 377` | `clearFilters()` = centers/projects/categories; `clearAllFilters()` = search + status + `clearFilters()`; rendered in the popover header (`:113`), as a **toolbar-level** ghost button at `:216-224` (sibling of `.brt-filter-container`, gated on `filtersActive()`) and in the filtered-empty state (`:377`) — T-1 **replaces** the `:216-224` button |
| Active-filter count | page `.ts:479-480` | `activeFilterCount` counts centers + projects + categories only |
| Only pending | page `.ts:304, 754-756` | `onlyPending = status === 'pending'`; toggle flips status |
| KPI component | `bilateral-review-kpis.component.{ts,html}` | inputs `kpis {projects, centers, pending, approved, rejected}`, `loading`, `pendingActive`; output `togglePending`; Pending card is a `<button aria-pressed>`; icons `material-icons-round` (`account_tree`, `groups`, `hourglass_top`, `fact_check`) |
| Status tones | table `.ts:157-162` | raw Tailwind: pending `bg-amber-50 text-amber-800 border-amber-200`, approved emerald, rejected red — the page's established status palette; reused for the group-header pending badge |
| Tokens | `src/styles/colors.scss:58-213`; `docs/ux-ui/design.md` §7 | no semantic warning/success tokens; families `--pr-color-{red,yellow,green,blue,orange,neutral}-*`, `--pr-color-primary-25..950`; surfaces `--pr-surface-{app,card,subtle,ground,subtle-hover,raised-soft,sunken}`; text `--pr-text-{heading,secondary,muted,subtle,disabled}`; borders `--pr-border{,-strong,-divider}`; `--pr-focus-ring`; §7 line 230 says `material-icons-round` for new work — the bilateral **toolbar** already uses lucide (`lucideSearch`, `lucideChevronsUpDown`); rule for this spec: each region keeps the set it already uses, never mixed inside one component |
| Storage convention | `dashboard-lab.component.ts:3657-3683, 3754-3763` | `sessionStorage`, keys `pr.<area>.<thing>`, values `'1' \| '0'` for ephemeral UI toggles |
| Narrow detection | `my-work-board.component.ts:56, 311-327, 695-706` | `matchMedia('(max-width: 899px)')` + `isNarrow` signal, guarded for jsdom; CSS handles visual changes, the signal only structural branches — the pattern to copy for cards |
| Root zoom | memory `project-orca-browser-real-page-checks` | requested 700 px → 840 effective CSS px; CT harness runs at zoom 1 |

---

## 3. Data Model — none. ## 4. API Surface — unchanged (no new request; `?group=` is a client param). ## 5. Server — no change.

---

## 6. Frontend Plan

### 6.1 State (page `bilateral-review.component.ts`)

- `group = signal<'project' | 'center'>('project')` hydrated from `?group=` (eighth key in `bilateral-review.query-params.ts`; absent = project; invalid → project, param removed). `setGroup(mode)` writes the param (`merge`, `replaceUrl`) only — **no nonce bump**: the new `groups` reference plus the table's new `groupMode` input re-seed expansion for the new key space while `userCollapsedKeys` (namespaced `project::<key>` / `center::<key>`) is preserved.
- `groups` computed generalized to `BilateralReviewGroup = { key: string; label: string; caption: string | null; center: string | null; results: Row[] }`: project mode → `key = project_name`, `label = project_name`, `caption = null`, `center` = distinct lead centers joined; center mode → `key = lead_center || UNASSIGNED_CENTER_CODE`, `label` = acronym or "Not specified", `caption` = "N projects" (distinct `project_name`), `center = null`. Order: project mode unchanged (insertion); center mode pending desc, acronym asc, **blank bucket always last** (same rule as the strip).
- Table expansion state: `BilateralReviewTableComponent` owns `expandedKeys = signal<Set<string>>` (namespaced by `groupMode`) as the **single source** for both branches — the `app-pr-group-table` branch seeds `[expandedRowKeys]` from it and `onToggleGroup` writes it, the cards branch reads and toggles it directly. `userCollapsedKeys` stays namespaced so a collapse in one mode survives a round trip; the nonce path (Expand/Collapse all) is the only thing that clears it. `dataKey`/`groupRowsBy` bindings change to `"key"` and `onToggleGroup`/`lastKeys` key off `group.key`.
- `centersExpanded = signal<boolean | null>(null)` — `null` = no stored choice (read once from `sessionStorage['pr.bilateral.centersExpanded']`, `'1'` → true, `'0'` → false, guarded try/catch). `centersRowExpanded` computed: stored choice if not null, else `!(centerStrip().length > 6 || isNarrow())`. `toggleCentersRow()` flips and writes `'1' | '0'`. R-21: one-shot effect — when `centers().length === 1` on first load, no stored choice, and the default is collapsed → set the runtime value to expanded without storing.
- `isNarrow` signal from `matchMedia('(max-width: 899px)')` (copy the my-work-board guard); used for the collapse default and the cards branch (structural), CSS handles the rest.
- `activeFilterCount` recomputed over **five** filter dimensions: search non-empty, status ≠ all (this is `onlyPending` too), centers, projects, categories — each counts 1; `phase` (scope), `group` and `view` (view modes) never count. `clearEverything()` (new; keeps `clearFilters`/`clearAllFilters` for the popover header and the empty state) → one `router.navigate` with `search/status/center/project/category` `null` and **no** `view`/`group`/`phase` key, then resets the signals the URL→state effect does not cover. No list request results (phase unchanged).
- `kpis` unchanged; the stat bar consumes it.

### 6.2 Components

**Filter band (page template, replaces the status row + strip mount):** one `div` (`bg-[var(--pr-surface-app)] border-b border-[var(--pr-border-divider)] px-[16px] sm:px-[32px] py-[8px] flex flex-col gap-[6px]`). Row 1: label `Status` (`text-[11px] font-bold uppercase tracking-[0.05em] text-[var(--pr-text-muted)] w-[64px] shrink-0`) + **segmented control** (`role="group" aria-label="Status"`, container `inline-flex rounded-[8px] border border-[var(--pr-border)] bg-[var(--pr-surface-card)] p-[2px]`, each option `<button aria-pressed>` `h-[26px] rounded-[6px] px-[10px] text-[12.5px]`; pressed `bg-[var(--pr-color-primary-50)] text-[var(--pr-color-primary-700)] font-semibold shadow-none`, unpressed `text-[var(--pr-text-secondary)] hover:bg-[var(--pr-surface-subtle-hover)]`), same `data-testid`s as today (`bilateral-review-chip-*`) so the parent suites keep passing. Row 2: label `Centers · N` + chevron button (`aria-expanded`, `aria-controls` the strip id, lucide chevron — the toolbar's set) + the strip component with a new input `collapsed`. The band host carries `data-testid="bilateral-review-filter-band"`.

**`BilateralReviewCenterStripComponent`** gains `collapsed = input(false)`: when collapsed it renders **exactly one** summary chip and suppresses the "+N more" tail — "All centers N" pressed when `selectedCodes` is empty; the selected center with count + inline ✕ (`aria-label="Clear center"`, emits `selectCenter(null)`) when one code; "K centers ✕" (unpressed, same ✕) when several. Expanded, behavior is unchanged from BRC (12-cap + "+N more"). The container loses its own band styling (`bg`/`border-b`/padding → the page band owns them) and keeps `flex-wrap gap-[8px]`. **Count badge** (both rows, one shared class helper in `bilateral-review.copy.ts` or a tiny `chipCountClass(count, pressed)` in each component): `inline-flex min-w-[20px] justify-center rounded-full px-[6px] text-[11px] font-semibold tabular-nums leading-[18px]`; count > 0 unpressed → `bg-[var(--pr-color-primary-100)] text-[var(--pr-color-primary-800)]`; count > 0 pressed → `bg-[var(--pr-color-primary-700)] text-white`; 0 → `bg-[var(--pr-surface-subtle)] text-[var(--pr-text-secondary)]`. HITL measures ≥ 4.5:1 for all four combinations.

**Toolbar Clear filters:** the existing ghost button at `.html:216-224` is **replaced** by `<button hlmBtn variant="ghost" size="sm">` next to the Filter button, `@if (activeFilterCount() > 0)`, label `Clear filters · {{ activeFilterCount() }}`, lucide `lucideX`, `data-testid="bilateral-review-clear-all"`, `(click)="clearEverything()"`. Exactly one toolbar clear control exists after T-1.

**Stat bar (`BilateralReviewKpisComponent` rewritten in place, same inputs/outputs):** `div[role=group][aria-label="Summary"]` `flex flex-wrap items-center gap-x-[18px] gap-y-[4px] px-[32px] max-sm:px-[16px] py-[10px] text-[12.5px] text-[var(--pr-text-secondary)]`; each stat = figure `font-semibold text-[var(--pr-text-heading)] tabular-nums` + label; the pending stat is a `<button aria-pressed>` with the same pressed classes as a segmented option and `data-testid="kpi-pending-toggle"`; the decided stat keeps its sublabel muted; separators `·` via `aria-hidden`; loading = one pulse line. Keep all **six** `data-testid`s (`kpi-projects`, `kpi-centers`, `kpi-pending`, `kpi-pending-toggle`, `kpi-decided`, `kpi-decided-sublabel`) so the parent Jest invariants ("All centers count == KPI pending") keep passing. Host `data-testid="bilateral-review-statbar"`; the page's wrapper padding (`pt-[14px] pb-[16px]`, `.html:341`) is removed so the ≤ 44 px gate measures the host. Icons dropped (**execution correction, BRP-T-1:** the four 14 px `material-icons-round` glyphs and `py-[10px]` pushed the host to 46 px; `py-[8px]`/`leading-[18px]` without icons holds ≤ 44 px).

**Table (`BilateralReviewTableComponent`):** inputs unchanged except `groups: BilateralReviewGroup[]` (new shape) and `groupMode`. Header template: drop the category column; status column `min-w-[128px]`; date right-aligned. Row template: every `td` `!py-[6px]` (was 8); code cell = mono code + inline role tag (`ml-[6px] rounded-full border px-[6px] text-[10px] leading-[16px]`); title cell = `<p class="m-0 line-clamp-2 text-[13px] leading-[17px]" [title]="row.title">` + caption `<span class="mt-[2px] block text-[11px] leading-[14px] text-[var(--pr-text-secondary)] truncate">{{ category }}</span>` (secondary, not muted — contrast ≥ 4.5 measured); status `whitespace-nowrap`; TOC/Indicator: `@if (isPlaceholder(v)) { <span aria-hidden="true" class="text-[var(--pr-text-subtle)]" [title]="v">—</span><span class="sr-only">{{ v }}</span> } @else { <span class="line-clamp-2 leading-[17px]"> }`; date `formatDate(v, 'd MMM y')` via `DatePipe` `text-right tabular-nums`; row `hover:bg-[var(--pr-surface-app)] transition-colors duration-150 motion-reduce:transition-none`; Actions cell unchanged (sticky right, `border-l`). Group header: `h-[40px]` row with chevron, `label` bold 13 px, `caption` 12 px `--pr-text-secondary` (`center` list in project mode, "N projects" in center mode), right: `N results` secondary + pending badge only when M > 0 — **token-based**: `rounded-full px-[8px] text-[11px] font-semibold bg-[var(--pr-color-yellow-100)] text-[var(--pr-color-yellow-900)] border border-[var(--pr-color-yellow-300)]` (contrast measured at HITL; the row status pill keeps its pre-existing raw amber) — else "0 pending" secondary. `groupSummary` copy split into `resultsLabel(n)` / `pendingLabel(n)`.

**Group mode control (page toolbar):** second segmented `role="group" aria-label="Group by"` with `Project | Center`, rendered `@if (view() === 'grouped')` next to Grouped/All results; same visual language as the existing tablist.

**Cards (`BilateralReviewTableComponent`, narrow branch):** `@if (narrow())` (new input `narrow` fed by the page's `isNarrow`) → `ul[role=list]` of `li` cards (`rounded-[10px] border border-[var(--pr-border)] bg-[var(--pr-surface-card)] p-[12px] flex flex-col gap-[6px]`): line 1 code (mono, muted) + status pill right; line 2 title (`line-clamp-2`, 13 px, heading color); line 3 caption `category · center · TOC` (`truncate`, 11.5 px, muted, placeholders as "—"); line 4 date left + action button right. Grouped: group header bars (`sticky`-free, 36 px, same content as the table's header, a `<button aria-expanded>`) followed by the group's cards when the group's key is in the component-owned `expandedKeys` (§6.1) — the cards branch has no `app-pr-group-table`, so it reads and toggles that signal directly. Flat: cards in `sortedFlatRows` order. No `<table>` rendered in this branch; no `overflow-x`, no `overflow-y` (R-15 gate).

### 6.3 Design system

Tailwind-first; tokens only in new markup (`--pr-surface-*`, `--pr-text-*`, `--pr-border*`, `--pr-color-primary-*`, `--pr-color-yellow-*` for the warning badge); the pre-existing row status pill keeps its raw amber/emerald/red (unchanged, not new markup); 4/8 px rhythm; `transition-colors duration-150`; `motion-reduce:transition-none` on every animated class (Jest-asserted); focus ring `focus-visible:outline-none focus-visible:shadow-[var(--pr-focus-ring)]` on every new button (**execution correction, BRP-T-1:** `--pr-focus-ring` is a box-shadow triple, `colors.scss:311`; `ring-[var(--pr-focus-ring)]` feeds it to `--tw-ring-color` and paints nothing — the repo's `program-overview.scope.spec.ts:279-283` pins this); no bespoke shadows (design §7 line 249); no native `disabled` (KZ-REH-2); icons: `docs/ux-ui/design.md` §7 line 230 says `material-icons-round` / never mix — this spec's **recorded deviation** (T-4 writes it to `onecgiar-pr-client/docs/DESIGN-DEVIATIONS.md`): each region keeps the set it already uses (toolbar/band = lucide, table/stat bar = `material-icons-round`), never mixed inside one component.

### 6.4 Tests

- Page Jest: `?group=` hydration + invalid → project; `setGroup` navigates **without** a nonce bump; `groups` in both modes with a fixture of 3 centers × distinct pending + a blank center with 2 pending (must trail) + one center across two projects (caption "2 projects"); `activeFilterCount` per dimension (5 cases) plus 3 negative cases (phase, group, view do not count) and `clearEverything` → one navigate with the five keys `null` and no `view`/`group`/`phase` key, `httpMock.verify()` shows no list request; exactly one toolbar clear control; centers default rule (`> 6` / narrow / stored `'1'|'0'`) with a `sessionStorage` stub, R-21 one-shot; stat bar renders the five figures, all six `data-testid`s present, pending toggle keeps `aria-pressed`; segmented status keeps `data-testid`s and semantics (existing chip tests pass unchanged). FAIL inputs: stored `'0'` must beat the `> 6` default; `clearEverything` must not touch `view`; a mode switch must not clear `userCollapsedKeys`.
- Strip Jest: `collapsed` renders exactly one chip in each of the three selection states (empty / one / several) and never the "+N more" tail (FAIL input: 14 items collapsed); ✕ emits `null`; expanded keeps the 12-cap; badge class matrix (count > 0 / 0 × pressed / unpressed) on rendered classes.
- Table Jest: inline role tag + caption + `line-clamp-2` with `title`; placeholders → "—" with `title`/`aria-label`; date format; group header label/caption/pending badge in both modes; `narrow` → `ul[role=list]` with card count = row count and no `<table>`.
- CT (`bilateral-review.cy.ts`, narrow cases at `cy.viewport(w, 1600)` per the harness gotcha): at 1536 band + stat bar ≤ 140 px and `firstRow.top − workArea.top` ≤ 210 px (FAIL input: inject `min-height: 300px` on the band → gate fails, RED recorded); row height ≤ 64 / ≤ 44; at 840 and 375 no `<table>`, cards = rows, body `scrollWidth <= clientWidth`, `firstCard.top − workArea.top` ≤ 270 px; single-scroller gate (no descendant of `#workArea` with `overflow-y: auto|scroll` besides the table wrapper; FAIL input: `overflow-y: auto` on the cards list); chevron collapse/expand round trip with `aria-expanded`; the parent cases named in R-14 rewritten by T-1/T-3.
- HITL (Leader, Orca + owner screenshot): before/after at 1787 and 840; contrast matrix over badges, captions, placeholders and the warning badge; first row < 420 px from the viewport top; group by center on SP02 (IITA 99 / IWMI 20 / CIP 9 / …).

---

## 7. Security — unchanged. ## 8. Performance — no new requests; group switch O(n). ## 9. Observability — none.

## 10. Backwards compatibility

`?center=`, `?status=`, `?view=`, `?phase=` unchanged; `?group=` new and optional. Parent suites: status chip `data-testid`s and semantics preserved; KPI `data-testid`s preserved; the strip's band classes move to the page (its own spec updates the container assertion only); table specs updated for the removed category column, the new group shape and the date format.

---

## 11. Design Decisions

### `BRP-DD-1` — Collapse the centers row, not the status control
- **Context:** owner: "al ser tanta información manejala collapsada". The status control has 4 fixed options; the centers row is unbounded.
- **Decision:** collapse only the centers row, default by `> 6` centers or narrow, remembered per session, selection always visible.
- **Alternatives:** collapse the whole band (rejected: hides the status selection); horizontal scroll strip (rejected: hidden chips with no summary).

### `BRP-DD-2` — Stat bar instead of cards
- **Context:** four cards ≈ 93–175 px for four numbers, one of which is already on the chip and the badge.
- **Decision:** one line; same inputs/outputs so the page contract holds.
- **Alternatives:** keep cards below 1366 as a 2×2 grid (rejected: still 175 px at 840).

### `BRP-DD-3` — Drop the sticky header, keep the single scroller
- See requirements R-7 (dropped) and premises. Consistency with siblings wins over a nested scroller.

### `BRP-DD-4` — Group by center as a mode of the same grouped view
- **Context:** owner: "distribución de la información por centro" (OQ-1 assumed).
- **Decision:** generalize the group shape and key; `?group=center`; namespaced collapse memory.
- **Alternatives:** a separate "By center" tab (rejected: duplicates the toolbar/filters); nested project-within-center groups (rejected: two-level expansion, no request from the owner).

### `BRP-DD-5` — Cards below 900 px inside the table component
- **Context:** no sibling converts a table into cards; the UX guideline for wide tables on narrow screens is card layout or horizontal scroll; the parent spec chose min-widths + horizontal scroll, which at 840 pushes Actions off-screen behind a scroll.
- **Decision:** structural branch on `narrow` in the table component, same data, same toggles.
- **Reversion challenge:** what breaks if cards are removed? Nothing outside the branch — the table branch is unchanged.

---

## 12. Budget (Step 2.4)

| Number | Estimate | Basis |
|---|---|---|
| Tasks | 4 | T-1 filter band + clear + stat bar · T-2 table density + group mode · T-3 cards · T-4 CT + guide + HITL |
| Source LOC | **~850** | re-baselined against the parent's actual (+694 on a 320 estimate, ×2.17): band template 110 + page ts 130 (group, count, collapse, narrow, clear) + strip 70 + kpis 80 + table html 200 (rows, header, group header) + table ts 90 (owned expansion state, mode namespace) + cards template 120 + query-params/copy 50 = 850 |
| Test LOC | ~900 | Jest page +300, strip +90, kpis +40, table +260, CT +210 |
| Review rounds | ≤ 1 per task | owner limit; a second FAIL escalates |

LOC sized to the measured overrun pattern (KZ-REH-1, parent +117 %). Tripwire: added source > 1200 or any third attempt → stop and escalate.

---

## 13. Follow-ups

- `?phase=` cross-tab value-space collision (from `BRC`).
- Popover "Not specified" option so the trigger stops reading "1 centers".
- Reconcile the module-guide cap (120 in `COMPONENT-DOCS.md` vs 150 approved in `BRC`).
- If the owner wants a pinned header later: a page-level sticky header outside the overflow wrapper with synced column widths (own spec).
- The row status pill's raw amber/emerald/red → yellow/green/red tokens (untouched here; a `/akili-quick` once contrast is measured).
