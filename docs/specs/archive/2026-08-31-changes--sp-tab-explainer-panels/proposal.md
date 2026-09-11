# Proposal: Science Program Tab Explainer Panels

## Document Control

- **Spec Path:** `docs/specs/changes/sp-tab-explainer-panels`
- **Proposal Path:** `docs/specs/changes/sp-tab-explainer-panels/proposal.md`
- **Type:** Change
- **Approval Mode:** gated
- **Author:** Antigravity (AI Assistant)
- **Date:** 2026-08-31
- **Status:** Draft

---

## 1. Intent

Provide users of the Science Program module with plain-language, contextual explainer panels at the top of each tab (`Overview`, `Results`, and `Reporting`). The panels help users immediately understand what each view shows and what actions they can take, eliminating guesswork while allowing them to collapse or expand the panel freely as needed.

---

## 2. Problem / Current Behavior

Currently, users entering the Science Program entity details screen (whether in **Overview**, **Reporting**, or **Results**) see statistics, filters, tables, and buttons immediately without an introductory context or orientation summary. 

- New or occasional users must deduce the scope of each tab (e.g., whether "Results" includes bilateral-contributed results or only direct results).
- There is no unified, accessible in-page explanation of the role of each tab.

---

## 3. Proposed Outcome

- Each tab in the Science Program hub displays an elegant, collapsible **Tab Explainer Panel** positioned near the top of the tab content.
- **Default state:** Expanded by default every time the tab/module is loaded.
- **Interactivity:** Users can collapse or expand the panel freely via an intuitive toggle chevron/button.
- **Persistence:** Volatile / in-memory only — no per-user preferences or localStorage keys are stored. On fresh navigation or reload, it opens in the default expanded state.
- **Non-intrusive:** Purely informational — it does not filter data, trigger queries, or alter tab behavior.

---

## 4. Proposed Content & Messaging

### Tab 1 — Overview
- **Header:** *What does this tab show?*
- **Body:** *"A summary of your Science Program: how many results you have planned and reported, which CGIAR Centers are contributing, the Areas of Work involved, and other summary figures. Use it to see the overall picture of your Science Program at a glance."*

### Tab 2 — Results
- **Header:** *What does this tab show?*
- **Body:** *"All the results reported under your Science Program. This includes the results created directly by your Science Program, and also results reported by bilateral projects where your Science Program has been tagged as Primary Science Program or as Contributing Science Program."*

### Tab 3 — Reporting (Optional / Included for completeness)
- **Header:** *What does this tab show?*
- **Body:** *"The Theory of Change reporting framework for your Science Program. Browse planned Indicators and High-Level Outputs by Area of Work, track progress against targets, and submit new or continuing result reports for the current cycle."*

---

## 5. Scope

- **In Scope:**
  - Create a reusable, lightweight standalone component (e.g., `app-tab-explainer` or `app-pr-tab-intro`) with collapse/expand toggle, smooth transitions, and ARIA attributes (`aria-expanded`, `aria-controls`).
  - Integrate the component into:
    1. **Overview Tab** (`dashboard-lab.component.html` / `program-overview.component.html`).
    2. **Results Tab** (`programme-results.component.html`).
    3. **Reporting Tab** (`dashboard-lab.component.html` / `reporting-program-band.component.html`).
  - Follow design tokens from `docs/ux-ui/design.md` (soft neutral/brand background, rounded borders, accessible contrast).
  - Unit tests verifying default open state, collapse/expand toggle behavior, and correct tab-specific text rendering.

- **Non-Goals:**
  - Storing user collapse preferences across sessions or in user database.
  - Adding search or filtering inside the explainer panel.
  - Modifying global navigation routes or API contracts.

---

## 6. Affected Users, Systems, And Specs

- **Users:** Science Program leads, Initiative members, Center contributors, and QA reviewers.
- **Affected Packages:** `onecgiar-pr-client`
- **Affected Components:**
  - `DashboardLabComponent` (`dashboard-lab.component.ts`, `dashboard-lab.component.html`)
  - `ProgramOverviewComponent` (`program-overview.component.html`)
  - `ProgrammeResultsComponent` (`programme-results.component.html`)
- **Related Specs:** `docs/specs/changes/mass-reporting-flow`, `docs/specs/changes/reporting-entry-hub`

---

## 7. Visual Reference

- **Source:** User specification & UI rules (`docs/ux-ui/design.md §7`).
- **Look & Feel:** Clean informative callout card with brand/subtle accent, icon (`info` or `lightbulb`), section heading, concise descriptive text, and top-right collapse toggle (`ChevronUp` / `ChevronDown`).

---

## 8. Requirement Delta Preview

### ADDED Requirements
- `US-EXP-1`: As a Science Program user, I see an introductory explainer panel when landing on the Overview, Results, or Reporting tab.
- `US-EXP-2`: The panel shows the approved title ("What does this tab show?") and plain-language explanation for that tab.
- `US-EXP-3`: The panel is open by default on initial page load and when switching tabs.
- `US-EXP-4`: Clicking the collapse/expand control toggles the panel smoothly between collapsed and expanded states without persisting across page reloads.

### MODIFIED Requirements
- None (purely additive UI component).

### REMOVED Requirements
- None.

---

## 9. Approach Options

| Option | Architecture | Pros | Cons |
| :--- | :--- | :--- | :--- |
| **Option A: Reusable Standalone Component (`app-pr-tab-intro`)** (Recommended) | Create a dedicated standalone component accepting `title` and `description` (or `tabKey`) with local signal `isOpen = signal(true)` | High reusability, encapsulated styling and ARIA disclosure, consistent across Overview/Results/Reporting | Requires introducing one new shared/modular component |
| **Option B: Inline markup in each tab template** | Hardcode the HTML and collapse toggle in each separate component template | No new component file | Duplicate markup, styling divergence, higher test overhead |

---

## 10. Recommended Approach

**Option A (Reusable Component):** Create a standalone Angular component `PrTabIntroComponent` (or `TabExplainerComponent`) in `src/app/shared/components/` (or `result-framework-reporting/components/`). It encapsulates the collapse signal, icon toggle, accessible markup, and clean design token styles. Each tab simply inputs its copy.

---

## 11. Risks & Open Questions

- **Risks:** Minimal risk; zero backend changes and no impact on reporting data flow.
- **Open Questions:**
  1. *Would you like the Reporting tab to include the proposed wording above as well, or only Overview and Results?* (Default: include all three for full consistency).

---

## 12. Success Criteria

1. Navigating to `Overview`, `Results`, or `Reporting` displays the tab-specific explainer box at the top in its expanded state.
2. Clicking the toggle header collapses the box; clicking again expands it.
3. Reloading the page or switching tabs opens the panel in the default expanded state.
4. All client unit tests (`jest`) and linter (`ng lint`) pass with 0 errors.

---

## 13. Next Step

After your review and approval:
```text
/akili-specify changes/sp-tab-explainer-panels
```
