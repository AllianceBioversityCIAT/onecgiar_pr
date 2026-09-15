# Proposal: Bilateral AI Draft Results Dashboard & Card Redesign

## Document Control

| Field | Value |
|---|---|
| **Spec Path** | `bilateral/ai-drafts-redesign` |
| **Slug** | `ai-drafts-redesign` — derived from intent: redesign the AI draft results tab, filter dropdown (code + title), draft card UX/UI with grouped metadata, and responsive layout |
| **Type** | Change |
| **Approval Mode** | gated |
| **Parent Spec** | none |
| **Depends on** | none |
| **Parallel-safe** | yes |
| **Author** | AKILI propose (session) |
| **Date** | 2026-09-14 |

---

## Intent

Modernize and polish the **AI Draft Results** section (`/bilateral/:centerAcronym/drafts`) of the Bilateral Center dashboard to improve usability, visual hierarchy, information density, and mobile/tablet responsiveness.

Specifically addressing the four design requirements identified from the live screen:
1. **Filters Dropdown UI & Data:** Upgrade the project filter dropdown so users see the **project title** in addition to the project code (currently showing only codes like `A-AG10156`), with modern PRMS design-token styling replacing the legacy purple-chevron select.
2. **Tab Title Alignment:** Rename the tab and page title from **"Draft Results"** to **"AI Draft Results"** (or "AI Draft Result") to explicitly reflect that these drafts originate from the AI-Assisted document analysis pipeline.
3. **Draft Card UX/UI & Metadata Grouping:** Restructure the draft result cards to eliminate dead horizontal whitespace, group metadata logically (Project, Program, AI Session, relative date), and establish clear visual hierarchy between the title, badges, and action buttons (`Review`, `Create Result`, `Delete`).
4. **Responsive Layout:** Ensure fluid, accessible presentation across viewports (375px mobile, 768px tablet, 1024px+ desktop) with zero horizontal document overflow.

---

## Problem / Current Behavior

The current page at `/bilateral/:centerAcronym/drafts` (`MyDraftResultsComponent`) has several UX/UI deficiencies:

1. **Project Filter Dropdown (`orca-paste-1789417080677-8d7beb69-62aa-45b3-a22b-7ec394365756.png`):**
   - Uses `app-pr-filter-select`, which renders an outdated input box with a solid purple chevron button.
   - The dropdown list displays only raw project codes (e.g. `A-AG10156`, `A-AG10171`), making it difficult for center staff to identify projects without memorizing internal alphanumeric IDs.
   - `BilateralAiService.loadProjectNames()` maps `map[p.id] = p.shortName ?? p.fullName`, discarding `fullName` whenever `shortName` is present.

2. **Tab & Page Header Naming (`orca-paste-1789417140027-dd12c735-9fba-4a12-a1d4-1ccbc2ffb82d.png`):**
   - The tab reads **"Draft Results"** with a numeric badge.
   - In PRMS, "Draft" is also a general result lifecycle status (status 8 or editing). Users can confuse general drafts with AI-extracted candidates pending validation. Naming it **"AI Draft Results"** clarifies that these items come from AI document processing.

3. **Card Layout & Metadata Grouping (`orca-paste-1789417200657-4bb9b287-3af1-44d7-8d25-be444d90715b.png`):**
   - The card divides into two rigid horizontal columns (`.mdr-card-main` and `.mdr-card-side`).
   - The left column stacks metadata vertically in 3 separate rows (`PROJECT`, `PROGRAM`, `AI SESSION`), creating tall cards with large blank gaps in the middle.
   - The relative date calculation in `formatDate` has a timezone/rounding bug that displays `"-1 days ago"` for recent drafts created on the same UTC day.
   - Action buttons (`Review`, `Create Result`, `Delete`) share equal visual weight without clear primary/secondary hierarchy.

4. **Responsive Brittleness:**
   - On viewports < 900px, the fixed width docked toolbar (`w-[260px]`) and the two-column card layout do not wrap gracefully, causing metadata or buttons to crowd or clip.

---

## Proposed Outcome

1. **Enhanced Project Filter Dropdown:**
   - Option labels format both code and title: e.g., `A-AG10156 — Accelerating Impacts of CGIAR Climate Research for Africa` (or code pill + title).
   - Modernized styling aligned with PRMS design tokens (`docs/ux-ui/design.md`), featuring a clean border, rounded corners, search-filter capability for fast lookup, and clear active selection state.
2. **Cohesive Tab & Heading Identity:**
   - Tab in `BilateralPageHeaderComponent` renamed to **"AI Draft Results"** (with badge count retained).
   - Page title in `MyDraftResultsComponent` updated to **"AI Draft Results"** (or singular variant per user preference).
