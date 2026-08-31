# Requirements: Science Program Tab Explainer Panels

## 1. Module / Feature

- **Module:** `results` / `result-framework-reporting`
- **Sub-feature:** `sp-tab-explainer-panels` (Tab-level orientation callouts for Science Programs)
- **Status:** `in-review`
- **Spec Path:** `docs/specs/changes/sp-tab-explainer-panels/requirements.md`
- **Type:** `Change`
- **Approval Mode:** `gated`

---

## 2. Context & Problem Statement

When users navigate between the tabs of a Science Program in PRMS (**Overview**, **Reporting**, and **Results**), each view presents dense domain data, complex tables, progress figures, and filters without contextual onboarding. 

New or occasional users often struggle to immediately identify what information belongs in which tab (for example, whether the **Results** tab includes bilateral results tagged to the Science Program or solely internal results). 

To eliminate guesswork and streamline self-serve navigation, each tab requires an introductory, plain-language explainer card at the top. The card must be expanded by default on entry, freely collapsible/expandable by the user, purely informational (non-filtering), and non-persisted across page reloads.

---

## 3. In Scope / Out of Scope

### In Scope
- **STEP-R-1**: Tab explainer card component (`PrTabIntroComponent` / `app-pr-tab-intro`) integrated at the top of:
  1. **Overview Tab** (`/result-framework-reporting/entity-details/:entityId/overview`)
  2. **Results Tab** (`/result-framework-reporting/entity-details/:entityId/results`)
  3. **Reporting Tab** (`/result-framework-reporting/entity-details/:entityId` / `?tocView=aows`)
- **STEP-R-2**: Standardized copy per tab:
  - **Overview**: Summary of planned/reported results, contributing CGIAR Centers, Areas of Work involved, and high-level progress.
  - **Results**: Complete inventory of reported results (both direct Science Program results and bilateral projects where the Science Program is Primary or Contributing).
  - **Reporting**: Theory of Change framework, planned Indicators/High-Level Outputs by AoW, progress tracking, and report actions.
- **STEP-R-3**: Interactive disclosure mechanism (expanded by default, collapsible/expandable via click with `aria-expanded` support).
- **STEP-R-4**: Volatile state lifecycle (expanded state resets on fresh module/page load; zero `localStorage` or DB persistence).

### Out of Scope
- Storing user collapse preferences across sessions or backend profiles.
- Embedding interactive filters or search inputs inside the explainer panel.
- Modifying underlying data loading, APIs, or table behaviors.

---

## 4. Personas Affected

| Persona | Benefit / Impact |
| :--- | :--- |
| **Science Program Lead / Member** | Understands the scope and capability of each tab instantly without asking for support. |
| **Center Result Submitter** | Clearly understands why certain bilateral or cross-program results appear under the Results tab. |
| **QA Reviewer / PMU Lead** | Quickly verifies what each tab aggregates during reporting cycles. |

---

## 5. User Stories

- **`STEP-US-1`** (Core Story): As a Science Program user, I want each tab of the Science Program module to explain in plain language what it shows and what I can do there, so that I understand the information in front of me without having to ask or guess.
- **`STEP-US-2`** (Control & Focus): As a Science Program user, I want to be able to collapse the explainer panel if I need more vertical space to view the tables and data, and expand it again whenever I want a reminder.

---

## 6. Functional Requirements & Scenarios

### Requirement: STEP-R-1 — Default Expanded Explainer on Tab Entry
Each tab of the Science Program module MUST render its designated explainer panel in an **expanded** state upon initial page load or tab navigation.

#### Scenario 1.1: User lands on Overview tab
- **GIVEN** a user navigates to the Science Program Overview tab
- **WHEN** the view renders
- **THEN** the explainer panel is visible at the top in its expanded state
- **AND** it displays the heading *"What does this tab show?"* and the Overview descriptive text
- **BUT** it MUST NOT alter or filter the overview metrics below it.

#### Scenario 1.2: User switches to Results or Reporting tab
- **GIVEN** a user switches from Overview to Results (or Reporting)
- **WHEN** the new tab content renders
- **THEN** the explainer panel for that tab is displayed in its expanded state with that tab's specific text.

---

### Requirement: STEP-R-2 — Interactive Collapse / Expand Toggle
The user SHALL be able to freely toggle the explainer panel between collapsed and expanded states at any time.

#### Scenario 2.1: User collapses the explainer panel
- **GIVEN** the explainer panel is currently expanded
- **WHEN** the user clicks the header / collapse control
- **THEN** the panel content collapses smoothly
- **AND** the chevron/indicator reflects the collapsed state (`aria-expanded="false"`)
- **AND** the card height is minimized to just its header bar.

#### Scenario 2.2: User re-expands the collapsed panel
- **GIVEN** the explainer panel is currently collapsed
- **WHEN** the user clicks the header / expand control
- **THEN** the full descriptive body expands again (`aria-expanded="true"`).

---

### Requirement: STEP-R-3 — Non-Persisted State Across Sessions
The disclosure state of the panel MUST NOT be stored in `localStorage`, `sessionStorage`, cookies, or user profile settings.

#### Scenario 3.1: Page reload or re-entering the module
- **GIVEN** the user collapsed the explainer panel on a tab
- **WHEN** the user reloads the browser window or navigates away and returns to the module
- **THEN** the explainer panel is rendered in its default expanded state.

---

### Requirement: STEP-R-4 — Content & Copy Fidelity
The content inside each panel MUST match the approved plain-language text:

| Tab | Header | Body Content |
| :--- | :--- | :--- |
| **Overview** | *What does this tab show?* | *A summary of your Science Program: how many results you have planned and reported, which CGIAR Centers are contributing, the Areas of Work involved, and other summary figures. Use it to see the overall picture of your Science Program at a glance.* |
| **Results** | *What does this tab show?* | *All the results reported under your Science Program. This includes the results created directly by your Science Program, and also results reported by bilateral projects where your Science Program has been tagged as Primary Science Program or as Contributing Science Program.* |
| **Reporting** | *What does this tab show?* | *The Theory of Change reporting framework for your Science Program. Browse planned Indicators and High-Level Outputs by Area of Work, track progress against targets, and submit new or continuing result reports for the current cycle.* |

---

## 7. Non-Functional Requirements

- **`STEP-NFR-1` (A11y & Contrast):** The panel MUST satisfy WCAG 2.1 AA text contrast (≥ 4.5:1 for body copy, ≥ 3:1 for large text/icons) and expose valid semantic HTML and ARIA attributes (`role="region"`, `aria-expanded`).
- **`STEP-NFR-2` (Performance):** Zero API calls; component renders synchronously using local signals.
- **`STEP-NFR-3` (Design Tokens):** All colors, padding, typography, and borders MUST use PRMS design tokens (`var(--pr-surface-card)`, `var(--pr-border)`, `var(--pr-text-heading)`, `var(--pr-text-secondary)`).

---

## 8. Defect Class & Verification Mapping

| Defect Class | Automated Check / Gate |
| :--- | :--- |
| Template syntax / Angular compilation errors | `npx jest --silent --reporters=summary` |
| Linter and formatting violations | `npx ng lint --quiet` |
| Incorrect initial state (collapsed on load) | Unit tests in `pr-tab-intro.component.spec.ts` |
| Toggle failure or accessibility regressions | Unit tests asserting `aria-expanded` and click behavior |
