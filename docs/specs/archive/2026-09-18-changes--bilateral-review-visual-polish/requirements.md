# Bilateral Review Visual & UX/UI Polish — Requirements

## 1. Module / Feature

- **Module:** `bilateral` (Angular client)
- **Sub-feature:** `bilateral-review-visual-polish`
- **Owner:** Senior UX/UI Designer & Frontend Engineer
- **Status:** `in-review`
- **Ticket(s):** Visual UX/UI Refinement (SP Bilateral Review)

---

## 2. Context

The Bilateral Review view (`/result-framework-reporting/entity-details/SP01/bilateral-review?tocView=aows`) allows Science Program Leads and QA Reviewers to evaluate and act upon bilateral results submitted by research centers. While previous specs (`changes/bilateral-review-hierarchy-ux` and `changes/bilateral-review-viewport-and-table-polish`) stabilized the functional architecture, responsive viewport constraints, and grouped collapse memory, the current visual presentation exhibits noticeable UX/UI polish deficiencies.

Specifically, the UI suffers from visual banding (a 3-layer header "zebra sandwich"), unbranded color classes (`indigo-*` instead of PRMS `--pr-color-primary-*` / brand tokens), low-contrast table headers that fail WCAG readability recommendations ("gray text on gray background"), unstyled in-card quick filters, aggressive truncation of the ToC Alignment column, and an awkward monospace font applied to alphanumeric submission dates.

This specification defines the functional and non-functional visual requirements to elevate the Bilateral Review surface to enterprise design standards using `ui-ux-pro-max` intelligence, preserving 100% of underlying reactive logic, component inputs/outputs, and Cypress/Jest test contracts.

PRD Links: `docs/prd.md` (G2 Result Quality, US-Q1 QA Review Queue, AC-1 Typed Result Integrity).

---

## 3. In Scope / Out of Scope

### In Scope
- Harmonizing accordion card headers using PRMS brand tokens (`brand-50`, `brand-700`, `border-brand-200`) and refined disclosure chevron styling.
- Upgrading the In-Card Quick Filter toolbar into an integrated, elegant segmented control.
- Enhancing table header (`<thead>`) contrast and typography to meet WCAG AA standards.
- Refining row visual balance, result code prominence (`font-mono text-slate-700 font-semibold`), and sans-serif tabular dates (`text-xs tabular-nums text-slate-500`).
- Optimizing Theory of Change (ToC) Alignment cell formatting to maximize legibility and visual scannability.
- Elevating the Actions column "Review" button styling and smoothing the sticky table border.
- Full preservation of all `data-testid` attributes and semantic DOM roles required by Cypress component tests.

### Out of Scope
- Any change to business logic, data models (`ResultToReview`, `BilateralReviewGroup`), or API payload contracts.
- Any change to review drawer behavior, decision submission, or notification triggers.
- Re-architecting the table layout engine (the single shared `<colgroup>` with `table-fixed` must remain).

---

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| **QA Reviewer** | Clearer visual hierarchy, high-contrast readable data grids, immediate scannability of result titles and ToC alignment, reduced sensory fatigue during bulk review sessions. |
| **Science Program Lead** | Professional, polished executive view of portfolio contributions with distinct status awareness and seamless navigation. |
| **Frontend Developer** | Clean, maintainable Tailwind utility classes strictly mapped to design tokens, avoiding fragmented ad-hoc color styles. |

---

## 5. User Stories

- **`BVP-US-1` (Brand Harmony & Clean Accordion):** As a reviewer, I want the project and center accordion cards to reflect the official PRMS brand theme and offer clean disclosure controls, so that the interface feels cohesive with the rest of the application.
- **`BVP-US-2` (High-Contrast, Legible Table Grid):** As a reviewer, I want table headers and data columns to have crisp contrast and readable typography, so that I can scan result codes, titles, and dates effortlessly without eye strain.
- **`BVP-US-3` (Actionable Alignment Data):** As a reviewer, I want the Theory of Change Alignment column to present outcome indicators clearly, so that I can immediately judge relevance without squinting at cut-off text.
- **`BVP-US-4` (Refined Filter & Action Controls):** As a reviewer, I want the in-card filters and review action buttons to feel responsive and clearly interactive, so that my review workflow is smooth and deliberate.

