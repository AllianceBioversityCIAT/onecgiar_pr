# Requirements: Relocate "Back to results" to the Result Sections Sidebar Rail

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `docs/specs/changes/result-detail-back-rail` |
| Module | `results` / `result-detail` |
| Sub-feature | `result-detail-back-rail` |
| Type | Change |
| Depth | Standard |
| Status | `draft` |
| Owner | Results & UX/UI Core Team |
| Baseline | `US-S1` (`docs/prd.md`); Result Detail Layout (`docs/ux-ui/design.md` §4); `W1` (`docs/trd/trd.md`) |
| Related specs | `changes/result-submitter-back-link`, `bugfix/smart-back-button` |

---

## 2. Executive Summary

In the Result Detail layout, the **Back to results** navigation anchor currently sits inside the scrolling content canvas (`app-result-header`) above the title, where it wastes ~32px of vertical fold space and scrolls out of view when users fill long forms.

This specification relocates the origin-aware back navigation to the top of the secondary navigation rail (`app-result-sections-sidebar`). This makes the exit route permanently reachable regardless of scroll depth, removes visual clutter from the content canvas header, and elevates the result title and form fields into the primary viewport.

---

## 3. Glossary

| Term | Meaning |
|---|---|
| `app-result-sections-sidebar` | The 240px white secondary sidebar rail containing the result code, type, status, section menu, progress bar, and submit triggers. Fixed height, independent scroll. |
| `app-result-header` | The header component inside the main content canvas displaying the title, metadata trigger (`ⓘ`), and export actions (`PDF`, `⋮`). |
| `SmartNavigationService` | Service that tracks user arrival origin (e.g. Science Program Results tab, My Results board, or global Results Center list) to provide context-aware return navigation. |
| `rd_scroll` | The scrolling content canvas container in `ResultDetailComponent` hosting the header, phase switcher, and active section form. |

---

## 4. System Context & Scope

### In Scope
1. **Sidebar Anchor:** Adding the origin-aware back navigation control to the top of `app-result-sections-sidebar` (above `Result code #...`).
2. **Header Cleanup:** Removing the back navigation anchor from `app-result-header`, elevating the title and actions to the top baseline.
3. **Smart Navigation Continuity:** Preserving URL paths, query parameters (`?phase=`, filters), and context-aware tooltip titles via `SmartNavigationService`.
4. **Visual & Ergonomic Refinement:** Ghost button styling with comfortable hit target (`min-h-[32px]`), subtle hover state, and clear divider separation.
5. **Unit Tests:** Updating test suites for `ResultSectionsSidebarComponent` and `ResultHeaderComponent`.

### Out of Scope
- Altering the global dark sidebar (`hlmSidebar`).
- Modifying `SmartNavigationService` route resolution algorithms.
- Changing mobile aside drawer mechanisms.
- Changing API contracts or database models.

---

## 5. Stakeholders / Personas

| Persona | Why This Matters |
|---|---|
| **Result Submitter** | Can easily review and edit long form sections without losing the way back to their working board or indicator list; enjoys ~32px more vertical canvas space. |
| **QA Reviewer** | Inspects multi-section results with persistent, zero-scroll access to the review queue or program results catalog. |

---

## 6. Functional Requirements

### `RDBR-R-1` — Back Navigation Anchor in Result Sections Sidebar Rail

The system MUST render the back navigation control at the top of `app-result-sections-sidebar`, positioned as the first element inside the aside, preceding the result code and identity block.

#### Scenario: Submitter opens Result Detail and views navigation rail
- **GIVEN** a user opens a result detail page (e.g. `/result/result-detail/8959/general-information?phase=36`)
- **WHEN** `app-result-sections-sidebar` renders
- **THEN** an anchor element `[data-testid="result-detail-back-link"]` is visible at the very top of the rail
- **AND** it displays an icon (`chevron_left`), label (`Back to results`), and appropriate accessible name
- **AND** it is styled with ghost button ergonomics (hover background tint and clear text contrast)
- **AND** a subtle divider separates the back navigation from the Result Code / Type block below it.

---

### `RDBR-R-2` — Origin-Aware Smart Navigation Continuity

The back navigation control in `app-result-sections-sidebar` MUST preserve full fidelity with `SmartNavigationService`, resolving the destination URL, query parameters, and title based on where the user arrived from.

