# Design — Overview tab breakdown charts

## Context

**The Overview tab is `ProgramOverviewComponent`, not `EntityDetailsComponent`.** This is the
single most expensive thing to get wrong here, so it is stated first.

- Route `entity-details/:entityId/overview` (`shared/routing/routing-data.ts:574-581`,
  `data: { rfrView: 'overview' }`) loads **`DashboardLabComponent`**.
- `DashboardLabComponent` gates on `showOverview = computed(() => this.rfrView() === 'overview')`
  (`dashboard-lab.component.ts:256-268`) and renders `<app-program-overview>` at
  `dashboard-lab.component.html:1163-1170`.
- `pages/entity-details/` is **retired and unrouted**. The comment at `routing-data.ts:597` says
  it verbatim: *"The legacy `EntityDetailsComponent` (Insights bento) is retired and no longer
  routed — the file is kept in the tree."* Its `AGENTS.md` still documents it as live, and the
  OpenSpec change `guided-result-reporting-flow` still treats it as the Overview. Both are stale.

**Data flow today.** `DashboardLabComponent` (2100 LOC) is the only owner of state; the child is
purely presentational, taking eight signal `input()`s and deriving geometry in `computed()`s and
plain methods. There is no Overview service.

| Card | Parent computed | Endpoint |
|---|---|---|
| About this program | `selected()` → `[programName]`/`[programDescription]` | `GET_ScienceProgramsProgress()` |
| Reporting status | `overviewStatusSegments` (`:859-881`) | `GET_ScienceProgramsProgress()` |
| Reporting pace | `overviewPaceSeries` (`:963-982`) | + `GET_versioning` via `PhasesService` |
| Progress by AoW | `overviewAowProgress` (`:887-905`), `overviewXcutProgress` (`:908-919`) | `GET_ClarisaGlobalUnits`, `GET_TocResultsByAowId` |
| Needs attention | `overviewAttention` (`:922-940`) | derived — no endpoint |
| Countries reached | **input never bound** | none |
| Results by indicator category | `overviewCategories` (`:943-955`), `.slice(0, 4)` | `GET_IndicatorContributionSummary(code)` |

**Verified live on prtest (SP02), so the numbers below are measured, not assumed:**

- `GET api/results-framework-reporting/programs/indicator-contribution-summary?program=SP02` →
  `totalsByType[]` with **8** result types (Capacity sharing 6, Innovation development 15,
  Innovation Packages 1, Innovation use 6, Knowledge product 6, Other outcome 1, Other output 10,
  Policy change 5). `groupedSummaries()` drops `'Innovation Use(IPSR)'`.
- `GET api/results/by-program-and-centers?programId=SP02` → 20 project groups, **142** results,
  7 categories, roles `{'1','Primary submitter'} × 134`, `{'2','Contributor'} × 8`, statuses
  `{'5','Pending Review'} × 132`, `{'6','Approved'} × 10`.
- **`initiative_role_id` and `status_id` arrive as STRINGS** (`'1'`, `'5'`), not numbers. Existing
  code in `result-review-drawer.component.ts:1100-1106` compares `initiative_role_id === 1`
  (strict, numeric) — that comparison is always false against this payload. Do not copy it.
- Both endpoints return the **same result-type vocabulary**, so placing the own-results card and
  the bilateral card side by side compares like with like. The mislabel (`indicator_category`
  actually carrying a result-type name) is real but symmetric, and therefore not a blocker here.

**Constraints.** Angular 21.2 standalone + signals + OnPush; Tailwind 4.3 with preflight ON;
Spartan UI; PrimeNG absent; `html` is 12px so only arbitrary px values; no raw hex in components;
icons from `@ng-icons/lucide` only; Jest with a 50/60/60/60 coverage gate.

## Goals / Non-Goals

**Goals**

- Make the Overview tab match the approved live design's `showOverview` block exactly, in card
  order, spans, copy and geometry.
- Delete the three removed cards and every line of code that existed only to serve them.
- Add the three bilateral figures P2-3302 names, from existing endpoints, with no server change.
- Keep every control the design shows visible — either working, or disabled with `Coming soon`.
- Leave the touched folder documented so the next ticket does not re-derive the routing trap.

**Non-Goals**

