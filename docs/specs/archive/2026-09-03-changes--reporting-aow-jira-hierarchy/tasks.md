# Module Spec — Tasks: Reporting AoW & HLO JIRA-Style Hierarchy

- **Module:** `results-framework-reporting`
- **Feature:** `reporting-aow-jira-hierarchy`
- **Linked Spec:**
  - Requirements: [`docs/specs/changes/reporting-aow-jira-hierarchy/requirements.md`](./requirements.md)
  - Design: [`docs/specs/changes/reporting-aow-jira-hierarchy/design.md`](./design.md)
  - Judgment: [`docs/specs/changes/reporting-aow-jira-hierarchy/judgment.md`](./judgment.md)
- **Status:** `complete`
- **Approval Mode:** `gated`
- **Branch:** `qa-development-2026`

---

## 1. Scope & Execution Strategy

This execution plan implements the approved JIRA-style visual hierarchy for the Area of Work (AoW) and High-Level Output (HLO) reporting sections in PRMS.

The work is split into three atomic, sequentially executable tasks:
1. **`RAJ-T-1` (S):** Remove redundant section title from `ReportingProgramBandComponent` and update unit tests.
2. **`RAJ-T-2` (M):** Refactor HLO headers, metrics consolidation, and compact quick-filters in `ReportingAowTableComponent`.
3. **`RAJ-T-3` (M):** Add JIRA-style indicator row status stripes, event preservation, and By-AOW view parity with unit test suite.

---

## 2. Pre-Flight Checklist

- [x] `requirements.md` is complete with testable scenarios and defect classes.
- [x] `design.md` is approved with Judgment Day dual review terminal receipt (`JUDGMENT: APPROVED ✅`).
- [x] All 5 event outputs (`openRow`, `reportRow`, `openTarget`, `openAchieved`, `copyLink`) explicitly mapped and preserved.
- [x] Responsive degradation ladder specified for viewports down to 768px.
- [x] Git working tree is clean on branch `qa-development-2026`.

---

## 3. Task List

### `RAJ-T-1` [x] — Remove Redundant Section Heading from Program Band
- **Type:** `client`
- **Estimate:** `S` (≤ 0.5d, ~25 LOC)
- **Implements:** `RAJ-R-7`, `RAJ-AC-7.1`, `RAJ-DD-1`
- **Files to edit:**
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-program-band/reporting-program-band.component.html`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-program-band/reporting-program-band.component.spec.ts`
- **Depends on:** `—`
- **Blocks:** `RAJ-T-2`
- **Scope:**
  - In `reporting-program-band.component.html`, remove lines 749-755 rendering `{{ reportingHeading() }}` and its container `div.px-[32px].pt-[24px].pb-[8px]`.
  - In `reporting-program-band.component.spec.ts`, update line 57 test `it('renders the section heading for Reporting')` to assert that the redundant heading is NOT rendered in the DOM.
- **Verification:**
  - Run: `npx jest --testPathPattern="reporting-program-band.component.spec.ts"` (all tests pass 100%).
- **Definition of Done:**
  - [x] Redundant heading completely removed from DOM.
  - [x] ~50px of vertical height reclaimed above AoW cards.
  - [x] All 64+ unit tests in `reporting-program-band.component.spec.ts` pass.
- **Skills:** `angular-developer`, `nestjs-expert`

---

### `RAJ-T-2` [x] — Refactor HLO Headers, Tabular Metrics & Quick Filters
- **Type:** `client`
- **Estimate:** `M` (≤ 1d, ~150 LOC)
- **Implements:** `RAJ-R-1`, `RAJ-R-2`, `RAJ-R-4`, `RAJ-R-6`, `RAJ-AC-1.1`, `RAJ-AC-2.1`, `RAJ-AC-4.1`, `RAJ-DD-2`, `RAJ-DD-3`, `RAJ-DD-5`
- **Files to edit:**
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-aow-table/reporting-aow-table.component.html`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-aow-table/reporting-aow-table.component.ts`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-aow-table/reporting-aow-table.component.scss`
- **Depends on:** `RAJ-T-1`
- **Blocks:** `RAJ-T-3`
- **Scope:**
  - In `reporting-aow-table.component.ts`:
    - Add helper `cleanHloCode(hlo: ReportingHloGroup): string` to extract clean badge token (e.g. `HLO4` or `HLO-04`).
  - In `reporting-aow-table.component.html`:
    - Refactor HLO accordion header (`#hlo-group-...`):
      - Left: Expand chevron + clean badge `<span class="pr-hlo-code">` + HLO Title (`text-[14px] font-bold min-w-0 truncate`).
      - Right: Tabular metrics cluster:
        - `Target: X`
        - `Achieved: Y` (color coded in `text-[var(--pr-color-green-500)]`)
        - `QA: %` / `Prel: %`
        - Count badge `[ N ]`
      - REMOVE redundant duplicate `N indicators` text.
      - Apply responsive ladder: coverage text hides at <1200px; percentages collapse to `sr-only` at <900px.
    - Refactor Center & Type filters:
      - Replace multi-line button cloud with sleek horizontal bar of compact chips (`h-[32px]`).
      - Active chip: `bg-[var(--pr-color-primary-500)] text-white border-transparent font-semibold shadow-xs`.
      - Inactive chip: `bg-white text-slate-700 border-[var(--pr-border)] hover:bg-slate-50`.
