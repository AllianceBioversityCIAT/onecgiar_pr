# Design: Fix Impact Area Scores Segmented Radio Selection

## Document Control

| Attribute | Value |
|---|---|
| Spec Path | `docs/specs/results/bugfix-impact-area-scores` |
| Type | Bug (Bug Mode) |
| Depth | Lite |
| Approval Mode | gated |
| Target Package | `onecgiar-pr-client` |
| Target Component | `PrRadioButtonComponent` (`src/app/custom-fields/pr-radio-button/`) |

---

## 1. Executive Summary

This design resolves the defect where clicking options in `PrRadioButtonComponent` with `variant="segmented"` produces no effect. The solution introduces a dedicated handler `onSelectSegment(optionValue)` that integrates directly with Angular's `ControlValueAccessor` interface (`value` setter, `onChange`, `onTouch`), toggling selection if already selected, and triggering sub-option cleanup via `onValueChange`.

---

## 2. Architecture Overview

### 2.1 Component Interaction

```
[User clicks Segment Button (0/1/2)]
   │
   ▼
[pr-radio-button.component.html]
   └── (click)="onSelectSegment(option[optionValue])"
         │
         ▼
[PrRadioButtonComponent]
   ├── Check `segmentsDisabled` -> return early if true
   ├── Check `this.value === optionValue`:
   │     ├── YES (Re-click): `this.value = null; this.currentVal = null`
   │     └── NO (New selection): `this.value = optionValue; this.currentVal = optionValue`
   ├── `this.onTouch()` (mark control touched)
   ├── `this.selectOptionEvent.emit()`
   ├── `this.onValueChange(this.value)` (sub-option handling)
   │
   ▼ (via `set value(v)`)
[this.onChange(v)] -> Propagates to Parent [(ngModel)] ("generalInfoBody.gender_tag_id")
   │
   ▼
[rd-general-information.component.html]
   ├── Updates visual active state: `bg-white shadow-[var(--pr-shadow-1)]`
   ├── Recalculates `impactAreasScored` getter
   └── Conditionally displays sub-questions (if value == 3 for P25)
```

---

## 3. Data Model & API Surface

- **Entities / Migrations:** None (Client UI fix only).
- **API Surface:** None (Client state only).

---

## 4. Design Decisions

### `RES-DD-1`: Dedicated `onSelectSegment` vs Mutating `onSelect`

- **Decision:** Introduce a dedicated `onSelectSegment(optionValue: any)` method for the segmented button template instead of altering the existing `onSelect(clickedValue: any)` method.
- **Rationale:** The existing `onSelect()` method is coupled to `<input type="radio" [(ngModel)]="value">` where Angular's `RadioControlValueAccessor` handles value assignment before/during click. Changing `onSelect()`'s signature or assignment behavior could introduce subtle regressions across the 39 consumer screens that use `variant="list"`. A dedicated method guarantees 100% isolation.
- **Implementation Strategy:**
  - In `PrRadioButtonComponent`:
    ```typescript
    onSelectSegment(optionVal: any): void
    ```
    1. If `segmentsDisabled`, ignore click.
    2. If `this.value === optionVal && optionVal !== null`: deselect by setting `this.value = null` and `this.currentVal = null`.
    3. Else: select by setting `this.value = optionVal` and `this.currentVal = optionVal`.
    4. Call `this.onTouch()`.
    5. Call `this.onValueChange(this.value)`.
    6. Emit `this.selectOptionEvent.emit()`.
  - In `pr-radio-button.component.html`:
    Replace:
    ```html
    (click)="onSelect(option[optionValue]); onValueChange(option[optionValue])"
    ```
    With:
    ```html
    (click)="onSelectSegment(option[optionValue])"
    ```

### `RES-DD-2`: Step 2.3 Reversion Challenge

- **Check:** Does this design revert or alter any existing delivered behavior?
- **Result:** No. It only restores missing click-to-select behavior for `variant="segmented"` which was broken since its introduction in `72d1f0519`. `variant="list"` is completely untouched.

---

## 5. Budget (Step 2.4 Sizing)

| Metric | Target |
|---|---|
| Expected Tasks | 2 (Task 1: Component fix + unit regression tests; Task 2: Cypress CT tests) |
| Expected LOC | ~35 LOC total (component + tests) |
| Expected Review Rounds | 1 round |
| Declared Depth | Lite (matches estimate) |
