# Requirements — Bilateral review: viewport lock, pinned filters, table color and columns

## Document Control

| Attribute | Value |
|---|---|
| **Spec path** | `docs/specs/changes/bilateral-review-viewport-and-table-polish/` |
| **Module code** | `BRV` |
| **Type** | Change (follow-up to `changes/bilateral-review-ux-polish`, closed 2026-09-08 at `4db13d572`) |
| **Depth** | Standard (compact) |
| **Approval Mode** | pre-approved (owner, 2026-09-08 — "mejoró pero siento que aún le falta a la tabla … colores … el hero y los filtros no deberían moverse, mira otra tab") |
| **Intent source** | Owner message + screenshot 2026-09-08 (`after-polish-1.png`, Bioversity program, 81 results) |
| **Status** | approved — Phase 1 gate auto-approved (pre-approved mode); judgment-day one pass, fix-only, applied 2026-09-08 (`judgment.md`) |
| **Date** | 2026-09-08 |
| **Depends on** | `changes/bilateral-review-ux-polish` (done) |
| **Parallel-safe** | yes (edits only `pages/bilateral-review/**`) |

---

## 1. Module / Feature

- **Module:** `result-framework-reporting` (client only) — page `pages/bilateral-review/`
- **Sub-feature:** viewport lock (defect) · pinned toolbar + filter band · table color, columns and emphasis
- **Owner:** PRMS product owner

---

## 2. Executive Summary

Verified in code and on the owner's screenshot (2026-09-08):

| Fact | Where | Consequence |
|---|---|---|
| **Bilateral review never engages the viewport lock.** Sibling tabs declare `host: { class: 'pr-viewport-page' }` and include `vp.pr-viewport-page` in their SCSS (`programme-results.component.ts:258`, `.scss:15`; `my-work-board.component.ts:249`, `.scss:10`; `dashboard-lab.component.scss:23`). `bilateral-review.component.ts` has **no `host:` metadata and no SCSS file**; its root `<section class="min-h-screen … min-[900px]:flex …">` sits in normal flow | `bilateral-review.component.{ts,html:2}`; `src/styles/_viewport-page.scss:46-54` (`position:absolute; inset:0; display:flex; flex-direction:column; overflow:hidden` at ≥ 900) | The document scrolls; the band (`frameLocked`, `scrollHost=workAreaEl`) and the toolbar/filter band scroll out of view — the owner's screenshot shows the filter band at the top edge with no hero. `#workArea`'s `min-[900px]:overflow-y-auto` is inert because the host never constrains its height. The parent spec's comment "same viewport-lock contract as the siblings" (`.html:18-19`) was false, and the R-15 CT gate ("no *second* scroller") could not see that the *first* scroller was the document |
| Siblings pin only the band; toolbar and filters scroll with the rows | `programme-results.component.html:39-44` comment; `my-work-board.component.html:61-63` | Owner asks for **hero and filters** pinned — this spec pins toolbar + filter band inside `#workArea` (a `position: sticky` chrome inside the scroller, no nested scroller) |
| TOC result + Indicator columns are ≈ 800 px of "—" on this program | screenshot; `table.component.html:41-66` | Merge into one two-line "Alignment" column; give the width to the title |
| Lead center "Bioversity (Alliance)" wraps to two lines in every row → rows 64 px even with one-line titles | screenshot; `table.component.html:37` (`min-w-[90px]`, wrapping) | One-line compact cell with `title`; hidden when grouped by center |
| Color carries no meaning beyond the status pill | screenshot | Token-based status scale (yellow/green/red families), group-header accent, primary-tone action on pending rows |
| Status pills use raw Tailwind `amber/emerald/red` | `table.component.ts:297-302` | Move to `--pr-color-yellow/green/red-*` tokens (contrast measured); one scale for row pill, card pill, group badge |
| "CENTERS · 6" label wraps to two lines | screenshot; filter band label `w-[64px]` | `whitespace-nowrap`, label width 84 px |

---

## 3. Glossary

| Term | Meaning |
|---|---|
| **Viewport lock** | `pr-viewport-page`: at ≥ 900 px the page host is absolutely positioned to the shell frame with `overflow: hidden`, so the work area is the only scroller (`SAV-DD-1`) |
| **Pinned chrome** | Toolbar + filter band kept at the top of `#workArea` while rows scroll (`position: sticky` inside the scroller) |
| **Alignment column** | TOC result (line 1) + Indicator (line 2) in one column |

