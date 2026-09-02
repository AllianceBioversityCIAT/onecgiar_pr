# Overview ToC-Scope Filter — Design

The host (`DashboardLabComponent`) gains one `overviewScope` signal and derives every filtered input from it; `program-overview` stays presentational and receives them. The server gains **one reworked query** that returns `bucket × status` counts for AoWs, outcomes and an untagged residual — computed so the buckets **sum to the card's own total by construction**, not by hope.

## 1. Document Control

| Field | Value |
|---|---|
| **Spec path** | `docs/specs/changes/overview-aow-cross-filter/` |
| **Requirements** | [`requirements.md`](./requirements.md) |
| **Proposal** | [`proposal.md`](./proposal.md) |
| **Visual reference** | [`mockup/Main.dc.html`](./mockup/Main.dc.html) |
| **Depth** | Standard |
| **Status** | `draft` |
| **Owner decisions** | 2026-09-01 — `OSF-OQ-1` reset on program change · `OSF-OQ-2` and `OSF-OQ-3` delegated to design judgment · `OSF-OQ-4` staged, evidence-first |

---

## 2. Executive Summary

Three moves, in dependency order:

1. **Make the page hold its width and end at its content** (`OSF-R-8`, `OSF-R-9`) — before adding a control to the row that already overflows.
2. **Give the host a scope axis** and derive W3 filtering from data already on the wire (`OSF-R-3`) — no server involved.
3. **Widen the server's bucket query** so W1/W2 gains a reconciling per-scope breakdown (`OSF-R-4`).

The architectural constraint that shapes everything: `program-overview` is documented as computing almost nothing — *"every figure arrives as a signal input"* (`program-overview/CLAUDE.md`). This spec honours that. All derivation lives in the host, which already owns the Reporting tab's five filters.

---

## 3. Architecture Overview

```
DashboardLabComponent (host — owns data AND filters)
├── overviewScope: WritableSignal<string | null>        ← NEW, single source of truth
├── scopeBuckets      = computed(...)   ← NEW  partition, from the widened payload
├── overviewAowProgressRich  (existing) → filtered by scope
├── overviewStatusSegments   (existing) → filtered by scope
├── overviewBilateral*       (existing) → filtered by row.acronym
└── <app-program-overview>   presentational
    ├── [scopeOptions] [selectedScope] [scopeBreakdown]   ← NEW inputs
    └── (scopeChange)                                     ← NEW output
```

**Data sources, unchanged in number.** No new HTTP request. `clarisa-global-units` already loads on this route; its payload grows.

| Concern | Source | Change |
|---|---|---|
| Scope options + per-scope status counts | `clarisa-global-units` | **Additive payload** |
| W3 attribution | `GET_ResultToReview` → `ResultToReview.acronym` | **None** — already on the wire |
| Card total to reconcile against | `GET_ScienceProgramsProgress` → `statuses[]` | **None** |
| Planned KPIs per AoW | ToC loads → `indicatorsByAow()` | **None** |

---

## 4. Extended Directory Structure

```
onecgiar-pr-server/src/api/results-framework-reporting/
  results-framework-reporting.service.ts        ← MOD  bucket query + DTO assembly
  results-framework-reporting.service.spec.ts   ← MOD  bucket + reconciliation tests

onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/
  dashboard-lab.component.ts                    ← MOD  scope signal + derivations
  dashboard-lab.component.html                  ← MOD  new bindings
  dashboard-lab.scope.spec.ts                   ← NEW  partition + filtering tests
  components/program-overview/
    program-overview.component.ts               ← MOD  inputs/output, no derivation
    program-overview.component.html             ← MOD  control, chips, no-plan, breakdown, layout ladder
    program-overview.scope.spec.ts              ← NEW  rendering + declaration tests
  CLAUDE.md · components/program-overview/CLAUDE.md ← MOD  folder-doc convention
```

---

## 5. Data Model

No entity, no migration. One payload shape grows.

### `clarisa-global-units` response — additive

```
units[]                       (existing)
  resultsCount                (existing)
    editing:   number         KEPT — same name, same semantics   [OSF-AC-12]
    submitted: number         KEPT
    byStatus:  Record<statusId, number>   ← NEW, all statuses
scopeBuckets[]                ← NEW, the partition
  key:    string              'AOW01' | 'INTERMEDIATE' | 'EOI_2030' | 'UNTAGGED'
  kind:   'aow' | 'outcome' | 'untagged'
  byStatus: Record<statusId, number>
  total:  number
```

