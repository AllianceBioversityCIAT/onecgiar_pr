# Requirements: Bilateral Review — Visual Hierarchy, Semantic Colors, Progressive Disclosure & Filter UX Elevation

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/bilateral-review-hierarchy-ux` |
| Prefix | `BRH` |
| Type | `Change` |
| Approval Mode | `gated` |
| Inherited Depth | `Standard` |
| Author | Antigravity AI Assistant & Juan Carlos Cadavid |
| Date | 2026-09-08 |
| Status | In-Review (Phase 1 Complete) |

---

## 1. Executive Summary

The **Bilateral Review** section (`/result-framework-reporting/entity-details/:id/bilateral-review`) enables Science Program leads, bilateral focal points, and reviewers to inspect, track, and review emerging and planned results reported by Center-led bilateral projects. 

This specification establishes **visual and structural parity with the Science Program Reporting tab** (`/result-framework-reporting/entity-details/:id?tocView=aows` / `reporting-aow-table`). It resolves the current flat, monochromatic "data dump" by introducing:
1. An elevated **3-level hierarchical card architecture** (**Center → Project → Result**).
2. **Smart progressive disclosure** to eliminate the overwhelming 47-row wall of data on initial load.
3. **Categorical semantic color coding** for Result Types and review statuses.
4. One-click **hover copy interactions** with visual checkmark feedback.
5. A consolidated **2-row filter band** that cuts pinned header height by over 45%.

---

## 2. Glossary

| Term | Definition |
|---|---|
| **Science Program (SP)** | Thematic CGIAR portfolio funding unit (e.g., SP01 "Breeding for Tomorrow"). |
| **Bilateral Project** | Center-executed project contributing results to Science Programs (e.g., `T-PJ-003262`). |
| **Result** | A discrete, verified research output or outcome (e.g., policy change, innovation use) tagged with a unique numeric code (e.g., `8594`). |
| **Area of Work (AoW)** | Thematic work package in the Science Program's Theory of Change (ToC) to which results align. |
| **Progressive Disclosure** | UX strategy deferring secondary information and rows behind expandable accordions or cards until requested. |
| **Pinned Chrome** | Sticky header elements docked at the top of the `#workArea` viewport (toolbar, filter band). |
| **Lead Center** | CGIAR Center primarily responsible for submitting and implementing the bilateral result (e.g., CIMMYT, IRRI, CIP). |

---

## 3. System Context & Scope

### In-Scope
* `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/bilateral-review/`:
  * `bilateral-review.component.html`, `.ts`, `.scss` (Toolbar, consolidated filter band, pinned wrapper).
  * `components/bilateral-review-table/` (Container cards, group headers, monospace code badges, type pills, status pills, in-card breakdown toolbar).
  * `components/bilateral-review-kpis/` (Integration into the consolidated second row).
  * `components/bilateral-review-center-strip/` (Compact filter integration).
* Responsive adaptation across desktop (≥900px) and mobile (<900px cards).
* Visual parity with `reporting-aow-table` and `reporting-program-band`.
* Jest unit tests covering all new and modified behaviors.

### Out-of-Scope
* Backend changes: Zero API schema or database modifications. Existing endpoints (`GET_ResultToReview`) remain intact.
* Review Drawer (`ResultReviewDrawerComponent`): The modal/drawer review workflow and comment submission mechanisms are unchanged.
* Sibling tabs: Other entity details tabs (`Overview`, `Reporting`, `Results`, `My results`) are not modified.

---

## 4. Stakeholders & Personas

| Persona | Role | Impact & Value |
|---|---|---|
| **Bilateral Reviewer / SP Lead** | Evaluates pending bilateral results for Science Program alignment and quality. | **High Value:** Instantly sees which projects have pending reviews; easily identifies the project code and contributing centers; reviews actionable items with clear button affordances without drowning in dozens of expanded rows. |
| **Center Focal Point** | Tracks Center results across Science Programs. | **High Value:** Can filter by Center inside the card or globally, sees clear color-coded Result Types (Policy vs Innovation vs Capacity), and can copy project codes or titles with one click. |
| **QA Manager / PMU Lead** | Monitors overall reporting progress and status. | **High Value:** Scans high-level project KPI metrics when cards are collapsed; benefits from 90px more vertical viewing space above the fold. |