- Touching `pages/entity-details/` at all. It is dead code; deleting it is a separate decision.
- Any server change, including the two backend defects this change documents.
- Building the Results tab (P2-3394) or its category filter — a parallel workflow owns that.
- Restoring "Countries reached" under a new name. It was never wired; P2-3299 removes it.
- Adding a reusable bar component. None exists; §D2 explains why this change does not create one.

## Decisions

### D1 — Plain DOM bars, not `chart.js`. (Both external advisors concurred; taken.)

`chart.js` 4.5.1 + `chartjs-plugin-datalabels` are dependencies, and two components use them:
the retired `entity-details` page (2 canvases, `indexAxis:'y'`, stacked status breakdown) and the
live `result-framework-reporting-insights` (a doughnut + a %-completion bar). Neither draws a
plain count-by-category bar.

**The decisive argument:** the design's row is a focusable `<button>` carrying a truncated label
with a tooltip, an 8px rounded track, and a monospace count. `chart.js` paints one `<canvas>` —
there is no per-row element to focus, no text node to hang a tooltip on, one accessible name for
the whole graphic, and hit-testing by pixel coordinate. Making canvas rows keyboard-accessible
means overlaying invisible DOM buttons, i.e. rebuilding the list *and* keeping a canvas.

Supporting evidence, in the codebase's own voice:

- The precedent is unambiguous: ~25 CSS track+fill bars across `result-framework-reporting/`
  versus 4 canvases in the entire app, and the newer the surface the more likely it is CSS.
  `program-overview` alone has five (status meter, AoW ×2, countries, categories).
- House hard rule #15 permits exactly this encoding: *"Continuous bars only on group headers,
  where the number is a count of results and therefore a true proportion."* A count-by-category
  distribution is that case; it is not a target-progress meter.
- `chart.js` here costs an `isPlatformBrowser` guard, a `Chart.register`, `ViewChild` +
  `chartsViewReady` gating, manual `destroy()`, and `getComputedStyle` to drag `--pr-*` tokens
  into the canvas (`insights.component.ts:131-137`). The DOM version inherits tokens,
  `motion-reduce:` and hydration for free.
- `AGENTS.md:1384` scopes the dependency narrowly to *"entity-details charts"* — it was never a
  general charting choice.

*Alternatives rejected:* a dot plot / lollipop (the exact count must be shown regardless, and the
row still needs a stable click target, so the bar costs nothing extra); a ranked table with no bar
(loses the proportion the design uses to rank at a glance); a new `<app-pr-bar>` shared component
(the idiom is three lines of Tailwind used in ~25 places with two different normalisation rules —
extracting it is a repo-wide refactor, out of scope for a five-ticket UI change).

### D2 — Normalise against the series maximum, not against the total.

The existing `countryWidth` (`:243-245`) and `categoryHeight` (`:250-252`) both divide by the
series **max**, while `percentOf` and `segmentWidth` divide by the **total**. For a category
breakdown the max is right: it makes the largest bar full-width so the ranking reads instantly,
which is what the design shows. Guard the denominator with `Math.max(..., 1)` exactly as
`categoriesMax` already does, so an all-zero series yields 0-width bars instead of `NaN`.

Compute the max in a `computed()` and the per-row width in a method, matching the file's existing
shape. Never divide in the template.

### D3 — `[style.width.%]`, never a dynamic Tailwind class.

Tailwind 4 generates arbitrary values by scanning source text, so `w-[{{pct}}%]` is invisible to
the compiler and renders an empty bar. Tailwind 4's CSS-variable form is `w-(--foo)`, not the v3
`w-[--foo]`, and is unused in this repo. `[style.width.%]="pct"` is what all five existing bars
in this file already do — a percentage of a sibling maximum is data, not a theme token.

Keep arbitrary **px** for every size and type utility (`h-[8px]`, `text-[14px]`): rem utilities
land 25% short because `html` is 12px.

### D4 — Add one token for the design's muted violet; do not substitute. (DeepSeek's call taken over Grok's.)

The design fills bilateral bars with `#8B7CC4`. That hex is not a token; it appears in
`colors.scss:210` only as a **retired** value — `--pr-sidebar-fg-subtle: #a79bd4; // was #8b7cc4 —
failed AA on both sidebar surfaces`.

