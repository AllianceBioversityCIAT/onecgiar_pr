# Module Spec — Requirements: Reporting AoW & HLO JIRA-Style Hierarchy

- **Module:** `results-framework-reporting`
- **Feature:** `reporting-aow-jira-hierarchy`
- **Owner:** Frontend Engineering / Design Team
- **Status:** `in-review`
- **Approval Mode:** `gated`
- **Branch:** `qa-development-2026`
- **PRD Reference:** `docs/prd.md` (G1, G2, US-S1, US-Q1, AC-1, AC-6)
- **UX/UI Reference:** `docs/ux-ui/design.md` (§7 Design Tokens, §8 Components, §9 Visual Polish)
- **TRD Reference:** `docs/trd/trd.md` (§5 Frontend Architecture, Workflow W1)

---

## 1. Executive Summary

In the PRMS Result Framework Reporting tab, the Area of Work (AoW) and High-Level Output (HLO) sections display planned Theory of Change (ToC) indicators. Currently, the interface suffers from heavy visual clutter, conflicting and redundant number representations (e.g., displaying `2 KPIs` alongside `2 indicators` on the same header), an oversized multi-line filter cloud that pushes content off-screen, and noticeable structural inconsistencies between the **All Areas of Work** view (`tocView=aows`) and the **By Area of Work** view (`tocView=byAow`).

This specification establishes a clean, modern information hierarchy inspired by **JIRA's Backlog and Agile work-item layouts**. It standardizes HLO code badges, aligns quantitative metrics into clean tabular columns, introduces JIRA-style semantic status indicator stripes on indicator rows, streamlines in-card filters into a slim quick-filter bar, and unifies the presentation layer between the All-AoWs overview and By-AoW deep-dive.

---

## 2. Glossary

| Term | Definition |
|---|---|
| **AoW (Area of Work)** | Top-level programmatic research area within a Science Program (e.g., `AOW01: Market Intelligence`). |
| **HLO (High-Level Output)** | Intermediate deliverable or work package defined under an Area of Work (e.g., `HLO4: Foster motivations`). |
| **Outcome** | High-level behavioral or institutional change result linked directly to an AoW or Program. |
| **KPI / Planned Indicator** | Concrete verifiable target tracked within an HLO or Outcome. |
| **QA %** | Verified achievement percentage of results that have passed Quality Assessment (`QAed + Approved`). |
| **Prel. %** | Preliminary achievement percentage including submitted drafts awaiting QA (`Submitted + Approved`). |
| **Status Stripe** | Semantic 3px left-border color bar indicating lifecycle status (Not Started, In Progress, Achieved, Overachieved). |
| **Quick Filters** | Single-line horizontal scrollable/wrap chip strip for fast filtering by Center or Result Type. |

---

## 3. Context & References

- **PRD Links:**
  - `G1` / `US-S1`: Result submitters reporting against 2026 ToC indicators.
  - `G2` / `US-Q1`: QA reviewers assessing indicator completion and preliminary vs QA progress.
  - `AC-1`: Typed result integrity and indicator link fidelity.
  - `AC-6`: Theory of Change alignment at reporting time.
- **UX/UI Blueprint:**
  - `docs/ux-ui/design.md` §7: Spacing (`px` scale), typography tokens, border colors (`--pr-border`, `--pr-border-divider`).
  - `docs/ux-ui/design.md` §8: Cards, badges, accordions, and table rows.
- **Approved Visual Mockups & References:**
  - `docs/specs/changes/reporting-aow-jira-hierarchy/mockup/jira-product-discovery-list.png` (JIRA Product Discovery grouped list reference)
  - `docs/specs/changes/reporting-aow-jira-hierarchy/mockup/jira-backlog-reference-1.png`
  - `docs/specs/changes/reporting-aow-jira-hierarchy/mockup/jira-backlog-reference-2.png`
  - `docs/specs/changes/reporting-aow-jira-hierarchy/mockup/jira-backlog-reference-3.png`
  - `docs/specs/changes/reporting-aow-jira-hierarchy/mockup/current-all-aows-expanded.png`
  - `docs/specs/changes/reporting-aow-jira-hierarchy/mockup/current-by-aow-view.png`

---

## 4. In Scope / Out of Scope

