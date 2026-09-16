# Module Design: Bilateral Center Guided Tour via Driver.js — `design.md`

## 1. Summary

This technical design specifies the architecture and implementation of an interactive guided onboarding tour for the Bilateral Center workspace (`/bilateral/:center`) using Driver.js. It introduces a dedicated client service (`BilateralTourService`), embeds an accessible launcher button in `BilateralPageHeaderComponent`, instruments stable DOM hooks (`data-guide="..."`) across all four tab views, and synchronizes tour step progression with the Angular Router across the four center surfaces: **Overview**, **Reporting**, **Results**, and **AI Draft Results**.

- **Related Requirements:** `docs/specs/bilateral/guided-tour/requirements.md` (`BGT-R-1` through `BGT-R-6`, `BGT-AC-1` through `BGT-AC-8`).
- **Primary Constraints:** Client-only architecture; 0 new npm packages (reuses installed `driver.js@1.3.1`); zero full page reloads during step progression; 100% reuse of global PRMS design token styling (`.driver-popover.pr-guide`).

---

## 2. Architecture Overview

### 2.1 Component Topology & Integration

```text
[BilateralPageHeaderComponent] ──(click "Tour")──► [BilateralTourService.startBilateralTour()]
            │                                                           │
            ▼                                                           ▼
    [data-guide="bilateral-identity"]                          [Driver.js Instance]
    [data-guide="bilateral-tabs"]                                       │
    [data-guide="bilateral-bulk-uploader-cta"]                          │ (onNextClick / onPrevClick)
            │                                                           ▼
            ▼                                               [Angular Router.navigate]
[Bilateral Views / Tabs] ◄──────────────────────────────────────────────┘
    ├── Overview Surface  ([data-guide="bilateral-tab-overview"])
    ├── Reporting Surface ([data-guide="bilateral-tab-reporting"])
    ├── Results Surface   ([data-guide="bilateral-tab-results"])
    └── AI Drafts Surface ([data-guide="bilateral-tab-drafts"])
```

### 2.2 Sequence of Multi-Tab Tour Execution

```text
User clicks [Tour] in Header Action Band
  └── BilateralTourService.startBilateralTour(options)
        ├── Configure Driver.js (popoverClass: 'pr-guide', stagePadding: 6, overlayOpacity: 0.65)
        ├── Step 1: Spotlight [data-guide="bilateral-identity"] (Center Name, Acronym, Cycle)
        ├── Step 2: Spotlight [data-guide="bilateral-tabs"] (Overview, Reporting, Results, AI Drafts)
        ├── Step 3: Spotlight [data-guide="bilateral-tab-overview"] (KPI deck, burndown & charts)
        ├── User clicks [Next] → onNextClick detects target is Reporting tab (/home)
        │     ├── Angular Router: router.navigate(['/bilateral', center, 'home'], { queryParams })
        │     ├── Microtask delay (~100ms) awaits component mount & DOM render
        │     └── driver.drive(3) spotlighting Step 4
        ├── Step 4: Spotlight [data-guide="bilateral-tab-reporting"] (Reporting search, quick filters, view toggle)
        ├── User clicks [Next] → same tab (reporting)
        │     └── driver.drive(4) spotlighting Step 5
        ├── Step 5: Spotlight [data-guide="bilateral-reporting-kpis"] (KPI summary cards & 1-click filters)
        ├── User clicks [Next] → same tab (reporting)
        │     └── driver.drive(5) spotlighting Step 6
        ├── Step 6: Spotlight [data-guide="bilateral-project-card"] (First project card, description & SP alignments)
        ├── User clicks [Next] → same tab (reporting)
        │     └── driver.drive(6) spotlighting Step 7
        ├── Step 7: Spotlight [data-guide="bilateral-project-create-result"] ("+ Create result" CTA button)
        ├── User clicks [Next] → onNextClick detects target is Results tab (/results)
        │     ├── Angular Router: router.navigate(['/bilateral', center, 'results'], { queryParams })
        │     ├── Microtask delay (~100ms) awaits table render
        │     └── driver.drive(7) spotlighting Step 8
        ├── Step 8: Spotlight [data-guide="bilateral-tab-results"] (Results registry, filters, column picker)
        ├── User clicks [Next] → onNextClick detects target is AI Drafts tab (/drafts)
        │     ├── Angular Router: router.navigate(['/bilateral', center, 'drafts'], { queryParams })
        │     ├── Microtask delay (~100ms) awaits draft cards render
        │     └── driver.drive(8) spotlighting Step 9
        ├── Step 9: Spotlight [data-guide="bilateral-tab-drafts"] (AI draft cards, project filter, actions)
        ├── User clicks [Next] → Step 10: Spotlight [data-guide="bilateral-bulk-uploader-cta"] in Header
        └── User clicks [Got it] / [Close] / [Escape]
              ├── driver.destroy()
              └── localStorage.setItem('pr.tour.bilateral.completed', 'true')
```

