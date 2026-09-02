# Proposal — Relate the Overview sections by Area of Work

**Confirmed: the point is real, and it runs deeper than a missing filter.** The three Overview sections (Areas of Work · W1/W2 · W3/Bilateral) share no axis because **two of them carry no AoW dimension in their payload** — not because nobody put the control on screen. The good news: in W3 the data **already travels over the wire and is being thrown away**, and for W1/W2 the AoW×status join **already exists on the server** and is merely narrowed.

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `docs/specs/changes/overview-aow-cross-filter/` |
| Slug | `overview-aow-cross-filter` — derived from the free-text argument |
| Type | **Change** (carries two scoped bug fixes — horizontal scroll §3.2, dead vertical space §3.3) |
| Approval Mode | `gated` (no explicit mandate in this request) |
| Depends on | none |
| Parallel-safe | yes against other specs; **no** between its own chunks (they share `program-overview.component`) |
| Surface | `entity-details/:entityId/overview` → `DashboardLabComponent` → `<app-program-overview>` |
| Owner decisions | 2026-09-01 — **OQ1: single-select** · **OQ2: two independent axes** · mockup before `/akili-specify` |

## 2. Intent

Make the three Overview sections of a Science Program read as **one story per Area of Work**, instead of three independent aggregates that happen to share a page.

## 3. Problem / Current Behavior

Today the `All Sections · W1/W2 · W3/Bilateral · Areas of Work` control is a **section filter**: it decides *which cards are visible*, not *what data they contain* (`program-overview.component.html:190-251`, `activeSection()`). No card changes its numbers when the tab changes.

The result is exactly what the owner reports: **Reporting status (W1/W2)** shows 89 results across 5 statuses with **no way to tell which AoW they belong to** — even though the hero directly above states there are 5 AoWs holding 352 planned KPIs.

### Why — the AoW axis, card by card

| # | Card | Section | Source | AoW axis today? |
|---|---|---|---|---|
| 2 | Progress by area of work (hero) | AoW | `indicatorsByAow()` (ToC) | ✅ native |
| 3 | **Reporting status** | W1/W2 | `GET_ScienceProgramsProgress` → `statuses[]` per SP | ❌ **none** |
| 4 | W1/W2 results by category and status | W1/W2 | `GET_IndicatorContributionSummary` | ❌ **none** (no ToC join) |
| 5-7 | Bilateral categories · centers · status | W3 | `GET_ResultToReview` rows | ⚠️ **present but unused** |
| 8 | ToC map | program-wide | ToC | ✅ native |

Three findings that change the cost of everything else:

1. **W3 already carries the AoW.** `getResultsByProgramAndCenters` (`result.repository.ts`) does `LEFT JOIN Integration_information.toc_work_packages twp` and selects `MAX(twp.acronym) AS acronym`. That field reaches the client as `ResultToReview.acronym` — and **the Overview never reads it**. Filtering W3 by AoW is pure frontend work.
2. **The W1/W2 AoW×status join already exists and ships today.** `getResultsCountByUnitAndStatus` (`results-framework-reporting.service.ts:885`) groups `result → results_toc_result → toc_results → toc_work_packages` by `work_package_acronym, status_id`. It is artificially narrowed by `AND r.status_id IN (1, 3)`, and the DTO exposes only `resultsCount: {editing, submitted}`. **No new join is needed — the existing one must stop being narrowed.**
3. **Card 4 is the one that genuinely needs new SQL.** `getIndicatorContributionSummaryByProgram` joins only `result → results_by_inititiative`; it never touches ToC. It is the single card of the five that requires real query work.

Also: **89 (W1/W2 results) and 352 (planned KPIs) are not the same universe.** The first counts *results by status*, the second *planned ToC indicators*. Any shared filter must make that explicit or it will imply the two should reconcile.

## 3.1 Strategic outcomes are not a fourth Area of Work — they are the axis's blind spot

Raised by the owner, 2026-09-01: the ToC has **Intermediate outcomes** and **2030 outcomes** beside
the AoWs. Handling them is not an optional extra — **leaving them out silently breaks the filter.**

