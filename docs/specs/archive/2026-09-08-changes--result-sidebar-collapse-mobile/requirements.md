# Requirements — Result Sidebar Collapse (Compact Viewports)

## 1. Document Control

| Field | Value |
|---|---|
| Module code | `SBAR` |
| Spec path | `docs/specs/changes/result-sidebar-collapse-mobile/` |
| Depth | Standard |
| Type | Change |
| Approval Mode | gated |
| Proposal | `docs/specs/changes/result-sidebar-collapse-mobile/proposal.md` |
| Status | draft |
| Ticket(s) | — |

**Deviation from proposal (recorded here, not silently applied):** the proposal's Option A assumed reusing `HlmSidebarService`'s existing `_isMobile` signal (`mobileBreakpoint: '768px'`, confirmed in `hlm-sidebar.token.ts:21`). The user has since clarified the trigger must also cover 13–14" laptop windows down to **~1350px**, which `_isMobile` (768px) does not detect. Requirements below introduce a **separate, dedicated "compact viewport" threshold (≤1366px)** for this feature rather than reusing `_isMobile` — see `SBAR-R-1` and Glossary. `design.md` decides the implementation mechanism (new signal vs. extended service); this document only fixes the observable threshold.

## 2. Executive Summary

Opening a result on a viewport ≤1366px wide (13–14" laptops and smaller, not just phones) currently leaves the global nav sidebar expanded, crowding the multi-section result editor exactly where screen space is scarcest. This spec makes the sidebar start collapsed by default on entry to a result on such viewports, while never fighting a user who manually re-expands it, and adds a discoverability hint (tour step or coach-mark) so users learn the toggle exists.

## 3. Glossary

| Term | Meaning |
|---|---|
| Compact viewport | Browser viewport width ≤ **1366px** (covers the user-reported 13–14" laptop range down to ~1350px; 1366px is the common native width for that device class, chosen so 1350px and below reliably qualify). Distinct from `HlmSidebarService`'s existing `_isMobile` (768px), which stays unchanged for its current uses. |
| Nav sidebar | The global left navigation (`ReportingNavSidebarComponent`), toggled by the `lucidePanelLeft` button — collapsed/expanded state owned by `HlmSidebarService.state()`. |
| Result entry | The point a user lands on the `result-detail` route for a given `resultId` (route activation / `resultId` change), as opposed to switching sections/tabs within the same result. |
| Discoverability hint | The UI element (tour step via `ReportingGuideService`, or a lightweight coach-mark) that teaches a user the sidebar can be expanded/collapsed. |

## 4. System Context & Scope

### In scope

- Default sidebar state on **result entry** when viewport ≤1366px.
- Not fighting a manual re-expand for the remainder of that result-viewing session.
- One discoverability hint for the toggle, reachable by a user who lands directly on `result-detail` (not only via the dashboard tour).

### Out of scope

- Any change to sidebar content, icons, width, or the pinned-programs feature.
- Auto-collapse behavior on routes other than `result-detail`.
- Continuous re-evaluation on live window resize after entry (see `SBAR-R-4`) — resizing an already-open result does not retrigger auto-collapse/expand.
- Building a new tour engine.

## 5. Stakeholders / Personas

Refines `docs/prd.md` `US-S1` (result submitter filling required fields) and `G1` (submission completeness / on-time submission) by removing friction on the devices submitters actually use.

| Persona | What changes for them |
|---|---|
| Result submitter | On a 13–14" laptop or smaller, opens a result and immediately has more editor width; discovers the sidebar is collapsible instead of assuming it's fixed. |
| QA reviewer | Same benefit when reviewing results on the same device classes. |
| Platform admin | No behavior change. |

## 6. Functional Requirements

### Required (MUST)

- **`SBAR-R-1`** On result entry (route activation for a given `resultId`), if the viewport width is ≤1366px, the system MUST render the nav sidebar in the `collapsed` state.
- **`SBAR-R-2`** The system MUST NOT alter the sidebar's current state on result entry if the viewport width is >1366px (existing behavior preserved).
- **`SBAR-R-3`** After auto-collapse on entry, if the user manually expands the sidebar, the system MUST NOT re-collapse it while the user remains on that result (navigating between sections/tabs of the same result).
- **`SBAR-R-4`** The auto-collapse/expand decision MUST be evaluated only on result entry (`resultId` change), not on every window `resize` event while already viewing a result.

### Should (SHOULD)

- **`SBAR-R-10`** The system SHOULD present a one-time discoverability hint (tour step or coach-mark) explaining the sidebar toggle, shown to a user who has not seen it before, reachable from a direct `result-detail` landing (not only from the dashboard).
- **`SBAR-R-11`** The hint SHOULD be dismissible and SHOULD NOT reappear once seen (localStorage-flagged, consistent with the existing `pr.tour.sp.completed` pattern).

### Could / Nice-to-have (MAY)

- **`SBAR-R-20`** The system MAY reuse `ReportingGuideService`'s `driver.js` infrastructure for the hint if `design.md` finds it a better fit than a standalone coach-mark.

## 7. Scenarios

#### Scenario: Compact laptop entering a result — auto-collapse

- GIVEN a user's browser viewport is 1350px wide
- WHEN they navigate from Results Center into a result's `general-information` section
- THEN the nav sidebar renders in the `collapsed` state
- AND the result editor gains the freed horizontal space

#### Scenario: Desktop viewport unaffected

- GIVEN a user's browser viewport is 1600px wide
- WHEN they open a result
- THEN the nav sidebar's state is unchanged from whatever it was before navigation
- BUT it must NOT be forced into `collapsed`

#### Scenario: Manual re-expand is respected

- GIVEN the sidebar auto-collapsed on entry to result `#9043` at 1350px width
- WHEN the user clicks the toggle to expand it, then switches from "General information" to "Contributors & partners" within the same result
- THEN the sidebar remains expanded
- AND IT MUST NOT auto-collapse again on that section switch

#### Scenario: Resize after entry does not retrigger

- GIVEN a user is viewing a result at 1600px (sidebar in its normal desktop state)
- WHEN they resize the browser window down to 1300px without navigating to a different result
- THEN the sidebar's state does not automatically change
- BUT it must NOT ignore a *subsequent* fresh entry to a *different* result at that same narrow width (`SBAR-R-1` still applies on the next result entry)

#### Scenario: First-time discoverability hint

- GIVEN a user has never seen the sidebar-toggle hint (`pr.tour.<hint-key>.completed` not set)
- WHEN they land on a result (any viewport)
- THEN the hint is shown once, referencing the toggle control
- AND dismissing it (or letting it complete) sets the completion flag so it does not reappear

## 8. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Performance** | Entry-time viewport check MUST add no perceptible delay (<16ms) to route activation; reuses existing `window`/signal infrastructure, no new polling. |
| **Backwards compatibility** | MUST NOT change `HlmSidebarService`'s existing `_isMobile` (768px) behavior or any other consumer of that signal. |
| **Accessibility** | The toggle button and any hint popover MUST remain keyboard-reachable and screen-reader-announced per `docs/ux-ui/design.md` §10 (unchanged from current toggle button, which already satisfies this). |
| **Internationalization** | Any new hint copy MUST go through `src/app/internationalization/` like existing tour copy. |
| **Observability** | No new logging required; this is a client-only UI state change. |

## 9. Verification Coverage — Defect Classes

| Defect class | Catching command / method |
|---|---|
| Sidebar fails to collapse (or wrongly collapses) on result entry at a given width | Cypress/Jest test asserting `HlmSidebarService`/component state immediately after route activation at a mocked/set viewport width (`SBAR-AC-1`, `SBAR-AC-2`) |
| Regression on desktop viewports (>1366px) | Cypress test at 1600px asserting no forced state change (`SBAR-AC-2`) |
| Auto-collapse fights a manual re-expand across section navigation | Cypress test: expand, switch sections, assert still expanded (`SBAR-AC-3`) |
| Resize-after-entry incorrectly retriggers | Cypress test: resize post-entry, assert no state change (`SBAR-AC-4`) |
| Hint never shown / shown repeatedly | Jest/Cypress test on the completion-flag gate (`SBAR-AC-5`) |
| Hint renders in the wrong place, looks broken, or is visually confusing | **No automated coverage in this repo** (jsdom/Cypress cannot judge popover placement quality or visual polish) — accepted as a **manual QA check** at the `/akili-test` or `/akili-validate` HITL pause. A test asserting `data-guide="sidebar-toggle"` exists in the DOM proves the markup hook is present, not that the popover renders correctly — do not treat that assertion as covering this class. |

## 10. Dependencies & Assumptions

### Upstream dependencies

- `HlmSidebarService` (Spartan sidebar primitive) — read-only dependency; this spec adds new consumption, does not modify its public API.
- `ReportingGuideService` (`driver.js`) — only if `design.md` selects the tour-step option for `SBAR-R-10`.

### Downstream consumers

- None known; `result-detail` is a leaf route for this behavior.

### Assumptions

- 1366px is an acceptable, product-owner-approved proxy for "13–14 inch laptop or smaller" — confirmed by the user's own figure (~1350px). If a future device class needs a different cutoff, that is a follow-up change, not a blocker here.
- The existing `_isMobile` (768px) signal is intentionally left untouched; compact-viewport detection for this feature is a new, separate concern.

## 11. Open Questions

- `SBAR-OQ-1` — Should the discoverability hint live inside `ReportingGuideService`'s tour (dashboard-scoped today) or as a standalone coach-mark local to `result-detail`? Carried over from the proposal; `design.md` must resolve it.
- `SBAR-OQ-2` — Is 1366px the right constant, or should it be sourced from a shared breakpoint token if/when `docs/ux-ui/design.md` §9 grows a breakpoint near that value? For now, treat it as a local constant owned by this feature.

## 12. Requirement ID Index

| ID | Statement | Scenario(s) |
|---|---|---|
| `SBAR-R-1` | Auto-collapse on entry ≤1366px | Compact laptop entering a result |
| `SBAR-R-2` | No change >1366px | Desktop viewport unaffected |
| `SBAR-R-3` | Respect manual re-expand within a result | Manual re-expand is respected |
| `SBAR-R-4` | Evaluate only on entry, not on live resize | Resize after entry does not retrigger |
| `SBAR-R-10` | One-time discoverability hint | First-time discoverability hint |
| `SBAR-R-11` | Hint dismissible, non-repeating | First-time discoverability hint |
| `SBAR-R-20` | MAY reuse `driver.js` infra | (design choice, no dedicated scenario) |

## Required cross-references

- `docs/prd.md` — `G1` (submission completeness/on-time submission), `US-S1` (result submitter filling required fields).
- `docs/ux-ui/design.md` §9 (Responsive Behavior) — this spec adds a feature-local breakpoint (1366px) that does not map cleanly to the documented `xs/sm/md/lg/xl` scale; flagged in `SBAR-OQ-2` for later reconciliation.
- `docs/trd/trd.md` — no existing section covers the sidebar or tour; none to cite yet.