**Contradiction resolved 2026-09-01** (raised by `OSF-T-3`'s Implementer, correctly, rather than guessed at): an earlier draft of this shape carried a `label: string` field while the prose below it said the server never sends display copy. **The prose wins and `label` is gone from the wire.** The server sends `key` and `kind`; the client resolves both to copy.

**Bucket labels — resolved on the client** (FIND-08 — the mockup and the earlier draft had drifted). They are **hardcoded, single-homed** in `OVERVIEW_SCOPE_FIXED_LABEL`, not `TermKey`s: `terminology.config.ts` covers exactly one axis (entity naming, `Initiative` ↔ `Science Program/Accelerator`), and these ToC-model terms are identical under both portfolios, so `src/CLAUDE.md` §11's MUST — scoped to *copy that differs between P22 and P25* — does not apply. Settled during `OSF-T-6`, evidence in `execution.md`.

| `key` | Label |
|---|---|
| `AOW*` | the AoW's own name, from the ToC (the client already has it) |
| `INTERMEDIATE` | `Intermediate outcomes` |
| `EOI_2030` | `2030 outcomes` |
| `UNTAGGED` | `Not tagged to a ToC area` — matching the approved mockup, and **literally true** under the corrected `OSF-DD-2b` basis |

**`OSF-DD-1` — `byStatus` is added beside `editing`/`submitted`, never replacing them.** Two shipped consumers read the old fields (`result-framework-reporting-galaxy.component.ts:176`, `entity-aow-card`). Renaming would be a breaking change for zero gain; the duplication is two integers.

---

## 6. Server Design — the bucket query

### The problem the current query cannot solve

`getResultsCountByUnitAndStatus` reaches an AoW through `INNER JOIN toc_work_packages wp ON wp.toc_id = tr.wp_id`. Strategic outcomes are **defined by `wp_id IS NULL`**, so an INNER JOIN cannot return them, and results with no ToC link never enter at all. Widening `status_id IN (1,3)` alone would produce a breakdown that silently omits both.

### `OSF-DD-2` — one query, LEFT JOINs, bucket resolved by CASE, **W1/W2 population only**

Replace the INNER JOINs to `toc_results` / `toc_work_packages` with LEFT JOINs, drop the `status_id` narrowing, and resolve the bucket in SQL:

| Condition | Bucket | Reachable in SQL? |
|---|---|---|
| `wp.acronym` present | that AoW's acronym | yes |
| `tr.wp_id IS NULL` and `tr.category IN ('OUTPUT','OUTCOME')` | `INTERMEDIATE` | yes |
| `tr.wp_id IS NULL` and `tr.category = 'EOI'` | `EOI_2030` | yes |
| no ToC row at all, or no work package matching the year/phase | `UNTAGGED` | **no — see below** |

**FIND-04 correction, as amended by `OSF-DD-2b`.** The `UNTAGGED` row is **not** resolved by the CASE, but the reason changed once the join basis was measured:

- *Originally:* the indicator chain (`results_toc_result_indicators`, `result_indicators_targets`) stayed INNER, so any result not contributing to an indicator target never entered the result set.
- *Now (`OSF-DD-2b`):* the scope-bucket query LEFT-JOINs that chain, so those results **do** enter and land in their real AoW. What still cannot reach a CASE branch is a result with **no `results_toc_result` row at all** — that join stays INNER, because a result with no ToC link has no area to resolve.

Either way `UNTAGGED` is produced only by the residual in `OSF-DD-3`; the table above lists it for completeness of the partition, not as a SQL branch. Under the corrected basis it holds the **82** genuinely link-less results rather than 215 mixed ones.

**FIND-01 correction — the population predicate.** The query MUST carry `r.source IN ('Result')`, matching what the progress endpoint passes (`results.service.ts:1800` → `fundingSource: ['Result']` → `addInGeneric('r.source', …)`, `result.repository.ts:759`). Without it the query counts W1/W2 **and** W3 — `results_toc_result` is shared by both (`result.repository.ts:2970+` joins the same table for bilateral rows) — while the total it reconciles against is W1/W2 only. The residual would then go negative routinely.

The predicate is **single-homed**: exported as one constant consumed by both call sites, so the two populations cannot drift apart in a later edit (`KZ-OAH-3` — a rule with two homes drifts the day one is corrected).

**FIND-06 correction.** The `INTERMEDIATE` condition is taken from `countProgramLevelOutcomes` (`aow-bilateral.repository.ts:256-263`); the `EOI` condition is **adapted, not verbatim** — that source query filters `category = 'EOI'` with no `wp_id` predicate. This design adds `wp_id IS NULL` to keep the buckets mutually exclusive.

**Round-trip budget, corrected after `OSF-T-3`'s review.** `getResultsCountByUnitAndStatus` remains **one query** — that is what `OSF-NFR Performance` binds, and the status-narrowing removal added no join. `getScopeBuckets` issues **two** statements run concurrently via `Promise.all`: the bucket CASE query and the program-total query. They cannot collapse into one without a UNION, because `OSF-DD-3`'s residual compares against a structurally different population (`results_by_inititiative`, not `results_toc_result`). Two concurrent statements cost one round trip's latency, and **no new HTTP request** is added — the NFR holds. Recorded rather than left as the earlier, now-false "still one query" claim.

### `OSF-DD-2b` — two join bases, because the two questions are different (measured 2026-09-01)

`OSF-T-1`'s DB measurement on `SP01` refuted the join basis `OSF-DD-2` inherited. Of 365 W1/W2 results:

| Stage reached down the ToC chain | Count | Has an AoW? |
|---|---|---|
| No ToC link at all | **82** | ❌ |
| ToC link, no active indicator row | **132** | ✅ |
| Indicator, no contributing target | **18** | ✅ |
| Counted by the inherited query | **148** | ✅ |

The inherited query reaches an AoW through **INNER JOINs** on `results_toc_result_indicators` + `result_indicators_targets`, so it counts only results *contributing to an indicator target*. The residual would therefore be **215 (59%)**, and **150 of those have a ToC area** — labelling them `Not tagged to a ToC area` would be false for 70% of the bucket. That is the lying-filter failure arriving through a label instead of a number.

**Decision: two bases, one query is not enough.**

| Consumer | Join basis | Means |
|---|---|---|
| `resultsCount.editing` / `submitted` *(existing)* | **INNER** — unchanged | "results reported against an indicator target" — its shipped meaning, protected by `OSF-AC-12` |
| `scopeBuckets` *(new)* | **LEFT** on the indicator chain | "results attributed to this ToC area", which is what a scope filter must mean |

Under the LEFT basis the residual falls to the **82** results with no ToC link at all (~22%), and `Not tagged to a ToC area` becomes literally true.

**`OSF-DD-2c` — the buckets are per `versionId`, never global.** The measurement above is all-phases; the Reporting-status card is phase-filtered (`v36 Reporting 2026` holds 93 W1/W2 results, consistent with the 89 on screen against 365 across all phases). Both sides of `OSF-DD-3`'s subtraction must carry the same `versionId`, or the residual is meaningless.

**`OSF-DD-2d` — multi-AoW attribution (`OSF-A-1`, measured).** 211 results touch one AoW, **5 touch two, 3 touch three** — 8 of 219, **3.7%**. `MAX(twp.acronym)` collapses them arbitrarily today. Rule: **attribute each result to exactly one AoW, chosen deterministically as the lowest acronym**, and state it rather than inheriting an accidental `MAX()`.

*Rejected alternative:* count such a result in **every** AoW it touches. It is what a user filtering by AoW would expect — but the buckets would then sum above the program total and `OSF-AC-3` would fail. A second rule for filtering and another for the breakdown was also rejected: it produces a filtered count that disagrees with its own breakdown row, which is worse than the limitation. **Accepted limitation, recorded:** for 3.7% of results the breakdown shows one of several true areas.

### `OSF-DD-3` — `UNTAGGED` is a residual over a **matched** population

`OSF-AC-3` demands the buckets sum to the card's total — but the card's total comes from a **different endpoint** (`science-programs/progress`). Two independently-written queries will disagree eventually; that is not a hypothesis, it is what the judgment round found.

So `UNTAGGED` is **not counted directly**:

```
UNTAGGED[status] = programTotal[status] − Σ(AOW*, INTERMEDIATE, EOI_2030)[status]
```

The subtraction is only valid because `OSF-DD-2` now pins both sides to the same population — same program, same `versionId`/phase, same `r.source IN ('Result')`. **The shared predicate is a precondition of this DD, not a detail of the other one.**

A negative residual is then impossible; a negative value means the populations have drifted apart, so treat it as a **defect signal**: clamp to zero, log a warning naming the bucket and status, and let the reconciliation test fail loudly rather than ship a wrong number.

**Rejected alternative:** counting `UNTAGGED` directly with `WHERE rtr.result_toc_result_id IS NULL`. It looks cleaner and is worse — a fourth independent count that can disagree with the other three, which is exactly the failure this DD exists to prevent.

### `OSF-DD-3b` — W3 has its own partition, and it closes trivially

The W3 cards are **not** part of the query above. They partition `bilateralRows()` — an array already in the client — by `row.acronym`, with `null`/empty acronym falling into `UNTAGGED`. Partitioning one array in memory closes by construction with no residual arithmetic at all. Two partitions, two mechanisms, deliberately: the expensive one is only where the data is not already local.

---

## 7. Client Design

### `OSF-DD-4` — scope state lives in the host; `program-overview` stays presentational

`program-overview/CLAUDE.md` records the invariant: *"Computes almost nothing… every OTHER figure arrives as a signal input"*, with `richStats` the single documented exception. Putting filter derivation in the component would break the one invariant its folder doc is built around, and the host **already** owns the Reporting tab's five filters (`dashboard-lab/CLAUDE.md` Contrato). Scope goes where the other filters live.

| Lives in host | Lives in `program-overview` |
|---|---|
| `overviewScope` signal, reset effect, URL sync | Rendering the control, emitting `scopeChange` |
| `scopeBuckets`, `scopeOptions`, `scopeBreakdown` computeds | Rendering the breakdown it is handed |
| Filtering `richRows`, `statusSegments`, bilateral computeds | The `Program-wide` and no-plan treatments |

### `OSF-DD-5` — reset on program change (`OSF-OQ-1`, owner)

`overviewScope` resets to `null` inside the existing center/program-change effect, beside the Reporting filters' own reset. Repo precedent and the owner's decision agree.

### `OSF-DD-6` — filter derivation is a pure helper, single-homed

One exported pure function maps `(rows, scope) → rows` per surface, in a helper file — never inline in a computed and never duplicated between hero and W3. Rationale is `KZ-OAH-3` (a rule with two homes drifts the day one is corrected) and the module's own precedent (`reporting-burndown.ts` is the single home for the zero-target rule).

---

## 8. UX Design

### 8.1 `OSF-DD-7` — the control at each width (`OSF-OQ-2`, design judgment)

**Decision: at `md` (900px) and below, the scope control moves to its own full-width row directly beneath the section tabs.**

Why not keep it inline: the tabs are four items (~380px) and the control ~260px; inline they wrap raggedly and the control ends up looking like the fourth tab's overflow — which actively fights the one thing `OSF-R-1` establishes, that these are **two independent axes**. A dedicated row keeps them legible as two, and full width gives the control a tap target consistent with `docs/ux-ui/design.md` §9's tablet expectations. It also matches §9's stated pattern of collapsing chrome into stacked strips below `md`.

| Width | Layout |
|---|---|
| ≥1280 (`lg`+) | Tabs and control inline, full label |
| 1100–1280 | Inline; label degrades to code + truncated name (`OSF-R-12`) |
| 900–1100 | Inline; label degrades to code only |
| <900 (`md`) | Control on its own full-width row beneath the tabs, full label restored |

### 8.2 `OSF-DD-8` — the AoW row's degradation ladder (`OSF-OQ-3`, design judgment)

> **DEMOTED by the 2026-09-01 pivot, then REACTIVATED 2026-09-02.** This is **not** the fix for `OSF-R-8` — `OSF-DD-14` is. `OSF-T-1` measured the AoW row contributing nothing to the overflow at 1138px, so this DD was demoted to **latent hardening** gated on measurement.
>
> **The gate is now open and the ladder is approved.** `OSF-T-8` (`execution.md` §13) measured the identity column at **0px (1100px)**, **14.3px (768px)** and 1–4 visible characters (900px) — the `max-content` tracks did bite, at three of five widths. Note the mechanism is **starvation, not overflow**: the row never exceeds its container (`OSF-AC-9` is clean everywhere), the rigid neighbours simply leave `minmax(0,1fr)` nothing. Owner chose this ladder over `OSF-DD-10`'s alternatives on 2026-09-02. Everything below stands as written.

**Decision: a priority ladder that sheds the least valuable column first. The row never scrolls horizontally, and `Report` never becomes icon-only.**

The row answers two different questions, and the module's own docs say so: *"one says how much of the plan has been touched, the other how far it got. Neither answers the other's question."* Coverage of the plan (`reported/total`) is the row's subject; achievement against targets is a secondary reading. That ranking decides what goes:

| Width | Row anatomy |
|---|---|
| ≥1280 | identity · bar · figures · achievement (QA + Prel + coverage line) · actions |
| 1100–1280 | coverage subline drops to the row tooltip; QA/Prel stack vertically |
| 900–1100 | achievement column leaves the grid entirely — available in the row tooltip |
| <900 | row stacks to two lines: **① code + name + actions** · **② bar + figures** |

Three things this deliberately does **not** do:

- **No horizontal scroll inside the row.** §9's scroll rule is written for *tables*, where columns are peers. These rows are a comparison list of five: scrolling them sideways destroys the vertical scan that is their entire purpose.
- **`Report` never becomes an icon.** It is the primary action of the page's primary section; the hero's own CTA is *Continue reporting*. Hiding it behind a glyph to save 60px trades the page's job for a layout convenience.
- **Nothing is hidden silently.** Everything shed stays reachable in the row tooltip, per §9's *"never hide columns silently"*.

#### The mechanism is column removal, not track shrinkage (FIND-03 correction)

An earlier draft of this DD presented `minmax(0,1fr) minmax(120px,240px) max-content max-content max-content` as the fix and called it "all shrinkable". **That was false twice over**: the string is byte-identical to the markup shipping today (`program-overview.component.html:397` and `:426`) — i.e. it proposed the broken state as the cure — and a bare `max-content` track is `minmax(max-content, max-content)`, which is **rigid by definition**. Three of those five tracks cannot shrink at all. That rigidity is precisely the hard floor `proposal.md` §3.2 blamed for the bug.

The real mechanism is a **different grid template per breakpoint**, expressed with the file's existing `max-[<px>]:` arbitrary-variant convention (px, never rem — the root font-size is 12px and rem-based breakpoints would not mean what they read as):

| Width | `grid-template-columns` | Row minimum |
|---|---|---|
| ≥1280 | `minmax(0,1fr) minmax(120px,240px) max-content max-content max-content` | ~555px |
| 1100–1280 | same, achievement content restacked (coverage line → tooltip, QA/Prel vertical) | ~495px |
| 900–1100 | `minmax(0,1fr) minmax(120px,240px) max-content max-content` — **achievement track removed from the template** | ~420px |
| <900 | two stacked lines; no shared grid | container width |

**Removing a track is what lowers the minimum.** Nothing here relies on a `max-content` track compressing, because it cannot.

The three surviving `max-content` tracks are left as `max-content` deliberately: their content is short, fixed and must not wrap (`1/110`, a 32px icon button, an 80px `Report`). Making them `minmax(0,max-content)` would let them collapse and clip mid-word — trading a page-level scrollbar for unreadable figures.

**`OSF-T-8` measures the row minimum at every ladder step against the real container width** and records the numbers. The ladder is a hypothesis until those numbers exist; the "Row minimum" column above is derived arithmetic (track floors + 4×16px gaps + 32px padding), **not** a measurement, and `OSF-T-8` either confirms it or the ladder's breakpoints move.

**KZ-OAH-1 compliance:** the two `minmax()` tracks stay; no new fixed px track is introduced; the breakpoint values are chosen against `docs/ux-ui/design.md` §9, not transcribed from the mockup canvas.

### 8.3 `OSF-DD-9` — the two honest states

| State | Treatment |
|---|---|
| **Not filterable** (`OSF-R-5`) | Neutral `Program-wide` pill in the card header + one sentence naming why. Neutral, not brand-coloured — it is a limitation, not a feature |
| **No plan** (`OSF-R-6`) | The hero rail's ring and split counts are **replaced** by an em-dash and one sentence. Never `0%`, never `0 of 0` |

Both are lifted from the approved mockup.

### 8.5 `OSF-DD-12` — URL state, and why half of `OSF-R-7` is deferred (FIND-02)

**The Overview half ships.** The host syncs `overviewScope` to a `scope` query param — free on this route (`phase`, `reviewResult`, `reviewResultId`, `kpi`, `tocView` are taken), written with `replaceUrl: true` so a filter change does not stack history entries, and read once on init so a pasted URL restores the scope. This satisfies `OSF-AC-8`'s first half.

**The propagation half is blocked, and must not be faked.** Writing this DD surfaced what the requirement assumed: the Results tab already *has* the dimension — `ProgrammeResultsFilterDimension` includes `'section'` and `selectedSections` is a live multi-select signal — but it is **inert by construction**:

> *"Section is multi-select (OR within the dimension). Always passes in v1: every row's `section` is `''` because no endpoint exposes the AoW for the full result set (P2-3399)."*
> — `programme-results-filter.service.ts:152-154`

So propagating a scope today would hand the Results tab a filter it cannot honour: every row's `section` is the empty string, so any non-empty selection matches nothing and the user lands on an **empty list**. That is the `R1` lying-filter failure this whole spec is organised against — shipping it to satisfy a checkbox would be the worst possible trade.

**Decision: implement the URL half; defer propagation behind P2-3399.** `OverviewLink` and `PROGRAMME_RESULTS_QUERY_PARAM_MAP` are left untouched — adding a `section` entry that resolves to nothing is worse than not adding it. `requirements.md` `OSF-R-7` and `OSF-AC-8` are amended to match; the deferred half is recorded there with its ticket, not silently dropped.

### 8.6 `OSF-DD-13` — what the scope control actually is (FIND-07)

The control is a **grouped listbox with per-option metadata** — section headers plus a KPI/result count per row. That exceeds `app-pr-select`'s documented contract (`[options]`, `optionLabel`, `optionValue` — a flat list, no group headers, no subtext), so it is **not** built on it, and a bare native `<select>` is forbidden outright (`onecgiar-pr-client/CLAUDE.md` §5: *"never a bare native `<select>`/`<input>`"*).

**Decision:** build it on a **Spartan/Helm popover + listbox**, following `shared/components/global-search-palette/` — the module's existing precedent for a keyboard-first overlay, and the one the client guide points at for exactly this reason (`app-pr-dialog` has no focus trap; Spartan's CDK-backed overlay does). The implementer MUST consult the Spartan MCP for the current component contract before writing markup, per the client guide's standing mandate.

