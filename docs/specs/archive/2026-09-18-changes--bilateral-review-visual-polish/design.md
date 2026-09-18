# Bilateral Review Visual & UX/UI Polish — Technical Design

## 1. Summary

This design defines the technical and visual implementation for polishing the Bilateral Review view (`onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/bilateral-review/components/bilateral-review-table/bilateral-review-table.component.{html,ts}`). It addresses the visual dissonance, header banding ("zebra sandwich"), color inconsistency (`indigo-*` vs PRMS brand violet), low-contrast table headers, unstyled in-card quick filters, and typography issues identified in the UX/UI audit.

The solution is purely client-side: template markup refactoring and Tailwind utility class alignment using PRMS design tokens (`docs/ux-ui/design.md` §7). It accepts the hard constraint that all existing reactive bindings, signals, keyboard navigation contracts, and Cypress/Jest test selectors must remain 100% intact.

Corresponding requirements: [`requirements.md`](./requirements.md).

---

## 2. Architecture Overview

### 2.1 Where this lives in the system
- **Server modules touched:** None (no backend changes).
- **Client modules touched:**
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/bilateral-review/components/bilateral-review-table/bilateral-review-table.component.html`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/bilateral-review/components/bilateral-review-table/bilateral-review-table.component.ts`
- **External integrations touched:** None.

### 2.2 Component Hierarchy & Visual Flow

```
[BilateralReviewComponent] (#workArea scroller)
  └── [BilateralReviewTableComponent]
        ├── Grouped View
        │     └── <section class="... rounded-[12px] border ...">
        │           ├── Accordion Header (<button>): Brand violet code chip + Sleek chevron + Balanced counter
        │           ├── In-Card Quick Filter: Integrated segmented control (Types & Centers)
        │           └── Nested Table: High-contrast <thead> + Shared <colgroup> + Optimized <tbody>
        │                 └── <tr>: Mono code + Clamped title with badge + Legible ToC + Sans-serif date + Sticky action
        └── Flat View
              └── Flat Table: Same High-contrast <thead> + Shared <colgroup> + Shared row template
```

---

## 3. Data Model Changes

### 3.1 Entities
No entity or database changes.

### 3.2 Migrations
No migrations required.

### 3.3 CLARISA / External Data
No external catalog or sync changes.

---

## 4. API Surface

No API endpoints are added or modified. Payloads and contracts (`/api/bilateral/*`) remain strictly untouched.

---

## 5. Server Workflow / Business Rules

No server-side workflows are involved.

---

## 6. Frontend Plan

### 6.1 Routes & Modules
No route changes. The component resides in `bilateral-review.module` / standalone imports in `bilateral-review.component.ts`.

### 6.2 Components & Styling Strategy
All changes are localized to `bilateral-review-table.component`:

1. **Card Accordion Header (`bilateral-review-group-toggle`):**
   - Replace raw `bg-indigo-100/80 text-indigo-800 border-indigo-200/70` on the project code chip with brand violet tokens: `bg-violet-50 text-[var(--pr-color-primary-700)] border border-violet-200/80`.
   - Chevron indicator: replace the unbranded white square box (`text-indigo-700`) with a clean, centered icon button that transitions with `rotate-180 duration-200 text-slate-500 group-hover:text-[var(--pr-color-primary-600)]`.
   - Right-side counter group: align the "N results" label and the "N pending" badge with consistent spacing and typography.

2. **In-Card Quick Filter Toolbar (`bilateral-review-incard-toolbar`):**
   - Refactor the grey strip into a modern segmented filter control.
   - Container: seamless background with a subtle bottom hairline (`border-b border-[var(--pr-border-divider)] bg-[var(--pr-surface-subtle)]`).
   - Filter items: pill container (`rounded-md bg-slate-100/80 p-0.5`) where active item is elevated (`bg-white text-[var(--pr-color-primary-700)] font-semibold shadow-2xs`) and inactive items provide subtle hover transitions.

3. **Table Header (`headerRowTpl`):**
   - Header cells (`<th>`): replace the dark muted text on grey (`!text-[var(--pr-text-muted)]` on `!bg-[var(--pr-surface-app)]`) with crisp, high-contrast styling:
     - Background: clean white or ultra-subtle tint (`!bg-[var(--pr-surface-card)]`).
     - Text: `!text-slate-600` uppercase tracking-wider font-semibold (contrast >= 4.5:1).
     - Bottom border: `!border-b !border-[var(--pr-border-divider)]`.

4. **Table Rows (`rowTpl`):**
   - Result Code cell: keep `!border-l-[3px]` and `rowAccentClass(row)` to satisfy `KZ-changes--bilateral-review-hierarchy-ux` and test assertions. Update code value text to `text-slate-700 font-semibold font-mono text-[12px]`.
   - Result Title: maintain 2-line clamp with clean line-height (`leading-[18px] text-[13px] text-slate-900`), and category pill positioned cleanly underneath with proper vertical rhythm.
   - ToC Alignment: format the cell with clear separation between the ToC result title (`text-[13px] text-slate-800 leading-snug truncate`) and the indicator (`text-[11.5px] text-slate-500 truncate`).
   - Submission Date: remove `font-mono`; use `font-sans text-[12px] tabular-nums text-slate-600` for natural alphanumeric legibility.
   - Actions Column: refine the sticky right cell background matching (`group-hover:bg-[var(--pr-surface-app)]`), replace the harsh left border with a subtle border divider, and style the Review button with brand ghost/outline affordance (`text-[var(--pr-color-primary-700)] hover:bg-[var(--pr-color-primary-50)] font-semibold`).

