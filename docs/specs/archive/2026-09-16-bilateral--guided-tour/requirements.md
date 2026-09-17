# Module Spec: Bilateral Center Guided Tour via Driver.js — `requirements.md`

## 1. Document Control

| Property | Value |
|---|---|
| **Spec Path** | `docs/specs/bilateral/guided-tour` |
| **Module** | `bilateral` |
| **Sub-feature** | `guided-tour` (Bilateral Center Guided Tour via Driver.js) |
| **Type** | Change |
| **Approval Mode** | gated |
| **Status** | shipped |
| **Ticket(s)** | PRMS-BIL-TOUR |
| **Date** | 2026-09-16 |
| **Author** | Antigravity (T1 Architect) |
| **Related Specs** | `docs/specs/archive/2026-09-04-changes--sp-guided-tour-driverjs/` (Science Programs Tour reference)<br>`docs/specs/bilateral/ai-drafts-redesign/` (AI Drafts tab & header)<br>`docs/specs/bilateral/center-overview-tab/` (Overview tab architecture) |
| **Baseline Alignment** | `docs/prd.md` (§2 Goal G1: Streamline Result Reporting; US-S1, US-S2)<br>`docs/ux-ui/design.md` (§7 Design Tokens, §8 Navigation & Tabs, §10 Accessibility)<br>`docs/trd/trd.md` (§3 Client Architecture, Angular 21 Standalone + Signals) |

---

## 2. Executive Summary & Context

The Bilateral Center workspace (`/bilateral/:center`) is the central operational environment where CGIAR Research Centers report, monitor, and manage bilateral research projects and results. The workspace spans four primary views:
1. **Overview** (`/overview`): High-level KPI deck, reporting burndown, and analytical charts summarizing progress across projects and Science Programs.
2. **Reporting** (`/home`): The project catalog where Center staff filter bilateral projects, view target indicators, and launch new result reporting.
3. **Results** (`/results`): The tabular registry of submitted and editing bilateral results with status filters, column selection, and management actions.
4. **AI Draft Results** (`/drafts`): AI-extracted candidate results generated from project reports, complete with project filters and promotion workflows.

While the Science Programs dashboard offers an established, interactive 6-step guided tour (`changes/sp-guided-tour-driverjs`) using `driver.js`, the Bilateral workspace currently offers no onboarding or contextual walkthrough. New Center Planners, Focal Points, and Reviewers must independently explore how these four surfaces interconnect and discover features such as the `Bulk Results Uploader`.

This specification establishes the functional and non-functional requirements for an integrated, multi-step interactive guided tour built with `driver.js` (1.3.1) in `onecgiar-pr-client`. The tour guides users through the Bilateral Center header, navigation tabs, all four tab surfaces, and the external bulk uploader handoff, ensuring strict parity with the design tokens and interaction patterns established in Science Programs.

---

## 3. Glossary

| Term | Definition |
|---|---|
| **Center Acronym** | Short identifier for a CGIAR Research Center (e.g. `CIAT`, `CIMMYT`, `IRRI`, `IFPRI`). |
| **Driver.js** | Lightweight, zero-dependency vanilla JavaScript library for creating spotlight overlays, popovers, and interactive product tours. Already installed at `1.3.1`. |
| **Data Guide Attribute** | HTML attribute `data-guide="<id>"` placed on DOM elements to provide stable, selector-independent anchors for Driver.js spotlighting. |
| **Tab Synchronization** | The mechanism whereby advancing or reversing tour steps automatically navigates the Angular Router to the appropriate tab URL if the target element lives on a different tab. |
| **Bulk Results Uploader** | External application handoff for batch result ingestion via spreadsheet templates, triggered from the Bilateral header CTA. |

---

## 4. System Context & Scope

### In Scope
- **BGT-LAUNCHER**: An accessible, always-available `[🧭 Tour]` trigger button in `BilateralPageHeaderComponent` positioned to the left of the `Bulk Results Uploader` button.
- **BGT-STEPS**: A sequential 10-step guided walkthrough highlighting:
  1. **Center Identity & Controls**: Center Acronym, Full Name, Reporting Year/Cycle, and Info popover.
  2. **Navigation Tabs Strip**: Overview, Reporting, Results, AI Draft Results.
  3. **Overview Hub**: KPI deck, burndown metrics, and summary breakdown charts.
  4. **Reporting Hub & Quick Filters**: Search by code/title, quick filter chips, and grid/table view toggle.
  5. **Reporting Overview & KPI Cards**: Total Projects, top Science Programs, and Multi-Program co-mapped cards with instant filter capability.
  6. **Bilateral Project Catalog & Alignment**: Project card details, active status, description, and aligned Science Programs with allocation percentages.
  7. **Create Result Directly from Project**: "+ Create result" CTA button launching the reporting drawer pre-linked to that project.
  8. **Results Hub**: Results data table, status filters, column picker, and row actions.
  9. **AI Draft Results Hub**: AI draft cards, project dropdown filter, and Review / Create Result workflows.
  10. **Bulk Results Uploader**: External bulk batch upload tool handoff.