---

## 3. Data Model & Storage

### 3.1 Local Storage Contract

No database entities, backend endpoints, or migrations are required. Client-side tour state is persisted in `localStorage`:

| Key | Type | Description |
|---|---|---|
| `pr.tour.bilateral.completed` | `string` (`'true'`) | Set upon completing or explicitly dismissing the tour. Prevents disruptive auto-prompts on future visits. |

### 3.2 Tour Options & Step Mapping Structure

`BilateralTourService` defines standard interfaces matching Driver.js contracts:
- `BilateralTourOptions`: encapsulates `centerAcronym`, `centerName`, `cycleYear`, `activeTab`, and optional navigation callback.
- Tab mapping array: maps step index (0 to 9) to the respective tab route (`'overview'`, `'reporting'`, `'results'`, `'drafts'`).

---

## 4. Frontend & UX Component Architecture

### 4.1 Header Trigger Button in `BilateralPageHeaderComponent`
A lightweight, accessible action button is added to the top-right header action group alongside `Bulk Results Uploader`:
- **Placement**: Positioned immediately to the left of the `Bulk Results Uploader` button inside the container that renders when `activeTab()` is truthy and `showBulkCta()` is true.
- **Styling**: Height 32px (mobile) / 36px (desktop), rounded 8px, border `border-[var(--pr-border)]`, background `bg-[var(--pr-surface-card)]`, text `text-[var(--pr-text-secondary)]`, with hover states `hover:border-[var(--pr-color-primary-300)] hover:text-[var(--pr-color-primary-600)] hover:bg-[var(--pr-color-primary-50)]`.
- **Icon**: `material-icons-round` icon `explore` in primary color `text-[var(--pr-color-primary-500)]`.
- **Responsive Label**: Text `Tour` displays on viewports >= 640px and collapses gracefully on narrow mobile viewports while preserving accessible name `aria-label="Start guided tour"`.
- **Telemetry Hook**: `data-guide="bilateral-tour-trigger"`.

### 4.2 Telemetry & Guide Attributes (`data-guide`)
Stable data attributes are added to anchor Driver.js spotlighting without reliance on fragile CSS class chains:
1. `data-guide="bilateral-identity"`: Center acronym, title, and cycle information in `BilateralPageHeaderComponent`.
2. `data-guide="bilateral-tabs"`: The 4-tab navigation strip in `BilateralPageHeaderComponent`.
3. `data-guide="bilateral-tab-overview"`: Key figures deck and burndown charts in `BilateralOverviewComponent`.
4. `data-guide="bilateral-tab-reporting"`: Toolbar and search input in `BilateralProjectsPanelComponent`.
5. `data-guide="bilateral-reporting-kpis"`: KPI overview and quick filter cards in `BilateralProjectsPanelComponent`.
6. `data-guide="bilateral-project-card"`: First project card in catalog with alignment info in `BilateralProjectsPanelComponent`.
7. `data-guide="bilateral-project-create-result"`: "+ Create result" CTA button in `BilateralProjectsPanelComponent`.
8. `data-guide="bilateral-tab-results"`: Filter toolbar and results data table in `BilateralResultsListComponent`.
9. `data-guide="bilateral-tab-drafts"`: Project filter and draft cards in `MyDraftResultsComponent`.
10. `data-guide="bilateral-bulk-uploader-cta"`: The bulk upload button in `BilateralPageHeaderComponent`.

### 4.3 Popover Styling via PRMS Tokens
Driver.js injects popovers with class `pr-guide`. The application reuses the global stylesheet rules in `src/styles.scss` (lines 687-825):
- Popover surface: `var(--pr-surface-card)`.
- Border & Radius: `var(--pr-border)` with 12px border-radius.
- Elevation: `0 16px 36px rgba(25, 21, 36, 0.16)`.
- Typography: Headings in `var(--pr-text-heading)`, body in `var(--pr-text-secondary)`.
- Buttons: Primary `Next`/`Got it` in `var(--pr-color-primary-500)`, secondary `Back` with outline border, close button in `var(--pr-text-subtle)`.
- Backdrop & Stage: Stage padding 6px, stage radius 10px, overlay color `#1e202f` with opacity 0.65.