### 6.3 Design System Usage
- **Tokens:** Wire all colors through `src/styles/colors.scss` tokens:
  - `--pr-color-primary-50` / `--pr-color-primary-700` for brand accents.
  - `--pr-border-divider` for internal hairlines.
  - `--pr-surface-card` / `--pr-surface-subtle` for elevations.
- **Typography:** Poppins (`font-sans`), with `font-mono` reserved strictly for numerical/code identifiers (result codes, project IDs). Tabular numbers (`tabular-nums`) enabled for all dates and counts.
- **Responsive:** Grouped cards and tables maintain existing breakpoints (`min-[900px]` desktop table vs `< 900px` mobile cards).

---

## 7. Security & Authorization

Purely visual presentation. All existing role gates (`canReview()`, `actionsDisabled()`) and action guards remain unchanged.

---

## 8. Performance & Capacity

Zero runtime impact. No additional network requests or heavy DOM elements. CSS utility changes only.

---

## 9. Observability

No changes to logging or telemetry.

---

## 10. Testing Plan

### Automated Regression Verification
1. **Jest Unit Suite:**
   ```bash
   npx jest bilateral-review-table.component.spec.ts --silent
   ```
   Must pass all 32 existing test suites with 0 failures.
2. **Cypress Component Test Suite:**
   ```bash
   npx cypress run --component --spec "**/bilateral-review-table.cy.ts"
   ```
   Must pass all component test gates including column width consistency and viewport bounds.
3. **Lint Check:**
   ```bash
   npx ng lint --quiet
   ```

---

## 11. Backwards Compatibility & Test Selector Preservation

All test selectors MUST be preserved verbatim:
- `data-testid="bilateral-review-group-card"`
- `data-testid="bilateral-review-group-toggle"`
- `data-testid="bilateral-review-project-code"`
- `data-testid="bilateral-review-incard-toolbar"`
- `data-testid="incard-filter-type-all"`
- `data-testid="incard-filter-type-item"`
- `data-testid="bilateral-review-row"`
- `data-testid="bilateral-review-row-code"`
- `data-testid="bilateral-review-row-type-badge"`
- `data-testid="bilateral-review-row-status"`
- `data-testid="bilateral-review-row-alignment"`
- `data-testid="bilateral-review-row-action"`

---

## 12. Design Decisions (ADRs)

### `BVP-DD-1` — Brand Violet Tokens Over Raw Indigo
- **Context:** Project code chips and chevron containers previously used raw Tailwind `indigo-*` classes, clashing with the PRMS brand palette (`--pr-color-primary-*` / brand utilities).
- **Decision:** Standardize on PRMS brand tokens (`bg-violet-50 text-[var(--pr-color-primary-700)] border-violet-200/80`).
- **Alternatives Considered:**
  1. *Keep raw indigo:* Rejected because it violates PRMS design system rules against ad-hoc color ramps.
  2. *Use generic slate:* Rejected because project codes are key entities that benefit from brand distinction.
- **Consequences:** Visual alignment across all PRMS reporting tabs.

### `BVP-DD-2` — Preservation of Row 3px Left Accent (`rowAccentClass`)
- **Context:** While auditing visual saturation, removing the row-level left accent was considered to reduce "orange alert" clutter. However, regression inspection revealed that `bilateral-review-table.component.spec.ts:1106` explicitly tests:
  `expect(codeCell.className).toContain('!border-l-[3px]')` and `!border-l-[var(--pr-status-in-progress-fg)]`.
- **Decision:** Keep `!border-l-[3px]` and `rowAccentClass(row)` on the code cell to satisfy existing test contracts, but refine row cell padding, typography, and background hover states so the accent acts as an elegant status indicator rather than visual noise.
- **Consequences:** 100% test compatibility preserved while achieving the desired visual calm.

### `BVP-DD-3` — High-Contrast Clean Table Header Surface
- **Context:** Table header previously rendered with `!bg-[var(--pr-surface-app)]` and `!text-[var(--pr-text-muted)]`, creating a washed-out "gray-on-gray" band that failed WCAG contrast.
- **Decision:** Switch `<thead>` background to `!bg-[var(--pr-surface-card)]` with a clean bottom divider and `text-slate-600` semi-bold uppercase text.
- **Alternatives Considered:**
  1. *Dark chrome gradient (`#1e202f`):* Rejected for nested accordion tables because dark blocks inside white cards create excessive visual weight.
  2. *Transparent header:* Rejected because sticky scrollers require an opaque header to prevent text collision during scroll.
- **Consequences:** Clean, accessible data grid conforming to WCAG AA contrast.

---

## 13. Step 2.3 — Challenge Reversions

| Triggered Decision | Behavior Examined | Breakage Assessment | Resolution |
|---|---|---|---|
| Potential removal of `!border-l-[3px]` row accent | `rowAccentClass(row)` on `<td>` | Would fail Jest test at `bilateral-review-table.component.spec.ts:1106` | **Retained.** Keep the classes in the template; polish surrounding cell styling. |

---

## 14. Step 2.4 — Size Against the Design (Budget)

| Metric | Budget Estimate | Target Tier |
|---|---|---|
| **Expected Tasks** | 1 focused task (`tasks.md`) | Lite / Standard |
| **Expected LOC** | ~70-110 LOC (HTML classes + small TS helper tweaks) | Lite / Standard |
| **Expected Review Rounds** | 1 round | Lite |

The estimate matches the requested bounded visual polish.

---

## 15. Required Cross-References

- [`requirements.md`](./requirements.md)
- `docs/ux-ui/design.md` §7 (Design tokens, brand line)
- `docs/specs/kaizen/changes--bilateral-review-hierarchy-ux.md` (`KZ-changes--bilateral-review-hierarchy-ux-2`)