---

## 5. User Stories

* **`BRH-US-1`** — *As a Bilateral Reviewer*, I want projects to be displayed as distinct container cards with clean metadata badges, so that I can immediately differentiate the Project Code, Project Title, and Contributing Centers without reading smashed text strings.
* **`BRH-US-2`** — *As a Science Program Lead*, I want projects without pending reviews to be collapsed by default, so that I am not overwhelmed by a massive 50-row wall of data and can focus immediately on items needing action.
* **`BRH-US-3`** — *As a Center Submitter / Focal Point*, I want result types (Policy change, Innovation use, etc.) to have distinct color tags, so that I can visually scan the mix of outputs and outcomes at a glance.
* **`BRH-US-4`** — *As a Reviewer*, I want to quickly copy project codes, titles, and result alignment strings to my clipboard with immediate visual confirmation, so that I can paste them into reports and communications without manual selection errors.
* **`BRH-US-5`** — *As a User on a Laptop*, I want the filter and search controls to occupy minimal vertical space, so that I have maximum screen real estate for reviewing data rows.

---

## 6. Functional Requirements

### Grouped Container Cards & Visual Hierarchy

#### `BRH-R-1` — Container Card Architecture
The system MUST render each project group (or center group in Center mode) as an elevated, visually distinct container card (`rounded-[12px] border border-[var(--pr-border)] bg-[var(--pr-surface-card)] shadow-xs overflow-hidden`), mirroring the container styling of `reporting-aow-table`.

##### Scenario: Rendering Project Groups as Elevated Cards
- **GIVEN** the bilateral review page is loaded with grouped results
- **WHEN** the grouped view is active (`view === 'grouped'`)
- **THEN** each project group SHALL render inside an elevated card container with subtle borders and rounded corners
- **AND** the table rows belonging to that project SHALL be visually nested within that card container
- **BUT IT MUST NOT** render as a flat, un-nested `<tr>` row that blends into the background of adjacent projects.

#### `BRH-R-2` — Structured 52px Group Header with Separated Code Badge
The group header MUST be 52px in height and structurally separate the Project Code from the Project Title:
- The Project Code SHALL render in an authoritative monospace badge (`font-mono text-[11.5px] font-bold px-2.5 py-0.5 rounded-md bg-indigo-100/80 text-indigo-800 border border-indigo-200/70`).
- The Project Title SHALL render in clear, bold text (`text-[13.5px] font-bold text-[var(--pr-text-heading)]`) with clean truncation and title tooltip.
- The expand/collapse toggle SHALL render as a rotating chevron inside a white button container (`flex h-6 w-6 rounded-md bg-white border border-slate-200/80 text-indigo-700 shadow-2xs`).

##### Scenario: Parsing and Displaying Project Code and Title
- **GIVEN** a project with identifier `T-PJ-003262-An innovative approach to agribusiness`
- **WHEN** the group header renders
- **THEN** the system SHALL display `T-PJ-003262` inside the monospace badge
- **AND** `An innovative approach to agribusiness` SHALL display as the title
- **AND IT MUST** maintain the accessible name of the toggle button as `Toggle <Project Name>`.

#### `BRH-R-3` — Contributing Center Badge Chips
The group header MUST render distinct contributing center chips (`bg-slate-100 border border-slate-200 text-slate-700 font-medium text-[11px] px-2 py-0.5 rounded-[5px]`) for each distinct center involved in the project, replacing raw comma-separated text strings.

##### Scenario: Rendering Multiple Contributing Centers
- **GIVEN** a project whose results have lead centers `CIMMYT`, `IRRI`, and `CIP`
- **WHEN** the project card header renders
- **THEN** three distinct center chips (`CIMMYT`, `IRRI`, `CIP`) SHALL display in the header
- **AND IT MUST** truncate gracefully on narrow viewports without overflowing the card boundaries.

---

### Progressive Disclosure & Micro-Interactions