Two house rules collide: *"no hardcoded hex in components"* and *"if the mockup and the code
disagree, the mockup wins"*. Both are satisfied by adding a token, so:

Add to the Charts block of `src/styles/colors.scss`:

```scss
// Bilateral series — pairs with --pr-chart-2 for own results. NON-TEXT USE ONLY:
// 3.52:1 on the --pr-border-divider track, clears WCAG 1.4.11 (3:1) for graphics.
// This exact hex failed AA as a sidebar FOREGROUND (see --pr-sidebar-fg-subtle) — never
// use it for text.
--pr-chart-2-muted: #8b7cc4;
```

Contrast measured on the `#eeeef1` track: `#6B46E5` = **5.59:1**, `#8B7CC4` = **3.52:1**,
`--pr-chart-3 (#9270f0)` = **3.50:1**. The previous AA failure was a *text* failure on dark
sidebar surfaces; this is a non-text graphic on white, a different success criterion.

*Grok's alternative — reuse `--pr-color-primary-100/200`, or `--pr-chart-3` — is rejected:* the
measured contrast is a dead heat (3.50 vs 3.52), so substituting buys no accessibility and only
changes a colour the approved design chose deliberately to separate "own" from "bilateral". The
one-line token is cheaper than a design deviation.

Also: replace the `bg-[#F3F2F7]` track inherited from the countries block with
`bg-[var(--pr-border-divider)]` (`#eeeef1`) — which is what the design actually specifies, and
removes the template's last raw hex.

### D5 — The un-ticketed status-dot sub-list ships visible-but-disabled with `Coming soon`. (DeepSeek taken, Grok rejected.)

The advisors split here. Grok argued to **drop** it: it duplicates the *Reporting status* legend
that already lives on this tab, no ticket asks for it, and `Coming soon` in this app has been
reserved for committed features. DeepSeek argued to **ship it disabled** with a follow-up ticket.

**Taken: disabled + `Coming soon` + ticket.** The house rule for this exact situation is not
advisory — a design control needing unconfirmed work is left *visible but disabled, exactly where
the design puts it*, and becomes a Jira ticket, precisely so it is neither invented nor silently
dropped. Grok's objection is not discarded, though: *"it duplicates the Reporting status legend"*
is the strongest argument for closing the ticket as unnecessary, so it goes **into** the ticket as
the question Ángel is asked to settle. That converts a disagreement into a documented decision
instead of a silent deletion.

Note this is a scope decision, not a technical one: the histogram is fully derivable client-side
(prtest SP02 → Pending Review 132 / Approved 10, filtered to role `'1'`).

### D6 — Row click-through ships disabled too, with one dependency to re-check at apply time.

P2-3303 asks only to move the chart; `rc.open` is design-only. The plausible destination is the
Results tab's category filter — **P2-3394, `Open`, and being built right now** (an untracked
`pages/programme-results/` exists in the working tree).

So: render each row as `<button type="button" disabled>` preserving the design's exact visuals,
with one `Coming soon` chip beside the card heading. **At apply time, re-check whether
`programme-results` has landed with a category filter**; if it has, wire `rc.open` to it and drop
the chip. If it has not, the chip and the ticket stand.

*Considered and rejected:* rendering the rows as inert `<div>`s. It matches today's non-clickable
AoW rows and would look finished, but it hides from the user that a control was specified — the
opposite of what the house rule asks for.

### D7 — Delete the dead code, do not leave orphaned inputs. (Both advisors concurred; taken.)

Removing a card means removing its `input()`, its interfaces, its geometry, its parent computed
and its icon registrations. Leaving `paceSeries`/`attention`/`countries` behind as unbound inputs
would preserve ~120 LOC that no template reads, keep four lucide icons registered for nothing,
and — because the coverage gate counts them — force tests for UI that no longer exists.

`ProgramOverviewComponent` should end up *smaller* than it started: out go `PaceSeries`,
`paceMetrics`, `paceHeadline`, `paceSub`, `paceChart`, `CHART_W/H/BASE/TOP_PAD`, `round1`,
`AttentionKind`, `AttentionRow`, `ATTENTION_STYLE`, `attentionIcon`, `attentionColor`, `CountryRow`,
`countriesReached`, `countriesMax`, `countryWidth`, and the `NgIcon` import if no icon survives.

### D8 — Rewrite the spec deliberately; it is designed to fail on exactly this change.

