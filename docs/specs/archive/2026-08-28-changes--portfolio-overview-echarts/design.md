# Portfolio Overview Refresh with Apache ECharts — Technical Design

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/portfolio-overview-echarts` |
| Module | `platform-report` / `portfolio-overview` |
| Short Code | `POV` |
| Status | In-Review |
| Date | 2026-08-28 |
| Author | Juan Carlos Cadavid (j.cadavid@cgiar.org) |
| Target Package | `onecgiar-pr-client` (`src/app/pages/result-framework-reporting/pages/portfolio-overview/`) |
| PRD Ref | `docs/prd.md` §3, `G2`, `AC-12` |
| TRD Ref | `docs/trd/trd.md` (Design Tokens §7, ECharts Visualization §8) |
| Active Lessons | `docs/specs/kaizen-log.md` (Pure chart builders, `universalTransition` deterministic keys, WCAG token compliance) |

---

## 2. Executive Summary

This technical design details the architectural modernization of the **Portfolio Overview** dashboard (`/result-framework-reporting/portfolio-overview`). 

It transitions the screen from hand-rolled CSS progress bars and flat counter boxes to a robust, reactive **Apache ECharts** visualization suite leveraging `<app-pr-viz-chart>`, structured executive KPI cards, proportional segmented status meters, and interactive ranking/heatmap representations.

The architecture is **100% client-side reactive**, consuming existing data from `GET /api/results/get/all/roles/filter/{userId}?page=1&limit=20000`, requiring **zero backend modifications or migrations**.

---

## 3. Architecture Overview

### 3.1 Layered Component & Service Structure

```text
onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/portfolio-overview/
├── portfolio-overview.component.html       # Executive KPIs + ECharts visual sections + matrix table
├── portfolio-overview.component.ts         # View logic, signal bindings, a11y table models
├── portfolio-overview.component.spec.ts    # Component unit tests (cards, charts, sorting, router)
├── portfolio-overview.charts.ts            # PURE ECharts option & VizChartTableModel builder functions
├── portfolio-overview.charts.spec.ts       # 100% pure unit tests for chart builders (no DOM/Canvas)
└── services/
    ├── portfolio-overview.service.ts       # Reactive signals, data filtering, multi-dimension aggregations
    └── portfolio-overview.service.spec.ts  # Service aggregation tests (totals, origins, programs, centers)
```

### 3.2 Data Flow Sequence

```text
[Browser Navigation /portfolio-overview]
  │
  ├── PortfolioOverviewComponent (init)
  │     └── PortfolioOverviewService.load()
  │           └── GET /api/results/get/all/roles/filter/{userId}?page=1&limit=20000
  │                 │
  │                 ├── (Filter to active reporting phase: phase_status === 1)
  │                 ├── Signal: rows() (Raw results array)
  │                 │
  │                 ├── Computed: kpiTotals() (Total, W1/W2, W3/Bilateral, Programs)
  │                 ├── Computed: statusSegments() (Editing, In QA, Submitted, Approved, Rejected)
  │                 ├── Computed: categoryOriginData() (W1/W2 vs Bilateral per Result Type)
  │                 ├── Computed: programRankingData() (SP01–SP13 results & status breakdown)
  │                 ├── Computed: centerDistributionData() (Centers reporting bilateral outputs)
  │                 └── Computed: programMatrixRows() (Sortable matrix dataset)
  │
  ├── PortfolioOverviewComponent Computeds
  │     ├── portfolioStatusDonutOption() + portfolioStatusDonutTable()
  │     ├── categoryOriginBarOption() + categoryOriginBarTable()
  │     ├── programRankingOption() + programRankingTable()
  │     └── centerBilateralOption() + centerBilateralTable()
  │
  └── Template Rendering (<app-pr-viz-chart> for every ECharts visual)
```

---

## 4. Extended Directory & Interface Contracts

### 4.1 Extended Interfaces (`portfolio-overview.charts.ts` & `portfolio-overview.service.ts`)

```typescript
export interface PortfolioKpis {
  totalResults: number;
  phaseLabel: string;
  w1w2Count: number;
  w1w2SubmittedPercent: number;
  w1w2CategoriesCount: number;
  bilateralCount: number;
  bilateralApprovedPercent: number;
  bilateralCentersCount: number;
  activeProgramsCount: number;
  totalProgramsCount: number;
}

export interface PortfolioStatusSegment {
  key: 'editing' | 'in-qa' | 'submitted' | 'approved' | 'rejected' | 'discontinued';
  label: string;
  count: number;
  percent: number;
  bg: string;
  fg: string;
}

export interface CategoryOriginRow {
  category: string;
  w1w2Count: number;
  bilateralCount: number;
  total: number;
}