- **BGT-SYNC**: Automated route navigation via Angular Router (`router.navigate`) during step transitions (`onNextClick` / `onPrevClick`) across tabs.
- **BGT-PERSISTENCE**: Tracking tour completion in `localStorage` (`pr.tour.bilateral.completed = 'true'`) while allowing on-demand re-execution at any time.
- **BGT-A11Y & TOKENS**: Full keyboard control (`Escape`, `ArrowRight`, `ArrowLeft`, `Enter`) and 100% reuse of the existing `.driver-popover.pr-guide` CSS rules in `src/styles.scss`.

### Out of Scope
- Backend modifications (`onecgiar-pr-server`): No server endpoints, tables, or database migrations.
- Tour flows for other modules (IPSR, Admin, Quality Assurance).
- In-tour data modification or interactive form inputs.

---

## 5. Stakeholders / Personas Affected

| Persona | Role in Bilateral | Motivation & Value |
|---|---|---|
| **Center Focal Point / Planner** | Primary reporter and project manager | Understands immediately which tab to use for reporting (Catalog vs Results vs AI Drafts) and discovers the Bulk Uploader. |
| **Bilateral Result Contributor** | Authors and edits results | Learns how to locate their project, review existing outputs to prevent duplication, and inspect AI-suggested drafts. |
| **QA Reviewer / PMU Lead** | Portfolio oversight and reviewer | Rapidly onboards new team members without holding repetitive manual training sessions. |

---

## 6. Functional Requirements

### BGT-R-1: Header Tour Trigger Button
The system MUST render an accessible `[🧭 Tour]` button in the top-right action area of `BilateralPageHeaderComponent` immediately to the left of the `Bulk Results Uploader` button whenever `activeTab()` is not null and `showBulkCta()` is true.

#### Scenario: Tour trigger visibility and styling
- **GIVEN** a user on any of the 4 Bilateral tabs (`Overview`, `Reporting`, `Results`, `AI Draft Results`)
- **WHEN** the header renders
- **THEN** the `[🧭 Tour]` button is visible with `data-guide="bilateral-tour-trigger"`
- **AND** it features the `explore` material icon (`text-[16px] text-[var(--pr-color-primary-500)]`) and label `Tour`
- **AND** the label collapses on small viewports (`< 640px`) while retaining the icon and accessible name `aria-label="Start guided tour"`
- **BUT** it must NOT render on non-tabbed sub-pages (e.g. the standalone result creator wizard where `activeTab()` is null).

---

### BGT-R-2: Sequential 10-Stop Driver.js Walkthrough
The system MUST execute a sequential 10-step guided tour using Driver.js comprising the following canonical stops:
1. **Center Identity (`bilateral-identity`)**: Highlights the Center acronym, title, reporting cycle, and information modal.
2. **Navigation Tabs (`bilateral-tabs`)**: Highlights the 4 primary tabs (`Overview`, `Reporting`, `Results`, `AI Draft Results`).
3. **Overview Hub (`bilateral-tab-overview`)**: Highlights the KPI metrics, burndown progress, and center analytics.
4. **Reporting Hub & Quick Filters (`bilateral-tab-reporting`)**: Highlights the project search bar, quick filter chips, and grid/table view toggle.
5. **Reporting Overview & KPI Cards (`bilateral-reporting-kpis`)**: Highlights the summary KPI cards with 1-click filter capability.
6. **Bilateral Project Catalog & Alignment (`bilateral-project-card`)**: Highlights the first project card with its description, status, and Science Program allocations.
7. **Create Result Directly from Project (`bilateral-project-create-result`)**: Highlights the "+ Create result" button to launch result creation directly from a project.
8. **Results Hub (`bilateral-tab-results`)**: Highlights the results table, filter bar, column customization, and status chips.
9. **AI Draft Results Hub (`bilateral-tab-drafts`)**: Highlights AI-generated drafts, project filtering, and the Review/Create Result buttons.
10. **Bulk Results Uploader (`bilateral-bulk-uploader-cta`)**: Highlights the bulk upload external tool button.

#### Scenario: Step progression
- **GIVEN** an active guided tour initiated from the header
- **WHEN** the user clicks "Next" or presses `ArrowRight`
- **THEN** Driver.js advances sequentially to the next step, spotlighting the target DOM element with the configured padding, border radius, and popover content
- **AND** the popover displays a badge indicating the associated view/tab and a step counter (`Step X of 10`).