`program-overview.component.spec.ts:44-55` asserts the six `<h2>` headings **in order**. That is
a feature: it makes any reordering an explicit decision. Update it to the new six in the new
order, delete the pace-copy block (`:135-198`, ~60 lines of exact strings), the `AttentionKind`
icon block (`:117-133`) and the `countryWidth`/`categoryHeight` assertions (`:80-85`), and add
coverage for the new bar-width maths and the disabled controls.

Signal inputs are read-only — set them with `componentRef.setInput()`. Per house rule #25, run
only the touched spec, never the suite.

### D9 — A11y: the button carries the meaning, the bar is decorative.

`aria-hidden="true"` on the track and fill; the accessible name comes from the button's own text
(label + count), with an `aria-label` when the visible label is truncated. No `role="meter"` on a
fill nested inside a button — nested roles confuse the accessibility tree, and the count is
already exposed as text.

Focus must not rely on the violet halo: `colors.scss` records that at 28% alpha it composites to
1.53:1, far under the 3:1 floor. Pair it with a solid outline, as Helm's own recipe and the
sidebar do. A `disabled` button is not focusable, which is correct for D5/D6 — the `Coming soon`
chip, not the row, is what tells the user why.

## Risks / Trade-offs

- **"Tagged" silently means "tagged and reached review."** `result.repository.ts:2844` filters
  `status_id IN (5,6,7)`, so bilateral results in Editing/Submitted/Draft never appear. P2-3302
  says "where my P/A was tagged", full stop. → Ship the number the only available endpoint can
  give, state the limitation in the Technical documentation subtask, and raise it as an open
  question. Do **not** relabel the card on our own initiative.
- **Contributor is inferred as "not primary."** Roles observed on prtest are only `'1'` and `'2'`.
  → Filter `String(initiative_role_id) === '2'` and surface `initiative_role_name` in the label
  rather than hardcoding "Contributor", so a third role would show up rather than be absorbed.
- **String vs number ids.** `initiative_role_id`/`status_id` are strings on the wire, and existing
  drawer code already gets this wrong with `=== 1`. → Compare as strings, and cover it in the
  spec with a fixture that uses string ids.
- **Downloading 142 rows to render 3 numbers.** No aggregate endpoint exists. →
  `BilateralResultsService.refreshAllResultsForCounts()` already makes this exact call, so reuse
  its result rather than issuing a second one; note the missing aggregate endpoint as debt.
- **Removing "Needs attention" removes the only nudge on the tab.** → Accepted: P2-3300 is
  explicit, and both of its signals remain visible in the two neighbouring cards.
- **The spec rewrite could mask a real regression.** → Rewrite it heading-by-heading against the
  design rather than deleting assertions until green.
- **Concurrent workflow.** It owns `reporting-aow-table/`, `reporting-program-band/`,
  `reporting-nav-sidebar/`, `routing-data.ts`, `pages/programme-results/`. This change owns
  `program-overview/`, `dashboard-lab.component.{ts,html}`, one interface file, `colors.scss`. →
  Disjoint, but re-run `git status` before the first edit; `dashboard-lab.component.ts` is the
  only plausible collision point.

## Migration Plan

Frontend-only, no data migration, no feature flag. Rollback is reverting the commit. The three
removed cards leave no persisted state — every figure was derived per-render.

## Open Questions

1. **Does "number of results where my P/A was tagged" (P2-3302) mean all bilateral results, or
   only those that have reached review?** Only the second is answerable today. Needs Nicoleta or
   Santiago. Blocks nothing — ship the available number, documented.
2. **Is the "Of those where this program is primary" status breakdown wanted at all,** given that
   *Reporting status* already shows a status legend on the same tab? → Ángel's ticket (D5).
3. **Where should a category row navigate?** → Ángel's ticket (D6), resolvable by P2-3394 landing.
4. **Should the own-results card keep dropping `Innovation Use(IPSR)`** (current
   `groupedSummaries()` behaviour) now that the card is full-height and uncapped? Assumed yes —
   preserving existing behaviour is the minimal change — but it is an assumption, not a decision.
5. **Should there be a "Revamp - Science Program shell: Overview tab" user story** under P2-3172,
   as the sibling of P2-3394 for the Results tab? None exists. Recommended, not created here.
