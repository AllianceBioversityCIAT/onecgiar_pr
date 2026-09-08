# Design — Bilateral review: viewport lock, pinned filters, table color and columns

## Document Control

| Attribute | Value |
|---|---|
| **Spec path** | `docs/specs/changes/bilateral-review-viewport-and-table-polish/` |
| **Module code** | `BRV` |
| **Depth** | Standard (compact) |
| **Approval Mode** | pre-approved (owner, 2026-09-08) |
| **Status** | approved — Phase 2 gate auto-approved (pre-approved mode); judgment-day one pass, fix-only, applied 2026-09-08 (`judgment.md`, 9 severe families) |
| **Skills** | `angular-developer`, `ui-ux-pro-max`, `frontend-design`; memories `project-fixtures-real-cold-boot-shapes`, `project-hitl-looks-catch-what-diff-reviews-miss` |
| **Budget (§12)** | 3 tasks · ~650 added source LOC · ~800 test LOC · ≤ 1 Reviewer round per task with the scoped re-review protocol (FAIL → fix → scoped PASS counts as the one round); tripwire > 1000 source or any third attempt |

## 1. Summary

(1) Apply the shell's viewport lock to the page (host class + SCSS mixin, copied from `programme-results`) so `#workArea` becomes the only scroller and the band stays put — a `BRT` defect. (2) Pin toolbar + filter band with `position: sticky` inside `#workArea`. (3) Table: merge TOC + Indicator into "Alignment", compact one-line lead center hidden in center mode, status **fg/bg token pairs** (`--pr-status-*`, rule 9) shared by row pill / card pill / group badge, 3 px accent and a single-line label on group headers, primary-text "Review" for reviewable rows, no-wrap band labels.

## 2. Premises (verified 2026-09-08)

