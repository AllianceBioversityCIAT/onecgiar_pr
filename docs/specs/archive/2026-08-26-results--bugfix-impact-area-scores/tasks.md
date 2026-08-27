# Tasks: Fix Impact Area Scores Segmented Radio Selection

## 1. Scope of this task list

- **Module:** `results` (`onecgiar-pr-client`)
- **Linked Spec:** `docs/specs/results/bugfix-impact-area-scores/requirements.md` + `design.md`
- **Status:** `complete`
- **Total Estimated LOC:** ~35 LOC
- **PR Strategy:** Single PR (focused, small bugfix)

---

## 2. Pre-flight checklist

- [x] `requirements.md` approved.
- [x] `design.md` approved.
- [x] Confirmed root cause and reproduction steps documented in `proposal.md`.
- [x] No backend or migration dependencies.

---

## 3. Task List

### `RES-T-SCORE-1` — Implement `onSelectSegment` & Add Jest Regression Test [x]

- **Type:** `client` + `tests`
- **Description:** 
  1. Author a failing Jest regression test in `pr-radio-button.component.spec.ts` that mounts `variant="segmented"`, simulates a click on an unselected segment button, and asserts that `component.value` is updated and `onChange` is called (Red state).
  2. Implement `onSelectSegment(optionVal: any)` in `PrRadioButtonComponent` ([`pr-radio-button.component.ts`](file:///Users/jcadavid/orca/workspaces/onecgiar_pr/qa-development-2026/onecgiar-pr-client/src/app/custom-fields/pr-radio-button/pr-radio-button.component.ts)):
     - Checks `segmentsDisabled`.
     - Toggles value: `this.value = null` if already selected; `this.value = optionVal` if not.
     - Calls `this.onTouch()`, `this.onValueChange(this.value)`, and emits `this.selectOptionEvent`.
  3. In [`pr-radio-button.component.html`](file:///Users/jcadavid/orca/workspaces/onecgiar_pr/qa-development-2026/onecgiar-pr-client/src/app/custom-fields/pr-radio-button/pr-radio-button.component.html), update button click binding to `(click)="onSelectSegment(option[optionValue])"`.
  4. Verify test turns Green.
- **Implements:** `RES-R-SCORE-1`, `RES-R-SCORE-2`
- **Design Reference:** `RES-DD-1`
- **Files:**
  - `onecgiar-pr-client/src/app/custom-fields/pr-radio-button/pr-radio-button.component.ts`
  - `onecgiar-pr-client/src/app/custom-fields/pr-radio-button/pr-radio-button.component.html`
  - `onecgiar-pr-client/src/app/custom-fields/pr-radio-button/pr-radio-button.component.spec.ts`
- **Depends on:** None
- **Blocks:** `RES-T-SCORE-2`
- **Estimate:** S (≤ 0.5d)
- **Skills:** `angular-developer`, `tdd`, `systematic-debugging`
- **Verification Command:**
  ```bash
  cd onecgiar-pr-client && npx jest src/app/custom-fields/pr-radio-button/pr-radio-button.component.spec.ts --silent
  ```
- **Disqualifier:** If the test passes without changing `pr-radio-button.component.{ts,html}`, the test is invalid / tautological.
- **Falsifying Input:** Pre-fix codebase produces `Expected 1, Received undefined/null`.
- **Definition of Done:**
  - [x] Failing test written first and verified failing on current code.
  - [x] Implementation completed and tests pass green.
  - [x] `variant="list"` tests continue to pass with zero regressions.

---

### `RES-T-SCORE-2` — Add Cypress Component Test for Segmented Track [x]

- **Type:** `tests`
- **Description:**
  Add a Cypress component test suite in `pr-radio-button.cy.ts` explicitly verifying `variant="segmented"`:
  - Renders the segmented buttons with digits and text.
  - Clicking a button updates the bound `model`.
  - Selected button gains `.bg-white` and `aria-checked="true"`.
  - Re-clicking clears the `model` to `null`.
- **Implements:** `RES-R-SCORE-1` (Scenarios 1, 2, 3)
- **Design Reference:** `RES-DD-1`
- **Files:**
  - `onecgiar-pr-client/src/app/custom-fields/pr-radio-button/pr-radio-button.cy.ts`
- **Depends on:** `RES-T-SCORE-1`
- **Estimate:** S (≤ 0.5d)
- **Skills:** `angular-developer`
- **Verification Command:**
  ```bash
  cd onecgiar-pr-client && npm run lint
  ```
- **Definition of Done:**
  - [x] Cypress component test added covering segmented selection, de-selection, and visual classes.
  - [x] Lint passes with zero errors.

---

## 4. Dependency Graph

```
RES-T-SCORE-1 (Component fix + Jest unit regression test)
   └── RES-T-SCORE-2 (Cypress CT test suite)
```
