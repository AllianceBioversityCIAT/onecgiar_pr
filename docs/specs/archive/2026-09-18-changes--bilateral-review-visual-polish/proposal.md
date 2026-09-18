# Proposal — Bilateral Review Visual & UX/UI Polish

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/bilateral-review-visual-polish` |
| Slug | `bilateral-review-visual-polish` (derived from free-text request) |
| Type | Change |
| Approval Mode | gated |
| Target Date | 2026-09-18 |
| Target Component | `onecgiar-pr-client` → `pages/result-framework-reporting/pages/bilateral-review` |
| Related Specs | `changes/bilateral-review-hierarchy-ux`, `changes/bilateral-review-viewport-and-table-polish` |

---

## 1. Intent

Refine and elevate the visual design and UX craft of the **Bilateral Review** table view (`/result-framework-reporting/entity-details/SP01/bilateral-review?tocView=aows`) from the perspective of a **Senior UX/UI Designer** using the `ui-ux-pro-max` design system. The goal is to transform the existing functional presentation into an elegant, high-density, professional reporting surface with impeccable contrast, color harmony, typography hierarchy, and visual order—**strictly without altering business logic, data models, or API contracts**.

---

## 2. Problem / Current Behavior

While the Bilateral Review section is functionally complete and stable, a detailed design audit reveals several visual dissonance patterns and micro-interaction shortcomings:

1. **Header "Zebra Sandwich" (Visual Banding):**
   - When an accordion card is expanded, the user encounters three consecutive horizontal strips with slightly different backgrounds and borders before reaching row 1:
     - Card Header (`bg-[var(--pr-surface-card)]` - white)
     - In-Card Quick Filter Bar (`bg-[var(--pr-surface-subtle)]` - faint grey)
     - Table `<thead>` (`!bg-[var(--pr-surface-app)]` - medium grey with low-contrast text)
   - This creates visual noise, unnecessary vertical heft, and delays the user's eye from scanning the actual results.

2. **Unbranded Color Inconsistencies:**
   - Elements currently rely on raw Tailwind palette classes (e.g., `text-indigo-700`, `bg-indigo-100/80`, `border-indigo-200/70` on the chevron box and project code badge) rather than PRMS design tokens (`--pr-color-primary-*` or brand utilities).
   - This introduces an alien violet-indigo clash with the rest of the application chrome.

3. **"Orange Alert" Overload (Semantic Saturation):**
   - For pending results (the vast majority in review mode), the UI paints:
     - 3px solid orange border on the card toggle
     - Orange pending pill on the card header
     - 3px solid orange border on *every single row's left edge*
     - Large orange `Pending Review` badge in the status column of *every single row*
   - This repetitive saturation causes sensory fatigue and diminishes the urgency of genuine warning states.

4. **Weak Typography Hierarchy & Contrast Violations:**
   - **Table Header (`<th>`):** Uses muted grey text on a grey background (`!bg-[var(--pr-surface-app)]` + `!text-[var(--pr-text-muted)]`), violating accessibility and readability guidelines (*"Don't: Gray text on gray background"*).
   - **Result Code:** Rendered in `!text-[var(--pr-text-muted)]`, making the primary entity identifier look disabled or secondary.
   - **Submission Date:** Uses `font-mono` on alphanumeric dates (e.g., `6 Jul 2026`), creating an uneven, disjointed rhythm. Standard sans-serif tabular numbers provide much cleaner data scannability.

5. **Cluttered Column Layout & Information Waste:**
   - **Alignment Column:** Truncates aggressively (`HLO1.AOW1.IO1 Steer to impa...`), hiding the most critical decision-making Theory of Change context.
   - **Lead Center Column:** Redundantly repeats the same plain-text center name (e.g. `CIMMYT`) across every row under a project card that is already labeled as owned by that center.
   - **Actions Column:** Separated by an aggressive vertical divider line (`!border-l !border-[var(--pr-border-divider)]`) that cuts through the table, hosting a ghost text button that looks like an inline edit rather than an elevated primary review trigger.

6. **Unstyled In-Card Quick Filter Toolbar:**
   - The type filter (`TYPE: All Types | Policy change (1) ...`) resembles a raw debugging bar with tiny `11px` text and minimal elevation contrast (`shadow-2xs` on grey), lacking the polish of modern segmented controls.

---

## 3. Proposed Outcome

Transform the Bilateral Review table into a clean, modern, enterprise-grade data interface:

- **Clean Card Architecture:** Unified accordion header with cohesive brand tokens, a sleek disclosure chevron, and a balanced right-hand summary badge cluster.
- **Harmonious In-Card Filter Strip:** Elevated segmented pill bar or clean sub-navigation that feels natural and integrated with the card surface.
- **Accessible, Crisp Table Headers:** High-contrast, clean header styling with clear typographic distinction that establishes an authoritative data grid.
- **Balanced Status & Type Badges:** Calibrated semantic color tokens that communicate status and category with clarity, eliminating redundant 3px left-border stripes when status pills already clearly identify the state.
- **Improved Alignment Scannability:** Structured presentation of TOC alignment (subtle code pill + legible title) with optimized column widths.
- **Polished Actions:** Refined "Review" button with clear affordance and seamless sticky-column integration without jarring vertical seam lines.

---

## 4. Scope

### In Scope
- Visual refactoring of `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/bilateral-review/components/bilateral-review-table/bilateral-review-table.component.html` and `.ts` styling.
- Alignment of colors, borders, shadows, and fonts with `docs/ux-ui/design.md` design tokens and `styles.scss` theme rules.
- Card header alignment, spacing, center chip positioning, and summary counter group styling.
- Table header contrast, padding, and row vertical rhythm.
- Alignment column layout and typography formatting.
- Preservation of all existing `data-testid` attributes, ARIA accessibility attributes, keyboard navigation (roving tabindex), and event outputs (`openResult`).

### Out of Scope / Non-Goals
- **No business logic changes:** Filtering logic, collapse state signals, copy utilities, query params, and route handlers remain 100% untouched.
- **No data structure or API contract changes:** Does not alter `ResultToReview`, `BilateralReviewGroup`, or any backend endpoints.
- **No component test regressions:** Existing Cypress component tests (`bilateral-review.cy.ts`, `bilateral-review-table.cy.ts`) and Jest suites must continue to pass cleanly.

---

## 5. Affected Users, Systems, And Specs

| Entity | Impact |
|---|---|
| **QA Reviewers & Science Program Leads** | Greatly improved visual ergonomics, faster scanning of results awaiting review, reduced visual fatigue. |
| **Frontend Codebase** | Pure template and utility class polish in `bilateral-review-table.component.{html,ts}`. |
| **Related Specs** | Builds directly upon foundations established in `changes/bilateral-review-hierarchy-ux` and `changes/bilateral-review-viewport-and-table-polish`. |

---

## 6. Visual Reference

- **Source:** User-provided production/QA screenshots from `http://qa-development-2026.orca.localhost:63760/result-framework-reporting/entity-details/SP01/bilateral-review?tocView=aows`.
- **Artifacts:**
  - Overview: `/var/folders/g8/8wqxv48d60737hm79glkxx0w0000gn/T/orca-paste-1789760835290-286fa4e3-fdd8-4252-b09d-9a78cf43341a.png`
  - Target Detail Section: `/var/folders/g8/8wqxv48d60737hm79glkxx0w0000gn/T/orca-paste-1789760860382-1fb99f62-84ae-432d-8f13-e61bfa833400.png`