- **Verification:**
  - Run: `npx ng lint --lint-file-patterns="src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-aow-table/*"`
  - Run: `npx jest --testPathPattern="reporting-aow-table.component.spec.ts"`
- **Definition of Done:**
  - [x] HLO headers display standardized `HLO4` badge and clean title.
  - [x] Conflicting `N KPIs` vs `N indicators` text eliminated.
  - [x] Quick-filters rendered as sleek horizontal strip with max height 32px.
  - [x] Responsive rules prevent horizontal overflow on viewports down to 768px.
- **Skills:** `angular-developer`, `tailwind-design-system`, `ui-ux-pro-max`

---

### `RAJ-T-3` [x] — Indicator Row JIRA Status Stripes, Event Preservation & By-AOW Parity
- **Type:** `client`
- **Estimate:** `M` (≤ 1d, ~120 LOC)
- **Implements:** `RAJ-R-3`, `RAJ-R-5`, `RAJ-R-6`, `RAJ-AC-1.2`, `RAJ-AC-3.1`, `RAJ-AC-3.2`, `RAJ-AC-5.1`, `RAJ-DD-4`
- **Files to edit:**
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-aow-table/reporting-aow-table.component.html` (`#indicatorRow` template)
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/dashboard-lab.component.html` (By AOW view sections)
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/dashboard-lab.component.ts`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-aow-table/reporting-aow-table.component.spec.ts`
- **Depends on:** `RAJ-T-2`
- **Blocks:** `—`
- **Scope:**
  - In `reporting-aow-table.component.html` (`#indicatorRow` template):
    - Add 3px left status stripe dynamically mapped to PRMS color tokens:
      - `achieved` → `border-l-[var(--pr-color-green-500)]`
      - `overachieved` → `border-l-purple-500`
      - `in-progress` → `border-l-[var(--pr-color-primary-500)]`
      - `not-started` → `border-l-[var(--pr-border-strong)]`
    - Align metadata chips (`Type`, `Center`) neatly below indicator description.
    - Confirm all 5 event outputs (`openRow`, `reportRow`, `openTarget`, `openAchieved`, `copyLink`) are preserved with exact payloads.
  - In `dashboard-lab.component.html` (By AOW view):
    - Update `plannedByAowSections` to render standardized HLO badge `HLO4`, identical right-aligned tabular metrics cluster, and 3px status stripes on indicator rows.
    - Align By-AOW quick filter bar to identical `h-[32px]` styling.
  - In `reporting-aow-table.component.spec.ts`:
    - Add unit tests verifying `border-l-*` status classes based on status.
    - Add unit tests asserting absence of redundant `indicators` string on HLO header.
    - Add unit tests verifying event emissions on row actions.
- **Verification:**
  - Run: `npx jest --testPathPattern="reporting-aow-table.component.spec.ts"`
  - Run: `npx jest --testPathPattern="dashboard-lab\."`
  - Run: `npx ng build --configuration development` (0 template / typescript errors).
- **Definition of Done:**
  - [x] JIRA-style 3px colored status stripe renders on every indicator row.
  - [x] All 5 event outputs preserved without payload breakage.
  - [x] "All AOWs" expanded view and "By AOW" view are 100% visually coherent.
  - [x] 100% of unit tests pass with zero regressions.
- **Skills:** `angular-developer`, `ui-ux-pro-max`, `tdd`

---

## 4. Traceability Matrix

| Requirement | Scenario / Clause | Task | Test Verification |
|---|---|---|---|
| `RAJ-R-1` | Standardized HLO badge in All AOWs | `RAJ-T-2` | `reporting-aow-table.component.spec.ts` |
| `RAJ-R-1` | Standardized HLO badge in By AOW | `RAJ-T-3` | `dashboard-lab.component.spec.ts` |
| `RAJ-R-2` | Tabular metrics cluster (Target, Achieved, QA/Prel) | `RAJ-T-2` | `reporting-aow-table.component.spec.ts` |
| `RAJ-R-2` | Elimination of redundant `N indicators` text | `RAJ-T-2` | `reporting-aow-table.component.spec.ts` |
| `RAJ-R-3` | JIRA-style 3px status stripe on indicator rows | `RAJ-T-3` | `reporting-aow-table.component.spec.ts` |
| `RAJ-R-4` | In-card quick-filters bar (height ≤ 32px) | `RAJ-T-2` | `reporting-aow-table.component.spec.ts` |
| `RAJ-R-5` | Visual parity between All AOWs and By AOW views | `RAJ-T-3` | `dashboard-lab.component.spec.ts` |
| `RAJ-R-6` | Responsive degradation without horizontal overflow | `RAJ-T-2`, `RAJ-T-3` | `npx ng build --configuration development` |
| `RAJ-R-7` | Removal of redundant heading from program band | `RAJ-T-1` | `reporting-program-band.component.spec.ts` |

---

## 5. Dependency DAG

```text
RAJ-T-1 (Remove redundant title from program band & update tests)
   │
   ▼
RAJ-T-2 (Refactor HLO headers, metrics consolidation & quick filters)
   │
   ▼
RAJ-T-3 (Indicator row JIRA status stripes, event preservation & By-AOW view parity)
```