export interface ProgramRankingRow {
  code: string;
  name: string;
  editing: number;
  submittedOrQa: number;
  approved: number;
  total: number;
}

export interface CenterDistributionRow {
  centerId: string;
  centerName: string;
  count: number;
  approvedCount: number;
  percent: number;
}
```

---

## 5. Visual & Chart Builder Design (`portfolio-overview.charts.ts`)

All chart options are generated through pure functions adhering to `chart-tokens.util.ts`:

### 5.1 `portfolioStatusDonutOption`
- **Type:** ECharts `pie` with `radius: ['58%', '78%']`.
- **Center Graphic:** Total portfolio count + label "Results".
- **Color Scale:** Official violet chart ramp (`tokens.ramp`) + status tokens for slices.
- **Table Model:** Emits `headers: ['Status', 'Results', 'Share']` for screen reader drawer.

### 5.2 `categoryOriginBarOption`
- **Type:** Horizontal Stacked Bar Chart (`series: [{ name: 'W1/W2 Portfolio', stack: 'total' }, { name: 'W3/Bilateral', stack: 'total' }]`).
- **Y-Axis:** Result Type Categories (abbreviated on small viewports via `abbreviateAxisLabel`).
- **Colors:** `tokens.primaryStrong` (W1/W2) and `tokens.bilateralMuted` (W3/Bilateral).
- **Tooltip:** Detailed origin breakdown with exact values and percentages.

### 5.3 `programRankingOption`
- **Type:** Horizontal Stacked Bar Chart ranking 13 Science Programs in descending order.
- **Series:** `Editing` (`tokens.ramp[3]`), `In QA / Submitted` (`tokens.primaryStrong`), `Approved` (`tokens.approved` or `tokens.ramp[0]`).
- **Interactivity:** Click handler navigates to `/result-framework-reporting/entity-details/<CODE>/overview`.

### 5.4 `centerBilateralOption`
- **Type:** Horizontal Single Bar Chart with gradient fill (`tokens.bilateralMuted`).
- **Y-Axis:** CGIAR Centers (CIAT, CIMMYT, IRRI, IFPRI, ILRI, etc.).
- **Interactivity:** Toggle between Top 5 preview and full list.

---

## 6. Design Decisions (ADRs)

### `POV-DD-1`: 100% Pure Chart Builders
- **Decision:** All chart generation logic lives in `portfolio-overview.charts.ts` as pure functions accepting data models and `ResolvedChartTokens`.
- **Rationale:** Enables 100% deterministic, instant Jest unit testing without jsdom canvas mocking workarounds. Follows successful precedent in `program-overview.charts.ts`.

### `POV-DD-2`: Dual View Mode via `<app-pr-viz-chart>`
- **Decision:** Every chart uses the shared `<app-pr-viz-chart>` wrapper with a companion `VizChartTableModel`.
- **Rationale:** Guarantees WCAG 2.1 AA accessibility compliance and enables tabular inspection for assistive technology users.

### `POV-DD-3`: Proportional Meter + Symmetrical Status Grid
- **Decision:** Display the status distribution via both a Donut chart and a linear proportional progress bar with a balanced grid of status tiles (`Editing`, `In QA`, `Submitted`, `Approved`, `Rejected`, `Discontinued`).
- **Rationale:** Matches the layout language established in `ProgramOverviewComponent`, providing visual continuity across program and portfolio views.

### `POV-DD-4`: Category Origin Breakdown (W1/W2 vs W3/Bilateral)
- **Decision:** Segment indicator category outputs into W1/W2 and Bilateral contributions.
- **Rationale:** Provides executive stakeholders with direct insight into core portfolio vs center-driven bilateral investments per thematic area.

---

## 7. Budget & Sizing

| Metric | Target / Estimate |
|---|---|
| **Expected Tasks** | 4 tasks (`POV-T-1` to `POV-T-4`) |
| **Expected LOC** | ~650 lines (TypeScript + HTML + Specs) |
| **Expected Review Rounds** | 1 round per task |
| **Depth** | Standard |

---

## 8. Verification & Test Plan

- **Service Tests (`portfolio-overview.service.spec.ts`):** Verify aggregation algorithms for KPI counts, origin separation, program grouping, and status mapping across simulated 20,000 result payloads.
- **Chart Builder Tests (`portfolio-overview.charts.spec.ts`):** Verify `portfolioStatusDonutOption`, `categoryOriginBarOption`, `programRankingOption`, and `centerBilateralOption` output structure, tooltip formatting, and table models.
- **Component Tests (`portfolio-overview.component.spec.ts`):** Verify template rendering, KPI badge displays, sort triggers on matrix table, and router navigation.
- **Lint & Typecheck:** `npx ng lint --quiet` and `npx jest src/app/pages/result-framework-reporting/pages/portfolio-overview --silent`.