Required ARIA, since `OSF-NFR Accessibility` is otherwise unverifiable:

| Element | Contract |
|---|---|
| Trigger | `role="combobox"`, `aria-expanded`, `aria-haspopup="listbox"`, `aria-controls` |
| Panel | `role="listbox"`, `aria-label` naming the axis |
| Group | `role="group"` + `aria-label` per header — headers are **not** options and MUST NOT be focusable |
| Option | `role="option"`, `aria-selected`, the count exposed in the accessible name |
| Keys | open on `Enter`/`Space`/`↓`; `↑`/`↓` skip headers; `Enter` selects; `Escape` closes and restores focus to the trigger |

Truncated option labels expose their full value (`OSF-R-10`).

### 8.4 Tokens

All values already exist in `src/styles/colors.scss` — `--pr-color-primary-*`, `--pr-surface-*`, `--pr-border*`, `--pr-text-*`, `--pr-status-*`. **No new token.** Tailwind-first with arbitrary px values (root is 12px); icons from `@ng-icons/lucide` (`onecgiar-pr-client/CLAUDE.md` rules 8/19/21).

---

## 9. Layout Fixes

### `OSF-DD-14` — the actual cause of both layout bugs: `sr-only` on a `<table>` (PIVOT, measured 2026-09-01)

