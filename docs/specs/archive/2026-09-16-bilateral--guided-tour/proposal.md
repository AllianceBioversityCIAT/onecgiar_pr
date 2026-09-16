# Proposal: Bilateral Guided Tour (Driver.js)

## 1. Document Control

| Property | Value |
|---|---|
| **Spec Path** | `docs/specs/bilateral/guided-tour` |
| **Type** | Change |
| **Approval Mode** | gated |
| **Slug** | `bilateral-guided-tour` — derived from user request: *"adicionar la funcionalidad de tour en bilaterales para todas las pestañas guiándose por la funcionalidad en SPs"* |
| **Date** | 2026-09-16 |
| **Author** | Antigravity (T1 Architect) |
| **Reference Spec** | `docs/specs/changes/sp-guided-tour-driverjs/` |
| **Kaizen Reference** | `docs/specs/kaizen/changes--sp-guided-tour-driverjs.md` |

---

## 2. Intent

Provide an interactive, multi-step walkthrough across the Bilateral Center workspace using the existing `driver.js` infrastructure. The tour will onboard users (Center Planners, Bilateral Result Focal Points, and Reviewers) across all 4 Bilateral tabs (`Overview`, `Reporting`, `Results`, `AI Draft Results`) and the top-level actions, ensuring feature parity with the Science Programs (SP) tour pattern deployed in `changes/sp-guided-tour-driverjs`.

---

## 3. Problem / Current Behavior

- The Science Programs workspace (`/dashboard-lab/:id`) includes a top-right **[🧭 Tour]** trigger button and a 6-step guided walkthrough built with `driver.js` that explains the program band, tabs, burndown, catalog, and results views.
- The Bilateral workspace (`/bilateral/:center`) currently lacks any guided tour or onboarding mechanism.
- Users navigating Bilateral Centers must independently discover where project summaries live (`Overview`), where projects can be searched and results created (`Reporting`), where existing results can be filtered and managed (`Results`), and where AI-extracted drafts can be reviewed (`AI Draft Results`).
- There is no discoverable guidance explaining what the `Bulk Results Uploader` does or how to access it.

---

## 4. Proposed Outcome

1. Add a **[🧭 Tour]** trigger button in the top-right action band of the Bilateral header (`BilateralPageHeaderComponent`), positioned immediately to the left of the `Bulk Results Uploader` button.
2. The button styling strictly matches the SP Tour button:
   - Icon: `<span class="material-icons-round">explore</span>`
   - Label: `Tour` (collapsing gracefully on small mobile viewports)
   - PRMS token styling: card surface, border, primary hover accents, subtle shadow.
3. Clicking **[🧭 Tour]** initiates a step-by-step Driver.js popover tour covering:
   - **Step 1 — Center Identity & Controls**: Center Acronym, Full Name, Reporting Year, and Cycle Info.
   - **Step 2 — Navigation Tabs**: The 4 primary views (`Overview`, `Reporting`, `Results`, `AI Draft Results`).
   - **Step 3 — Overview Tab**: High-level reporting burndown, KPIs, and progress charts.
   - **Step 4 — Reporting Tab**: Project catalog, quick search, and "Create result" entry point.
   - **Step 5 — Results Tab**: Results data table, status filters, column picker, and row actions.
   - **Step 6 — AI Draft Results Tab**: AI draft result cards, project filtering, and "Review" / "Create Result" flows.
   - **Step 7 — Bulk Results Uploader**: Batch submission external tool handoff.
4. Auto-navigation between tabs: As the user advances (`Next` / `Previous`), the tour automatically navigates to the corresponding tab route (e.g. `/bilateral/:center/reporting`, `/bilateral/:center/results`, `/bilateral/:center/drafts`) if not already active.
5. Tour completion state is tracked in `localStorage` per user/center to avoid unwanted auto-popping, but remains on-demand replayable via the header button at any time.

---

## 5. Scope

### In Scope
- **Frontend Client (`onecgiar-pr-client`)**:
  - `BilateralPageHeaderComponent`: Add `[🧭 Tour]` button with `data-guide="bilateral-tour-trigger"` and responsive behavior.
  - `BilateralTourService`: New standalone service under `src/app/pages/bilateral/services/bilateral-tour.service.ts` encapsulating Driver.js tour configuration, tab transitions, step definitions, and completion persistence.
  - Data attributes (`data-guide="..."`) on target elements across Bilateral templates:
    - Header: `bilateral-identity`, `bilateral-tabs`, `bilateral-bulk-uploader-cta`, `bilateral-tour-trigger`
    - Overview: `bilateral-overview-container`
    - Reporting: `bilateral-reporting-container`
    - Results: `bilateral-results-container`
    - AI Draft Results: `bilateral-drafts-container`
  - Zero new CSS: Reuses established `.driver-popover.pr-guide` global styles in `src/styles.scss`.
  - Comprehensive unit tests for `BilateralTourService` and updated `BilateralPageHeaderComponent` tests.

