# Module Spec: Bilateral AI Draft Results Dashboard & Card Redesign

## 1. Module / Feature

- **Module:** `bilateral`
- **Sub-feature:** `ai-drafts-redesign`
- **Owner:** Center Bilateral Lead / AI Assisted Reporting Team
- **Status:** `draft`
- **Ticket(s):** Follows `P2-3169`, `P2-3315`, `P2-3319`
- **Spec Path:** `docs/specs/bilateral/ai-drafts-redesign/requirements.md`

---

## 2. Context

The Bilateral Center dashboard provides an AI-assisted reporting flow where Center users upload project documents, and the backend extraction pipeline produces preliminary candidate result drafts. Users review these candidate drafts on the **AI Draft Results** tab (`/bilateral/:centerAcronym/drafts`), preview the extracted data and source evidence, and decide whether to promote them into official bilateral results or delete them.

While functional, the current interface has several usability and aesthetic deficiencies:
1. **Uninformative Project Filter:** The project dropdown only shows internal project codes (e.g. `A-AG10156`), omitting project titles. Users cannot easily identify which project they are filtering by. Furthermore, the dropdown utilizes an obsolete `app-pr-filter-select` with a solid purple chevron button that clashes with the modern PRMS token system.
2. **Ambiguous Tab & Heading Naming:** The tab and page header are titled "Draft Results". In PRMS, "Draft" is also a common lifecycle status across results, leading users to believe this is a general drafts tab rather than the dedicated AI-Assisted document extraction review queue.
3. **Inefficient Card Space Distribution & Metadata Grouping:** Metadata (Project, Program, AI Session) is stacked in 3 vertical lines on the left, leaving large empty whitespace across the center of the card. Action buttons lack visual hierarchy, and a date calculation bug produces negative relative dates (`"-1 days ago"`).
4. **Responsive Brittleness:** On viewports under 900px and mobile screens (375px), the fixed 260px toolbar and the side-by-side card layout do not wrap gracefully.

This specification modernizes the tab and page identity, improves project filter data and presentation, restructures the draft cards into a scannable, space-efficient layout, and guarantees responsive behavior from 375px to widescreen.

### Constitutional & Architecture References
- `docs/prd.md`: Goal G2 (High-quality data capture), US-S1 (Submitter result reporting), AC-1 (Typed result integrity), AC-3 (Role-gated actions).
- `docs/ux-ui/design.md`: §7 Design Tokens (colors, spacing, typography), §8 Components (Card patterns, Dropdowns, Badges), §10 Accessibility (WCAG 2.1 AA).
- `docs/trd/trd.md`: Workflow W1/W3 (Bilateral reporting and result creation).
- Proposal: `docs/specs/bilateral/ai-drafts-redesign/proposal.md`.

---

## 3. In Scope / Out of Scope

### In Scope
- **Project Filter Data & UI:**
  - Formatting project options to show both project code and full project name (`[Code] - [Full Name]`).
  - Replacing legacy `app-pr-filter-select` with a modern, token-styled select/dropdown with search filtering.
  - Active filter chip reflecting the code + title with a one-click clear button.
- **Tab & Header Terminology:**
  - Updating the tab title in `BilateralPageHeaderComponent` to **"AI Draft Results"** with preserved numeric badge.
  - Updating the page title and introductory text in `MyDraftResultsComponent` to **"AI Draft Results"**.
- **Card UX/UI & Metadata Grouping:**
  - Header: Bold result title + grouped badges (Indicator category, Level Output/Outcome, Draft status).
  - Horizontal grouped metadata bar (Project code badge with title tooltip, Contributing SP, AI Session run ID and formatted date).
  - Action button hierarchy: Primary `Create Result` (positive green), Secondary `Review` (subtle surface/outline), Destructive `Delete` (danger icon button).
  - Date calculation hardening: Preventing negative relative dates (`"-1 days ago"` -> `"Today"`).
