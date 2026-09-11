# Requirements — Results Table Resizable Columns (Drag-to-Resize)

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `docs/specs/changes/results-table-resizable-columns/` |
| Slug | `results-table-resizable-columns` |
| Type | **Change** |
| Approval Mode | `gated` |
| Depth | Standard |
| Surface | `/result-framework-reporting/entity-details/:entityId/results` → `ProgrammeResultsComponent` |

---

## 2. Executive Summary

In the Science Program **Results** tab (`ProgrammeResultsComponent`), table columns are currently rendered using hardcoded CSS Grid tracks (e.g., `minmax(240px, 2fr)` for title, `minmax(140px, 1fr)` for category). On large screens, this causes excessive empty space in short-text columns like `Category`, while truncating long result titles in `Result`.

This specification introduces **interactive column resizing (drag-to-resize)**:
- Users can click and drag the divider between column headers to widen or narrow any column.
- Header and data rows remain synchronized in real time with zero layout jitter or overflow regressions.
- Double-clicking a divider or using a reset action reverts column widths to their defaults.
- Custom widths are persisted to `localStorage` across page reloads.

---

## 3. User Stories

### US-1: Dynamic Column Width Adjustment
> As a result submitter or reviewer viewing a Science Program's results,  
> I want to drag the right edge of any table column header to resize it,  
> So that I can expand the result title column to read long titles without opening each result, and shrink narrow columns like status or category.

### US-2: Reset Column Widths
> As a user who has modified table column sizes,  
> I want to easily restore the original default column widths,  
> So that I can return to a balanced default view whenever needed.

### US-3: Preference Persistence
> As a regular user of the PRMS reporting platform,  
> I want my custom column widths to remain saved when I refresh the page or navigate between tabs,  
> So that I do not have to readjust column widths every time I enter the Results page.

---

## 4. Requirements & Acceptance Criteria

### TRC-R-1: Interactive Drag-to-Resize Handle on Column Headers
Each resizable column header (`th.pgr-th`) MUST provide an interactive resize handle positioned on its right edge.
- **TRC-AC-1.1**: The resize handle MUST display `cursor: col-resize`.
- **TRC-AC-1.2**: Hovering over or dragging the handle MUST show a subtle visual indicator (`var(--pr-color-primary-400)` or border tint).
- **TRC-AC-1.3**: The handle area MUST capture pointer interactions and MUST NOT trigger column sorting (`$event.stopPropagation()` on `mousedown` and `click`).
- **TRC-AC-1.4**: The sticky Actions header and cell (`...`) MUST NOT have a resize handle and MUST remain pinned to the right edge.

### TRC-R-2: Real-Time Grid Track Updating & Synchronous Row Alignment
Dragging a resize handle MUST adjust that column's width in real time across the entire table.
- **TRC-AC-2.1**: During dragging, the column width in both the header (`tr.pgr-head`) and every body row (`tr.pgr-data-row`) MUST update synchronously via the shared `grid()` signal.
- **TRC-AC-2.2**: The column width MUST be clamped to a minimum width (`column.minPx`) to prevent columns from collapsing or becoming unreachable.
- **TRC-AC-2.3**: Horizontal scrolling (`minWidth()`) MUST automatically adapt to accommodate expanded column widths when total table width exceeds the viewport container.

### TRC-R-3: Persistence of Custom Column Widths
Custom widths MUST be retained across navigation and browser sessions.
- **TRC-AC-3.1**: Custom column widths MUST be serialized to `localStorage` under key `pr.programmeResults.columnWidths` upon drag completion (`mouseup`).
- **TRC-AC-3.2**: On initial component load, saved widths MUST be read and applied to `grid()` and `minWidth()`.
- **TRC-AC-3.3**: If `localStorage` contains corrupted or invalid JSON, the system MUST fail gracefully and fall back to default column tracks without throwing exceptions.

### TRC-R-4: Reset Functionality
Users MUST have a clear and frictionless way to reset adjusted column widths to their defaults.
- **TRC-AC-4.1**: Double-clicking a resize handle MUST reset that specific column back to its default track definition.
- **TRC-AC-4.2**: The `Columns ⚙` dropdown popover MUST include a "Reset column widths" option when any custom column width is active.
- **TRC-AC-4.3**: Invoking the reset action MUST clear stored custom widths and restore default CSS Grid tracks.

---

## 5. Scenarios (Given / When / Then)

### Scenario 1: Dragging to widen Result column
- **Given** the user is on the Results tab with default column widths (`Result` is ~450px wide),
- **When** the user drags the right border handle of the `Result` header 200px to the right,
- **Then** the `Result` column widens to ~650px in both the header and all rendered rows,
- **And** no column sorting is triggered by the mouse interaction.

### Scenario 2: Enforcing minimum column width
- **Given** the `Code` column has a minimum width of `92px`,
- **When** the user attempts to drag the `Code` header handle 80px to the left,
- **Then** the column width stops shrinking at `92px` and does not collapse.

### Scenario 3: Double-clicking to reset column width
- **Given** the `Category` column has been manually resized to `300px`,
- **When** the user double-clicks the resize handle of the `Category` column header,
- **Then** that column reverts to its default responsive track `minmax(140px, 1fr)`.

### Scenario 4: Preserving widths across reload
- **Given** the user resized the `Title` and `Status` columns,
- **When** the user reloads the page or navigates to the `Reporting` tab and returns to `Results`,
- **Then** the saved widths are loaded from `localStorage` and applied immediately.

---

## 6. Non-Functional Requirements

- **Zero Layout Jitter**: Drag updates must run smoothly using `requestAnimationFrame` or immediate signal updates without layout flickering.
- **Accessibility**: Resize handles must have proper `aria-label` or `title` (`Drag to resize column; double-click to reset`) and must not break keyboard accessibility of table headers.
- **Isolation**: Changes must be completely scoped to `ProgrammeResultsComponent` without affecting other platform tables.
