# Proposal — Reporting AoW & HLO Information Hierarchy (JIRA-Style Redesign)

- **Module:** `results-framework-reporting`
- **Spec Path:** `docs/specs/changes/reporting-aow-jira-hierarchy/`
- **Type:** `Change`
- **Status:** `draft`
- **Approval Mode:** `gated`
- **Branch:** `qa-development-2026`

---

## 1. Intent

Redesign the Theory of Change **Area of Work (AoW)** and **High-Level Output (HLO)** reporting sections in the Reporting tab to adopt a clean, legible, and structured information hierarchy inspired by **JIRA's Agile/Backlog interfaces**. 

Establish complete visual and structural coherence between the **All Areas of Work** view (`tocView=aows`) and the **By Area of Work** focused view (`tocView=byAow`), eliminating redundant metrics, reducing vertical clutter, and creating a unified, professional user experience for reporting results.

---

## 2. Problem / Current Behavior

### A. Number Clutter and Conflicting Metrics
In the current HLO accordion header (`reporting-aow-table.component.html:624-674`), a single row displays multiple competing metrics simultaneously:
- `TARGET: 2`
- `ACHIEVED: 0`
- `2 KPIs` (pill badge)
- `QA 0%`
- `PREL. 0%`
- `2 indicators` (subtitle text)

Showing both `2 KPIs` and `2 indicators` on the same row creates confusion. The eye has to jump across six separate numbers with differing font sizes, weights, and uppercase labels without a cohesive tabular grid.

### B. Incoherence between "All AOWs" and "By AOW" Views
1. **HLO Identification:**
   - In **All AOWs** (`tocView=aows`), an HLO is rendered as plain text: `Foster motivations` (missing the official HLO code).
   - In **By AOW** (`tocView=byAow`), the same HLO is rendered with a heavy prefix: `HLO4.AOW1.IO1 · Foster motivations`.
2. **Visual Framing:**
   - In **All AOWs**, the AoW is a large accordion card.
   - In **By AOW**, the AoW is an isolated banner with 3-4 KPI tiles, while the HLOs below have different border styles, padding, and font metrics.
   - Users moving between the two views experience jarring visual shifts rather than a natural "zoom-in" on an Area of Work.

### C. Bulky In-Card Filter Strip
When an AoW card is expanded, it renders a multi-line `FILTERS BY CENTER & TYPE` block with up to 10+ pill buttons (`All (30) | IITA (5) | IRRI (5)...` and `All Types | Knowledge product (10)...`). This block consumes 80–110px of vertical space per expanded card, pushing actual content below the fold.

### D. Weak Information Hierarchy
Nested accordions (AoW card → HLO group → Indicator row) lack distinct visual container boundaries. Indicators inside an HLO blend into the background without the crisp, structured row alignment that tools like JIRA provide (such as semantic left color bars, standardized key chips, status pills, and compact action triggers).

---

## 3. Proposed Outcome

### 1. JIRA-Style Row & Group Architecture
Inspired by JIRA's Backlog and sprint work-item hierarchy:
- **Level 1 — Area of Work (Group / Epic level):**
  - Crisp card header with AoW code pill (`AOW01`), descriptive title, info disclosure (`ⓘ`), and consolidated progress ratio (`Achieved / Target`) with a clean progress bar.
  - Dedicated `[By AOW]` jump button.
- **Level 2 — High-Level Output (HLO / Work Package level):**
  - Clean collapsible row with standardized HLO badge (`HLO-04` or `HLO4`), bold title, and a single, well-aligned metrics cluster:
    - `Target: X` / `Achieved: Y`
    - Progress percentages: `QA %` (bold) and `Prel. %` (secondary) with explanatory tooltip
    - Indicator count badge `[ N ]`
  - Eliminates duplicate `N indicators` text.
- **Level 3 — Planned Indicator (Issue / Task level):**
  - High-density, tabular row featuring:
    - **Left vertical status bar:** Visual color token indicating status (Emerald = Achieved, Purple = Overachieved, Blue/Violet = In Progress, Slate/Gray = Not Started).
    - **Status icon / concentric target** aligned cleanly.
    - **Title & Metadata:** Description with compact metadata chips (`Type`, `Center`) on a single line.
    - **Target & Achieved:** Crisp numeric columns.
    - **Status Pill:** JIRA-style rounded badge with dropdown / drawer action.
    - **Progress:** Dual `QA %` / `Prel %` indicator.
    - **Actions:** Compact `[Report]` button and `[...]` overflow menu.