---

## 6. Functional Requirements

### Required (MUST)

- **`BVP-R-1` (Brand Token Alignment on Project Headers):**
  The system MUST render the project code badge and disclosure chevron box using PRMS brand tokens (`brand-50`, `brand-700`, `border-brand-200` or equivalent `--pr-color-primary-*` tokens), replacing all hardcoded `indigo-*` palette classes.

  #### Scenario: Project header renders with brand tokens
  - GIVEN a bilateral review group in project mode with code `T-PJ-003262`
  - WHEN the group header is rendered
  - THEN the project code chip `[data-testid="bilateral-review-project-code"]` SHALL use `bg-brand-50` (or `bg-violet-50`), `text-brand-700`, and `border-brand-200`
  - AND the chevron box SHALL use neutral or brand-accent styling with smooth rotation transitions
  - BUT it MUST NOT contain unbranded `text-indigo-*` or `bg-indigo-*` classes.

- **`BVP-R-2` (Integrated In-Card Filter Segmented Control):**
  The system MUST render in-card quick filters (`distinctCardTypes` and `distinctCardCenters`) as a unified segmented control with a clean container, subtle divider, and distinct active pill indicator.

  #### Scenario: User toggles in-card quick filter
  - GIVEN an expanded project card containing results of multiple types
  - WHEN the in-card filter toolbar is rendered
  - THEN the active filter pill SHALL be styled with high contrast (`bg-white shadow-2xs font-semibold text-brand-700`)
  - AND inactive pills SHALL display smooth hover states (`hover:bg-white/60 text-slate-600`)
  - AND the toolbar container SHALL visually blend into the card interior without creating a discordant grey stripe.

- **`BVP-R-3` (High-Contrast Accessible Table Headers):**
  The system MUST style table headers (`<th>`) with high-contrast text (`text-slate-600` or `--pr-text-secondary`, font-semibold, tracking-wider) and a crisp border, meeting WCAG AA contrast ratio (> 4.5:1).

  #### Scenario: Table header contrast compliance
  - GIVEN any expanded grouped table or flat review table
  - WHEN the table header row `[headerRowTpl]` is rendered
  - THEN header cells SHALL NOT use muted grey text on a grey background (`!text-[var(--pr-text-muted)]` on `!bg-[var(--pr-surface-app)]`)
  - AND the text contrast against its immediate background SHALL meet or exceed 4.5:1.

- **`BVP-R-4` (Result Code & Submission Date Typography):**
  The system MUST render result codes with prominent readable contrast (`font-mono text-xs font-semibold text-slate-700`) and submission dates in standard sans-serif with tabular numbers (`text-xs tabular-nums text-slate-600`).

  #### Scenario: Clean scannable codes and dates
  - GIVEN a result row with code `8594` and submission date `2026-07-06`
  - WHEN the row is rendered
  - THEN the result code value SHALL be clearly legible in `text-slate-700` with mono spacing
  - AND the submission date SHALL display as `6 Jul 2026` in standard sans-serif with tabular numbers (no monospace font applied to month text).

- **`BVP-R-5` (Theory of Change Alignment Formatting):**
  The system MUST format the ToC Alignment cell with improved visual hierarchy, rendering the code and title with optimal line-height (`leading-snug`) and subtle secondary styling for the indicator.

  #### Scenario: Legible ToC Alignment representation
  - GIVEN a result with a non-placeholder `toc_title` and `indicator`
  - WHEN the alignment cell is rendered
  - THEN the ToC title SHALL render with clear text contrast and comfortable line-height
  - AND the indicator line SHALL render in subtle text (`text-[11px] text-slate-500`) below the title
  - AND the copy button SHALL reveal smoothly on row hover.

