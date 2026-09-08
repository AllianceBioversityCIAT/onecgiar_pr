# Requirements — Bilateral review: UX/UI polish (filter band, KPIs, table)

## Document Control

| Attribute | Value |
|---|---|
| **Spec path** | `docs/specs/changes/bilateral-review-ux-polish/` |
| **Module code** | `BRP` |
| **Type** | Change (follow-up to `changes/bilateral-review-center-strip-and-phase`, closed 2026-09-07 at `bf48eeff9`) |
| **Depth** | Standard (compact) |
| **Approval Mode** | pre-approved (owner, 2026-09-07 — "continue, vamos avanzando pero por favor no descuides el diseño…") |
| **Intent source** | Owner messages 2026-09-07 20:40–20:55 (no `proposal.md`): manage the dense per-center information collapsed; colors; UX/UI and responsive; distribution of information per center; vertical-scroll consistency with the other tabs ("es una web application"); clear filters; "hay que trabajarle mucho a la tabla en cuanto a UX/UI"; owner screenshot of SP02 at 1787 CSS px (scratchpad `before-1787.png`) |
| **Status** | approved — Phase 1 gate auto-approved (pre-approved mode); judgment-day one pass, fix-only, applied 2026-09-07 (`judgment.md`) |
| **Date** | 2026-09-07 |
| **Depends on** | `changes/bilateral-review-center-strip-and-phase` (done) |
| **Parallel-safe** | yes (edits only `pages/bilateral-review/**`; no band, no drawer, no server) |

---

## 1. Module / Feature

- **Module:** `result-framework-reporting` (client only) — page `pages/bilateral-review/`
- **Sub-feature:** filter band consolidation and collapse · compact KPIs · table density, group-by-center, narrow-viewport cards · clear-filters affordance
- **Owner:** PRMS product owner

---

## 2. Executive Summary

Measured on the real page (SP02, P = 34, 2026-09-07, Orca browser + owner screenshot):

| Fact | 1787 CSS px | 840 CSS px |
|---|---|---|
| Chrome above the first row (toolbar + status chips + center strip + KPI cards) | 494 px of a 1130 px viewport (44 %) | 707 px of 1080 (65 %) |
| Toolbar / status row / center strip / KPI strip heights | 50 / 50 / 49 / 93 | 100 / 49 / 85 / 175 |
| Table row height | **71 px** (title wraps 2–4 lines at 18 px line-height + a "Contributor" pill under it) | — |
| "Indicator category" column | 119 px wide → 3-line wraps ("Capacity sharing for development") | — |
| Status pill | wraps to two lines ("Pending / Review") in a 107 px column | — |
| Placeholders | "Not Applicable" / "Not specified" rendered as full text in TOC result and Indicator columns | — |
| Table header | 11 px uppercase, not sticky — and neither is any sibling's (Programme results' `pgr-sticky-head` is the right-sticky Actions spacer) | — |
| Row affordances | no hover, no zebra; Actions column sticky right | — |
| Duplicated numbers | Pending 131 shown three times: tab badge, status chip, KPI card — the stat bar keeps the KPI figure because it is the Pending toggle (`BRT-R-6`), so the duplication is accepted, not removed | — |
| Vertical scroll model | `#workArea` is the only scroller ≥ 900 px on all four tabs (`SAV-DD-1`) — **already consistent**; the difference is chrome height, not the scroll contract | — |
| Clear filters | exists twice with different scopes: a **toolbar** ghost button at `bilateral-review.component.html:216-224` (gated on `filtersActive()` = centers/projects/categories only, calls `clearFilters()`), the popover header at `:113`, and the filtered-empty state at `:377` (`clearAllFilters()` = search + status + the three lists). Neither shows a count, neither clears everything from the toolbar | — |
| Chip count numerals | `--pr-text-subtle` on both chip rows, contrast 2.77 / 3.04 (inherited gap) | — |

Premises verified in code (KZ-MWB-1): see `design.md` §2 (scout facts with file:line).

---

## 3. Glossary