**Supersedes `OSF-DD-10` and `OSF-DD-11` as the fix for `OSF-R-8` and `OSF-R-9`.** Evidence: `execution.md` §2 (`OSF-T-1`) and §3 (Pivot Record).

`app-pr-viz-chart` renders an accessibility table as `<table class="sr-only">` (`pr-viz-chart.component.html`). The `.sr-only` rule is correct — `position:absolute; width:1px; height:1px; overflow:hidden; clip-path:inset(50%)` — and **it cannot constrain a `<table>`**: under `table-layout: auto` a specified width is a *minimum*, not a cap (CSS 2.1 §17.5.2). The table therefore lays out at full content size. `clip-path` hides it, so it is invisible; but an absolutely-positioned descendant still expands its ancestor's scrollable overflow when nothing clips it.

Measured on the live Overview at a 1138px viewport, seven such tables (largest **2297 × 936px**):

| Experiment | Overflow-X | `scrollHeight` |
|---|---|---|
| Baseline | **1470px** | 5142 |
| The seven tables neutralised | **3px** | **4260** |

**99.8% of the horizontal overflow and 882 of the 914px of dead space, from one shared component.**

**The fix — wrap, do not restyle the table.** Move `sr-only` onto a wrapping `<div>`; a `div` honours `width:1px`, and the `<table>` inside keeps its semantics for assistive technology.

