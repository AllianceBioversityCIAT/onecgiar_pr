# Tasks — Results Table Resizable Columns (Drag-to-Resize)

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `docs/specs/changes/results-table-resizable-columns/` |
| Slug | `results-table-resizable-columns` |
| Type | **Change** |
| Requirements | `TRC-R-1` through `TRC-R-4`, `US-1` through `US-3` |
| Design | `TRC-DD-1` through `TRC-DD-5` |
| Surface | `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/programme-results/` |

---

## 2. Tasks Breakdown

- [x] **TRC-T-1: Controller State, Storage & Drag Lifecycle in `ProgrammeResultsComponent`**
  - **Requirements**: `TRC-R-2`, `TRC-R-3`, `TRC-R-4`, `TRC-AC-2.1`, `TRC-AC-2.2`, `TRC-AC-3.1`, `TRC-AC-3.2`, `TRC-AC-4.1`, `TRC-AC-4.3`
  - **Design**: `TRC-DD-1`, `TRC-DD-2`, `TRC-DD-3`, `TRC-DD-5`
  - **Files to edit**:
    - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/programme-results/programme-results.component.ts`
  - **Scope**:
    - Export `PGR_COLUMN_WIDTHS_STORAGE_KEY`, `readStoredColumnWidths()`, `writeStoredColumnWidths()`.
    - Introduce `customWidths` signal and `hasCustomWidths` computed signal.
    - Update `grid()` and `minWidth()` computed signals to respect custom column widths.
    - Implement `onResizeStart(event: MouseEvent, column: PgrColumnDef, thElement: HTMLElement)`.
    - Implement window-level `mousemove` and `mouseup` handlers with clamping (`Math.max(column.minPx, ...)`), cursor management, and `localStorage` persistence.
    - Implement `onResizeReset(column: PgrColumnDef, event: MouseEvent)` and `resetAllColumnWidths()`.
    - Ensure clean teardown on component destroy (`ngOnDestroy`).
  - **Verification**:
    - `npx ng lint --lint-file-patterns="src/app/pages/result-framework-reporting/pages/programme-results/programme-results.component.ts"`
    - Verify clean TypeScript compilation with zero type errors.

---

- [ ] **TRC-T-2: HTML Template & CSS Resizer Handles and Reset Action**
  - **Requirements**: `TRC-R-1`, `TRC-AC-1.1`, `TRC-AC-1.2`, `TRC-AC-1.3`, `TRC-AC-1.4`, `TRC-AC-4.2`
  - **Design**: `TRC-DD-4`, `TRC-DD-5`
  - **Files to edit**:
    - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/programme-results/programme-results.component.html`
    - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/programme-results/programme-results.component.ts` (styles)
  - **Scope**:
    - In `programme-results.component.html`:
      - Add `#thEl` template ref and `.pgr-col-resizer` divider inside each `th.pgr-th--sortable`.
      - Wire `(mousedown)="onResizeStart($event, column, thEl)"`, `(dblclick)="onResizeReset(column, $event)"`, and `(click)="$event.stopPropagation()"`.
      - Add "Reset column widths" option inside `Columns ⚙` dropdown when `hasCustomWidths()` is true.
    - In `styles`:
      - Add `.pgr-col-resizer` styling (`position: absolute`, `right: 0`, `top: 0`, `bottom: 0`, `width: 7px`, `cursor: col-resize`, `z-index: 2`).
      - Add hover and active styling with `var(--pr-color-primary-400)` highlight.
      - Ensure relative positioning on `th.pgr-th` so handle anchors properly to the right edge.
  - **Verification**:
    - `npx ng lint --lint-file-patterns="src/app/pages/result-framework-reporting/pages/programme-results/*"`
    - Visual inspection of the table headers and divider interaction.

---

- [ ] **TRC-T-3: Unit & Regression Test Suite**
  - **Requirements**: `TRC-AC-1.3`, `TRC-AC-2.1`, `TRC-AC-2.2`, `TRC-AC-3.1`, `TRC-AC-4.1`, `TRC-AC-4.2`, `TRC-AC-4.3`
  - **Design**: Section 4 (Testing Strategy)
  - **Files to edit**:
    - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/programme-results/programme-results.component.spec.ts`
  - **Scope**:
    - Test `grid()` and `minWidth()` compute accurately when `customWidths` are provided.
    - Test that `readStoredColumnWidths()` and `writeStoredColumnWidths()` read/write to `localStorage` safely and tolerate errors.
    - Test that dragging updates `customWidths` and enforces `minPx`.
    - Test that `onResizeReset` deletes the column entry and restores default track.
    - Test that `resetAllColumnWidths` clears all custom widths.
    - Test that clicking or dragging the resizer does NOT trigger column sorting on `PrTableComponent`.
  - **Verification**:
    - `npx jest --testPathPattern="programme-results.component.spec.ts"`
    - Ensure 100% tests pass.
