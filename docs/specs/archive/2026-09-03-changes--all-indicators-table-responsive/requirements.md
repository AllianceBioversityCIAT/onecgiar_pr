# Module Spec — All Indicators Table Responsive & Column Streamlining

- **Module:** `results-framework-reporting`
- **Sub-feature:** `reporting-aow-table` (All indicators flat view)
- **Status:** `implemented`
- **Spec Path:** `docs/specs/changes/all-indicators-table-responsive/requirements.md`

---

## 1. Context

The "All indicators" table in the Results Framework Reporting module allows researchers, Science Program teams, and QA reviewers to view, search, and sort across all planned indicators for a Science Program/Accelerator without opening individual Area of Work (AoW) cards.

Currently, the table renders 8 columns (`Indicator`, `AoW`, `Type`, `Center`, `Target`, `Achieved`, `Status`, `Actions`) with a rigid `min-width: 820px` and `$pr-flat-tracks` totaling ~952px. On standard screens with the 240px platform sidebar open, this creates mandatory horizontal scrolling and severe column squeeze. Furthermore, the `Status` column provides low value compared to quantitative ToC Progress (`QA %` / `Prel %`), and the transient `Next pending` button breaks column alignment and inflates the Actions cell.

This spec streamlines the table to a 100% fluid, zero-horizontal-scroll architecture, replaces the status pill with ToC Progress, and groups secondary metadata cleanly under the indicator title.

Reference: `docs/prd.md` (`US-3`, `AC-6`), `docs/ux-ui/design.md` (§7, §8, §9).

---

## 2. In Scope / Out of Scope

### In Scope
- Zero-horizontal-scroll table grid architecture (`width: 100%`, no horizontal overflow).
- Rebalancing column tracks from 8 columns to 6 streamlined columns.
- Consolidating `Type` and `Center` metadata under the indicator title.
- Replacing the static `Status` pill column with a quantitative `Progress` column (`QA %` and `Prel. %`).
- Removing the `Next pending` button and completion badge from flat table rows.
- Compact Actions cell (`[Report]` + `[Link]` + `[...]`).
- Sorting by Progress (`QA %`).
- Unit and regression tests in `reporting-aow-table.component.spec.ts`.

### Out of Scope
- Modifying the Grouped AoW cards view (`viewMode() === 'grouped'`).
- Changing backend ToC progress calculation logic.
- Modifying the report result drawer or CGSpace modal forms.

---

## 3. Personas Affected

| Persona | What changes for them |
|---|---|
| **Result submitter** | Can view the entire table comfortably without horizontal scrolling; sees exact QA vs. Preliminary progress on each indicator; cleaner reporting buttons. |
| **QA reviewer** | Immediate visibility into which indicators have results pending QA review vs. verified results (`QA %` vs `Prel. %`). |
| **PMU / Portfolio Lead** | High-density overview of Science Program indicators that renders consistently on any laptop screen. |

---

## 4. Requirements

### AIR-R-1 — Zero Horizontal Scroll Fluid Layout
The flat table container (`.pr-flat-scroll`) and rows (`.pr-flat-row`) MUST be 100% fluid within the parent container without horizontal scrollbars (`scrollWidth <= clientWidth`) across all viewport widths from 1600px down to 768px.
- **AIR-AC-1.1:** `.pr-flat-row` MUST NOT have a rigid `min-width: 820px`.
- **AIR-AC-1.2:** The grid track for the `Indicator` column MUST use `minmax(260px, 1fr)` to absorb available viewport width while preserving readability.

### AIR-R-2 — Indicator Metadata Cluster
The indicator cell MUST consolidate the indicator description, optional `Show more`/`Show less` toggle, and a metadata line containing the indicator category/type chip (`row.__typeLabel`) and center chip (`row.__centerLabel`).
- **AIR-AC-2.1:** If `row.__typeLabel` is present, render it as a rounded violet chip.
- **AIR-AC-2.2:** If `row.__centerLabel` is present and not `'—'`, render it as a slate center acronym chip.
- **AIR-AC-2.3:** The standalone `Type` and `Center` table columns are removed from the grid.

### AIR-R-3 — ToC Progress Column (Replacing Status)
The 7th column (`Status`) MUST be replaced by a `Progress` column displaying the indicator's Theory of Change achievement metrics: `QA %` (bold primary figure) and `Prel. %` (secondary figure).
- **AIR-AC-3.1:** Display `QA` prefix with bold percentage text (`row.progress_percentage || '0%'`).
- **AIR-AC-3.2:** Display `Prel.` prefix with secondary percentage text (`row.preliminary_progress_percentage || '0%'`).
- **AIR-AC-3.3:** If the indicator has no target (`!hasUsableTarget(row)`), render `'No target set'` or `'Overachieved'` italicized text matching the grouped view.
- **AIR-AC-3.4:** The column header carries a tooltip explaining the metric and supports numerical sorting via `prSortableColumn="__sortProgress"`.

### AIR-R-4 — Removal of Next Pending Action
The transient `Next pending` button and `All pending KPIs reported` badge MUST NOT be rendered in the flat table rows.
- **AIR-AC-4.1:** The Actions cell layout is identical across all rows: primary action button (`[Report]` / `[Continue]`), copy link icon button (when available), and overflow menu button (`[...]`).
- **AIR-AC-4.2:** The Actions column width is fixed at `~80px` and aligned to the right.

### AIR-R-5 — Column Grid Tracks & Alignment
The table grid MUST define exactly 6 columns:
1. `Indicator` — `minmax(260px, 1fr)` (left-aligned)
2. `AoW` — `48px` (center-aligned chip)
3. `Target` — `56px` (center-aligned figure + label)
4. `Achieved` — `56px` (center-aligned figure + label)
5. `Progress` — `76px` (center-aligned QA/Prel stack)
6. `Actions` — `80px` (right/center-aligned buttons)
- **AIR-AC-5.1:** Sum of fixed tracks + gaps is ~366px, ensuring >370px for the indicator title even on 1024px screens with sidebar open.
- **AIR-AC-5.2:** Numeric cells use `tabular-nums` for vertical baseline alignment.

### AIR-R-6 — Row Interaction & Affordance
Clicking anywhere on the row (outside direct buttons) MUST emit `openRow(row)` to open the indicator detail drawer.
- **AIR-AC-6.1:** Hovering on a row applies `bg-[var(--pr-surface-ground)]` and cursor pointer.
- **AIR-AC-6.2:** Clicking `[Report]`, `[Link]`, or `[...]` executes that specific action without triggering row selection.

---

## 5. Verification & Acceptance Scenarios

### Scenario 1 — Responsive Zero Scroll
- **Given** the user is viewing `SP04?tocView=all` on a 1024px viewport with the sidebar expanded.
- **When** the table renders,
- **Then** `container.scrollWidth === container.clientWidth`, no horizontal scrollbar is present, and the Indicator column width is >= 350px.

### Scenario 2 — Progress Metric Display
- **Given** an indicator has 1 Target and 0 Achieved with 0% QA and 5.6% Preliminary progress.
- **When** viewed in the All indicators table,
- **Then** column 5 displays `QA 0%` and `Prel. 5.6%` with the contextual tooltip.

### Scenario 3 — Actions Consistency
- **Given** an indicator is the last reported row in the session.
- **When** viewed in the flat table,
- **Then** no `Next pending` button is injected; the Actions cell maintains its standard 80px width.