### In Scope
- **Redundant Section Heading Removal:** Remove the redundant `Report results linked to the program's 2026 ToC` header from the reporting band to reclaim vertical space.
- **HLO Header Redesign:** Standardize HLO code badges (`HLO4`) and title typography across both `All AOWs` and `By AOW` views.
- **Metric Clutter Removal:** Eliminate redundant labels (`2 KPIs` vs `2 indicators`) and organize Target, Achieved, QA %, and Prel. % into an aligned, tabular layout.
- **Indicator Row JIRA Polish:** Add left-edge semantic status color stripe, compact inline metadata chips (`Type`, `Center`), and uniform column alignment.
- **Compact Quick-Filters:** Redesign the in-card Center & Type filter from a 100px multi-row button cloud into a slim horizontal quick-filter strip (height ≤ 32px).
- **View Parity & Architecture Unification:** Ensure identical visual styling, tokens, and behavior between expanded AoW cards in `tocView=aows` and the By-AoW deep dive in `tocView=byAow`.
- **Accessibility & Interaction:** Maintain full keyboard navigation, ARIA attributes, drawer triggers, and responsive collapse.

### Out of Scope
- Backend ToC API payload modifications or database schema changes.
- Alterations to the flat "All indicators" table (`viewMode() === 'flat'`).
- Modifications to the Report result drawer form or submission workflow.

---

## 5. Personas Affected

| Persona | What Changes for Them |
|---|---|
| **Result Submitter** | Effortless scanning of AoWs and HLOs; clear visual indication of what work is still pending; zero confusion from competing count labels. |
| **QA Reviewer** | Instant visibility into QA % vs Prel. % across all HLOs; clean color-coded status stripes for rapid quality audits. |
| **Program Management Unit (PMU)** | Clean, executive-level presentation matching modern enterprise tools (JIRA/Atlassian); seamless zoom between overview and deep dive. |

---

## 6. User Stories

- **`RAJ-US-1`** — *As a result submitter*, I want AoW and HLO sections to follow a clean, structured JIRA-like hierarchy, so that I can quickly navigate to my indicators without visual distraction.
- **`RAJ-US-2`** — *As a user*, I want consistent HLO identification and card styling whether I am in "All Areas of Work" or "By Area of Work", so that switching views feels like a natural zoom rather than navigating two different systems.
- **`RAJ-US-3`** — *As a scientist*, I want HLO header metrics to be clear and non-redundant, so that I don't see confusing duplicate counts like `2 KPIs` alongside `2 indicators`.
- **`RAJ-US-4`** — *As a reviewer*, I want indicator rows to feature a left-edge status color stripe and structured numeric columns, so that I can immediately tell which items are Achieved, In Progress, or Not Started.

---

## 7. Functional Requirements

### Requirement RAJ-R-1: Standardized HLO Identification & Badge Parity
The system MUST display a standardized HLO badge (e.g., `HLO4` / `HLO-04`) alongside the HLO name consistently in both the `All AOWs` (`tocView=aows`) expanded view and the `By AOW` (`tocView=byAow`) focused view.

#### Scenario: HLO rendering in both views
- **GIVEN** an HLO entity with code `HLO4.AOW1.IO1` and name `Foster motivations`
- **WHEN** rendered in the expanded card of `All AOWs` OR in the `By AOW` view
- **THEN** it renders a distinct, compact badge with the clean HLO code (e.g. `HLO4`)
- **AND** it renders the name `Foster motivations` in prominent bold font (`text-[14px]` / `font-bold`)
- **BUT IT MUST NOT** omit the code badge in `All AOWs`
- **AND IT MUST NOT** display the unwieldy raw string `HLO4.AOW1.IO1 · Foster motivations` as unformatted text.

---

### Requirement RAJ-R-2: Elimination of Redundant Metrics in HLO Headers
The system MUST consolidate HLO header metrics into a clean, tabular cluster, displaying `Target`, `Achieved`, `QA %`, and `Prel %` alongside a single total count badge `[ N ]`, and MUST NOT display duplicate count labels.

