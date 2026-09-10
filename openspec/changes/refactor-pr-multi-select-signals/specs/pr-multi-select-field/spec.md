## ADDED Requirements

### Requirement: Public input/output contract is preserved
`app-pr-multi-select` SHALL keep the same selector, inputs, `selectOptionEvent` and `removeOptionEvent` outputs, and `[(ngModel)]` two-way binding after the signals refactor, so consuming templates need no edits.

#### Scenario: Selector, inputs and outputs unchanged
- **WHEN** a template uses `<app-pr-multi-select [options]="..." [optionLabel]="..." [optionValue]="..." [selectedLabel]="..." [(ngModel)]="model" (selectOptionEvent)="..." (removeOptionEvent)="...">`
- **THEN** the component binds those inputs, emits both outputs with the same payloads, and two-way binds `ngModel` exactly as before

#### Scenario: Input defaults unchanged
- **WHEN** instantiated without optional inputs
- **THEN** defaults match the legacy component (`required=true`, `hideSelect=false`, `isStatic=false`, `showSelectAll=false`, `group=false`, `showPartnerAlert=false`, `confirmDeletion=false`, `logicalDeletion=false`, `showDescriptionLabel=true`, `cannotRemoveOptionValues=[]`)

### Requirement: Multi-value semantics via ControlValueAccessor
The component SHALL remain a `ControlValueAccessor` whose value is an array of selected option objects; reading its value MUST NOT mutate component state.

#### Scenario: Writing an array of objects
- **WHEN** `writeValue([{id:1},{id:2}])` is called
- **THEN** those two options render as selected and reading `value` returns the array

#### Scenario: Writing an array of IDs
- **WHEN** `writeValue([1,2])` is called and `options` contains objects with matching `optionValue`
- **THEN** the IDs are mapped to their option objects for chip rendering and selection

#### Scenario: Selecting an option
- **WHEN** the user checks an enabled option
- **THEN** it is appended to `value` (with `new:true, is_active:true`), `onChange` is called, and `selectOptionEvent` emits `{ option }`

#### Scenario: Deselecting an option
- **WHEN** the user unchecks a previously selected option and `logicalDeletion` is false
- **THEN** it is removed from `value`

### Requirement: Logical deletion (soft delete)
When `logicalDeletion` is true, deselecting a previously-saved (not `new`) option SHALL keep it in the value with `is_active=false` rather than removing it.

#### Scenario: Soft-deleting a saved option
- **WHEN** `logicalDeletion` is true and the user removes a saved option
- **THEN** the option stays in `value` with `is_active=false` and its chip renders in the inactive state

### Requirement: Backward-compatible internals surface
The component SHALL keep `_value` as a publicly writable member so existing `@ViewChild`-based resets keep working.

#### Scenario: External reset via _value
- **WHEN** external code sets `_value = []` and calls `writeValue([])`
- **THEN** the visible selection clears and reading `value`/`_value` returns `[]`

### Requirement: Flat-mode option decoration without mutating the source
In flat (non-grouped) mode the component SHALL derive per-option `selected`/`disabled` flags from the current value and `disableOptions` without mutating the original `options` array passed by the parent.

#### Scenario: Source options are not mutated
- **WHEN** the same `options` array reference is shared by two flat multi-selects with different values
- **THEN** decorating one select's view does not change the other select's `selected`/`disabled` flags on the shared source objects

#### Scenario: Selected flags follow the value
- **WHEN** the bound value contains an option matching an `optionValue`
- **THEN** that option renders as checked

### Requirement: Reactive flat reset
Clearing the bound model in flat mode SHALL clear the visible selection reactively, without destroying and recreating the component.

#### Scenario: Clearing the model clears the selection
- **WHEN** the bound `ngModel` is set to `[]` or `null`
- **THEN** all checkboxes clear and no chips remain, with no `*ngIf` toggle required

### Requirement: Select all / unselect all
When `showSelectAll` is true, toggling the bulk selector SHALL set the value to all options (select all) or an empty array (unselect all) and emit `selectOptionEvent`, without the model being mutated as a side effect of a getter.

#### Scenario: Select all
- **WHEN** the user clicks "Select all"
- **THEN** `value` becomes every option and `selectOptionEvent` emits

#### Scenario: Unselect all
- **WHEN** the user clicks "Unselect all"
- **THEN** `value` becomes `[]` and `selectOptionEvent` emits

### Requirement: Chip removal guards
The delete affordance on a chip SHALL respect `readOnly`/role read-only/`isStatic`, `selectedPrimary`, and `cannotRemoveOptionValues`, and SHALL show the confirmation dialog when `confirmDeletion` is true for newly-added options.

#### Scenario: Non-removable option
- **WHEN** an option's `optionValue` is in `cannotRemoveOptionValues`
- **THEN** its chip shows no delete button

#### Scenario: Confirm before removing
- **WHEN** `confirmDeletion` is true and the user removes a new option
- **THEN** a confirmation dialog is shown and removal happens only on confirm
