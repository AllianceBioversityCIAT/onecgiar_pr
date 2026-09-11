# Module Design: SP Guided Tour via Driver.js — `design.md`

## 1. Summary

This technical design details the implementation of an interactive guided onboarding tour using [Driver.js](https://driverjs.com/) for the Science Programs (SP) dashboard (`dashboard-lab`). It establishes a centralized tour orchestrator (`ReportingGuideService`), adds an accessible launch button in `ReportingProgramBandComponent`, defines clean DOM telemetry hooks (`data-guide="..."`), and synchronizes tour steps with Angular 21 reactive signals (`rfrView`) and Angular Router transitions across the three core views (**Overview**, **Reporting**, and **Results**).

- **Related Requirements:** `docs/specs/changes/sp-guided-tour-driverjs/requirements.md` (`SPTOUR-R-1` through `SPTOUR-R-8`).
- **Primary Constraints:** Purely client-side; zero new npm packages (reuses existing `driver.js` v1.3.1); zero full page reloads during step navigation; 100% compliance with PRMS design tokens (`--pr-*`).

---

## 2. Architecture Overview

### 2.1 Component Topology & Integration

```text
[ReportingProgramBandComponent] ──(click "Take a Tour")──► [ReportingGuideService.startSpTour()]
            │                                                              │
            ▼                                                              ▼
    [data-guide="sp-identity"]                                    [Driver.js Instance]
    [data-guide="sp-tabs"]                                                 │
            │                                                              │ (step callbacks)
            ▼                                                              ▼
[DashboardLabComponent] ◄──────── (navigate / set rfrView) ────────────────┘
    ├── Overview Surface   ([data-guide="tab-overview-view"])
    ├── Reporting Surface  ([data-guide="tab-reporting-view"])
    └── Results Surface    ([data-guide="tab-results-view"])
```

### 2.2 Sequence of Multi-Tab Tour Execution

```text
User clicks [Tour] in Header
  └── ReportingGuideService.startSpTour()
        ├── Set driver configuration (stagePadding: 6, popoverClass: 'pr-guide', overlayOpacity: 0.65)
        ├── Step 1: Spotlight [data-guide="sp-identity"] (Title, Code, Cycle)
        ├── Step 2: Spotlight [data-guide="sp-tabs"] (Overview, Reporting, Results tab strip)
        ├── Step 3: Spotlight [data-guide="tab-overview-content"] (Burndown & HLO summary)
        ├── User clicks [Next] → onNextClick detects transition to Reporting tab
        │     ├── Router/Signal: rfrView.set('planned') (or router.navigate(['reporting']))
        │     ├── Wait for requestAnimationFrame / DOM mount of reporting table
        │     └── driver.moveNext() to Step 4
        ├── Step 4: Spotlight [data-guide="tab-reporting-content"] (Areas of Work, HLO headers, Report CTA)
        ├── User clicks [Next] → onNextClick detects transition to Results tab
        │     ├── Router/Signal: router.navigate(['results'])
        │     ├── Wait for DOM mount of results table
        │     └── driver.moveNext() to Step 5
        ├── Step 5: Spotlight [data-guide="tab-results-content"] (Results table, resizable columns, Export)
        ├── User clicks [Next] → Step 6: Spotlight [data-guide="sp-actions-toolbar"] (Filters & "Where to report")
        └── User clicks [Done] / [Close] / [Escape]
              ├── driver.destroy()
              └── localStorage.setItem('pr.tour.sp.completed', 'true')
```

---

## 3. Data Model & Storage

### 3.1 Local Storage Contract

No database entities or migrations are required. Client-side tour state is persisted in `localStorage`:

| Key | Type | Description |
|---|---|---|
| `pr.tour.sp.completed` | `string` (`'true'`) | Set upon completing or explicitly dismissing the tour. Prevents unwanted auto-prompts on subsequent visits. |

### 3.2 Tour Step Definition Interface

Reuses Driver.js's native `DriveStep` structure with an optional `tabView` property:

```ts
export interface SpTourStepConfig {
  element: string;
  targetView?: 'overview' | 'planned' | 'results';
  popover: {
    title: string;
    description: string;
    side?: 'top' | 'right' | 'bottom' | 'left';
    align?: 'start' | 'center' | 'end';
  };
}
```

---

## 4. Frontend & UX Component Architecture

### 4.1 Trigger in `ReportingProgramBandComponent`
A sleek, accessible action button is placed in `reporting-program-band.component.html` within the header actions block:
- **Style**: Height 32px, `rounded-[8px]`, subtle border `border-[var(--pr-border)]`, background `bg-[var(--pr-surface-card)]`, text `text-[var(--pr-text-secondary)]`, with hover accent `hover:border-[var(--pr-color-primary-300)] hover:text-[var(--pr-color-primary-600)]`.
- **Icon**: `lucideCompass` or `material-icons-round explore`.
- **A11y**: `aria-label="Start guided tour"`, keyboard accessible via `Tab` + `Enter`.

### 4.2 Telemetry & Guide Attributes (`data-guide`)
To ensure reliable element selection without brittle CSS selectors, specific `data-guide` attributes are added to:
1. `data-guide="sp-identity"`: Program title, code, and 2026 cycle tag in `reporting-program-band.component.html`.
2. `data-guide="sp-tabs"`: The 3-tab navigation bar (`Overview`, `Reporting`, `Results`).
3. `data-guide="tab-overview-view"`: The portfolio burndown and HLO status widgets in `program-overview.component.html`.
4. `data-guide="tab-reporting-view"`: The Areas of Work table and HLO headers in `reporting-aow-table.component.html`.
5. `data-guide="tab-results-view"`: The results table container and resizable column headers in `programme-results.component.html`.
6. `data-guide="sp-actions-toolbar"`: The search input, quick filters, and "Where to report" button.

### 4.3 Popover Styling via PRMS Tokens
Driver.js renders the popover inside a root-level `.driver-popover` container. Custom styling is scoped via `.driver-popover.pr-guide`:
- **Surface**: `background: var(--pr-surface-card)`
- **Border**: `1px solid var(--pr-border-card)`
- **Border Radius**: `12px`
- **Shadow**: `var(--pr-shadow-elevation-card)` / `0 16px 36px rgba(25, 21, 36, 0.16)`
- **Title**: `font-size: 15px; font-weight: 700; color: var(--pr-text-heading); margin-bottom: 6px;`
- **Description**: `font-size: 13px; line-height: 1.5; color: var(--pr-text-secondary);`
- **Buttons**:
  - `Next` / `Done`: `background: var(--pr-color-primary-500); color: #ffffff; border-radius: 6px; padding: 6px 14px; font-weight: 600; font-size: 12.5px;`
  - `Previous`: `background: transparent; border: 1px solid var(--pr-border); color: var(--pr-text-secondary); border-radius: 6px; padding: 6px 12px; font-size: 12.5px;`
  - `Close`: `color: var(--pr-text-subtle); hover: color: var(--pr-text-heading);`
- **Stage Outline**:
  - `stagePadding: 6`
  - `stageRadius: 10`
  - `overlayColor: '#1e202f'`
  - `overlayOpacity: 0.65`

---

## 5. Design Decisions (ADRs)

### SPTOUR-DD-1: Reusing Installed Driver.js Engine
- **Context**: PRMS already has `driver.js` (`^1.3.1`) in `onecgiar-pr-client/package.json`.
- **Decision**: Centralize the SP guided tour logic in an extended method inside `ReportingGuideService` (e.g. `startSpTour(programContext)`).
- **Alternatives Considered**:
  - *PrimeNG Tour*: Would introduce heavyweight Angular component wrappers and lacks flexible cross-route callbacks.
  - *Custom CDK Overlay*: Would require reinventing stage clipping, SVG spotlight math, and keyboard traps from scratch.
- **Rationale**: Minimal footprint, zero dependency drift, battle-tested accessibility.

### SPTOUR-DD-2: Step-Driven Reactive Tab Switching
- **Context**: The SP dashboard tabs (Overview, Reporting, Results) are hosted in separate sub-routes or signals (`rfrView`).
- **Decision**: Use Driver.js's step callbacks (`onNextClick`, `onPrevClick`) to inspect the target step's required tab. If the user is advancing from Overview (Step 3) to Reporting (Step 4), trigger the tab switch, await DOM availability via a microtask, and then highlight the target element.
- **Alternatives Considered**: Restricting the tour to only the currently opened tab.
- **Rationale**: A tour that stops at the first tab fails the primary user need—understanding how Overview, Reporting, and Results work together.

### SPTOUR-DD-3: Persistence & Non-Intrusive Onboarding
- **Context**: Intrusive, unprompted modals that take over the screen on page load cause frustration for experienced users.
- **Decision**: The tour does not forcibly launch without user consent. It is initiated on-demand from the program band. On first visits (absence of `pr.tour.sp.completed`), a subtle notification badge or tooltip highlights the `[Tour]` button.
- **Rationale**: Respects power-user agency while giving new users immediate access to guidance.

---

## 6. Reversion Challenge (Step 2.3)

| Target of Reversion | Question: What does removing / modifying this break? | Assessment & Safeguard |
|---|---|---|
| None | Does adding the Tour button remove or displace any existing buttons? | **No.** The button is additive. In `reporting-program-band`, it is inserted adjacent to the existing `Where to report` and Info buttons without modifying their layout budget or event handlers. |

---

## 7. Budget Sizing & Execution Plan (Step 2.4)

| Metric | Estimated Target |
|---|---|
| **Expected Tasks** | **3 tasks** (`SPTOUR-T-1`, `SPTOUR-T-2`, `SPTOUR-T-3`) |
| **Expected LOC** | **~240 lines** (TS service logic + HTML triggers + CSS tokens + tests) |
| **Expected Review Rounds** | **1 round** |
| **Depth Evaluation** | `Standard` depth chosen is an exact fit for 3 tasks and ~240 LOC. |

- **Task 1 (`SPTOUR-T-1`)**: Service Orchestration & Multi-Tab Step Pipeline in `ReportingGuideService`.
- **Task 2 (`SPTOUR-T-2`)**: UI Launcher Button & PRMS Design Token Styling for `.driver-popover`.
- **Task 3 (`SPTOUR-T-3`)**: Telemetry Hooks (`data-guide`) across Views & Unit Test Suite.

---

## 8. Next Step

Upon user approval of this design:
```text
Phase 3: tasks.md decomposition
```
