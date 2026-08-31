# Portfolio Overview Refresh with Apache ECharts — Task Decomposition

## 1. Scope of this Task List

- **Module / Feature:** Portfolio Overview (`platform-report` / `portfolio-overview`)
- **Linked Specs:** `docs/specs/changes/portfolio-overview-echarts/requirements.md` and `design.md`
- **Owner / Driver:** Juan Carlos Cadavid (j.cadavid@cgiar.org)
- **Status:** done

---

## 2. Pre-flight Checklist

- [x] `requirements.md` approved.
- [x] `design.md` approved.
- [x] Zero backend migrations needed (100% client-side reactive aggregation).
- [x] Shared `<app-pr-viz-chart>` wrapper and `chart-tokens.util.ts` registered.
- [x] Linting and tests passing clean on branch.

---

## 3. Task List

### `POV-T-1` — Service Data Layer & Computeds (TDD)

- **Type:** `client` | `tests`
- **Status:** `[x]` (done)
- **Description:** Extend `PortfolioOverviewService` with reactive signals and computed models for executive KPIs (`kpiTotals`), origin segmentation (`categoryOriginRows`), science program rankings (`programRankingRows`), status segments (`statusSegments`), and contributing centers (`centerDistributionRows`).
- **Implements:** `POV-R-1`, `POV-R-8`, `POV-NFR-1`
- **Design Ref:** `design.md` §3.2, §4.1
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/portfolio-overview/services/portfolio-overview.service.ts`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/portfolio-overview/services/portfolio-overview.service.spec.ts`

---

### `POV-T-2` — Pure ECharts Option & Table Builders (TDD)

- **Type:** `client` | `tests`
- **Status:** `[x]` (done)
- **Description:** Implement `portfolio-overview.charts.ts` containing pure builder functions for `portfolioStatusDonutOption`, `categoryOriginBarOption`, `programRankingOption`, and `centerBilateralOption`, alongside their companion `VizChartTableModel` generators for accessibility.
- **Implements:** `POV-R-2`, `POV-R-3`, `POV-R-4`, `POV-R-5`, `POV-R-7`, `POV-NFR-2`, `POV-NFR-4`
- **Design Ref:** `design.md` §5.1, §5.2, §5.3, §5.4, `POV-DD-1`, `POV-DD-2`
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/portfolio-overview/portfolio-overview.charts.ts`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/portfolio-overview/portfolio-overview.charts.spec.ts`

---

### `POV-T-3` — Executive KPI Cards & Portfolio Status Section

- **Type:** `client`
- **Status:** `[x]` (done)
- **Description:** Update `portfolio-overview.component.html` and `.ts` to render the Top Deck of 4 Executive KPI Cards and the Portfolio Reporting Status card (ECharts Donut + Proportional Meter Bar + Symmetrical Status Metric Grid) using `<app-pr-viz-chart>`.
- **Implements:** `POV-R-1`, `POV-R-2`, `POV-R-7`, `POV-NFR-3`
- **Design Ref:** `design.md` §3.2, §5.1, `POV-DD-3`
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/portfolio-overview/portfolio-overview.component.html`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/portfolio-overview/portfolio-overview.component.ts`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/portfolio-overview/portfolio-overview.component.spec.ts`

---

### `POV-T-4` — Interactive Chart Sections, Matrix Table & Verification

- **Type:** `client` | `tests`
- **Status:** `[x]` (done)
- **Description:** Integrate the Category Stacked Bar Chart, Science Programs Ranking Chart, Contributing Centers Bilateral Distribution, and the enhanced sortable Matrix Table with heatmap cell shading into `portfolio-overview.component.html`. Run full regression test suite.
- **Implements:** `POV-R-3`, `POV-R-4`, `POV-R-5`, `POV-R-6`, `POV-R-7`, `POV-NFR-1`, `POV-NFR-2`
- **Design Ref:** `design.md` §5.2, §5.3, §5.4, `POV-DD-4`
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/portfolio-overview/portfolio-overview.component.html`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/portfolio-overview/portfolio-overview.component.ts`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/portfolio-overview/portfolio-overview.component.spec.ts`

---

## 4. Traceability Matrix

| Requirement | Tasks Covering | Tests Covering | Status |
|---|---|---|---|
| `POV-R-1` (Executive KPI Cards) | `POV-T-1`, `POV-T-3` | `portfolio-overview.service.spec.ts`, `portfolio-overview.component.spec.ts` | `PASS` |
| `POV-R-2` (Portfolio Status Donut & Meter) | `POV-T-1`, `POV-T-2`, `POV-T-3` | `portfolio-overview.charts.spec.ts`, `portfolio-overview.component.spec.ts` | `PASS` |
| `POV-R-3` (Category Stacked Bars) | `POV-T-1`, `POV-T-2`, `POV-T-4` | `portfolio-overview.charts.spec.ts`, `portfolio-overview.component.spec.ts` | `PASS` |
| `POV-R-4` (Science Programs Ranking) | `POV-T-1`, `POV-T-2`, `POV-T-4` | `portfolio-overview.charts.spec.ts`, `portfolio-overview.component.spec.ts` | `PASS` |
| `POV-R-5` (Contributing Centers Reach) | `POV-T-1`, `POV-T-2`, `POV-T-4` | `portfolio-overview.charts.spec.ts`, `portfolio-overview.component.spec.ts` | `PASS` |
| `POV-R-6` (Matrix Table & Heatmap) | `POV-T-4` | `portfolio-overview.component.spec.ts` | `PASS` |
| `POV-R-7` (A11y & Design Tokens) | `POV-T-2`, `POV-T-3`, `POV-T-4` | `portfolio-overview.charts.spec.ts`, `portfolio-overview.component.spec.ts` | `PASS` |
| `POV-R-8` (Phase Scoping & Resilience) | `POV-T-1` | `portfolio-overview.service.spec.ts` | `PASS` |