| Term | Meaning |
|---|---|
| **Filter band** | The single region under the toolbar holding the status control and the centers row |
| **Centers row** | The per-center chip strip from `BRC` (`BilateralReviewCenterStripComponent`) |
| **Stat bar** | The compact one-line replacement of the four KPI cards |
| **Group mode** | How rows are grouped in the grouped view: by bilateral project (today) or by lead center |
| **Narrow** | Effective CSS width < 900 px (root zoom already applied) |

---

## 4. In Scope / Out of Scope

**In scope:** filter band (status segmented control + collapsible centers row with tonal count badges); "Clear filters" in the toolbar with an active-filter count; compact stat bar replacing the KPI cards; table: row density, muted placeholders, single-line status pill, indicator category as a caption under the title, role tag inline, hover row, group header restyle, group mode Project | Center with `?group=`, card layout below 900 px; CT + Jest + HITL; guide update.
**Out of scope:** server; the band/hero; the review drawer; the Results/My results tabs; the `?phase=` cross-tab collision (recorded follow-up); column resizing/reordering; pagination/virtualization.

---

## 5. Personas

| Persona | Change |
|---|---|
| Program lead / reviewer | Sees the queue within the first screen, scans centers collapsed or expanded, groups the queue by center to distribute review work, clears every filter with one click |
| Center submitter | Same page, less chrome; the table stays readable on a laptop at 840 px |

---

## 6. User Stories

- **`BRP-US-1`** As a reviewer, I want the filters and numbers above the table to take one compact band, so that the queue starts within the first screen. *(Refines US-Q1)*
- **`BRP-US-2`** As a reviewer, I want the per-center information collapsed by default with the selection still visible, so that the page is not a wall of chips when a program has many centers. *(Refines BRC-US-1)*
- **`BRP-US-3`** As a reviewer, I want the table rows short, aligned and scannable, so that I can review dozens of results without losing the column meaning. *(Refines US-Q1)*
- **`BRP-US-4`** As a program lead, I want to group the queue by lead center, so that I can distribute review work per center. *(Refines BRC-US-1)*
- **`BRP-US-5`** As any user, I want one "Clear filters" control in the toolbar that shows how many filters are active, so that I can reset the view without opening the popover. *(Refines US-Q1)*

---

## 7. Functional Requirements

### Required (MUST)

