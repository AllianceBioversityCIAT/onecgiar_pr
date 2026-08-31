# Requirements — `changes/overview-aow-progress-hero`

## 1. Document Control

| Field | Value |
|---|---|
| Spec | `changes/overview-aow-progress-hero` · Type: Change · Depth: **Standard** |
| Status | Draft → judged (one pass, fix-only) · Approval Mode: pre-approved (owner mandate; gates logged as auto-approved) |
| Baseline | `docs/prd.md` (G2 reporting efficiency, AC-2), `docs/ux-ui/design.md` §7 tokens / §8 components, `docs/trd/trd.md` frontend module W1 |
| Consumes | Archived `changes/mass-reporting-flow` (zero-target rule MRF-R-7, `openAowFocused`, skeleton discipline), `changes/reporting-entry-hub` (Overview hub), `changes/overview-toc-map` (TCM-R-1 placement — superseded clause, see R-2) |
| Visual | `mockup/` canvas (Option A approved) + https://claude.ai/code/artifact/c426b8a5-0f28-46c6-ad66-6706faf6ef1d |

## 2. Executive Summary

Promote "Progress by area of work" to the hero position of the SP Overview and make it answer *how are we doing / where do I act next*: summary rail (overall ring, split counts, Continue-reporting CTA), AoW rows sorted by remaining work with segmented status bars and per-row actions, outcomes as footer chips. Client-only; all data already loaded.

## 3. Glossary (pins the MRF vocabulary — do not invent new terms)

| Term | Definition |
|---|---|
| **Reported** | KPI with `achieved > 0` (`buildRatio`'s numerator) |
| **Complete** | `achieved ≥ target` (target > 0) |
| **Partial** | `0 < achieved < target` |
| **Not started** | `achieved = 0` (and not zero-target) |
| **Zero-target** | `target = 0 AND achieved = 0` — excluded from denominators (MRF-R-7) |
| **Remaining** | `total − reported` over the zero-target-filtered set |

## 4. System Context & Scope

In: `program-overview` §8 redesign + promotion, host row enrichment, navigation glue to the Reporting tab. Out: server, other Overview cards' internals, Reporting tab, dark mode, per-HLO drill-down.

## 5. Personas

Reporting focal point (acts), PMU lead (reads). Both land on Overview first (PRD flows).

## 6. Functional Requirements

### OAH-R-1 — Summary rail
The section SHALL open with a summary rail showing: an overall ring + the Reported percentage and `X of Y` in mono figures (Y under the zero-target rule), three split counts (Complete / Partial / Not started), and one primary **Continue reporting** CTA.

#### Scenario: overall coherence
- GIVEN SP01 with 392 counted KPIs of which 2 are Reported
- WHEN the Overview renders
- THEN the rail shows `1%` and `2 of 392`, and the three split counts sum to 392
- AND IT MUST equal the Reporting tab's grouped totals for the same program (single home: the shared `buildRatio`/`applyZeroTargetRule` helpers — MRF-AC-5 parity extended to this surface)
- BUT it must NOT render any number while any AoW ToC is still loading (skeleton instead — KZ-MRF-1)

#### Scenario: Continue reporting
- WHEN the CTA is activated
- THEN the app switches to the **Reporting** tab, grouped view, with **Only pending** ON
- AND focus lands on the reporting surface (no full page reload)

### OAH-R-2 — Hero placement
The section SHALL render as the FIRST program-overview section after "About this program" (i.e. above the W1/W2 status cards). This supersedes TCM-R-1's "directly below Progress by area of work" adjacency for the ToC map: the ToC map keeps its current absolute position (before §9's old neighbours), and the superseding note is recorded in design DD-2.

#### Scenario
- GIVEN the Overview tab
- WHEN it renders
- THEN the order is: hub ("Where to report") → About → **Progress by area of work (hero)** → W1/W2 status → … → ToC map
- BUT it must NOT reflow or restyle any other card beyond its position in the flow