### 2. Unified Experience Across Views
- Use a **shared, reusable component architecture** for HLO sections and indicator rows.
- Whether viewing an expanded AoW inside `tocView=aows` or navigating to `tocView=byAow`, the HLO cards and indicator rows share the exact same:
  - Typography and spacing tokens (`--pr-*`).
  - HLO code badges (`HLO4` chip + title).
  - Metrics layout and column alignment.
  - Interactive row hover and drawer trigger states.

### 3. Streamlined In-Card Filters
- Replace the bulky multi-line button cloud with a compact, single-line JIRA-style **Quick Filters** bar:
  - Horizontal scrollable or flex wrap of compact chips (`All`, `CIAT (3)`, `IITA (5)`).
  - Clean active state (violet background with subtle border).
  - Integrated seamlessly below the AoW header or synchronized with the top toolbar filters.

---

## 4. Visual Reference

| Reference | File Path | Description |
|---|---|---|
| **Current All AOWs** | `docs/specs/changes/reporting-aow-jira-hierarchy/mockup/current-reporting-all-aows.png` | Current collapsed AoW cards in Reporting tab |
| **Current Expanded AoW** | `docs/specs/changes/reporting-aow-jira-hierarchy/mockup/current-all-aows-expanded.png` | Shows current cluttered metrics, filter block, and HLO accordions |
| **Current By AOW View** | `docs/specs/changes/reporting-aow-jira-hierarchy/mockup/current-by-aow-view.png` | Shows divergent HLO codes (`HLO4.AOW1.IO1`) and layout differences |
| **JIRA Reference 1** | `docs/specs/changes/reporting-aow-jira-hierarchy/mockup/jira-backlog-reference-1.png` | JIRA backlog row structure, left status stripes, status pills, and right actions |
| **JIRA Reference 2** | `docs/specs/changes/reporting-aow-jira-hierarchy/mockup/jira-backlog-reference-2.png` | Work item rows, type icons, key chips, and estimation pills |
| **JIRA Reference 3** | `docs/specs/changes/reporting-aow-jira-hierarchy/mockup/jira-backlog-reference-3.png` | Clean group headers with status badges and drawer layout |

---

## 5. Scope

### In Scope
1. **AoW Card Header & Container:**
   - Streamline metrics in the AoW accordion header (clear ratio, consistent progress track, responsive collapse).
2. **HLO Accordion Bar Redesign:**
   - Standardize HLO title and code badge across both `tocView=aows` and `tocView=byAow`.
   - Remove redundant number labels (`2 KPIs` vs `2 indicators`), aligning `Target`, `Achieved`, `QA %`, and `Prel %` in a structured layout.
3. **Indicator Row Polish (JIRA-style):**
   - Add left status color strip on indicator rows.
   - Clean up typography, chip alignment, and column spacing.
4. **Quick Filters Streamlining:**
   - Compact in-card Center & Type filter into a slim horizontal quick-filter bar.
5. **Component Unification:**
   - Unify the HLO rendering in `reporting-aow-table.component` and `dashboard-lab.component` (By AOW view) to share presentation logic and styling.
6. **Testing:**
   - Unit test suite updates across `reporting-aow-table.component.spec.ts` and `dashboard-lab.hub.spec.ts`.

### Non-Goals
- Changing backend ToC API responses or database schemas.
- Modifying the flat "All indicators" table (already streamlined in previous spec).
- Changing result submission logic, report drawer form fields, or validation rules.

---

## 6. Affected Users, Systems, and Specs

| Entity | Impact |
|---|---|
| **Result Submitters & Scientists** | Much faster scanning of planned work; clear understanding of what is completed vs pending; no cognitive overload from redundant numbers. |
| **QA Reviewers** | Rapid visual identification of QA-verified results (`QA %`) vs draft/preliminary submissions (`Prel %`). |
| **Program Managers & PMUs** | Consistent, high-density view that matches modern enterprise tooling (JIRA/Atlassian standards). |
| **Related Specs** | Extends `all-indicators-table-responsive` and `reporting-entry-hub` patterns. |

