# Requirements: Fix Impact Area Scores Segmented Radio Selection

## Document Control

| Attribute | Value |
|---|---|
| Spec Path | `docs/specs/results/bugfix-impact-area-scores` |
| Type | Bug (Bug Mode) |
| Depth | Lite |
| Approval Mode | gated |
| Module | `results` (`onecgiar-pr-client`) |
| Related Proposal | [`proposal.md`](./proposal.md) |
| Target Files | `src/app/custom-fields/pr-radio-button/pr-radio-button.component.{ts,html}` |

---

## 1. Executive Summary

In commit `72d1f0519`, `variant="segmented"` was introduced for `PrRadioButtonComponent` to render the 5 Impact Area score fields as horizontal button tracks. Because `<button>` lacks Angular's native `RadioControlValueAccessor` and neither `onSelect` nor `onValueChange` set `this.value` on selection, clicking options `0 Not Targeted`, `1 Significant`, or `2 Principal` does nothing. This spec corrects `PrRadioButtonComponent` to properly assign, emit, and toggle values in segmented mode, restoring completion of the General Information section.

---

## 2. Defect Classes & Verification Mapping

| Defect Class | How It Manifests | Catching Verification Command |
|---|---|---|
| Value Unassigned on Click | Segment button clicked but `value` remains `null`/`undefined` | Unit test in `pr-radio-button.component.spec.ts` asserting `component.value` after click |
| Form Model Desynchronization | Segment selected but parent `[(ngModel)]` / `FormGroup` not notified | Unit test asserting `onChange` and `onTouch` spy calls; Cypress CT test asserting bound host model |
| Toggle / De-selection Regression | Re-clicking selected segment fails to clear value to `null` | Unit test & Cypress CT test asserting model is `null` on re-click |
| Visual State Inactive | Active segment button missing white background / shadow styling | Cypress CT test asserting `.bg-white` and `aria-checked="true"` on selected button |

---

## 3. Functional Requirements

### `RES-R-SCORE-1`: Segmented Radio Selection & Toggle

`PrRadioButtonComponent` (`variant="segmented"`) SHALL update its internal value and notify Angular form controls when an option segment is clicked.

#### Scenario 1: Select an unselected score segment (Bug Reproduction Case)
- **GIVEN** `variant="segmented"` with options `[(0) Not Targeted, (1) Significant, (2) Principal]` and current value `null`
- **WHEN** the user clicks the segment button for `(0) Not Targeted` (id: `1`)
- **THEN** `this.value` becomes `1`
- **AND** `this.onChange(1)` is invoked
- **AND** `this.onTouch()` is invoked
- **AND** `this.selectOptionEvent` emits
- **AND** the button gains `aria-checked="true"` and the active styling classes (`bg-white shadow-[var(--pr-shadow-1)]`)
- **BUT IT MUST NOT** modify the value if `segmentsDisabled` is true

#### Scenario 2: Re-click the currently selected segment (De-selection)
- **GIVEN** `variant="segmented"` with current value `1`
- **WHEN** the user clicks the segment button for `(0) Not Targeted` (id: `1`) again
- **THEN** `this.value` becomes `null`
- **AND** `this.onChange(null)` is invoked
- **AND** `this.selectOptionEvent` emits
- **AND** all segment buttons have `aria-checked="false"` and transparent background

#### Scenario 3: Switch between score segments
- **GIVEN** `variant="segmented"` with current value `1`
- **WHEN** the user clicks the segment button for `(2) Principal` (id: `3`)
- **THEN** `this.value` becomes `3`
- **AND** `this.onChange(3)` is invoked
- **AND** segment `(2)` becomes active while segment `(0)` becomes inactive

---

### `RES-R-SCORE-2`: General Information Score Integration

The parent General Information form (`rd-general-information`) SHALL reflect the chosen score immediately upon interaction.

#### Scenario 1: Score selection increments completion counter
- **GIVEN** the General Information page with `0 of 5 impact areas scored`
- **WHEN** the user clicks `0 Not Targeted` on the Gender equality tag
- **THEN** `generalInfoBody.gender_tag_id` receives the selected ID
- **AND** `impactAreasScored` counter displays `1 of 5 impact areas scored`
- **AND IT MUST** conditionally expose sub-questions when score `3` (`2 Principal`) is selected for P25

---

## 4. Non-Functional Requirements

- **NFR-1 (Zero Regression on List Variant):** Native radio behavior (`variant="list"`) must remain completely untouched.
- **NFR-2 (Accessibility):** `role="radio"` and `aria-checked` attributes on the buttons must accurately reflect selected state.

---

## 5. Mandatory Regression Test (Bug Mode)

At least one automated unit test in `pr-radio-button.component.spec.ts` MUST exercise `variant="segmented"` clicking an unselected segment button, verifying that `component.value` is updated and `onChange` is called. The test MUST fail on current code and pass after the fix.