#### `BRH-R-4` — Smart Default Progressive Disclosure
The system MUST implement progressive disclosure for project groups on initial load:
- Groups containing at least one pending review (`pendingCount > 0`) SHALL be expanded by default so actionable items are visible.
- Groups with zero pending reviews SHALL default to collapsed, presenting a clean executive summary.
- The user's manual expand/collapse actions SHALL be preserved across filter adjustments and mode switches.
- The global `[Expand All / Collapse All]` toolbar button SHALL force all groups to the selected state.

##### Scenario: Smart Collapse on Cold Page Load
- **GIVEN** 14 bilateral projects loaded for a Science Program, where 4 projects have pending reviews and 10 projects have 0 pending reviews
- **WHEN** the page completes its initial render
- **THEN** only the 4 projects with pending reviews SHALL be expanded
- **AND** the 10 projects with 0 pending reviews SHALL be collapsed
- **AND IT MUST** allow the user to click `Expand all` to open all 14 projects in a single action.

#### `BRH-R-5` — Text Selection and Hover Copy Interactions
The system MUST enable text selection (`cursor-text select-text`) on Project Codes, Project Titles, Result Codes, and AoW Alignment titles. Furthermore, it MUST provide an accessible one-click copy button on hover (`content_copy` → `check text-emerald-600` with tooltip *"Copied!"*):
- Copying MUST copy the clean, unformatted string to the clipboard via `navigator.clipboard.writeText`.
- Visual confirmation SHALL display for 2000ms before returning to the default copy icon.
- Clicking the copy button MUST NOT trigger card expansion/collapse or row navigation (`$event.stopPropagation()`).

##### Scenario: Copying Project Title to Clipboard
- **GIVEN** a project card header with title "Young Africa Works Program"
- **WHEN** the user hovers over the title and clicks the copy icon
- **THEN** the title text SHALL be copied to the clipboard
- **AND** the icon SHALL transition to a green checkmark (`check`) with tooltip *"Copied!"*
- **AND** the project card expansion state SHALL remain unchanged.

#### `BRH-R-6` — In-Card Quick Breakdown Toolbar
When an expanded project card contains results from more than one center or more than one result type, the card MUST provide a 32px inner filter bar directly beneath the header (`h-[32px] border-b border-[var(--pr-border-divider)] bg-[var(--pr-surface-subtle)] px-[20px]`):
- It SHALL provide quick filter pills for Centers (`All (N)`, `Center A (X)`, `Center B (Y)`).
- It SHALL provide quick filter pills for Types (`All Types`, `Type A (X)`, `Type B (Y)`).
- Filtering inside a card SHALL filter only the rows of that specific card without altering global page filters.

##### Scenario: Quick Filtering Results by Center inside a Project Card
- **GIVEN** a project card with 8 results (6 CIMMYT, 1 IRRI, 1 CIP)
- **WHEN** the user clicks the `IRRI (1)` pill in the in-card toolbar
- **THEN** only the 1 IRRI result SHALL display in that card's table
- **AND** other project cards and global filter signals SHALL remain unaffected.

---

### Visual Styling, Colors & Scannability

#### `BRH-R-7` — Categorical Semantic Result Type Badges
The system MUST render each result's type using a dedicated semantic color badge pill instead of plain grey text:
- **Policy Change:** Violet / Indigo (`bg-violet-50 text-[var(--pr-color-primary-700)] border border-violet-200`)
- **Innovation Use / Development:** Emerald / Teal (`bg-emerald-50 text-emerald-700 border border-emerald-200`)
- **Capacity Sharing for Development:** Amber / Warm (`bg-amber-50 text-amber-800 border border-amber-200`)
- **Knowledge Product:** Sky / Cyan (`bg-sky-50 text-sky-700 border border-sky-200`)
- **Other Output / Other Outcome:** Slate Neutral (`bg-slate-100 text-slate-700 border border-slate-200`)

##### Scenario: Displaying Result Type Badges
- **GIVEN** a result row with type `Policy change`
- **WHEN** the result row renders
- **THEN** it SHALL display a violet badge pill with label "Policy change" directly above or alongside the result title
- **AND IT MUST NOT** display as plain, unstyled grey caption text.