- **Responsive Layout:**
  - Fluid card wrapping on mobile (< 640px), tablet (640px–1024px), and desktop (1024px+).
  - Zero document horizontal overflow across all viewports.
- **Automated Unit Tests:**
  - Unit tests in `my-draft-results.component.spec.ts`, `my-draft-results-filter.service.spec.ts`, and `bilateral-page-header.component.spec.ts`.

### Out of Scope
- Modifying backend AI extraction pipelines, prompt templates, or document processing lambdas.
- Modifying the promote endpoint (`POST /api/bilateral/center/ai/drafts/:draftId/promote`).
- Modifying the read-only preview drawer internals (`DraftResultCardComponent`, `DraftEvidenceListComponent`).
- Introducing extra filter dimensions (such as Search or Category) beyond Project in this release.

---

## 4. Personas Affected

| Persona | What Changes for Them |
|---|---|
| **Center Bilateral Submitter** | Immediately identifies projects by title instead of raw code; clearly understands drafts are AI-generated; reviews drafts faster with scannable horizontal metadata. |
| **Center Focal Point / Leader** | Distinguishes between primary and secondary actions on each draft card; experiences seamless mobile/tablet review without layout breakage. |
| **Science Program Reviewer** | Unaffected — receives standard promoted bilateral results when the center completes draft promotion. |

---

## 5. User Stories

- **`BADR-US-1`** — *As a Center Bilateral Submitter*, I want the project filter to show both the project code and its full title, so that I can quickly find drafts belonging to a specific grant without memorizing project IDs.
- **`BADR-US-2`** — *As a Center User*, I want the dashboard tab and page header to clearly say "AI Draft Results", so that I immediately know these are AI-extracted candidates pending my validation.
- **`BADR-US-3`** — *As a Center Reviewer*, I want draft cards to present metadata in a clean, grouped horizontal layout with distinct action buttons, so that I can scan key information efficiently without wasted screen space.
- **`BADR-US-4`** — *As a Mobile/Tablet User*, I want the draft results section to adapt gracefully to my screen size, so that buttons and metadata do not clip or cause horizontal scrolling.

---

## 6. Functional Requirements

### Project Filter (BADR-R-1 .. BADR-R-4)

- **`BADR-R-1`** The project filter option labels SHALL display both the project code (`shortName`) and the full project title (`fullName`). When a title is available, the format SHALL be `<shortName> — <fullName>`. If only one is present, it SHALL fall back to whichever is available.
- **`BADR-R-2`** The project filter dropdown SHALL be styled using PRMS design tokens (`--pr-border`, `--pr-surface-card`, `--pr-text-heading`, `--pr-focus-ring`), replacing the legacy purple chevron select shell.
- **`BADR-R-3`** When more than 5 project options exist in the dropdown, the selector SHALL provide an inline search filter input to quickly narrow options.
- **`BADR-R-4`** When a project filter is active, the active filter chip SHALL render the project label with a clear dismiss button, and the count subtitle SHALL report `"Showing M of N drafts"`.

### Tab & Page Identity (BADR-R-5 .. BADR-R-7)

- **`BADR-R-5`** In `BilateralPageHeaderComponent`, the third tab SHALL read **"AI Draft Results"** and maintain the active indicator badge displaying the count of available drafts.
- **`BADR-R-6`** In `MyDraftResultsComponent`, the page title heading (`<h2>`) SHALL read **"AI Draft Results"**.
- **`BADR-R-7`** The validation guidance note under the title SHALL explicitly explain that AI-generated drafts require Center validation before becoming official bilateral results.

### Draft Card Layout & Metadata Grouping (BADR-R-8 .. BADR-R-13)

