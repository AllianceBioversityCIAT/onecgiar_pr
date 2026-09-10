# Requirements — `changes/overview-aow-progress-hero`

## 1. Document Control

| Field | Value |
|---|---|
| Spec | `changes/overview-aow-progress-hero` · Type: Change · Depth: **Standard** |
| Status | Judged — APPROVED after fix round 1 (see `judgment.md`) · Approval Mode: pre-approved (owner mandate; gates logged as auto-approved) |
| Baseline | `docs/prd.md` (G2, AC-2), `docs/ux-ui/design.md` §7/§8, `docs/trd/trd.md` frontend module W1 |
| Consumes | Archived `changes/mass-reporting-flow` (zero-target rule, skeleton discipline), `changes/reporting-entry-hub` (REH-R-8 permission gate, REH-R-10 row destination), `changes/overview-toc-map` (TCM-R-1 adjacency — superseded, R-2) |
| Visual | `mockup/` canvas (Option A, corrected post-judgment) + https://claude.ai/code/artifact/c426b8a5-0f28-46c6-ad66-6706faf6ef1d |

## 2. Executive Summary

Promote "Progress by area of work" to the hero position of the SP Overview: summary rail (overall ring, split counts, Continue-reporting CTA), AoW rows sorted by remaining work with segmented status bars, outcomes as footer chips. Client-only; all data already loaded; every cross-tab action is a router navigation with query params (the tabs are separate routes).

## 3. Glossary — pins the `reporting-burndown` helper's OWN partition (`stateOf`); no other taxonomy anywhere (labels, code, mockup)