#### Scenario 1: User arrives from My Results board
- **GIVEN** the user navigated to the result from `/result-framework-reporting/entity-details/SP02/my-work?phase=Reporting%202026`
- **WHEN** the user inspects or clicks `[data-testid="result-detail-back-link"]` in the sidebar rail
- **THEN** the link targets `/result-framework-reporting/entity-details/SP02/my-work`
- **AND** query parameters `phase=Reporting 2026` are preserved
- **AND** the tooltip title attribute is `"Back to My results"`.

#### Scenario 2: User arrives from Programme Results list
- **GIVEN** the user navigated from `/result-framework-reporting/entity-details/SP01/results`
- **WHEN** the user inspects `[data-testid="result-detail-back-link"]`
- **THEN** the link targets `/result-framework-reporting/entity-details/SP01/results`
- **AND** the tooltip title attribute is `"Back to programme results"`.

#### Scenario 3: User opens result via direct URL / Results Center
- **GIVEN** the user opened the result directly without origin history
- **WHEN** `[data-testid="result-detail-back-link"]` renders
- **THEN** the link targets `/result/results-outlet/results-list`
- **AND** the tooltip title attribute is `"Back to all results"`.

---

### `RDBR-R-3` — Removal of Back Link from Canvas Header

The system MUST remove the back navigation link from `app-result-header`, so that the result title `<h1>` and action buttons are the topmost elements in the content canvas header.

#### Scenario: Header layout on content canvas
- **GIVEN** the user views the content canvas
- **WHEN** `app-result-header` renders
- **THEN** there is NO element matching `[data-testid="result-detail-back-link"]` inside `app-result-header`
- **AND** the `<h1>` title is positioned at the top of the header container
- **AND** the export buttons (`PDF v`, options `⋮`) align with the top baseline of the title.

---

### `RDBR-R-4` — Persistent Non-scrolling Exit Navigation

The back navigation control MUST remain visible and interactive regardless of how far the user scrolls within the form content canvas (`rd_scroll`).

#### Scenario: User scrolls to the bottom of a long form
- **GIVEN** the user is editing a long section (e.g. *Contributors & partners*) and scrolls `rd_scroll` 1500px down
- **WHEN** the user glances at the left rail
- **THEN** `[data-testid="result-detail-back-link"]` remains stationary and fully visible at the top of the sidebar rail
- **AND** the user can click it immediately without scrolling up.

---

## 7. Non-Functional Requirements

| ID | Category | Requirement |
|---|---|---|
| `RDBR-NFR-1` | **Accessibility (WCAG 2.1 AA)** | The back link must have a touch/click target of at least 32px height, an accessible name, visible focus ring on keyboard tab, and valid `href`. |
| `RDBR-NFR-2` | **Layout Stability (CLS)** | Relocating the back link must not introduce layout shifts or flicker during page load; sidebar skeleton state must remain smooth. |
| `RDBR-NFR-3` | **Performance** | Change detection in `ResultSectionsSidebarComponent` must remain `OnPush` with clean signal or getter evaluation. |

---

## 8. Defect Classes & Verification Gates

| Defect Class | Detection Gate | Substitute if Automated Gate is Blind |
|---|---|---|
| Broken return URL or dropped query parameters | `result-sections-sidebar.component.spec.ts` asserting exact `href` and query string | — |
| Regressed tooltip title | Jest assertion comparing `title` attribute for each smart nav scenario | — |
| Canvas header spacing regression | `result-header.component.spec.ts` asserting title is top element | Manual visual inspection in browser |
| Accessible focus ring / tap target size | Unit test inspecting CSS classes (`min-h`, `gap`, `focus-visible`) | Chrome DevTools inspection |

---

## 9. Acceptance Criteria Index

- [ ] `RDBR-AC-1`: `[data-testid="result-detail-back-link"]` is present in `app-result-sections-sidebar` as the first interactive element.
- [ ] `RDBR-AC-2`: `[data-testid="result-detail-back-link"]` is NOT present in `app-result-header`.
- [ ] `RDBR-AC-3`: `[data-testid="result-detail-back-link"]` correctly binds `routerLink` and `queryParams` from `SmartNavigationService`.
- [ ] `RDBR-AC-4`: `[data-testid="result-detail-back-link"]` tooltip title dynamically resolves to "Back to My results", "Back to programme results", or "Back to all results".
- [ ] `RDBR-AC-5`: In `app-result-header`, `<h1>{{ title }}</h1>` is the topmost element in the header flow.
- [ ] `RDBR-AC-6`: All unit tests in `result-sections-sidebar.component.spec.ts` and `result-header.component.spec.ts` pass 100%.
