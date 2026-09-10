# Proposal: Bilateral Center Overview & Projects UI/UX Redesign

## 1. Document Control

| Attribute | Value |
|---|---|
| **Spec Path** | `docs/specs/bilateral/overview-redesign/` |
| **Proposal File** | `docs/specs/bilateral/overview-redesign/proposal.md` |
| **Type** | Change |
| **Approval Mode** | gated |
| **Derived Slug** | `bilateral/overview-redesign` — derived from user prompt: *"quiero mejorar visualmente esta seccion... overview podria tener unas cards en la parte superior con los totales y que sirvan de filtro de los bilateral projects, las cards de bilateral projects solo tienen el codigo pero podrian tener el titulo del proyecto..."* |
| **Author** | Antigravity AI |
| **Date** | 2026-08-28 |
| **Target Route** | `/bilateral/:acronym/home` (`BilateralHomeComponent` -> `BilateralProjectsPanelComponent`) |
| **Visual Mockup** | [`docs/specs/bilateral/overview-redesign/mockup/overview-mockup.html`](file:///Users/jcadavid/orca/workspaces/onecgiar_pr/qa-development-2026/docs/specs/bilateral/overview-redesign/mockup/overview-mockup.html) |

---

## 2. Intent

Redesign the **Bilateral Center Overview page** (`/bilateral/:acronym/home`) to transform the current plain list of project codes into a modern, high-utility dashboard. 

The new design introduces:
1. **Interactive KPI Summary Cards** at the top that aggregate project totals, Science Program distributions, and multi-program mappings, serving as direct instant filters for the projects below.
2. **Rich Project Cards** in a responsive grid layout displaying both the **Project Code** (`shortName`) and the **Full Project Title** (`fullName`), structured Science Program allocation chips, and a primary `+ Create result` action.
3. **Dual View Mode (Grid & Dense Table/List)** with comprehensive multi-attribute search and sorting to accommodate both visual scanning and dense data lookup.

---

## 3. Problem / Current Behavior

### Observed Issues (from current screenshot & code inspection):
1. **Missing Project Context:** Each row in the current `BilateralProjectsPanelComponent` only renders the internal short code (e.g. `B-A1080`, `B-A1368`). The full project name (`fullName`) is hidden inside a hover HTML `title` attribute, forcing users to guess or hover over each item to identify projects.
2. **Zero Aggregated Intelligence:** The page lacks summary counters or KPI metrics. Users cannot see at a glance how many bilateral projects exist for their center, how they are distributed across Science Programs, or how many are co-mapped.
3. **No Metric-Driven Filtering:** To find projects of a specific Science Program or co-mapped initiative, users must type into a text search input rather than clicking an intuitive filter badge or KPI card.
4. **Suboptimal Visual Hierarchy & UX:** Stacking full-width white bars vertically produces large amounts of wasted horizontal whitespace on desktop screens, while missing the polished 2026 PRMS visual language (Poppins typography, violet brand gradients `#6b6dc4 → #6461bc`, subtle borders, micro-interactions).
5. **No Layout Flexibility:** Users managing large project portfolios (20+ projects) lack a compact table/list view option.

---

## 4. Proposed Outcome & Visual Proposal

### 4.1 Top KPI Summary & Interactive Filter Strip
A horizontal grid of interactive summary cards above the project catalog:
- **Total Projects Card:** Total active projects in the center (e.g., `24 Available`). Clicking resets all filters to show all.
- **Science Program Distribution Cards:** Dynamic cards for the top Science Programs represented in the center's bilateral projects (e.g., `Breeding for Tomorrow (8)`, `Genebank (6)`, `Multifunctional Landscapes (4)`). Clicking any card instantly filters the catalog below to projects mapped to that program.
- **Multi-Program Projects Card:** Highlights co-funded / cross-cutting projects mapped to >1 Science Program (e.g., `5 Co-mapped`).
- **Visual State:** Selected KPI card highlights with an active violet accent border, subtle gradient background, and left indicator bar.

### 4.2 Enhanced Search & Filtering Toolbar
- **Real-time Search:** Instant search filtering across project code (`B-A1080`), full title (`fullName`), Science Program names (`spName`), and official codes (`programCode`).
- **Quick Filter Chips:** Fast pill toggles (`All`, `SP01`, `SP02`, etc.) synchronized bi-directionally with the KPI summary cards.
- **View Toggle:** Switch between **Grid View (Cards)** and **List View (Compact Table)** with session preference retention.

### 4.3 Redesigned Project Card (Grid View)
Each project is rendered as a clean, elevated card with strong visual hierarchy:
- **Header:** Monospace project code badge (e.g., `B-A1080`) + Active status indicator.
- **Title:** Prominent, multi-line project title (`fullName`) formatted with 15px font, 600 weight, and 2-line clamp.
- **Summary:** Optional project summary or description snippet when available from CLARISA.
- **Science Programs Section:** Dedicated sub-panel with colored border-accented chips showing each Science Program and its percentage allocation (`Breeding for Tomorrow 80%`, `Genebank 20%`).
- **Footer CTA:** Direct `+ Create result` button with violet brand gradient hover effect and link to `/bilateral/:acronym/create`.

### 4.4 Redesigned List View (Dense Table)
- Clean table with dark chrome header (`#1e202f`), columns for `Code`, `Project Title & Summary`, `Science Programs & Allocations`, and `Action`.

---

## 5. Scope

### In Scope:
- **Frontend Component Refactor:**
  - Update `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-home/components/bilateral-projects-panel/`:
    - `bilateral-projects-panel.component.html` (new KPI section, toolbar, grid/list templates, empty state).
    - `bilateral-projects-panel.component.ts` (reactive signals for KPI aggregations, active filters, view mode `grid | list`, computed filtering).
    - `bilateral-projects-panel.component.scss` (Tailwind-first styling with PRMS brand tokens).
- **Interactive State Management:**
  - Seamless synchronization between KPI cards, chip filters, search query, and view modes.
- **Visual Design Compliance:**
  - Conformance to `docs/ux-ui/design.md` Section 7 tokens (`--pr-color-primary-300`, `--pr-color-secondary-400`, Poppins typography, PrimeIcons).

### Out of Scope / Non-Goals:
- Backend modifications: Existing endpoint `GET /api/bilateral/projects/:centerId` already returns `id`, `shortName`, `fullName`, `summary`, `description`, and `sciencePrograms` with allocations. No server-side schema changes or new migrations needed.
- Result creation flow: Clicking `+ Create result` will continue to invoke `BilateralCreationService.selectProject(project)` and navigate to `/bilateral/:acronym/create`.

---

## 6. Affected Users, Systems, And Specs

| Area | Impact |
|---|---|
| **Users** | Center submitters, bilateral project coordinators, and platform admins navigating the Bilateral Center Overview. |
| **Frontend** | `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-home/` |
| **Related Specs** | `docs/specs/reporting/bilateral-centers-overview/` |

---

## 7. Visual Reference

- **Source:** High-Fidelity Standalone HTML Mockup
- **Location:** [`docs/specs/bilateral/overview-redesign/mockup/overview-mockup.html`](file:///Users/jcadavid/orca/workspaces/onecgiar_pr/qa-development-2026/docs/specs/bilateral/overview-redesign/mockup/overview-mockup.html)
- **Features Tested in Mockup:**
  - Interactive KPI cards with real-time project filtering.
  - Search bar with instant token matching on code and full title.
  - Grid View vs. List/Table View toggle.
  - Card layout with code badge, 2-line clamped title, science program allocation tags, and create CTA.
  - Empty state with filter reset action.

---

## 8. Requirement Delta Preview

### ADDED Requirements
- **REQ-BIO-01 (KPI Summaries):** The Overview tab shall display summary cards calculating total available projects, distribution per Science Program, and multi-program counts for the active center.
- **REQ-BIO-02 (Interactive Card Filtering):** Clicking any KPI card or Science Program filter chip shall filter the project listing to matching projects.
- **REQ-BIO-03 (Full Project Title Display):** Every project card/row shall display the full project title (`fullName`) alongside the project code (`shortName`).
- **REQ-BIO-04 (Grid/List View Mode):** Users shall be able to toggle between a 2/3-column responsive Card Grid and a dense Table View.

### MODIFIED Requirements
- **REQ-BIO-05 (Search Matching):** The search input shall match across project short codes, full titles, and Science Program names.
- **REQ-BIO-06 (Card Layout):** The current flat list of project code rows is replaced with the structured card/table presentation.

---

## 9. Approach Options

| Option | Pros | Cons | Recommendation |
|---|---|---|---|
| **Option 1: Minimalist List Tweak**<br>Add the title to existing list rows and a simple text counter at the top. | Quickest implementation; minimal DOM changes. | Leaves UX flat, does not provide metric-driven filtering or modern dashboard feel. | ❌ Not recommended |
| **Option 2: Grid-Only Redesign with Top KPIs**<br>Implement top KPI filter cards and a responsive card grid only. | Clean, modern visual presentation; delivers titles and filters. | Power users with 30+ projects cannot switch to a dense table view. | ⚠️ Acceptable |
| **Option 3: Full Dashboard with KPIs + Dual View (Grid & Dense List)**<br>Deliver interactive KPI filter cards, rich project cards with full titles, and a seamless Grid/List view toggle. | Best-in-class UX/UI; maximum clarity for small and large portfolios; matches 2026 PRMS design language. | Slightly more template markup (handled cleanly with standalone Angular 21 components). | ✅ **Recommended** |

---

## 10. Recommended Approach

Adopt **Option 3**:
1. Implement the KPI filter card strip driven by Angular `computed()` signals over the loaded `projects` list.
2. Render project cards in a responsive CSS Grid with `shortName` badge, full `fullName` title, Science Program allocation chips, and clear `+ Create result` action.
3. Provide a view switcher (`grid` / `list`) so users can choose their preferred density.
4. Keep the entire implementation frontend-only, building on existing API contracts.

---

## 11. Risks, Dependencies, And Open Questions

- **Risk 1: Projects with very long titles or missing titles:**
  - *Mitigation:* Apply CSS 2-line clamp with ellipsis and full tooltip on hover (`[title]="project.fullName || project.shortName"`). Fall back to `shortName` if `fullName` is empty.
- **Risk 2: Centers with a large number of Science Programs (overflowing KPI cards):**
  - *Mitigation:* Display top 4 Science Programs as dedicated KPI cards, with a "+N more" or dropdown filter for long tails.
- **Dependency:** No backend changes or DB migrations needed; uses existing `/api/bilateral/projects/:centerId`.

---

## 12. Success Criteria

1. Submitter can clearly see both project code (`shortName`) and title (`fullName`) without needing to hover.
2. Submitter can filter projects in 1 click by clicking any top KPI card or program chip.
3. Submitter can switch between Card Grid and Table List views seamlessly.
4. Search matches instantly across code, title, and science program.
5. All UI elements adhere strictly to PRMS 2026 design tokens.

---

## 13. Next Step

```text
/akili-specify bilateral/overview-redesign
```