---

### BGT-R-3: Reactive Cross-Tab Route Synchronization
When a tour transition targets a step located on a different tab, the system MUST programmatically navigate to that tab route via Angular Router, preserve existing query parameters (`phase`), and delay step spotlighting until the destination view's DOM elements are mounted.

#### Scenario: Moving from Overview (Step 3) to Reporting (Step 4)
- **GIVEN** the tour is currently highlighting the Overview tab (Step 3)
- **WHEN** the user clicks "Next"
- **THEN** the service initiates navigation to `/bilateral/:center/home`
- **AND** waits ~100ms for Angular component initialization
- **AND** Driver.js spotlights `[data-guide="bilateral-tab-reporting"]`
- **BUT** it must NOT trigger a full browser page refresh or drop the active `?phase=` parameter.

#### Scenario: Moving backwards across tabs
- **GIVEN** the tour is highlighting the Results tab (Step 5)
- **WHEN** the user clicks "Back" or presses `ArrowLeft`
- **THEN** the service navigates back to `/bilateral/:center/home`
- **AND** Driver.js spotlights `[data-guide="bilateral-tab-reporting"]` (Step 4).

---

### BGT-R-4: State Persistence & Replayability
The system MUST record tour completion in browser `localStorage` (`pr.tour.bilateral.completed = 'true'`) upon tour finish or dismissal. The tour MUST remain on-demand re-executable at any time by clicking the header `[🧭 Tour]` button regardless of previous completion.

#### Scenario: Dismissal and re-entry
- **GIVEN** a user completes or dismisses the tour
- **THEN** `localStorage` records `pr.tour.bilateral.completed = 'true'`
- **WHEN** the user returns to the Bilateral Center on future visits
- **THEN** no disruptive automatic overlay is displayed
- **WHEN** the user manually clicks `[🧭 Tour]` in the header
- **THEN** the tour begins from Step 1 immediately.

---

### BGT-R-5: Keyboard Navigation & Dismissal
The tour MUST support keyboard interaction:
- `ArrowRight` or `Enter`: advance to next step.
- `ArrowLeft`: return to previous step.
- `Escape`: exit and close the tour immediately.
- Clicking the backdrop overlay: exit and close the tour immediately.
- Clicking the close button (`×`): exit and close the tour immediately.

#### Scenario: Exiting the tour via Escape
- **GIVEN** an active tour at any step
- **WHEN** the user presses `Escape` or clicks the backdrop
- **THEN** Driver.js immediately destroys all overlay elements (`.driver-overlay`, `.driver-popover`)
- **AND** user focus and standard page interactivity are restored without page reload.

---

### BGT-R-6: Design Token Conformance & Zero New CSS
The tour popovers MUST strictly reuse the existing global `.driver-popover.pr-guide` SCSS styling defined in `src/styles.scss` (lines 687-825). No component-level SCSS overrides or duplicate CSS rules shall be created.

#### Scenario: Popover styling
- **GIVEN** any rendered Driver.js popover in the Bilateral tour
- **THEN** the popover container uses class `pr-guide`
- **AND** titles, descriptions, buttons (`Next`, `Back`, `Got it`, `×`), progress indicators, and badges consume `--pr-*` design tokens matching the Science Programs tour visual presentation.

---

## 7. Non-Functional Requirements

| Dimension | Target | Verification Method |
|---|---|---|
| **Bundle Impact** | 0 KB new npm dependencies (reuses installed `driver.js@1.3.1`). | `package.json` inspection |
| **Performance** | Step transitions and highlight calculations execute in < 60ms. | Chrome DevTools Performance Profiler |
| **Modularity** | `BilateralTourService` is encapsulated in `src/app/pages/bilateral/services/` with zero dependency on `dashboard-lab`. | Module import audit |
| **Accessibility (WCAG 2.1 AA)** | Keyboard navigability, trap focus within active popover, contrast ratio >= 4.5:1. | Automated axe check + keyboard test |
| **DOM Cleanup** | 100% removal of Driver.js backdrop and popover DOM nodes upon destroy. | Jest unit test DOM assertion |

---

## 8. Defect Classes & Verification Mapping

| Defect Class | Concrete Risk | Verification Gate & Catching Mechanism |
|---|---|---|
| **D1: Missing DOM Hook** | Element selector (`[data-guide="..."]`) missing or renamed in template, causing Driver.js to skip steps silently. | Automated Jest unit tests verifying each step selector exists in the respective component fixture. |
| **D2: Tab Route Desync / Race Condition** | Driver.js tries to spotlight a step before Angular Router finishes loading the target tab component. | Async unit tests mocking `Router.navigate` and validating transition microtask buffer. |
| **D3: Keyboard / Overlay Trap Lockup** | Modal fails to close on `Escape` or backdrop click, trapping user on dimmed screen. | Unit test verifying `allowClose: true` and `onDestroyed` cleanup lifecycle. |
| **D4: Visual Misalignment / Token Drift** | Popover contrast, fonts, or button positions deviate from SP tour appearance. | Human visual inspection at HITL approval pause matching `visual-reference/sp-tour-reference.png`. |

