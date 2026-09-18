# Bilateral Review Visual & UX/UI Polish — Tasks

## 1. Scope of this task list

- **Module / feature:** `bilateral` (`onecgiar-pr-client`)
- **Linked spec:** [`requirements.md`](./requirements.md) + [`design.md`](./design.md)
- **Status:** `completed`
- **Estimated LOC:** ~85 LOC
- **Target Component:** `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/bilateral-review/components/bilateral-review-table/`

---

## 2. Pre-flight checklist

- [x] `requirements.md` is approved.
- [x] `design.md` is approved.
- [x] Open questions in `requirements.md` and `design.md` resolved.
- [x] Reversion challenge in `design.md` Step 2.3 verified (preserves `rowAccentClass` and testids).
- [x] No server migration required (`npm run migration:check` is green).

---

## 3. Task List

### `BVP-T-1` — Refactor Accordion Header, Disclosure Chevron & In-Card Quick Filter Strip `[x]`

- **Type:** `client`
- **Description:**
  Upgrade the accordion group card container header and the in-card quick filter toolbar.
  1. Replace raw `indigo-*` classes on the project code chip (`[data-testid="bilateral-review-project-code"]`) with PRMS brand violet tokens (`bg-violet-50 text-[var(--pr-color-primary-700)] border-violet-200/80`).
  2. Redesign the chevron button from a rigid white square box with indigo text into a clean integrated disclosure icon with smooth rotation (`rotate-180 duration-200 text-slate-500 hover:text-[var(--pr-color-primary-600)]`).
  3. Align center chips and balance the right-hand counter cluster (`resultsLabel` + `pendingLabel`).
  4. Transform the in-card filter strip (`[data-testid="bilateral-review-incard-toolbar"]`) from a flat text strip into an integrated, modern segmented control (`rounded-md bg-slate-100/80 p-0.5` with active pill `bg-white text-[var(--pr-color-primary-700)] font-semibold shadow-2xs`).
- **Implements:** `BVP-R-1`, `BVP-R-2`, `BVP-R-7`, `BVP-AC-1`, `BVP-AC-2`.
  - Specifically covers `BVP-R-1` Scenario ("Project header renders with brand tokens") and its constraint `BUT it MUST NOT contain unbranded text-indigo-* or bg-indigo-* classes`.
  - Specifically covers `BVP-R-2` Scenario ("User toggles in-card quick filter") and its constraint `AND inactive pills SHALL display smooth hover states`.
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/bilateral-review/components/bilateral-review-table/bilateral-review-table.component.html`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/bilateral-review/components/bilateral-review-table/bilateral-review-table.component.ts`
- **Depends on:** `—`
- **Blocks:** `BVP-T-2`
- **Estimate:** S (≤ 0.5d)
- **Relevant Skills:** `ui-ux-pro-max`, `angular-developer`, `tailwind-design-system`
- **Verification Guidance:**
  - *Command:*
    ```bash
    cd onecgiar-pr-client && npx jest bilateral-review-table.component.spec.ts --testNamePattern="Grouped view|Group header" --silent
    ```
  - *What input falsifies it:* Introducing any syntax typo or altering `data-testid="bilateral-review-project-code"`, `data-testid="bilateral-review-group-toggle"`, or `data-testid="bilateral-review-incard-toolbar"` will immediately fail the suite. Grep for `indigo-` in `bilateral-review-table.component.html`: any remaining hit indicates failure of `BVP-R-1`.
  - *What disqualifies evidence:* A test run where `expandedRowKeys` is mocked as false for all groups does not evaluate the opened in-card toolbar; evidence is disqualified if it does not assert both open and closed card states.
- **Definition of Done:**
  - [x] Zero instances of `indigo-` classes in `bilateral-review-table.component.html`.
  - [x] Chevron disclosure transitions smoothly without layout shift.
  - [x] In-card filter toolbar renders as a polished segmented pill group with active elevation.
  - [x] All `data-testid` selectors preserved.
  - [x] Jest targeted tests pass clean.

---

### `BVP-T-2` — Elevate Table Header Contrast, Row Typography, ToC Alignment & Review Action Affordance `[x]`

