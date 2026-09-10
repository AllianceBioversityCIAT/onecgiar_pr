# Module Spec Requirements — AoW In-Card Filter Overflow & Indicator Row Compaction

- **Module:** `results-framework-reporting`
- **Feature:** `aow-filter-popover`
- **Type:** Change
- **Status:** `in-review`
- **Spec Path:** `docs/specs/changes/aow-filter-popover/`
- **Branch:** `qa-development-2026`

---

## 1. Context & Executive Summary

In Results Framework Reporting, users inspect Area of Work (AoW) indicators either within the grouped accordion cards (`ReportingAowTableComponent`) or the focused By-AoW view (`DashboardLabComponent`). When an AoW has multiple partner centers and result types, the horizontal filter bar renders up to 14+ buttons side-by-side without line wrapping. On desktop and laptop viewports, this causes severe button cramming ("apeñuscamiento"), clipped text, or awkward horizontal scrollbars.

Simultaneously, the indicator rows themselves suffer from visual bloat: oversized indicator titles (`13.5px semibold`), heavy Target and Achieved figures (`15px bold`), and large Report buttons (`32px`), accompanied by a transient "Next pending" button that disrupts layout uniformity.

This specification defines:
1. **Top-N + Popover In-Card Filters:** Showing `All` + top 3 Centers and `All` + top 2 Types directly, routing all overflow options into a compact `[ ⠚ Filter ]` popover button.
2. **Compact Indicator Row Sizing:** Scaling indicator titles to `12.5px`, Target/Achieved to `13px`, and Report buttons to `26px`, tightening minimum row height from `58px` to `48px`.
3. **Removal of "Next Pending":** Permanently removing the `Next pending` / `All pending KPIs reported` block from the grouped indicator row.
4. **By-AoW View Parity:** Applying identical filter overflow behavior to the By-AoW view in `DashboardLabComponent`.

---

## 2. In Scope / Out of Scope

### In Scope
- Slicing Centers (>3) and Types (>2) into visible and overflow partitions per AoW group.
- Adding a compact `[ ⠚ Filter ]` button with count badge and active state when overflow filters are active.
- In-card dropdown popover presenting remaining Centers and Types with indicator counts.
- Outside-click and Escape key handling to close in-card filter popovers.
- Scaling `#indicatorRow` typography and action elements down to enterprise table proportions.
- Removing `Next pending` from `#indicatorRow` in `ReportingAowTableComponent`.
- Applying matching filter overflow logic to the By-AoW view in `DashboardLabComponent`.
- Comprehensive Jest unit tests covering filter partitioning, popover interactions, and row element compaction.

### Out of Scope
- Modifying the global top toolbar filter controls in `ReportingProgramBandComponent`.
- Modifying the reporting drawer or result creation flows.
- Backend API or database changes.

---

## 3. Defect Classes & Verification Mapping

| Defect Class | What Catches It | Substitute If No Automated Check |
|---|---|---|
| Filter overflow cramming / layout break | Cypress layout sweep / real DOM tests | Visual inspection of mockup and rendered DOM |
| Popover toggle & dismissal failure | Jest unit tests simulating clicks and outside dismiss | — |
| Filter selection & data filtering mismatch | Jest unit tests verifying indicators filtered on overflow selection | — |
| Regressions in existing row actions (Report, Target, Achieved, Link) | Jest regression test suite in `reporting-aow-table.component.spec.ts` | — |
| Typography / CSS token mismatch | Component build (`ng build`) and SCSS variable audit | Manual check against `--pr-*` design tokens |

---

## 4. Functional Requirements

### AFP-R-1: In-Card Quick Filter Partitioning & Overflow Button
The system SHALL limit directly rendered center and type buttons within each AoW card to prevent horizontal cramming.
- Direct Center buttons: `All (total)` + at most 3 centers (sorted descending by indicator count).
- Direct Type buttons: `All Types` + at most 2 types (sorted descending by indicator count).
- If remaining centers > 0 OR remaining types > 0, an in-card `[ ⠚ Filter ]` button SHALL appear at the end of the filter bar.
- If total centers <= 4 and total types <= 3, all options SHALL be rendered directly without a Filter button.

