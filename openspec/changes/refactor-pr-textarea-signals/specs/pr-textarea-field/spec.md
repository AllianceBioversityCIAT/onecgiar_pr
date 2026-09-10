## ADDED Requirements

### Requirement: Public input contract is preserved
The `app-pr-textarea` component SHALL expose the same selector and inputs after the signals refactor as before it, so that all consuming templates keep working unchanged.

#### Scenario: Selector and inputs unchanged
- **WHEN** a template uses `<app-pr-textarea [label]="..." [description]="..." [maxWords]="..." [required]="..." [rows]="..." [(ngModel)]="model">`
- **THEN** the component binds those inputs and two-way `ngModel` exactly as before, with no consumer template edits required

#### Scenario: Input defaults unchanged
- **WHEN** the component is instantiated without optional inputs
- **THEN** the defaults match the legacy component (`isStatic=false`, `required=true`, `hint=null`, `rows=5`, `autogenerate=false`, `showDescriptionLabel=true`, `labelDescInlineStyles=''`)

### Requirement: Value semantics via ControlValueAccessor
The component SHALL remain a `ControlValueAccessor` and preserve its value semantics.

#### Scenario: Writing a value from the form
- **WHEN** `writeValue(v)` is called by Angular forms
- **THEN** the rendered textarea reflects `v` and reading `value` returns `v`, without `onChange` being invoked

#### Scenario: User edit propagates once per change
- **WHEN** the user types into the textarea, changing the value
- **THEN** the stored value updates and `onChange` is called with the new value; setting an identical value does not re-invoke `onChange`

#### Scenario: Value getter has no side effects
- **WHEN** `value` is read multiple times during change detection
- **THEN** reading it does not mutate `wordCount` or any other component state

### Requirement: FieldsManager-driven presentation
When `fieldRef` is provided, the component SHALL derive `label`, `placeholder`, `description`, and `required` from `FieldsManagerService` without mutating its own inputs, and SHALL fall back to the corresponding input when the manager has no entry.

#### Scenario: Manager values override inputs
- **WHEN** `fieldRef` is set and `FieldsManagerService.fields()[fieldRef]` provides `label`/`placeholder`/`description`/`required`
- **THEN** the field renders using the manager's values

#### Scenario: No manager entry falls back to inputs
- **WHEN** `fieldRef` is set but the manager has no entry for it
- **THEN** the field renders using the input values

### Requirement: Render gating
The component SHALL render the field only when it is not hidden by FieldsManager, using a pure derivation (no state mutation).

#### Scenario: No fieldRef always renders
- **WHEN** `fieldRef` is not provided
- **THEN** the field renders

#### Scenario: Hidden field does not render
- **WHEN** `fieldRef` is set and the manager entry has `hide` truthy
- **THEN** the field is not rendered

### Requirement: Word count reacts to value
`wordCount` SHALL be derived reactively from the current value when `maxWords` is set, and drive the word-counter UI and the invalid/warning textarea styling.

#### Scenario: Word count updates on value change
- **WHEN** `maxWords` is set and the value changes
- **THEN** `wordCount` reflects `WordCounterService.counter` over the new value without a manual read of the `value` getter

#### Scenario: Exceeding the limit styles the field
- **WHEN** `wordCount > maxWords` and `autogenerate` is false
- **THEN** the textarea shows the `invalid` style and the field card shows the error state; with `autogenerate` true it shows the `warning` style instead

### Requirement: Field state derivation
The component SHALL derive `fieldState` as one of `optional | pending | done | error` from the current value, `required`, `maxWords`, `wordCount`, and `autogenerate`.

#### Scenario: Exceeds word limit
- **WHEN** `maxWords` is set, `wordCount > maxWords`, and `autogenerate` is false
- **THEN** `fieldState` is `error`

#### Scenario: Filled field
- **WHEN** the field has a non-empty (non-whitespace) value and is not in error
- **THEN** `fieldState` is `done`

#### Scenario: Empty required vs optional
- **WHEN** the field is empty and not in error
- **THEN** `fieldState` is `pending` if required, otherwise `optional`

### Requirement: Read-only rendering
When read-only (`readOnly` input or `RolesService.readOnly`) and not `isStatic`, the component SHALL render the value as HTML instead of the textarea, with the legacy empty-value placeholders.

#### Scenario: Read-only with value
- **WHEN** the field is read-only and holds a value
- **THEN** the value renders via `innerHtml` and no textarea is shown

#### Scenario: Read-only without value
- **WHEN** the field is read-only and empty
- **THEN** it renders the red italic "Not provided" text if required, otherwise "Not applicable"
