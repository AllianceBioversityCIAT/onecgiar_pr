# Module Spec — Requirements: Reporting By-AoW View Tabular Layout & HLO/Outcomes Consistency

- **Module:** `result-framework-reporting`
- **Feature:** `reporting-by-aow-tabular-consistency`
- **Owner:** Frontend Engineering / Design Team
- **Status:** `in-review`
- **Approval Mode:** `gated`
- **Branch:** `qa-development-2026`
- **PRD Reference:** `docs/prd.md` (G1, G2, US-S1, US-Q1, AC-1, AC-6)
- **UX/UI Reference:** `docs/ux-ui/design.md` (§7 Design Tokens, §8 Components, §9 Visual Polish)
- **TRD Reference:** `docs/trd/trd.md` (§5 Frontend Architecture, Workflow W1)

---

## 1. Executive Summary

When viewing a single Area of Work in the Result Framework Reporting tab (`plannedBrowseView() === 'byAow'`), users encounter a layout and styling breakdown:
1. **Misaligned metrics:** Target, Achieved, Count, and QA/Prel Progress figures are inline flex items with fluctuating widths, causing numbers to shift horizontally across rows rather than aligning down clean table columns.
2. **HLO vs Outcomes inconsistency:** HLO cards display clean purple badge chips (`[ HL013 ]`) and clean titles (`Power seed scaling`), whereas Outcomes render plain raw text with the code dumped into the title (`I-OC 3.5. Women, men, youth and vulnerable groups accessing quality seed...`).
3. **Missing column headers:** No table header identifies the columns (`Target`, `Achieved`, `KPIs`, `Progress`), forcing repetitive uppercase labels (`TARGET:`, `ACHIEVED:`) to be repeated inside every single card header.

This specification addresses these defects by standardizing code extraction across HLOs and Outcomes, introducing a structured CSS Grid table layout ("tipo tabla") with aligned column tracks, and providing section table headers to ensure full parity with the main Reporting table.

---

## 2. Glossary

| Term | Definition |
|---|---|
| **By-AoW View** | Single Area of Work deep-dive view (`plannedBrowseView() === 'byAow'`) displaying HLO and Outcome groups. |
| **HLO (High-Level Output)** | Intermediate deliverable or work package defined under an Area of Work (e.g. `HL013`, `HLO4`). |
| **Outcome** | Higher-level research outcome defined under an Area of Work (e.g. `I-OC 3.5`, `OC 3.1`). |
| **Code Badge** | Styled chip (`.pr-hlo-code`) with purple background, border, and monospace bold font displaying the ToC code. |
| **Tabular Grid** | Fixed-column CSS Grid where headers and row metrics share identical column tracks (`minmax(240px, 1fr) 76px 76px 64px 130px`). |

---

## 3. User Stories

- **`BTC-US-1`** — *As a result submitter or reviewer*, I want the By-AoW view to look like a clean, professional table ("tipo tabla"), so that I can scan Target, Achieved, KPIs, and Progress in vertical columns without numbers jumping horizontally between rows.
- **`BTC-US-2`** — *As a user*, I want consistent badges and clean titles across both High-Level Outputs and Outcomes, so that Outcomes display badges like `[ I-OC 3.5 ]` rather than messy un-split text.
- **`BTC-US-3`** — *As a user*, I want clean column headers above each section, so that I don't have to decipher repeated inline `TARGET:` and `ACHIEVED:` labels on every row.

---

## 4. Functional Requirements

### Requirement BTC-R-1: Code Badge & Title Sanitization Parity
The system MUST extract standardized code badges for both High-Level Outputs (e.g., `HL013`, `HLO4`) and Outcomes (e.g., `I-OC 3.5`, `OC 3.1`, `IO2`, `EOI3`). Leading codes and trailing punctuation (such as trailing periods or hyphens) MUST be removed from the display title so that both tiers render with identical visual hierarchy.

#### Acceptance Criteria
- **`BTC-AC-1.1`**: For an outcome with raw title `I-OC 3.5. Women, men, youth, and marginalized social groups accessing quality seed...`, `cleanHloCode()` MUST return `I-OC 3.5` and `splitGroupTitle()` MUST return `{ code: 'I-OC 3.5', name: 'Women, men, youth, and marginalized social groups accessing quality seed...' }`.
- **`BTC-AC-1.2`**: In the By-AoW view template, Outcome rows MUST render the `<span class="pr-hlo-code">` chip containing the clean code token, followed by the sanitized descriptive name.
- **`BTC-AC-1.3`**: In `reporting-aow-table.component.ts`, `cleanHloCode()` and `clusterByTitle()` MUST also support `I-OC` and `OC` prefixes, ensuring cross-view parity.

### Requirement BTC-R-2: Tabular Column Grid Alignment ("Tipo Tabla")
The system MUST replace the unstructured inline flex metrics container in By-AoW group button rows with a structured CSS Grid table layout.

#### Acceptance Criteria
- **`BTC-AC-2.1`**: The group button row MUST use CSS Grid with fixed column tracks:
  - Column 1: Expand/collapse chevron (28px)
  - Column 2: Code badge + title (`minmax(240px, 1fr)`)
  - Column 3: Target value (76px, centered or tabular-nums)
  - Column 4: Achieved value (76px, centered or tabular-nums, color `var(--pr-color-green-500)`)
  - Column 5: KPIs count (64px, centered numeric pill)
  - Column 6: Progress QA/Prel (130px, centered or stacked percentages)
- **`BTC-AC-2.2`**: Across all HLO and Outcome rows in the view, column boundaries MUST align vertically with pixel precision.
- **`BTC-AC-2.3`**: Target and Achieved cells MUST present values in a clean stacked block with small uppercase sub-labels (`TARGET`, `ACHIEVED`), eliminating character-width jitter.

### Requirement BTC-R-3: Table Column Headers
Each By-AoW section (`High Level Outputs`, `Outcomes`) MUST provide a table column header matching the CSS Grid column tracks on viewports ≥ 768px.

#### Acceptance Criteria
- **`BTC-AC-3.1`**: The table column header MUST display column labels: `Indicator / Outcome`, `Target`, `Achieved`, `KPIs`, and `Progress`.
- **`BTC-AC-3.2`**: The table column header MUST align exactly with the group rows below it.

### Requirement BTC-R-4: Responsive and Accessibility Integrity
The By-AoW tabular view MUST remain accessible, keyboard-operable, and responsive.

#### Acceptance Criteria
- **`BTC-AC-4.1`**: On viewports < 899px, the table container MUST support horizontal scrolling (`overflow-x-auto`) to prevent truncation or overlapping.
- **`BTC-AC-4.2`**: All existing accordion click triggers, keyboard accessibility (`focus-visible`), and ARIA attributes (`aria-expanded`) MUST be preserved.
