# Tasks — All Indicators Table Responsive & Column Streamlining

- **Module / Feature:** `results-framework-reporting`
- **Linked Specs:** `docs/specs/changes/all-indicators-table-responsive/requirements.md` + `design.md`
- **Status:** `done`

---

## Task List

### AIR-T-1 — HTML & SCSS 6-Column Fluid Grid & Template Refactor `[x]`

- **Type:** `client`
- **Description:** 
  Refactor `reporting-aow-table.component.html` and `.scss`:
  1. Remove standalone `Type` and `Center` columns from the table header and body rows.
  2. Embed `Type` and `Center` chips inside the `Indicator` description cell below the title.
  3. Replace the `Status` pill column with a `Progress` column displaying `QA %` (bold) and `Prel. %` (secondary) with explanatory tooltip.
  4. Remove `Next pending` button and completion badge from row actions.
  5. Compact Actions column to `80px` (`[Report]`, `[Link]`, `[...]`).
  6. Update `$pr-flat-tracks` to `minmax(260px, 1fr) 48px 56px 56px 76px 80px`, remove `min-width: 820px`, and set zero-scroll fluid container.
- **Implements:** `AIR-R-1`, `AIR-R-2`, `AIR-R-3`, `AIR-R-4`, `AIR-R-5`, `AIR-R-6`
- **Files:**
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-aow-table/reporting-aow-table.component.html`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-aow-table/reporting-aow-table.component.scss`
- **Depends on:** `—`
- **Blocks:** `AIR-T-2`, `AIR-T-3`
- **Estimate:** `S`
- **Definition of Done:**
  - [x] Table renders 6 columns cleanly without horizontal scroll down to 768px.
  - [x] `Next pending` is removed from table rows.
  - [x] `Progress` renders `QA %` and `Prel %` with proper tooltips.
  - [x] Linter passes clean.

---

### AIR-T-2 — Controller Data & Sort Keys Refactor `[x]`

- **Type:** `client`
- **Description:**
  In `reporting-aow-table.component.ts`:
  1. In `flatTableRows()`, add `__sortProgress` computed from `progressOf(row)`.
  2. Deprecate/clean up `__sortStatus` if no longer used.
  3. Ensure bindings for `progressTracksTooltip`, `hasUsableTarget`, `isOverachievedWithoutTarget` work seamlessly in the flat view template.
- **Implements:** `AIR-R-3`, `AIR-R-5`
- **Files:**
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-aow-table/reporting-aow-table.component.ts`
- **Depends on:** `AIR-T-1`
- **Blocks:** `AIR-T-3`
- **Estimate:** `S`
- **Definition of Done:**
  - [x] `__sortProgress` sorts numerically by QA percentage.
  - [x] Angular template compiles without errors (`ng build`).

---

### AIR-T-3 — Unit & Regression Test Suite `[x]`

- **Type:** `tests`
- **Description:**
  Update `reporting-aow-table.component.spec.ts`:
  1. Update column header assertions (6 columns: `Indicator`, `AoW`, `Target`, `Achieved`, `Progress`, `Actions`).
  2. Verify `Progress` column displays `QA` and `Prel` percentages.
  3. Verify sorting by `Progress` works correctly.
  4. Verify absence of `Next pending` button in flat table rows.
  5. Ensure 100% test pass rate across `reporting-aow-table` and `dashboard-lab`.
- **Implements:** `AIR-AC-1.1`, `AIR-AC-3.1`, `AIR-AC-4.1`, `AIR-AC-5.1`
- **Files:**
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-aow-table/reporting-aow-table.component.spec.ts`
- **Depends on:** `AIR-T-1`, `AIR-T-2`
- **Blocks:** `—`
- **Estimate:** `S`
- **Definition of Done:**
  - [x] All tests in `reporting-aow-table.component.spec.ts` pass 100%.
  - [x] All tests in `dashboard-lab` pass 100%.
