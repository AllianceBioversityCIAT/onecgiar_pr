# Module Tasks: Bilateral Center Guided Tour via Driver.js — `tasks.md`

## 1. Scope of this Task List

- **Module / Feature:** `bilateral` (`guided-tour`)
- **Linked Spec:**
  - `docs/specs/bilateral/guided-tour/requirements.md`
  - `docs/specs/bilateral/guided-tour/design.md`
- **Owner:** Frontend Team
- **Status:** shipped
- **Budget Tracking:** 3 Tasks | ~220 LOC | 1 Review Round

---

## 2. Pre-Flight Checklist

- [x] `requirements.md` approved (`BGT-R-1` through `BGT-R-6`, `BGT-AC-1` through `BGT-AC-8`).
- [x] `design.md` approved (`BGT-DD-1` through `BGT-DD-3`).
- [x] Open questions resolved (`BGT-OQ-1`: Step 7 highlights Bulk Uploader CTA in header without forcing tab switch).
- [x] Dependency confirmed (`driver.js` v1.3.1 already installed in `onecgiar-pr-client/package.json`).
- [x] Global styling `.driver-popover.pr-guide` verified in `src/styles.scss` (lines 687-825).
- [x] No backend migrations or schema changes required.

---

## 3. Task List

### `BGT-T-1` — Dedicated `BilateralTourService` & Cross-Tab Navigation Pipeline [x]
- **Type:** `client`
- **Description:** Implement `BilateralTourService` in `src/app/pages/bilateral/services/bilateral-tour.service.ts`. Define the 7 canonical tour steps, configure Driver.js options (`popoverClass: 'pr-guide'`, `stagePadding: 6`, `overlayOpacity: 0.65`, `allowClose: true`), implement reactive route-switching hooks (`onNextClick`, `onPrevClick`) that navigate the Angular Router across tabs (`/overview`, `/home`, `/results`, `/drafts`) preserving active query parameters (`?phase=`) and delaying step spotlighting via a 100ms microtask buffer, and persist completion status in `localStorage` (`pr.tour.bilateral.completed`).
- **Implements:** `BGT-R-2`, `BGT-R-3`, `BGT-R-4`, `BGT-R-5`, `BGT-R-6`, `BGT-AC-2`, `BGT-AC-3`, `BGT-AC-4`, `BGT-AC-5`, `BGT-AC-6`, `BGT-AC-7`, `BGT-AC-8`, Defect Gates D2, D3
- **Design Reference:** `design.md` §2.2, §3, §5 (`BGT-DD-1`, `BGT-DD-2`)
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/bilateral/services/bilateral-tour.service.ts`
  - `onecgiar-pr-client/src/app/pages/bilateral/services/bilateral-tour.service.spec.ts`
- **Depends on:** `—`
- **Blocks:** `BGT-T-2`, `BGT-T-3`
- **Estimate:** `M` (≤ 1d)
- **Skills:** `angular-developer`, `error-handling-patterns`
- **Definition of Done:**
  - [x] `BilateralTourService` created with `startBilateralTour(options)` and `isBilateralTourCompleted()`, `resetBilateralTourState()`.
  - [x] 7 canonical steps configured: Center Identity, Tabs Strip, Overview Hub, Reporting Hub, Results Hub, AI Drafts Hub, Bulk Results Uploader.
  - [x] `onNextClick` / `onPrevClick` hooks intercept tab changes, navigate via `Router.navigate(['/bilateral', centerAcronym, targetRoute])`, preserve query params, and invoke `driver.drive(targetIndex)` after ~100ms microtask buffer.
  - [x] `onDestroyed` cleans up the Driver instance and saves `'true'` to `localStorage.setItem('pr.tour.bilateral.completed', 'true')`.
  - [x] Keyboard controls (`Escape`, `ArrowRight`, `ArrowLeft`, `Enter`) active and tested.
  - [x] Comprehensive unit tests in `bilateral-tour.service.spec.ts` pass: `npx jest src/app/pages/bilateral/services/bilateral-tour.service.spec.ts --silent --reporters=summary`.
  - [x] Lint passes clean: `npx ng lint --lint-file-patterns="src/app/pages/bilateral/services/bilateral-tour.service.ts"`.

---

### `BGT-T-2` — Header UI Integration (`[🧭 Tour]` Button) & Responsive Action Placement [x]
- **Type:** `client`
- **Description:** Add the `[🧭 Tour]` button in `BilateralPageHeaderComponent` inside the top-right header actions container, positioned immediately to the left of the `Bulk Results Uploader` button. Connect its click event to `bilateralTourService.startBilateralTour(...)`. Style the button with PRMS card surface, subtle border, primary hover accents, and responsive label collapsing (`Tour` hidden on `< 640px` viewports while retaining `aria-label="Start guided tour"`).
- **Implements:** `BGT-R-1`, `BGT-AC-1`, Defect Gate D4
- **Design Reference:** `design.md` §4.1, §5 (`BGT-DD-3`)
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/bilateral/components/bilateral-page-header/bilateral-page-header.component.html`
  - `onecgiar-pr-client/src/app/pages/bilateral/components/bilateral-page-header/bilateral-page-header.component.ts`
  - `onecgiar-pr-client/src/app/pages/bilateral/components/bilateral-page-header/bilateral-page-header.component.spec.ts`
