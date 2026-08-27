## ADDED Requirements

### Requirement: Public input/output contract is preserved
The `app-pr-input` component SHALL expose the same selector, inputs, and outputs after the signals refactor as before it, so that all consuming templates keep working unchanged.

#### Scenario: Selector and inputs unchanged
- **WHEN** a template uses `<app-pr-input [label]="..." [type]="..." [required]="..." [maxWords]="..." [(ngModel)]="model">`
- **THEN** the component binds those inputs and two-way `ngModel` exactly as before, with no consumer template edits required

#### Scenario: Input defaults unchanged
- **WHEN** the component is instantiated without optional inputs
- **THEN** the defaults match the legacy component (`isStatic=false`, `required=true`, `hint=null`, `editable=false`, `noDataText=''`, `autogenerate=false`, `maxDecimals=2`, `showDescription=true`, `lockRequiredFromFieldManager=false`, `showFieldHeader=true`)

### Requirement: Value semantics via ControlValueAccessor
The component SHALL remain a `ControlValueAccessor` and preserve its value normalization rules.

#### Scenario: Writing a value from the form
- **WHEN** `writeValue(v)` is called by Angular forms
- **THEN** the component's rendered value reflects `v` and reading `value` returns `v`

#### Scenario: Link type trims whitespace
- **WHEN** `type` is `'link'` and the user sets a value with surrounding whitespace
- **THEN** the stored value is trimmed and `onChange` is called with the trimmed value

#### Scenario: Negative numbers clamp to zero
- **WHEN** a numeric value less than 0 is set
- **THEN** the stored value becomes `0`

#### Scenario: Value getter has no side effects
- **WHEN** `value` is read multiple times during change detection
- **THEN** reading it does not mutate `wordCount` or any other component state

### Requirement: FieldsManager-driven presentation
When `fieldRef` is provided, the component SHALL derive `label`, `placeholder`, `description`, `required`, and `useColon` from `FieldsManagerService` without mutating its own inputs, and SHALL fall back to the corresponding `@Input` when the manager has no entry.

#### Scenario: Manager values override inputs
- **WHEN** `fieldRef` is set and `FieldsManagerService.fields()[fieldRef]` provides `label`/`placeholder`/`description`/`required`/`useColon`
- **THEN** the field renders using the manager's values

#### Scenario: lockRequiredFromFieldManager keeps input required
- **WHEN** `lockRequiredFromFieldManager` is `true`
- **THEN** the effective `required` comes from the `@Input() required`, not from the manager

#### Scenario: No manager entry falls back to inputs
- **WHEN** `fieldRef` is set but the manager has no entry for it
- **THEN** the field renders using the `@Input` values and `useColon` defaults to `true`

### Requirement: Render gating
The component SHALL render the field only when it is not hidden by FieldsManager, using a pure derivation (no state mutation).

#### Scenario: No fieldRef always renders
- **WHEN** `fieldRef` is not provided
- **THEN** the field renders

#### Scenario: Hidden field does not render
- **WHEN** `fieldRef` is set and the manager entry has `hide` truthy
- **THEN** the field is not rendered

### Requirement: Field state derivation
The component SHALL derive `fieldState` as one of `optional | pending | done | error` from the current value, `required`, `maxWords`, `wordCount`, and `autogenerate`.

#### Scenario: Exceeds word limit
- **WHEN** `maxWords` is set, `wordCount > maxWords`, and `autogenerate` is false
- **THEN** `fieldState` is `error`

#### Scenario: Filled field
- **WHEN** the field has a non-empty value and is not in error
- **THEN** `fieldState` is `done`

#### Scenario: Empty required vs optional
- **WHEN** the field is empty and not in error
- **THEN** `fieldState` is `pending` if required, otherwise `optional`

### Requirement: Word count reacts to value
`wordCount` SHALL be derived reactively from the current value and `maxWords`, and drive the word-counter UI and error state.

#### Scenario: Word count updates on value change
- **WHEN** `maxWords` is set and the value changes
- **THEN** `wordCount` reflects the counter over the new value without a manual read of the `value` getter
