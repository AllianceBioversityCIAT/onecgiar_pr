# Implementation Tasks — 3-Level Visual Hierarchy Refinement in Reporting AoW Table

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/reporting-aow-hierarchy` |
| Feature Name | 3-Level Visual Hierarchy Refinement (`reporting-aow-table`) |
| Module Code | `RAH` |
| Type | Change |
| Depth | Standard |
| Status | complete |
| Linked Spec | [`requirements.md`](file:///Users/jcadavid/orca/workspaces/onecgiar_pr/qa-development-2026/docs/specs/changes/reporting-aow-hierarchy/requirements.md) · [`design.md`](file:///Users/jcadavid/orca/workspaces/onecgiar_pr/qa-development-2026/docs/specs/changes/reporting-aow-hierarchy/design.md) |
| Visual Mockup Reference | [`docs/specs/changes/reporting-aow-hierarchy/mockup/index.html`](file:///Users/jcadavid/orca/workspaces/onecgiar_pr/qa-development-2026/docs/specs/changes/reporting-aow-hierarchy/mockup/index.html) |
| Sizing Budget | 3 tasks · ~120-160 LOC · 1 review round |
| Kaizen Lessons Applied | `KZ-changes--reporting-aow-jira-hierarchy-1` (template JIT compilation verification at every mutation), `KZ-changes--reporting-aow-jira-hierarchy-2` (protect public event contracts) |

---

## 1. Pre-flight Checklist

- [x] `requirements.md` drafted and approved (`RAH-R-1` through `RAH-R-6`, `RAH-NFR-1` through `RAH-NFR-3`).
- [x] `design.md` drafted and approved (`RAH-DD-1` through `RAH-DD-3`).
- [x] Visual reference generated and verified via interactive mockup (`mockup/index.html`).
- [x] No backend, database or API changes required (strictly frontend client presentation).
- [x] Kaizen active lessons incorporated into task definitions.

---

## 2. Task Breakdown

### `RAH-T-1` — Level 2 HLO Sub-Card Enclosure & Semantic Taxonomy Badges `[x]`

- **Type:** `client`
- **Description:** 
  Refactor the HLO group rendering in `reporting-aow-table.component.html` and `reporting-aow-table.component.scss` to transform the un-enclosed table row into an autonomous sub-card container (`rounded-xl border border-slate-200/90 bg-white shadow-2xs`). Implement the distinct surface gradient header (`from-slate-50 via-indigo-50/30 to-slate-50`), rotating chevron button, semantic taxonomy chip (`OUTPUT 1.1` or `OUTCOME 1.2` in monospace indigo font), and consolidated micro-KPI metric blocks (Target, Achieved, Indicator count, QA % / Prel %).
- **Implements:** `RAH-R-1` (Scenarios 1.1, 1.2), `RAH-R-2` (Scenarios 2.1, 2.2), `RAH-R-3` (Scenario 3.1), `RAH-NFR-3`, `RAH-DD-1`, `RAH-DD-2`.
- **Files:**
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-aow-table/reporting-aow-table.component.html`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-aow-table/reporting-aow-table.component.scss`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-aow-table/reporting-aow-table.component.ts` (helper method for taxonomy type label if needed)
- **Depends on:** `—`
- **Blocks:** `RAH-T-2`
- **Estimate:** `S` (≤ 0.5d)
- **Skills:** `angular-developer`, `ui-ux-pro-max`, `frontend-design`
- **Definition of Done:**
  - [x] Each HLO group renders inside a rounded sub-card with a distinct surface tint header.
  - [x] Semantic taxonomy pill `[OUTPUT X.Y]` or `[OUTCOME X.Y]` is displayed prominently.
  - [x] Micro-KPI blocks (Target, Achieved, count badge, QA%) are formatted cleanly on the right.
  - [x] Collapsing the HLO smoothly preserves the compact single-row summary.
  - [x] JIT template compilation check passes immediately: `npx jest --testPathPattern="reporting-aow-table"` (`KZ-changes--reporting-aow-jira-hierarchy-1`).

---

### `RAH-T-2` — Level 3 Indented Indicator Scaffolding & Contextual Sub-Header `[x]`

- **Type:** `client`
- **Description:** 
  Refactor the indicator listing within the expanded HLO sub-card to apply 20px–24px visual indentation (`pl-6`) and a vertical tree-line guide (`border-l-4 border-indigo-500/40`). Embed the contextual column header (`INDICATOR TITLE & TAXONOMY | TARGET | ACHIEVED | STATUS | PROGRESS | ACTION`) within the indented container with a compact height (`h-7`) and uppercase typography. Refine indicator row typography, metadata badges, and secondary buttons for high visual craft.
