# Program shell, Overview and Reporting — exact spec

> **Authoritative visual reference (only one):**  
> [`../../../docs/design-references/prms-shell-CURRENT/`](../../../docs/design-references/prms-shell-CURRENT/)  
> Live: https://claude.ai/design/p/b6234307-e82b-43d0-b4c4-a2bb13b12242?file=PRMS+Shell.dc.html&via=share  
> Export date: **2026-08-04** (`PRMS-Shell.dc.html`, **4 768** lines). Older design-reference folders
> were removed. Re-anchor any `:NNN` citations against this file when editing.


**Source:** `docs/design-references/prms-shell-CURRENT/PRMS-Shell.dc.html` (program band, Overview,
Reporting) plus the rendered PNGs in that folder’s `uploads/`. Every px/hex should be confirmed
against the CURRENT markup, not inferred from memory.

**Covers UI-RULES §6 Phases 4, 5 and 7.** This replaces the current
`result-framework-reporting/home` layout — the owner's instruction is that the existing distribution
is retired, not extended.

> **Read first:** [`UI-RULES.md`](./UI-RULES.md) (the authority) and
> [`MIGRATION-CONTEXT.md`](./MIGRATION-CONTEXT.md) (what the legacy code does today).
> The token layer this depends on already shipped — see [`AUDIT-FINDINGS.md`](./AUDIT-FINDINGS.md).

---

## 1. Layout

```
┌──────────┬─────────────────────────────────────────────────────────┐
│ SIDEBAR  │ TOPBAR                     56px · #FFFFFF · border-b    │
│ (done)   ├─────────────────────────────────────────────────────────┤
│          │ PROGRAM BAND               #F7F4FD                      │
│          │   identity 88px  +  tabs 48px                           │
│          │   sticky; collapses to a single 48px row on scroll      │
│          ├─────────────────────────────────────────────────────────┤
│          │ CONTENT                    #F7F7F9 · padding 32px       │
└──────────┴─────────────────────────────────────────────────────────┘
```

The sidebar spans full height; the topbar starts where the sidebar ends.

---

## 2. Topbar (56px)

| Element | Spec |
|---|---|
| Bar | `height: 56px`, `flex: none`, `gap: 16px`, `padding: 0 20px 0 12px`, `background: #FFFFFF`, `border-bottom: 1px solid #E3E3E8` |
| Sidebar toggle | `32×32`, `border-radius: 8px`, `background: transparent`, `color: #5D5872`; hover `#EFECF8`. Icon 16×16, `stroke-width: 1.3` |
| Search | centred, `width: 480px`, `height: 36px`, `padding: 0 12px 0 32px`, `border: 1px solid #E4E0EF`, `border-radius: 8px`, `background: #F8F7FC`, `font-size: 13px`, `color: #2B2838`, `cursor: pointer`. **Read-only** — clicking or focusing opens the command palette. Magnifier 14×14 `#9691A8` absolutely positioned `left: 12px` |
| Cycle selector | `height: 32px`, `gap: 6px`, `padding: 0 10px`, `border: 1px solid #E4E0EF`, `border-radius: 8px`, `background: #FFFFFF`; hover `#EFECF8`. Year `13px/500 #2B2838` · separator `·` `#CFC9DE` · phase **JetBrains Mono** `12px/500 #5D5872` · chevron 12×12 `#9691A8` |
| Cycle dropdown | `top: 38px; right: 0`, `width: 240px`, `padding: 6px`, `border: 1px solid #E9E5F3`, `border-radius: 12px`, `background: #FFFFFF`, `box-shadow: 0 8px 24px rgba(25,21,36,.10)`. Rows `height: 36px`, radius 6, hover `#EFECF8`; the current cycle is labelled `Current` (`12px/400 #9691A8`); the active one shows a check `#6B46E5` |
| Notifications | `32×32`, radius 8, `color: #6B6580`; hover `background: #EFECF8; color: #2B2838`. Badge: `16×16`, `border-radius: 999px`, `background: #6B46E5`, `10px/600 #FFFFFF`, positioned `top: -2px; right: -2px` |
| Notifications panel | `top: 40px; right: 0`, `width: 380px`, radius 12, border `#E3E3E8`, same shadow. Eyebrow `11px/600 .08em uppercase #6B6580`. Items: `gap: 10px`, `padding: 8px`, radius 8, hover `#EEEEF1`; title `14px/500 #191524`, body `13px/400 lh 17px #5D5872`, time `12px/400 #9691A8`. Footer button `height: 34px`, `border-top: 1px solid #EEEEF1`, `13px/600 #5733C4`, hover `#F5F3FF` |
| Account | `height: 36px`, `gap: 8px`, `padding: 0 8px`, radius 8; hover `#EFECF8`. Avatar `28×28`, `border-radius: 999px`, `background: #EDE9FE`, `color: #5733C4`, `11px/600`. Name `14px/500 #191524`. Chevron 12×12 `#9691A8` |
| Account menu | `top: 42px; right: 0`, `width: 220px`, `padding: 6px`, `border: 1px solid #E3E3E8`, radius 12, same shadow |

