# Archive Summary: `changes/sp-overview-echarts` (family)

## 1. Document Control

| Field | Value |
|---|---|
| Original Spec Path | `docs/specs/changes/sp-overview-echarts/` (parent + 3 nested children) |
| Archive Date | 2026-08-27 |
| Final Status | **Done — family complete (3/3 children done), all tasks PASS** |
| Owner | j.cadavid@cgiar.org |
| Children | `results-tab-filter-deeplink` (Lite) · `viz-chart-echarts` (Lite) · `overview-widgets` (Standard) — each with its own `archive-summary.md` |

## 2. Outcome

The SP Overview tab went from a static summary to an interactive dashboard: every figure (category rows, center rows, status segments, heatmap cells, donut sectors) navigates to the Results tab pre-filtered via URL query params; two ECharts heatmaps (W1/W2 category × status; W3/Bilateral center × category) and a status donut were added on the new shared `app-pr-viz-chart` wrapper; the Results tab gained URL filter hydration/mirroring and a Center filter. "Coming soon" chips eliminated (P2-3408 unblocked).

## 3. Delivery map

| Child | Delivered | Commits |
|---|---|---|
| #1 results-tab-filter-deeplink | URL ↔ filter bridge (`status/category/origin/center`), Center filter, `programme-results-query-params.ts` contract | `a8070de55`, `dda0eec21` |
| #2 viz-chart-echarts | `echarts@6` + `app-pr-viz-chart` (SVG, a11y table pairing, chartClick) + `chart-tokens.util` — executed in a parallel worktree by a peer session, merged `4e4a68e03` | `fe44111f8` |
| #3 overview-widgets | Navigable cards, 2 heatmaps, status donut, spec-assertion rewrites | `6d412de17`, `93ecd530a`, `a0e03ffa0`, `5faa42b55` |
| Post-execution quicks (user-driven UX polish) | axis abbreviations + `interval:0` + rotation; card reorder for SP-leader narrative (design §6.2 amendment); donut on the violet palette (OVW-DD-5a, fence exception removed) | `88a4aec3c`/`22bd8006e`, `7630fe05a`, `ef4914230` |

## 4. Test / Validation Evidence

Final state: full client Jest **481/481 suites, 6805 tests**; lint clean; `ng build` clean; bundle delta of echarts +0.20 kB raw initial (lazy chunk); static gates (plural origin, hex, root-echarts import) at 0. Per-child evidence in each `execution.md`. No `validation-report.md` (Lite/Standard depth; validation evidence embedded in execution logs — accepted).

## 5. Accepted Warnings / Follow-Ups

| Item | Disposition |
|---|---|
| Rollout §6 per child (PR/CI/staging spot-check) | Release-flow follow-up; work is committed on `qa-development-2026` |
| OVW-AC-3 manual: partially performed (user reviewed heatmaps/donut live, drove 3 quick fixes); full 6-click-path + 1024px pass outstanding | Accepted — remaining paths verified informally during the quick iterations |
| Heatmap cell count vs filtered list mismatch (P2-3406) | Accepted risk, disclosed by the "in review" subtitle |
| OQ-1: W1/W2 bar excludes `qualityAssessed` | Follow-up proposal candidate |
| Bars↔heatmap **toggle** (Alliance-style) — user request 2026-08-27 | Deferred to `/akili-propose changes/overview-chart-view-toggle` (reverts OVW-DD-4; real feature) |
| `chart.js` retirement + dead `pages/entity-details/` cleanup | Separate cleanup spec |

## 6. Historical Notes

- Chunked as a 3-child family with `Parallel-safe` metadata; #1 and #2 genuinely ran concurrently (#2 in a separate worktree by another session) — the fleet pattern worked, with one environment lesson (`npm ci` needed after the sibling's dependency merge).
- Scout discovery corrected the proposal twice before any code: status-link vocabulary (slot labels ≠ `status_name`) and the plural `W3/Bilaterals`.
- OVW-DD-5 (donut on status tokens) was superseded post-execution by user decision (OVW-DD-5a, violet palette) — recorded as a design amendment, and it removed the only exception to the VCE-DD-3 token fence.