---

## 7. Requirement Delta Preview

### ADDED Requirements
- **AC-VIS-1 (Unified Card Header Grammar):** Accordion header uses brand tokens (`brand-50`/`brand-700` or neutral slate), replacing isolated `indigo-*` classes. Chevron disclosure styled with clean brand micro-interaction.
- **AC-VIS-2 (Integrated Quick Filter Strip):** In-card type and center filters styled as a refined segmented control with clean active pill state and smooth hover transitions.
- **AC-VIS-3 (High-Contrast Table Header):** Table `<thead>` styled with distinct contrast, crisp uppercase labels, and seamless alignment with card boundaries.

### MODIFIED Requirements
- **AC-VIS-4 (Reduced Accent Saturation):** Remove redundant row-level `!border-l-[3px]` orange notches that repeat the status pill information; reserve border accents for purposeful card or container emphasis.
- **AC-VIS-5 (Typography & ID Clarity):** Result codes styled with prominent readable contrast (`font-mono text-xs font-semibold text-slate-700`). Submission date converted from monospace to clean sans-serif (`text-xs tabular-nums text-slate-500`).
- **AC-VIS-6 (Enhanced Alignment Column & Action Button):** TOC alignment column layout optimized for maximum legible text; Review button refined with subtle elevated button styling (`hlmBtn` variant with brand hover and clean right-anchor).