---

## 9. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| **BGT-AC-1** | User views any Bilateral tab (`Overview`, `Reporting`, `Results`, `AI Draft Results`) | Header renders | `[🧭 Tour]` button is visible next to `Bulk Results Uploader` with `data-guide="bilateral-tour-trigger"`. |
| **BGT-AC-2** | User is on the Overview tab | User clicks `[🧭 Tour]` | Driver.js initiates at Step 1 spotlighting `[data-guide="bilateral-identity"]`. |
| **BGT-AC-3** | Tour is at Step 1 (`bilateral-identity`) | User clicks `Next` | Tour moves to Step 2 spotlighting Navigation Tabs (`[data-guide="bilateral-tabs"]`). |
| **BGT-AC-4** | Tour is at Step 2 (`bilateral-tabs`) | User clicks `Next` | Tour moves to Step 3 spotlighting Overview content (`[data-guide="bilateral-tab-overview"]`). |
| **BGT-AC-5** | Tour is at Step 3 (`bilateral-tab-overview`) | User clicks `Next` | Router navigates to `/bilateral/:center/home` and Step 4 spotlights Reporting toolbar & filters (`[data-guide="bilateral-tab-reporting"]`). |
| **BGT-AC-6** | Tour is at Step 4 (`bilateral-tab-reporting`) | User clicks `Next` | Step 5 spotlights Reporting Overview & KPI Cards (`[data-guide="bilateral-reporting-kpis"]`). |
| **BGT-AC-7** | Tour is at Step 5 (`bilateral-reporting-kpis`) | User clicks `Next` | Step 6 spotlights Bilateral Project Catalog & Alignment (`[data-guide="bilateral-project-card"]`). |
| **BGT-AC-8** | Tour is at Step 6 (`bilateral-project-card`) | User clicks `Next` | Step 7 spotlights Create Result Directly from Project (`[data-guide="bilateral-project-create-result"]`). |
| **BGT-AC-9** | Tour is at Step 7 (`bilateral-project-create-result`) | User clicks `Next` | Router navigates to `/bilateral/:center/results` and Step 8 spotlights Results table (`[data-guide="bilateral-tab-results"]`). |
| **BGT-AC-10** | Tour is at Step 8 (`bilateral-tab-results`) | User clicks `Next` | Router navigates to `/bilateral/:center/drafts` and Step 9 spotlights AI Drafts (`[data-guide="bilateral-tab-drafts"]`). |
| **BGT-AC-11** | Tour is at Step 9 (`bilateral-tab-drafts`) | User clicks `Next` | Step 10 spotlights the `Bulk Results Uploader` button (`[data-guide="bilateral-bulk-uploader-cta"]`). |
| **BGT-AC-12** | Tour is at Step 10 | User clicks `Got it` or `×` | Tour overlay is destroyed, `localStorage` flag is saved, and user remains on current view. |

---

## 10. Dependencies & Assumptions

- **Dependencies**:
  - `driver.js: 1.3.1` (already installed in `package.json`).
  - Global CSS `.driver-popover.pr-guide` in `src/styles.scss`.
  - `BilateralContextService` for `centerAcronym()` and reporting cycle metadata.
  - Angular `Router` for cross-tab transitions.
- **Assumptions**:
  - Center acronym is always present in route URL `/bilateral/:center/*`.
  - Browser `localStorage` is accessible (with fallback handling if restricted).

---

## 11. Open Questions

- **BGT-OQ-1**: Should Step 7 (Bulk Results Uploader) navigate back to the Overview tab or stay on the current tab?
  - *Resolution*: The `Bulk Results Uploader` CTA exists in `BilateralPageHeaderComponent` on *all four tabs*. Therefore, Step 7 does not need to force a tab switch; it spotlights the CTA right on whichever tab is currently displayed.

---

## 12. Required Cross-References

- PRD: `docs/prd.md` (§2 Goals G1, §3 Personas).
- UX/UI Blueprint: `docs/ux-ui/design.md` (§7 Design Tokens, §8 Navigation & Tabs, §10 Accessibility).
- TRD: `docs/trd/trd.md` (§3 Client Component Architecture).
- Reference Spec: `docs/specs/archive/2026-09-04-changes--sp-guided-tour-driverjs/`.