3. **Restructured & Grouped Card UX:**
   - **Header:** Bold result title with category badge (e.g. `Capacity sharing for development`), level pill (`Output` / `Outcome`), and status pill (`Draft`).
   - **Metadata Grouping:** A horizontal, scannable metadata grid/flex row:
     - **Project:** Code badge + project name (truncated with full tooltip).
     - **Contributing Program:** Program code + SP name tooltip.
     - **AI Session:** Run hash with creation date (e.g. `#9efb45af · Today`), fixing the negative days bug.
   - **Action Cluster:** High-contrast, standard button hierarchy:
     - Primary: **Create Result** (solid green emphasis).
     - Secondary: **Review** (clean outline / subtle surface with eye icon).
     - Destructive: **Delete** (icon button with danger hover and confirmation modal).
4. **Fluid Responsive Behavior:**
   - Mobile (< 640px): Cards stack vertically (Title → Badges → Metadata tags → Full-width button bar).
   - Tablet (640px–1024px): Compact multi-line metadata grid with right-aligned action buttons.
   - Desktop (1024px+): Generous horizontal space distribution, balanced card proportions.

---

## Scope

| In scope | Out of scope |
|---|---|
| Project dropdown UI replacement and label enhancement (Code + Title) | Backend AI processing / extraction pipeline (`POST /api/bilateral/center/ai/upload`) |
| `BilateralAiService.loadProjectNames()` or project map enhancement to supply full titles | Modifying the promote endpoint (`POST /api/bilateral/center/ai/drafts/:id/promote`) |
| Tab label change in `BilateralPageHeaderComponent` | Changing draft preview drawer internals (`DraftResultCardComponent`, `DraftEvidenceListComponent`) |
| Card layout redesign in `MyDraftResultsComponent` (HTML, SCSS, responsive CSS) | Changing bilateral result editor pages (`/bilateral/:center/result/:id`) |
| Bugfix for `formatDate` (`-1 days ago` issue) | Changes to other bilateral tabs (Overview, Reporting, Results) |
| Unit test updates in `my-draft-results.component.spec.ts` and `bilateral-page-header.component.spec.ts` | |

---

## Non-Goals

- Altering the underlying AI draft database schema or TypeORM entities.
- Introducing new filter dimensions beyond Project (Search/Category can be considered in a future enhancement).
- Changing the confirmation dialog for Promote or Discard.

---

## Affected Users, Systems, And Specs

| Actor | Impact |
|---|---|
| **Center Bilateral Submitter** | Easily finds drafts by project title; clearly understands that drafts are AI-assisted; enjoys a clean, responsive card layout |
| **Center Focal Point** | Efficiently scans AI sessions and promotes or discards drafts with clear action hierarchy |

| Area | Indicative Files / Modules |
|---|---|
| Drafts Page | `onecgiar-pr-client/src/app/pages/bilateral/pages/my-draft-results/my-draft-results.component.{ts,html,scss,spec.ts}` |
| Filter Service | `onecgiar-pr-client/src/app/pages/bilateral/pages/my-draft-results/services/my-draft-results-filter.service.{ts,spec.ts}` |
| Bilateral Header | `onecgiar-pr-client/src/app/pages/bilateral/components/bilateral-page-header/bilateral-page-header.component.{html,spec.ts}` |
| AI Service | `onecgiar-pr-client/src/app/pages/bilateral/services/bilateral-ai.service.ts` |
| UX Baseline | `docs/ux-ui/design.md` §7 (Design Tokens), §8 (Card & Dropdown patterns) |

---

## Visual Reference

