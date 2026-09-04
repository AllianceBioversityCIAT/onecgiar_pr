# Module Tasks: SP Guided Tour via Driver.js — `tasks.md`

## 1. Scope of this Task List

- **Module / Feature:** `results` / `dashboard-lab` (`sp-guided-tour-driverjs`)
- **Linked Spec:**
  - `docs/specs/changes/sp-guided-tour-driverjs/requirements.md`
  - `docs/specs/changes/sp-guided-tour-driverjs/design.md`
- **Owner:** Frontend Team
- **Status:** ready-for-execution
- **Budget Tracking:** 3 Tasks | ~240 LOC | 1 Review Round

---

## 2. Pre-Flight Checklist

- [x] `requirements.md` approved (`SPTOUR-R-1` through `SPTOUR-R-8`).
- [x] `design.md` approved (`SPTOUR-DD-1` through `SPTOUR-DD-3`).
- [x] Open questions resolved (button placement confirmed in `ReportingProgramBandComponent`).
- [x] Dependency confirmed (`driver.js` v1.3.1 already installed in `onecgiar-pr-client/package.json`).
- [x] No backend migrations or schema changes required.

---

## 3. Task List

### `SPTOUR-T-1` — Tour Service Orchestration & Multi-Tab Transition Pipeline [x]
- **Type:** `client`
- **Description:** Implement `startSpTour()` in `ReportingGuideService`. Define the 6 sequential tour steps, configure Driver.js options (popover class, backdrop opacity, keyboard shortcuts), implement tab-switching hooks (`onNextClick`, `onPrevClick`) that trigger view changes and await DOM rendering, and persist completion status in `localStorage` (`pr.tour.sp.completed`).
- **Implements:** `SPTOUR-R-2`, `SPTOUR-R-3`, `SPTOUR-R-4`, `SPTOUR-R-5`, `SPTOUR-R-6`, `SPTOUR-AC-2`, `SPTOUR-AC-3`
- **Design Reference:** `design.md` §2, §3, §5 (`SPTOUR-DD-1`, `SPTOUR-DD-2`)
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/services/reporting-guide.service.ts`
- **Depends on:** `—`
- **Blocks:** `SPTOUR-T-2`, `SPTOUR-T-3`
- **Estimate:** `M` (≤ 1d)
- **Skills:** `angular-developer`, `error-handling-patterns`
- **Definition of Done:**
  - [ ] `startSpTour(callbacks: { onTabNavigate: (tab: string) => void })` method created in `ReportingGuideService`.
  - [ ] 6 canonical steps configured: SP Identity, Tab Strip, Overview, Reporting, Results, Actions Toolbar.
  - [ ] `onNextClick` / `onPrevClick` hooks intercept tab changes, invoke navigation callback, and proceed when DOM is ready.
  - [ ] `onDestroyed` cleans up driver instance and writes `'true'` to `localStorage.getItem('pr.tour.sp.completed')`.
  - [ ] Keyboard controls (`Escape`, `ArrowRight`, `ArrowLeft`, `Enter`) active.
  - [ ] Lint passes clean (`npx ng lint`).

---

### `SPTOUR-T-2` — UI Launcher Button & PRMS Design Token Styling [x]
- **Type:** `client`
- **Description:** Add the `[Tour 💡]` launcher button in `ReportingProgramBandComponent` adjacent to the program info action. Connect its click event to `guideSE.startSpTour()`. Style the Driver.js popovers, buttons, progress badges, and backdrop in global stylesheet using PRMS design tokens (`--pr-surface-card`, `--pr-border-card`, `--pr-color-primary-500`, `--pr-text-heading`).
- **Implements:** `SPTOUR-R-1`, `SPTOUR-R-7`, `SPTOUR-R-8`, `SPTOUR-AC-1`
- **Design Reference:** `design.md` §4.1, §4.3 (`SPTOUR-DD-3`)
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-program-band/reporting-program-band.component.html`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-program-band/reporting-program-band.component.ts`
  - `onecgiar-pr-client/src/styles.scss` (or dedicated `driver-theme.scss`)
- **Depends on:** `SPTOUR-T-1`
- **Blocks:** `SPTOUR-T-3`
- **Estimate:** `S` (≤ 0.5d)
- **Skills:** `angular-developer`, `tailwind-design-system`, `ui-ux-pro-max`
- **Definition of Done:**
  - [ ] Launcher button rendered in `reporting-program-band.component.html` with icon and accessible `aria-label`.
  - [ ] Clicking button dispatches `startSpTour` with proper tab switching navigation callback.
  - [ ] Popovers styled with rounded borders (12px), PRMS card surface, elevated shadow, and primary action buttons.
  - [ ] Responsive safety: popovers remain fully legible on 768px-1024px viewports without horizontal scroll clipping.
  - [ ] Lint passes clean.

---

### `SPTOUR-T-3` — Telemetry Guide Selectors & Automated Test Suite [x]
- **Type:** `client | tests`
- **Description:** Attach `data-guide` attributes (`data-guide="sp-identity"`, `data-guide="sp-tabs"`, `data-guide="tab-overview-view"`, `data-guide="tab-reporting-view"`, `data-guide="tab-results-view"`, `data-guide="sp-actions-toolbar"`) across the SP dashboard views. Author unit tests covering `startSpTour` step configuration, tab-switch interception, storage persistence, and launcher button binding.
- **Implements:** `SPTOUR-R-2`, `SPTOUR-R-3`, `SPTOUR-R-4`, `SPTOUR-R-5`, all Scenarios
- **Design Reference:** `design.md` §2.2, §4.2, §7
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-program-band/reporting-program-band.component.html`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/dashboard-lab.component.html`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/services/reporting-guide.service.spec.ts`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-program-band/reporting-program-band.component.spec.ts`
- **Depends on:** `SPTOUR-T-2`
- **Blocks:** None
- **Estimate:** `S` (≤ 0.5d)
- **Skills:** `angular-developer`, `tdd`
- **Definition of Done:**
  - [x] All 6 `data-guide` selectors placed cleanly without altering layout or styling.
  - [x] Unit tests in `reporting-guide.service.spec.ts` verify `startSpTour` creates a driver with 6 steps and proper options.
  - [x] Unit tests verify `onDestroyed` sets `localStorage.getItem('pr.tour.sp.completed')`.
  - [x] Unit tests in `reporting-program-band.component.spec.ts` verify launcher button is rendered and calls service on click.
  - [x] 100% tests pass: `npx jest --testPathPattern="reporting-guide|reporting-program-band"`.

---

## 4. Dependency Graph

```text
SPTOUR-T-1 (Service & Tab-Switching Pipeline)
     └── SPTOUR-T-2 (Launcher Button & Popover Design Tokens)
           └── SPTOUR-T-3 (data-guide Selectors & Unit Tests)
