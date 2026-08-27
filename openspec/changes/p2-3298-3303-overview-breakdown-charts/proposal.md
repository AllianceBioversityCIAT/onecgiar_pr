# Overview tab: breakdown charts replace the three cards end users asked us to remove

**Scope: FRONTEND-ONLY** (`onecgiar-pr-client`). No server change is required — every figure is
derivable from endpoints that already exist. One backend *data-quality* defect is identified and
handed to the user in "Impact"; it is not fixed here.

**Jira:** P2-3298, P2-3299, P2-3300, P2-3302, P2-3303 — all five children of P2-3273
*"Small adjustment for reporting tool in 2026"*, all reported by Nicoleta, all `Open`.

## Why

Four end-user tickets ask for the same thing from opposite ends: three cards on the Science
Program **Overview** tab should go, and the breakdown that people actually use should be promoted.
The removals are not cosmetic — each removed card is either redundant or dishonest:

- **Reporting pace** (P2-3298) draws a sparkline that is not a time series. The component's own
  comment admits it: the progress endpoint returns only *current* status counts, so the line is a
  straight ramp from 0 to today's total. Users asked us to stop projecting a deadline from data
  we do not have.
- **Needs attention** (P2-3300) restates two neighbouring cards. Its three derived rows are
  Editing / Not-started counts (already the *Reporting status* meter) and empty-AoW counts
  (already `0/N` in *Progress by area of work*).
- **Impact so far** (P2-3299) is half dead already: `DashboardLabComponent` never binds
  `[countries]`, so "Countries reached" has always rendered its empty state in production. The
  other half is the *Results by indicator category* chart that P2-3303 wants promoted anyway.

Meanwhile P2-3303 asks for *Results by indicator category* to sit "prominent … under about this
program", and P2-3302 asks for W3/Bilateral reporting to become visible on this tab at all — four
named figures that the Overview does not show today in any form.

## What Changes

**Removals** (each cites its authorising ticket)

- **BREAKING (UI)** Remove the *Reporting pace* card and all its geometry — `PaceSeries`,
  `paceMetrics`, `paceHeadline`, `paceSub`, `paceChart`, the SVG sparkline, and the parent's
  `overviewPaceSeries` computed. — **P2-3298**
- **BREAKING (UI)** Remove the *Needs attention* card — `AttentionKind`, `AttentionRow`,
  `ATTENTION_STYLE`, `attentionIcon`, `attentionColor`, the four lucide icon registrations that
  become unused, and the parent's `overviewAttention` computed. — **P2-3300**
- **BREAKING (UI)** Remove the *Impact so far* card, both halves — `CountryRow`,
  `countriesReached`, `countriesMax`, `countryWidth`, and the never-bound `countries` input. This
  also deletes the only raw hex left in the template (`bg-[#F3F2F7]`). — **P2-3299**

**Promotion and re-draw**

- Promote *Results by indicator category* out of *Impact so far* into its own `col-span-6` card
  placed **directly under *About this program***, exactly where P2-3303 asks for it. — **P2-3303**
- Re-draw it from vertical columns to **horizontal proportional bars**: label (truncated,
  `title` tooltip), an 8px rounded track, a fill sized against the series maximum, and a
  right-aligned monospace count. This follows the approved live design; P2-3303 itself only asks
  for the move, so the orientation change is recorded here as a **design amendment** rather than
  claimed as ticket scope.
- Drop the `.slice(0, 4)` cap in `overviewCategories`. The cap existed only because four 88px
  vertical columns were all that fitted; SP02 has 8 categories on prtest, so the cap was hiding
  half the data. Show every category with a non-zero count, sorted descending.
- *Reporting status* grows `col-span-8` → `col-span-12`, because the 4-column *Reporting pace*
  that sat beside it is gone and must not leave a hole.

**Additions**

- New card *Bilateral results by indicator category* (`col-span-6`), same horizontal-bar row
  pattern in a muted violet, with the design's subtitle and a one-line empty state. — **P2-3302**
- New card *Bilateral contributions* (`col-span-6`) listing the three counts P2-3302 names
  verbatim: results where this program is **tagged**, where it is **Primary**, and where it is a
  **Contributor**. — **P2-3302**