**What they are, in the data.** `countProgramLevelOutcomes` (`aow-bilateral.repository.ts:249`)
defines them explicitly against the work-package dimension:

| Bucket | Definition |
|---|---|
| Intermediate outcomes | `toc_results` · `category IN ('OUTPUT','OUTCOME')` · **`wp_id IS NULL`** |
| 2030 outcomes (EOI) | `toc_results` · `category = 'EOI'` — program level, no work package |

They are **defined by having no work package**. So every query that reaches an AoW through
`toc_work_packages` cannot see them:

- **W1/W2** — `getResultsCountByUnitAndStatus` joins `INNER JOIN toc_work_packages wp ON wp.toc_id = tr.wp_id`. A `NULL` `wp_id` fails an INNER JOIN, so results tagged to an outcome are **dropped from every per-AoW count**.
- **W3/Bilateral** — `getResultsByProgramAndCenters` uses a LEFT JOIN, so those rows survive with `acronym = NULL`. Filtering on `row.acronym` would **silently discard them**.

**This breaks Success Criterion 2 as originally written.** "The per-AoW rows sum to the unfiltered
total" is false: the gap is exactly the outcome-tagged results, plus anything with no ToC link at
all. A user who adds up five AoWs and lands short of 89 has been misled — the R1 lying-filter
failure, arriving through the data rather than through the UI.

**The client already treats them as a separate universe**, which is the honest precedent: the hero's
AoW rows filter to output tier only (`__tier !== 'outcome'`, `dashboard-lab.component.ts:1378`), and
the two outcome buckets render as their own footer chips (`overviewXcutProgress`, `kind:
'intermediate'` / `'2030'`) with their own click-through — `openAow.emit(row.code || 'xcut')`.

### What to do

Rename the axis. It is not "Area of Work", it is **ToC scope** — one single-select control whose
options are grouped:

```
Scope:  [ All areas and outcomes            ▾ ]
        ─ Areas of work ────────────────
          AOW01 · Market Intelligence        18 KPIs
          AOW02 · Accelerated Breeding      110 KPIs
          …
        ─ Strategic outcomes ───────────
          Intermediate outcomes               7 KPIs
          2030 outcomes                       5 KPIs
        ─────────────────────────────────
          Not tagged to a ToC area            N results
```

Three requirements follow:

1. **The partition must be total.** Every result belongs to exactly one bucket: an AoW, an outcome, or **Not tagged**. That last bucket is not a nicety — it is what makes the parts sum to the whole, and it is where results with a `NULL` acronym land instead of vanishing.
2. **The two axes stay independent, as decided.** Section tabs still choose which cards; scope still filters the data inside them. Nothing about OQ2 changes.
3. **The outcome buckets obey the same not-filterable rule.** A card that cannot answer "which outcome?" shows the `Program-wide` chip exactly as it does for an AoW.

The cost is small on the client — the selector gains two grouped entries the hero already renders as
chips — and it is the difference between a filter that reconciles and one that quietly loses rows.

## 3.2 The horizontal-scroll bug (owner-reported, 2026-09-01)

> ⚠️ **SUPERSEDED — the root-cause analysis below is wrong.** `OSF-T-1` measured the live page on 2026-09-01: overflow is **1470px at a 1138px viewport**, and the AoW row contributes **nothing** to it. The cause is `<table class="sr-only">` inside the shared `app-pr-viz-chart` — `sr-only`'s `width:1px` cannot constrain a `<table>` (auto table layout treats it as a minimum, CSS 2.1 §17.5.2), so seven invisible tables inflate the document's scroll area. Neutralising them drops overflow to 3px. The analysis below is kept unedited as the trail of how the wrong hypothesis was reached and refuted. Current truth: `design.md` `OSF-DD-14`, evidence in `execution.md` §2–§3.

The Overview scrolls sideways. The mechanism is in the code, and it is the **unfinished half of a fix this module already made once**.

**Root cause — a row that cannot shrink, inside a page with nowhere to put the overflow.**