- **Source:** User-provided screenshots saved under spec directory:
  - Full Page Overview: [`docs/specs/bilateral/ai-drafts-redesign/mockup/main-screen.png`](file:///Users/jcadavid/orca/workspaces/onecgiar_pr/qa-development-2026/docs/specs/bilateral/ai-drafts-redesign/mockup/main-screen.png)
  - Current Filter Dropdown: [`docs/specs/bilateral/ai-drafts-redesign/mockup/filters-dropdown.png`](file:///Users/jcadavid/orca/workspaces/onecgiar_pr/qa-development-2026/docs/specs/bilateral/ai-drafts-redesign/mockup/filters-dropdown.png)
  - Current Tab Title: [`docs/specs/bilateral/ai-drafts-redesign/mockup/tab-title.png`](file:///Users/jcadavid/orca/workspaces/onecgiar_pr/qa-development-2026/docs/specs/bilateral/ai-drafts-redesign/mockup/tab-title.png)
  - Current Card Metadata Layout: [`docs/specs/bilateral/ai-drafts-redesign/mockup/draft-card-metadata.png`](file:///Users/jcadavid/orca/workspaces/onecgiar_pr/qa-development-2026/docs/specs/bilateral/ai-drafts-redesign/mockup/draft-card-metadata.png)

---

## Requirement Delta Preview

### ADDED Requirements
- Project dropdown option labels display both project code and full project name (`[Code] - [Full Name]`).
- Project dropdown incorporates filter search when list has multiple projects.
- Card metadata grouped horizontally into clear visual badges/chips (Project, Program, AI Session, Date).
- Responsive breakpoint layout (`< 640px`, `640px-1024px`, `> 1024px`).

### MODIFIED Requirements
- Tab title in `BilateralPageHeaderComponent` changed from "Draft Results" to "AI Draft Results" (or "AI Draft Result").
- Page header in `MyDraftResultsComponent` updated to match the AI draft terminology.
- Card action buttons reorganized with distinct visual hierarchy (Primary `Create Result`, Secondary `Review`, Destructive `Delete`).
- Date formatting algorithm adjusted so same-day or slight timezone differences return `"Today"` instead of `"-1 days ago"`.

### REMOVED Requirements
- Removed reliance on the legacy purple-chevron `app-pr-filter-select` in the docked filter toolbar.

---

## Approach Options

### Option A: Minimal In-Place Restyle
- Keep existing `app-pr-filter-select` but adjust label formatting in `my-draft-results-filter.service.ts`.
- Minor CSS adjustments to `.mdr-card-meta` to display inline-flex.
- **Trade-offs:** Fast to implement, but leaves the dated purple-block select intact and does not solve the responsiveness or UX hierarchy cleanly.

### Option B (Recommended): Token-Aligned Modern PRMS Dropdown & Responsive Card Architecture
- Replace `app-pr-filter-select` with a token-styled dropdown/popover matching `docs/ux-ui/design.md` §8 (clean border, search filter, code pill + title).
- Refactor `projectNameMap` / options to format project code and full title.
- Redesign `.mdr-card` with flex/grid responsive structure: top header with title and category pills, horizontal metadata bar, and clear action button group.
- Update tab and page headers to "AI Draft Results".
- **Trade-offs:** Clean, standard PRMS look-and-feel, highly readable, perfectly responsive, and zero regression risk to other pages.

### Option C: Tabular Redesign (Like Bilateral Review)
- Convert the entire draft results view from cards into an interactive table (similar to `BilateralReviewComponent`).
- **Trade-offs:** While tabular lists work well for review lists, AI draft results are candidates awaiting manual inspection with rich metadata, warnings, and source evidence. Cards are better suited for progressive preview and promotion. Overcomplicates the scope.

---

## Recommended Approach

**Option B** is recommended. It delivers exactly what the user requested:
1. Clear, informative project dropdown with both code and project title.
2. Distinct, professional AI identity on the tab ("AI Draft Results").
3. Well-distributed card space with grouped metadata and clear visual hierarchy.
4. Robust responsive behavior from mobile to widescreen.

---

## Risks, Dependencies, And Open Questions

1. **Open Question (Naming):** User noted *"dice Draft Results pero deberia decir AI Draft Result ya que esto viene del AI Assissted"*.
   - Should the tab and page title use singular (**"AI Draft Result"**) or plural (**"AI Draft Results"**)?
   - *Recommendation:* Plural **"AI Draft Results"** with the numeric badge (`AI Draft Results 9`), which matches standard PRMS tabs (`Results`, `My Results`, `Draft Results`).
2. **Project Name Length:** Some CLARISA project titles can be 100+ characters long.
   - *Mitigation:* Format dropdown items with fixed/bold code, followed by truncated title with tooltip on hover.

---

## Success Criteria

1. On `/bilateral/:centerAcronym/drafts`, the tab reads **"AI Draft Results"** and the page heading reflects the AI draft context.
2. The project dropdown displays both project code and full project name (e.g. `A-AG10156 - Project Title`).
3. The project dropdown matches PRMS modern styling (tokens, hover, focus ring, search filter).
4. Draft cards have an intuitive layout: Title + badges on top, horizontal grouped metadata in the middle, and distinct action buttons on the right/bottom.
5. Relative dates never show negative values (`"-1 days ago"`).
6. The section renders cleanly on mobile (375px), tablet (768px), and desktop (1280px+) with no horizontal scrollbar overflow.
7. All existing unit tests pass and new assertions cover the changes.

---

## Next Step

```text
/akili-specify bilateral/ai-drafts-redesign
```
