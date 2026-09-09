# Requirements: Bilateral Center Shell & Hero SP Alignment

## Document Control

| Field | Value |
|---|---|
| **Spec Path** | `docs/specs/bilateral/shell-sp-alignment/requirements.md` |
| **Module / Sub-feature** | `bilateral` / `shell-sp-alignment` |
| **Prefix** | `BSA` (Bilateral Shell Alignment) |
| **Status** | draft |
| **Type** | Change |
| **Approval Mode** | gated |
| **Parent Spec** | none (Foundational stage for Tab-by-Tab bilateral refinements) |
| **Date** | 2026-09-07 |

---

## 1. Executive Summary

This specification establishes visual, structural, and interaction parity between the **CGIAR Center Bilateral view** (`/bilateral/:acronym/*`) and the **Science Programs (SP) view** (`/result-framework-reporting/entity-details/:entityId/*`). It standardizes the hero header (typography, height, eyebrow, removal of the redundant `[Back to Centers]` button), renames and refactors the navigation tabs with icons and clear information congruence (promoting `Reporting` as the primary default tab), implements the viewport-locked sticky chrome architecture with independent vertical content scrolling (`#workArea`), docks the filter toolbars beneath the tabs, and guarantees full responsive adaptability across all three center tabs (`Reporting`, `Results`, `Drafts`).

---

## 2. Context & System Boundaries

- **Product Baseline:** Fulfills `docs/prd.md` goals **G1** (submission completeness and ease of navigation) and **G4** (standardized UX across portfolio lenses).
- **UX/UI Baseline:** Follows `docs/ux-ui/design.md` §1 ("Structure beats freedom", "One result, many lenses"), §7 (Design Tokens `var(--pr-*)`), and mirrors the reference layout of SP's `reporting-program-band` and `programme-results`.
- **Technical Baseline:** Follows `docs/trd/trd.md` frontend architecture, incorporates Kaizen lessons `KZ-changes--sp-shell-app-viewport-2` (SCSS cascade discipline) and `KZ-BOR-1` (design token compliance, zero hardcoded hex, no new PrimeIcons).

---

## 3. In Scope / Out of Scope

### In Scope
- Refactoring `bilateral-page-header` component to mirror the SP hero layout, typography (`18px-21px bold`), eyebrow metadata, and button grouping.
- Permanently removing the `[Back to Centers]` button from the tabbed center view.
- Renaming the primary tab from "Overview" to "Reporting" and ensuring it loads by default when navigating to a center.
- Equipping all three tabs (`Reporting`, `Results`, `Drafts`) with distinct icons, 48px height, 2px bottom active border, and counter badges.
- Implementing the viewport-lock architecture (sticky hero + docked filter bar with independent vertical scroll on `#workArea` at viewports ≥ 900px).
- Docking the top filter/search toolbars directly beneath the tabs band across all three tab views.
- Comprehensive responsive behavior review and fixes across mobile (<640px), tablet (640–899px), and desktop (≥900px).
- Strict adherence to PRMS design tokens: `var(--pr-*)`, `@ng-icons/lucide` / standard Material Icons, Tailwind 4.

### Out of Scope
- Backend changes to `/api/bilateral/*` or TypeORM entities.
- Redesign of the inner catalog card algorithms, table columns, or draft submission modals.
- Altering the `variant="detail"` behavior of `bilateral-page-header` used in the result creation wizard.
- Modifying Science Programs (`result-framework-reporting`) modules.

---

## 4. Stakeholders & Personas Affected

| Persona | Primary Benefit |
|---|---|
| **Result Submitter** (Center Staff) | Predictable, coherent mental model between reporting for Science Programs and Bilaterals; immediate access to reporting actions; search and filters always in view. |
| **Quality Assurance Reviewer** | Fast switching between centers and programs with identical navigation patterns and persistent filter controls. |
| **PMU Lead** | Standardized, professional UI consistency across the entire PRMS platform. |

---

## 5. Defect Classes & Verification Mapping

| Defect Class | Observable Defect | Verification Gate |
|---|---|---|
| **DC-1: Typography & Spacing Drift** | Title renders at 30px or hero exceeds 64px height. | Jest DOM metric assertions + Component visual inspection. |
| **DC-2: Scroll Regressions** | Chrome scrolls out of view or inner container fails to scroll at ≥900px. | Jest DOM host class checks + Real browser viewport test. |
| **DC-3: Navigation & Routing Breakage** | Default route fails to open Reporting or broken tab links. | Jest routerLink and routing-data spec assertions. |
| **DC-4: Style Cascade / Emission Bug** | `:host` style in inline template overrides SCSS mixin (`KZ-SAV-2`). | Static source inspection (`readFileSync` check on component styles). |
| **DC-5: Design Token Violations** | Hardcoded `#hex` or new `pi pi-*` classes introduced (`KZ-BOR-1`). | Linter + Grep scan for hex literals and PrimeIcons in touched files. |
| **DC-6: Mobile / Tablet Overflow** | Tab bar overflows viewport or CTA buttons clip. | Cypress / responsive viewport DOM checks at 375px, 768px, 1280px. |