- **Type:** `client`
- **Description:**
  Refactor table header styling, data row typography, ToC alignment presentation, and sticky review action button affordance.
  1. Update `headerRowTpl` (`<th>`): replace muted grey-on-grey with clean white/subtle surface (`!bg-[var(--pr-surface-card)]`), high-contrast uppercase text (`!text-slate-600 font-semibold tracking-wider`), and clean bottom border (`!border-b !border-[var(--pr-border-divider)]`), achieving WCAG AA contrast.
  2. Update Result Code cell: maintain `!border-l-[3px]` and `rowAccentClass(row)` for test contract satisfaction; style code value as `font-mono text-[12px] font-semibold text-slate-700`.
  3. Format ToC Alignment: give the ToC result title comfortable line-height (`text-[13px] text-slate-800 leading-snug`), with the indicator cleanly nested below in muted text (`text-[11.5px] text-slate-500`).
  4. Update Submission Date cell: remove `font-mono`; use clean sans-serif with tabular numbers (`text-[12px] tabular-nums text-slate-600`).
  5. Refine sticky Actions column: eliminate harsh vertical divider in favor of a subtle border divider, harmonize sticky background with row hover state, and style the Review button with brand ghost/outline affordance (`text-[var(--pr-color-primary-700)] hover:bg-[var(--pr-color-primary-50)] rounded-md font-semibold`).
- **Implements:** `BVP-R-3`, `BVP-R-4`, `BVP-R-5`, `BVP-R-6`, `BVP-AC-3`, `BVP-AC-4`, `BVP-AC-5`, `BVP-AC-6`.
  - Specifically covers `BVP-R-3` Scenario ("Table header contrast compliance") and its constraint `THEN header cells SHALL NOT use muted grey text on a grey background`.
  - Specifically covers `BVP-R-4` Scenario ("Clean scannable codes and dates") and its constraint `no monospace font applied to month text`.
  - Specifically covers `BVP-R-6` Scenario ("Review button affordance") and its constraint `AND the sticky right cell background SHALL match the row hover state seamlessly`.
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/bilateral-review/components/bilateral-review-table/bilateral-review-table.component.html`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/bilateral-review/components/bilateral-review-table/bilateral-review-table.component.ts`
- **Depends on:** `BVP-T-1`
- **Blocks:** None
- **Estimate:** S (≤ 0.5d)
- **Relevant Skills:** `ui-ux-pro-max`, `angular-developer`, `tailwind-design-system`
- **Verification Guidance:**
  - *Command:*
    ```bash
    cd onecgiar-pr-client && npx jest bilateral-review-table.component.spec.ts --silent && npx ng lint --quiet
    ```
  - *What input falsifies it:* Removing `!border-l-[3px]` or `rowAccentClass` will immediately fail Jest test line 1106. Altering column widths in `colgroupTpl` will break horizontal overflow tests in Cypress.
  - *What disqualifies evidence:* A green test report that was run with `--no-verify` or where `bilateral-review-table.component.spec.ts` was skipped does not constitute verification.
- **Definition of Done:**
  - [x] Table headers have WCAG AA contrast (no grey text on grey background).
  - [x] Result codes are bold and prominent; dates use sans-serif tabular numbers.
  - [x] ToC alignment text is legible with comfortable line spacing.
  - [x] Sticky review action button provides clear interactive feedback.
  - [x] All 32 Jest test suites in `bilateral-review-table.component.spec.ts` pass with 0 failures.
  - [x] `npx ng lint` is clean.

---

## 4. Dependency Graph

```
BVP-T-1 (Accordion Header, Chevron & In-Card Quick Filters)
   └── BVP-T-2 (Table Headers, Row Cells, ToC Alignment & Review Action)
```

---

## 5. Test Plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `BVP-TEST-1` | Unit (Jest) | `BVP-R-1`, `BVP-R-2`, `BVP-AC-1`, `BVP-AC-2` | `bilateral-review-table.component.spec.ts` (Grouped headers & counts) |
| `BVP-TEST-2` | Unit (Jest) | `BVP-R-3`, `BVP-R-4`, `BVP-AC-3`, `BVP-AC-4` | `bilateral-review-table.component.spec.ts` (Row status tokens, dates, alignment) |
| `BVP-TEST-3` | Unit (Jest) | `BVP-R-6`, `BVP-AC-5` | `bilateral-review-table.component.spec.ts` (Action tone & sticky column) |
| `BVP-TEST-4` | Component (Cypress) | `BVP-AC-6`, `KZ-changes--bilateral-review-hierarchy-ux-2` | `bilateral-review-table.cy.ts` (Column widths & scrollers) |

---

## 6. PR Strategy Recommendation

- **Estimated Total LOC:** ~85 LOC changed across 2 files.
- **Strategy:** **Single Pull Request**.
  Because the change is tightly bounded within `bilateral-review-table.component.{html,ts}`, a single atomic PR ensures visual and structural consistency across the entire component without intermediate styling states.
