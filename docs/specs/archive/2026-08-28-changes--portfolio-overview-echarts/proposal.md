# Proposal: Portfolio Overview Refresh with Apache ECharts & Executive KPIs

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/portfolio-overview-echarts` |
| Type | Change (UI/UX & Visualization Refresh) |
| Approval Mode | gated |
| Status | Proposed |
| Date | 2026-08-28 |
| Author | Juan Carlos Cadavid (j.cadavid@cgiar.org) |
| Depends on | `sp-overview-echarts` visual standards, `shared/pr-viz-chart` wrapper, `chart-tokens.util.ts` |
| Parallel-safe | yes (isolated to `pages/portfolio-overview/**`) |

---

## 2. Intent

Modernize and elevate the **Portfolio Overview** (`/result-framework-reporting/portfolio-overview`) into an executive-grade reporting dashboard by adopting the **Apache ECharts** visualization system established in `/entity-details/:entityId/overview`. 

This change replaces hand-rolled HTML `<div>` progress bars with interactive, accessible charts, organizes executive KPI summary cards, introduces deep portfolio status analytics (W1/W2 and W3/Bilateral), and enriches the science program matrix with heatmap and ranking views.

---

## 3. Problem / Current State

Currently, `/portfolio-overview` is the primary high-level lens for CGIAR portfolio leadership and PMU admins, but its visual craft lags behind the updated Science Program Overview:

1. **Primitive Visualizations:** "Results by indicator category" and "Bilateral results" use hand-rolled CSS `<div>` progress bars with static widths, lacking interactive tooltips, segment breakdowns, and chart exports.
2. **Plain Counter Box:** "Results in this phase" is a static list of numbers in a plain container, rather than an interactive status distribution with visual hierarchy.
3. **Under-leveraged Executive KPIs:** The top area lacks structured executive KPI cards (Total Portfolio, W1/W2 Performance, W3/Bilateral Reach, Active Programs) that summarize key health indicators at a glance.
4. **Static Matrix Table:** "Progress by science program" is an unshaded HTML table without visual heatmap cues or high-level visual program ranking comparisons.

---

## 4. Proposed Outcome & Feature Breakdown

### A. Executive KPI Summary Cards (Top Deck)
Structured, responsive metric cards with active phase badges and micro-stats:
1. **Total Results in Portfolio:** Total count, reporting cycle badge (e.g. `Reporting 2026 · P25`), breakdown (`X W1/W2 · Y W3/Bilateral`).
2. **W1/W2 Results:** Total count, `% Submitted / Quality Assessed`, distinct result categories reported.
3. **W3/Bilateral Results:** Total count, `% Approved / In Review`, count of reporting CGIAR Centers.
4. **Active Science Programs:** Total reporting programs (`13 / 13 Programs`), portfolio progress summary.

### B. Portfolio Reporting Status (Donut + Proportional Meter + Metric Tiles)
- **ECharts Donut Chart:** Centered total count, distinct status slices using official status tokens (`--pr-status-*`).
- **Proportional Segmented Progress Meter:** Smooth interactive bar showing proportional weight of each status.
- **Status Metric Tiles:** Interactive 2-column/3-column grid of status badges (`Editing`, `In QA`, `Submitted`, `Approved`, `Rejected`, `Discontinued`).

### C. Interactive Results by Indicator Category (ECharts Stacked Bars / Heatmap)
- Replaces static HTML progress bars with a rich, interactive **Horizontal Stacked Bar Chart** comparing **W1/W2 vs W3/Bilateral** contributions per indicator category (Knowledge Products, Capacity Development, Policy Changes, Innovation Developments, Innovation Use, etc.).
- Tooltips display exact counts, percentages, and origin breakdown.

### D. Science Programs Output Ranking (ECharts Horizontal Grouped Bars)
- Visual ranking of all 13 Science Programs (SP01 to SP13) by reported result volume, segmented by status (Editing vs Submitted/QA vs Approved).
- Allows portfolio leads to immediately identify leading programs and those needing acceleration.

### E. Contributing Centers & Bilateral Distribution (ECharts Bar / Radar)
- Ranking of CGIAR Centers reporting W3/Bilateral results across the portfolio, illustrating bilateral reach and cross-center attribution.

### F. Upgraded "Progress by Science Program" Matrix
- Retains sortable tabular view with optional **Heatmap cell shading** to highlight high-density output areas across categories and programs.
- Quick navigation links directly to each Science Program overview/results.

---

## 5. Architectural & Implementation Scope

- **Package:** `onecgiar-pr-client`
- **Location:** `src/app/pages/result-framework-reporting/pages/portfolio-overview/`
- **Component Changes:**
  - `portfolio-overview.component.html`: New layout with KPI cards, ECharts chart sections using `<app-pr-viz-chart>`, and responsive CSS grid.
  - `portfolio-overview.component.ts`: Computed signals for chart option builders, table models for a11y, and view mode state.
  - `portfolio-overview.charts.ts` (new): Pure builder functions (`portfolioStatusDonutOption`, `categoryOriginBarOption`, `programRankingOption`, `portfolioHeatmapOption`, etc.).
  - `services/portfolio-overview.service.ts`: Extended aggregate computeds for origin breakdown, center distributions, and status categorizations.
- **Accessibility & Design Tokens:**
  - Full adherence to `chart-tokens.util.ts` (`--pr-chart-ramp`, `--pr-status-*`, `--pr-surface-*`, `--pr-text-*`).
  - Dual representation on all charts via `<app-pr-viz-chart>` (Chart view + Data Table drawer with keyboard navigation).
- **Backend Impact:** **ZERO** (re-uses existing payload from `GET /api/results/get/all/roles/filter/{userId}?page=1&limit=20000`).

---

## 6. Comparison Table: Current vs Proposed

| Dimension | Current State | Proposed ECharts State |
|---|---|---|
| **KPI Headers** | Plain text stats box | 4 Executive KPI Cards with badges & subtitles |
| **Status Overview** | Text counters with color dots | ECharts Donut + Proportional Meter + Metric Tiles |
| **Category Breakdown** | Primitive CSS `<div>` bars | ECharts Stacked Bar (W1/W2 vs Bilateral per category) |
| **Program Comparison** | Plain table only | ECharts Program Ranking Chart + Heatmap Matrix |
| **Bilateral Breakdown** | Simple text list with "View all" | ECharts Center Distribution Bars & Bilateral metrics |
| **Accessibility (A11y)** | Basic DOM | Full `<app-pr-viz-chart>` table modal & keyboard focus |
| **Theme / Tokens** | Partial hardcoded styles | 100% tokenized via `chart-tokens.util.ts` |

---

## 7. Next Steps

Upon approval of this proposal:
1. Run `/akili-specify changes/portfolio-overview-echarts` to draft `requirements.md`, `design.md`, and `tasks.md`.
2. Review specifications and proceed to `/akili-execute` to implement the components, chart builders, and comprehensive unit tests.