#### Scenario: Metrics display on HLO header
- **GIVEN** an HLO containing 2 planned indicators with Target 2, Achieved 0, QA 0%, and Prel 0%
- **WHEN** the HLO accordion header is displayed
- **THEN** it displays:
  - `Target: 2` (with subtle label)
  - `Achieved: 0` (with subtle label and color coding)
  - `QA 0%` and `Prel. 0%` (tabular numbers with explanatory tooltip)
  - Total indicator count badge `[ 2 ]`
- **BUT IT MUST NOT** render both `2 KPIs` and `2 indicators` on the same row.

---

### Requirement RAJ-R-3: JIRA-Style Semantic Status Stripe on Indicator Rows
The system MUST render a 3px left-border color stripe on each indicator row in grouped view, corresponding directly to its reporting progress status.

#### Scenario: Status stripe styling
- **GIVEN** an indicator row with status `achieved`, `overachieved`, `in-progress`, or `not-started`
- **WHEN** rendered in the indicator list
- **THEN** the row displays a 3px solid left border with the designated semantic color token:
  - `achieved`: Emerald (`border-l-emerald-500` / `#10b981`)
  - `overachieved`: Purple (`border-l-purple-500` / `#9333ea`)
  - `in-progress`: Primary Violet (`border-l-[var(--pr-color-primary-500)]` / `#6b46e5`)
  - `not-started`: Neutral Slate (`border-l-slate-300` / `#cbd5e1`)
- **AND** it preserves the existing concentric target status mark and status badge.

---

### Requirement RAJ-R-4: Compact Quick-Filters in AoW Cards
The system MUST replace the bulky multi-line in-card filter cloud with a compact, single-line quick-filter bar (height ≤ 32px) for Center and Result Type filtering.

#### Scenario: In-card filter rendering
- **GIVEN** an expanded AoW card with multiple Centers and Result Types
- **WHEN** the filter section is displayed
- **THEN** it renders as a sleek, single-line horizontal bar of filter chips
- **AND** active filter chips display a distinct filled background (`bg-[var(--pr-color-primary-500)]` / text-white)
- **BUT IT MUST NOT** exceed 34px in height when single-line or push down content by 80–110px.

---

### Requirement RAJ-R-5: Visual & Component Parity Between Views
The system MUST share identical visual tokens, row dimensions, typography, and interactive behaviors for HLO sections and indicator rows between `tocView=aows` and `tocView=byAow`.

#### Scenario: Visual consistency check
- **GIVEN** an indicator row rendered inside an AoW in `tocView=aows`
- **WHEN** compared to the same indicator row rendered in `tocView=byAow`
- **THEN** both rows share identical font sizes, paddings, status stripes, action buttons, and hover effects.

---

### Requirement RAJ-R-6: Responsive Layout & Safe Degradation
The system MUST adapt HLO headers and indicator rows gracefully across viewport widths down to 768px without horizontal overflow.

#### Scenario: Narrow viewport degradation
- **GIVEN** a viewport width between 768px and 1024px
- **WHEN** viewing HLO headers or indicator rows
- **THEN** secondary text (such as achievement coverage strings) degrades gracefully using `hidden` or `sr-only`
- **AND** no horizontal scrollbar appears on the container.

---

### Requirement RAJ-R-7: Removal of Redundant Reporting Section Title
The system MUST remove the redundant title `Report results linked to the program's 2026 ToC` from above the AoW cards in `ReportingProgramBandComponent`, reclaiming ~50px of vertical space and aligning the Reporting tab with the streamlined header design established in the Results tab.

#### Scenario: Navigating to Reporting tab
- **GIVEN** a user viewing the Reporting tab (`rfrView() === 'planned'`)
- **WHEN** the page and program band are rendered
- **THEN** the AoW cards appear directly below the sticky program band and top filters/metrics
- **BUT IT MUST NOT** render the redundant heading `Report results linked to the program's 2026 ToC`.

---

## 8. Defect Classes & Verification Gate