- **Depends on:** `BGT-T-1`
- **Blocks:** `BGT-T-3`
- **Estimate:** `S` (≤ 0.5d)
- **Skills:** `angular-developer`, `ui-ux-pro-max`
- **Definition of Done:**
  - [x] `[🧭 Tour]` button rendered with `data-guide="bilateral-tour-trigger"` to the left of `Bulk Results Uploader`.
  - [x] Only renders when `activeTab()` is not null and `showBulkCta()` is true.
  - [x] Responsive behavior: label collapses on `< 640px` while icon and accessible name remain.
  - [x] Clicking button dispatches `startBilateralTour` passing center acronym, title, and current active tab.
  - [x] Unit tests in `bilateral-page-header.component.spec.ts` assert button presence, attributes, and click dispatch.
  - [x] Lint passes clean: `npx ng lint --lint-file-patterns="src/app/pages/bilateral/components/bilateral-page-header/**/*"`.

---

### `BGT-T-3` — Telemetry Instrumentation (`data-guide`) across Views & Verification [x]
- **Type:** `client | tests`
- **Description:** Attach `data-guide` telemetry attributes across Bilateral templates to anchor Driver.js spotlighting: `bilateral-identity`, `bilateral-tabs`, `bilateral-bulk-uploader-cta` in header; `bilateral-tab-overview` in Overview component; `bilateral-tab-reporting` in Projects Panel component; `bilateral-tab-results` in Results List component; and `bilateral-tab-drafts` in My Draft Results component. Author unit test assertions ensuring all 7 selectors exist and run full test suites.
- **Implements:** `BGT-R-2`, `BGT-AC-2` through `BGT-AC-8`, Defect Gates D1, D2, D3, D4
- **Design Reference:** `design.md` §4.2, §7
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/bilateral/components/bilateral-page-header/bilateral-page-header.component.html`
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-overview/bilateral-overview.component.html`
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-home/components/bilateral-projects-panel/bilateral-projects-panel.component.html`
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-results-list/bilateral-results-list.component.html`
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/my-draft-results/my-draft-results.component.html`
- **Depends on:** `BGT-T-2`
- **Blocks:** None
- **Estimate:** `S` (≤ 0.5d)
- **Skills:** `angular-developer`
- **Definition of Done:**
  - [x] All 7 `data-guide` selectors placed cleanly without affecting visual layout or styles.
  - [x] Verified each selector matches Driver.js step configuration in `BilateralTourService`.
  - [x] Full bilateral test suite runs green: `npx jest src/app/pages/bilateral/ --silent --reporters=summary`.
  - [x] Full lint passes: `npx ng lint --lint-file-patterns="src/app/pages/bilateral/**/*.ts" --lint-file-patterns="src/app/pages/bilateral/**/*.html"`.

---

## 4. Dependency Graph

```text
BGT-T-1 (BilateralTourService & Tab Navigation Pipeline)
     └── BGT-T-2 (Header [Tour] Button & Click Dispatch)
           └── BGT-T-3 (data-guide Telemetry Hooks & Full Verification)