### OAH-R-3 — AoW rows: segmented bar + remaining-first sort
Each AoW row SHALL show: code chip + name, a "N KPIs remaining" subline, a segmented bar whose segments are the **counts** of Complete (emerald) / Partial (violet) / Not started (track grey) KPIs, mono `reported/total` + `%`, and the rows SHALL be ordered by **remaining descending** (tie: code ascending). HLO-tier KPIs only (today's row basis, unchanged).

#### Scenario: honest at 1%
- GIVEN AOW02 with 137 counted KPIs, 1 Complete, 0 Partial
- WHEN the row renders
- THEN the bar paints a 1/137-wide emerald segment on the grey track and the figures read `1/137 · 1%`
- AND the subline reads `136 KPIs remaining`
- AND IT MUST derive every segment from KPI counts (never percent-of-percent), with zero-target KPIs excluded from track and figures and disclosed via a `title` ("excludes N zero-target KPIs") when N > 0
- BUT it must NOT recompute the Reported rule locally — it delegates to the shared helpers (🛑 single-home rule)

### OAH-R-4 — Row actions
Each row SHALL offer **Report** (switches to the Reporting tab and opens that AoW's focused By-AOW view) and an **open** icon action (same destination). A row whose KPIs are all Reported SHALL replace Report with **View results** (same destination) and show the quiet complete treatment (emerald 100%, "All planned KPIs reported").

#### Scenario
- WHEN Report is activated on AOW03
- THEN the app shows Reporting → By-AOW for AOW03 (reusing `openAowFocused` semantics; bucket rows do not exist on this surface)
- BUT it must NOT open the legacy AoW page (`viewMode 'aow'`) — that is the pre-hub destination this section currently uses

### OAH-R-5 — Outcomes footer chips
Intermediate outcomes and 2030 outcomes SHALL render as compact footer chips (`label + reported/total` mono), replacing the two full rows, plus the segment legend.

#### Scenario
- GIVEN 0/7 intermediate and 0/5 2030 outcomes
- THEN two chips render with those figures
- BUT they must NOT render Report actions (program-level buckets have no focused view — MRF C-8 precedent)

### OAH-R-6 — Loading and empty states
While the AoW list or any ToC is loading, the rail figures and every pending row SHALL render pulse skeletons (`--pr-surface-ground`); numbers appear only when final. An empty program (no AoWs after load) renders the existing empty treatment.

#### Scenario: no jumping sums
- GIVEN a cold load where 4 of 5 ToCs have resolved
- THEN the rail still shows skeletons (its sums are not final) and the unresolved row shows a row skeleton
- AND IT MUST use the `!toc` loading definition (not "request in flight" — KZ-MRF-1)
- BUT it must NOT ever paint a partial sum that later changes

## 7. Non-Functional Requirements

- **A11y (OAH-N-1):** rows are not click-targets themselves; buttons carry visible focus rings and `aria-label`s; the segmented bar carries a text alternative (`title`/`aria-label` with the three counts); contrast per tokens (§7 design.md).
- **Performance (OAH-N-2):** pure derivation from already-loaded signals; no new HTTP calls; no layout thrash (single computed per row set).
- **i18n (OAH-N-3):** strings hard-coded English like the rest of the redesign surfaces (P22/P25 vocabulary not affected) — consistent with dashboard-lab precedent.

## 8. Defect classes → gates

| Class | Gate |
|---|---|
| Count/sort/split logic wrong | Jest on the enrichment computed + helpers (exact fixtures incl. zero-target) |
| Coherence drift vs Reporting tab | Jest asserting equality with `buildRatio` outputs on one shared fixture |
| Rendered layout/visual (jsdom-blind) | **Live browser pass (T-5 manual rows)** — jsdom cannot see it; accepted as the substitute gate |
| Phantom token / invisible skeleton | `design-tokens.spec.ts` module sweep (exists) + live skeleton observation |
| Loading gap / jumping sums | Unit (loading fixtures) + live cold-load trace |
| Contrast/visual a11y | Manual/T6 check at T-5 (axe-in-jsdom cannot measure rendered contrast — accepted) |

## 9. Requirement Index

OAH-R-1..R-6, OAH-N-1..N-3. Coverage closure at scenario/clause level in `tasks.md` §3.
