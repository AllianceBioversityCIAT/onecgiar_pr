# Sidebar Toggle Consolidation — `requirements.md`

## 1. Document Control

- **Module:** `changes` · **Sub-feature:** `sidebar-toggle-consolidation`
- **Depth:** Lite
- **Status:** draft
- **Owner:** santiago.sanchez@cgiar.org
- **Origin:** escalated from `/akili-quick` (fails the triviality gate — the removal changes the anchor behavior of `ReportingGuideService.startResultSidebarHint()`, not just visual)
- **Ticket(s):** none

## 2. Executive Summary

Today the reporting sidebar has **two** collapse/expand toggle buttons: one always-present in `shell-topbar`, one inside `reporting-nav-sidebar` that only renders when the sidebar is collapsed. Per approved mockups, keep only the button **inside the sidebar**, in both states:

- **Collapsed** (mockup img 10): already correct — button sits above the program icon rail. No change.
- **Expanded** (mockup img 9): a toggle button must be added top-right of the sidebar header, next to the "PRMS reporting" wordmark. It does not exist today — a comment in the code currently documents that decision as deliberate ("the collapse toggle belongs to the topbar alone").

Removing the topbar button also removes the only DOM anchor `ReportingGuideService.startResultSidebarHint()` had while the sidebar is expanded (its target selector is `[data-guide="sidebar-toggle"]`, which today only exists on the sidebar's own button while collapsed). The sidebar button must therefore carry that hook in **both** states, and the hint's firing point (`result-detail.component.ts` → `watchCompactEntry()`, right after `collapseForCompactEntry()` on ≤1366px viewports) must still resolve an element in the DOM at the moment `driver.js` looks for it.

## 3. Glossary

- **Compact viewport** — ≤1366px, where `SidebarService.collapseForCompactEntry()` auto-collapses the sidebar on result entry (SBAR-R-1).
- **Discoverability hint** — the one-step `driver.js` popover taught by SBAR-T-5/R-10/R-11, shown once per user via `RESULT_SIDEBAR_HINT_STORAGE_KEY`.

## 4. System Context & Scope

### In scope

- Remove the sidebar-collapse button from `shell-topbar.component.html/.ts`.
- Add a sidebar-collapse button to `reporting-nav-sidebar`'s header, visible only when **expanded** (top-right, beside the wordmark), matching mockup img 9.
- Ensure `data-guide="sidebar-toggle"` exists on the sidebar's own button in **both** collapsed and expanded states, so it is the sole, permanent anchor for the discoverability hint.
- Verify/adjust the hint firing sequence in `result-detail.component.ts` so the anchor element is guaranteed present in the DOM when `startResultSidebarHint()` runs (small screens and large screens alike).
- Update/remove the stale comment block in `shell-topbar.component.html` (lines 3-7 and 27-31 equivalent) that documents the old ownership.

### Out of scope

- Any change to `hlm-sidebar.service.ts` toggle mechanics, `Cmd/Ctrl+B` shortcut, or the rail button (`hlmSidebarRail`).
- Any change to the auto-collapse-on-compact-entry rule itself (SBAR-R-1..R-4).
- Any change to the other tutorials/tours in `ReportingGuideService`.

## 5. Stakeholders / Personas

| Persona | What changes for them |
|---|---|
| Any authenticated reporting user | Sees one collapse/expand control instead of two; it now always lives inside the sidebar. |
| First-time result-detail visitor | Still sees the one-time discoverability hint, now anchored to the sidebar's own button regardless of viewport width. |

## 6. Functional Requirements

### Required (MUST)

- **STC-R-1** The system MUST remove the sidebar-toggle button from `shell-topbar`.
- **STC-R-2** The system MUST render a sidebar-toggle button inside `reporting-nav-sidebar`'s header when the sidebar is **expanded**, positioned top-right beside the "PRMS reporting" wordmark, per mockup img 9.
- **STC-R-3** The existing collapsed-state button (above the program rail, mockup img 10) MUST be preserved unchanged in position and behavior.
- **STC-R-4** Both the expanded and collapsed sidebar-toggle buttons MUST carry `data-guide="sidebar-toggle"`, so exactly one such element is always present in the DOM regardless of sidebar state.
- **STC-R-5** `ReportingGuideService.startResultSidebarHint()` MUST still successfully anchor and display its popover after this change, on both compact (≤1366px) and non-compact viewports, immediately after a fresh result entry.

### Should (SHOULD)

- **STC-R-10** The expanded-state button SHOULD reuse the same icon (`lucidePanelLeft`) and accessible label pattern (`aria-label="Collapse sidebar"`) as the existing collapsed-state button, for consistency.

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| Accessibility | New button MUST have `aria-label`/`title`, keyboard-focusable, same as the existing sidebar button pattern. |
| Regression | No new console errors from `driver.js` failing to find its anchor element (verified manually per STC-AC-3/4 below). |
| Visual | Uses only existing `--pr-sidebar-*` tokens / existing Helm sidebar classes — no new hardcoded colors. |

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| STC-AC-1 | Sidebar expanded | User looks at the topbar | No collapse/expand button is present there. |
| STC-AC-2 | Sidebar expanded | User looks at the sidebar header | A collapse button is visible top-right, next to "PRMS reporting". |
| STC-AC-3 | A first-time user (hint not yet completed) opens a result on a viewport >1366px | Sidebar stays expanded | The discoverability hint pops over the sidebar's own (expanded) button. |
| STC-AC-4 | A first-time user (hint not yet completed) opens a result on a viewport ≤1366px | Sidebar auto-collapses on entry | The discoverability hint pops over the sidebar's own (collapsed) button, not a missing/topbar element. |
| STC-AC-5 | Sidebar collapsed | User clicks the sidebar's own button | Sidebar expands, matching current `toggleSidebar()` behavior. |

**Defect classes this spec can produce → gate:**

| Defect class | Catching command / check |
|---|---|
| Wrong button removed/kept, duplicate buttons | Manual browser check (Angular template change, not unit-testable trivially) — STC-AC-1/2, done at HITL/manual verification since Cypress CT does not cover shell chrome. |
| Hint fails to anchor (timing race, missing DOM element) | Manual browser check per STC-AC-3/4 — this is the exact defect class that caused the escalation from `/akili-quick`; no existing automated test covers `driver.js` anchor resolution timing. Recorded as an **accepted verification gap** covered only by manual QA, since the driver.js popover render is not asserted by any existing Jest/Cypress spec. |
| Existing collapse/expand behavior broken | `reporting-nav-sidebar.component.spec.ts` / `shell-topbar.component.spec.ts` (existing suites) plus manual click-test (STC-AC-5). |

## 9. Dependencies & Assumptions

### Upstream dependencies

- `@spartan/sidebar` (`HlmSidebarService`) — `state()`, `toggleSidebar()`, `isMobile()`.
- `ReportingGuideService` (dashboard-lab) — hint logic, unchanged public API.

### Downstream consumers

- None outside these two components + the guide service.

### Assumptions

- The mockups (img 9 expanded header, img 10 collapsed rail) are the approved visual reference; no further Figma/Stitch source exists for this change.
- Angular signal-driven re-render completes before `driver.js`'s `drive()` call queries the DOM in the current synchronous call chain — to be confirmed in design; if not, a microtask/`setTimeout(0)` deferral is an acceptable, minimal fix.

## 10. Open Questions

- STC-OQ-1 — None blocking. If design finds the DOM isn't ready synchronously after `collapseForCompactEntry()`, the fix (microtask defer) is confined to `result-detail.component.ts` and is covered by STC-R-5.

## Required cross-references

- `docs/ux-ui/design.md` — sidebar/nav chrome tokens (`--pr-sidebar-*`).
- `onecgiar-pr-client/src/app/shared/components/shell-topbar/CLAUDE.md` — documents the button's prior (now superseded) role.
- `onecgiar-pr-client/src/app/shared/components/reporting-nav-sidebar/reporting-nav-sidebar.component.html` — current collapsed-state button and the "No collapse control here" comment being superseded.