| Term | Definition |
|---|---|
| **Zero-target** | `target = 0 AND achieved = 0` — excluded from every denominator and segment (MRF-R-7), disclosed via `title` when N > 0 |
| **Complete** | `target > 0 AND achieved ≥ target` |
| **In progress** | `achieved > 0 AND NOT Complete` (this bucket also holds `target = 0 AND achieved > 0` — the set partitions) |
| **Not started** | `achieved = 0` (non-zero-target) |
| **Reported** | Complete + In progress (`buildRatio`'s numerator) |
| **Remaining** | `total − Reported` over the zero-target-filtered set |

Invariant (testable): `Complete + In progress + Not started = total` for every row and for the rail.

## 4. System Context & Scope

In: `program-overview` §8 redesign + promotion, one new rich-rows input, host derivation + CTA navigation, expected-to-change updates to the four pinned tests the move touches. Out: server, other Overview cards' data or styling, the Reporting tab, dark mode, the thin `aowProgress` input and everything it feeds (KPI card 4, tab badge, hub).

## 5. Personas

Reporting focal point (acts), PMU lead (reads).

## 6. Functional Requirements

### OAH-R-1 — Summary rail
The section SHALL open with a summary rail: overall ring + Reported percentage + `X of Y` mono figures (Y zero-target-filtered), the three split counts (Complete / In progress / Not started), and a **Continue reporting** CTA.

#### Scenario: internal coherence (single home)
- GIVEN the fixture rows
- WHEN the rail renders
- THEN its `X of Y` equals the SUM of its own rows' `reported/total` (same computed, one derivation site delegating to `buildRatio`/`applyZeroTargetRule`)
- AND the three split counts sum to Y (glossary invariant)
- AND the zero-target exclusion is disclosed via a `title` ("excludes N zero-target KPIs") when N > 0
- BUT it must NOT render any figure while any AoW ToC is still loading (skeleton — KZ-MRF-1)
- *(Recorded divergence, not a gate: Reporting-tab cards include the outcome tier and program buckets, so their totals legitimately differ from this HLO-tier rail — same class as the C-5 divergence note.)*

#### Scenario: Continue reporting
- WHEN the CTA is activated
- THEN Only-pending is persisted via its storage-backed setter and the app NAVIGATES (router) to this program's Reporting route with `?tocView=aows`
- AND the re-created Reporting surface restores Only-pending ON from storage
- BUT it must NOT touch `reportingViewMode` (grouped/flat) — `tocView` (`plannedBrowseView`) is the pinned concept

### OAH-R-2 — Hero placement
The section SHALL render as the first section after "About this program" (above the W1/W2 status cards). The ToC map (§9 today) stays LAST in the flow — its heading index shifts; TCM-R-1's "directly below" adjacency is superseded (design DD-2).

#### Scenario
- WHEN the Overview renders (section filter `all`)
- THEN the order is: hub → About → **Progress by area of work** → W1/W2 status → … → ToC map (last)
- AND IT MUST keep §8's existing `activeSection()` gate (renders on `all` and `aow` filter views, as today)
- BUT it must NOT change any other card's data, inputs, or styling (the four pinned tests the MOVE breaks are updated as deliberate edits — owned by name in tasks)

### OAH-R-3 — AoW rows: segmented bar + remaining-first sort
Each AoW row SHALL show: code chip + name, `N KPIs remaining` subline, a segmented bar whose segments are the **counts** of Complete (green token) / In progress (violet token) on the neutral track (Not started), mono `reported/total` + `%`, ordered by remaining DESC (tie: code ASC). Row basis: the output tier (`__tier !== 'outcome'`), as today.

#### Scenario: honest at 1%
- GIVEN AOW02 with 137 counted KPIs, 1 In progress
- THEN the bar paints a 1/137-width violet segment on the grey track; figures `1/137 · 1%`; subline `136 KPIs remaining`
- AND IT MUST derive every segment width from KPI counts (never percent-of-percent), zero-target excluded and disclosed
- BUT it must NOT recompute Reported/Complete locally — it delegates to the shared helpers (🛑 single-home rule; the helpers' Reporting-tab-only scope docstring is amended in the same change)

### OAH-R-4 — Row actions
Rows KEEP today's navigation contract: the row and its actions emit the existing `openAow` output, whose host handler already navigates to the focused By-AOW view (`?tocView=byAow&tocAow=<code>` — REH-R-10). Added: an explicit **Report** button and an **open** icon per row (same destination); a fully-Reported row swaps Report for **View results** (same destination) with the quiet complete treatment.

#### Scenario
- WHEN Report (or the row, or the icon) is activated on AOW03
- THEN the host receives `openAow('AOW03')` and navigates with `?tocView=byAow&tocAow=AOW03`
- AND IT MUST preserve the `canReportW1W2` permission gate exactly as delivered (disabled-but-focusable Report, `aria-disabled="true"`, title "You do not have reporting rights on this program" — REH-R-8; the pinned test stays green)
- BUT it must NOT add a new output or duplicate the `onOpenAow` handler (C-5/C-6), and must NOT alter the ToC map's use of the same output

### OAH-R-5 — Outcomes footer chips
Intermediate and 2030 outcomes SHALL render as compact footer chips (`label + reported/total` mono) + the segment legend, replacing the two full rows. Chips keep the rows' existing click-through (`openAow` with their bucket codes → grouped view), rendered as chips, not buttons with Report labels.

#### Scenario
- GIVEN 0/7 and 0/5
- THEN two chips render with those figures and no Report action
- AND clicking a chip navigates exactly as the old outcome row did

### OAH-R-6 — Loading and empty states
While loading, the rail figures and pending rows SHALL render pulse skeletons (`--pr-surface-ground`); numbers appear only when final. An empty program (no AoWs after load) SHALL render the section's existing empty treatment.

#### Scenario: no jumping sums
- GIVEN a cold load where 4 of 5 ToCs have resolved
- THEN the rail still shows skeletons and the unresolved row a row-skeleton
- AND IT MUST use the `!toc` loading definition (KZ-MRF-1)
- BUT it must NOT ever paint a partial sum that later changes

## 7. Non-Functional Requirements

- **OAH-N-1 (a11y):** rows keep their existing click-target role (no behavior removal); all buttons carry accessible names + visible focus rings; the segmented bar carries a text alternative listing the three counts; contrast per tokens.
- **OAH-N-2 (perf):** pure derivation from loaded signals; no new HTTP; one computed for the row set.
- **OAH-N-3 (i18n):** hard-coded English, consistent with the redesign surfaces.

## 8. Defect classes → gates

| Class | Gate |
|---|---|
| Split/sort/invariant logic | Jest fixtures incl. zero-target AND `target=0∧achieved>0` (the C-2 orphan) |
| Cross-card regression from the move | The four pinned tests, updated by name as deliberate edits (T-2) + reflow BUT assertions |
| Rendered layout/visual (jsdom-blind) | Live browser pass (T-6) — accepted substitute |
| Phantom token / scoped-class no-op | `design-tokens.spec.ts` sweep + NO cross-component class references (inlined recipes only) + live skeleton observation |
| Loading gap / jumping sums | Unit fixtures + live cold-load trace |
| Contrast | Manual/T6 at T-6 (jsdom cannot measure — accepted) |

## 9. Requirement Index

OAH-R-1..R-6, OAH-N-1..N-3 · closure at clause level in `tasks.md` §3.
