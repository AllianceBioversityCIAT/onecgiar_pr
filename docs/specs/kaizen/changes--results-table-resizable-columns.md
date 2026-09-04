# Kaizen Retrospective — Results Table Resizable Columns

- **Spec Path:** `docs/specs/changes/results-table-resizable-columns/`
- **Archive Date:** 2026-09-03
- **Branch:** `qa-development-2026` (spec branch; pin `master`)
- **Outcome:** Clean Execution & Delivery — 3/3 Tasks Completed, 3/3 Reviewer PASS on attempt 1
- **Commit:** `13ef78a50`

---

## Metrics

| Metric | Planned | Actual | Ratio / Notes |
|---|---|---|---|
| Tasks | 3 | 3 | 100% — `TRC-T-1`, `TRC-T-2`, `TRC-T-3` |
| Rework Attempts | 0 | 0 | 3/3 tasks passed on first attempt |
| Review Rounds | 3 | 3 | All PASS on Attempt 1 |
| Unit Tests | 61 | 68 | +7 new tests for column resizing |
| Linter Errors | 0 | 0 | `ng lint` clean |
| Dev Build | PASS | PASS | 15.9s, 0 errors |

---

## Lessons

- **KZ-changes--results-table-resizable-columns-1 — Dynamic CSS Grid Track Resolution Eliminates DOM Layout Shifts During Live Dragging.** (Product, Low)
  - Root cause: Binding custom pixel widths directly into the reactive `grid()` computed signal (`visibleColumns().map(c => custom[c.key] ? \`${custom[c.key]}px\` : c.track)`) allowed the entire table body to resize smoothly via native CSS Grid without modifying individual cell DOM nodes.
  - Evidence: `programme-results.component.ts:180-210`.
  - Standardization: → Positive practice; recommend for other grid-based tables in PRMS.

- **KZ-changes--results-table-resizable-columns-2 — Prevent Event Bubbling on Resizer Handles to Avoid Sorting Inadvertence.** (Product, Low)
  - Root cause: In tables where clicking a column header triggers column sorting, resizer handle `mousedown` and `click` events must call `event.stopPropagation()` to prevent unwanted sort state changes while the user is resizing.
  - Evidence: `programme-results.component.ts:240`, `programme-results.component.spec.ts:1170`.
  - Standardization: → P1 (local).

---

## Noted, not a lesson

- **Double-click to reset individual columns matches native spreadsheet UX:** Users accustomed to Excel/Google Sheets intuitively double-click column dividers; providing this via `(dblclick)="onResizeReset(column, $event)"` received immediate positive feedback.

---

## Pending Items

All await the default-branch apply phase; nothing below was written on this branch.

### P1

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/programme-results/AGENTS.md` |
| Edit | Add: "Resizable table column headers must call `stopPropagation()` on resize handle `mousedown` and `click` to isolate resizing from sort interactions." |
| Severity | Low |
| Status | pending |
