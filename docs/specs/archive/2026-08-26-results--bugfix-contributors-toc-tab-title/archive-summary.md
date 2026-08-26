# Archive Summary: ToC KPI Tabs Title (HLO vs Outcome)

## 1. Document Control

| Attribute | Value |
|---|---|
| **Original Spec Path** | `docs/specs/results/bugfix-contributors-toc-tab-title/` |
| **Archive Date** | 2026-08-26 |
| **Final Status** | Complete / Verified |
| **Approval Mode** | gated |
| **Budget vs Actual** | Budget: 1 task, ~25 LOC, 1 review round. Actual: 1 task, ~25 LOC, 1 review round (0 rework loops). |

---

## 2. Executive Summary

Fixed a bug in `CPMultipleWPsComponent` where ToC contribution tabs unconditionally rendered `HLO N~X` ("High Level Output") regardless of whether the result was an Output or an Outcome.

The computed signal `isOutput` was introduced to distinguish Output results (`result_level_id === 4` or `resultLevelId === 1`) from Outcome results (`result_level_id === 3` or `2`), rendering `Outcome N~X` for Outcome results (e.g. Policy Change, Result 8836) and `HLO N~X` for Output results (e.g. Knowledge Product).

---

## 3. Requirements Delivered

- [x] **`RES-R-TOCTAB-1`**: When viewing an Outcome result (`result_level_id === 3` or `2`), tab titles render `Outcome N~1`, `Outcome N~2`, etc.
- [x] **`RES-R-TOCTAB-2`**: When viewing an Output result (`result_level_id === 4` or `resultLevelId === 1`), tab titles render `HLO N~1`, `HLO N~2`, etc.
- [x] **`RES-R-TOCTAB-3`**: The confirmation message when deleting a tab is synchronized via `isOutput()`, stating `TOC-Outcome N° X` or `TOC-Output N° X`.

---

## 4. Files Changed Summary

- [`onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/components/multiple-wps/multiple-wps.component.ts`](file:///Users/jcadavid/orca/workspaces/onecgiar_pr/qa-development-2026/onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/components/multiple-wps/multiple-wps.component.ts)
  - Implemented `isOutput` computed signal checking `currentResultSignal()?.result_level_id` and signal-backed `_resultLevelId`.
  - Fixed `dynamicTabTitle` to return `'HLO'` if `isOutput()` is true, and `'Outcome'` otherwise.
  - Aligned `completnessStatusValidation` and `onDeleteTab` to use `this.isOutput()`.
- [`onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/components/multiple-wps/cpmultiple-wps.component.spec.ts`](file:///Users/jcadavid/orca/workspaces/onecgiar_pr/qa-development-2026/onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/components/multiple-wps/cpmultiple-wps.component.spec.ts)
  - Added unit regression tests asserting tab titles for Outcome results (`result_level_id: 3`), Output results (`result_level_id: 4`), and input fallbacks.

---

## 5. Verification & Test Evidence Summary

- **Angular CLI Linting (`ng lint`)**: PASS (All files pass linting).
- **Jest Unit Tests (`cpmultiple-wps.component.spec.ts`)**: PASS (6 passed, 6 total).
- **Module Test Suite (`rd-contributors-and-partners`)**: PASS (115 passed across 8 test suites).
- **Reviewer Verdict**: PASS (Implementer `flash`, Reviewer `pro`).