> ⚠️ **Do not ship `display:block` on the table.** It clips correctly and was used to prove the mechanism in `OSF-T-1`, but it strips table semantics from screen readers — breaking the exact users the table exists for. The wrapper is the fix; the restyle is not.

**Blast radius.** `pr-viz-chart` is shared (`src/app/shared/components/`), so this repairs every charted page in the app, not only the Overview. Kept inside this spec at the owner's direction (2026-09-01), with `OSF-T-2` scoped accordingly.

### `OSF-DD-10` — ~~horizontal~~ *(superseded — retained for the trail)*

> **Superseded by `OSF-DD-14`.** The reasoning below was written from `proposal.md` §3.2's root-cause analysis, which `OSF-T-1` refuted: the AoW row contributes **nothing** to the overflow at 1138px, and the ladder addresses at most 3px of a 1470px defect. The text stands unedited because the trail of why the analysis turned is the asset.

The ladder in `OSF-DD-8` is the fix: **removing the achievement track below 1100px and stacking the row below 900px** lowers the row minimum under the narrowest container it lives in. No card-level scroll container is added to the AoW list — a scroller there would hide the defect rather than remove it.

**Fallback, added by FIND-03.** The ladder rests on derived arithmetic, not measurement, and the failure band itself is still un-reproduced (`requirements.md` §9 accepted risk). So `OSF-T-1`'s measurement gates it: if the measured row minimum at any ladder step still exceeds its container, the breakpoints move — and if moving them cannot close the gap without shedding a column the ladder ranks as essential, the decision returns to the user as a scoped choice (drop the bar, or accept a scroller on the list) rather than being made silently in execution. `OSF-R-8` is a MUST; the ladder is the preferred means, not the requirement.