---

## 7. Requirement Delta Preview

### ADDED Requirements
- **`RAJ-R-1`:** HLO rows MUST display a standardized HLO badge (e.g., `HLO4` / `HLO-04`) and title consistently in both `All AOWs` and `By AOW` views.
- **`RAJ-R-2`:** Indicator rows in grouped view MUST render a left-edge status indicator stripe corresponding to the indicator's completion status.
- **`RAJ-R-3`:** In-card Center and Type filters MUST be rendered as a compact single-line quick-filter strip with maximum height of 36px.

### MODIFIED Requirements
- **`RAJ-R-4`:** HLO header metrics MUST consolidate Target, Achieved, and QA/Prel percentages into a single aligned tabular block, removing the redundant `X indicators` label.
- **`RAJ-R-5`:** The "By AOW" view and "All AOWs" expanded view MUST share identical card styling, borders, and typography tokens.

### REMOVED Requirements
- **`RAJ-R-6`:** Remove the redundant and conflicting dual count labels (`N KPIs` alongside `N indicators`) on HLO rows.
- **`RAJ-R-7`:** Remove the bulky multi-row filter button cloud from expanded AoW cards.

---

## 8. Approach Options

### Option A: Unified Architecture with Shared Template / Sub-Component (Recommended)
- **Concept:** Unify the HLO section and indicator row rendering so both `reporting-aow-table` (All AOWs) and `dashboard-lab` (By AOW) use the exact same template structures and CSS classes.
- **Pros:**
  - 100% visual and behavioral consistency guaranteed.
  - Single place to maintain HLO and Indicator row logic, styles, and a11y attributes.
  - Drastically reduces duplicated HTML and SCSS between `dashboard-lab.component.html` and `reporting-aow-table.component.html`.
- **Cons:** Requires clean refactoring of inputs/outputs for the HLO list.
- **Trade-off:** Minimal extra refactoring effort yields long-term maintainability and bulletproof UI coherence.

### Option B: Parallel CSS & HTML Refactoring (Without Structural Unification)
- **Concept:** Modify `reporting-aow-table.component.html` and `dashboard-lab.component.html` independently to match styles visually.
- **Pros:** Fast implementation with no component interface changes.
- **Cons:** Retains duplicated code; high risk of visual divergence in future updates.

**Recommendation:** **Option A**. Unifying the presentation layer directly answers the user's explicit request: *"tener algo en común y coherente entre la vista de all AOWs y by AOW"*.

---

## 9. Risks, Dependencies, and Open Questions

| Item | Type | Mitigation |
|---|---|---|
| **Class name dependencies in specs** | Risk | Existing tests check for `.pr-reporting-row` and `.pr-status-mark`. We will retain these semantic classes as styling anchors. |
| **Drawer integration** | Dependency | Indicator rows trigger `openRow` and `reportRow` events. Event signatures must remain 100% backward compatible. |
| **Responsive behavior on mobile (<768px)** | Design consideration | Use CSS grid and flex truncation with `sr-only` ladder so metrics collapse gracefully without horizontal overflow. |

---

## 10. Success Criteria

1. **Zero Redundant Numbers:** HLO rows present a clear, unified metric summary (`Target`, `Achieved`, `QA %`, `Prel %`) without conflicting `N KPIs` vs `N indicators` text.
2. **Visual Parity:** An HLO rendered inside an expanded AoW card in `tocView=aows` is visually identical to the same HLO rendered in `tocView=byAow`.
3. **JIRA Look & Feel:** Clean vertical status lines, crisp badge hierarchy (`AOW01` → `HLO4` → `Indicator`), compact quick filters, and subtle border/shadow styling.
4. **Zero Compilation or Test Regressions:** `npx ng build` and all unit test suites (`reporting-aow-table`, `dashboard-lab`, `reporting-program-band`) pass 100%.

---

## 11. Next Step

To proceed with detailed design, token mappings, and technical task decomposition:

```bash
/akili-specify changes/reporting-aow-jira-hierarchy
```
