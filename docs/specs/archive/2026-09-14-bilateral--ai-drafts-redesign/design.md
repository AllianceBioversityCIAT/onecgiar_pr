# Design Specification: Bilateral AI Draft Results Dashboard & Card Redesign

## Document Control

| Field | Value |
|---|---|
| **Spec Path** | `bilateral/ai-drafts-redesign` |
| **Slug** | `ai-drafts-redesign` |
| **Phase** | Phase 2: Design (`design.md`) |
| **Requirements** | `docs/specs/bilateral/ai-drafts-redesign/requirements.md` (`BADR-R-1` .. `BADR-R-16`, `BADR-AC-1` .. `BADR-AC-12`) |
| **Design Decisions** | `BADR-DD-1` .. `BADR-DD-7` |
| **Budget** | 3 tasks · ~220 LOC · 1 review round |
| **Author** | System Architect (session) |
| **Date** | 2026-09-14 |

---

## 1. Summary

This design specifies the frontend architecture and UI redesign for the **AI Draft Results** tab (`/bilateral/:centerAcronym/drafts`). It replaces the outdated, uninformative project filter with a modern token-aligned search-and-select dropdown displaying both project codes and titles, aligns the tab and heading terminology to "AI Draft Results", reorganizes draft cards from a rigid two-column layout into a scannable, space-efficient horizontal metadata grid with clear action button hierarchy, and establishes fluid responsive behavior across mobile, tablet, and widescreen devices.

No backend entities, database migrations, or API endpoints are modified. All enhancements live within the Angular 21 frontend client.

---

## 2. Architecture Overview

### 2.1 Where this lives in the system

- **Client Component Layer:**
  - `onecgiar-pr-client/src/app/pages/bilateral/components/bilateral-page-header/` (`BilateralPageHeaderComponent`): Hosts top-level center navigation tabs.
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/my-draft-results/` (`MyDraftResultsComponent`): Hosts the docked filter toolbar and the list of draft result cards.
- **Client Service Layer:**
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/my-draft-results/services/my-draft-results-filter.service.ts`: Handles project filtering logic and computes project options.
  - `onecgiar-pr-client/src/app/pages/bilateral/services/bilateral-ai.service.ts`: Fetches AI drafts and maps CLARISA project names.
- **API Surface:**
  - Consumes existing endpoints:
    - `GET /api/bilateral/center/ai/drafts?centerId=:centerId`
    - `GET /api/clarisa/projects/get/all` (via `ResultsApiService.GET_ClarisaProjects()`)

### 2.2 Component Interaction & Data Flow

```
[BilateralPageHeaderComponent]
  └── Renders tab: "AI Draft Results" with [draftsCount] badge
        └── Click navigates to /bilateral/:centerAcronym/drafts

[MyDraftResultsComponent]
  ├── BilateralAiService.loadAllDrafts()
  │     └── Loads drafts list & invokes loadProjectNames() via GET_ClarisaProjects()
  ├── MyDraftResultsFilterService
  │     ├── Builds options: [ { value: 'A-AG10156', code: 'A-AG10156', title: 'Climate Rice Advisory', label: 'A-AG10156 — Climate Rice Advisory' }, ... ]
  │     └── Filters drafts computed signal: allDrafts() -> drafts()
  ├── Docked Toolbar (Role "search")
  │     ├── Token-styled Project Select with search input & chevron
  │     └── Active Filter Chip (displays selected label with clear button)
  └── Work Area
        ├── Title: "AI Draft Results" + Validation guidance note
        └── List of Draft Cards (.mdr-card):
              ├── Card Header: Title + [Category Pill] [Level Pill] [Draft Status Pill]
              ├── Metadata Strip: [Project Tag] · [Program Tag] · [AI Session Tag]
              ├── Warnings: [Mapping Warnings Tags] (if present)
              └── Actions: [Review] (Secondary) · [Create Result] (Primary) · [Delete] (Danger icon)
```

---

## 3. Data Model Changes

### 3.1 Client-Side Interfaces

To provide both code and title, the interface `DraftProjectFilterOption` in `my-draft-results-filter.service.ts` is expanded:

```typescript
export interface DraftProjectFilterOption {
  value: string;
  label: string;
  code?: string;
  title?: string;
}
```

In `BilateralAiService`, `projectNameMap` will map `project_id` to an object or formatted string that combines `shortName` and `fullName`:
- If both `shortName` and `fullName` exist: `${shortName} — ${fullName}`.
- If only `fullName` exists: `fullName`.
- If only `shortName` exists: `shortName`.

### 3.2 Database & Server Entities
- **No changes.** Database schema and TypeORM entities remain unchanged.

---

## 4. API Surface

- **No changes.** All existing HTTP contracts are preserved:
  - `GET /api/bilateral/center/ai/drafts`
  - `GET /api/bilateral/center/ai/drafts/:id`
  - `POST /api/bilateral/center/ai/drafts/:id/promote`
  - `DELETE /api/bilateral/center/ai/drafts/:id`