### `OSF-DD-15` — the residual 16px: a `shrink-0` action group in the program band (measured 2026-09-01, post-`OSF-T-2`)

Fixing `OSF-DD-14` removed 1470px of overflow and **revealed the next contributor**, previously masked by it. Measured on the same live page at 1138px:

| Element | Right edge |
|---|---|
| Every ancestor from `<nav>` upward | **1139** — the layout container is correct |
| `div.ml-auto.flex.items-center.gap-[8px]` (action group) | **1107** — inside the viewport |
| `button.pr-band-fade` ("Report emerging result") | **1155** — 48px past its own parent, 17px past the viewport |

**Root cause.** In `reporting-program-band.component.html:195-214`, the collapsed band's action group is a flex row that **is allowed to shrink**, while both of its children carry **`shrink-0`** (the Back button at `:198` and the CTA at `:211`). Their combined intrinsic width (~400px) exceeds the 356px the group is squeezed to, so the children overflow their own parent to the right and out of the page.

**The popover is not the cause.** The `w-[220px]` tooltip inside the CTA is `absolute right-0`, so it shares the button's right edge and extends *leftward*; it adds nothing. It is worth one note all the same: it computes to **`opacity: 0`** — invisible, but fully laid out. That is the **same failure class as `OSF-DD-14`**: an element nobody can see, expanding the page's scroll area. Two independent instances in one spec is a pattern, not a coincidence, and it belongs in the kaizen.