---

## 4. In Scope / Out of Scope

**In scope:** viewport lock for the page; pinned toolbar + filter band; Alignment column; compact lead center; token status scale; group-header accent; action emphasis; label nowrap; CT gates; guide update.
**Out of scope:** band internals; drawer; server; stat bar pinning (it scrolls with rows); column resizing; sticky table header (still defeated by the horizontal wrapper — unchanged decision `BRP-DD-3`).

---

## 5. Personas

| Persona | Change |
|---|---|
| Program lead / reviewer | Hero and filters stay put while scanning 80+ rows; status and pending density readable by color and text; less empty column space |

---

## 6. User Stories

- **`BRV-US-1`** As a reviewer, I want the hero and the filters to stay where they are while I scroll the queue, like the other tabs' hero, so that I never lose the context or the controls. *(Refines US-Q1; fixes a `BRT` defect)*
- **`BRV-US-2`** As a reviewer, I want status, pending density and the primary action to read at a glance by color and text, so that the queue is scannable. *(Refines BRP-US-3)*
- **`BRV-US-3`** As a reviewer, I want the table to spend its width on titles rather than on empty alignment columns. *(Refines BRP-US-3)*

---

## 7. Functional Requirements

### Required (MUST)

- **`BRV-R-1` Viewport lock.** The page MUST declare `host: { class: 'pr-viewport-page' }` (discoverability only — the mixin sits on bare `:host`, as in `programme-results`) and a component SCSS `:host { display: block; @include vp.pr-viewport-page; }`. At ≥ 900 px effective width the host computes `position: absolute` and the work area (`#workArea`, the `.custom_scroll` that contains the rows) is the only vertical scroller: with ≥ 80 rows `workArea.scrollHeight > clientHeight` and `window.scrollY` stays 0 while it scrolls. (`documentElement.scrollHeight <= clientHeight` holds only in CT — on the real page `app-footer` sits outside the shell frame, as on every locked tab.) Below 900 px only the host's `display` changes (`inline` → `block`); the mixin emits nothing (`SAV-R-8`), the document scrolls and the cards branch is unchanged (measured, AC-3).
- **`BRV-R-2` Pinned chrome.** Inside the work area, the toolbar and the filter band MUST sit in one wrapper (`data-testid="bilateral-review-pinned"`) with `min-[900px]:sticky min-[900px]:top-0 min-[900px]:z-[15]` (above the rows' `z-10` sticky Actions cell, below the band's `z-20` and its `z-[22]`/`z-[30]` overlays), opaque backgrounds, one bottom divider, **no `overflow`**. After scrolling the work area by 600 px: `wrapper.top === workArea.top ± 1` and `filterBand.bottom === wrapper.bottom ± 1`; the stat bar and rows scroll beneath (`statbar.top < wrapper.bottom`). The pinned wrapper MUST measure ≤ 130 px at 1536 with the centers row collapsed. Rows MUST carry `scroll-margin-top` equal to the pinned height (CSS var set from the wrapper) so a keyboard-focused row is never hidden under the chrome (WCAG 2.4.11). The filter popover and the multiselect panels MUST stay fully visible inside the now-clipping work area at 1536 (`panel.bottom <= workArea.bottom`). Below 900 px the wrapper is not sticky. Divergence from the sibling tabs (they pin only the band) is recorded in `DESIGN-DEVIATIONS.md` (T-3).
- **`BRV-R-3` Alignment column.** TOC result and Indicator MUST merge into one column "Alignment" (`data-testid="bilateral-review-row-alignment"`): line 1 = TOC result (13 px / 17 px leading), line 2 = Indicator (11 px / 14 px, `--pr-text-secondary`); **each line renders only when its value is not a placeholder** (one present → one line; both present → two lines; both placeholders → exactly one `aria-hidden` "—" + one `sr-only` text naming both originals). Truncation lives on inner `<span class="block truncate max-w-[340px]" [title]>` elements — never on the `td` (`max-width` on a cell is inert under `table-layout: auto`); the `th` **and** `td` carry only `min-w-[220px]`; the title `th` and `td` gain `min-w-[280px]`. Cards' caption keeps `category · center · TOC`.
- **`BRV-R-4` Compact lead center.** The lead center cell (`data-testid="bilateral-review-row-center"`) MUST render on one line via an inner `<span class="block truncate max-w-[150px]" [title]>` (12.5 px `--pr-text-secondary`; the `td`/`th` keep `min-w-[90px]` only) and MUST be hidden (header + cell) **only when `groupMode === 'center' && view === 'grouped'`** — in the flat view the column stays. Every `colspan` (group header `td`, grouped loading row, flat loading row, cards group bar) MUST equal the rendered column count (7 / 6).
- **`BRV-R-5` Status token pairs.** Status tones MUST use the design system's **fixed fg/bg pairs** (client hard rule 9 — never recombine, never invent): pending `bg-[var(--pr-status-in-progress-bg)] text-[var(--pr-status-in-progress-fg)]`, approved `--pr-status-approved-{bg,fg}`, rejected `bg-[var(--pr-danger-bg)] text-[var(--pr-danger)]`, other `--pr-status-not-started-{bg,fg}`; pills keep `border border-transparent` for sizing. One helper drives the row pill, the card pill **and the group-header pending badge** (the `BRP` badge's `--pr-color-yellow-100/900/300` is replaced — PRMS's `-100` shades are saturated mid-tones, not tints). Scope of the raw-palette ban: `bilateral-review-table.component.{ts,html}` status/tone surfaces only (the toolbar match-count badge and the drawer keep their raw classes — follow-up §13). Every pill keeps its text. Contrast measured at HITL (pairs are pre-audited ≥ 4.5).
- **`BRV-R-6` Group-header accent and single-line label.** Group headers MUST carry a 3 px left accent (`!border-l-[3px]`, colour `--pr-status-in-progress-fg` when the group has pending rows, `--pr-border` otherwise; computed `border-left-width === '3px'`), and the header **label MUST stay on one line** (`truncate` with `title` on an inner span; the center chip and the right-hand summary never wrap) — the live page measured **61 px** headers on long project names at 1549 px. Header height MUST be ≤ 40 px after the fix (measured, both modes). Cards' group bars carry the same accent.
- **`BRV-R-7` Action emphasis.** When `canReviewRow(row)` is true (pending **and** the user may review) the action button "Review" MUST use the primary text tone (`text-[var(--pr-color-primary-700)] font-semibold`, icon included, **no** background tint — UI rule 7 keeps violet fills out of the content area); "See" (non-pending, or pending for a non-member) keeps the neutral ghost. Same on cards.
- **`BRV-R-8` Band labels.** Both filter band row labels MUST use `min-w-[84px] shrink-0 whitespace-nowrap` (not a fixed width) so they stay aligned and never wrap nor overflow: label `scrollWidth <= clientWidth` and height ≤ 18 px at ≥ 900 px, including two-digit counts ("Centers · 12").
- **`BRV-R-9` No regression.** Suites of `sp-bilateral-review-tab`, `bilateral-review-center-strip-and-phase` and `bilateral-review-ux-polish` MUST keep passing except, each rewritten by the task that breaks it: (a) table specs for the merged column, the token classes, the header-order assertion (`copy.table.headers` key order is load-bearing — insert `alignment` in column position; the case becomes project 7 / center 6) (T-2); (b) the 1024 "DETECTOR FIRES" CT case — its injection must also defeat the locked host (`app-bilateral-review { position: static !important; overflow: visible !important }`) or the host absorbs the overflow (T-1); (c) the `BRP-AC-7` band gate re-measured with the wrapper (T-1); (d) the one-line row-height gate re-based (T-2, R-11). The single-scroller gate keeps its exclusion list verbatim and adds the host `position: absolute` check.
- **`BRV-R-10` One scroller.** After R-1/R-2, at ≥ 900 the existing `BRP` single-scroller gate (same exclusion list: `.pr-table-wrap` subtree, the table's own `overflow-x-auto` wrapper, zero-size elements) MUST still pass, extended with: host computed `position: absolute`, and `window.scrollY === 0` after scrolling the work area.
- **`BRV-R-11` Row heights re-based.** After R-3 a one-line title **with** caption measures ≈ 49 px live and a two-line title ≤ 63; the CT caps become one-line ≤ 50 (≤ 44 when the row has no caption), two-line ≤ 64 — measured, recorded.

### Should (SHOULD)

- **`BRV-R-20`** The pinned wrapper SHOULD cast a 1 px divider only (no shadow) so it reads as chrome, not as a floating card.

---

## 8. Non-Functional Requirements

| Dimension | Target |
|---|---|
| Performance | No new requests; `position: sticky` only |
| Accessibility | Color never the only carrier (pills keep text; accent bar accompanies the pending badge); contrast ≥ 4.5:1 on every new text, measured; focus rings `shadow-[var(--pr-focus-ring)]` on any new button |
| Responsive | ≥ 900: lock + pinned chrome; < 900: unchanged document scroll and cards |
| Design tokens | Only `var(--pr-*)` in new/changed markup; the raw `amber/emerald/red` status classes are **removed** by R-5 |
| Icons | Unchanged (no new icons); the nearest-sibling rule of `BRP` design §6.3 |

---

## 9. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `BRV-AC-1` | 1536 CSS px (CT), **≥ 80-row fixture** | Page loads | Host computed `position: absolute`; `documentElement.scrollHeight <= clientHeight` (CT only); work area `scrollHeight > clientHeight + 600` (pre-condition asserted first); FAIL input: inject `app-bilateral-review { position: static !important; overflow: visible !important }` → the document scrolls and the gate fails (RED recorded) |
| `BRV-AC-2` | 1536, ≥ 80 rows, work area scrolled by 600 (`scrollTop === 600` asserted) | Measure | `pinned.top === workArea.top ± 1`; `filterBand.bottom === pinned.bottom ± 1`; `statbar.top < pinned.bottom`; `window.scrollY === 0`; pinned height ≤ 130; FAIL input: drop the `sticky` class → `pinned.top < workArea.top` (RED recorded). (Band hero top unchanged is documentation — it is a sibling above the work area and cannot move.) |
| `BRV-AC-3` | 840 (`cy.viewport(840, 1600)`) | Page loads | Host `position` ∈ {static, relative} and `display: block`; wrapper computed `position !== 'sticky'`; cards present, count = rows; body `scrollWidth <= clientWidth` |
| `BRV-AC-3b` | 1536, Filter popover open, each multiselect opened in turn | Measure | Every panel's `bottom <= workArea.bottom` and `right <= workArea.right` (the work area now clips) |
| `BRV-AC-4` | Row with TOC "HLO1.AOW1.IO1 Steer to impact" and Indicator "Number of people trained…" | Row renders | One `[data-testid="bilateral-review-row-alignment"]` cell: line 1 TOC (inner span `truncate` + `title`), line 2 Indicator 11 px secondary; headers = 7 in project mode; row ≤ 64 px |
| `BRV-AC-4b` | TOC present, Indicator "Not Applicable" (and the reverse) | Row renders | Exactly one line rendered (the present value), no dash |
| `BRV-AC-5` | Row with TOC "Not specified" and Indicator "Not Applicable" | Row renders | Exactly one "—" (`aria-hidden`) + one `sr-only` text listing both originals |
| `BRV-AC-6` | Lead center "Bioversity (Alliance)" in a 150 px cell | Row renders | Inner span `truncate` with `title="Bioversity (Alliance)"`, `span.scrollWidth > span.clientWidth` (truly truncated) and the cell height equals a one-line row |
| `BRV-AC-7` | `?group=center`, grouped view | Table renders | No lead-center header or cell (6 headers); every `colspan` = 6 (group header, grouped loading, flat loading template) |
| `BRV-AC-7b` | `?group=center`, **flat** view | Table renders | Lead-center column present (7 headers), `colspan` = 7 |
| `BRV-AC-8` | Rows pending / approved / rejected / other | Pills render | Classes contain `--pr-status-in-progress-*` / `--pr-status-approved-*` / `--pr-danger*` / `--pr-status-not-started-*`; **no** `amber`, `emerald` or `red-` raw classes in `bilateral-review-table.component.{ts,html}` rendered output (FAIL input: leave one raw class); measured contrast ≥ 4.5 for each; HITL: pills read as tints, not fills |
| `BRV-AC-9` | Group with 25 pending and group with 0 pending, long project name | Headers render | Computed `border-left-width === '3px'` on both; colour = `--pr-status-in-progress-fg` vs `--pr-border` (resolved); label on one line (`truncate` + `title`); header height ≤ 40 px in both modes |
| `BRV-AC-10` | Pending row (member), approved row, pending row (non-member) | Action buttons | "Review" (member) has `text-[var(--pr-color-primary-700)]` and no bg class; both "See" buttons are neutral |
| `BRV-AC-11` | Filter band at 1536, counts 6 and 12 | Renders | Both labels: height ≤ 18 and `scrollWidth <= clientWidth`; the two labels share the same left edge for the controls |
| `BRV-AC-12` | Parent suites | Jest + CT | Green with only the R-9 (a)–(d) assertions updated |
| `BRV-AC-13` | 1787 live (owner's screen) | Before/after | Visible data rows within the first screen ≥ the "after-polish-1" count; pinned chrome ≤ 130 px |

### Key scenarios

#### Scenario: Scroll the queue (BRV-R-1, R-2)
- GIVEN Bilateral review at 1536 px with 80 rows
- WHEN the reviewer scrolls down 600 px
- THEN the search/filter toolbar and the status/centers band are still at the top of the work area and the rows have moved under them (the hero, a sibling above the work area, cannot move)
- AND the document itself has not scrolled (`window.scrollY === 0`)
- BUT it must NOT introduce a second vertical scroller nor change behavior below 900 px
- AND IT MUST behave like the sibling tabs' band lock (`SAV-DD-1`).

#### Scenario: Scan by color (BRV-R-5, R-6, R-7)
- GIVEN a program with mostly pending rows
- WHEN the table renders
- THEN pending pills are yellow-tone, group headers with pending rows carry the yellow accent, and "Review" reads in the primary tone
- AND every color has a text counterpart
- BUT it must NOT use raw Tailwind palette classes.

---

## 10. Defect classes and gates

| Defect class | Gate |
|---|---|
| Document scrolls at ≥ 900 | CT 1536 with the ≥ 80-row fixture: host `position: absolute`, work area `scrollHeight > clientHeight + 600`, `window.scrollY === 0` after scrolling; FAIL input: inject `app-bilateral-review { position: static !important; overflow: visible !important }` → gate fails (RED recorded). Removing the host class is **not** a valid probe (the mixin is on bare `:host`) |
| Chrome not pinned | CT 1536: `scrollTop === 600` asserted, then `pinned.top === workArea.top ± 1`, `filterBand.bottom === pinned.bottom ± 1`; FAIL input: drop `sticky` → fails (RED recorded) |
| Popover clipped by the new scroller | CT 1536: open popover + each multiselect → panel inside the work area |
| Focus hidden under pinned chrome | Jest: rows carry the `scroll-margin-top` class/var; HITL: Tab to an off-screen row → row top ≥ pinned bottom |
| Second scroller | existing R-15 gate (BRP) + host assertion |
| Merged column arithmetic | Jest: both present (2 lines) / TOC only / Indicator only (1 line, no dash) / both placeholders (one "—" + one `sr-only`) — selected by `data-testid`, not `nth-child` |
| Truncation on the cell instead of the span | Jest: inner span carries `truncate`; CT: `span.scrollWidth > clientWidth` on a long acronym |
| `colspan` drift | Jest: all four sites equal the header count in both modes |
| Token pair regression | Jest: no `amber\|emerald\|red-` in the table component's rendered classes; pairs never recombined (fg and bg from the same status); HITL contrast + "tint not fill" |
| Accent / header wrap | Jest: rendered class per pending>0 / 0; CT computed `border-left-width` = 3px and colour; header height ≤ 40 with a long name |
| Label wrap/overflow | CT: label height ≤ 18 and `scrollWidth <= clientWidth` at 1536 with counts 6 and 12 |

---

## 11. Open Questions

- `BRV-OQ-1` Should the stat bar also pin? **Assumed no** (saves 42 px of rows; owner named hero and filters).
- `BRV-OQ-2` Hide TOC/Indicator when the whole list is empty? **Assumed no** — merge instead (the column stays discoverable).

## 12. Follow-ups (recorded, not scope)

- Toolbar match-count badge and the review drawer keep raw `amber/slate/violet` classes → `/akili-quick` token pass.
- Sibling tabs pin only the band; align them to pinned chrome or accept the split (deviation recorded by T-3).
- Stat bar pinning (OQ-1).

---

## Required cross-references

- `docs/ux-ui/design.md` §7 tokens, §10 · `src/styles/_viewport-page.scss` (`SAV-DD-1`, `SAV-R-8`) · parent specs `sp-bilateral-review-tab` (`BRT-DD-1`), `bilateral-review-ux-polish` (`BRP-DD-3`, `BRP-R-15`, design §6.3).
