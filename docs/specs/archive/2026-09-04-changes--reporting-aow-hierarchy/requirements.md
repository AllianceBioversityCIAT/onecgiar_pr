# Requirements Spec — 3-Level Visual Hierarchy Refinement in Reporting AoW Table

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/reporting-aow-hierarchy` |
| Feature Name | 3-Level Visual Hierarchy Refinement (`reporting-aow-table`) |
| Module Code | `RAH` |
| Type | Change |
| Depth | Standard |
| Approval Mode | gated |
| Status | in-review |
| Requested By | Juan Carlos Cadavid — 2026-09-04 |
| Target Packages | `onecgiar-pr-client` (`reporting-aow-table` component) |
| Constitutional Baseline | `docs/prd.md` §3 Personas · `docs/ux-ui/design.md` §7 Design Tokens · §8 Components, `docs/trd/trd.md`, `reporting-aow-table/CLAUDE.md` |
| Kaizen Lessons Applied | `KZ-changes--reporting-aow-jira-hierarchy-1` (template JIT compilation verification at every mutation), `KZ-changes--reporting-aow-jira-hierarchy-2` (protect public event contracts: `openRow`, `reportRow`, `openTarget`, `openAchieved`, `copyLink`) |

---

## 1. Executive Summary

In the Science Program Result Framework Reporting tab (`reporting-aow-table`), results are structured across three hierarchical levels:
1. **Macro Layer:** Area of Work (AOW)
2. **Meso Layer:** High-Level Outputs (HLO) / Outcomes / Intermediate Outcomes (IO)
3. **Micro Layer:** Indicators / Results

Currently, these three levels are displayed on an undifferentiated, single flat plane ("Flat Grid Syndrome"): HLO headers look like table rows with the same width and left padding, and indicators lack visual enclosure or indentation. This specification establishes a strict, accessible, and responsive 3-level visual hierarchy using **Card-in-Card Nested Scaffolding**, distinct surface tints, semantic taxonomy chips (`[OUTPUT X.Y]` / `[OUTCOME X.Y]`), micro-KPI metric summaries, and 20px–24px visual indentation with a vertical tree guide for indicators.

---

## 2. Glossary

- **AOW (Area of Work):** Level 1 macro container representing a thematic research pillar within a Science Program (e.g., `AOW01`).
- **HLO (High-Level Output) / Outcome / IO:** Level 2 meso grouping node in the Theory of Change representing a concrete work package or milestone aggregating multiple indicators.
- **Indicator / Result:** Level 3 atomic item where progress is monitored, reported, evidenced, and quality-assessed.
- **Card-in-Card Pattern:** UX architectural pattern where a secondary container (sub-card) is nested within a primary parent card to establish clear Gestalt grouping (Law of Common Region).
- **Tree Scaffolding:** Indentation combined with a vertical guide line (`border-l-4` or `border-l-2`) visually connecting child rows to their parent group header.
- **Taxonomy Chip:** A distinct badge explicitly indicating the node's type in the results framework (`OUTPUT` vs `OUTCOME` vs `AOW`).

---

## 3. System Context & Scope

### In Scope
- **Component Refactoring:** `reporting-aow-table.component.html` and `reporting-aow-table.component.scss` in `onecgiar-pr-client`.
- **Level 1 (AOW) Polish:** Solidify the top-level card container with consistent border styling and filter toolbar integration.
- **Level 2 (HLO/Outcome) Redesign:** Transform the flat row into a distinct sub-card header with:
  - Differentiated surface tint (`bg-slate-50/90` or `var(--pr-surface-subtle)`).
  - Explicit semantic taxonomy pill (`OUTPUT 1.1`, `OUTCOME 1.2`) with monospace numbering.
  - Micro-KPI summary blocks (Target, Achieved, Indicator count, QA/Prel %).
  - Distinct collapsed state.
- **Level 3 (Indicators) Scaffolding:**
  - 20px–24px visual indentation with a vertical tree guide line.
  - Compact, contextual column sub-header (`INDICATOR TITLE & TAXONOMY | TARGET | ACHIEVED | STATUS | PROGRESS | ACTION`).
  - Visual hierarchy refinements for metadata badges and action buttons.
- **Automated Verification:** Update all existing unit tests in `reporting-aow-table.component.spec.ts` ensuring 100% pass rate.

### Out of Scope
- Backend or database schema changes.
- Changes to the Flat Table view (`viewMode() === 'flat'`).
- Changes to other tabs (Overview or Results tab).
- Alterations of underlying data calculation formulas (sums and percentages remain strictly identical).

---

## 4. Personas Affected

| Persona | Role in Reporting | What Changes for Them |
|---|---|---|
| **Science Program Lead / PMU** | Reviews strategic progress at AoW and work package level. | Can instantly scan HLO totals (Target, Achieved, QA%) and collapse/expand groups without visual fatigue. |
| **Center Focal Point / Submitter** | Reports against specific indicators within their assigned Center. | Has unambiguous spatial orientation; never confuses indicators across different HLO groups during deep scrolling. |
| **QA Reviewer** | Validates reported evidence and indicator compliance. | Rapidly pinpoints which HLO and AoW an indicator belongs to during review. |

---

## 5. User Stories

- **`RAH-US-1` (Meso Orientation):** As a Program Lead, I want HLO groups to visually present as distinct sub-cards with clear aggregate metrics, so that I can evaluate work package health without reading every single indicator row.
- **`RAH-US-2` (Micro Spatial Wayfinding):** As a Result Submitter, I want indicators to be indented and visually framed under their parent HLO with a tree guideline, so that I always know which output/outcome I am reporting against while scrolling.
- **`RAH-US-3` (Taxonomic Clarity):** As any platform user, I want clear semantic badges distinguishing AoW codes (`AOW01`) from HLO outputs (`OUTPUT 1.1`) and indicator types, so that the platform hierarchy is intuitive at a glance.

---

## 6. Functional Requirements

### Defect Classes and Quality Gates

| Defect Class | Detection Gate | Substitute if Unautomated |
|---|---|---|
| **Template JIT Compilation Errors** (Broken tags in `@for`/`@if`) | `npx jest --testPathPattern="reporting-aow-table"` | Automated compiler check (Kaizen `KZ-changes--reporting-aow-jira-hierarchy-1`) |
| **Public Event Contract Regressions** (`openRow`, `reportRow`, etc.) | Automated Jest component test suite | Full event emission subscription assertions (Kaizen `KZ-changes--reporting-aow-jira-hierarchy-2`) |
| **Visual Hierarchy & Contrast Defects** | Visual review against approved mockup screenshot | T6 Multimodal / Human inspection of Chrome rendered screenshot |
| **Responsive Grid Misalignment (<900px)** | Jest layout tests + browser screenshot probe | Automated CSS track assertions + mobile viewport probe |

---

### `RAH-R-1`: Level 2 HLO Sub-Card Container & Surface Elevation

The system SHALL render each HLO / Outcome / Intermediate Outcome as a distinct sub-card container inside the AoW body, featuring a differentiated surface background and visible border framing.

#### Scenario 1.1: Expanded HLO sub-card display
- GIVEN an Area of Work card is open in grouped view
- WHEN an HLO group contains one or more indicators and is expanded
- THEN the HLO header bar MUST render with a distinct background (`bg-slate-50/90` or `var(--pr-surface-subtle)`) contrasting against the white body
- AND it MUST be enclosed in a rounded border (`rounded-xl border border-slate-200`)
- AND it MUST display a chevron rotated down indicating expanded state.

#### Scenario 1.2: Collapsed HLO sub-card display
- GIVEN an HLO group is rendered
- WHEN the user clicks the HLO header bar (or toggles "Collapse all")
- THEN the indicator rows MUST collapse smoothly
- AND the HLO sub-card MUST remain visible as a compact single-row summary
- AND the chevron MUST rotate right/up indicating collapsed state.

---

### `RAH-R-2`: Semantic Taxonomy Badges

The system SHALL display explicit semantic taxonomy pills for HLO and Outcome nodes to distinguish them from AoW codes and indicator categories.

#### Scenario 2.1: Output taxonomy badge
- GIVEN an HLO group represents an Output (e.g. `1.1`)
- WHEN the HLO header is rendered
- THEN it MUST display a pill with the text `OUTPUT` and the numerical code (e.g. `OUTPUT 1.1`)
- AND the pill MUST use an indigo/slate palette (`bg-indigo-100 text-indigo-800 border-indigo-200`) distinct from AoW purple (`bg-purple-100 text-purple-800`).

#### Scenario 2.2: Outcome taxonomy badge
- GIVEN a group represents an Outcome or Intermediate Outcome
- WHEN the group header is rendered
- THEN it MUST display a pill with the text `OUTCOME` or `IO` and its corresponding code.

---

### `RAH-R-3`: Level 2 Consolidated Micro-KPI Metrics

The system SHALL display consolidated aggregate metrics on the right side of the HLO header bar.

#### Scenario 3.1: Metric layout and values
- GIVEN an HLO group with multiple indicators
- WHEN the HLO header is rendered
- THEN it MUST display:
  1. The total Target sum (`tabular-nums font-extrabold`) with a micro-label `TARGET`.
  2. The total Achieved sum with a micro-label `ACHIEVED`.
  3. A pill badge displaying the total indicator count (e.g. `32 indicators` or `32 KPIs`).
  4. The aggregated QA percentage and Preliminary percentage.
- BUT it must NOT truncate or wrap numbers into multiple rows at desktop viewports (≥900px).

---

### `RAH-R-4`: Level 3 Visual Indentation and Tree Scaffolding

The system SHALL visually indent child indicator rows by 20px to 24px relative to the HLO sub-card boundary, guided by a vertical tree line.

#### Scenario 4.1: Indented indicator container
- GIVEN an HLO group is expanded
- WHEN its child indicators are rendered
- THEN the container enclosing the indicator rows MUST have left padding (`pl-6` / 24px)
- AND it MUST feature a vertical left border guideline (`border-l-4 border-indigo-500/40` or `border-l-2 border-slate-200`)
- AND each indicator row MUST be rendered on a clean white surface with hover state (`hover:bg-slate-50/80`).

---

### `RAH-R-5`: Contextual Column Sub-Header

The system SHALL render a compact, scoped column header inside the indented indicator container.

#### Scenario 5.1: Contextual column header positioning
- GIVEN an expanded HLO container with one or more indicator rows
- WHEN the indicator list is displayed
- THEN a column header row MUST appear above the first indicator row within the indented container
- AND it MUST display column titles: `INDICATOR TITLE & TAXONOMY`, `TARGET`, `ACHIEVED`, `STATUS`, `PROGRESS`, `ACTION`
- AND its height MUST be compact (`h-7` / 28px) with subtle uppercase typography (`text-[10px] text-slate-400 font-bold`)
- AND it MUST align with the indicator rows' grid tracks.

---

### `RAH-R-6`: Event Contract and Accessibility Preservation

The system SHALL preserve 100% of existing event outputs and accessibility attributes across all 3 levels.

#### Scenario 6.1: Event dispatch preservation
- GIVEN an indicator row within the new indented container
- WHEN a user clicks the row, clicks the "Report" button, clicks the "Copy link" button, or opens the more menu
- THEN the component MUST emit `openRow`, `reportRow`, `copyLink`, `openTarget`, or `openAchieved` with the exact corresponding row payload
- AND event propagation MUST be stopped on nested action buttons so the parent row click is not triggered.

#### Scenario 6.2: Keyboard and ARIA accessibility
- GIVEN any interactive element in the hierarchy (AoW header, HLO header, indicator row, action buttons)
- WHEN navigated via keyboard (`Tab`, `Shift+Tab`)
- THEN focus rings MUST be visible (`focus-visible:ring-2`)
- AND `aria-expanded` attributes MUST reflect the live open/collapsed state of accordions
- AND `Enter` / `Space` keys MUST trigger row selection and accordion toggle.

---

## 7. Non-Functional Requirements

- **`RAH-NFR-1` (Performance):** Zero perceptible lag or layout thrashing during collapse/expand animations (micro-transitions ≤180ms).
- **`RAH-NFR-2` (Responsive Fluidity):** Below 900px (`max-[900px]`), the layout MUST gracefully collapse non-essential secondary labels and maintain touch targets of at least 44×44px for buttons.
- **`RAH-NFR-3` (Design Token Compliance):** All colors, borders, and shadows MUST adhere to PRMS design tokens (`var(--pr-*)`) and Tailwind theme extensions.

---

## 8. Requirement ID Index

| ID | Title | Priority | Target Task |
|---|---|---|---|
| `RAH-R-1` | Level 2 HLO Sub-Card Container & Surface Elevation | MUST | Task 1 |
| `RAH-R-2` | Semantic Taxonomy Badges (`OUTPUT` / `OUTCOME`) | MUST | Task 1 |
| `RAH-R-3` | Level 2 Consolidated Micro-KPI Metrics | MUST | Task 1 |
| `RAH-R-4` | Level 3 Visual Indentation and Tree Scaffolding | MUST | Task 2 |
| `RAH-R-5` | Contextual Column Sub-Header | MUST | Task 2 |
| `RAH-R-6` | Event Contract and Accessibility Preservation | MUST | Task 3 |
| `RAH-NFR-1` | Micro-transition Performance (≤180ms) | SHOULD | Task 2 |
| `RAH-NFR-2` | Responsive Fluidity (<900px) | MUST | Task 2 |
| `RAH-NFR-3` | Design Token Compliance | MUST | Task 1, 2 |

