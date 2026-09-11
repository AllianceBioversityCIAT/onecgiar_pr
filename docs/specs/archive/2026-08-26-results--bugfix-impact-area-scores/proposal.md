# Proposal: Fix Impact Area Scores Segmented Radio Selection

## Document Control

| Attribute | Value |
|---|---|
| Spec Path | `results/bugfix-impact-area-scores` |
| Type | Bug |
| Approval Mode | gated |
| Author | Antigravity (T1 Architect) |
| Date | 2026-08-26 |
| Target Package | `onecgiar-pr-client` |
| Primary Files | `src/app/custom-fields/pr-radio-button/pr-radio-button.component.{ts,html}` |

---

## Intent

Restore functionality to the **Impact Area Scores** segmented selectors (`variant="segmented"`) on the General Information page (`rd-general-information`) so users can select and deselect scores (`0 Not Targeted`, `1 Significant`, `2 Principal`), updating form state, visual highlight, and completion counters.

---

## Problem / Current Behavior

When editing a result on the General Information tab (e.g. `/result/result-detail/8915/general-information?phase=36`), clicking any of the score options (`0 Not Targeted`, `1 Significant`, or `2 Principal`) for any of the five Impact Areas produces no response:
- The segment button is not highlighted as active/checked.
- The underlying model (`generalInfoBody[tag_id]`) remains unassigned.
- The counter `0 of 5 impact areas scored` does not increment.
- Required field validation remains incomplete, blocking form progression.

---

## Proposed Outcome

1. Clicking any unselected segment (`0`, `1`, or `2`) updates `this.value` to that option's ID, emits `selectOptionEvent`, triggers Angular's `ControlValueAccessor` (`onChange`), and visually marks the segment with active background and shadow.
2. Clicking an already-selected segment deselects it (`value = null`), matching the existing PRMS radio-button de-selection contract.
3. The parent form (`rd-general-information`) receives the updated score, updating `impactAreasScored` counter, feedback validation, and conditional sub-question visibility (e.g., component checkboxes for score `2 Principal` in P25).

---

## Scope

- **In Scope:**
  - Fix selection handling in `PrRadioButtonComponent` for `variant="segmented"`.
  - Ensure `ControlValueAccessor` hooks (`onChange`, `onTouch`) are called properly on selection.
  - Add unit tests in `pr-radio-button.component.spec.ts` covering `variant="segmented"` selection and toggle/deselection.
  - Add/update Cypress Component Test (CT) in `pr-radio-button.cy.ts` to prevent regressions on `variant="segmented"`.
- **Non-Goals:**
  - Altering the visual design tokens or layout of the segmented control.
  - Modifying `variant="list"` (native radio list behavior used by other pages).
  - Modifying backend scoring logic or APIs.

---

## Affected Users, Systems, And Specs

- **Users:** Result submitters and editors completing General Information for 2026 reporting (P25 portfolio).
- **Client Components:**
  - `onecgiar-pr-client/src/app/custom-fields/pr-radio-button/`
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-general-information/`
- **Related Specs & Tickets:**
  - Commit `72d1f0519` (P2-3435: Align screen and shared fields with design).
  - P2-3342 / P2-3350 (radio grouping and id scoping).

---

## Visual Reference

- **Source:** User screenshot & live URL
- **Location:**
  - Live page: `http://qa-development-2026-3.orca.localhost:62365/result/result-detail/8915/general-information?phase=36`
  - User image: `/var/folders/g8/8wqxv48d60737hm79glkxx0w0000gn/T/orca-paste-1787757061150-39d6a326-6e96-4231-883f-0c10a4ff73c0.png`
- **Notes:** Shows the five Impact Area score rows (`Gender equality...`, `Climate adaptation...`, `Nutrition, health...`, `Environmental health...`, `Poverty reduction...`) with unselected segmented controls and "0 of 5 impact areas scored".

---

## Bug Diagnosis

### Observed Symptom
Clicking any segment button (`0 Not Targeted`, `1 Significant`, `2 Principal`) on any of the five Impact Area score controls does nothing. Neither selection nor deselection works, and the counter stays at "0 of 5 impact areas scored".

