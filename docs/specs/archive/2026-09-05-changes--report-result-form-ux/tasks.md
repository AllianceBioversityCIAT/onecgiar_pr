# Module Spec — Tasks: Report Result Form UX & Standardized Form Patterns

## Document Control

- **Spec Path:** `docs/specs/changes/report-result-form-ux/tasks.md`
- **Module:** `results` / `dashboard-lab` (Reporting Entry Drawer & Forms)
- **Sub-feature:** `report-result-form-ux`
- **Owner:** Results & UX/UI Core Team
- **Status:** `completed`
- **Linked Spec:**
  - Requirements: `docs/specs/changes/report-result-form-ux/requirements.md`
  - Design: `docs/specs/changes/report-result-form-ux/design.md`
  - Proposal: `docs/specs/changes/report-result-form-ux/proposal.md`
- **Budget / Sizing:**
  - Expected Tasks: 7
  - Expected LOC Diff: ~350 LOC
  - Expected Review Rounds: 1

---

## 1. Pre-flight Checklist

- [x] `requirements.md` is approved.
- [x] `design.md` is approved.
- [x] Indicator description verbatim preservation rule confirmed (`RFUX-R-1`).
- [x] No backend or migration changes required.
- [x] Brand design tokens (`--pr-color-primary-300`, `--pr-color-primary-400`, `--pr-color-secondary-400`) identified.

---

## 2. Task List

### `RFUX-T-1` — Verbatim Context Card & Empty State Micro-Card in Indicator Drawer
- **Type:** `client`
- **Description:**  
  Update `IndicatorDrawerComponent` to ensure `indicator()?.indicator_description` renders verbatim without regex/filtering. Wrap the context in a styled card with high-contrast metadata badges (`Target: X`, `Center: Y`, `Unit: Z`). Replace the floating text `"Nothing has been reported against this indicator yet."` with a structured micro-empty-state card.
- **Implements:** `RFUX-R-1`, `RFUX-R-8`, `RFUX-AC-1`
- **Files:**
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/indicator-drawer/indicator-drawer.component.html`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/indicator-drawer/indicator-drawer.component.ts`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/indicator-drawer/indicator-drawer.component.spec.ts`
- **Depends on:** —
- **Blocks:** `RFUX-T-2`
- **Estimate:** S (≤ 0.5d)
- **Relevant Skills:** `ui-ux-pro-max`, `angular-developer`
- **Verification:**  
  `npx jest src/app/pages/result-framework-reporting/pages/dashboard-lab/components/indicator-drawer/indicator-drawer.component.spec.ts --silent --reporters=summary --no-coverage`  
  *Falsifier:* Modifying the mock description to `.--- Test string ---` must render verbatim in the DOM textContent.
- **Definition of Done:**
  - [x] Description displays raw user input unchanged.
  - [x] Metadata badges meet WCAG AA contrast (≥ 4.5:1).
  - [x] Micro-card renders when `reportedRows().length === 0`.
  - [x] Jest suite passes 100%.

---

### `RFUX-T-2` — Form 3-Card Architecture & Visual Chunking
- **Type:** `client`
- **Description:**  
  Restructure `lab-report-form.component.html` from a flat list of 6 inputs into 3 distinct visual cards: *Card 1: Result Identity*, *Card 2: Target Contribution*, and *Card 3: Collaboration & Attribution*. Use `--pr-border`, `--pr-surface-card`, 4/8px spacing rhythm, and clear card subtitles.
- **Implements:** `RFUX-R-2`, `RFUX-AC-2`
- **Files:**
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/lab-report-form/lab-report-form.component.html`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/lab-report-form/lab-report-form.component.scss`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/lab-report-form/lab-report-form.component.spec.ts`
- **Depends on:** `RFUX-T-1`
- **Blocks:** `RFUX-T-3`, `RFUX-T-4`, `RFUX-T-5`
- **Estimate:** S (≤ 0.5d)
- **Relevant Skills:** `ui-ux-pro-max`, `angular-developer`
- **Verification:**  
  `npx jest src/app/pages/result-framework-reporting/pages/dashboard-lab/components/lab-report-form/lab-report-form.component.spec.ts --silent --reporters=summary --no-coverage`  
  *Falsifier:* Form missing card wrapper elements fails assertion for 3 semantic `<section>` cards.
- **Definition of Done:**
  - [x] 3 semantic cards rendered with headers in continuous scroll.
  - [x] Responsive layout maintained across 380px–720px drawer widths.
  - [x] No layout regression for Knowledge Product (CGSpace) flow.

---