`program-overview.component.html:426` (and its skeleton twin at `:397`) lays each Area-of-Work row on:

```
grid-cols-[minmax(0,1fr)_minmax(120px,240px)_max-content_max-content_max-content]  gap-[16px]  px-[16px]
```

Only the first track can shrink. The other four have hard floors:

| Track | Content | Floor |
|---|---|---|
| identity | AoW code + name | `minmax(0,1fr)` — **shrinks to 0** |
| bar | segmented progress | **120px**, cannot go lower |
| figures | `1/110` · `1%` | ~76px (`max-content`) |
| achievement | `QA 93.8% Prel. 0.2%` + coverage, `whitespace-nowrap` (`:489`) | ~135px (`max-content`) |
| actions | `Report` + arrow button | ~128px (`max-content`) |
| — | 4 gaps × 16 + row padding 32 | 96px |

**Minimum row width ≈ 555px**, reached only after the AoW name has already been squeezed to nothing.

Two things then turn that into a page-level scrollbar:

1. **The hero rail holds 300px until 1024px.** `:282` is `w-[300px] flex-none`, and the section only stacks at `max-[1024px]:flex-col`. So between roughly **1025px and ~1200px of viewport** the row area is starved below 555px while the rail is still taking its full width — a small laptop, or any split/half-width window.
2. **`program-overview.component.html` has no `overflow-x` container at all — zero occurrences in 1023 lines.** It is the outlier in its own module: `dashboard-lab.component.html` uses `overflow-x-auto` in three places, and `reporting-aow-table`, `programme-results`, `portfolio-overview` and the bilateral tables all wrap wide content in their own scroller. Here the overflow has nowhere to go, so it propagates up through the `col-span-12` grid and the `p-[32px]` container to the page.

**Why it survived.** `changes/overview-aow-progress-hero` hit exactly this class of defect in the field (OAH-T-6, 2026-09-01, measured at a 1398px viewport: the identity column starved to 99px and the AoW name rendered "Acc…"). The fix re-expressed the identity track as `minmax(0,1fr)` and the bar as `minmax(120px,240px)` — it rescued the *name* but left three `max-content` tracks and a 120px bar floor in place, and added no scroll container. Kaizen **KZ-OAH-1** records the lesson; this is the part of it that was never closed.

**Status: root cause identified in source, not yet reproduced at a measured viewport.** The Chrome extension was not connected in this session, so the 1025–1200px prediction is derived from the tracks, not observed. `/akili-specify` must confirm it in a browser first — the repro is: open the Overview at ~1100px viewport width with the app sidebar expanded, and check `document.documentElement.scrollWidth > clientWidth`.

## 3.3 Dead vertical space below the last chart (owner-reported, 2026-09-01)