---

## 5. Frontend & UX Component Architecture

### 5.1 Project Filter Dropdown (`BADR-DD-1`, `BADR-DD-2`)

Instead of the legacy `app-pr-filter-select` (which rendered a rigid box with an oversized purple chevron button and unstyled native dropdown), the project selector adopts a token-styled dropdown pattern:

- **Trigger Button:**
  - Height: 36px/38px, border `1px solid var(--pr-border-divider)`, background `var(--pr-surface-card)`.
  - Content: Project icon (`business`), selected project label or placeholder `"All Projects"`, and a subtle chevron icon.
  - Hover state: border `var(--pr-border-hover)`, subtle shadow.
  - Focus state: `focus-visible:shadow-[var(--pr-focus-ring)]`.
- **Dropdown Panel (Overlay / Popover):**
  - Attached via CDK Connected Overlay or dropdown container.
  - Min-width 320px, max-width 480px, max-height 320px with custom scroll.
  - Optional search input at top when options > 5: allows typing project code or keyword from title.
  - List items render with two-line or formatted presentation:
    - **Line 1 / Badge:** Bold monospace project code (e.g. `A-AG10156`).
    - **Line 2 / Secondary text:** Full project title in `12px text-[var(--pr-text-secondary)]`, truncated with ellipsis if long.
  - Clear selection option ("All Projects") at the top.

### 5.2 Card Layout & Space Distribution (`BADR-DD-4`, `BADR-DD-5`, `BADR-DD-7`)