---

## 6. Functional Requirements

### BSA-R-1: Hero Header & Title Alignment
The system MUST render a compact, standardized hero header for CGIAR Centers matching the Science Programs design.

#### Scenario: Standard desktop hero presentation
- **GIVEN** a user is viewing any bilateral center tab (`/bilateral/:acronym/*`)
- **WHEN** the header renders at viewport ≥ 900px
- **THEN** the center title MUST display with font size `text-[18px] sm:text-[21px] font-bold` and color `var(--pr-text-heading)`
- **AND** the eyebrow MUST render an indicator dot followed by uppercase tracking text (e.g. `• CGIAR CENTER` or center acronym)
- **AND** the hero container height MUST be compact (~64px) instead of the legacy 88px
- **AND** long titles MUST truncate gracefully with an ellipsis (`truncate`)
- **BUT** it MUST NOT push the tab strip or content below the initial viewport fold.

---

### BSA-R-2: Removal of "Back to Centers" Button
The system MUST remove the redundant `[Back to Centers]` button from all center tabbed headers.

#### Scenario: Tabbed center navigation without back button
- **GIVEN** a user is on the Reporting, Results, or Drafts tab of a Center
- **WHEN** inspecting the header action area
- **THEN** the button labeled `Back to Centers` MUST NOT be present in the DOM
- **AND** Center navigation is provided exclusively by the persistent left sidebar rail ("MY CGIAR CENTERS")
- **BUT** the `variant="detail"` mode (used inside the result editor) MUST continue rendering its respective back link (`goBack()`).

---

### BSA-R-3: Congruent Tab Naming, Structure & Default Tab
The system MUST provide three standardized navigation tabs with congruent naming and icons, opening `Reporting` by default.

#### Scenario: Tab strip composition and default selection
- **GIVEN** a user navigates to `/bilateral/:acronym` or `/bilateral/:acronym/home`
- **WHEN** the center shell loads
- **THEN** three tabs MUST be rendered in exact order:
  1. **Reporting** (with icon `track_changes` or `space_dashboard`, routing to `/bilateral/:acronym/home`)
  2. **Results** (with icon `table_chart`, routing to `/bilateral/:acronym/results`)
  3. **Drafts** (with icon `fact_check` and badge showing active draft count, routing to `/bilateral/:acronym/drafts`)
- **AND** the `Reporting` tab MUST be marked as active (`aria-current="page"` and 2px border `var(--pr-color-primary-300)`) by default
- **AND** each tab MUST display its icon alongside its label with a uniform height of `48px`
- **AND IT MUST** preserve the existing route `/home` so bookmarks and existing links remain functional.

---

### BSA-R-4: Static Chrome & Viewport-Locked Scrolling Architecture
The system MUST lock the hero header, tabs, and filter controls at the top of the viewport for screen widths ≥ 900px, delegating vertical scroll to the content area.

#### Scenario: Independent vertical content scrolling at ≥ 900px
- **GIVEN** a desktop viewport width ≥ 900px
- **WHEN** a user scrolls vertically through long project catalogs, results lists, or draft cards
- **THEN** the hero band, tab navigation, and docked top filter controls MUST remain fixed and visible at the top of the viewport
- **AND** only the inner `#workArea` MUST scroll vertically (`overflow-y-auto custom_scroll`)
- **AND** no duplicate or outer window-level scrollbar MUST be generated
- **BUT** on viewports < 900px, the shell MUST gracefully fall back to native document scrolling without clipping content.

---

### BSA-R-5: Filters Toolbar Docking Beneath Hero Tabs
The system MUST position the primary search and filter controls directly below the tabs band in all bilateral views.

#### Scenario: Filter docking across all three tabs
- **GIVEN** any active tab (`Reporting`, `Results`, or `Drafts`)
- **WHEN** the tab content renders
- **THEN** the primary filter toolbar (Search input, filter chips/selectors, and view toggles) MUST dock immediately below the tabs band
- **AND** in the `Reporting` tab, the toolbar with Search, Quick Filter chips (All, Science Programs, Multi-Program), and Grid/List view toggle MUST sit at the top of the content area
- **AND IT MUST** maintain a consistent padding of `px-[16px] sm:px-[32px]` matching the hero tabs band.

---

### BSA-R-6: Responsive Shell Adaptation
The system MUST adapt the hero, tabs, and filter controls responsively across all device screen sizes.

#### Scenario 1: Narrow mobile viewport (<640px)
- **GIVEN** a mobile viewport (< 640px)
- **WHEN** viewing any center tab
- **THEN** the tab bar MUST allow horizontal touch scrolling (`overflow-x-auto no-scrollbar`) without breaking page boundaries
- **AND** header action buttons MUST collapse visible labels or show compact icon treatments (`Report emerging result` -> icon or compact pill)
- **AND** title typography MUST scale down appropriately to prevent truncation of critical info.

