# Proposal — Reporting By-AoW View Tabular Layout & HLO/Outcomes Consistency

- **Module:** `result-framework-reporting`
- **Spec Path:** `docs/specs/changes/reporting-by-aow-tabular-consistency/`
- **Type:** `Change`
- **Status:** `draft`
- **Approval Mode:** `gated`
- **Branch:** `qa-development-2026`

---

## 1. Intent

Redesign the Theory of Change **By-Area of Work (By-AoW)** view (`plannedBrowseView() === 'byAow'`) in the Reporting tab to present a clean, vertically-aligned **table structure ("tipo tabla")** and ensure complete visual and architectural consistency between **High-Level Outputs (HLOs)** and **Outcomes**.

---

## 2. Problem Statement & Root Cause

### A. Lack of Tabular Column Alignment (Ragged, Shifting Metrics)
In the current By-AoW view (`dashboard-lab.component.html:1675-1768`):
- Each HLO and Outcome card header is a free-floating flex row with `ml-auto` containing inline text:
  `TARGET: 112   ACHIEVED: 0   [ 18 ]   QA 0% PREL. 13.2%`
  `TARGET: 30447 ACHIEVED: 0   [ 31 ]   QA 0% PREL. 0%`
  `TARGET: 1000000 ACHIEVED: 0 [ 2 ]    QA 0% PREL. 0%`
  `TARGET: 0     ACHIEVED: 0   [ 1 ]    QA — PREL. —`
- Because target values vary in character count (from 0 to 1,000,000), `ACHIEVED: 0` starts at a different horizontal coordinate on every single row.
- The count pill `[ 18 ]` and progress indicators `QA 0% PREL. ...` jump left and right, creating a ragged, unaligned, and unpolished appearance that breaks the tabular reading pattern of the rest of Reporting.

### B. Inconsistent Code Badges & Unsanitized Titles
- **HLO cards:** Render a standardized purple badge chip `[ HL013 ]` followed by the sanitized descriptive title `Power seed scaling`.
- **Outcome cards:** Fail to extract a badge because `cleanHloCode()` and `splitGroupTitle()` only match `/^(HLO|HL|IO|EOI)/i`, missing `I-OC`, `OC`, etc. As a result:
  - Outcome rows render **no badge chip**.
  - The raw code prefix is dumped into the title: `I-OC 3.5. Women, men, youth and vulnerable groups accessing quality seed...`.
  - HLOs and Outcomes look like they belong to two completely different platforms.

### C. Missing Table Header
- Neither the `High Level Outputs` nor `Outcomes` sections provide column headers (`Title`, `Target`, `Achieved`, `KPIs`, `Progress`).
- Users must decipher repeated inline labels (`TARGET:`, `ACHIEVED:`) on every row instead of glancing down clean, structured table columns.

---

## 3. Proposed Solution

### 1. Code Badge & Title Sanitization Parity
- Expand `cleanHloCode()` and `splitGroupTitle()` in `dashboard-lab.component.ts` and `reporting-aow-table.component.ts` to recognize:
  - `I-OC` (e.g. `I-OC 3.5.`, `I-OC 1.1.`) → Badge: `[ I-OC 3.5 ]`, Title: `Women, men, youth...`
  - `OC` (e.g. `OC 3.1.`, `OC 2.1`) → Badge: `[ OC 3.1 ]`
  - `HLO`, `HL`, `IO`, `EOI` (existing)
- Trailing periods and hyphens (`3.5.`) are trimmed so the badge reads cleanly as `I-OC 3.5` and the title starts with the natural capitalized word.

### 2. Tabular Column Grid ("Tipo Tabla")
- Replace the free-floating flex metrics container with a structured **CSS Grid layout** matching the column distribution of `reporting-aow-table`:
  ```scss
  // 6-column grid for By-AoW group rows:
  // [Chevron 28px] [Code Badge + Title 1fr] [Target 76px] [Achieved 76px] [KPIs 64px] [Progress 130px]
  $pr-by-aow-tracks: 28px minmax(240px, 1fr) 76px 76px 64px 130px;
  ```
- **Target Cell:** Stacked block with bold numeric figure (`112`) and subtle uppercase label (`TARGET`).
- **Achieved Cell:** Stacked block with bold green figure (`0`) and subtle uppercase label (`ACHIEVED`).
- **KPIs Cell:** Centered numeric count pill (`18`, `31`, `2`).
- **Progress Cell:** Stacked QA % and Prel. % figures with tooltip explanation.
- Add an optional clean table column header above each section (`High Level Outputs`, `Outcomes`):
  `Indicator / Outcome | Target | Achieved | KPIs | Progress`

### 3. Visual Harmonization
- Uniform padding, border radius, and hover states across HLO and Outcome rows.
- Complete responsive safety: columns maintain alignment on desktop; on narrow viewports (<899px), grid tracks degrade gracefully without horizontal overflow.

---

## 4. Affected Components & Files

1. `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/dashboard-lab.component.html`
   - Update By-AoW section header and HLO/Outcome button row structure to use the tabular CSS grid and code badges.
2. `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/dashboard-lab.component.ts`
   - Update `cleanHloCode()` and `splitGroupTitle()` to support `I-OC`, `OC` prefixes and trim trailing punctuation.
3. `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/dashboard-lab.component.scss`
   - Add `.pr-by-aow-row` and `.pr-by-aow-head` grid styles.
4. `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-aow-table/reporting-aow-table.component.ts`
   - Align `cleanHloCode()` and `clusterByTitle()` for cross-view parity.
5. Unit tests:
   - `dashboard-lab.component.spec.ts`
   - `reporting-aow-table.component.spec.ts`

---

## 5. Verification Plan

1. **Unit Tests:**
   - Verify `cleanHloCode('I-OC 3.5. Women, men...')` returns `'I-OC 3.5'`.
   - Verify `splitGroupTitle('I-OC 3.5. Women, men...')` returns `{ code: 'I-OC 3.5', name: 'Women, men...' }`.
   - Verify By-AoW template renders `.pr-hlo-code` for both HLO and Outcome rows.
   - Run `npx jest --testPathPattern="dashboard-lab"` and `npx jest --testPathPattern="reporting-aow-table"`.
2. **Linting & Build:**
   - Run `npx ng lint` on modified files.
   - Run `npx ng build --configuration development`.