#### Scenario: AoW with many centers and types
- GIVEN an AoW group with 6 partner centers and 4 result types
- WHEN the user expands the AoW card
- THEN the filter bar renders `All`, the top 3 centers, a divider, `All Types`, the top 2 types, and a `[ ⠚ Filter ]` button
- BUT it must NOT render the remaining 3 centers or 2 types directly in the horizontal strip
- AND IT MUST keep the filter strip within a fixed height of `32px` without forcing horizontal scrolling.

---

### AFP-R-2: In-Card Filter Popover Menu
Clicking the `[ ⠚ Filter ]` button SHALL open an accessible dropdown popover containing all overflow filter options.
- The popover displays sections for "Other Centers" and "Other Types" (only for categories with overflow items).
- Each overflow item displays its label and indicator count chip.
- Clicking an overflow item activates that filter, updates the indicators list immediately, and highlights the `[ ⠚ Filter ]` button.
- Clicking an already selected overflow item or clicking "All" clears that filter.
- Clicking outside the popover or pressing `Escape` closes the popover.

#### Scenario: Selecting an overflow center
- GIVEN the user clicks `[ ⠚ Filter ]` on an AoW card
- WHEN the user selects "CIP (4)" from the Other Centers section
- THEN the popover closes (or updates selection state)
- AND the AoW indicators list filters to show only CIP indicators
- AND the `[ ⠚ Filter ]` button displays an active style with a badge indicating active overflow filter count.

---

### AFP-R-3: Compact Indicator Row Sizing
The indicator rows in `ReportingAowTableComponent` SHALL render with compact, enterprise-grade proportions.
- Indicator title: `12.5px font-medium leading-[1.35] text-[var(--pr-text-heading)]`.
- Target and Achieved figures: `13px font-bold tabular-nums` with a subtle `9px` uppercase label (`Target` / `Achieved`).
- Report button: `height: 26px; padding: 0 10px; font-size: 11px; font-weight: 500; border-radius: 6px;`.
- Icon actions (`[ 🔗 ]` and `[ ⋯ ]`): `26px × 26px`.
- Minimum row height: `48px` (reduced from `58px`).

#### Scenario: Viewing indicator row in expanded AoW
- GIVEN the user expands an AoW card containing indicator rows
- WHEN the indicators are displayed
- THEN the indicator description is rendered at `12.5px`, Target/Achieved numbers at `13px`, and the Report action at `26px` height
- BUT it must NOT render text at `13.5px` or numbers at `15px`
- AND IT MUST preserve all tooltips and click handlers for Target and Achieved modal drill-downs.

---

### AFP-R-4: Removal of "Next Pending" Button
The transient `Next pending` / `All pending KPIs reported` button SHALL be completely removed from all indicator rows in `ReportingAowTableComponent`.
- The actions column in every indicator row SHALL consist strictly of: `[ 🔗 ]` (when linkable), `[ Report ]` (when permitted), and `[ ⋯ ]` (overflow menu).
- No row shall increase its height or wrap actions due to a "Next pending" element.

#### Scenario: Viewing the last reported indicator row
- GIVEN an indicator row that was the most recently reported KPI
- WHEN the row is rendered
- THEN no `Next pending` button is displayed in the actions column
- AND the row height matches all other indicator rows (`48px`).

---

### AFP-R-5: Parity in By-AoW View
The By-AoW view in `DashboardLabComponent` SHALL apply the same Top-N + Filter Popover pattern to its in-card filter strip.
- Center options > 3 are routed to the By-AoW `[ ⠚ Filter ]` popover.
- Type options > 2 are routed to the By-AoW `[ ⠚ Filter ]` popover.
- Selecting any center or type updates `byAowSelectedCenter` and `byAowSelectedType` immediately.

---

## 5. Non-Functional Requirements

- **NFR-1 (Accessibility):** The `[ ⠚ Filter ]` trigger must have `aria-haspopup="true"` and `aria-expanded` reflecting popover state. The popover must close on `Escape`.
- **NFR-2 (Design Consistency):** Colors and borders must use standard PRMS CSS tokens (`--pr-color-primary-*`, `--pr-surface-*`, `--pr-border-*`, `--pr-text-*`).
- **NFR-3 (Performance):** Slicing arrays must be computed or memoized to prevent unnecessary re-computations on each change detection cycle.
- **NFR-4 (No Regressions):** Existing event emitters (`openRow`, `reportRow`, `openTarget`, `openAchieved`, `copyLink`) must remain 100% backward compatible.