**Ships visible but DISABLED with a `Coming soon` tag** (design shows it, no ticket authorises it)

- The *"Of those where this program is primary"* status-dot sub-list inside *Bilateral
  contributions*. P2-3302 names four figures and a review-state histogram is not among them.
  The data is derivable, so this is an unconfirmed-scope decision, not a technical blocker.
- Row click-through (`rc.open`) on both category cards. P2-3303 asks only to move the chart. The
  natural destination is the Results tab of P2-3394, which is `Open` and being built in parallel;
  until it lands with a category filter there is nowhere to navigate.

Both become notification tickets for Ángel Alberto Jarrín Rivas, per the house rule.

## Capabilities

### New Capabilities

- `program-overview-breakdowns`: what the Science Program Overview tab shows, in what order, and
  how each proportional breakdown row is computed, rendered and made accessible — including which
  controls ship disabled and why.

### Modified Capabilities

- (none — no archived master spec covers this surface yet)

## Impact

**Client code**

- `pages/result-framework-reporting/pages/dashboard-lab/components/program-overview/program-overview.component.ts` — net **shrinks**: ~120 LOC of pace/attention/country geometry out, ~40 LOC of bar-row geometry in.
- `.../program-overview/program-overview.component.html` — six cards → six cards, but three are new and the grid order changes.
- `.../program-overview/program-overview.component.spec.ts` — **will fail until rewritten.** It asserts the exact six `<h2>` headings in exact order (`:44-55`), `categoryHeight(max) === 130`, `countryWidth` ratios (`:80-85`), the three `AttentionKind` icons (`:117-133`), and ~60 lines of exact pace copy (`:135-198`).
- `.../dashboard-lab/dashboard-lab.component.ts` — drop `overviewPaceSeries`, `overviewAttention`; un-cap `overviewCategories`; add the bilateral computeds.
- `.../dashboard-lab/dashboard-lab.component.html:1163-1170` — rebind the child's inputs.
- `.../bilateral-results/.../result-review-drawer.interfaces.ts:5-19` — widen `ResultToReview` with `initiative_role_id` / `initiative_role_name`, which the backend already sends.
- `src/styles/colors.scss` — one new chart token (see design.md D4).

**APIs — all existing, GET only, no new endpoint**

- `GET_IndicatorContributionSummary(code)` → `api/results-framework-reporting/programs/indicator-contribution-summary?program=` — already feeds the own-results card.
- `GET_ResultToReview(programId)` → `api/results/by-program-and-centers?programId=` — feeds all bilateral figures. Verified on prtest for SP02: 142 results, 7 categories, roles `'1' Primary submitter` × 134 / `'2' Contributor` × 8.

**Handed to the user — backend defects/limitations found, NOT fixed here**

1. `results.service.ts:3234` overwrites the SQL's real ToC-indicator `type_name`
   (`result.repository.ts:2778-2781`) with `row.result_category`, so the field named
   `indicator_category` actually carries the **result-type** name. Verified harmless *for this
   change* — the own-results endpoint returns the same result-type vocabulary, so the two cards
   sitting side by side compare like with like. It remains a mislabel worth a one-line server fix.
2. `result.repository.ts:2844` filters `r.status_id IN (5,6,7)`, so bilateral results still in
   Editing / Submitted / Draft are invisible. The "tagged" count therefore means "tagged **and
   reached review**". Needs a product decision (see design.md, Open Questions).

**Docs**

- `openspec/config.yaml` still describes the client as "Angular 19 SPA. PrimeNG 19" — stale since
  the Angular 21 + Spartan migration. Flagged, not edited (shared config, concurrent workflow).
- `openspec/changes/guided-result-reporting-flow/design.md:5` describes the **retired, unrouted**
  `entity-details` page as the live Overview. Any future reader of that change will target dead
  code. Flagged.

**Coordination** — a parallel workflow is editing `reporting-aow-table/`,
`reporting-program-band/`, `reporting-nav-sidebar/`, `routing-data.ts` and adding
`pages/programme-results/`. This change touches none of those; `program-overview/` and
`dashboard-lab.component.html` are currently clean.
