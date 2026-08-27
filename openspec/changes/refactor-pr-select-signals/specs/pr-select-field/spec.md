## ADDED Requirements

### Requirement: Public input/output contract is preserved
`app-pr-select` SHALL keep the same selector, inputs, `selectOptionEvent` output, and `[(ngModel)]` two-way binding after the signals refactor, so consuming templates need no edits.

#### Scenario: Selector and inputs unchanged
- **WHEN** a template uses `<app-pr-select [options]="..." [optionLabel]="..." [optionValue]="..." [required]="..." [(ngModel)]="model" (selectOptionEvent)="...">`
- **THEN** the component binds those inputs, emits `selectOptionEvent` on selection, and two-way binds `ngModel` exactly as before

#### Scenario: Input defaults unchanged
- **WHEN** instantiated without optional inputs
- **THEN** defaults match the legacy component (`required=true`, `disabled=false`, `editable=false`, `group=false`, `overlayToBody=false`, `expandSpaceOnOpen=false`, `showPartnerAlert=false`, etc.)

### Requirement: Value semantics via ControlValueAccessor
The component SHALL remain a `ControlValueAccessor`; reading its value MUST NOT mutate component state, and selecting an option MUST update the value and emit the selection.

#### Scenario: Writing a value from the form
- **WHEN** `writeValue(v)` is called
- **THEN** the selected option reflects `v` and reading `value` returns `v`

#### Scenario: Selecting an option
- **WHEN** the user clicks an enabled option
- **THEN** `value` becomes `option[optionValue]`, `onChange` is called, and `selectOptionEvent` emits the option

#### Scenario: Disabled option is not selectable
- **WHEN** the user clicks an option marked disabled
- **THEN** no selection occurs and the value is unchanged

### Requirement: Backward-compatible internals surface
The component SHALL keep `_value` and `fullValue` as publicly writable members so existing `@ViewChild`-based resets keep working.

#### Scenario: External reset via _value
- **WHEN** external code sets `_value = ''` (or `[]`) and calls `writeValue('')`
- **THEN** the visible selection clears and reading `value`/`_value` returns the cleared value

#### Scenario: fullValue remains assignable
- **WHEN** external code assigns `fullValue = {}`
- **THEN** the assignment succeeds and does not throw

### Requirement: Option decoration without mutating the source
The component SHALL derive per-option `selected`/`disabled` flags from the current value and `disableOptions` without mutating the original `options` array passed by the parent.

#### Scenario: Source options are not mutated
- **WHEN** the same `options` array reference is shared by two selects with different values
- **THEN** decorating one select's view does not change the other select's `selected`/`disabled` flags on the shared source objects

#### Scenario: Selected flag follows the value
- **WHEN** the bound value matches an option's `optionValue`
- **THEN** that option renders as selected

### Requirement: Reactive reset
Clearing the bound model SHALL clear the visible selection reactively, without destroying and recreating the component.

#### Scenario: Clearing the model clears the selection
- **WHEN** the bound `ngModel` is set to `null` or `''`
- **THEN** the select shows the placeholder and no option is marked selected, with no `*ngIf` toggle required
