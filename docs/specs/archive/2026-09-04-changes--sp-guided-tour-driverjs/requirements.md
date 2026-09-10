# Module Spec: SP Guided Tour via Driver.js — `requirements.md`

## 1. Module / Feature

- **Module:** `results` / `dashboard-lab`
- **Sub-feature:** `sp-guided-tour-driverjs` (Science Programs Guided Onboarding Tour)
- **Owner:** Frontend Team / UX
- **Status:** approved
- **Ticket(s):** PRMS-TOUR-SP
- **Related Specs:**
  - `docs/specs/changes/reporting-aow-jira-hierarchy`
  - `docs/specs/changes/results-table-resizable-columns`
- **Baseline Alignment:**
  - `docs/prd.md` (Goal G1: Streamline Result Reporting; US-S1, US-S2)
  - `docs/ux-ui/design.md` (§7 Design Tokens, §8 Navigation & Tabs, §10 Accessibility)
  - `docs/trd/trd.md` (§3 Client Architecture, Angular 21 Standalone + Signals)

---

## 2. Context

The Science Program workspace (`dashboard-lab`) is one of the most comprehensive analytical and operational hubs in PRMS 2026. Within this single shell, users manage portfolio delivery across three distinct operational views:
1. **Overview**: Portfolio progress analytics, burndown indicators, and High-Level Output (HLO) achievement summaries.
2. **Reporting**: The Theory of Change (ToC) indicator tree grouped by Areas of Work and HLOs, where contributors actively launch result reporting (`Report`).
3. **Results**: A tabular registry of all reported outputs and outcomes with resizable columns, review history, and export actions.

Currently, new Science Program leads and Center researchers experience significant cognitive load when navigating between these three surfaces. Key features—such as collapsible HLO groups, JIRA-style status stripes, table column resizing, and quick filters—frequently go unnoticed.

