# Tasks — Reporting By-AoW View Tabular Layout & HLO/Outcomes Consistency

- **Spec:** `docs/specs/changes/reporting-by-aow-tabular-consistency/`
- **Requirements:** `docs/specs/changes/reporting-by-aow-tabular-consistency/requirements.md`
- **Design:** `docs/specs/changes/reporting-by-aow-tabular-consistency/design.md`

---

## Tasks

- [x] **BTC-T-1: Controller Regex & Parsing Updates for HLO and Outcome Parity**
  - **Scope:**
    1. In `dashboard-lab.component.ts`:
       - Update `cleanHloCode(raw)` to match `I-OC` / `OC` code prefixes and trim trailing punctuation.
       - Update `splitGroupTitle(title)` to recognize `I-OC` / `OC` prefixes and extract `{ code, name }`.
    2. In `reporting-aow-table.component.ts`:
       - Update `cleanHloCode()` and `clusterByTitle()` with identical `(?:HLO|HL|I-OC|OC|IO|EOI)` pattern matching.
    3. Unit tests:
       - Update `dashboard-lab.component.spec.ts` and `reporting-aow-table.component.spec.ts` to assert that `I-OC 3.5. ...` returns `I-OC 3.5`.
  - **Verification:**
    - `npx jest --testPathPattern="dashboard-lab.component.spec.ts"`
    - `npx jest --testPathPattern="reporting-aow-table.component.spec.ts"`

- [x] **BTC-T-2: SCSS & HTML Tabular Grid Layout in By-AoW View**
  - **Scope:**
    1. In `dashboard-lab.component.scss`:
       - Add `$pr-by-aow-tracks`, `.pr-by-aow-head`, and `.pr-by-aow-row`.
    2. In `dashboard-lab.component.html`:
       - Refactor lines 1652–1770 (`plannedByAowSections`):
         - Wrap sections in an `overflow-x-auto` container.
         - Add `.pr-by-aow-head` table column header (`Indicator / Outcome`, `Target`, `Achieved`, `KPIs`, `Progress`).
         - Update the group `<button>` to use `.pr-by-aow-row` grid.
         - Render the clean code badge `<span class="pr-hlo-code">` for both HLO and Outcome groups.
         - Render the clean descriptive title `hlo.split.name`.
         - Render stacked Target (`hloTargetSum` + `TARGET` sub-label).
         - Render stacked Achieved (`hloAchievedSum` + `ACHIEVED` sub-label).
         - Render centered KPIs count pill (`hlo.count`).
         - Render stacked Progress (QA % & Prel %).
  - **Verification:**
    - `npx ng lint --lint-file-patterns="src/app/pages/result-framework-reporting/pages/dashboard-lab/*"`
    - `npx ng build --configuration development`

- [x] **BTC-T-3: Test Suite & Cross-View Regression Verification**
  - **Scope:**
    1. Add tests in `dashboard-lab.component.spec.ts` verifying:
       - By-AoW renders table headers with column labels (`High-Level Output` / `Outcome`, `Target`, `Achieved`, `KPIs`, `Progress`).
       - Outcome rows render `.pr-hlo-code` badges.
       - Target, Achieved, and KPIs cells render with tabular grid classes.
    2. Full test suite execution across all dashboard-lab specs.
  - **Verification:**
    - `npx jest --testPathPattern="dashboard-lab"`