### `RFUX-T-3` — Auto-resizing Textarea & Dynamic Word Gauge for Title
- **Type:** `client`
- **Description:**  
  Replace the single-line title input in Card 1 with an auto-expanding `<textarea>` (min 2 rows, max 4 rows). Add reactive signal `titleWordCount` and real-time word gauge badge with color ramps: neutral (0–24) $\rightarrow$ amber (25–29) $\rightarrow$ brand purple (30) $\rightarrow$ red (>30). Replace hover tooltip with accessible inline helper text.
- **Implements:** `RFUX-R-3`, `RFUX-R-5`, `RFUX-AC-3`, `RFUX-AC-4`
- **Files:**
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/lab-report-form/lab-report-form.component.html`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/lab-report-form/lab-report-form.component.ts`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/lab-report-form/lab-report-form.component.spec.ts`
- **Depends on:** `RFUX-T-2`
- **Blocks:** `RFUX-T-6`
- **Estimate:** S (≤ 0.5d)
- **Relevant Skills:** `ui-ux-pro-max`, `angular-developer`
- **Verification:**  
  `npx jest src/app/pages/result-framework-reporting/pages/dashboard-lab/components/lab-report-form/lab-report-form.component.spec.ts -t "title" --silent --reporters=summary --no-coverage`  
  *Falsifier:* Entering 26 words without amber class fails unit test assertion.
- **Definition of Done:**
  - [x] Title displays in multi-line textarea with auto-height adjustment.
  - [x] Word counter updates reactively as user types.
  - [x] Warning ramp styles applied at 25+ words.
  - [x] Inline helper text visible directly below label.

---

### `RFUX-T-4` — Contextual Contribution Input with Unit Suffix & Target Context
- **Type:** `client`
- **Description:**  
  In Card 2, enhance the contribution field: initialize with an empty/clean placeholder (e.g. `e.g. 5`), add an inline suffix adornment with `unit_messurament` (when available), and display contextual comparison micro-copy (`Target 2026: X · Achieved so far: Y`). Replace the hover tooltip with inline helper copy.
- **Implements:** `RFUX-R-4`, `RFUX-R-5`, `RFUX-AC-5`
- **Files:**
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/lab-report-form/lab-report-form.component.html`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/lab-report-form/lab-report-form.component.ts`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/lab-report-form/lab-report-form.component.spec.ts`
- **Depends on:** `RFUX-T-2`
- **Blocks:** `RFUX-T-6`
- **Estimate:** S (≤ 0.5d)
- **Relevant Skills:** `ui-ux-pro-max`, `angular-developer`
- **Verification:**  
  `npx jest src/app/pages/result-framework-reporting/pages/dashboard-lab/components/lab-report-form/lab-report-form.component.spec.ts -t "contribution" --silent --reporters=summary --no-coverage`  
  *Falsifier:* Asserting initial contribution value is null/undefined passes, while pre-filled 0 fails.
- **Definition of Done:**
  - [x] Input defaults to empty with placeholder.
  - [x] Unit of measurement renders as suffix adornment.
  - [x] Target reference helper renders inline.

---

### `RFUX-T-5` — Lead Center Protection & Layout Stability in Multiselects
- **Type:** `client`
- **Description:**  
  In Card 3, update Contributing Centers so that the Lead Center chip displays a distinct `Lead Center` badge with NO remove button (`x`). Ensure chips container has minimum height reservation to prevent vertical content jumping when items are toggled.
- **Implements:** `RFUX-R-7`, `RFUX-AC-7`
- **Files:**
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/lab-report-form/lab-report-form.component.html`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/lab-report-form/lab-report-form.component.ts`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/lab-report-form/lab-report-form.component.spec.ts`
- **Depends on:** `RFUX-T-2`
- **Blocks:** `RFUX-T-6`
- **Estimate:** S (≤ 0.5d)
- **Relevant Skills:** `ui-ux-pro-max`, `angular-developer`
- **Verification:**  
  `npx jest src/app/pages/result-framework-reporting/pages/dashboard-lab/components/lab-report-form/lab-report-form.component.spec.ts -t "center" --silent --reporters=summary --no-coverage`  
  *Falsifier:* Lead center chip with a remove button fails unit test assertion.
- **Definition of Done:**
  - [x] Lead center chip cannot be dismissed.
  - [x] Other centers remain dismissible.
  - [x] Chip additions do not cause erratic layout shifts.

---

### `RFUX-T-6` — Interactive Readiness Action in Footer & Brand CTA Button
- **Type:** `client`
- **Description:**  
  Convert the `• N fields left before you can create` status into an interactive button. Clicking it triggers `focusFirstMissingField()`, which determines the first invalid required field (`category`, `title`, or `contribution`), scrolls it into view smoothly, and sets focus. Update the primary button styling to use the brand gradient (`#6b6dc4 → #6461bc`).