```

---

## 5. Traceability Matrix

| Requirement / Scenario | Covered by Task(s) | Verified by Test |
|---|---|---|
| `SPTOUR-R-1` (Trigger Button) | `SPTOUR-T-2` | `ReportingProgramBandComponent` spec |
| `SPTOUR-R-2` (Core 6 Steps) | `SPTOUR-T-1`, `SPTOUR-T-3` | `ReportingGuideService` spec |
| `SPTOUR-R-3` (Tab Synchronization) | `SPTOUR-T-1`, `SPTOUR-T-3` | `ReportingGuideService` spec |
| `SPTOUR-R-4` (Dismissal / Close) | `SPTOUR-T-1` | `ReportingGuideService` spec |
| `SPTOUR-R-5` (State Persistence) | `SPTOUR-T-1`, `SPTOUR-T-3` | `ReportingGuideService` spec |
| `SPTOUR-R-6` (Keyboard Controls) | `SPTOUR-T-1` | `ReportingGuideService` spec |
| `SPTOUR-R-7` (Non-Intrusive) | `SPTOUR-T-2` | Manual / visual inspection |
| `SPTOUR-R-8` (Responsive Safety) | `SPTOUR-T-2` | Manual / viewport check |
| Scenario 1 (Full Walkthrough) | `SPTOUR-T-1`, `SPTOUR-T-2`, `SPTOUR-T-3` | Integration tests |
| Scenario 2 (Escape / Cancel) | `SPTOUR-T-1` | Unit test |
| Scenario 3 (Persistent State) | `SPTOUR-T-1`, `SPTOUR-T-3` | Unit test |

---

## 6. Next Step

Upon user approval of this task breakdown:
```text
/akili-execute changes/sp-guided-tour-driverjs
```