---

## 3. Program band

> **Implementation status (2026-08-03).** The expanded band matches the values below
> (88px + 48px, title 30/800, 2px underline, `position: sticky`). Two deliberate deviations:
> the **days-left chip is absent** (no cycle end date exists in the client — see the component
> doc), and the **collapsed 48px variant is not built yet**. The Reporting toolbar was moved OUT
> of the band into the 32px content pad, which is where the reference puts it (`:883`).

### Expanded (88px identity + 48px tabs)

**Eyebrow row:** a `●` programme dot, then
`SP01 · REPORTING CYCLE 2026 · P25` in `11px/600 uppercase .08em`, followed by a **days-left chip**.

The chip is the cycle chip already specified in `MIGRATION-CONTEXT.md` §1 — four fixed states:

| Condition | Background | Foreground |
|---|---|---|
| `> 30` days left | `#EDE9FE` | `#5733C4` |
| `15–30` days | `#FEF3C7` | `#B45309` |
| `< 15` days | `#FEE2E2` | `#B91C1C` |
| closed | `#EEEEF1` | `#5D5872` |

**Title row:** programme name at **28px / 700**, `letter-spacing: -0.02em`, `#191524`, followed by a
small ⓘ button that opens the programme description popover.

**Primary action, right-aligned:** `Report emerging result` — the single `brand` button on the screen
(rule 1). Lightning icon + label, `bg-brand-300`, white text, `hover:bg-brand-400`.

**Tabs row (48px):** `Overview` · `Reporting`. Active tab is `#191524` with a **3px violet underline**
(`#6B46E5`); inactive is `#5D5872` with no underline. A `1px #E3E3E8` hairline runs the full width
under the row.

### Collapsed (single 48px row, on scroll)

`● Breeding for Tomorrow` `29% · 48d left` on the left, tabs and the primary action on the right —
all on one line. The band is `position: sticky`.

---

## 4. Tab: Overview

> **Implementation status (2026-08-04).** Shipped as
> `dashboard-lab/components/program-overview/`, routed at **`/result-framework-reporting/overview`**.
> Layout matches **CURRENT** `PRMS-Shell.dc.html:753-891`. Figures are wired from live SP status
> counts, AoW ToC ratios, Intermediate/2030 buckets, and result-type summaries where those APIs
> exist. Pace is approximate (no cycle end date). Countries stay empty until a geo endpoint exists.
> **Largest gaps was removed** in the 2026-08-04 export.

Six blocks, in order. All cards: `background: #FFFFFF`, `border: 1px solid #E3E3E8`,
`border-radius: 12px` — separated by border, not shadow (rule 10). 12-column grid, **16px** gutter,
**32px** content pad. Spans: About **12** · Reporting status **8** + Reporting pace **4** ·
Progress by area of work **6** + Needs attention **6** · Impact so far **12**.

1. **About this program** — body copy `14px/400`, `line-height 1.5`, `#2B2838`, clamped to 3 lines with
   an inline `Show more` (`#6B46E5`).
2. **Reporting status** — a single horizontal **segmented bar** with the count printed inside each
   segment, plus a legend below: `Not started 20` (grey) · `In progress 6` (amber) · `Submitted 1`
   (blue) · `In QA 1` (cyan) · `Approved 0` (green). Colours come from the `--pr-status-*` pairs.
   ⚠️ This is the one place a segmented meter is allowed: the number is a **count of results**, so it
   is a true proportion (rule 15).
3. **Reporting pace** — a small line chart: actual (solid violet) vs required (dashed grey), with a
   red dashed deadline marker. Below it, two sentences: *"At this pace you'll finish 57 days after the
   deadline."* and *"You need 2.9 results per week to close on time. Current pace: 1.3."*
4. **Progress by area of work** — one row per AoW, **sorted ascending by completion** (least complete
   first — that is the point of the block). Row: code in **JetBrains Mono** `#5D5872` · name
   `15px/500 #191524` · a continuous progress bar · `N/M` in mono tabular · `%` in mono `#9691A8`.