- **Implements:** `RFUX-R-6`, `RFUX-AC-6`, `RFUX-AC-8`
- **Files:**
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/lab-report-form/lab-report-form.component.html`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/lab-report-form/lab-report-form.component.ts`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/lab-report-form/lab-report-form.component.spec.ts`
- **Depends on:** `RFUX-T-3`, `RFUX-T-4`, `RFUX-T-5`
- **Blocks:** `RFUX-T-7`
- **Estimate:** S (≤ 0.5d)
- **Relevant Skills:** `ui-ux-pro-max`, `angular-developer`
- **Verification:**  
  `npx jest src/app/pages/result-framework-reporting/pages/dashboard-lab/components/lab-report-form/lab-report-form.component.spec.ts -t "missing fields" --silent --reporters=summary --no-coverage`  
  *Falsifier:* Clicking the button when title is missing without focusing title element fails unit test.
- **Definition of Done:**
  - [x] Clicking missing fields status focuses first missing control.
  - [x] Primary button uses brand gradient and exhibits clear disabled/active states.
  - [x] Keyboard accessible (Enter/Space triggers focus).

---

### `RFUX-T-7` — Documentation of PRMS Form UX Pattern & Full Regression Verification
- **Type:** `docs` + `tests`
- **Description:**  
  Document the standardized PRMS Form UX guidelines in `docs/ux-ui/design.md` §8. Run full test suites across `indicator-drawer` and `lab-report-form`, verify TypeScript compilation with 0 errors, and ensure no regressions on other drawer flows.
- **Implements:** Constitutional baseline update, full traceability closure.
- **Files:**
  - `docs/ux-ui/design.md`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/indicator-drawer/indicator-drawer.component.spec.ts`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/lab-report-form/lab-report-form.component.spec.ts`
- **Depends on:** `RFUX-T-1`, `RFUX-T-2`, `RFUX-T-3`, `RFUX-T-4`, `RFUX-T-5`, `RFUX-T-6`
- **Blocks:** —
- **Estimate:** S (≤ 0.5d)
- **Relevant Skills:** `cognitive-doc-design`
- **Verification:**  
  `npx jest src/app/pages/result-framework-reporting/pages/dashboard-lab/components/indicator-drawer src/app/pages/result-framework-reporting/pages/dashboard-lab/components/lab-report-form --silent --reporters=summary --no-coverage && npx tsc --noEmit -p tsconfig.app.json`  
  *Falsifier:* Any failing test or broken TypeScript compile fails this gate.
- **Definition of Done:**
  - [x] `docs/ux-ui/design.md` updated with form patterns.
  - [x] All unit test suites pass 100%.
  - [x] `tsc --noEmit` exits 0.

---

## 3. Dependency Graph

```
RFUX-T-1 (Drawer Context & Verbatim Text)
   └── RFUX-T-2 (Form 3-Card Architecture)
         ├── RFUX-T-3 (Title Textarea & Word Gauge)
         ├── RFUX-T-4 (Contribution Context & Units)
         └── RFUX-T-5 (Lead Center Protection)
               └── RFUX-T-6 (Interactive Readiness & Footer)
                     └── RFUX-T-7 (Docs & Regression Verification)
```

---

## 4. Test Matrix & Traceability

| Test ID | Task | Requirement | Acceptance Criterion | Test Location |
|---|---|---|---|---|
| `RFUX-TEST-1` | `RFUX-T-1` | `RFUX-R-1`, `RFUX-R-8` | `RFUX-AC-1` | `indicator-drawer.component.spec.ts` |
| `RFUX-TEST-2` | `RFUX-T-2` | `RFUX-R-2` | `RFUX-AC-2` | `lab-report-form.component.spec.ts` |
| `RFUX-TEST-3` | `RFUX-T-3` | `RFUX-R-3`, `RFUX-R-5` | `RFUX-AC-3`, `RFUX-AC-4` | `lab-report-form.component.spec.ts` |
| `RFUX-TEST-4` | `RFUX-T-4` | `RFUX-R-4`, `RFUX-R-5` | `RFUX-AC-5` | `lab-report-form.component.spec.ts` |
| `RFUX-TEST-5` | `RFUX-T-5` | `RFUX-R-7` | `RFUX-AC-7` | `lab-report-form.component.spec.ts` |
| `RFUX-TEST-6` | `RFUX-T-6` | `RFUX-R-6` | `RFUX-AC-6`, `RFUX-AC-8` | `lab-report-form.component.spec.ts` |
| `RFUX-TEST-7` | `RFUX-T-7` | Verification & Docs | Traceability Closure | Global Suite & TypeScript |