| Premise | Where | Fact |
|---|---|---|
| Lock mechanism | `src/styles/_viewport-page.scss:46-54`; `programme-results.component.scss:1-16`, `.ts:258` | `@mixin pr-viewport-page { @media (min-width: 900px) { position:absolute; inset:0; display:flex; flex-direction:column; overflow:hidden } }`; adopters add `host: { class: 'pr-viewport-page' }` and `:host { display:block; @include vp.pr-viewport-page }` in the **SCSS** (not inline `styles` — Angular emits `styleUrls` before inline styles) |
| Bilateral host | `bilateral-review.component.ts` (no `host:`, no `styleUrl`), `.html:2-3` | Root `section.min-h-screen … min-[900px]:flex-1 min-[900px]:flex min-[900px]:flex-col` + `article … min-[900px]:flex-1 min-[900px]:min-h-0`; `#workArea` `.html:20` `flex flex-1 flex-col min-[900px]:min-h-0 min-[900px]:overflow-y-auto custom_scroll` — correct children, missing parent lock |
| Band | `reporting-program-band.component.ts:362, 370, 435-474` | `frameLocked=true` + `scrollHost=workAreaEl()` already wired (`.html:11-12`); the band reads `scrollHost.scrollTop + window.scrollY` — works either way |
| Toolbar + filter band markup | `.html:22-268` toolbar (`role="search"`), filter band `[data-testid="bilateral-review-filter-band"]` right after; stat bar after; rows area `flex-1` | Both are direct children of `#workArea` → `position: sticky` works (no overflow wrapper between) |
| Table columns | `table.component.html:15-80` (row), `:100-125` (header) | 8 columns: code, title(+caption), lead center (`min-w-[90px]`, wraps), status, TOC (`line-clamp-2`), indicator (`line-clamp-2`), date, actions |
| Status tone helper | `table.component.ts:296-302` | raw `amber/emerald/red`; used by row pill and card pill; group badge already token yellow (`BRP`) |
| Tokens | `src/styles/colors.scss` | `--pr-color-{yellow,green,red}-{50,100,200,300,700,800,900}` exist |
| Label width | `.html` filter band label `w-[64px]` | "Centers · 6" wraps at 11 px uppercase |
| Existing CT | `bilateral-review.cy.ts` (31 cases; `FIXTURE_ROWS` = 7 rows, `:214-277`) | band+statbar ≤ 140, `firstRow − workArea ≤ 231`, single-scroller gate; **no positioned ancestor is needed** for the mixin — with none, `position:absolute; inset:0` resolves against the initial containing block (the viewport), which is the frame the lock wants; `cy.mount(Class)` has no wrapper hook, so `mountPage()` stays as is. The 7-row fixture cannot scroll at 1536 × 900 → the lock/pin gates need a **≥ 80-row fixture** |
| Tokens for status | `src/styles/colors.scss:236-245, 253-255`; client `CLAUDE.md` rule 9 | Fixed pairs exist: `--pr-status-not-started-{fg,bg}` (#4b5563/#f3f4f6), `--pr-status-in-progress-{fg,bg}` (#b45309/#fef3c7), `--pr-status-approved-{fg,bg}` (#047857/#d1fae5); danger `--pr-danger` #b91c1c / `--pr-danger-bg` #fef2f2. PRMS `--pr-color-*-100` are saturated mid-tones (`yellow-100 #fdc82f`, `green-100 #37de54`) — never use them as pill fills |
| Table layout | `table.component.html:4-13, 54-56` | `table-layout: auto`: `max-width`/`truncate` on a `td` is inert (the H2-1 note); truncation must live on an inner block span |
| `colspan` sites | `table.component.html:262, 309, 327` + cards group bar | four sites hard-coded to 8 |
| Band z-index | `reporting-program-band.component.html:20-24, 141, 368` | band `sticky z-20`, tooltip `z-[30]`, action overlay `z-[22]` → the pinned wrapper uses `z-[15]` |
| Action label | `table.component.ts:304-314` | `canReviewRow(row) = isPending && canReview()` keys the label/icon — the tone must key on the same predicate |
| Page footer | `app.component.html:48-65` | `app-footer` outside the shell frame → `documentElement.scrollHeight > clientHeight` on every locked page live (CT has no footer) |

## 3–5. Data / API / Server — none.

## 6. Frontend Plan

### 6.1 Viewport lock + pinned chrome (page)
- `bilateral-review.component.ts`: add `host: { class: 'pr-viewport-page' }` and `styleUrl: './bilateral-review.component.scss'`; new `bilateral-review.component.scss` = `@use '../../../../../styles/viewport-page' as vp; :host { display: block; @include vp.pr-viewport-page; }` (depth: this folder is `src/app/pages/result-framework-reporting/pages/bilateral-review/` → five `../` to `src/`, same as `programme-results`; verify by compiling — a wrong depth fails silently, memory `project-relocation-scss-use-depth`).
- `.html`: keep the root `section`/`article`; wrap toolbar + filter band in `<div class="min-[900px]:sticky min-[900px]:top-0 min-[900px]:z-[15] bg-[var(--pr-surface-app)] border-b border-[var(--pr-border-divider)]" data-testid="bilateral-review-pinned">`; the filter band's own `border-b` moves to the wrapper; the toolbar keeps `bg-[var(--pr-surface-card)]`. No `overflow` on the wrapper. `z-[15]`: above the rows' `z-10` sticky Actions cell, below the band's `z-20`/`z-[22]`/`z-[30]`. Rows area gets `scroll-margin-top: var(--brv-pinned-h, 130px)` on `tr`/cards (a CSS var the page sets from the wrapper's measured height via a `ResizeObserver`, or a fixed 130 px fallback). Remove the false "same viewport-lock contract" comment at `.html:18-19`.
- CT: `mountPage()` unchanged (no wrapper needed); add `FIXTURE_ROWS_TALL` (≥ 80 rows) for the lock/pin cases; assert the pre-condition `workArea.scrollHeight > clientHeight + 600`, then `scrollTo(0, 600)` and `scrollTop === 600`, then the pin geometry; RED probes: (1) inject `app-bilateral-review { position: static !important; overflow: visible !important }` → document scrolls; (2) drop `sticky` → `pinned.top < workArea.top`. The 1024 DETECTOR case's injection also defeats the host (R-9 (b)). Popover/multiselect panels inside the work area asserted (AC-3b).