**Direction (the task settles it against measurement).** Three candidates, in order of preference:

1. **`shrink-0` on the group itself**, letting the nav's other items absorb the squeeze — smallest change, but only correct if those items can actually shrink.
2. **Let the CTA label truncate** — keeps every control reachable; costs label legibility at narrow widths.
3. **Wrap the nav below a breakpoint** — most robust, largest visual change.

Clipping the band with `overflow-x: hidden` is **rejected**: the tooltip is a real overlay that must escape the band when shown, and clipping would cut it off.

**Blast radius.** `reporting-program-band` is shared with the **Reporting** tab, so the fix must be verified on both surfaces — the same trap `OSF-DD-11` step 2 avoided by measuring first.

### `OSF-DD-11` — vertical, resolved by measurement (`OSF-OQ-4`)

The staging worked exactly as designed: it deferred a shared-shell change until evidence justified it, and the evidence said **don't**.

| Step | Original plan | `OSF-T-1` verdict |
|---|---|---|
| 1 | ToC map: hard `height="460px"` → `min-height` floor | **Kept, demoted to minor.** Real but second-order — 460px reserved against a 936px table. Worth fixing: the chart renders **no `<canvas>` at all**, so it reserves that height for nothing |
| 2 | *Conditional* — shell `min-h-screen` | **Deleted.** Measured `min-height: 1137.6px` against an actual shell height of **4134px** — the floor is never reached, so it cannot contribute. `dashboard-lab.component.html` is **not touched**, and the Reporting tab is not put at risk |

`OSF-OQ-4` is therefore answered by measurement rather than judgment, and the dominant vertical cause is `OSF-DD-14`.

---

## 10. Design Decisions Index

| ID | Decision | Drives |
|---|---|---|
| `OSF-DD-1` | `byStatus` added beside `editing`/`submitted` | `OSF-R-4`, AC-12 |
| `OSF-DD-2` | One LEFT-JOIN query, bucket by CASE, `r.source IN ('Result')` single-homed | `OSF-R-2`, `OSF-R-4` |
| `OSF-DD-2b` | **Two join bases** — INNER keeps the legacy counts, LEFT feeds the scope buckets | `OSF-R-2`, `OSF-R-4`, AC-3, AC-12 |
| `OSF-DD-2c` | Buckets and total both scoped by `versionId` | AC-3, AC-5 |
| `OSF-DD-2d` | Multi-AoW results attributed to the lowest acronym, deterministically | `OSF-R-2`, AC-3 |
| `OSF-DD-3` | `UNTAGGED` as a residual over a **matched** population | `OSF-R-2`, AC-3 |
| `OSF-DD-3b` | W3 partitions its own local array — no residual needed | `OSF-R-2`, `OSF-R-3`, AC-4 |
| `OSF-DD-4` | Scope state in the host; component stays presentational | `OSF-R-1` |
| `OSF-DD-5` | Reset on program change | `OSF-R-1` |
| `OSF-DD-6` | Filter rule single-homed in a pure helper | `OSF-R-3`, `OSF-R-4` |
| `OSF-DD-7` | Control drops to its own row below `md` | `OSF-R-12`, AC-9 |
| `OSF-DD-8` | Row ladder — **ACTIVE** (gate opened by `OSF-T-8` 2026-09-02); not the `OSF-R-8` fix (pivot) | `OSF-R-10`, `OSF-R-11`, AC-10 |
| `OSF-DD-9` | Program-wide and no-plan treatments | `OSF-R-5`, `OSF-R-6`, `OSF-R-14` |
| `OSF-DD-10` | ~~Ladder is the horizontal fix~~ — **superseded by `OSF-DD-14`** | — |
| `OSF-DD-11` | Vertical: shell step **deleted** by measurement; ToC-map height kept as minor | `OSF-R-9`, OQ-4 |
| `OSF-DD-14` | **`sr-only` on a `<table>` — the real cause of both layout bugs**; fix by wrapping | `OSF-R-8`, `OSF-R-9`, AC-9, AC-11 |
| `OSF-DD-12` | URL `scope` param ships; deep-link propagation deferred behind P2-3399 | `OSF-R-7`, AC-8 |
| `OSF-DD-13` | Spartan popover + listbox with a specified ARIA contract | `OSF-R-1`, `OSF-R-10`, `OSF-R-12`, a11y NFR |

