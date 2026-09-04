# Archive Summary — Results Table Resizable Columns (Drag-to-Resize)

- **Original Spec Path:** `docs/specs/changes/results-table-resizable-columns/`
- **Archive Date:** 2026-09-03
- **Final Status:** `completed`
- **Branch:** `qa-development-2026`
- **Commit:** `13ef78a50`

---

## 1. Executive Outcome

Implemented drag-to-resize column capability on the Results tab table (`ProgrammeResultsComponent`), enabling users to dynamically resize columns with persistence in `localStorage`, visual feedback (`col-resize` cursor, accent bar), double-click reset, and a global reset action.

---

## 2. Requirements Delivered

| Requirement | Description | Status | Evidence |
|---|---|---|---|
| **TRC-R-1** | Interactive Resizer Handle & Visual Feedback | Delivered | `TRC-AC-1.1`–`1.4` passing |
| **TRC-R-2** | Drag Lifecycle & Clamping to `minPx` | Delivered | `TRC-AC-2.1`–`2.2` passing |
| **TRC-R-3** | Dynamic CSS Grid Track Resolution | Delivered | `TRC-AC-3.1`–`3.2` passing |
| **TRC-R-4** | LocalStorage Persistence & Reset Capabilities | Delivered | `TRC-AC-4.1`–`4.3` passing |

---

## 3. Files Changed Summary

- `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/programme-results/programme-results.component.ts`:
  - Added `customWidths`, `hasCustomWidths`, `isResizing` signals.
  - Implemented window-level mouse drag lifecycle with cleanup in `ngOnDestroy`.
  - Updated `grid()` and `minWidth()` computed signals to resolve custom pixel tracks dynamically.
  - Added `localStorage` read/write helper functions.
  - Added `.pgr-col-resizer` styles in component stylesheet.
- `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/programme-results/programme-results.component.html`:
  - Added `.pgr-col-resizer` handle to all resizable column `<th>` headers.
  - Added "Reset column widths" button to Columns popover.
- `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/programme-results/programme-results.component.spec.ts`:
  - Added 7 comprehensive unit tests covering drag clamping, localStorage persistence, single-column reset, global reset, and sort suppression.

---

## 4. Test & Audit Evidence

- **AKILI Reviewer:** PASS across all 3 tasks (`TRC-T-1`, `TRC-T-2`, `TRC-T-3`).
- **Unit Tests:** 68/68 passed in `programme-results.component.spec.ts`.
- **Linter & Build:** Clean (0 lint errors, 0 compilation errors).
