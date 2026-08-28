# Archive Summary: Portfolio Overview Refresh with Apache ECharts

## 1. Document Control

| Field | Value |
|---|---|
| **Original Spec Path** | `docs/specs/changes/portfolio-overview-echarts/` |
| **Archive Date** | 2026-08-28 |
| **Final Status** | Completed / Verified |
| **Author** | Juan Carlos Cadavid (j.cadavid@cgiar.org) |

---

## 2. Executive Summary

Successfully modernized the **Portfolio Overview** dashboard (`/result-framework-reporting/portfolio-overview`) using Apache ECharts via the shared `<app-pr-viz-chart>` wrapper and tokenized design system (`chart-tokens.util.ts`). The update delivers executive KPI cards, an interactive portfolio status donut and proportional meter, horizontal stacked bars comparing W1/W2 vs Bilateral contributions, a Science Programs output ranking, Center distribution charts, and heatmap cell density shading on the science programs matrix.

---

## 3. Requirements Delivered

| Requirement | Description | Status | Evidence |
|---|---|---|---|
| **`POV-R-1`** | Executive KPI Deck (Total Results, W1/W2, W3/Bilateral, Active Programs) | Delivered | `portfolio-overview.component.html`, `.spec.ts` |
| **`POV-R-2`** | Portfolio Reporting Status (ECharts Donut + Proportional Meter + 6 Status Tiles) | Delivered | `portfolio-overview.charts.ts`, `portfolio-overview.component.html` |
| **`POV-R-3`** | Results by Indicator Category (ECharts Stacked Bar W1/W2 vs Bilateral) | Delivered | `categoryOriginBarOption` in `portfolio-overview.charts.ts` |
| **`POV-R-4`** | Science Programs Output Ranking (ECharts Horizontal Grouped Bars) | Delivered | `programRankingOption` in `portfolio-overview.charts.ts` |
| **`POV-R-5`** | Contributing Centers & Bilateral Reach Chart | Delivered | `centerBilateralOption` in `portfolio-overview.charts.ts` |
| **`POV-R-6`** | Science Program Matrix with Heatmap Cell Shading & Sorting | Delivered | `portfolio-overview.component.html`, `cellIntensity` computed |
| **`POV-R-7`** | Accessible Data Table View for All Charts (A11y Table Drawer) | Delivered | Companion `VizChartTableModel` generators |
| **`POV-R-8`** | Phase & Cycle Filter Resilience | Delivered | `PortfolioOverviewService.spec.ts` |
| **`POV-NFR-1`** | Performance budget: aggregate 20k rows < 150ms client-side | Delivered | Performance assertions in `portfolio-overview.service.spec.ts` |
| **`POV-NFR-2`** | Pure tokenization via `chart-tokens.util.ts` | Delivered | Zero hardcoded colors in charts |
| **`POV-NFR-3`** | Responsive Grid Layout & Mobile View | Delivered | Tailwind responsive classes |
| **`POV-NFR-4`** | Complete Test Coverage across Service, Charts, and Component | Delivered | 63 tests across 3 suites |

---

## 4. Files Changed Summary

- `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/portfolio-overview/services/portfolio-overview.service.ts`
- `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/portfolio-overview/services/portfolio-overview.service.spec.ts`
- `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/portfolio-overview/portfolio-overview.charts.ts`
- `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/portfolio-overview/portfolio-overview.charts.spec.ts`
- `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/portfolio-overview/portfolio-overview.component.html`
- `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/portfolio-overview/portfolio-overview.component.ts`
- `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/portfolio-overview/portfolio-overview.component.spec.ts`

---

## 5. Test Evidence Summary

```text
PASS src/app/pages/result-framework-reporting/pages/portfolio-overview/services/portfolio-overview.service.spec.ts
PASS src/app/pages/result-framework-reporting/pages/portfolio-overview/portfolio-overview.charts.spec.ts
PASS src/app/pages/result-framework-reporting/pages/portfolio-overview/portfolio-overview.component.spec.ts

Test Suites: 3 passed, 3 total
Tests:       63 passed, 63 total
Snapshots:   0 total
All files pass linting.
```

---

## 6. Historical Notes & Retrospective Highlights

- **Adversarial Review Corrections:** Implementer was corrected during T-2 to eliminate hardcoded hex codes and bind `ResolvedChartTokens` throughout option builders.
- **Dynamic Portfolio Progress:** Dynamic calculation of portfolio progress percentage was integrated into `PortfolioOverviewService` during T-3.
- **Zero Backend Overhead:** The entire executive analytics layer was accomplished in pure client-side reactive Angular signals without adding backend load or database migrations.
