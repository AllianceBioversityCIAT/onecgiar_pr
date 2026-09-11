# Requirements Specification — 3-Level Visual Hierarchy & ToC Taxonomy Alignment in "By AOW" View

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/by-aow-hierarchy-alignment` |
| Feature Code | `BHA` (By-AOW Hierarchy Alignment) |
| Module | `result-framework-reporting` / `dashboard-lab` |
| Type | Change |
| Status | draft |
| Approval Mode | gated |
| Depends on | none |
| Parallel-safe | yes (touches frontend presentation, ToC code parsing, and DOM scaffolding in `dashboard-lab`; zero backend, DB, or API mutations) |
| Author | Antigravity AI / Juan Carlos Cadavid |
| Date | 2026-09-04 |
| Constitutional Baseline | `docs/prd.md` (G1, G2, US-S1, AC-1), `docs/ux-ui/design.md` §7 Design tokens · §8 Components · §9 Responsive · §10 Accessibility, `docs/trd/trd.md`, `onecgiar-pr-client/CLAUDE.md`, `dashboard-lab/CLAUDE.md` |
| Kaizen Lessons Applied | `KZ-changes--reporting-aow-hierarchy-1` (formal ToC nomenclature `HLO`, `OC`, `I-OC` over generic agile names), `KZ-changes--reporting-aow-jira-hierarchy-1` (template JIT compilation verification), `KZ-changes--reporting-aow-jira-hierarchy-2` (protect event contracts and button isolation) |

---

## 1. Executive Summary

This specification aligns the **"By AOW"** focused view (`dashboard-lab.component.html` lines 1682–1940) with the **3-Level Card-in-Card** visual hierarchy and institutional ToC taxonomy design system established in `reporting-aow-table`. 

Currently, when a user navigates into By-AOW, Level 2 High-Level Outputs (HLOs) render as flat, unbordered rows missing their official HLO numeric badges (e.g. displaying plain text `"Agronomic and farm management..."` without `[HLO 1.1]`), and Level 3 child indicators render as un-indented, floating separate cards. This spec fixes code token extraction in `dashboard-lab.component.ts`, encloses HLOs into autonomous sub-cards with gradient headers, nests child indicators in an indented tree container (`pl-4 sm:pl-6 border-l-4 border-indigo-500/40`), introduces a contextual column sub-header, and applies track-aligned indicator rows with concentric bullseyes 🎯 and JIRA status stripes, while preserving all existing By-AOW host features.

---

## 2. Glossary

- **Area of Work (AOW) (Level 1):** Macro thematic boundary grouping planned outputs and outcomes (e.g. `AOW01 Accelerating AI-Enabled Farm Advisory`).
- **High-Level Output (HLO) / Outcome (Level 2):** Meso-level ToC causal deliverable (e.g. `HLO 1.1`, `OC 2.1`, `I-OC 3.5`).
- **Indicator / Result (Level 3):** Micro atomic reportable item assigned to specific Centers and tracked against targets.
- **Card-in-Card Scaffolding:** Architectural layout pattern where meso entities are autonomous rounded containers (`rounded-xl shadow-2xs`) within the macro card, and micro entities are indented with a vertical guide line.
- **Taxonomy Badge:** Compact semantic pill (`bg-indigo-100/80 text-indigo-800 font-mono`) displaying institutional ToC category and numeric code (`[HLO 1.1]`, `[OC 2.1]`).

---

## 3. System Context & Scope

### In Scope
- **`dashboard-lab.component.ts`:**
  - Enhance `cleanHloCode(raw)` to detect numeric prefixes (`1.1`, `1.1:`, `2.4.1`).
  - Add `hloTaxonomy(hlo, section)` helper returning `{ type: 'HLO' | 'OC' | 'I-OC' | 'IO', code: string }` adhering to `KZ-changes--reporting-aow-hierarchy-1`.
  - Harmonize row helper bindings for By-AOW indicators if needed.
- **`dashboard-lab.component.html`:**
  - By-AOW section template (lines 1682–1940):
    - Replace `.pr-by-aow-row` with autonomous Level 2 HLO Sub-Card (`rounded-xl border border-slate-200/90 bg-white shadow-2xs`).
    - Sub-card header with surface gradient `bg-gradient-to-r from-slate-50 via-indigo-50/30 to-slate-50`, rotating chevron in white button box, semantic taxonomy badge (`[HLO 1.1]`), and consolidated micro-KPI cluster.
    - Level 3 indented scaffolding container (`pl-4 sm:pl-6 border-l-4 border-indigo-500/40 bg-indigo-50/10`).
    - Contextual column sub-header (`INDICATOR TITLE & TAXONOMY | TARGET | ACHIEVED | STATUS | PROGRESS | ACTION`).
    - Standardized indicator rows with concentric bullseye target icons 🎯, JIRA status stripes, center chips, progress bars, and isolated action buttons.
- **`dashboard-lab.component.scss`:**
  - Styling for By-AOW track layout, sub-card enclosure, and tree guideline.
- **`dashboard-lab.component.spec.ts`:**
  - Unit tests verifying code extraction, taxonomy output, sub-card rendering, and event isolation.

### Out of Scope
- No modifications to server-side APIs, database entities, or DTOs.
- No modifications to `reporting-aow-table.component.*` (already stable and archived).
- No modifications to the top AoW banner metrics, session reporting counter, or narrative panel drawer.
- No modifications to filtering logic or underlying indicator calculation algorithms.

---

## 4. Stakeholders & Personas

| Persona | Role in PRMS | Experience Impact |
|---|---|---|
| **Result Submitter / Center Focal Point** | Reports achievements against planned indicators in By-AOW. | Unambiguous spatial hierarchy: immediately recognizes which HLO/work package an indicator belongs to via the `[HLO 1.1]` badge and indented tree scaffolding. |
| **Science Program Lead / PMU** | Reviews progress across Areas of Work and HLOs. | Quick at-a-glance scanning of HLO-level target and achieved totals via the consolidated micro-KPI cluster on the HLO sub-card header. |
| **QA Reviewer** | Audits reported evidence and indicator status. | Consistent, coherent navigation and status visualization between the main reporting overview and the focused By-AOW drilldown. |

---

## 5. Defect Classes & Verification Gates

| Defect Class | How it Manifests | Verification Gate |
|---|---|---|
| **Missing Taxonomy Badge** | HLO title displays without code (e.g. `"Agronomic data"` instead of `[HLO 1.1]`). | Automated unit test asserting `cleanHloCode('1.1: Agronomic data') === '1.1'` and `hloTaxonomy` output; DOM assertion verifying `.pr-hlo-code` presence in By-AOW. |
| **Flat Visual Hierarchy** | Indicators render without visual indentation or parent container enclosure. | DOM assertion in Jest verifying `.rounded-xl.shadow-2xs` container and `.pl-4.sm\:pl-6.border-l-4` indented scaffolding. |
| **Event Leaking / Accidental Triggering** | Clicking "Report" or "Copy link" opens or collapses the parent row. | Automated test asserting `$event.stopPropagation()` / `openReportAside` emission without triggering row click. |
| **Broken Deeplink Anchor** | Navigating with `?kpi=<id>` fails to scroll to or highlight the indicator. | Automated test asserting `[id]="kpiDomId(ind)"` and `highlightedKpiId` class presence. |
| **Template JIT Compilation Failure** | Syntax error in nested control flow (`@for`, `@if`, `@let`). | Immediate verification with `npx jest --testPathPattern="dashboard-lab.component.spec.ts"`. |

---

## 6. Functional Requirements

### BHA-R-1: Numeric & Institutional ToC Code Parsing
The system SHALL parse numeric and ToC taxonomy codes from group titles, codes, and section keys in `dashboard-lab.component.ts`.

#### Scenario 1.1: Extract numeric prefix from HLO title
- **GIVEN** an HLO group with title `"1.1: Agronomic and farm management scientific data and analytics"` or `"1.1 Agronomic..."`
- **WHEN** `cleanHloCode(title)` is evaluated
- **THEN** it MUST return `"1.1"`
- **BUT IT MUST NOT** return an empty string or strip valid sub-indices (e.g. `"2.4.1"` must return `"2.4.1"`).

#### Scenario 1.2: Resolve semantic taxonomy badge structure
- **GIVEN** an HLO group with code `"1.1"` belonging to an Output section
- **WHEN** `hloTaxonomy(hlo, section)` is evaluated
- **THEN** it MUST return `{ type: 'HLO', code: '1.1' }`
- **AND** for an Outcome section with code `"2.1"` it MUST return `{ type: 'OC', code: '2.1' }`
- **AND** for an Intermediate Outcome with code `"3.5"` it MUST return `{ type: 'I-OC', code: '3.5' }`
- **BUT IT MUST NOT** use generic agile terms like `"OUTPUT"` (per Kaizen `KZ-changes--reporting-aow-hierarchy-1`).

---

### BHA-R-2: Level 2 HLO Sub-Card Enclosure
The system SHALL enclose each HLO and Outcome group in the By-AOW view inside an autonomous sub-card container.

#### Scenario 2.1: Sub-card container and header styling
- **GIVEN** the By-AOW view is rendered with one or more HLO groups
- **WHEN** an HLO group is rendered in the DOM
- **THEN** it MUST be contained in a `rounded-xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden` wrapper
- **AND** the header button MUST feature a surface gradient `bg-gradient-to-r from-slate-50 via-indigo-50/30 to-slate-50`
- **AND** a rotating chevron MUST be housed in a white button box (`h-6 w-6 rounded-md bg-white border border-slate-200/80 text-indigo-700 shadow-2xs`) with 180° rotation when expanded
- **AND** the semantic taxonomy badge (`.pr-hlo-code`) MUST be displayed with `bg-indigo-100/80 text-indigo-800 border border-indigo-200/70 font-mono text-[11px] font-bold`.

---

### BHA-R-3: Consolidated Meso Micro-KPI Metric Cluster
The system SHALL display consolidated aggregate metrics in the right zone of the Level 2 HLO header button.

#### Scenario 3.1: Micro-KPI display on HLO header
- **GIVEN** an HLO group with target sum 59, achieved sum 0, and 32 indicators
- **WHEN** the HLO header renders on screens ≥900px
- **THEN** it MUST render:
  - Target total with label `"TARGET"`
  - Achieved total in emerald color with label `"ACHIEVED"`
  - Rounded indicator count pill with text `"32 indicators"` (or `"1 indicator"` if single)
  - QA% and Prel% achievement percentages with tooltips.

---

### BHA-R-4: Level 3 Indented Indicator Scaffolding
The system SHALL nest expanded child indicators within an indented container featuring a vertical tree guideline.

#### Scenario 4.1: Indented container presentation
- **GIVEN** an HLO sub-card in By-AOW is expanded
- **WHEN** the child indicators area is rendered
- **THEN** it MUST be wrapped in a container with 24px left indentation (`pl-4 sm:pl-6`)
- **AND** it MUST feature an indigo left vertical guideline (`border-l-4 border-indigo-500/40 bg-indigo-50/10`)
- **BUT IT MUST NOT** cause horizontal overflow or unaligned horizontal scrolling.

---

### BHA-R-5: Contextual Column Sub-Header
The system SHALL display a compact contextual column sub-header within the indented child indicator container.

#### Scenario 5.1: Column sub-header layout
- **GIVEN** an expanded HLO container with one or more indicators
- **WHEN** the sub-header renders
- **THEN** it MUST display column labels: `INDICATOR TITLE & TAXONOMY`, `TARGET`, `ACHIEVED`, `STATUS`, `PROGRESS`, `ACTION`
- **AND** it MUST share the grid track distribution with the child indicator rows.

---

### BHA-R-6: Standardized Indicator Row Tracks & Visual Elements
The system SHALL render child indicator rows with concentric bullseye target marks 🎯, JIRA status stripes, and clean track alignment.

#### Scenario 6.1: Indicator row rendering
- **GIVEN** an indicator row inside the indented container
- **WHEN** the row renders
- **THEN** it MUST display:
  - Concentric bullseye target mark (18px violet icon)
  - Left border status stripe (`border-l-[3px]`) colored by status (green for complete, yellow for in-progress, gray for not started, purple for overachieved)
  - Indicator title with search term highlighting
  - Center acronym pill (`border border-slate-200 bg-slate-100 text-slate-700`)
  - Numeric target and achieved values in tabular figures
  - Status pill badge
  - Mini progress percentage bar
  - Copy link button and Report CTA button.

---

### BHA-R-7: Event Isolation & By-AOW Host Feature Preservation
The system SHALL maintain complete backward compatibility and event isolation for all By-AOW specific interactive features.

#### Scenario 7.1: Interactive action event isolation
- **GIVEN** an indicator row inside By-AOW
- **WHEN** the user clicks the "Report" button or "Copy link" button
- **THEN** the event MUST NOT propagate to the parent row container (`$event.stopPropagation()`)
- **AND** the corresponding host action (`openReportAside(ind)` or `copyKpiLink(ind)`) MUST fire.

#### Scenario 7.2: Deeplink anchor and highlight preservation
- **GIVEN** the URL contains a specific KPI parameter matching an indicator
- **WHEN** the indicator row renders
- **THEN** it MUST retain its unique DOM id (`[id]="kpiDomId(ind)"`)
- **AND** apply the highlight outline when `highlightedKpiId() === kpiKey(ind)`.

---

## 7. Non-Functional Requirements

| ID | Category | Requirement | Target |
|---|---|---|---|
| **BHA-NFR-1** | **Design System Consistency** | Visual presentation must strictly consume PRMS design tokens from `docs/ux-ui/design.md` §7 and match `reporting-aow-table`. | 100% token adherence; 0 ad-hoc hardcoded hex values. |
| **BHA-NFR-2** | **Accessibility (a11y)** | Level 2 header buttons and Level 3 rows must support keyboard navigation (`Tab`, `Enter`, `Space`) with visible focus outlines and ARIA state (`aria-expanded`). | WCAG 2.1 AA compliance. |
| **BHA-NFR-3** | **Performance & Jank-free Disclosure** | Expanding/collapsing HLO sub-cards must render smoothly with zero layout jumps or horizontal overflow. | Disclosure transitions <200ms duration. |
| **BHA-NFR-4** | **Test Coverage & Zero Regressions** | All existing unit tests for `dashboard-lab.component.spec.ts` must pass, supplemented with new assertions for BHA requirements. | 100% test pass rate. |

---

## 8. Requirement ID Index

| ID | Title | Priority | Verification Method |
|---|---|---|---|
| `BHA-R-1` | Numeric & Institutional ToC Code Parsing | P0 (Must) | Unit test on `cleanHloCode` and `hloTaxonomy` |
| `BHA-R-2` | Level 2 HLO Sub-Card Enclosure | P0 (Must) | Jest DOM test asserting `.rounded-xl.shadow-2xs` |
| `BHA-R-3` | Consolidated Meso Micro-KPI Metric Cluster | P1 (Must) | Jest DOM test asserting Target, Achieved, and count pill |
| `BHA-R-4` | Level 3 Indented Indicator Scaffolding | P0 (Must) | Jest DOM test asserting `.pl-4.sm\:pl-6.border-l-4` |
| `BHA-R-5` | Contextual Column Sub-Header | P1 (Must) | Jest DOM test asserting column labels |
| `BHA-R-6` | Standardized Indicator Row Tracks & Visual Elements | P0 (Must) | Jest DOM test asserting bullseye, status stripes, tracks |
| `BHA-R-7` | Event Isolation & By-AOW Feature Preservation | P0 (Must) | Jest event test asserting `stopPropagation` and anchor ids |
| `BHA-NFR-1` | Design System Consistency | P0 (Must) | Visual inspection & CSS review |
| `BHA-NFR-2` | Accessibility (a11y) | P0 (Must) | ARIA attribute test & keyboard test |
| `BHA-NFR-3` | Performance & Disclosure Animation | P1 (Should) | Render check |
| `BHA-NFR-4` | Test Coverage & Zero Regressions | P0 (Must) | `npx jest` full suite execution |

