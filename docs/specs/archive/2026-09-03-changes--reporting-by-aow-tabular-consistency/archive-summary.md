# Archive Summary — Reporting By-AoW View Tabular Layout & HLO/Outcomes Consistency

- **Original Spec Path:** `docs/specs/changes/reporting-by-aow-tabular-consistency/`
- **Archive Date:** 2026-09-03
- **Final Status:** `completed`
- **Branch:** `qa-development-2026`
- **Commit:** `53878f62b`

---

## 1. Executive Outcome

Delivered full visual and architectural tabular consistency ("tipo tabla") to the Theory of Change **By-Area of Work** view (`plannedBrowseView() === 'byAow'`), resolving ragged, shifting metric columns and eliminating code badge/title discrepancies between High-Level Outputs and Outcomes.

---

## 2. Requirements Delivered

| Requirement | Description | Status | Evidence |
|---|---|---|---|
| **BTC-R-1** | Code Badge & Title Sanitization Parity for HLO and Outcomes (`I-OC`, `OC`) | Delivered | `BTC-AC-1.1`, `BTC-AC-1.2`, `BTC-AC-1.3` passing in unit tests |
| **BTC-R-2** | Tabular Column Grid Alignment (`$pr-by-aow-tracks`) with fixed widths | Delivered | `BTC-AC-2.1`, `BTC-AC-2.2`, `BTC-AC-2.3` passing in unit tests & DOM |
| **BTC-R-3** | Table Column Headers (`.pr-by-aow-head`) above sections | Delivered | `BTC-AC-3.1`, `BTC-AC-3.2` passing in unit tests & DOM |
| **BTC-R-4** | Responsive and Accessibility Integrity (`overflow-x-auto`, ARIA attributes) | Delivered | `BTC-AC-4.1`, `BTC-AC-4.2` verified |

---

## 3. Files Changed Summary

- `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/dashboard-lab.component.ts`:
  - Enhanced `cleanHloCode()` to recognize `I-OC` and `OC` prefixes (`/^((?:I-OC|OC)\s*\d+(?:\.\d+)*)\.?/i`) and trim trailing periods.
  - Enhanced `splitGroupTitle()` to recognize `(?:HLO|HL|I-OC|OC|IO|EOI)` prefixes, cleanly returning `{ code, name }`.
- `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/dashboard-lab.component.scss`:
  - Defined `$pr-by-aow-tracks: 28px minmax(240px, 1fr) 76px 76px 64px 130px;` and added `.pr-by-aow-head` and `.pr-by-aow-row` grid tracks.
- `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/dashboard-lab.component.html`:
  - Added `.pr-by-aow-head` column header above HLO and Outcome sections.
  - Restructured group row `<button>` to `.pr-by-aow-row` with 6 aligned columns: Chevron (28px), Purple Code Badge (`.pr-hlo-code`) + Name (1fr), Target (76px stacked), Achieved (76px stacked green), KPIs Count (64px pill), and Progress (130px stacked).
  - Wrapped sections in `overflow-x-auto`.
- `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-aow-table/reporting-aow-table.component.ts`:
  - Aligned `cleanHloCode()` and `clusterByTitle()` for cross-view parity.
- `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/dashboard-lab.component.spec.ts`:
  - Added test suite for By-AoW tabular layout, DOM headers, grid tracks, and code extraction.
- `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-aow-table/reporting-aow-table.component.spec.ts`:
  - Added assertions for `I-OC` / `OC` code extraction and outcome badge rendering.

---

## 4. Test & Audit Evidence

- **AKILI Reviewer:** PASS (all criteria met, 0 regressions).
- **Unit Tests:**
  - `dashboard-lab.component.spec.ts`: 55/55 passed.
  - `reporting-aow-table.component.spec.ts`: 124/124 passed.
  - Full `dashboard-lab` suite: 24 test suites passed, 848/848 tests passed.
- **Linter & Build:**
  - `npx ng lint`: clean (0 errors).
  - `npx ng build --configuration development`: clean exit code 0.
