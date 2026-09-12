# Tasks — Platform onboarding tours

## 1. Scope of this task list

- **Module / feature:** Platform onboarding tours (sidebar · Results Center · Where to report)
- **Linked spec:** `requirements.md` + `design.md`
- **Status:** done
- **Owner:** Implementer (client)

## 2. Pre-flight checklist

- [ ] `requirements.md` approved
- [ ] `design.md` approved
- [ ] Open questions OQ-1..OQ-4 accepted or resolved
- [ ] No conflicting in-flight spec on `ReportingGuideService` / RC guide modal
- [ ] Shipped `results-center-reporting-guide` on branch (WTR modal host exists)

## 3. Task list

### POT-T-1 — Platform tour copy module and step builders

- **Type:** client
- **Description:** Create `platform/platform-tour-copy.ts`, `platform-tour.types.ts`, and `platform-tour.steps.ts` with storage key constants, `platformLocationBadgeHtml()`, and the three `build*TourSteps()` pure functions. Copy MUST match `requirements.md` §6.1 exactly.
- **Implements:** POT-R-5, POT-R-6 (badge), POT-R-1..R-3 (step structure), POT-R-4 (keys)
- **Design refs:** POT-DD-2, POT-DD-4, Extended Directory Structure
- **Files (expected):** `.../dashboard-lab/services/platform/*`
- **Depends on:** —
- **Blocks:** POT-T-2
- **Estimate:** M
- **Skills:** `angular-developer`
- **Definition of done:**
  - [ ] All §6.1 strings exported and referenced by step builders
  - [ ] Conditional steps omitted when context flags false (mirror SP tour tests pattern)
  - [ ] Unit tests for step counts/selectors per context combination
- **Verification:**
  - **Pass:** `cd onecgiar-pr-client && npm run test -- --testPathPattern="platform-tour.steps" --no-coverage` — tests assert element selectors and copy snippets for: sidebar (full / no other programs / no centers), RC (update enabled/disabled), WTR (guide-only / pick-program / no emerging)
  - **Disqualifier:** If tests only check array length without asserting `[data-guide="…"]` strings, evidence is invalid
  - **Fail input:** Change a copy string in §6.1 without updating module — test MUST fail

---

### POT-T-2 — `ReportingGuideService` platform tour methods

- **Type:** client
- **Description:** Add `startSidebarTour`, `startResultsCenterTour`, `startWhereToReportTour`, `isPlatformTourCompleted`, and `createPlatformDriver` with config from POT-DD-3 (reduced motion). Sidebar tour auto-expands via injected sidebar API before drive.
- **Implements:** POT-R-1 (expand), POT-R-4, POT-R-6, POT-R-7 (driver config), POT-NFR-3, POT-NFR-4
- **Design refs:** POT-DD-1, POT-DD-3, POT-DD-6, Architecture flow
- **Files (expected):** `reporting-guide.service.ts`, `reporting-guide.service.spec.ts`
- **Depends on:** POT-T-1
- **Blocks:** POT-T-3, POT-T-4, POT-T-5
- **Estimate:** M
- **Skills:** `angular-developer`
- **Definition of done:**
  - [ ] Each start method destroys prior instance and calls `drive(0)`
  - [ ] Storage keys set on destroy
  - [ ] SP tour tests unchanged and green
- **Verification:**
  - **Pass:** `npm run test -- --testPathPattern="reporting-guide.service.spec" --no-coverage` — new describes for platform tours; existing SP tour + sidebar hint describes unchanged green
  - **Disqualifier:** If SP tour tests were modified to share storage keys with platform tours, fail review
  - **Fail input:** Mock `localStorage.setItem` and complete sidebar tour — RC key must stay unset

---

### POT-T-3 — Sidebar Tour launcher and anchors

- **Type:** client
- **Description:** Add EXTRAS **Tour** button and `data-guide` anchors on sidebar header, program groups, Platform wrapper, Results Center link, centers block. Wire button to `startSidebarTour()` with live context from component state.
- **Implements:** POT-R-1 scenarios (expanded + collapsed auto-expand), POT-R-20, POT-R-6 anchors
- **Design refs:** Anchors table, Tour launcher pattern
- **Files (expected):** `reporting-nav-sidebar.component.{html,ts}`, `reporting-nav-sidebar.component.spec.ts`
- **Depends on:** POT-T-2
- **Blocks:** POT-T-6
- **Estimate:** M
- **Skills:** `angular-developer`, `ui-ux-pro-max`
- **Definition of done:**
  - [ ] Tour button in EXTRAS with SP-matching outline chrome
  - [ ] All sidebar anchors present in DOM when sections visible
  - [ ] Click invokes service with correct context flags
- **Verification:**
  - **Pass:** `npm run test -- --testPathPattern="reporting-nav-sidebar.component.spec" --no-coverage` — tests for Tour button presence, `startSidebarTour` call, anchor attributes
  - **Disqualifier:** Presence-only test without click → service invocation is insufficient for launcher wiring
  - **Fail input:** Remove `(click)` handler — test MUST fail
  - **Gap (POT-R-6 spotlight):** jsdom cannot prove spotlight visibility — record HITL check at 1440px expanded sidebar

---

### POT-T-4 — Results Center Tour launcher and anchors

