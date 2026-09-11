# Bilateral Center Overview & Projects UI/UX Redesign — Requirements

## 1. Module / Feature

- **Module:** `bilateral`
- **Sub-feature:** `overview-redesign` (Bilateral Center Overview & Projects Catalog)
- **Status:** `draft`
- **Target Route:** `/bilateral/:acronym/home` (`BilateralHomeComponent` -> `BilateralProjectsPanelComponent`)
- **Visual Reference:** [`docs/specs/bilateral/overview-redesign/mockup/overview-mockup.html`](file:///Users/jcadavid/orca/workspaces/onecgiar_pr/qa-development-2026/docs/specs/bilateral/overview-redesign/mockup/overview-mockup.html)
- **Related Specs:** `docs/specs/reporting/bilateral-centers-overview/`, `docs/specs/bilateral/overview-redesign/proposal.md`

---

## 2. Context & Executive Summary

When Center staff and result submitters navigate to their Center's Bilateral workspace (`/bilateral/:acronym/home`), the Overview tab acts as the primary gateway for discovering active bilateral projects and initiating result reporting. 

Currently, the interface renders a flat vertical list of white rows displaying only internal project codes (e.g., `B-A1080`) and basic tags without the project title (`fullName`), without summary KPIs, and without layout flexibility.

This specification defines the functional, UX, and non-functional requirements to transform the Overview tab into a modern, data-dense, and highly intuitive dashboard aligned with the 2026 PRMS visual standard.

---

## 3. In Scope / Out of Scope

### In Scope
- **Top KPI Summary Cards:** Aggregated counters for total available bilateral projects, breakdown by top Science Programs, and multi-program (co-mapped) projects.
- **Interactive KPI Filtering:** Clicking any KPI card or Science Program filter chip instantly filters the project catalog below.
- **Project Card Redesign (Grid View):** Rich card presentation rendering the project code (`shortName`), full title (`fullName`), summary snippet, Science Program allocation percentage chips, and a primary `+ Create result` action.
- **Dense Table / List View:** Alternative compact table representation with dark chrome header, ideal for large catalogs.
- **View Mode Switcher:** Toggle between Grid and List views with session persistence.
- **Instant Search:** Debounced search matching against project codes, full project titles, and Science Program names/codes.
- **Empty & Error States:** Clear visual feedback when no projects match filter criteria, with a 1-click filter reset.

### Out of Scope
- Backend API or database schema changes (the existing endpoint `GET /api/bilateral/projects/:centerId` already delivers `shortName`, `fullName`, `summary`, and `sciencePrograms`).
- Modifications to the result creation flow itself (`/bilateral/:acronym/create`).
- Modifications to other tabs (`Results`, `Drafts`) in the bilateral header.

---

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| **Result Submitter (Center Staff)** | Can immediately find their project by title instead of memorizing codes; can filter by Science Program in 1 click; can start result creation instantly. |
| **Bilateral Project Coordinator** | Obtains instant visibility into how the Center's bilateral projects are distributed across Science Programs and co-mapped initiatives. |
| **Platform Admin** | Quickly inspects bilateral projects available for any CGIAR center in a structured, modern layout. |

---

## 5. User Stories

- **`BIL-OVW-US-1` (Top KPI Metrics & 1-Click Filtering):** As a Result Submitter, I want to see summary KPI cards showing total projects and distribution per Science Program at the top of the Overview tab, and click any card to filter the project list immediately, so that I can focus on projects relevant to my program.
- **`BIL-OVW-US-2` (Full Project Title & Details Visibility):** As a Result Submitter, I want each project card to clearly display both the project code and the full project title, so that I can accurately identify the project I need to report on without hovering or guessing.
- **`BIL-OVW-US-3` (Dual View Mode — Grid & Table):** As a user managing multiple projects, I want to toggle between a rich Card Grid and a compact Table List view, so that I can choose the optimal density for my workflow.
- **`BIL-OVW-US-4` (Multi-Attribute Search):** As a user, I want the search input to match against project codes, full titles, and Science Program names, so that I can quickly find any project with partial keywords.
- **`BIL-OVW-US-5` (Direct Result Creation):** As a Result Submitter, I want a prominent `+ Create result` action on each project card, so that I can jump directly into reporting for that project with one click.

---

## 6. Functional Requirements

### 6.1 KPI Summary Metrics & Filtering

- **`BIL-OVW-R-1` (KPI Aggregation):** The system MUST compute reactive summary statistics over the loaded `projects` array for the active center:
  - Total count of active bilateral projects.
  - Count of projects mapped to each Science Program.
  - Count of multi-program projects (projects mapped to >1 Science Program).
- **`BIL-OVW-R-2` (Interactive Filter Synchronization):** 
  - Clicking any KPI card MUST set the active filter to that program (or reset to ALL).
  - Clicking any quick filter chip in the toolbar MUST update the active filter state and highlight the matching KPI card.
  - The currently active filter card MUST display an active visual state (`--pr-color-primary-300` border, subtle gradient background, and left accent bar).

### 6.2 Project Catalog & Card Design

- **`BIL-OVW-R-3` (Grid Card Presentation):** In Grid View, each project MUST be rendered inside a responsive card containing:
  - **Code Badge:** Monospace pill displaying `project.shortName` (e.g. `B-A1080`).
  - **Status Indicator:** Active status badge.
  - **Title:** Full project title (`project.fullName`), formatted with 2-line clamp and full title tooltip (`title` attribute). If `fullName` is null or empty, it MUST fall back to `shortName`.
  - **Summary / Description:** Brief project description snippet when available.
  - **Science Program Chips:** Visual chips displaying each mapped Science Program name and allocation percentage (e.g. `Breeding for Tomorrow 80%`).
  - **Create Action:** Primary CTA button labeled `+ Create result`.
- **`BIL-OVW-R-4` (Table List Presentation):** In List View, projects MUST be rendered in a dense table with columns for `Code`, `Project Title`, `Science Programs & Allocations`, and `Action`.
- **`BIL-OVW-R-5` (View Mode Switcher):** The toolbar MUST provide a toggle switch between Grid View and List View. The selected mode MUST persist during the user's active browser session.

### 6.3 Search & Empty States

- **`BIL-OVW-R-6` (Multi-Attribute Search):** The search bar MUST filter projects by matching the normalized query against:
  - `project.shortName`
  - `project.fullName`
  - `sp.spName` (Science Program full name)
  - `sp.spShortName` (Science Program short name)
  - `sp.programCode` (e.g., `SP01`, `SP04`)
- **`BIL-OVW-R-7` (Empty State):** When no projects match the combined search query and active KPI filter, the system MUST display an empty state message with a "Reset Filters" action button that clears the search input and resets the filter to "ALL".
- **`BIL-OVW-R-8` (Create Result Navigation):** Clicking `+ Create result` on any project MUST invoke `BilateralCreationService.selectProject(project)` and navigate to `/bilateral/:acronym/create`.

---

## 7. Non-Functional Requirements

| Dimension | Requirement |
|---|---|
| **Design Tokens & Theme** | MUST use PRMS 2026 brand tokens: `--pr-color-primary-300` (`#6b6dc4`), `--pr-color-primary-400` (`#6461bc`), Poppins typography, PrimeIcons (`pi pi-*`). |
| **Responsiveness** | Grid MUST adapt smoothly from 1 column on mobile (<768px), 2 columns on tablet/small laptops (768px-1200px), to 3 columns on wide screens (>1200px). |
| **Performance** | Filtering, searching, and view mode toggling MUST be computed in-memory via Angular `computed()` signals without triggering redundant HTTP calls. Instant response (<50ms). |
| **Accessibility (a11y)** | All interactive KPI cards and view toggle buttons MUST have accessible ARIA roles, labels, and keyboard focus states. Contrast ratios MUST meet WCAG 2.1 AA. |

---

## 8. Acceptance Criteria & Concrete Scenarios

### `BIL-OVW-AC-1` — KPI Cards Computation & Initial Rendering
- **GIVEN** a center with 6 bilateral projects (2 in `Breeding for Tomorrow`, 2 in `Genebank`, 2 in `Multifunctional Landscapes`, and 2 co-mapped to multiple programs)
- **WHEN** the user navigates to `/bilateral/:acronym/home`
- **THEN** the top section displays the KPI summary cards with counts: Total (6), Breeding (2), Genebank (2), Landscapes (2), and Multi-Program (2)
- **AND** the "Total Projects" card is marked as active by default
- **AND IT MUST** calculate these counts reactively based on the loaded projects array.

### `BIL-OVW-AC-2` — KPI Card Filter Interaction
- **GIVEN** the Overview page with 6 projects displayed
- **WHEN** the user clicks the "Breeding for Tomorrow" KPI card
- **THEN** the project catalog instantly filters to only show the 2 projects mapped to Breeding for Tomorrow
- **AND** the "Breeding for Tomorrow" KPI card and toolbar chip receive the active selected styling
- **AND** the project counter updates to "2 projects"
- **BUT** projects from other Science Programs must NOT be visible.

### `BIL-OVW-AC-3` — Full Title and Rich Metadata Display
- **GIVEN** a project with `shortName = "B-A1080"` and `fullName = "Genetic Diversity Preservation and International Genebank Conservation"`
- **WHEN** the project card renders in Grid View
- **THEN** both `"B-A1080"` (in code pill) and `"Genetic Diversity Preservation and International Genebank Conservation"` (as main title) are visibly rendered
- **AND** the Science Program chip shows `"Genebank 100%"`
- **AND** hovering over the title shows the full tooltip text.

### `BIL-OVW-AC-4` — Grid / List View Toggle
- **GIVEN** the user is viewing the projects in default Grid View
- **WHEN** the user clicks the List View icon button in the toolbar
- **THEN** the display switches smoothly to the dense Table View with structured columns (`Code`, `Project Title`, `Science Programs & Allocations`, `Action`)
- **AND** active search and filters remain applied
- **AND** clicking the Grid View button restores the Card Grid layout.

### `BIL-OVW-AC-5` — Multi-Attribute Search Matching
- **GIVEN** the projects list contains `"B-A1532"` with title `"Agroecological Landscape Restoration"`
- **WHEN** the user types `"Landscape"` in the search input
- **THEN** only matching projects containing `"Landscape"` in their title or Science Program name are displayed
- **AND** typing `"B-A1532"` matches the same project.

### `BIL-OVW-AC-6` — Empty State and Reset Action
- **GIVEN** the user types a search query `"nonexistent-term"`
- **WHEN** 0 projects match the query
- **THEN** the empty state is displayed with message `"No projects match your filter criteria"`
- **AND** clicking `"Reset Filters"` clears the search input, sets the filter back to ALL, and restores the full project list.

### `BIL-OVW-AC-7` — Result Creation Navigation
- **GIVEN** a project card for `"B-A1368"`
- **WHEN** the user clicks `+ Create result` on that card
- **THEN** `BilateralCreationService.selectProject(project)` is called with that project object
- **AND** the router navigates to `/bilateral/:acronym/create`.

---

## 9. Defect Classes & Verification Gate Mapping

| Defect Class | How it manifests | Verification Gate / Check |
|---|---|---|
| **Reactivity / Filter Sync Defect** | KPI card clicked but list does not filter, or search does not filter cards. | Automated Jest unit tests covering signal derivations and filter computation. |
| **Truncation / Missing Title Defect** | Long project titles break card layout or overflow without ellipsis. | Visual review against mockup + CSS regression check (`line-clamp: 2`, `text-overflow: ellipsis`). |
| **Grid / Table Toggle State Defect** | Switching view mode resets search query or loses selected filter. | Jest unit test asserting state retention across view mode switches. |
| **Navigation / Context Loss Defect** | Clicking `+ Create result` fails to pass the selected project to the creation wizard. | Jest test asserting `BilateralCreationService.selectProject` spy invocation. |
| **Visual / Design Token Drift** | Incorrect colors, wrong font, missing brand gradients. | Multimodal / manual visual audit against `docs/ux-ui/design.md` §7 and mockup. |

---

## 10. Dependencies & Assumptions

- **Upstream Dependencies:**
  - `BilateralApiService.GET_bilateralProjects(centerId)` (existing endpoint).
  - `BilateralContextService` for `centerId` and `centerAcronym` signals.
  - `BilateralCreationService` for `selectProject()` coordination.
- **Assumptions:**
  - The API payload for bilateral projects includes `shortName`, `fullName`, `summary`, and `sciencePrograms` with `spName`, `spShortName`, `programCode`, and `allocation`.