- **Implements:** `RAH-R-4` (Scenario 4.1), `RAH-R-5` (Scenario 5.1), `RAH-NFR-1`, `RAH-NFR-2`, `RAH-DD-3`.
- **Files:**
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-aow-table/reporting-aow-table.component.html`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-aow-table/reporting-aow-table.component.scss`
- **Depends on:** `RAH-T-1`
- **Blocks:** `RAH-T-3`
- **Estimate:** `S` (≤ 0.5d)
- **Skills:** `angular-developer`, `ui-ux-pro-max`, `frontend-design`
- **Definition of Done:**
  - [x] Child indicators are visually indented by 24px under the HLO header.
  - [x] Vertical accent tree line visually anchors the indicator items to their parent HLO.
  - [x] Scoped contextual column header renders inside the indented container and aligns with row grid tracks.
  - [x] Row hover and action buttons render with responsive styling (<900px graceful degradation).
  - [x] JIT template compilation check passes: `npx jest --testPathPattern="reporting-aow-table"` (`KZ-changes--reporting-aow-jira-hierarchy-1`).

---

### `RAH-T-3` — Unit Test Suite Updates & Event Contract Verification `[x]`

- **Type:** `tests`
- **Description:** 
  Update unit tests in `reporting-aow-table.component.spec.ts` to reflect the updated sub-card DOM structure, taxonomy pills, and indented container. Verify 100% preservation of public event outputs (`openRow`, `reportRow`, `copyLink`, `openTarget`, `openAchieved`) and keyboard accessibility. Execute full regression test suites across dashboard-lab and run linter.
- **Implements:** `RAH-R-6` (Scenarios 6.1, 6.2), `RAH-NFR-1`, `RAH-NFR-2`.
- **Files:**
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-aow-table/reporting-aow-table.component.spec.ts`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-aow-table/CLAUDE.md` (guide sync)
- **Depends on:** `RAH-T-2`
- **Blocks:** `—`
- **Estimate:** `S` (≤ 0.5d)
- **Skills:** `angular-developer`, `systematic-debugging`
- **Definition of Done:**
  - [x] All unit tests in `reporting-aow-table.component.spec.ts` pass without failures.
  - [x] Tests assert presence of HLO sub-cards, taxonomy pills, and indented indicator container.
  - [x] Event dispatch tests verify `openRow`, `reportRow`, `copyLink`, `openTarget`, and `openAchieved` emit expected payloads and stop bubbling (`KZ-changes--reporting-aow-jira-hierarchy-2`).
  - [x] Full dashboard-lab test suite passes (946+ tests).
  - [x] `npx ng lint --quiet` runs clean with 0 errors.

---

## 3. Dependency Graph

```
RAH-T-1 (HLO Sub-Card Enclosure & Taxonomy Pill)
   └── RAH-T-2 (Indented Indicator Scaffolding & Sub-Header)
         └── RAH-T-3 (Unit Tests & Event Contract Verification)
```

---

## 4. Test Plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `RAH-TEST-1` | unit | `RAH-R-1`, `RAH-R-2`, `RAH-R-3` | `reporting-aow-table.component.spec.ts` |
| `RAH-TEST-2` | unit | `RAH-R-4`, `RAH-R-5` | `reporting-aow-table.component.spec.ts` |
| `RAH-TEST-3` | unit | `RAH-R-6` (Event contracts & isolation) | `reporting-aow-table.component.spec.ts` |
| `RAH-TEST-4` | suite | Full regression suite (946 tests) | `pages/result-framework-reporting/pages/dashboard-lab/` |

---

## 5. Traceability Matrix

| Requirement / Scenario / Clause | Addressed by Task | Test ID |
|---|---|---|
| `RAH-R-1` Scenario 1.1 (Expanded HLO sub-card display) | `RAH-T-1` | `RAH-TEST-1` |
| `RAH-R-1` Scenario 1.2 (Collapsed HLO sub-card display) | `RAH-T-1` | `RAH-TEST-1` |
| `RAH-R-2` Scenario 2.1 (Output taxonomy badge) | `RAH-T-1` | `RAH-TEST-1` |
| `RAH-R-2` Scenario 2.2 (Outcome taxonomy badge) | `RAH-T-1` | `RAH-TEST-1` |
| `RAH-R-3` Scenario 3.1 (Metric layout & no wrap) | `RAH-T-1` | `RAH-TEST-1` |
| `RAH-R-4` Scenario 4.1 (Indented indicator container) | `RAH-T-2` | `RAH-TEST-2` |
| `RAH-R-5` Scenario 5.1 (Contextual column sub-header) | `RAH-T-2` | `RAH-TEST-2` |
| `RAH-R-6` Scenario 6.1 (Event dispatch preservation) | `RAH-T-3` | `RAH-TEST-3` |
| `RAH-R-6` Scenario 6.2 (Keyboard & ARIA accessibility) | `RAH-T-3` | `RAH-TEST-3` |
| `RAH-NFR-1` (Micro-transition performance) | `RAH-T-2`, `RAH-T-3` | `RAH-TEST-2` |
| `RAH-NFR-2` (Responsive fluidity <900px) | `RAH-T-2`, `RAH-T-3` | `RAH-TEST-2` |
| `RAH-NFR-3` (Design token compliance) | `RAH-T-1`, `RAH-T-2` | `RAH-TEST-1`, `RAH-TEST-2` |

