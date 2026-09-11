# Portfolio Overview Refresh with Apache ECharts — Requirements

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/portfolio-overview-echarts` |
| Module | `platform-report` / `portfolio-overview` |
| Short Code | `POV` |
| Status | In-Review |
| Date | 2026-08-28 |
| Author | Juan Carlos Cadavid (j.cadavid@cgiar.org) |
| Target Package | `onecgiar-pr-client` (`pages/portfolio-overview/`) |
| PRD Ref | `docs/prd.md` §3 (PMU / Portfolio Lead), `G2` (Aggregation & Portfolio Consolidation), `AC-12` |
| TRD Ref | `docs/trd/trd.md` (Design Tokens §7, ECharts Visualization §8) |

---

## 2. Context & Problem Statement

The **Portfolio Overview** (`/result-framework-reporting/portfolio-overview`) is the single cross-cutting dashboard for CGIAR executive leadership, Science Program Directors, and the Program Management Unit (PMU) to monitor the entire reporting cycle across all 13 Science Programs.

While `/entity-details/:entityId/overview` was recently elevated with Apache ECharts interactive charts, dual view modes, proportional status meters, and executive KPI cards, the **Portfolio Overview** still relies on legacy, static visual elements:
1. "Results in this phase" is presented as a plain text box with simple color dots.
2. "Results by indicator category" and "Bilateral results" use hand-rolled CSS `<div>` progress bars with static widths, lacking interactive tooltips, origin breakdowns (W1/W2 vs W3/Bilateral), and data-table accessibility.
3. The top area lacks structured executive KPI cards with active phase badges and micro-metrics.
4. "Progress by science program" is an unshaded HTML table without high-level visual ranking comparisons across the 13 programs.

This specification defines the functional and non-functional requirements to modernize `/portfolio-overview` with **Apache ECharts** (`pr-viz-chart`), executive KPI cards, and rich analytical charts, while maintaining 100% client-side aggregation with zero backend schema or endpoint changes.

---

## 3. In Scope / Out of Scope

### In Scope
- **Top Deck Executive KPI Cards (`POV-R-1`):** 4 metric cards (Total Portfolio Results, W1/W2 Results, W3/Bilateral Results, Active Science Programs) with badges, micro-metrics, and subtitle context.
- **Portfolio Reporting Status Section (`POV-R-2`):** Dual representation with an interactive ECharts Donut (centered total count), proportional segmented meter bar, and responsive status metric tiles (`Editing`, `In QA`, `Submitted`, `Approved`, `Rejected`, `Discontinued`).
- **Results by Indicator Category (`POV-R-3`):** Interactive ECharts Horizontal Stacked Bar comparing W1/W2 vs W3/Bilateral outputs per indicator category with hover tooltips and view toggle.
- **Science Programs Output Ranking (`POV-R-4`):** ECharts Horizontal Grouped/Stacked Bar ranking SP01–SP13 by volume and status breakdown.
- **Contributing Centers Bilateral Distribution (`POV-R-5`):** Horizontal ranking of CGIAR Centers reporting bilateral results.
- **Enhanced Science Program Matrix (`POV-R-6`):** Sortable data matrix with optional heatmap cell intensity cues and deep-linking to program results.
- **Accessibility & Design Token Compliance (`POV-R-7`):** Wrapping all charts in `<app-pr-viz-chart>` with accessible data-table drawer, keyboard navigation, and theme tokens from `chart-tokens.util.ts`.

### Out of Scope
- Backend database schema or API endpoint modifications (re-uses existing payload from `GET /api/results/get/all/roles/filter/{userId}?page=1&limit=20000`).
- Cross-portfolio inline editing (Portfolio Overview is an executive monitoring surface).
- PDF/PPT export generation (handled by standard browser print / CSV export).

---

## 4. Personas Affected

| Persona | Role in PRMS | Impact of this Change |
|---|---|---|
| **PMU Lead / Portfolio Director** | Monitors portfolio health and submission readiness across all Science Programs | Gets immediate visual clarity on portfolio status, leading/lagging programs, and W1/W2 vs W3/Bilateral balance. |
| **Science Program Leader** | Compares program progress against portfolio benchmarks | Can benchmark their program against portfolio-wide averages and indicator category outputs. |
| **Platform Administrator** | Validates reporting cycle completeness | Gains a clean, accessible executive dashboard compliant with WCAG AA standards and design tokens. |

---

## 5. User Stories

- **`POV-US-1` (Executive Overview):** As a Portfolio Director, I want a top deck of executive KPI cards, so that I can immediately understand the overall scale, submission velocity, and bilateral reach of the active reporting cycle.
- **`POV-US-2` (Status Health & Velocity):** As a PMU Reviewer, I want an interactive Donut chart and proportional status meter, so that I can see the exact breakdown between draft (`Editing`), reviewed (`In QA`/`Pending Review`), and finalized (`Submitted`/`Approved`) results.
- **`POV-US-3` (Indicator Distribution):** As a Portfolio Analyst, I want an interactive breakdown of results by indicator category comparing W1/W2 and W3/Bilateral origins, so that I can analyze thematic investment and output types.
- **`POV-US-4` (Cross-Program Benchmarking):** As an Executive Stakeholder, I want to compare all 13 Science Programs in a ranked visual chart and heatmap matrix, so that I can identify which programs have completed reporting and which require follow-up.

---

## 6. Functional Requirements

### Executive KPI Summary Cards
- **`POV-R-1`** The system MUST display an executive top deck of 4 structured KPI summary cards:
  1. **Total Portfolio Results:** Total count of all results in the active cycle, cycle badge (e.g. `Reporting 2026 · P25`), and origin subtext (`X W1/W2 · Y W3/Bilateral`).
  2. **W1/W2 Results:** Total W1/W2 count, percentage in reported states (`Submitted` / `Quality Assessed`), and count of distinct categories with reported results.
  3. **W3/Bilateral Results:** Total bilateral count, percentage `Approved` / `Pending Review`, and count of distinct contributing CGIAR Centers.
  4. **Active Science Programs:** Count of reporting Science Programs (`13 / 13 Programs`) and average portfolio completion percentage.

#### Scenario: Rendering Top KPI Cards
- GIVEN the portfolio overview service has loaded results for the active reporting phase
- WHEN the user opens `/portfolio-overview`
- THEN the 4 KPI cards SHALL display accurate aggregate figures, formatted with tabular numerals (`tabular-nums`) and standard badge styles.

---

### Portfolio Reporting Status (Donut + Proportional Meter + Status Tiles)
- **`POV-R-2`** The system MUST provide a comprehensive "Portfolio reporting status" card featuring:
  - An **ECharts Donut Chart** with the total result count centered, rendered with official status color tokens (`--pr-status-*`).
  - A **Proportional Segmented Meter Bar** showing the exact percentage width of each status.
  - A symmetrical **Status Metric Tiles Grid** displaying counts and percentages for all active statuses: `Editing`, `In QA`, `Submitted`, `Approved`, `Rejected`, and `Discontinued` (when present).

#### Scenario: Status Tile Interaction
- GIVEN the portfolio status card is rendered with 6 status tiles
- WHEN a user inspects the tiles
- THEN each tile SHALL display the status color dot, label, bold count, and percentage of total, formatted with proper contrast tokens.

---

### Results by Indicator Category (Interactive Stacked Bars)
- **`POV-R-3`** The system MUST replace static HTML progress bars with an interactive **ECharts Horizontal Stacked Bar Chart** for "Results by indicator category":
  - Each bar represents an Indicator Category (e.g., Knowledge Products, Capacity Development, Policy Changes, Innovation Developments, Innovation Use, Other Output, Other Outcome).
  - Each bar is segmented into **W1/W2 (Primary Portfolio)** and **W3/Bilateral (Center-led)** contributions.
  - Interactive tooltip SHALL reveal the exact count, percentage of category, and origin breakdown.
  - Card SHALL provide a toggle between **Bars** and **Heatmap** / Table view.

#### Scenario: Category Chart Tooltip & Breakdown
- GIVEN a category with 40 Knowledge Products (25 W1/W2 and 15 Bilateral)
- WHEN the user hovers over the Knowledge Products bar
- THEN the tooltip SHALL display: `Knowledge Product: 40 total (25 W1/W2 · 15 Bilateral)`.

---

### Science Programs Output Ranking
- **`POV-R-4`** The system MUST provide an ECharts visual ranking chart comparing all 13 Science Programs:
  - Ranked in descending order of total reported results.
  - Stacked by status (`Editing` vs `Submitted`/`QA` vs `Approved`).
  - Clicking a program bar or code SHALL provide navigation to that program's Entity Details overview.

---

### Contributing Centers & Bilateral Reach
- **`POV-R-5`** The system MUST display an ECharts ranking of CGIAR Centers reporting W3/Bilateral results:
  - Displays top contributing centers (e.g., CIAT, CIMMYT, IRRI, IFPRI, ILRI, etc.) by bilateral output count and approval rate.
  - Enables toggling between top preview and complete center list.

---

### Enhanced Science Program Matrix & Heatmap Table
- **`POV-R-6`** The system MUST provide an upgraded matrix table for "Progress by science program":
  - Columns: Science Program, Total Results, followed by each result category.
  - Table cells MUST support subtle heatmap density shading based on relative output volume.
  - Table headers MUST support ascending/descending sorting on every column.
  - Program rows MUST provide clickable links navigating directly to `/result-framework-reporting/entity-details/<CODE>/overview`.

---

### Accessibility & Design Tokens
- **`POV-R-7`** Every ECharts visualization on the Portfolio Overview MUST:
  - Be wrapped in `<app-pr-viz-chart>`.
  - Provide an accessible Data Table drawer via `tableModel` with full keyboard and screen reader support.
  - Utilize design tokens from `chart-tokens.util.ts` (`--pr-chart-ramp`, `--pr-status-*`, `--pr-surface-*`, `--pr-text-*`), with zero unapproved hardcoded hex values.

---

### Phase Scoping & Data Resilience
- **`POV-R-8`** The system MUST scope all aggregate calculations to the active reporting phase (`phase_status === 1` or current reporting cycle), and display clear banner messaging if viewing a closed phase or partial dataset.

---

## 7. Non-Functional Requirements

- **`POV-NFR-1` (Performance):** Client-side aggregations for up to 20,000 results MUST execute in `< 100ms` using memoized Angular signals and pure chart builder functions.
- **`POV-NFR-2` (Accessibility):** All interactive visualizations and tables MUST comply with WCAG 2.1 AA contrast ratios (minimum 4.5:1 for text, 3.0:1 for graphical controls).
- **`POV-NFR-3` (Responsiveness):** The dashboard grid MUST adapt gracefully across screen widths from 1440px+ desktop down to 768px tablet and 375px mobile viewports.
- **`POV-NFR-4` (Testability):** All chart option builders and aggregators MUST be pure functions with 100% unit test coverage in Jest without DOM or canvas rendering dependencies.

---

## 8. Requirement ID Index & Defect Class Mapping

| Requirement ID | Description | Primary Defect Class | Verification Gate |
|---|---|---|---|
| `POV-R-1` | Executive Top Deck KPI Cards | Data discrepancy / NaN values | Jest unit tests on computed totals + DOM assertion |
| `POV-R-2` | Portfolio Status Donut & Proportional Meter | Missing status / slice overlap | Jest unit tests for `portfolioStatusDonutOption` + `tableModel` |
| `POV-R-3` | Results by Indicator Category Stacked Bar | Incorrect origin stacking / tooltip error | Jest builder tests for `categoryOriginBarOption` |
| `POV-R-4` | Science Programs Output Ranking Chart | Sorting / status segmentation error | Jest builder tests for `programRankingOption` |
| `POV-R-5` | Contributing Centers Bilateral Distribution | Missing center data / truncation | Jest builder tests for `centerDistributionOption` |
| `POV-R-6` | Enhanced Matrix Table & Heatmap Shading | Sorting failure / link routing error | Jest component tests for sorting & router navigation |
| `POV-R-7` | A11y & Design Token Compliance | Contrast failure / untokenized hex | `chart-tokens.util.ts` assertion + automated lint |
| `POV-R-8` | Phase Scoping & Resilience | Cross-phase data leakage | Jest unit tests with multi-phase mock envelopes |