The draft card (`.mdr-card`) is restructured into a coherent, responsive container:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ [Title of the Result..........................................] [Category] [Level] [Draft] │
│                                                                                        │
│ [🏢 Project: A-AG10156 · Title...]  [📁 Program: SP06]  [🤖 Session #9efb45af · Today] │
│                                                                                        │
│ [⚠️ Warning tags (if applicable)]                                                      │
│                                                                                        │
│ ────────────────────────────────────────────────────────────────────────────────────── │
│                                         [ 👁️ Review ]  [ ⬆️ Create Result ]  [ 🗑️ ]   │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Layout Sections:
1. **Header Zone:**
   - Result Title: `font-size: 15px`, `font-weight: 600`, color `var(--pr-text-heading)`.
   - Badges Cluster:
     - Category Pill: `font-size: 10px`, uppercase, semibold, green token (`bg-emerald-100 text-emerald-800`).
     - Level Pill: `font-size: 10px`, uppercase, semibold, neutral token (`bg-slate-100 text-slate-700`).
     - Status Pill: `font-size: 10px`, uppercase, semibold, indigo token (`bg-indigo-100 text-indigo-800`).
2. **Metadata Zone:**
   - Horizontal flex container with `gap: 12px`, `align-items: center`, `flex-wrap: wrap`.
   - Each item has an icon (16px, muted), a subtle label, and a highlighted value:
     - **Project:** Code pill (e.g. `A-AG10156`) + truncated project title with `prTooltip` containing the full project name.
     - **Program:** Program code pill (e.g. `SP06`) with `prTooltip` containing full Science Program title.
     - **AI Session:** Mono session ID (`#9efb45af`) + formatted relative date with `prTooltip` containing session UUID.
3. **Actions Zone:**
   - Desktop: Can sit on the right of the metadata row or separated in an actions cluster.
   - Distinct styling:
     - **Create Result (Primary):** Solid emerald/green CTA (`bg-emerald-600 text-white hover:bg-emerald-700` or high-emphasis green pill).
     - **Review (Secondary):** Clean border/surface CTA (`border border-sky-300 bg-sky-50 text-sky-800 hover:bg-sky-100`).
     - **Delete (Danger):** Subdued icon button with danger hover (`hover:bg-rose-100 hover:text-rose-700`).

### 5.3 Date Calculation Hardening (`BADR-DD-6`)

In `MyDraftResultsComponent.formatDate(dateStr: string)`:
- Currently, `const days = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))` returns `-1` if the draft was created slightly ahead of client time or due to UTC timezone boundaries.
- **Hardened logic:**
  - If `diff < 0 || days <= 0`: return `'Today'`.
  - If `days === 1`: return `'Yesterday'`.
  - If `days < 7`: return `${days} days ago`.
  - Otherwise: return formatted localized date (`MMM d`).

### 5.4 Responsive Breakpoint System (`BADR-DD-7`)

- **Desktop (`>= 1024px`):**
  - Card operates as full flex row or structured container.
  - Title and badges on top.
  - Metadata strip spans left and center; action buttons align to the right.
- **Tablet (`640px` to `1023px`):**
  - Metadata flexes across multiple lines if needed (`flex-wrap: wrap`).
  - Action buttons sit neatly below metadata or aligned to the right.
- **Mobile (`< 640px`):**
  - Card stacks vertically: Title -> Badges row -> Metadata tags -> Full-width action button strip.
  - Docked toolbar (`.mdr-toolbar-docked`) scales project selector to 100% width.
  - Page scroller maintains zero document overflow: `document.documentElement.scrollWidth <= clientWidth`.

---

## 6. Design Decisions

### `BADR-DD-1`: Project Filter Label Formatting
- **Decision:** Format options as `<shortName> — <fullName>` (or `<shortName>` when title is unavailable).
- **Rationale:** Center staff frequently navigate by project code (e.g. `A-AG10156`), but need the project title to know what the grant is. Showing both eliminates ambiguity.
- **Requirement Covered:** `BADR-R-1`.

### `BADR-DD-2`: Replacement of `app-pr-filter-select`
- **Decision:** Replace the dated `app-pr-filter-select` in `my-draft-results.component.html` with a token-styled dropdown selector supporting search filtering.
- **Rationale:** `app-pr-filter-select` uses hardcoded purple styles (`.custom_select`) with an invasive solid purple button that does not match the rest of the PRMS design system.
- **Requirements Covered:** `BADR-R-2`, `BADR-R-3`.

### `BADR-DD-3`: Tab and Page Title Consistency
- **Decision:** Update the tab label in `bilateral-page-header.component.html` to `"AI Draft Results"` (with badge count) and update `my-draft-results.component.html` heading to `"AI Draft Results"`.
- **Rationale:** Clarifies to users that these items originate from the AI document extraction pipeline and require human validation before becoming official bilateral results.
- **Requirements Covered:** `BADR-R-5`, `BADR-R-6`.

### `BADR-DD-4`: Grouped Horizontal Metadata Architecture
- **Decision:** Replace the 3 vertical rows with a single horizontal, wrapped metadata bar grouping Project, Program, and AI Session into distinct tag elements.
- **Rationale:** Drastically reduces dead horizontal whitespace, decreases vertical card height by ~30%, and makes scanning multiple cards faster.
- **Requirements Covered:** `BADR-R-8`, `BADR-R-10`.

### `BADR-DD-5`: Visual Hierarchy for Card Actions
- **Decision:** Apply explicit visual hierarchy: Primary `Create Result` (positive green), Secondary `Review` (soft blue), Destructive `Delete` (danger icon button).
- **Rationale:** In the current UI, `Review` and `Create Result` look nearly identical, confusing users about which action promotes the draft into a real result.
- **Requirement Covered:** `BADR-R-12`.

### `BADR-DD-6`: Relative Date Calculation Fix
- **Decision:** Guard `days <= 0` to return `'Today'`, eliminating the negative `"-1 days ago"` display.
- **Rationale:** Fixes an unsightly bug where timezone differences cause negative day offsets.
- **Requirement Covered:** `BADR-R-11`.

### `BADR-DD-7`: Responsive Fluid Breakpoints
- **Decision:** Implement Tailwind responsive utilities (`sm:`, `md:`, `lg:`) and container constraints ensuring zero document horizontal overflow.
- **Rationale:** Guarantees mobile and tablet users can review and promote drafts without clipping.
- **Requirements Covered:** `BADR-R-14`, `BADR-R-15`, `BADR-R-16`.

---

## 7. Step 2.3 Challenge Reversions

- **Trigger:** `BADR-DD-2` replaces `app-pr-filter-select` with a token-styled select.
- **Question:** *What does removing `app-pr-filter-select` break?*
- **Audit:**
  - `app-pr-filter-select` is only consumed in `my-draft-results.component.html` for project filtering via `[options]="projectFilterOptions()"`, `optionLabel="label"`, `optionValue="value"`, and `(changed)="onProjectFilterChange($event)"`.
  - The underlying state is managed by `MyDraftResultsFilterService.selectedProjectId()`.
  - An owned, token-aligned select/dropdown communicates with the exact same service signals (`selectedProjectId`, `selectProject`, `clearAll`).
  - **Verdict:** No breakage. The replacement is purely visual and structural within this isolated component.

---

## 8. Step 2.4 Size Against Design (Budget)

| Metric | Value | Justification |
|---|---|---|
| **Expected Tasks** | 3 tasks | Task 1: Filter service & dropdown; Task 2: Card UX, metadata grouping & tab title; Task 3: Responsive styling & tests |
| **Expected LOC** | ~220 LOC | HTML template improvements, SCSS responsive adjustments, service mapping enhancement, test updates |
| **Expected Review Rounds** | 1 round | Clean frontend-only scope with existing test harness |

The estimate matches the **Standard** depth. The numbers above constitute the execution budget tripwire.

---

## 9. Next Step

Proceed to Phase 3: `tasks.md` via:
```text
/akili-specify bilateral/ai-drafts-redesign
```