#### `BRH-R-8` — Standardized Status Badges and 3px Row Border Accent
All result statuses MUST strictly use the PRMS design system's fixed `--pr-status-*` pairs (`KZ-changes--bilateral-review-viewport-and-table-polish-2`):
- `Pending Review`: `bg-[var(--pr-status-in-progress-bg)] text-[var(--pr-status-in-progress-fg)]`
- `Approved`: `bg-[var(--pr-status-approved-bg)] text-[var(--pr-status-approved-fg)]`
- `Rejected`: `bg-[var(--pr-danger-bg)] text-[var(--pr-danger)]`
- `Editing / Draft`: `bg-[var(--pr-status-not-started-bg)] text-[var(--pr-status-not-started-fg)]`
- Furthermore, each row SHALL carry a **3px status border accent on its left edge** (`border-l-[3px]`), matching the peripheral scanning pattern of `reporting-aow-table:853-857`.

##### Scenario: Status Visualization on Draft and Pending Rows
- **GIVEN** a result in `Editing` status and a result in `Pending Review` status
- **WHEN** rendered in the table
- **THEN** the `Editing` result SHALL display a structured neutral status pill and a neutral 3px left border accent
- **AND** the `Pending Review` result SHALL display an amber status pill and an amber 3px left border accent.

#### `BRH-R-9` — Primary Action Affordance
The action button in the table SHALL visually emphasize actionable tasks:
- When a row is pending and the user has review permissions (`canReview`), the button SHALL read `Review` with a pencil icon and carry primary brand accent styling (`hlmBtn` with `text-[var(--pr-color-primary-700)] font-semibold hover:bg-[var(--pr-color-primary-50)]`).
- When a row is already decided or read-only, the button SHALL read `See` with an eye icon and carry subtle ghost styling.

---

### Filter Band Consolidation

#### `BRH-R-10` — Consolidated 2-Row Sticky Filter Band
The system MUST replace the sprawling 4-tier filter stack with a high-density, 2-row consolidated band docked at the top of `#workArea` (maximum total height ≤ 110px):
- **Row 1 (Controls & Quick Toggles):**
  - Search input with clear button and reactive match count badge (`N matches`).
  - JIRA-style `Filter` button with active count badge (`flex h-[18px] min-w-[18px] rounded-full bg-[var(--pr-color-primary-600)] text-white`), opening a popover containing multi-selects for Center, Bilateral Project, and Indicator Category with "Clear all".
  - Status segmented control (`All (47)`, `Pending (23)`, `Approved (1)`, `Rejected (1)`).
  - View controls: Group by [Project | Center], View [Grouped | Flat], and [Expand all / Collapse all].
- **Row 2 (Metric Ribbon & Active Dismissible Chips):**
  - Summary KPI stat ribbon (`14 Projects · 8 Centers · 23 Pending Review · 2 Decided`).
  - Dismissible active filter chips (`Center: CIP ×`, `Type: Policy change ×`) allowing direct removal of filters.
  - One-click `Clear all filters` button when any filter is active.

##### Scenario: Active Filter Representation
- **GIVEN** the user filters by center `CIP` and status `Pending`
- **WHEN** the filter band renders
- **THEN** Row 2 SHALL display an active dismissible chip `Center: CIP` with a close icon `×`
- **AND** the status segmented control SHALL highlight `Pending (23)`
- **AND** the total pinned header height SHALL NOT exceed 110px.

---

### Responsiveness & Accessibility

#### `BRH-R-11` — Narrow Viewport & Mobile Parity (<900px)
When viewed on viewports narrower than 900px (`narrow === true`):
- The card container architecture SHALL remain intact, rendering one result card per result inside the project group.
- All interactive touch targets (copy buttons, expand toggles, action buttons) SHALL maintain a minimum size of **44×44px** per WCAG 2.5.5 / UI/UX Pro Max Priority 2.
- The page MUST NOT produce horizontal scrollbars on the document body (`overflow-x: hidden`).

---

## 7. Non-Functional Requirements