---

## 5. Design Decisions (ADRs)

### BGT-DD-1: Dedicated `BilateralTourService` vs Shared Tour Refactor
- **Context**: Science Programs has `ReportingGuideService`, which hosts `startSpTour()` alongside older reporting tutorials. Bilateral needs an equivalent walkthrough for its 4 tabs.
- **Decision**: Implement a dedicated `BilateralTourService` in `src/app/pages/bilateral/services/bilateral-tour.service.ts`.
- **Alternatives Considered**:
  - *Extract universal tour service into `shared/services/`*: Rejected because Science Programs and Bilateral have completely different route parameters (`/dashboard-lab/:id` vs `/bilateral/:center/:tab`), distinct lifecycle hooks, and separate tab paradigms. Refactoring `ReportingGuideService` introduces unacceptable regression risk to Science Programs.
- **Consequences**: Minor duplication of Driver.js setup boilerplate (~60 lines) in exchange for zero cross-module coupling, high cohesion, and independent testability.

### BGT-DD-2: Route-Synchronized Step Transitions via Router & Microtask Buffer
- **Context**: The 4 Bilateral tabs are distinct route components (`/overview`, `/home`, `/results`, `/drafts`). Spotlighting an element on a different tab requires changing routes.
- **Decision**: In `onNextClick` and `onPrevClick`, compare current step tab with target step tab. If different, trigger Angular `router.navigate(['/bilateral', center, tab], { queryParams })`, await completion, and defer `driver.drive(targetIndex)` with a 100ms microtask buffer to allow the DOM to mount.
- **Alternatives Considered**:
  - *Restricting the tour only to whichever tab is currently loaded*: Rejected because it prevents users from discovering how the 4 tabs form an end-to-end reporting lifecycle.
- **Consequences**: Seamless multi-tab navigation without page reloads, maintaining active query parameters (e.g. `?phase=`).

### BGT-DD-3: Explicit Trigger & On-Demand Replayability
- **Context**: Unprompted automatic walkthroughs cause annoyance for returning focal points.
- **Decision**: The tour is initiated on-demand by clicking `[🧭 Tour]`. Tour completion is stored in `localStorage`, and the button remains permanently accessible in the header for anytime re-execution.
- **Alternatives Considered**:
  - *Auto-launching the tour on first visit*: Rejected to adhere to PRMS UX principles regarding non-intrusive onboarding.
- **Consequences**: Clean, user-driven guidance without intrusive modal takeovers.

---

## 6. Reversion Challenge (Step 2.3)

| Target of Reversion | Question: What does removing / modifying this break? | Assessment & Safeguard |
|---|---|---|
| None | Does adding the Tour button displace or alter existing header actions? | **No.** The button is purely additive. It sits to the left of `Bulk Results Uploader` with matching dimensions and padding. Existing event handlers, accessibility attributes, and test IDs remain unmodified. |

---

## 7. Budget Sizing & Execution Plan (Step 2.4)

| Metric | Estimated Target |
|---|---|
| **Expected Tasks** | **3 tasks** (`BGT-T-1`, `BGT-T-2`, `BGT-T-3`) |
| **Expected LOC** | **~220 lines** (service logic + template anchors + tests) |
| **Expected Review Rounds** | **1 round** |
| **Depth Evaluation** | `Standard` depth chosen matches 3 tasks and ~220 LOC. |

### Task Breakdown Preview
- **Task 1 (`BGT-T-1`)**: Create `BilateralTourService` with Driver.js orchestration, step definitions, tab navigation callbacks, and `localStorage` persistence.
- **Task 2 (`BGT-T-2`)**: Add `[🧭 Tour]` button in `BilateralPageHeaderComponent` with responsive styling and wire click event to `BilateralTourService`.
- **Task 3 (`BGT-T-3`)**: Add `data-guide` telemetry hooks across Overview, Reporting, Results, and AI Drafts templates, and author unit tests.

---

## 8. Next Step

Upon user approval of this design:
```text
Phase 3: tasks.md decomposition
```
