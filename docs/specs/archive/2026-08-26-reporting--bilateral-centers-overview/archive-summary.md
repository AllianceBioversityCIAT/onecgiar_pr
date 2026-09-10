# Archive Summary: Overview of Centers with Reported W3/Bilateral Results

## 1. Document Control

| Attribute | Value |
|---|---|
| **Original Spec Path** | `docs/specs/reporting/bilateral-centers-overview/` |
| **Archive Date** | 2026-08-26 |
| **Final Status** | Complete / Verified |
| **Approval Mode** | auto-approved (pre-approved mode: user instructed "quiero que tu tomes la desicion de diseño") |
| **Budget vs Actual** | Budget: 2 tasks, ~60 LOC, 1 review round. Actual: 2 tasks, ~55 LOC, 1 review round per task (0 rework loops). |

---

## 2. Executive Summary

Replaced the legacy, static "Bilateral contributions" card (Card 5) on the Science Program Overview tab (`dashboard-lab/components/program-overview`) with a new, reactive horizontal bar distribution: **"Centers with reported W3/bilateral results"**.

The new card displays each CGIAR Center that reported W3/bilateral results mapped to the selected Science Program, along with its proportional progress bar and total count of reported results.

---

## 3. Requirements Delivered

- [x] **`BIL-R-CEN-1`**: Card 5 title updated to `"Centers with reported W3/bilateral results"` and subtitle `"Centers reporting W3 and bilateral results for this program"`.
- [x] **`BIL-R-CEN-2`**: Computed reactive aggregation in `DashboardLabComponent` (`overviewBilateralCenters`) that groups `bilateralRows()` by `lead_center`, sorting descending by count with alphabetical tie-breaking.
- [x] **`BIL-R-CEN-3`**: Horizontal progress bar per Center using `--pr-chart-2` fill and accessible `aria-label` attribute (`"<Center>: X results"` / `"1 result"`).
- [x] **`BIL-R-CEN-4`**: Empty state message rendered when no bilateral results exist: `"No centers have reported bilateral results for this program yet."`.
- [x] **`BIL-R-CEN-DEL-1`**: Completely removed legacy 3-row static role counts (*"Results where this program is tagged"*, *"Where this program is primary"*, *"Where this program is a contributor"*) and the disabled review status stub (*"Of those where this program is primary — COMING SOON"*).

---

## 4. Files Changed Summary

- [`onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/dashboard-lab.component.ts`](file:///Users/jcadavid/orca/workspaces/onecgiar_pr/qa-development-2026/onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/dashboard-lab.component.ts)
  - Implemented `overviewBilateralCenters = computed<OverviewCenterBar[]>(...)`.
- [`onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/dashboard-lab.component.html`](file:///Users/jcadavid/orca/workspaces/onecgiar_pr/qa-development-2026/onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/dashboard-lab.component.html)
  - Replaced `[bilateralRoles]` with `[bilateralCenters]="overviewBilateralCenters()"`.
- [`onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/program-overview/program-overview.component.ts`](file:///Users/jcadavid/orca/workspaces/onecgiar_pr/qa-development-2026/onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/program-overview/program-overview.component.ts)
  - Added `bilateralCenters` input, `bilateralCentersMax` computed, and `centerWidth` helper.
  - Removed obsolete `bilateralRoles` input.
- [`onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/program-overview/program-overview.component.html`](file:///Users/jcadavid/orca/workspaces/onecgiar_pr/qa-development-2026/onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/program-overview/program-overview.component.html)
  - Rendered new Card 5 markup with horizontal bars, counts, and empty state.
- [`onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/program-overview/program-overview.component.spec.ts`](file:///Users/jcadavid/orca/workspaces/onecgiar_pr/qa-development-2026/onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/program-overview/program-overview.component.spec.ts)
  - Updated 6-card heading assertion and added comprehensive test suite for Card 5 rendering, bar width, empty state, and legacy cleanup.

---

## 5. Verification & Test Evidence Summary

- **Angular CLI Linting (`ng lint`)**: PASS (0 errors, 0 warnings).
- **Jest Unit Tests**: PASS (24 passed, 24 total).
- **Reviewer Verdicts**:
  - `BIL-T-CEN-1`: PASS (Implementer `flash`, Reviewer `pro`)
  - `BIL-T-CEN-2`: PASS (Implementer `flash`, Reviewer `pro`)