| Dimension | Target & Verification | Defect Class Caught |
|---|---|---|
| **Visual Hierarchy & Contrast** | All text, badges, and status pills MUST meet WCAG 2.1 AA (minimum 4.5:1 for normal text, 3:1 for large text/badges). | Illegible text, low-contrast pills, poor dark mode visibility. |
| **Viewport & Single Scroller** | Host MUST maintain `pr-viewport-page` and `#workArea` MUST be the only scroller ≥900px (`KZ-changes--bilateral-review-viewport-and-table-polish-1`). Measured pinned height MUST update `--brv-pinned-h`. | Double scrollbars, scrolled-away sticky filters, clipped content. |
| **Token Strictness** | ZERO hardcoded `#hex` color literals (`KZ-BOR-1`). Status surfaces MUST use only the fixed pairs `--pr-status-*-{fg,bg}` / `--pr-danger` (`KZ-changes--bilateral-review-viewport-and-table-polish-2`). | Brand drift, un-themed colors, jarring contrast breaks. |
| **Performance & CLS** | Filter changes and card toggle animations MUST not cause Cumulative Layout Shift (CLS < 0.05). Transition durations: 150–200ms. | Content jumping, laggy accordion opening. |
| **Test Coverage** | 100% of unit tests in `onecgiar-pr-client` covering `BilateralReviewComponent`, `BilateralReviewTableComponent`, and filter services MUST pass cleanly. | Regressions in URL query param sync, filter count arithmetic, or collapse states. |

---

## 8. Defect Classes & Verification Gates

| Defect Class | How Caught | Verification Command / Human Check |
|---|---|---|
| **Broken Query Param Sync** | Automated Jest unit tests asserting URL hydration, state-to-URL reflection, and `replaceUrl`. | `npx jest src/app/pages/result-framework-reporting/pages/bilateral-review/ --silent` |
| **Viewport Scroller Loss** | Automated Jest tests verifying `pr-viewport-page` host class and `#workArea` scroller. | `npx jest src/app/pages/result-framework-reporting/pages/bilateral-review/bilateral-review.component.spec.ts` |
| **Color Token Infractions** | Grep linter checking for raw hex codes in SCSS and HTML templates (`KZ-BOR-1`). | `git diff \| grep -E "#[0-9a-fA-F]{3,6}"` (must be 0 matches) |
| **Visual Hierarchy & Badge Clipping** | Visual human check at HITL gate + Playwright/Cypress screenshot review. | Review against target URL: `http://qa-development-2026.orca.localhost:63760/...` |
| **Touch Target Violations (<44px)** | Automated Cypress / Jest checks asserting minimum button dimensions in narrow mode. | `npx jest src/app/pages/result-framework-reporting/pages/bilateral-review/components/bilateral-review-table/` |

---

## 9. Requirement ID Index & Traceability

| ID | Name | Target Component | Addressed Pain Point |
|---|---|---|---|
| `BRH-R-1` | Container Card Architecture | `BilateralReviewTableComponent` | Eliminates flat data spreadsheet dump |
| `BRH-R-2` | Structured 52px Header with Monospace Code | `BilateralReviewTableComponent` | Isolates project code from project title |
| `BRH-R-3` | Contributing Center Chips | `BilateralReviewTableComponent` | Clear Center attribution |
| `BRH-R-4` | Smart Progressive Disclosure Default | `BilateralReviewTableComponent` | Eliminates 47-row wall of data on load |
| `BRH-R-5` | Text Selection & Hover Copy Actions | `BilateralReviewTableComponent` | Solves user inability to copy codes/titles |
| `BRH-R-6` | In-Card Quick Breakdown Toolbar | `BilateralReviewTableComponent` | Quick multi-center / multi-type filtering |
| `BRH-R-7` | Categorical Result Type Badges | `BilateralReviewTableComponent` | Instant recognition of outputs vs outcomes |
| `BRH-R-8` | Standardized Status Badges & 3px Accent | `BilateralReviewTableComponent` | Fixed token compliance & peripheral scanning |
| `BRH-R-9` | Primary Action Affordance | `BilateralReviewTableComponent` | Prominent `Review` CTA vs ghost `See` |
| `BRH-R-10` | Consolidated 2-Row Sticky Filter Band | `BilateralReviewComponent` | Cuts pinned vertical height from 200px to 105px |
| `BRH-R-11` | Narrow / Mobile Touch Target Parity | `BilateralReviewTableComponent` | Mobile usability and WCAG 2.5.5 compliance |