- **`BVP-R-6` (Refined Sticky Actions Column):**
  The system MUST render the sticky Actions column with a subtle boundary shadow/divider and an elevated "Review" button that provides clear affordance without visual harshness.

  #### Scenario: Review button affordance
  - GIVEN a result row where the user has review permission (`canReviewRow() === true`)
  - WHEN the row action button is rendered
  - THEN the button SHALL render with clear interactive affordance (`text-brand-700 hover:bg-brand-50 rounded-md font-semibold`)
  - AND the sticky right cell background SHALL match the row hover state seamlessly.

### Should (SHOULD)

- **`BVP-R-7` (Group Header Summary Pill Balance):**
  The system SHOULD present the right-hand group summary ("N results", "N pending") with balanced visual weight, avoiding disparate styling between total count and pending count.

---

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Accessibility** | All text and UI components MUST achieve WCAG 2.1 AA color contrast (>= 4.5:1 for body/headers, >= 3:1 for large text/badges). |
| **Performance** | Pure CSS/Tailwind changes; zero JavaScript runtime overhead; layout rendering time unchanged. |
| **Responsive Integrity** | Mobile and narrow viewport layouts (< 900px) MUST maintain single-scroller contract (`isNarrow`) without horizontal overflow. |
| **Backwards Compatibility** | All existing `data-testid` selectors and ARIA attributes MUST be 100% preserved. |

### Defect Classes & Verification Gate Mapping

| Defect Class | Detection Gate / Command | Substitute Check (if automated check blind) |
|---|---|---|
| **Syntax / Build Regression** | `npx tsc --noEmit -p tsconfig.app.json` | Automated compiler check |
| **Contract / Selector Regression** | `npx jest bilateral-review-table.component.spec.ts --silent` | Automated unit test suite (32 suites) |
| **Horizontal Overflow / Viewport Breakage** | `npx cypress run --component --spec "**/bilateral-review-table.cy.ts"` | Automated Cypress component layout gates |
| **Color Contrast & Visual Dissonance** | Cypress component test visual assertions + HITL visual inspection | Human-in-the-loop review on live local server (`http://qa-development-2026.orca.localhost:63760`) |
| **Lint / Style Guide Drift** | `npx ng lint --quiet` | Automated ESLint check |

---

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `BVP-AC-1` | An expanded group card in project mode | Group header renders | Project code chip carries brand violet styling and disclosure chevron rotates cleanly with brand hover. |
| `BVP-AC-2` | A group with multiple result types | In-card toolbar renders | Type filters render as a sleek segmented control with distinct active pill elevation. |
| `BVP-AC-3` | Any table view (grouped or flat) | Header row renders | Column headers have high-contrast text (`>= 4.5:1`) and crisp border alignment. |
| `BVP-AC-4` | A result row in any table | Row renders | Code is clear bold mono, date is clean sans tabular-nums, and alignment text is comfortably readable. |
| `BVP-AC-5` | A pending result with review capability | Actions column renders | "Review" button presents clear affordance and sticky background harmonizes with row hover. |
| `BVP-AC-6` | Existing test suites (`bilateral-review-table.component.spec.ts` & `.cy.ts`) | Automated test suite runs | All existing tests pass with 0 regressions. |

---

## 9. Dependencies & Assumptions

### Upstream Dependencies
- `onecgiar-pr-client/src/styles/colors.scss` and `styles.scss` design tokens.
- `BILATERAL_REVIEW_COPY` copy definitions.

### Assumptions
- The single shared `<colgroup>` definition (`columnWidths()`) remains authoritative for column sizing.
- Row-level 3px left border accent classes (`rowAccentClass`) remain in DOM to satisfy existing test assertions while harmonizing with the visual update.

---

## 10. Open Questions

- None. All requirements reflect direct visual polish using existing design tokens.

---

## 11. Required Cross-References

- `docs/prd.md` (G2, US-Q1, AC-1)
- `docs/ux-ui/design.md` §7 (Design tokens, brand design line)
- `docs/specs/changes/bilateral-review-hierarchy-ux` (Container card architecture)
- `docs/specs/changes/bilateral-review-viewport-and-table-polish` (Viewport locks & table column contracts)