**Coverage of the remaining requirements** (FIND-05): `OSF-R-11` (hero narrows to the selected scope) is delivered by `OSF-DD-4`'s host filtering of `richRows` and shown in the ladder's identity column; `OSF-R-13` (reconciliation stated in words) is the sentence beneath the breakdown specified in `OSF-DD-3` and rendered in the mockup; `OSF-R-14` (`Not tagged` selectable) is `OSF-DD-9`'s no-plan treatment plus its option row in `OSF-DD-13`'s listbox. All fourteen `OSF-R-*` ids now map to at least one DD.

**No TRD ADR is superseded.** These are spec-level decisions within the existing client/server architecture.

### Reversion challenge (Step 2.3)

`OSF-DD-11` step 1 removes a shipped fixed height, and `OSF-DD-2` removes a shipped `status_id IN (1,3)` narrowing. Challenge — *what does removing this break?*

| Removal | Answer |
|---|---|
| ToC map `height="460px"` | ECharts needs a resolved height at init or it renders 0px. **Mitigation: a `min-height` floor, not an unset height** — folded into `OSF-DD-11` step 1 |
| `status_id IN (1,3)` | The two existing `resultsCount` fields must keep meaning *editing* and *submitted* specifically. **Mitigation: `OSF-DD-1` keeps them as named projections of `byStatus`**, asserted by AC-12 |

Both challenges named a real breakage; both are addressed in the design above rather than left for execution to discover.

---

## 11. Budget (Step 2.4 tripwire)

| Signal | Estimate |
|---|---|
| **Tasks** | 8 |
| **LOC** | **~880** (≈600 production, ≈280 tests) — revised by the 2026-09-01 pivot |
| **Review rounds** | ≤1 per task |

*Revised after judgment round 1:* `OSF-DD-13`'s Spartan listbox with a full ARIA contract costs more than the inline control the first estimate assumed (**+90**); `OSF-DD-12` deferring deep-link propagation returns a little (**−20**).

*Revised again by the 2026-09-01 pivot:* `OSF-T-2` collapses from ~90 LOC of responsive grid work to **~15 LOC** in one shared component plus its regression test (**−140**), because `OSF-DD-14` replaced the wrong target with the right one.

`/akili-execute` escalates to the user if actuals exceed these. The number is above the 400-LOC single-PR threshold — see the PR strategy in `tasks.md`.

**Depth re-check:** the finished design confirms **Standard**, not Lite (a server query change plus a shared-shell risk) and not Full (no migration, no new module, no new endpoint, no rollout flag).

---

## 12. Testing Strategy

| Defect class (`requirements.md` §9) | Where it is caught |
|---|---|
| D1 partition/derivation | Jest on the pure helpers and host computeds |
| D2 server buckets | Jest on the service + **one executed query** against a real DB in `OSF-T-3` |
| D3 payload regression | Jest asserting `resultsCount.editing`/`submitted` survive |
| **D4 layout** | **`OSF-T-8` browser measurement only** — jsdom returns `0` for every box metric; a Jest assertion here would pass on a broken page. *The pivot proved this the hard way: the design's root cause survived a full Judgment Day round and died to the first real measurement* |
| **D5 lying filter** | Jest asserts the pill exists; **`OSF-T-8` confirms the figures behind it** |
| D6 contrast/focus | `OSF-T-8` screenshots + T6 visual review |

**The reconciliation test is the spec's keystone:** `Σ(buckets) === programTotal` per status and overall, on fixtures that include an outcome-tagged and an untagged result. If that test is missing, `OSF-AC-3` is unverified regardless of what else is green.