#### Scenario 2: Tablet viewport (640px – 899px)
- **GIVEN** a tablet viewport (640px to 899px)
- **WHEN** viewing the center shell
- **THEN** the tab bar MUST render comfortably with full labels and icons
- **AND** the filter bar MUST wrap cleanly without overlapping search inputs or chips.

---

### BSA-R-7: Design Tokens & CSS Hygiene
All newly authored markup and styles MUST adhere strictly to repository design standards.

#### Scenario: Token compliance
- **GIVEN** all modified files in `onecgiar-pr-client`
- **WHEN** audited by static code analysis and tests
- **THEN** ZERO hardcoded `#hex` color literals MUST be added (only `var(--pr-*)` CSS variables)
- **AND** ZERO new `pi pi-*` PrimeIcons MUST be introduced (using `@ng-icons/lucide` or standard Material Icons)
- **AND** all `:host` layout rules MUST reside within the respective `.scss` files, never in inline template strings (`KZ-changes--sp-shell-app-viewport-2`).

---

### BSA-R-8: Loading Skeleton Architecture (`.pr-skeleton`)
The system MUST replace legacy loading spinners (`pi-spinner`, `pi-spin`) with modern animated loading skeletons during data loading states.

#### Scenario: Loading state skeleton representation
- **GIVEN** data is in-flight (`loading() === true`) for bilateral projects or results
- **WHEN** the view renders
- **THEN** the system MUST display shimmering skeleton blocks using the global `.pr-skeleton` CSS class
- **AND** it MUST completely eliminate legacy spinner icons (`<i class="pi pi-spin pi-spinner">`)
- **AND** the skeleton layout MUST mirror the loaded content dimensions (KPI strips, card grids, table rows) to eliminate cumulative layout shifts.

---

## 7. Non-Functional Requirements

| Dimension | Requirement | Target Metric |
|---|---|---|
| **Accessibility** | WCAG 2.1 AA compliance | All tabs carry `aria-label`, active state carries `aria-current="page"`, tap targets ≥ 36px. |
| **Visual Consistency** | Hero title and tabs layout parity | 1:1 visual match with `reporting-program-band` (Image 2 reference). |
| **Performance** | Zero layout shifts | Cumulative Layout Shift (CLS) < 0.05 during tab switching and loading transitions via `.pr-skeleton`. |
| **Code Cleanliness** | Design system token compliance | 0 new hex codes, 0 new PrimeIcons, clean `ng lint`. |
| **Backwards Compatibility** | Preserved routes | Existing URLs `/bilateral/:acronym/home`, `/results`, `/drafts` remain fully functional. |

---

## 8. Acceptance Criteria Index

| ID | Summary | Maps to Requirement |
|---|---|---|
| `BSA-AC-1` | Hero title size is `18px-21px bold` in compact ~64px container with aligned eyebrow | `BSA-R-1` |
| `BSA-AC-2` | Button `[Back to Centers]` is completely removed from the tabbed header | `BSA-R-2` |
| `BSA-AC-3` | Primary tab is named `Reporting` with icon and opens by default on `/bilateral/:acronym/home` | `BSA-R-3` |
| `BSA-AC-4` | All three tabs (`Reporting`, `Results`, `Drafts`) render icons, 48px height, and 2px active border | `BSA-R-3` |
| `BSA-AC-5` | At ≥900px, hero and filter toolbar remain sticky while `#workArea` scrolls vertically | `BSA-R-4` |
| `BSA-AC-6` | Filter toolbars sit directly docked beneath the hero tabs band | `BSA-R-5` |
| `BSA-AC-7` | Narrow mobile screen (<640px) enables horizontal tab scroll and collapsed action labels | `BSA-R-6` |
| `BSA-AC-8` | No hardcoded `#hex` colors or new PrimeIcons in diff; `:host` styles in `.scss` | `BSA-R-7` |
| `BSA-AC-9` | Loading states render `.pr-skeleton` shimmering blocks instead of legacy spinners | `BSA-R-8` |

---

## 9. Dependencies & Assumptions

- **Dependencies:**
  - `BilateralContextService` providing `centerAcronym()`, `centerName()`.
  - `BilateralAiService` providing `draftCountDisplay()`.
  - Spartan UI / Tailwind 4 preset classes and tokens.
- **Assumptions:**
  - Navigation between centers is handled via the existing sidebar rail ("MY CGIAR CENTERS"), rendering the top "Back to Centers" button obsolete.
  - Keeping `/home` as the route for the `Reporting` tab preserves backwards compatibility for bookmarks and external links.

---

## 10. Open Questions

- None. The scope, visual requirements, and functional contracts have been fully clarified with the user and reference artifacts.
