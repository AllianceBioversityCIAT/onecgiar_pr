# Proposal: SP Guided Tour via Driver.js

## 1. Document Control

| Property | Value |
|---|---|
| **Spec Path** | `docs/specs/changes/sp-guided-tour-driverjs` |
| **Slug** | `sp-guided-tour-driverjs` — derived from user request: *"habilitar la opcion de Tour usando driverjs para la seccion de SPs"* |
| **Type** | Change |
| **Approval Mode** | `gated` |
| **Date** | 2026-09-03 |
| **Target Application** | `onecgiar-pr-client` (`dashboard-lab`) |
| **Status** | Approved |

---

## 2. Intent

Enable an interactive, non-intrusive guided tour using [Driver.js](https://driverjs.com/) within the Science Programs (SP) dashboard (`dashboard-lab`). The tour will welcome users, orient them in the SP shell, and smoothly walk them across the three foundational surfaces:
1. **Overview**: Portfolio progress, High-Level Output (HLO) summary, and delivery health metrics.
2. **Reporting**: ToC alignment, Areas of Work, HLO indicator groups, JIRA status stripes, and reporting action buttons.
3. **Results**: Reported results table with dynamic filters, resizable columns, review statuses, and export capabilities.

---

## 3. Problem / Current Behavior

### 3.1 Cognitive Load in the SP Shell
The Science Program workspace is one of the most content-dense environments in PRMS 2026:
- Users (Initiative Leads, Program Managers, PMU Officers, and Center Researchers) frequently confuse the distinct roles of **Overview** (analytical burndown & progress tracking), **Reporting** (operational indicator breakdown where progress is reported), and **Results** (portfolio data table of all reported outputs/outcomes).
- Key productivity features remain under-discovered:
  - Resizable table columns and custom width resets in Results.
  - HLO code badges, expand/collapse toggles, and status stripes in Reporting.
  - Quick-filters (Center & Typology chips) and search syntax.
  - The primary "Where to report" entry point and program identity popover.

### 3.2 Current Tour Capabilities
- `driver.js` is already installed as a dependency in `onecgiar-pr-client/package.json` (`v1.3.1`).
- A preliminary `ReportingGuideService` exists, but it targets legacy entry-hub flows (`basics`, `planned`, `emerging`, `guided`) rather than the active SP dashboard shell (`dashboard-lab`) and its three primary tabs.
- There is currently no unified, cohesive tour that steps across the three tabs with reactive route/view transitions and persistent completion tracking.

---

## 4. Proposed Outcome

1. **Discrete Tour Trigger in Program Band**:
   - A sleek, accessible tour trigger button (e.g. `[Take a Tour 💡]` or integrated in the `Help / Info ⓘ` area) in the `ReportingProgramBandComponent`.
   - Optional automatic first-visit prompt (subtle toast/banner or automatic start once per user, stored in `localStorage`).
2. **Multi-Tab Orchestrated Tour**:
   - Step 1: **SP Header & Identity** — Program title, reporting cycle year, and program metadata.
   - Step 2: **Navigation Strip** — Orientation on the three primary tabs (Overview, Reporting, Results).
   - Step 3: **Overview Tab** — High-level burndown, HLO achievement status, and portfolio health indicators.
   - Step 4: **Reporting Tab** — Auto-transitions to the Reporting view; highlights Areas of Work, HLO code badges, indicator progress, and the "Report" trigger.
   - Step 5: **Results Tab** — Auto-transitions to the Results view; highlights reported results, column resizing, status filters, and export.
   - Step 6: **Toolbar & Actions** — Quick-filters, search bar, and "Where to report".
3. **Seamless Signal/Route Synchronization**:
   - Driver.js hooks (`onHighlightStarted`, `onNextClick`, `onPrevClick`) synchronize active tab selection without page reloads.
4. **Native PRMS Design System**:
   - Popover styling adheres to PRMS design tokens (`--pr-color-primary-500`, `--pr-surface-card`, `--pr-text-heading`, `--pr-border-card`, `--pr-shadow-elevation-card`).

---

## 5. Scope

### In-Scope
- Creating/enhancing a dedicated tour service (`SpTourService` or modernizing `ReportingGuideService`).
- Injecting tour steps with localized titles, clear microcopy, and keyboard accessibility (ESC, Arrow keys, Enter).
- Adding the "Take a Tour" launcher in `reporting-program-band.component.html`.
- State persistence in `localStorage` (`pr.tour.sp.completed` timestamp / flag).
- Responsive safety: adjusting step placement on tablet viewports (768px-1024px) or disabling gracefully on narrow mobile viewports.
- Unit tests verifying tour step configuration, driver instantiation, and event hooks.

### Non-Goals
- Modifying backend APIs or database schemas (purely frontend client-side feature).
- Writing guided tours for bilateral or IPSR modules in this spec (focused strictly on SP dashboard).
- Implementing forced modal roadblocks that prevent users from working if dismissed.

---

## 6. Affected Users, Systems, And Specs

| Entity | Impact |
|---|---|
| **Users** | Science Program Leads, Contributor Researchers, PMU QA reviewers seeking rapid orientation. |
| **Components** | `DashboardLabComponent`, `ReportingProgramBandComponent`, `ProgramOverviewComponent`, `ReportingAowTableComponent`, `ProgrammeResultsComponent`. |
| **Services** | `ReportingGuideService` / `SpTourService`. |
| **Dependencies** | `driver.js` (already present in `package.json`). |
| **Related Specs** | `docs/specs/changes/reporting-aow-jira-hierarchy`, `docs/specs/changes/results-table-resizable-columns`. |

---

## 7. Visual Reference

- **Source**: Existing PRMS visual design system (`docs/ux-ui/design.md`) & Driver.js popover API.
- **Location**: `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/`
- **Notes**: Popovers styled with rounded borders (12px-14px), subtle drop shadows, and brand violet primary highlights matching PRMS tokens.

---

## 8. Requirement Delta Preview

### ADDED Requirements
- **SP-TOUR-R1**: The SP Program Band shall provide a visible, accessible trigger to initiate the SP guided tour on demand.
- **SP-TOUR-R2**: The tour shall guide the user sequentially across: Program Identity → Overview Tab → Reporting Tab → Results Tab → Toolbar & Actions.
- **SP-TOUR-R3**: The tour engine shall automatically switch the active view (`rfrView`) when transitioning between tab-specific steps.
- **SP-TOUR-R4**: The tour shall remember completion state in browser storage (`localStorage`) so users are not repeatedly prompted.
- **SP-TOUR-R5**: All tour popovers shall be fully navigable via keyboard (`Tab`, `Escape`, `Enter`, `ArrowRight`, `ArrowLeft`).

### MODIFIED Requirements
- None (new additive feature).

### REMOVED Requirements
- None.

---

## 9. Approach Options

| Option | Pros | Cons |
|---|---|---|
| **Option A: Integrated Driver.js SP Tour Service (Recommended)** | Uses existing installed `driver.js` dependency (< 5KB); highly flexible callbacks for signal changes; pure TS; customizable popover CSS tokens. | Requires coordinating tab switching inside Driver step lifecycle hooks. |
| **Option B: PrimeNG Tour Component** | Native Angular template syntax. | Requires updating PrimeNG dependencies; less resilient for cross-route step jumps; bulkier DOM footprint. |
| **Option C: Custom Angular Overlay Service (CDK Overlay)** | Complete control over every pixel and animation. | Heavy boilerplate (backdrop, focus trapping, positioning math, arrow geometry) duplicating what Driver.js already handles flawlessly. |

---

## 10. Recommended Approach

**Option A (Integrated Driver.js SP Tour Service)** is recommended because:
1. **Zero New Dependencies**: `driver.js` and its stylesheet are already included in `onecgiar-pr-client`.
2. **Proven Integration**: `driver.js` provides exact stage positioning, element highlighting with smooth padding/radius, and battle-tested focus trapping.
3. **Reactive Signal Hooks**: Driver.js's `onHighlightStarted` / `onNextClick` lifecycle methods cleanly allow calling Angular router navigation or signal updates (e.g. `router.navigate([programPath, 'reporting'])` or `rfrView.set(...)`) before spotlighting the target element.

---

## 11. Risks, Dependencies, And Open Questions

- **Risk: DOM Timing on Tab Switch**:
  - *Mitigation*: When stepping from Overview to Reporting, the DOM elements of the Reporting table must be rendered before driver highlights them. We will use Driver's step transition hooks or a short microtask/animationFrame wait.
- **Dependency**: Stable `data-testid` or `data-guide` selectors on target elements (e.g., `data-guide="tab-overview"`, `data-guide="tab-reporting"`, `data-guide="tab-results"`).
- **Open Question**: Should the tour trigger automatically on a user's first visit to an SP dashboard, or be purely manual via a button? (Recommendation: Subtle "New to Science Programs? Take a 2-min tour" banner/button, or manual click only to avoid disrupting power users).

---

## 12. Success Criteria

1. Clicking "Take a Tour" starts the Driver.js tour highlighting the SP Header.
2. Stepping through seamlessly traverses the **Overview**, **Reporting**, and **Results** tabs, switching the active view without crashing or misaligning the spotlight overlay.
3. The tour can be dismissed or skipped at any time with `Escape` or the close `×` button.
4. Completion status is saved so it does not auto-reopen unexpectedly.
5. Popovers cleanly inherit PRMS brand tokens and look native to the platform.

---

## 13. Next Step

Upon user approval of this proposal:
```text
/akili-specify changes/sp-guided-tour-driverjs
```