### REMOVED Requirements
- **None.** All features, filters, shortcuts, and copy actions remain intact.

---

## 8. Approach Options

### Option 1: Design-Token Aligned Visual Polish (Recommended)
Apply a comprehensive visual refinement strictly using Tailwind utilities wired to the PRMS design token system (`docs/ux-ui/design.md` §7):
- Replace ad-hoc colors with brand tokens (`brand-*`, `--pr-color-primary-*`, `--pr-surface-*`).
- Streamline the 3-layer header into a cohesive hierarchy (Card Header → Sleek Segmented Filter Bar → Clean Table Header).
- Eliminate redundant row border accents while preserving and polishing status pills.
- Format the Alignment column and Result Code with optimal contrast and spacing.
- **Pros:** Completely zero-risk to business logic, 100% test-compatible, dramatic leap in aesthetic quality and readability, respects existing Cypress contracts.
- **Cons:** None.

### Option 2: Minimal CSS Class Tweaks Only
Only fix the immediate color contrast issues (e.g. darken table header text, replace `indigo` with `brand-600`):
- **Pros:** Very few line edits.
- **Cons:** Leaves structural visual clutter intact (the "zebra sandwich" headers, redundant row notches, cramped alignment column, and awkward date typography remain unaddressed).

---

## 9. Recommended Approach

**Option 1: Design-Token Aligned Visual Polish.**
This satisfies the user's explicit request for a Senior UX/UI Designer evaluation and execution using `ui-ux-pro-max`, delivering a modern, high-craft interface while honoring the constraint that everything already functions perfectly.

---

## 10. Risks, Dependencies, And Open Questions

- **Risk: Cypress Component Test Selectors & Layout Gates:**
  - *Context:* Kaizen lesson `KZ-changes--bilateral-review-hierarchy-ux-2` notes that column widths and scrollers are strictly measured by Cypress tests (`bilateral-review-table.cy.ts`).
  - *Mitigation:* Preserve all `data-testid` attributes, keep the `<colgroup>` column width contract intact (with Title as remainder), and ensure no cell overflows its boundary.
- **Dependencies:** None. All design tokens already exist in `styles.scss` and `colors.scss`.
- **Open Questions:** None. The visual direction is well-bounded.

---

## 11. Success Criteria

1. Visual harmony achieved across all card headers, in-card filter bars, and table grids using PRMS brand tokens.
2. Table header contrast meets WCAG AA standards (no grey-on-grey text).
3. "Orange alert" clutter eliminated while preserving instant status recognition.
4. Alignment column is more legible and codes/dates have clean typography.
5. All existing automated tests (`npm run test` and `cypress run --component`) pass without regression.

---

## 12. Next Step

Upon user approval, proceed to drafting the detailed specifications, visual design specifications, and tasks:

```text
/akili-specify changes/bilateral-review-visual-polish
```