### 6.2 Table (`BilateralReviewTableComponent`)
- Columns → 7: code · title (+caption; `th`+`td` `min-w-[280px]`) · lead center (`th`/`td` `min-w-[90px]`; inner `<span class="block truncate max-w-[150px] text-[12.5px] text-[var(--pr-text-secondary)]" [title]>`; header + cell rendered `@if (showCenterColumn())` = `!(groupMode() === 'center' && view() === 'grouped')` — the table needs the `view` input it already has; `colspan` = `columnCount()` computed at all four sites) · status · **Alignment** (`th`/`td` `min-w-[220px]`, `data-testid="bilateral-review-row-alignment"`; `@if (!isPlaceholder(toc)) <span class="block truncate max-w-[340px] text-[13px] leading-[17px]" [title]>TOC</span>`; `@if (!isPlaceholder(indicator)) <span class="block truncate max-w-[340px] text-[11px] leading-[14px] text-[var(--pr-text-secondary)]" [title]>Indicator</span>`; both placeholders → one dash triple with `sr-only` "TOC result: Not specified · Indicator: Not Applicable") · date · actions. `copy.table.headers`: replace `toc` + `indicator` by `alignment` **in column position** (key order is load-bearing for the header-order spec).
- `statusToneClass(row)` → fixed pairs: pending `bg-[var(--pr-status-in-progress-bg)] text-[var(--pr-status-in-progress-fg)]`; approved `bg-[var(--pr-status-approved-bg)] text-[var(--pr-status-approved-fg)]`; rejected `bg-[var(--pr-danger-bg)] text-[var(--pr-danger)]`; else `bg-[var(--pr-status-not-started-bg)] text-[var(--pr-status-not-started-fg)]`; all pills `border border-transparent`. The group pending badge reuses the pending branch (replacing `BRP`'s yellow-100/900/300).
- Group header `td`/cards bar: `!border-l-[3px]` + `[class]` `!border-l-[var(--pr-status-in-progress-fg)]` when `pendingCount(group) > 0` else `!border-l-[var(--pr-border)]` (the `!` out-specifies `pr-table.component.scss` `::ng-deep tbody td`); padding-left compensates 3 px. The header label becomes `<span class="block truncate" [title]>` inside a `min-w-0 flex-1` container so the row never wraps; the center chip and the right-hand summary are `shrink-0`; header ≤ 40 px measured.
- Action button: `[class]` adds `text-[var(--pr-color-primary-700)] font-semibold` when `canReviewRow(row)` (same predicate as the label; no background tint — UI rule 7); cards identical.
- Cards caption unchanged (`category · center · TOC`).

### 6.3 Band label
- Filter band row labels (both): `min-w-[84px] shrink-0 whitespace-nowrap`.

### 6.4 Design system
Tokens only; no new icons; focus rings unchanged; `motion-reduce` unchanged; accent + badge + pill always accompanied by text.

### 6.5 Tests
- Jest page: host class present (discoverability only — labeled as such, not lock coverage); pinned wrapper holds `[role="search"]` + the filter band, carries the sticky/`z-[15]` classes and **no** `overflow-*` class (FAIL input: add `overflow-y-auto`); rows carry `scroll-margin-top`; both labels carry `min-w-[84px] shrink-0 whitespace-nowrap`.
- Jest table: Alignment four cases (both / TOC only / Indicator only / both placeholders) by `data-testid`; center column hidden only for `groupMode='center' && view='grouped'` (headers 6) and present in flat view (7); all four `colspan` sites equal the header count in both modes; token-pair classes per status, fg and bg from the same pair, and absence of `amber|emerald|red-` in the component's rendered HTML (FAIL input: leave one raw class); accent class per pending on header + cards bar; action tone on `canReviewRow` (member pending → primary; non-member pending → neutral); header-order spec split project/center; inner-span `truncate` on center and alignment (Disqualifier: truncation asserted on the `td`).
- CT: with `FIXTURE_ROWS_TALL`: 1536 host `position: absolute`, `documentElement.scrollHeight <= clientHeight`, work area `scrollHeight > clientHeight + 600`; `scrollTo(0,600)` → `scrollTop === 600`, `pinned.top === workArea.top ± 1`, `filterBand.bottom === pinned.bottom ± 1`, `statbar.top < pinned.bottom`, `window.scrollY === 0`, pinned ≤ 130; RED probes (host-static injection; drop `sticky`) recorded and reverted; 1024 DETECTOR injection extended to the host; popover/multiselect panels inside the work area; 840: host static/`display:block`, wrapper not sticky, cards = rows; labels height ≤ 18 and `scrollWidth <= clientWidth` (counts 6 and 12); group header ≤ 40 with a long name, `border-left-width` 3px + colour; row caps one-line ≤ 50 (≤ 44 without caption) / two-line ≤ 64; `BRP-AC-7` re-run; center `span.scrollWidth > clientWidth` on a long acronym.
- HITL (Orca or owner screenshot): before/after visible-row count at 1787; pills read as tints; contrast matrix (four pairs, accent, primary action); Tab to an off-screen row lands below the pinned chrome; band CTA tooltip not occluded by the wrapper.

## 7–10. Security / Performance / Observability / Compat — unchanged; `?group=` and all keys unchanged; `copy.headers.toc/indicator` removed (only the table reads them).

## 11. Design Decisions

### `BRV-DD-1` — Fix the lock at the host, do not fake it with `sticky`
Owner asked "like the other tabs": the mechanism is the shared mixin; pinning the band with sticky alone would keep the document scrolling and diverge from `SAV-DD-1`.

### `BRV-DD-2` — Pin toolbar + filter band (≤ 130 px), not the stat bar
Owner named hero and filters; the stat bar is a summary, and pinning it costs 42 px of rows on every scroll position. The pinned chrome is capped (AC-2) and the divergence from the sibling tabs (they pin only the band) is recorded in `DESIGN-DEVIATIONS.md` (T-3) with a follow-up to align or accept.

### `BRV-DD-3` — Merge TOC + Indicator instead of hiding empty columns
Hidden columns move on every filter (layout jumps); a merged two-line column is stable and gives titles the width.

### `BRV-DD-4` — The design system's fixed status pairs for every status surface
Row pill, card pill and group badge share `statusToneClass` on `--pr-status-*` / `--pr-danger*` pairs (rule 9); the `BRP` group badge's `yellow-100/900/300` is replaced because PRMS `-100` shades are saturated. The toolbar match-count badge and the drawer keep raw classes (follow-up).

### `BRV-DD-5` — Primary text, no violet fill, on the reviewable action
UI rule 7 reserves violet fills for the band, brand chips and the primary button; the row action gets `text-primary-700 font-semibold` only, keyed on `canReviewRow` so non-members never see an emphasised "See".

## 12. Budget

| Number | Estimate | Basis |
|---|---|---|
| Tasks | 3 | T-1 lock + pinned chrome (+ CT) · T-2 table pairs/columns/accent/label · T-3 CT rest + guide + deviation + HITL |
| Source LOC | ~650 | scss 12 + page ts 30 (pinned var, view input) + page html 50 + table html 220 (7 columns × row/header/loading/cards, 4 colspans) + table ts 90 + copy 15 + tall CT fixture 120 + guide … ×1.25 (parent ratio) |
| Test LOC | ~800 | Jest page +120, table +300, CT +380 (tall fixture, 2 RED probes, popover, labels, header, row caps) |
| Review rounds | ≤ 1 per task, scoped re-review protocol (FAIL → fix → scoped PASS = one round) |

Tripwire: added source > 1000 or any third attempt.

## 13. Follow-ups
- Sticky table header (still blocked by the horizontal wrapper; needs a page-level header with synced widths).
- Stat bar pinning if the owner wants it (OQ-1).
- Align sibling tabs to pinned chrome, or accept the split (deviation recorded by T-3).
- Toolbar match-count badge + drawer raw palette → `/akili-quick`.
