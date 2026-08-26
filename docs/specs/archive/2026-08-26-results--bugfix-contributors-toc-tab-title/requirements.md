# Module Spec — `requirements.md`

## 1. Document Control

| Attribute | Value |
|---|---|
| **Spec Path** | `docs/specs/results/bugfix-contributors-toc-tab-title/` |
| **Feature / Bug** | ToC KPI Tabs Title (HLO vs Outcome) |
| **Type** | Bug |
| **Status** | ready-to-implement |
| **Owner** | Antigravity AI |
| **Approval Mode** | gated |
| **Parent Spec** | none |

---

## 2. Executive Summary

In the **Contributors & Partners** section (`rd-contributors-and-partners`), when the question *"Can this result be mapped to a ToC KPI?"* is answered with **YES**, ToC contribution tabs are rendered by `<app-cp-multiple-wps>`.

Currently, the tab prefix unconditionally renders `HLO N~X` ("High Level Output") for all results, including **Outcome** results such as Policy Change, Innovation Use, Capacity Change, and Other Outcome. This bug occurs due to duplicated identical `if` statements in `dynamicTabTitle = computed(...)`.

This specification formalizes the requirements to dynamically render `Outcome N~X` for Outcome results and `HLO N~X` for Output results.

---

## 3. User Stories & Acceptance Criteria

### `RES-R-TOCTAB-1` — Outcome Result Tab Title
**As a** result submitter or reviewer reporting an Outcome-level result (e.g. Policy Change, Innovation Use, Capacity Change, Other Outcome),  
**I want** each ToC contribution tab header to read `Outcome N~1`, `Outcome N~2`, etc.,  
**So that** the label correctly represents that this result contributes to Theory of Change Outcomes (such as Intermediate Outcomes or 2030 Outcomes) rather than High Level Outputs.

#### Scenarios:
- **Scenario 1 (Outcome result by `result_level_id: 3`):**
  - **Given** the current result has `result_level_id === 3` (Initiative Outcome),
  - **When** the ToC tabs are rendered,
  - **Then** `dynamicTabTitle()` returns `'Outcome'`, and tab elements render `<p class="tab-title">Outcome N~1</p>`, `<p class="tab-title">Outcome N~2</p>`, etc.
- **Scenario 2 (Outcome result by `resultLevelId: 2` input):**
  - **Given** `resultLevelId` is passed as `2` (or `3`),
  - **When** the ToC tabs are rendered without a global `currentResultSignal`,
  - **Then** `dynamicTabTitle()` returns `'Outcome'`.

---

### `RES-R-TOCTAB-2` — Output Result Tab Title
**As a** result submitter or reviewer reporting an Output-level result (e.g. Knowledge Product, Innovation Development, Capacity Sharing for Development, Other Output),  
**I want** each ToC contribution tab header to read `HLO N~1`, `HLO N~2`, etc.,  
**So that** the label accurately indicates High Level Output contributions.

#### Scenarios:
- **Scenario 1 (Output result by `result_level_id: 4`):**
  - **Given** the current result has `result_level_id === 4` (Initiative Output),
  - **When** the ToC tabs are rendered,
  - **Then** `dynamicTabTitle()` returns `'HLO'`, and tab elements render `<p class="tab-title">HLO N~1</p>`, `<p class="tab-title">HLO N~2</p>`, etc.
- **Scenario 2 (Output result by `resultLevelId: 1` input):**
  - **Given** `resultLevelId` is passed as `1` (legacy output mapping) or `4`,
  - **When** the ToC tabs are rendered,
  - **Then** `dynamicTabTitle()` returns `'HLO'`.

---

### `RES-R-TOCTAB-3` — Delete Tab Confirmation Message Alignment
**As a** result submitter deleting an extra ToC contribution tab,  
**I want** the confirmation alert message to accurately state `TOC-Outcome N° X` or `TOC-Output N° X`,  
**So that** the alert text aligns with the result level being edited.

#### Scenarios:
- **Scenario 1 (Delete tab on Outcome):**
  - **Given** an Outcome result with multiple tabs,
  - **When** the user clicks the delete button for tab 2,
  - **Then** the confirmation alert states: `"Are you sure you want to delete contribution TOC-Outcome N° 2 to the TOC?"`.
- **Scenario 2 (Delete tab on Output):**
  - **Given** an Output result with multiple tabs,
  - **When** the user clicks the delete button for tab 2,
  - **Then** the confirmation alert states: `"Are you sure you want to delete contribution TOC-Output N° 2 to the TOC?"`.

---

## 4. Mandatory Regression Test (Bug Mode)

The implementation must include an automated regression test in:
`onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/components/multiple-wps/cpmultiple-wps.component.spec.ts`

The test must verify:
1. When `result_level_id: 3` (Outcome, e.g. Policy Change), the DOM tab title contains `"Outcome N~1"` and `"Outcome N~2"`.
2. When `result_level_id: 4` (Output, e.g. Knowledge Product), the DOM tab title contains `"HLO N~1"` and `"HLO N~2"`.
3. Before the fix, test case (1) fails (RED state) because `dynamicTabTitle()` unconditionally returned `'HLO'`.
4. After the fix, all tests pass (GREEN state).