### Out of Scope / Non-Goals
- Backend modifications (`onecgiar-pr-server`): No server endpoints, tables, or migrations required.
- Altering core tab functionality or table logic in Bilateral.
- Custom graphic illustrations inside popovers (standard Driver.js typography, title, and body matching SP tour).

---

## 6. Affected Users, Systems, And Specs

| Entity | Role / Impact |
|---|---|
| **Center Focal Points / Planners** | Primary beneficiaries; guided onboarding on how Bilateral reporting works |
| **Bilateral Reviewers / PMU** | Faster navigation between project catalog, submitted results, and AI drafts |
| **Existing Specs** | `docs/specs/changes/sp-guided-tour-driverjs/` (reference pattern) |
| **Modules Touched** | `onecgiar-pr-client/src/app/pages/bilateral/` |

---

## 7. Visual Reference

- **Target Header UI**: `docs/specs/bilateral/guided-tour/visual-reference/bilaterals-target-header.png`
  - Shows Bilateral Center header with Center Title ("CIAT - International Center for Tropical Agriculture"), tabs (`Overview`, `Reporting`, `Results`, `AI Draft Results`), and top-right `Bulk Results Uploader` button.
- **Reference SP UI**: `docs/specs/bilateral/guided-tour/visual-reference/sp-tour-reference.png`
  - Shows Science Program header with the exact `[🧭 Tour]` button styling, placement, and tokens.

---

## 8. Requirement Delta Preview

### ADDED Requirements
- **BGT-R-1**: Top-right tour trigger button in `BilateralPageHeaderComponent` next to `Bulk Results Uploader`.
- **BGT-R-2**: Dedicated `BilateralTourService` implementing Driver.js 1.3.1 with 7 canonical steps.
- **BGT-R-3**: Automated tab navigation during tour step progression (`Next`/`Prev`) with microtask delay for element availability.
- **BGT-R-4**: Persistent completion tracking via `localStorage` with on-demand restart capability.
- **BGT-R-5**: Data-guide target attributes across all 4 tab view root containers and header elements.

### MODIFIED Requirements
- None (pure additive feature).

### REMOVED Requirements
- None.

---

## 9. Approach Options

### Option A: Dedicated `BilateralTourService` (Recommended)
- Create `src/app/pages/bilateral/services/bilateral-tour.service.ts` directly mirroring `ReportingGuideService` from Science Programs.
- **Pros**:
  - Clean separation of concerns; zero coupling between Science Programs and Bilateral modules.
  - Allows tab navigation specific to Bilateral routing structure (`/bilateral/:center/:tab`).
  - Follows established PRMS modular architecture.
- **Cons**:
  - Minor duplication of Driver.js boilerplate config (~60 lines of configuration).

### Option B: Shared Universal Tour Service
- Refactor `ReportingGuideService` into a shared `SharedTourService` in `src/app/shared/services/`.
- **Pros**:
  - Consolidates Driver.js instance management.
- **Cons**:
  - Higher regression risk for existing Science Programs tour.
  - Science Programs and Bilateral have disparate route parameters, tab paradigms, and async loading cycles.
  - Violates the "make the smallest safe change" principle.

---

## 10. Recommended Approach

**Option A (Dedicated `BilateralTourService`)**.
It preserves existing module boundaries, introduces zero regression risk to the SP tour, allows custom navigation logic tailored to the 4 Bilateral tabs, and reuses 100% of the existing global `.driver-popover.pr-guide` CSS rules.

---

## 11. Risks, Dependencies, And Open Questions

| Item | Type | Mitigation |
|---|---|---|
| Tab elements not mounted when switching tabs | Risk | Use Angular `Router.navigate` inside Driver.js `onNextClick`/`onPrevClick` and delay step highlight by 100-150ms using `setTimeout` or `requestAnimationFrame` until target selector mounts. |
| Viewport overflow on small screens | Risk | Driver.js automatically clamps popover positions; button label collapses to icon on mobile. |
| Global styles compatibility | Risk | Verified in `src/styles.scss` (lines 687-825) that `.driver-popover.pr-guide` classes are globally scoped and ready. |

---

## 12. Success Criteria

1. [🧭 Tour] button is clearly visible in the Bilateral header on all 4 tabs.
2. Clicking the Tour button starts the Driver.js tour immediately.
3. Advancing through the tour seamlessly switches between Overview, Reporting, Results, and AI Drafts tabs.
4. Closing or completing the tour marks it as seen in `localStorage`.
5. Clicking the Tour button again re-runs the tour at any time.
6. 100% unit test coverage for `BilateralTourService` and updated header component tests.
7. `npx ng lint` and `npx jest` run green with 0 regressions.

---

## 13. Next Step

To proceed with detailed requirements, step-by-step UX flows, and task decomposition:

```text
/akili-specify bilateral/guided-tour
```