| Defect Class | How It Manifests | Verification Gate | Substitute / Manual Check |
|---|---|---|---|
| **D1: Redundant Metric Labels** | Both `N KPIs` and `N indicators` visible in DOM | Automated Jest test inspecting HLO header textContent | Visual inspection of expanded AoW header |
| **D2: Incoherent HLO Code** | Code badge missing in All AOWs or raw `HLO4.AOW1...` string shown | Automated Jest test asserting `.pr-hlo-code` badge exists and matches `HLO\d+` | Visual comparison between views |
| **D3: Missing Status Stripe** | Left border stripe absent or wrong color class applied | Automated Jest test asserting `.border-l-*` class based on `statusOf(row)` | Visual check of row borders |
| **D4: Broken Event Emissions** | Clicking an indicator row or Report button fails to trigger drawer | Automated Jest unit tests asserting `openRow`, `reportRow`, `openTarget`, `openAchieved` spies | Interactive click test in browser |
| **D5: Horizontal Overflow (<900px)** | Header or indicator row exceeds viewport width | Automated build test + CSS inspection of fixed width elements | Browser viewport resize audit |
| **D6: Residual Redundant Title** | `Report results linked...` remains in DOM | Automated Jest test on `ReportingProgramBandComponent` | Visual confirmation |

---

## 9. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Accessibility (WCAG 2.1 AA)** | All accordion headers must have `aria-expanded` and `role="button"` or `<button>`. Status stripes are paired with text badges and icons (never color-alone). |
| **Performance** | Zero additional HTTP requests. Re-computation of filtered rows relies on existing Angular signals / memoized getters with < 5ms rendering time. |
| **Backwards Compatibility** | Preserves all existing event names (`openRow`, `reportRow`, `openTarget`, `openAchieved`, `copyLink`) and payload types. |
| **Design System Fidelity** | Strictly uses `--pr-*` CSS variables and Tailwind arbitrary pixel values matching the 12px base HTML font. |

---

## 10. Requirement ID Index & Traceability

| ID | Title | User Story | Verification Command |
|---|---|---|---|
| `RAJ-R-1` | Standardized HLO Identification & Badge Parity | `RAJ-US-1`, `RAJ-US-2` | `npx jest --testPathPattern="reporting-aow-table"` |
| `RAJ-R-2` | Elimination of Redundant Metrics in HLO Headers | `RAJ-US-3` | `npx jest --testPathPattern="reporting-aow-table"` |
| `RAJ-R-3` | JIRA-Style Semantic Status Stripe on Indicator Rows | `RAJ-US-4` | `npx jest --testPathPattern="reporting-aow-table"` |
| `RAJ-R-4` | Compact Quick-Filters in AoW Cards | `RAJ-US-1` | `npx jest --testPathPattern="reporting-aow-table"` |
| `RAJ-R-5` | Visual & Component Parity Between Views | `RAJ-US-2` | `npx jest --testPathPattern="dashboard-lab"` |
| `RAJ-R-6` | Responsive Layout & Safe Degradation | `RAJ-US-1` | `npx ng build --configuration development` |
| `RAJ-R-7` | Removal of Redundant Reporting Section Title | `RAJ-US-1` | `npx jest --testPathPattern="reporting-program-band"` |

---

## 11. Acceptance Criteria Matrix

| ID | Given | When | Then |
|---|---|---|---|
| `RAJ-AC-1.1` | An HLO with code `HLO4.AOW1.IO1` in `All AOWs` | User expands the AoW card | HLO renders badge `HLO4` and title without unformatted code prefix. |
| `RAJ-AC-1.2` | The same HLO in `By AOW` view | User opens the By AOW page | HLO renders the exact same `HLO4` badge and title style. |
| `RAJ-AC-2.1` | An HLO with Target 2, Achieved 0 | User views the HLO header | Header shows Target: 2, Achieved: 0, QA: 0%, Prel: 0%, count `[ 2 ]`, and NO redundant `2 indicators` text. |
| `RAJ-AC-3.1` | An indicator row with status `achieved` | User views the indicator list | Row has `border-l-[3px] border-l-emerald-500`. |
| `RAJ-AC-3.2` | An indicator row with status `in-progress` | User views the indicator list | Row has `border-l-[3px] border-l-[var(--pr-color-primary-500)]`. |
| `RAJ-AC-4.1` | An AoW card with centers CIAT, IITA | User expands the card | In-card filters display as a single-row quick-filter bar (height ≤ 32px). |
| `RAJ-AC-5.1` | Indicator row actions | User clicks Report button | `reportRow` event emits with indicator entity to trigger drawer. |
| `RAJ-AC-7.1` | The Reporting tab is loaded | Band component initializes | Heading `Report results linked to the program's 2026 ToC` is not rendered in the DOM. |