- **Type:** client
- **Description:** Add outline **Tour** button to RC hero (before or beside Where to report per design), anchors on hero, WTR CTA, filters host, export, table, update button. Wire to `startResultsCenterTour({ canUpdateResult })`.
- **Implements:** POT-R-2 scenarios, POT-R-20, POT-R-7 (mobile placement — structural)
- **Design refs:** RC anchors, Tour launcher
- **Files (expected):** `results-list.component.{html,ts}`, `results-list.component.spec.ts`
- **Depends on:** POT-T-2
- **Blocks:** POT-T-6
- **Estimate:** M
- **Skills:** `angular-developer`, `ui-ux-pro-max`
- **Definition of done:**
  - [ ] Tour button visible in hero actions cluster
  - [ ] Update step omitted when `activeButtons` false (tested via spec)
- **Verification:**
  - **Pass:** `npm run test -- --testPathPattern="results-list.component.spec" --no-coverage` — Tour CTA + service call + anchor smoke
  - **Disqualifier:** Testing only hero innerText without service mock proves nothing about tour start
  - **Fail input:** Set `activeButtons` false — step builder spec must show 5 not 6 steps
  - **Gap (POT-R-7):** Optional extend `results-list.viewport.spec.ts` for Tour button tap at 375px; popover pixel placement → HITL

---

### POT-T-5 — Where to report modal Tour launcher and anchors

- **Type:** client
- **Description:** Add **Tour** to modal header (compass row), anchors on intro, picker list (single scroll owner), W1/W2 card, W3 card, emerging card. Wire to `startWhereToReportTour` with mode/emerging/loading from `PlatformReportingGuideService`. Defer start until not loading.
- **Implements:** POT-R-3 scenarios, POT-R-21, KZ picker scroll owner
- **Design refs:** WTR anchors, WTR timing
- **Files (expected):** `results-center-reporting-guide.component.{html,ts}`, `results-center-reporting-guide.component.spec.ts`
- **Depends on:** POT-T-2
- **Blocks:** POT-T-6
- **Estimate:** M
- **Skills:** `angular-developer`, `ui-ux-pro-max`
- **Definition of done:**
  - [ ] Tour in header; does not close modal on start
  - [ ] Picker step only in `pick-program` mode
  - [ ] Emerging anchor omitted when AVISA rules hide emerging
- **Verification:**
  - **Pass:** `npm run test -- --testPathPattern="results-center-reporting-guide.component.spec|platform-reporting-guide.service.spec" --no-coverage`
  - **Disqualifier:** If tour starts while `catalogLoading()` true and user sees empty spotlight, fail
  - **Fail input:** `modalMode = 'pick-program'` — step list must include `platform-tour-wtr-picker`
  - **Gap:** Hub mode lane highlight — HITL once if hub DOM differs from guide-only

---

### POT-T-6 — Responsive popover skin and regression sweep

- **Type:** client + tests
- **Description:** Add mobile max-width rule to `.driver-popover.pr-guide` if needed. Run scoped test sweep; document HITL spotlight checklist for execute review.
- **Implements:** POT-R-7, POT-NFR-1, POT-NFR-3, requirements §8 HITL gates
- **Design refs:** POT-DD-5, Responsive SCSS
- **Files (expected):** `src/styles.scss`, `execution.md` (during execute)
- **Depends on:** POT-T-3, POT-T-4, POT-T-5
- **Blocks:** —
- **Estimate:** S
- **Skills:** `angular-developer`, `frontend-design`
- **Definition of done:**
  - [ ] Scoped tests green (combined pattern below)
  - [ ] HITL checklist recorded in `execution.md`: 375px + 1440px, one step per tour, spotlight visible
- **Verification:**
  - **Pass:** `cd onecgiar-pr-client && npm run test -- --testPathPattern="platform-tour.steps|reporting-guide.service.spec|reporting-nav-sidebar.component.spec|results-list.component.spec|results-center-reporting-guide.component.spec" --no-coverage`
  - **Disqualifier:** Full client suite or broad `reporting-guide` pattern matching unrelated specs
  - **Fail input:** Break `startSpTour` step count — must fail in service spec
  - **Gap:** Spotlight/contrast at mobile — human check required; T6 review if available

---

## 4. Scenario → task coverage matrix

| Requirement clause | Task |
|---|---|
| POT-R-1 expanded sidebar scenario | POT-T-3, POT-T-1 |
| POT-R-1 collapsed auto-expand | POT-T-2, POT-T-3 |
| POT-R-2 desktop + update disabled | POT-T-1, POT-T-4 |
| POT-R-3 guide-only + picker | POT-T-1, POT-T-5 |
| POT-R-4 storage independence | POT-T-1, POT-T-2 |
| POT-R-5 copy table | POT-T-1 |
| POT-R-6 spotlight scroll/padding/badge | POT-T-2, POT-T-6 (HITL) |
| POT-R-7 mobile popover | POT-T-2, POT-T-6 |
| POT-R-20 chrome parity | POT-T-3, POT-T-4, POT-T-5 |
| POT-R-21 loading defer | POT-T-5 |
| POT-R-30 SP tour unchanged | POT-T-2, POT-T-6 |
| POT-R-31 hint key separate | POT-T-2 |

## 5. PR strategy

**Single PR** (~420–480 LOC) recommended: all tasks are one feature slice and share the step module + service.

If review latency is high, optional split:

1. **PR1:** POT-T-1 + POT-T-2 (service + steps, no UI)
2. **PR2:** POT-T-3..T-6 (launchers + styles + tests)

Chained PR descriptions should state: review step module contracts first in PR1; PR2 is wiring-only.

## 6. Estimated LOC

| Area | LOC |
|---|---|
| platform/ module + tests | ~180 |
| service extension + tests | ~120 |
| sidebar + RC + WTR wiring + tests | ~180 |
| styles | ~10 |
| **Total** | **~490** |

## 7. Recommended first task

**POT-T-1** — establishes copy and step contracts every launcher depends on.