5. **Needs attention** — ⚠️ heading. Each row: a semantic icon, one line of copy, and a right-aligned
   text action (`Review` / `Open`) in `#6B46E5`. Real examples: *1 draft untouched for more than 7
   days*, *AOW06 has no results reported yet*, *4 emerging results waiting for submission*, *8 results
   are missing evidence links*.
6. **Largest gaps to target** — 🎯 heading. Each row: indicator name `15px/500 #191524`; meta line
   `AOW02 · 2026 Target: $1.2M · Achieved: $0` in `13px/400 #5D5872`; and the gap right-aligned in
   **mono, amber `#B45309`** — `$1.2M left`, `40% left`, `6 left`. Units are respected: money, percent
   and plain counts all appear.
7. **Impact so far** — 📈 heading, split in two. Left: `COUNTRIES REACHED` eyebrow, a **32px/700 mono**
   figure, and a horizontal bar list per country with counts. Right: `RESULTS BY INDICATOR CATEGORY`
   eyebrow and a vertical bar chart — Knowledge product 11, Innovation development 11, Capacity
   sharing 3, Other output 3 — using the 4-step `--pr-chart-*` scale.

**Every aggregate must navigate to its detail** (UI-RULES §6 Phase 7 gate): clicking an AoW row, a
Needs-attention action or a gap row goes to the corresponding filtered Reporting view.

---

## 5. Tab: Reporting — the important one

Three levels of grouping. **First level carries typographic weight, second carries fill; they must not
compete on the same variable. No vertical spine lines.**

```
AOW header    64px · #FFFFFF · border-b --pr-border-strong · name 16/600
  HLO header  44px · #F7F7F9 · eyebrow "HLO" 11/600 + name 13/500 + count right
    ROW       88px min · #FFFFFF · border-b --pr-border-divider
```

### Row grid (verbatim from CURRENT `PRMS-Shell.dc.html` ~1090)

```css
display: grid;
grid-template-columns: 36px minmax(0,1fr) 48px 100px 20px 100px 56px 110px 8px 40px;
align-items: center;
gap: 0;
min-height: 96px;
padding: 20px 24px 20px 44px;
cursor: pointer;
transition: background 400ms ease;
/* hover */ background: #FCFCFD;
```

Clicking anywhere on the row opens the result drawer.

### Column 1 — status icon (36px cell, 18×18 bullseye)

**CURRENT** draws a concentric **bullseye / target** (archery target), not a half-fill circle:

```html
<svg width="18" height="18" viewBox="0 0 24 24" fill="none">
  <circle cx="12" cy="12" r="8.5" stroke="#6B46E5" stroke-width="1.75"/>
  <circle cx="12" cy="12" r="4.2" stroke="#6B46E5" stroke-width="1.75"/>
  <circle cx="12" cy="12" r="1.1" fill="#6B46E5"/>
</svg>
```

Always brand violet `#6B46E5`. Workflow state (Not started / In progress / Achieved / …) is carried
by the tooltip / action label / filters — not by recolouring the mark into a traffic-light ring.

### Column 2 — text (max-width 620px)

- **Result title** — `15px/600`, `line-height: 1.45`, `#191524`, clamped to **2 lines** with an inline
  `Show more` / `Show less` button (`13px/500 #6B46E5`, hover `#5733C4`). Rule 16: clamp, never break.
- **Indicator (KPI) name** — `margin-top: 6px`, `13px/400`, `line-height: 17px`, `#5D5872`, clamped to
  **1 line** with a `title` attribute for the tooltip.

### Columns 3 and 4 — Target and Achieved (110px each, right-aligned)

Both are **buttons**, not static text:

```
value:  JetBrains Mono · 18px/500 · line-height 22px · tabular-nums
label:  11px/500 · line-height 14px · #9691A8  ("Target" / "Achieved")
hover:  text-decoration: underline dotted #9691A8; text-underline-offset: 3px
```

**Target popover** (`width: 380px`, `padding: 16px`, `border: 1px solid #E3E3E8`, `border-radius: 12px`,
`box-shadow: 0 8px 24px rgba(25,21,36,.10)`, `top: calc(100% + 6px); right: 0`):
title `Target details` `14px/600`; the value repeated in **mono 20px/600**; then a breakdown list of
`32px` rows separated by `border-top: 1px solid #EEEEF1`, each `name` `13px/400 #2B2838` +
`value` in mono `13px/500`; and a footer note `13px/400 #5D5872`.