- **`BADR-R-8`** Each draft card SHALL display the result title prominently with clear typography (font-size 15px/16px, semibold, `--pr-text-heading`).
- **`BADR-R-9`** Result badges SHALL be grouped cohesively in the card header:
  - Indicator Category pill (e.g. `CAPACITY SHARING FOR DEVELOPMENT`, green token surface `#D1FAE5` / text `#065F46`).
  - Result Level pill (`OUTPUT` or `OUTCOME`, neutral token surface `#F1F5F9` / text `#475569`).
  - Status pill (`DRAFT`, indigo/blue token surface `#E0E7FF` / text `#4338CA`).
- **`BADR-R-10`** Card metadata SHALL be displayed in a horizontal, scannable flex/grid container instead of 3 standalone vertical rows:
  - Project tag: Project icon + project code badge + truncated project title with full title tooltip.
  - Program tag: Layers icon + contributing Science Program code with full SP name tooltip.
  - AI Session tag: Smart toy icon + session short hash (`#<hash>`) + relative date with full session UUID tooltip.
- **`BADR-R-11`** The relative date calculation (`formatDate`) SHALL handle timezone and timestamp variance without displaying negative values (e.g., `days <= 0` SHALL return `"Today"`).
- **`BADR-R-12`** Card action buttons SHALL have clear visual hierarchy:
  - Primary CTA: **Create Result** (icon `arrow_upward`, green surface `#F0FDF4`, border `#86EFAC`, text `#166534`, hover feedback).
  - Secondary CTA: **Review** (icon `visibility`, blue surface `#EFF6FF`, border `#BFDBFE`, text `#1E40AF`, hover feedback).
  - Destructive CTA: **Delete** (icon `delete_outline`, danger hover surface `#FEE2E2`, border `#FECACA`, text `#991B1B`).
- **`BADR-R-13`** Any mapping warnings (`mapping_warnings`) SHALL render as amber warning tags below the metadata strip.

### Responsive Behavior (BADR-R-14 .. BADR-R-16)

- **`BADR-R-14`** At viewports >= 1024px (desktop), draft cards SHALL distribute information across the available width with metadata in a horizontal strip and actions right-aligned.
- **`BADR-R-15`** At viewports between 640px and 1023px (tablet), metadata tags SHALL wrap cleanly into a 2-column or flex-wrap strip, maintaining card integrity.
- **`BADR-R-16`** At viewports < 640px (mobile), draft cards SHALL stack vertically: Header & Badges -> Metadata Tags -> Full-width or wrapped Action Buttons bar. The entire page SHALL satisfy `document.documentElement.scrollWidth <= clientWidth` (zero horizontal overflow).

---

## 7. Defect Gates & Verification Commands

| Defect Class | How it Surfaces | Verification Gate |
|---|---|---|
| **D1: Truncated Project Info** | Dropdown options only show code without full project title | Unit test in `my-draft-results-filter.service.spec.ts` asserting label format `<shortName> — <fullName>` |
| **D2: Stale Tab/Header Title** | Tab or heading still says "Draft Results" instead of "AI Draft Results" | Unit tests in `bilateral-page-header.component.spec.ts` & `my-draft-results.component.spec.ts` asserting `'AI Draft Results'` |
| **D3: Negative Relative Date** | Date renders `"-1 days ago"` for items created today | Unit test for `formatDate()` with negative ms or same-day date asserting `'Today'` |
| **D4: Card Action Hierarchy** | Buttons have indistinguishable visual weights or missing accessible tooltips | Jest template specs asserting button classes, testids, and tooltips |
| **D5: Horizontal Viewport Overflow** | Layout overflows horizontally on 375px/768px viewports | Responsive unit/SCSS check; container query / max-width assertions |
| **D6: Regression on Existing Flow** | Promote modal confirmation or Review aside fail to open | Existing suite passes: `my-draft-results.component.spec.ts` (promote and review tests) |

---