> ⚠️ **SUPERSEDED — same cause as §3.2.** Measured dead space **914px**, of which **882px** is the same `sr-only` tables (the ToC map's is 2297 × 936px, sitting directly below the last card). Of the two mechanisms proposed below: `min-h-screen` was measured **innocent** (floor 1137.6px against an actual shell height of 4134px — never reached), and the 460px chart box is real but second-order. Kept unedited as the trail; current truth in `OSF-DD-14` and `OSF-DD-11`.

The page keeps scrolling well past the last chart. Two mechanisms in the source, and they add up:

**1. The last card reserves 460px whether or not it needs them.** The Theory of Change map
(`program-overview.component.html:1005`, the final card) passes `height="460px"` to
`app-pr-viz-chart`, which stamps that value on **both** the wrapper and the canvas container
(`pr-viz-chart.component.html:1-2`, `[style.height]="height()"` twice). It is a hard box, not a
minimum: a sparse ToC map draws its nodes in the top portion and the remainder stays blank canvas
inside a bordered card. That is literally empty space after the last chart. The Reporting-status
donut does the same at a smaller scale (`w-[240px] h-[220px]` + `height="220px"`, `:633`).

**2. The shell asks for a full viewport on top of everything above it.** The detail panel is
`min-h-screen` in all four of its class branches (`dashboard-lab.component.html:223-227`), including
the program-shell branch this page uses. `min-height: 100vh` on a section that sits *below* the app
chrome makes the document at least `chrome + 100vh` tall — so a short page still scrolls, by roughly
the height of everything above the panel, before any content overflows.

**Status: same caveat as §3.2 — mechanisms read from source, not measured.** Which one dominates is
exactly what a browser check settles, and it decides the fix: `min-h-screen` → a `min-h-0` /
`calc()` correction on the shell; the ToC map → give the chart a content-driven height (or a
`min-height` with the container sizing to the rendered graph). Repro: open the Overview, scroll to
the bottom, and compare `document.body.getBoundingClientRect().height` against the bottom edge of
the last card's rendered content.

**Note the scope line.** Mechanism 2 lives in `dashboard-lab.component.html`, which is the shell for
the Reporting tab too — a `min-h-screen` change there is **not** Overview-only. Its blast radius has
to be checked against every `rfrView` before it is touched, or this fix breaks a tab nobody was
looking at.

## 4. Proposed Outcome

A user picks an Area of Work **once** and the whole page answers: the hero focuses on that AoW, W1/W2 shows its results by status, W3 shows its bilateral results — and **any card that cannot answer the question says so explicitly** instead of showing a program-wide total dressed up as filtered data.

## 5. Scope

- A persistent single-select **scope** control in the Overview header, beside the existing section tabs (**two independent axes**: section chooses *which cards*, scope filters *the data inside them*). Its options are grouped: Areas of Work · Strategic outcomes · Not tagged (§3.1).
- W3/Bilateral: real filtering by `row.acronym`, no server change.
- W1/W2 Reporting status: per-scope breakdown (requires widening the existing payload).
- Filter state reflected in the URL and propagated to the Reporting/Results deep-link.
- Explicit "this card is not broken down by scope" treatment.
- **Fix the horizontal scroll (§3.2)** — the AoW row's non-shrinking tracks plus the missing scroll container.
- **Fix the dead vertical space (§3.3)** — the last card's fixed 460px chart box and/or the shell's `min-h-screen`.
- **Responsive is a requirement of the whole change, not a follow-up** (§5.1).

## 5.1 Responsive — a cross-cutting requirement

Everything this spec touches, new or fixed, must hold at every supported width. This is not a
non-functional footnote: the change ADDS a control to the tabs row — the exact row that already
competes for horizontal space — so shipping it without a responsive rule would widen the bug in §3.1
rather than fix it.

| Rule | Applies to |
|---|---|
| No horizontal page scroll at any width. `document.documentElement.scrollWidth === clientWidth` | The whole Overview |
| Wide content scrolls **inside its own card**, never the page | AoW rows, status tiles, category bars |
| No px track transcribed from a mockup survives into a task without `minmax()` — **KZ-OAH-1** | Every grid this spec touches |
| Any column holding text is `minmax(0,1fr)`, and text truncates rather than pushing | AoW identity, category names, AoW selector label |
| The new scope control degrades gracefully: label → code-only → icon as the row narrows | The selector |
| Charts size to their content or to a `min-height` — never a hard `height` that reserves space the graph does not use (§3.3) | ToC map, donut, trendline |
| The page ends where its content ends — no viewport-height floor stacked on top of the app chrome | The shell |
| Verified in a real browser at three widths, not in jsdom | Every acceptance criterion below |

**Target widths:** 1440 (design), 1280, 1100 (~~predicted failure band~~ — measured 2026-09-01: overflow is width-independent, see §3.2 banner), 1024 (hero stacks), 768
(tablet — the root guide's floor: *"desktop-first; tablet must work"*). Phone is out of scope, as
today. jsdom measures nothing, so no Jest test can stand in for this — the T-6 field defect passed
every automated gate.

## 6. Non-Goals

- Rewriting the **Reporting** tab — it already owns its multi-select `reportingAowFilter` and is not touched.
- Unifying the two counting universes (results vs planned KPIs) into a single metric.
- Adding the AoW axis to card 4 (category×status matrix) in the first delivery — see Option C.
- Dark mode, new i18n, or changes to card order (deliberately asserted by `OVW-T-3`, CVT-A-3, TCM-R-1, OAH-R-2).

## 7. Affected Users, Systems, And Specs

| Area | Detail |
|---|---|
| Users | A Science Program's reporting focal point; PMU reviewing progress per AoW |
| Client | `program-overview.component.{ts,html}` · `dashboard-lab.component.ts` (owns data and filters) · `programme-results-query-params.ts` (deep-link contract) |
| Server | `results-framework-reporting.service.ts` (`getResultsCountByUnitAndStatus` + the `clarisa-global-units` DTO) — chunk B2 only |
| Prior specs | `changes/overview-aow-progress-hero` (current hero, archived 2026-09-01) · `changes/sp-overview-echarts/results-tab-filter-deeplink` (query-param contract) · `changes/overview-toc-map` |
| Docs to update | `program-overview/CLAUDE.md` · `dashboard-lab/CLAUDE.md` |

## 8. Visual Reference

- **Source:** Claude Design canvas — an **interactive** recreation of the real Overview, not an annotated state sheet.
- **Location:** `docs/specs/changes/overview-aow-cross-filter/mockup/Main.dc.html` (+ `canvas.json`, seeded into `sp01-overview-aow-filter.html`) · published at https://claude.ai/code/artifact/e0a1f5bb-67dd-4809-887c-154d4dcff610
- **Built from source, not from screenshots:** anatomy lifted from `program-overview.component.html` (KPI cards, section tabs, hero rail + row grid, Reporting status tiles, outcomes footer) and tokens verbatim from `src/styles/colors.scss`; root font-size 12px and Manrope / JetBrains Mono as in `fonts.scss`.
- **Covers:** the AoW selector as a second axis beside the section tabs, and the three card states reached by *using* the filter — **filtered** (hero + Reporting status), **not filterable** (`Program-wide` chip on the category matrix), and the per-AoW breakdown that only exists unfiltered. Plus current-state screenshots supplied by the owner (2026-09-01).
- **Sample data:** SP01 figures are the owner's real screenshot values (89 · 45 · 7 · 1% · the five AoW rows). The **per-AoW W1/W2 status split is invented sample data** — that breakdown does not exist yet, which is precisely what chunk B2 builds.
- **Note (KZ-OAH-1, `changes/overview-aow-progress-hero`):** the mockup declares its canvas width in-page. Any px grid track transcribed from it must be re-expressed as `minmax()` before it reaches a task — a fixed track sized on the mockup canvas starves the column at real widths, and no automated gate can see it.

## 9. Requirement Delta Preview

### ADDED

- Single-select AoW control in the Overview header, defaulting to "All areas of work".
- AoW filtering applied to the W3/Bilateral cards (categories, centers, status).
- Per-AoW breakdown in W1/W2 Reporting status.
- Explicit not-filterable state for cards without an AoW axis.
- URL parameter for the selected AoW; propagation to the Results deep-link.
- A responsive contract for the Overview (§5.1) with browser-verified acceptance at five widths.

### FIXED

- **Horizontal page scroll on the Overview (§3.2).** The AoW row's three `max-content` tracks and
  120px bar floor gain shrink behaviour; wide content gets a card-level scroll container. Closes the
  half of KZ-OAH-1 that OAH-T-6 left open.
- **Dead vertical space below the last chart (§3.3).** The ToC map's hard 460px box becomes
  content-driven, and/or the shell's `min-h-screen` stops adding a viewport on top of the app chrome.

### MODIFIED

- The section control now coexists with a second axis (section × AoW); their interaction is defined as **independent**.
- `GET_ClarisaGlobalUnits`: `resultsCount` goes from `{editing, submitted}` to the full status map — an **additive** change; both existing fields are preserved (`result-framework-reporting-galaxy` also consumes them).
- `OverviewLink` gains an `aow` dimension, and `PROGRAMME_RESULTS_QUERY_PARAM_MAP` its parameter.

### REMOVED

- Nothing.

## 10. Approach Options

### Option A — Full cross-filter from the start

One AoW filter governing all five cards, including the category×status matrix.

| | |
|---|---|
| ✅ | The experience the owner describes, complete and without asterisks |
| ❌ | Requires a new ToC join in `getIndicatorContributionSummaryByProgram` — SQL on the module's hottest path |
| ❌ | All-or-nothing: nothing ships until the most expensive piece is ready |
| ❌ | Risk of a lying filter across five cards at once |

### Option B — Layered cross-filter, honest about what it cannot filter ⭐

Two chunks. **B1 (frontend only):** the AoW selector filters W3/Bilateral using `row.acronym`, already on the wire, and focuses the hero; cards with no AoW axis show an explicit *"Program-wide — not broken down by area of work"* state. **B2 (frontend + small server change):** widen `getResultsCountByUnitAndStatus` to all statuses so Reporting status gains its per-AoW breakdown.

| | |
|---|---|
| ✅ | B1 delivers real value with **no server change** — the data is already paid for |
| ✅ | The not-filterable state prevents the failure already documented in this module (P2-3405: a child that cannot see every filter **lies in its empty state**) |
| ✅ | B2 widens an existing, production-proven query; the DTO change is additive |
| ⚠️ | Between B1 and B2 the page carries two behaviours — mitigated by explicit copy |

### Option C — No filter: relate by drill-down

Each hero AoW row navigates to Reporting/Results pre-filtered by that AoW; W1/W2 and W3 gain a "top 3 AoWs" mini-breakdown instead of a global filter.

| | |
|---|---|
| ✅ | Lowest cost; no new global state; reuses the existing `reportingAowFilter` |
| ❌ | Does not answer the question *inside* the Overview — it only shows the exit door |
| ❌ | Leaves the Overview as three aggregates, which is precisely the complaint |

## 11. Recommended Approach

**Option B — but B0 first.**

**B0 (new, from §3.1): fix the overflow before adding the control.** The AoW selector lands in the
tabs row and the scope line adds a band above the hero — both add horizontal pressure to a page that
already overflows between ~1025px and ~1200px. Fixing the row tracks and adding the card-level
scroll container FIRST means the new control is built on a page that holds its width, and it gives
the responsive contract (§5.1) something to be verified against from day one. It is also small:
shrink behaviour on three tracks, one scroll wrapper, no data involved.

Then:

The deciding argument is cost, not taste: in W3 the AoW value **is already in the client today** (`ResultToReview.acronym`), so half the owner's problem is solved with pure frontend work and zero server risk. Starting there validates the interaction pattern before spending a payload change on W1/W2.

And the part that looks most expensive — W1/W2 — is not: the join is already written and in production. It needs widening, not creating.

The rule that makes the option safe is the explicit state: a card that cannot honour the filter **must say so**. This module has already been burned exactly there (P2-3405, `filtersActive` not propagated to the child → a lying empty state), and the trap is recorded in `dashboard-lab/CLAUDE.md`.

## 12. Risks, Dependencies, And Open Questions

| # | Risk / Question | Note |
|---|---|---|
| R1 | **A lying filter.** A card with no AoW axis that looks filtered is worse than having no filter | Mitigation: mandatory not-filterable state, asserted in tests |
| R2 | **89 ≠ 352.** Results-by-status and planned KPIs are different universes; filtering by AoW puts them side by side and invites comparison | Needs explicit copy; product decision |
| R3 | Results spanning **more than one AoW**, or none (`toc_work_packages` via `LEFT JOIN`, and `MAX(twp.acronym)` collapses multiples to one) | ⚠️ Must be confirmed against real data before specifying: `MAX()` over several AoWs is an arbitrary pick, not a rule |
| R4 | `is_aow` has **two opposite conventions** when absent (`dashboard-lab` treats it as cross-cutting; `entity-aow.service` as exclusive to that AoW) | Recorded in `dashboard-lab/CLAUDE.md` (2026-08-26). Do not "harmonize" one side without reading both specs |
| R5 | ~~Cross-cutting rows are not AoWs~~ | **Resolved into §3.1** — they are defined by `wp_id IS NULL`, so every AoW join is blind to them. They become grouped options on a renamed **scope** axis, with a `Not tagged` bucket so the partition is total |
| R8 | §3.3's `min-h-screen` fix lives in `dashboard-lab.component.html`, **shared with the Reporting tab** | Check every `rfrView` before touching it, or verify only the ToC-map half and leave the shell alone |
| ~~OQ1~~ | ~~Single or multi select?~~ | **Resolved 2026-09-01 — single-select.** Keeps the narrative readable ("this is the AOW02 picture") and makes the not-filterable state easy to explain. Reporting keeps its own multi-select |
| ~~OQ2~~ | ~~How do the two axes coexist?~~ | **Resolved 2026-09-01 — two independent axes.** Section tabs choose which cards; the AoW selector filters the data inside them |
| R6 | **The overflow fix trades width for something.** Three `max-content` tracks must give way — either the achievement figures wrap/abbreviate, the Report button becomes icon-only, or the row scrolls inside its card. Each is a visible design decision, not a CSS tweak | Settle it in `design.md` with the owner; the mockup is the place to try them |
| ~~R7~~ | ~~§3.2's failure band derived, not measured~~ | **CLOSED 2026-09-01** — measured: 1470px overflow at 1138px, cause width-independent and unrelated to the tracks (`execution.md` §2). The risk fired exactly as written and the spec pivoted instead of building blind |
| OQ3 | Should the filter survive navigation (URL / session) or reset on program change? | Repo precedent: reset on entity change |
| OQ4 | At 768px the hero has already stacked and the row has full width — does the AoW selector stay inline with the tabs, or move to its own row? | Decide with the responsive pass |

## 13. Success Criteria

1. With a scope selected, W3/Bilateral shows **only** that scope's results, and **all four** of its cards reconcile with each other (categories, centers, status, heatmap — enumeration corrected 2026-09-01, see `requirements.md` `OSF-R-3`).
2. Reporting status (W1/W2) shows the per-scope breakdown, and **it sums to the unfiltered total** — which is only true because Intermediate outcomes, 2030 outcomes and **Not tagged** are buckets in their own right (§3.1). A breakdown of AoWs alone would fall short, and that shortfall is the acceptance test.
3. No card shows a program-wide figure while a scope filter is active without declaring it on screen.
4. Hero AoW numbers are **unchanged** when the filter is "All" (no regression against `changes/overview-aow-progress-hero`).
5. The filter state is shareable by URL and reaches the Results deep-link.
6. **No horizontal page scroll at 1440 · 1280 · 1100 · 1024 · 768**, filter on and off, verified in a real browser — `scrollWidth === clientWidth` on the document element.
7. **The AoW name stays readable at every one of those widths** — it truncates with a tooltip, never collapses and never pushes the row wider (the OAH-T-6 regression must not return).
8. **The page ends where its content ends** — no dead scroll below the last card beyond normal page padding, at every width in criterion 6, and no regression on the Reporting tab if the shell's `min-h-screen` is touched.
9. `npx jest <touched paths>` and `npx ng lint --quiet` green — noting that **no Jest test can cover criteria 6-8**; jsdom measures nothing.

## 14. Next Step

```text
/akili-specify changes/overview-aow-cross-filter
```

OQ1 and OQ2 are resolved. Specify should open with the two checks that need a running app:

1. **Reproduce §3.2** at ~1100px and record the real threshold (**R7**) — it sizes the B0 fix.
2. **Reproduce §3.3** and establish which mechanism dominates — the 460px chart box or the shell's `min-h-screen` — because that picks the fix and its blast radius (**R8**).
3. **Measure the §3.1 reconciliation gap** against real data: how many W1/W2 and W3 results land on an outcome or on nothing, i.e. how big the `Not tagged` bucket actually is. If it is zero, the bucket still ships — it is the guarantee, not the decoration.
4. **Check R3**: how many results touch more than one AoW, given `MAX(twp.acronym)` collapses them to one.

Then settle **OQ3** (filter persistence) and **OQ4** (selector at 768px), and take **R6** — what gives way when the row must shrink — to the mockup.