```

---

## 5. Traceability Matrix

| Requirement / Scenario | Covered by Task(s) | Verified by Test / Check |
|---|---|---|
| `BGT-R-1` (Header Tour Trigger Button) | `BGT-T-2` | `bilateral-page-header.component.spec.ts` |
| `BGT-R-2` (Sequential 10-Stop Tour) | `BGT-T-1`, `BGT-T-3` | `bilateral-tour.service.spec.ts` |
| `BGT-R-3` (Cross-Tab Route Synchronization) | `BGT-T-1` | `bilateral-tour.service.spec.ts` |
| `BGT-R-4` (State Persistence & Replayability) | `BGT-T-1` | `bilateral-tour.service.spec.ts` |
| `BGT-R-5` (Keyboard Navigation & Dismissal) | `BGT-T-1` | `bilateral-tour.service.spec.ts` |
| `BGT-R-6` (Design Token Conformance) | `BGT-T-1`, `BGT-T-2` | Visual inspection & SCSS token reuse |
| `BGT-AC-1` (Tour Trigger in Header) | `BGT-T-2` | `bilateral-page-header.component.spec.ts` |
| `BGT-AC-2` (Step 1 Spotlight Identity) | `BGT-T-1`, `BGT-T-3` | `bilateral-tour.service.spec.ts` |
| `BGT-AC-3` (Step 1 to Step 2 Tabs Strip) | `BGT-T-1`, `BGT-T-3` | `bilateral-tour.service.spec.ts` |
| `BGT-AC-4` (Step 2 to Step 3 Overview) | `BGT-T-1`, `BGT-T-3` | `bilateral-tour.service.spec.ts` |
| `BGT-AC-5` (Step 3 to Step 4 Reporting Toolbar) | `BGT-T-1`, `BGT-T-3` | `bilateral-tour.service.spec.ts` |
| `BGT-AC-6` (Step 4 to Step 5 Reporting KPIs) | `BGT-T-1`, `BGT-T-3` | `bilateral-tour.service.spec.ts` |
| `BGT-AC-7` (Step 5 to Step 6 Project Catalog) | `BGT-T-1`, `BGT-T-3` | `bilateral-tour.service.spec.ts` |
| `BGT-AC-8` (Step 6 to Step 7 Create Result CTA) | `BGT-T-1`, `BGT-T-3` | `bilateral-tour.service.spec.ts` |
| `BGT-AC-9` (Step 7 to Step 8 Results Registry) | `BGT-T-1`, `BGT-T-3` | `bilateral-tour.service.spec.ts` |
| `BGT-AC-10` (Step 8 to Step 9 AI Drafts) | `BGT-T-1`, `BGT-T-3` | `bilateral-tour.service.spec.ts` |
| `BGT-AC-11` (Step 9 to Step 10 Bulk CTA) | `BGT-T-1`, `BGT-T-3` | `bilateral-tour.service.spec.ts` |
| `BGT-AC-12` (Tour Completion & Cleanup) | `BGT-T-1` | `bilateral-tour.service.spec.ts` |
| Gate D1 (Missing DOM Hook) | `BGT-T-3` | Component template assertions |
| Gate D2 (Route Desync Race Condition) | `BGT-T-1` | Async Router unit tests |
| Gate D3 (Overlay / Keyboard Lockup) | `BGT-T-1` | Unit test `allowClose: true` & destroy |
| Gate D4 (Visual Misalignment / Token Drift) | `BGT-T-2` | HITL visual inspection |

---

## 6. Next Step

The specification set (`requirements.md`, `design.md`, `tasks.md`) is complete and ready for execution.

```text
/akili-execute bilateral/guided-tour
```