## 8. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Performance** | Filtering drafts by project SHALL be instantaneous (< 16ms client-side signal computed). |
| **Accessibility** | All interactive buttons and dropdowns SHALL support keyboard navigation (Tab/Enter/Space), carry `aria-label` or `prTooltip`, and meet WCAG 2.1 AA color contrast (minimum 4.5:1 for body text, 3:1 for large text/badges). |
| **Design Consistency** | Colors, radii, typography, and borders SHALL strictly consume tokens from `docs/ux-ui/design.md` §7 and `src/styles/variables.scss`. |
| **Test Coverage** | Client Jest tests SHALL achieve 100% pass rate across touched suites with no regression in overall coverage. |

---

## 9. Acceptance Criteria

| ID | Scenario | Given | When | Then |
|---|---|---|---|---|
| `BADR-AC-1` | Project filter options format | Drafts loaded with project `A-AG10156` named "Climate Rice Advisory" | The user opens the Project filter dropdown | The option label renders `"A-AG10156 — Climate Rice Advisory"`. |
| `BADR-AC-2` | Project filter fallback | Drafts loaded with project ID `A-AG99999` not found in CLARISA names map | The user opens the Project filter dropdown | The option falls back to `"A-AG99999"` without error or blank text. |
| `BADR-AC-3` | Active project filter chip | An active project filter is selected | The filter bar renders | A dismissible chip displays `"Project: A-AG10156 — Climate Rice Advisory"` with a close button that resets the filter. |
| `BADR-AC-4` | Header tab title | The Bilateral center page header renders | The user inspects navigation tabs | Tab 3 displays `"AI Draft Results"` with the active draft count badge. |
| `BADR-AC-5` | Page heading | The AI Draft Results tab is active | The main work area renders | The title heading reads `"AI Draft Results"`. |
| `BADR-AC-6` | Card badges grouping | A draft card renders | The user views the card header | Result title is followed by Indicator Category pill, Result Level pill, and Draft status pill. |
| `BADR-AC-7` | Horizontal metadata strip | A draft card renders on desktop (>= 1024px) | The card content renders | Project, Program, and AI Session metadata render in a horizontal grouping with respective icons and tooltips. |
| `BADR-AC-8` | Date formatting resilience | A draft was created within the last 24 hours (or timezone shift causes slight negative delta) | `formatDate` executes | It returns `"Today"`, never `"-1 days ago"`. |
| `BADR-AC-9` | Action button hierarchy | A draft card renders | The user inspects action buttons | `Create Result` has primary green emphasis, `Review` has secondary blue outline, and `Delete` renders with danger icon button styling. |
| `BADR-AC-10` | Responsive layout (mobile) | Viewport is 375px wide | The draft cards render | Cards stack title, metadata, and buttons vertically without horizontal document overflow (`scrollWidth <= clientWidth`). |
| `BADR-AC-11` | Review aside trigger | The user clicks **Review** on a draft card | Click event fires | The preview aside drawer opens with the selected draft details. |
| `BADR-AC-12` | Promote dialog trigger | The user clicks **Create Result** on a draft card | Click event fires | The promote confirmation modal opens requiring Center validation confirmation. |

---

## 10. Dependencies & Assumptions

### Dependencies
- `BilateralAiService.projectNameMap()` / `loadProjectNames()`: Consumes `GET_ClarisaProjects()` from `ResultsApiService`.
- `BilateralContextService`: Supplies active center acronym.
- `BilateralPageHeaderComponent`: Hosts the top-level bilateral dashboard tabs.

### Assumptions
- `GET_ClarisaProjects()` provides `shortName` (code) and `fullName` (title) for CLARISA bilateral projects.
- AI drafts always belong to a valid job with `project_id`, `program_code`, and `created_date`.

---

## 11. Open Questions

- None. (Naming confirmed: using **"AI Draft Results"** in plural with the numeric badge, matching PRMS conventions).

---

## Required Cross-References
- `docs/prd.md` (§3 Personas, US-S1, AC-1, AC-3)
- `docs/ux-ui/design.md` (§7 Tokens, §8 Components, §10 A11y)
- `docs/trd/trd.md` (§4 Module Architecture, Bilateral Reporting)
- `docs/specs/bilateral/ai-drafts-redesign/proposal.md`