### Reproduction Steps
1. Navigate to `/result/result-detail/8915/general-information?phase=36`.
2. Scroll to the **Impact Area scores** section.
3. Click on button `0 Not Targeted` for Gender equality tag.
4. **Expected:** Button becomes active (white background, shadow), model updates to score ID `1`, counter changes to `1 of 5 impact areas scored`.
5. **Actual:** Nothing happens; button remains transparent, model remains empty, counter remains `0 of 5`.

### Root Cause (confirmed)
In commit `72d1f0519`, `variant="segmented"` was added to `pr-radio-button.component.html`:
```html
<button
  type="button"
  role="radio"
  ...
  (click)="onSelect(option[optionValue]); onValueChange(option[optionValue])">
```
In `variant="list"`, the input was an `<input type="radio" [(ngModel)]="value">`, so Angular's built-in `RadioControlValueAccessor` automatically set `this.value = option[optionValue]` when clicked.
In `variant="segmented"`, the control was switched to a plain `<button>` without `[(ngModel)]`.
- `onSelect(clickedValue)` only emitted `selectOptionEvent` and set `this.value = null` if `this.value === clickedValue` (de-selection). It **never sets** `this.value = clickedValue` when selecting an unselected option.
- `onValueChange(newValue)` only updated `this.currentVal = newValue` and cleared sub-options; it **never set** `this.value`.
Consequently, clicking an unselected segment button never altered `this.value`, never invoked `this.onChange()`, and never updated the parent form control.

### Impact & Scope
- All 5 Impact Area scores in General Information (`rd-general-information`) are completely non-functional.
- Submissions cannot complete General Information because the 5 tags are mandatory fields.
- Other radio groups in the application (`variant="list"`, e.g. in Capacity Sharing) are unaffected because they still render native `<input type="radio" [(ngModel)]="value">`.

### Fix Strategy
Implement explicit selection handling for segmented controls (e.g. `onSelectSegment(optionValue)`):
1. Check disabled state (`segmentsDisabled`).
2. If already selected (`this.value === optionValue`), toggle to `null` (de-selection).
3. If not selected, set `this.value = optionValue`.
4. Call `this.onChange(this.value)` and `this.onTouch()`.
5. Call `onValueChange(this.value)` to handle sub-options.
6. Emit `this.selectOptionEvent`.
7. Route to `/akili-specify results/bugfix-impact-area-scores` in **Bug Mode** with a regression test.

---

## Approach Options

### Option 1 (Recommended): Dedicated `onSelectSegment()` handler
Add a dedicated handler method in `PrRadioButtonComponent` specifically for segment buttons that explicitly assigns `this.value = ...`, calls `this.onChange`, `this.onTouch`, `this.onValueChange`, and emits `selectOptionEvent`.
- **Pros:** Clean, minimal, zero risk to `variant="list"`, fully compliant with Angular `ControlValueAccessor`.
- **Cons:** None.

### Option 2: Modify generic `onSelect()` to assign `this.value`
Alter existing `onSelect(clickedValue)` so that it assigns `this.value = clickedValue` when not matching.
- **Pros:** Reuses existing method name.
- **Cons:** Risk of race conditions or double-setting with native `<input [(ngModel)]="value">` in `variant="list"`.

---

## Recommended Approach

**Option 1**: Implement `onSelectSegment(optionValue)` specifically for the segmented track in `pr-radio-button.component.ts`, bind `(click)="onSelectSegment(option[optionValue])"` in `pr-radio-button.component.html`, and add unit + CT tests.

---

## Risks, Dependencies, And Open Questions

- **Risks:** Very low. `variant="segmented"` is isolated to the 5 Impact Area scores.
- **Dependencies:** None. Purely clientside Angular component fix.
- **Open Questions:** None. Root cause is confirmed with 100% certainty.

---

## Success Criteria

1. Clicking any segment button (`0`, `1`, or `2`) on any Impact Area score successfully selects that option and highlights the button.
2. Clicking the selected segment deselects it (`value = null`).
3. Selecting a score increments the `impactAreasScored` counter in `rd-general-information`.
4. Selecting score `2 Principal` conditionally displays the corresponding impact area component checkboxes in P25.
5. All unit tests (`pr-radio-button.component.spec.ts`, `rd-general-information.component.spec.ts`) and Cypress component tests pass.

---

## Next Step

```text
/akili-specify results/bugfix-impact-area-scores
```