- **`BRP-R-1` Filter band.** The status chips and the centers row MUST render inside one band under the toolbar, with a leading label per row ("Status", "Centers · N") in the muted label style, sharing one bottom divider (no divider between the two rows).
- **`BRP-R-2` Status control.** The four status options MUST render as a **segmented control** (one `role="group"`, `<button aria-pressed>` per option, joined visually, mutually exclusive) with the count as a tonal badge: primary tint when the count > 0, neutral when 0. Semantics unchanged (`?status=`, `onlyPending` parity).
- **`BRP-R-3` Collapsible centers row.** The centers row MUST be collapsible via a chevron button (`aria-expanded`, accessible name "Show centers"/"Hide centers"). **Default collapsed** when the program has more than 6 centers **or** the viewport is narrow; expanded otherwise. The collapsed row MUST still show: the label "Centers · N" and exactly one summary chip — "All centers N" (pressed) when no center is selected, the selected center with its count and a clear "✕" when one is selected, or "K centers ✕" when the popover holds several (✕ clears the Center filter). Collapsed, the "+N more" tail is suppressed; expanded, the row keeps the `maxVisible`/"+N more" behavior of `BRC-R-21`. The expanded/collapsed choice MUST be remembered per session (`sessionStorage`, key `pr.bilateral.centersExpanded`, value `'1' | '0'`, the app convention).
- **`BRP-R-4` Tonal count badges.** Every chip count on both rows MUST render as a rounded badge with ≥ 4.5:1 contrast: pending > 0 → primary tint (`--pr-color-primary-100` on `--pr-color-primary-800` or the design §7 equivalent), 0 → neutral (`--pr-surface-app` on `--pr-text-secondary`). Pressed chips keep their pressed look; the badge inverts to stay ≥ 4.5:1.
- **`BRP-R-5` Clear filters in the toolbar.** The existing toolbar clear button (`bilateral-review.component.html:216-224`) MUST be **replaced** (never duplicated) by a "Clear filters · N" ghost button rendered next to the Filter button **only when** N > 0, where N counts the active **filter** dimensions: search non-empty, status ≠ all, centers, projects, categories (**five** — `onlyPending` is the status dimension; `?phase=` is a scope and `?group=`/`?view=` are view modes, none of them filters). One click resets the five in one `router.navigate` (`replaceUrl`, `queryParamsHandling: 'merge'`, the five keys set to `null`) and leaves `view`, `group` and `phase` untouched, so no list request fires. The popover header clear and the empty-state clear stay.
- **`BRP-R-6` Stat bar.** The four KPI cards MUST be replaced by one compact stat bar (one line ≥ 900 px, two lines below): "18 bilateral projects · 7 contributing centers · **131 pending review** · 10 decided (10 approved · 0 rejected)". The pending stat keeps its toggle semantics (`aria-pressed`, equivalent to the Pending chip). Height ≤ 44 px at ≥ 900 px.
- **`BRP-R-7` Sticky table header — DROPPED at premise check (2026-09-07).** Verified in code: no sibling tab pins its header vertically (Programme results' `pgr-sticky-head` is the *right*-sticky Actions spacer, `programme-results.component.ts:648-656`); the only sticky-head rule in `pr-table.component.scss:8-16` requires a nested `overflow-y:auto` wrapper, which would add a second scroll container and break the `#workArea` single-scroller contract (`SAV-DD-1`, R-15); and the table's `overflow-x:auto` wrapper (needed between 900 and ~1440 px) defeats `position: sticky; top` on `thead th`. Substitute: the chrome reduction (R-1..R-6) keeps the header on screen longer, and Collapse all remains.
- **`BRP-R-8` Row density.** Row height at the default font scale MUST be ≤ **44 px** for a one-line title and ≤ **64 px** for a two-line title with caption (arithmetic: title 13 px at `leading-[17px]` × 2 = 34 + caption 11 px at `leading-[14px]` = 14 + 2 px gap + `py-[6px]` × 2 = 62). Title clamped to 2 lines with a `title` tooltip carrying the full text; the role tag ("Contributor") rendered inline after the code (small neutral tag), not under the title; the indicator category rendered as a secondary-tone 11 px caption under the title (column removed); status pill single-line (`whitespace-nowrap`, column ≥ 128 px); TOC result and Indicator clamped to 2 lines at the same leading; date short-formatted ("23 Feb 2026"), right-aligned, tabular; cell padding `!py-[6px]` (today 8).
- **`BRP-R-9` Muted placeholders.** "Not specified" / "Not Applicable" / empty values in TOC result and Indicator MUST render as a muted em dash (`<span aria-hidden="true">—</span>` + `<span class="sr-only">` carrying the original text) with the original text also in `title` for pointer users, never as full-weight text.
- **`BRP-R-10` Row affordances.** Rows MUST show a hover background (`--pr-surface-app`) and a 1 px divider (`--pr-border-divider`); no zebra. The Actions cell stays sticky right with a left divider.
- **`BRP-R-11` Group mode.** The grouped view MUST offer **Project | Center** grouping via a segmented control in the toolbar (next to Grouped / All results), persisted as `?group=project|center` (absent = project). Group by center uses `lead_center` (blank → "Not specified", **always the trailing group** regardless of its count), the group header shows the center acronym in bold, the number of projects in the group as a secondary caption, and "N results · M pending" on the right with M in a warning-tone badge (`--pr-color-yellow-*` tokens, contrast measured) when M > 0. The manual collapse memory (`userCollapsedKeys`) is namespaced per mode and MUST survive a mode round trip — a mode switch never clears it and never forces expand-all. Hidden in the flat view. Changing the mode costs no request.
- **`BRP-R-12` Group header restyle.** Group headers MUST render at ≤ 40 px: chevron, bold key (project code or center acronym), muted name, the center chip only in project mode, and the right-aligned "N results · M pending" with the pending badge (R-11).
- **`BRP-R-13` Narrow cards.** Below 900 px the rows MUST render as cards (one per result): code + status pill on the first line, title (2-line clamp), caption (category · center · TOC), and the action button right-aligned; group headers become full-width sticky-free bars; no horizontal body scroll; the table `<table>` is not rendered in this branch.
- **`BRP-R-14` No regression.** All suites of `sp-bilateral-review-tab` and `bilateral-review-center-strip-and-phase` MUST keep passing except the assertions this spec names, each rewritten **by the task that breaks it**: (a) CT "KPI grid one row of 4 / 2×2" (`bilateral-review.cy.ts:336-348`) → stat bar (T-1); (b) CT AC-15 focus order (`:434`) → new order with the segmented control, chevron and Clear filters (T-1); (c) CT `BRC-AC-11` "strip wraps to ≥ 2 lines at 840" (`:494-532`) → expand the row first (click the chevron), then assert (T-1); (d) CT "table horizontal scroll + sticky Actions at 840" (`:368-411`) → asserted at 1024 instead, and the 840 case becomes the cards gate (T-3); (e) Jest KPI card markup and the strip container classes (T-1); (f) Jest table specs for the removed category column, the group shape and the date format (T-2); (g) **execution amendment, BRP-T-3:** the shared `assertEffectiveWidth` `beforeEach` at 840 moves to `cy.viewport(840, 1600)` and the "Center strip — 9-center fixture" describe to `cy.viewport(840, 2400)` (cards are taller than rows and trip the native-scrollbar quirk; the 9-card fixture measured taller than 1600 — the JB-10 fix pulled forward from T-4 to the task that trips it); (h) **execution amendment, BRP-T-3:** `BRT-T-7`'s two 840 px FAIL-input evidence cases (they inject CSS at `.pr-table-wrap` / `td:first-child`, which do not exist in the cards branch) move to the 1024 px viewport where the table branch renders (T-3). All six KPI `data-testid`s (`kpi-projects`, `kpi-centers`, `kpi-pending`, `kpi-pending-toggle`, `kpi-decided`, `kpi-decided-sublabel`) and every status chip `data-testid` are kept.
- **`BRP-R-15` Scroll consistency.** The `#workArea` single-scroller contract (`SAV-DD-1`) MUST be preserved in both the table and the cards branch: at ≥ 900 px no descendant of `#workArea` other than the table's existing `overflow-x` wrapper may have computed `overflow-y: auto | scroll` (CT gate).

### Should (SHOULD)

- **`BRP-R-20`** Transitions on collapse/expand and hover SHOULD be 150–200 ms, `transform`/`opacity`/color only, disabled under `prefers-reduced-motion`.
- **`BRP-R-21`** The centers row SHOULD auto-expand once when the user lands with `?center=` set and the row is collapsed by the >6 rule (not by their stored choice).

---

## 8. Non-Functional Requirements

| Dimension | Target |
|---|---|
| Performance | No new requests; group mode switch and Clear filters are client re-computations (phase untouched) |
| Accessibility | Segmented controls are `role="group"` + `aria-pressed`; chevron `aria-expanded`; cards keep the row's accessible name; contrast ≥ 4.5:1 on **every new text, including every ≤ 12 px caption and badge, measured at HITL**; no native `disabled` (KZ-REH-2); focus ring visible on chips and rows' action |
| Responsive | Verified at 1536 / 1024 / 840 / 375 effective CSS px; body never scrolls horizontally |
| i18n | Strings in `bilateral-review.copy.ts`, American English; dates via the app's short date format |
| Design tokens | Only `var(--pr-*)` tokens from `docs/ux-ui/design.md` §7 in new markup (the pre-existing raw amber/emerald/red status pill is untouched). Icons: `docs/ux-ui/design.md` §7 line 230 says `material-icons-round` and never mix sets; the bilateral toolbar already uses lucide, so this spec's rule is **each region keeps the set it already uses, never mixed inside one component** (toolbar/band = lucide, table/stat bar = `material-icons-round`) — recorded as a deviation in `onecgiar-pr-client/docs/DESIGN-DEVIATIONS.md` (T-4) |

---

## 9. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `BRP-AC-1` | SP02 at 1536 px, 7 centers | Page loads | One filter band with two labeled rows; centers row **collapsed** (7 > 6), showing "Centers · 7" + pressed "All centers 131" + chevron; band height ≤ 96 px |
| `BRP-AC-2` | Centers collapsed | Click chevron | Row expands, all chips visible (12-cap + "+N more" as in BRC), `aria-expanded="true"`, `sessionStorage['pr.bilateral.centersExpanded'] === '1'`; reload keeps it expanded |
| `BRP-AC-3` | Centers collapsed, click IITA in expanded state then collapse | Collapsed row | Shows exactly one chip "IITA 99 ✕" pressed and no "+N more"; ✕ clears to All centers; `?center=` removed |
| `BRP-AC-3b` | Popover selects IITA + CIP, row collapsed | Collapsed row | Exactly one summary chip "2 centers ✕" (not pressed); ✕ clears the Center filter |
| `BRP-AC-4` | Any chip | Count badge | Pending > 0 → primary tint, 0 → neutral; measured contrast ≥ 4.5:1 on pressed and unpressed chips |
| `BRP-AC-5` | No filter active | Toolbar | No "Clear filters" control at all (exactly zero matches for the label in the toolbar); set search "maize" + center CIP + status Pending → exactly one "Clear filters · 3"; add phase Q → still · 3; click → search empty, status All, centers [] in **one** navigate with the five filter keys `null`, `view`/`group`/`phase` absent from the navigate, no list request |
| `BRP-AC-6` | Page loads | Stat bar | `[data-testid="bilateral-review-statbar"]` (the component host, page wrapper padding removed) measures ≤ 44 px at ≥ 900 px and shows 18 · 7 · 131 pending (toggle, `aria-pressed`) · 10 decided (10 approved · 0 rejected); Pending toggle still filters like the Pending chip |
| `BRP-AC-7` | 1536 px (CT) and the real page (HITL) | Page loads | CT: `[data-testid="bilateral-review-filter-band"]` height + stat bar height ≤ **140 px** with the centers row collapsed, and `firstRow.top − workArea.top` ≤ **210 px** (toolbar 50 + band ≤ 96 + stat bar ≤ 44 + 20 rows-area padding); FAIL input: inject `min-height: 300px` on the band → both fail. HITL: first row top < **420 px** from the viewport top at 1130 px tall (today 494) |
| `BRP-AC-8` | Row with a 3-line title and "Contributor" role | Row renders | Height ≤ 64 px (CT measured; ≤ 44 px for a one-line-title row); title 2-line clamp with `title` attribute; "Contributor" tag inline after the code; caption "Capacity sharing for development" under the title; no "Indicator category" column |
| `BRP-AC-9` | Row with TOC "Not specified" and Indicator "Not Applicable" | Row renders | Both cells show "—" muted (`aria-hidden`) with an `sr-only` sibling and a `title` carrying the original text |
| `BRP-AC-10` | Grouped view, IITA collapsed by hand | Toggle Group: Center, then back | URL `?group=center`; groups keyed by lead center, "Not specified" last even with 2 pending, "CIP" bold + "5 projects" caption + "9 results · 9 pending" with a token-based warning badge; no list request; back to Project → IITA still collapsed (memory not cleared, no expand-all); toggle hidden in flat view |
| `BRP-AC-11` | 840 px (CT `cy.viewport(840, 1600)`; the 9-card fixture at `(840, 2400)`), grouped | Renders | Rows are cards; no `<table>`; body `scrollWidth <= clientWidth`; `firstCard.top − workArea.top` ≤ **270 px**; no descendant of `#workArea` with computed `overflow-y: auto\|scroll` |
| `BRP-AC-12` | 375 px (CT `cy.viewport(375, 1600)`) | Renders | Toolbar stacks (search full width), filter band rows wrap, cards single column, no horizontal scroll |
| `BRP-AC-13` | Parent suites | `npx jest …/bilateral-review`, CT | Green with only the named assertions updated |
| `BRP-AC-14` | `?center=CIP` deep link, 7 centers, no stored choice | Load | Centers row auto-expanded once (R-21); with a stored `false` it stays collapsed and shows "CIP 9 ✕" |

### Key scenarios

#### Scenario: First screen shows the queue (BRP-R-1, R-3, R-6)
- GIVEN SP02 on a 1536 × 900 viewport
- WHEN the tab loads
- THEN the first table row is visible without scrolling (top of the first row < 560 px from the work area top)
- AND the filter band (collapsed centers row) and the stat bar together take ≤ 140 px
- BUT it must NOT hide the current selection (pressed status and pressed center are visible)
- AND IT MUST keep every filter behavior of `BRC`/`BRT` unchanged.

#### Scenario: Distribute review work by center (BRP-R-11, R-12)
- GIVEN the grouped view with 7 centers
- WHEN the lead picks Group: Center
- THEN the table regroups by lead center with pending badges per group and the URL carries `?group=center`
- AND collapsing "IITA" and switching to Project and back keeps IITA collapsed
- BUT it must NOT issue any request nor change filters
- AND IT MUST survive a reload.

#### Scenario: Reset in one click (BRP-R-5)
- GIVEN search "maize", status Pending, center CIP and phase Q selected
- WHEN the reviewer clicks "Clear filters · 3"
- THEN search, status and center return to defaults in one navigation with no list request
- AND the stat bar and the chips recompute
- BUT it must NOT change the phase, the grouped/flat view, the group mode nor the centers row expansion.

---

## 10. Defect classes and gates

| Defect class | Gate | Substitute |
|---|---|---|
| Chrome height regression | CT at 1536: band + stat bar ≤ 140 px and `firstRow.top − workArea.top` ≤ 210 px (FAIL input: `min-height: 300px` on the band → RED recorded); CT at 840: `firstCard.top − workArea.top` ≤ 270 px; HITL: first row < 420 px from the viewport top | — |
| Row height / clamp | Jest: row with a 200-char title + role renders `line-clamp-2` and the inline tag; CT: measured row height ≤ 64 (two-line) and ≤ 44 (one-line) | — |
| Second scroll container | CT ≥ 900 and at 840: no descendant of `#workArea` (except the table's `overflow-x` wrapper) with computed `overflow-y: auto\|scroll`; FAIL input: add `overflow-y: auto` to the cards list → gate fails | — |
| Motion / reduced motion | Jest: animated classes carry `motion-reduce:transition-none`; durations 150–200 ms | — |
| Group-by-center arithmetic / ordering | Jest fixture with distinct pending per center, a blank center with **non-zero** pending (must still trail), one center spanning two projects (caption "2 projects"); collapse memory survives a mode round trip (FAIL input: bump the nonce on switch) | — |
| Clear-filters count | Jest: each of the five dimensions toggles the count; phase/group/view do not; one `router.navigate` with the five keys `null` and none of `view`/`group`/`phase`; exactly one toolbar clear control rendered (FAIL input: leave the old button) | — |
| Collapse persistence | Jest: `sessionStorage` read/write through a stub; default rule (> 6 or narrow) | — |
| Contrast of new text | HITL measured (oklch via canvas): badge matrix (pressed/unpressed × > 0 / 0), captions (title caption, group caption, card caption), placeholders, warning badge | — |
| Cards below 900 | CT at 840 and 375: no `<table>`, no body overflow, card count = row count | — |
| Visual parity with sibling tabs | HITL look (owner screenshot compare before/after) | accepted if skipped |

---

## 11. Open Questions

- `BRP-OQ-1` Is "distribution per center" the group-by-center table mode? **Assumed yes** (R-11); the owner did not answer before the pass started.
- `BRP-OQ-2` Beyond row height, what else bothers the owner about the table? **Assumed** the measured items in §2 (wraps, placeholders, repetition, no hover).
- `BRP-OQ-3` Should the collapsed default be "> 6 centers" or "always"? **Assumed > 6 or narrow**, remembered per session.

---

## Required cross-references

- `docs/prd.md` US-Q1, US-P1 · `docs/ux-ui/design.md` §7 tokens, §8 components (chips, badges, tables), §10 responsive · `docs/trd/trd.md` §6.
- Parent specs: `changes/sp-bilateral-review-tab` (`BRT-R-6` KPIs, `BRT-R-7` chips, `SAV-DD-1` scroll contract), `changes/bilateral-review-center-strip-and-phase` (`BRC-R-1..4`, `BRC-DD-3/4`).