This specification defines the functional and non-functional requirements for an integrated, interactive guided tour built with [Driver.js](https://driverjs.com/) (already installed in `onecgiar-pr-client`), enabling users to discover and navigate the SP dashboard with confidence.

---

## 3. In Scope / Out of Scope

### In Scope
- **SP-TOUR-LAUNCHER**: An accessible, always-available tour trigger button in the `ReportingProgramBandComponent`.
- **SP-TOUR-FLOW**: A sequential 6-step guided walkthrough highlighting:
  1. SP Identity & Reporting Cycle.
  2. Tab Strip (Overview ⇄ Reporting ⇄ Results).
  3. Overview Surface (Analytical burndown & HLO progress).
  4. Reporting Surface (ToC alignment, HLO headers, indicator cards, status stripes, and Report action).
  5. Results Surface (Data table, resizable column handles, review status badges, and Excel export).
  6. Global Actions & Quick Filters (Search bar, Center & Typology chips, and "Where to report").
- **SP-TOUR-SYNC**: Automatic reactive tab/view switching (`rfrView` / router) during tour step transitions.
- **SP-TOUR-PERSISTENCE**: Tracking completion in browser storage (`localStorage`) to avoid intrusive auto-prompts.
- **SP-TOUR-A11Y**: Keyboard navigation (`Escape`, `ArrowRight`, `ArrowLeft`, `Enter`) and WCAG-compliant contrast using PRMS design tokens.

### Out of Scope
- Backend endpoints or database schema migrations (entirely client-side UX feature).
- Tours for Bilateral or IPSR frameworks (deferred to future standalone specs).
- Blocking modal overlays that cannot be dismissed or skipped.

---

## 4. Personas Affected

| Persona | Motivation & Value |
|---|---|
| **Science Program Lead** | Quickly understand how portfolio health is summarized in Overview, and locate where contributing Centers report. |
| **Result Submitter / Researcher** | Clearly identify the difference between the Reporting tab (where indicators are picked) and the Results tab (where past results are inspected). |
| **QA Reviewer / PMU Lead** | Onboard new team members rapidly without manual training sessions or external documentation guides. |

---

## 5. User Stories

- **SPTOUR-US-1**: As a **Science Program Lead**, I want a guided walkthrough of the SP dashboard, so that I understand how the Overview, Reporting, and Results sections interconnect.
- **SPTOUR-US-2**: As a **Result Submitter**, I want the tour to show me where to report results against planned indicators and where to find previously reported results, so that I do not create duplicate records.
- **SPTOUR-US-3**: As an **experienced user**, I want to easily dismiss or skip the tour at any time and re-open it on demand, so that my regular workflow is never obstructed.

---

## 6. Functional Requirements

### Required (MUST)

- **SPTOUR-R-1 (Trigger Button)**:
  The system MUST provide a visible, accessible trigger button in the `ReportingProgramBandComponent` (e.g. `[Take a Tour 💡]`) allowing the user to initiate the SP guided tour at any time.

- **SPTOUR-R-2 (Core Tour Steps)**:
  The system MUST execute a sequential tour using Driver.js comprising the following canonical stops:
  1. **SP Identity**: Spotlights program title, code, cycle year, and program lead information.
  2. **Navigation Tabs**: Spotlights the three primary tabs (`Overview`, `Reporting`, `Results`).
  3. **Overview Hub**: Highlights the portfolio burndown chart and HLO progress summary.
  4. **Reporting Hub**: Highlights Areas of Work, HLO headers, indicator cards, status stripes, and the "Report" button.
  5. **Results Hub**: Highlights the reported results table, column resize dividers, filter bar, and export button.
  6. **Quick Actions**: Highlights search, Center/Type quick-filter chips, and the "Where to report" button.

- **SPTOUR-R-3 (Reactive View Synchronization)**:
  When the tour transitions to a step located in a different tab (e.g., from Overview to Reporting, or from Reporting to Results), the system MUST automatically switch the active view (`rfrView`) and wait for target DOM nodes to be rendered before applying the highlight spotlight.

- **SPTOUR-R-4 (Dismissal & Exit)**:
  The user MUST be able to exit or cancel the tour at any moment by pressing `Escape`, clicking the overlay backdrop, or clicking the close button (`×`). Cancelling MUST immediately clean up all Driver.js DOM nodes and backdrop overlays without page reloads.

- **SPTOUR-R-5 (State Persistence)**:
  Upon completion or dismissal of the tour, the system MUST record a flag in `localStorage` (`pr.tour.sp.completed = 'true'`).

- **SPTOUR-R-6 (Keyboard Control)**:
  The tour popovers MUST support standard keyboard navigation: `ArrowRight` / `Enter` to advance, `ArrowLeft` to go back, and `Escape` to close.

### Should (SHOULD)

- **SPTOUR-R-7 (Non-Intrusive First Visit Invite)**:
  On the first visit to an SP dashboard where `pr.tour.sp.completed` is absent, the system SHOULD display a subtle, non-blocking toast or banner offering to start the tour, rather than forcing an unannounced takeover.

- **SPTOUR-R-8 (Responsive Graceful Fallback)**:
  On mobile screen widths (< 768px), the system SHOULD either adapt popover placement to avoid viewport overflow or inform the user that the tour is optimized for desktop viewports.

---

## 7. Non-Functional Requirements

| Dimension | Target | Verification Check |
|---|---|---|
| **Bundle Impact** | 0 KB additional npm dependencies (Driver.js already installed in `package.json`). | `package.json` inspection |
| **Performance** | Step transitions and highlight calculations MUST execute within 50ms. | Chrome DevTools Performance Profiler |
| **Design Tokens** | Popover borders, backgrounds, typography, and button states MUST use `--pr-*` CSS custom properties. | CSS lint & manual inspection |
| **Accessibility (a11y)** | Meets WCAG 2.1 AA; focus is trapped within the active popover; contrast ratio >= 4.5:1. | Automated axe check + keyboard test |
| **Clean DOM Lifecycle** | All backdrop, stage, and popover elements injected by Driver.js MUST be completely unmounted on destroy. | Unit test / Jest DOM assertion |

---

## 8. Defect Classes & Verification Mapping

| Defect Class | Risk | Prevention / Verification Gate |
|---|---|---|
| **DC-1: Missing Target Element** | Target selector is absent in the current view, causing Driver.js to skip steps unexpectedly. | Unit tests validating target selector contract in `reporting-guide.service.spec.ts`. |
| **DC-2: Tab Transition Desync** | Step advances before the target tab's DOM is mounted, resulting in misaligned spotlight coordinates. | Integration test verifying async `onHighlightStarted` / view-switching lifecycle. |
| **DC-3: Keyboard Lockup** | Modal fails to close on `Escape` or traps tab focus incorrectly. | Unit test verifying `allowClose: true` and keyboard listener bindings. |
| **DC-4: Token Contrast / Visual Misalignment** | Popover text or button contrast violates PRMS dark/light token system. | Human visual inspection at HITL approval pause. |

---

## 9. Concrete Scenarios

### Scenario 1: Launching and Stepping Through the Tour
- **GIVEN** a user viewing an SP dashboard (`/result-framework-reporting/entity-details/SP01`)
- **WHEN** the user clicks the "Take a Tour" button in the program band
- **THEN** Driver.js activates, dimming the background and spotlighting the SP Header with Step 1
- **WHEN** the user clicks "Next" or presses `ArrowRight`
- **THEN** the spotlight moves to the Tab Strip (Step 2)
- **WHEN** the user advances to Step 4 (Reporting)
- **THEN** the system switches the active tab to `reporting` (`rfrView.set('planned')`)
- **AND** the spotlight highlights the Reporting Area of Work table and HLO headers
- **BUT** it must NOT trigger a full page reload or drop existing route query parameters.

### Scenario 2: Cancelling the Tour
- **GIVEN** an active tour at Step 3
- **WHEN** the user presses `Escape` or clicks outside the highlighted area
- **THEN** Driver.js immediately destroys all overlay elements
- **AND** the user remains in their current view with normal interaction restored.

### Scenario 3: Returning User (Persistent State)
- **GIVEN** a user who previously completed or dismissed the tour
- **WHEN** the user navigates to the SP dashboard
- **THEN** no automated tour takeover is triggered
- **AND** the "Take a Tour" button remains available in the header for manual re-launching.

---

## 10. Dependencies & Assumptions

- **Upstream Dependencies**:
  - `driver.js` library (version 1.3.1) and `driver.js/dist/driver.css`.
  - `ReportingProgramBandComponent` for launcher button placement.
  - `DashboardLabComponent` for `rfrView` signal/navigation coordination.
- **Assumptions**:
  - The SP dashboard has stable DOM hook selectors (`data-guide="sp-identity"`, `data-guide="sp-tabs"`, etc.).
  - Browser has `localStorage` available (with fallback handling if storage is restricted).

---

## 11. Open Questions

- **SPTOUR-OQ-1**: Should the launcher button in `reporting-program-band` be an explicit text button (`[Take a tour 💡]`) or an icon next to `[Where to report]`?
  - *Resolution*: A clean, medium-sized button with an exploration icon (`explore` or `lightbulb`) placed next to the info button or in the header actions.

---

## 12. Required Cross-References

- PRD: `docs/prd.md` (§2 Goals G1, §3 Personas).
- UX/UI Blueprint: `docs/ux-ui/design.md` (§7 Design Tokens, §8 Navigation).
- TRD: `docs/trd/trd.md` (§3 Client Component Architecture).