**Achieved popover** (`width: 420px`, same chrome): title `Reported results`; empty state
*"Nothing reported yet for this indicator."*; otherwise a scrollable list (`max-height: 260px`) of
reported results — each a button, `padding: 8px 6px`, `border-top: 1px solid #EEEEF1`, hover `#F7F7F9`,
with title `14px/500 lh 18px #191524` (1-line clamp), meta `12px/400 #5D5872`, and the contributed
value right-aligned in mono `13px/500`. Clicking one opens that result.

⚠️ Rule 15: **never a segmented meter on an indicator value.** Targets can be financial (`$1.2M`) or
large-scale, so the figure carries the meaning — not a bar.

### Column 5 — action (120px, right-aligned)

```css
height: 32px; padding: 0 14px;
border: 1px solid #DDD6FE; border-radius: 8px;
background: #FFFFFF; font-size: 14px; font-weight: 500; color: #5733C4;
/* hover */ background: #F5F3FF; border-color: #C4B5FD;
```

This is exactly the `brandSoft` variant already added to `hlm-button`.

**The label is state-dependent (rule 17):** `Report` when not started · `Continue` when in progress ·
**no button at all** once submitted. Nomenclature is fixed to `Target` / `Achieved` (rule 14).

✅ **Accepted deviation (decided by Yeck, 2026-08-06):** `brandSoft` keeps `border-brand-300` instead
of the reference's `#DDD6FE` (= `brand-200`). On a white card the 200 border measures **1.39:1**, under
the 3:1 non-text floor (`AUDIT-FINDINGS.md` #19), so **the reference bends here and accessibility wins**.
This is the only place the implementation departs from CURRENT for a measured reason rather than an
oversight — do not "correct" it back to `#DDD6FE`.

### Column 6 — overflow menu (28px)

A `⋯` button opening the row menu. Per UI-RULES §8 question 6, per-row PDF lives here unless the BA
says it is a daily action.

### HLO sub-group header (44px)

- Eyebrow (`HLO`) `11px/600`, `letter-spacing: .08em`, uppercase, `#9691A8`, with a hover tooltip
  (`background: #191524`, `12px/400 lh 16px #FFFFFF`, `max-width: 280px`, radius 8, `padding: 8px 10px`)
- Name `13px/500`, `line-height: 16px`, `#5D5872`, **1-line clamp** + `title`
- Count right-aligned, `12px/400`, tabular, `#9691A8`
- Collapsible; open by default

---

## 6. What the app has today, and what happens to it

The current `result-framework-reporting/home` is a bento dashboard (`dashboard-lab`,
`result-framework-reporting-insights`, `result-framework-reporting-galaxy`, the AoW cards). Per the
owner: **that distribution is retired and replaced by this shell + the two tabs.**

Before deleting anything, note what only exists in the current app and has no home in the reference:

- **`entity-aow`** already renders AoW → results. It is the closest thing to the Reporting tab and
  should be **extended into it**, not replaced (`UI-RULES.md` §5 maps Reporting → `entity-aow`).
- **`dashboard-lab`** holds real work (guided creation, the indicator drawer, the lab report form).
  Those flows must land somewhere before the page goes.
- **The Intermediate Outcomes / 2030 Outcomes views** (`/aow/unplanned`, `/aow/2030-outcomes`).
  `UI-RULES.md` §8 question 3 asks whether their cadence differs from HLOs — **blocks this phase.**
- **`result-framework-reporting-galaxy`** is a Three.js visual with no equivalent in the reference.

## 7. Open questions that block implementation

1. ~~**`brandSoft` border**~~ — **CLOSED 2026-08-06**: keep the accessible `-300`; the reference bends. §5 above.
2. **Intermediate / 2030 Outcomes cadence** — same cycle as HLOs or a longer horizon? If different they
   need visual separation from work closing this cycle. (`UI-RULES.md` §8 q3.)
3. **Where do `dashboard-lab`'s flows go** once the page is retired?
4. **Reporting pace maths** — the projection ("57 days after the deadline", "2.9 results per week") is
   not in any current API response. Computed client-side from the cycle end date and current velocity,
   or a new endpoint?
5. **Impact so far** — countries reached and results-by-category are aggregates the client does not
   fetch today. Same question: derive locally or add an endpoint?
6. **`Report emerging result`** already exists at `/result-framework-reporting/emerging`. Confirm the
   band's primary action routes there rather than opening something new.
