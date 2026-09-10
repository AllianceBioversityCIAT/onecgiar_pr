## ADDED Requirements

### Requirement: Selection synchronises the bound model

`app-pr-multi-select` SHALL keep the `[(ngModel)]`-bound array and the rendered checkbox state in agreement in both directions, using `optionValue` as the stored identity and `optionLabel` as the displayed text.

#### Scenario: Selecting an option adds its optionValue to the model
- **WHEN** the user opens the dropdown and clicks an unchecked option
- **THEN** that option renders as checked
- **AND** the bound model contains the option's `optionValue` (not the whole object, unless `optionValue` is absent)
- **AND** `selectOptionEvent` emits once

#### Scenario: Deselecting from inside the dropdown removes it from the model
- **WHEN** the user clicks an already-checked option in the dropdown
- **THEN** the option renders as unchecked
- **AND** its value is removed from the bound model

#### Scenario: Pre-existing model values render as checked on mount
- **WHEN** the component mounts with a model already holding two option values
- **THEN** exactly those two options render as checked
- **AND** the selected-count label reflects two selections

### Requirement: The component reacts to external model mutation

The component SHALL reflect changes the parent makes to the bound array **in place** (`splice`, `push`), not only wholesale reassignment. This is the documented regression path for this component and MUST stay covered.

#### Scenario: External in-place removal unchecks the option
- **WHEN** the parent removes an entry from the bound array with `splice` while the dropdown is open
- **THEN** the corresponding checkbox becomes unchecked without user interaction
- **AND** the selected-count label decreases accordingly

#### Scenario: External in-place addition checks the option
- **WHEN** the parent `push`es a value into the bound array
- **THEN** the matching option renders as checked

### Requirement: Options arriving after mount are rendered

Options are supplied by asynchronous API calls in every real consumer, so the component SHALL render options that arrive **after** the initial render.

#### Scenario: Late-arriving options appear in the dropdown
- **WHEN** the component mounts with `[options]` as an empty array and the parent later replaces it with three options
- **THEN** the dropdown lists the three options
- **AND** any value already present in the bound model renders as checked

### Requirement: The parent's options array is never mutated

The component SHALL treat `[options]` as read-only input. Consumers share catalog arrays from singleton services (`CentersService.centersList`, `InstitutionsService`), so mutating them corrupts unrelated screens.

#### Scenario: Selecting does not alter the source array
- **WHEN** the user selects and then deselects several options
- **THEN** the array reference passed by the parent is unchanged in length, order, and object identity

### Requirement: Disabled options cannot be selected

`[disableOptions]` (used by 10 consumers, e.g. the CGSpace-locked centers in `rd-contributors-and-partners`) SHALL prevent selection while keeping the option visible.

#### Scenario: A disabled option rejects interaction
- **WHEN** the user clicks an option whose value is listed in `[disableOptions]`
- **THEN** the option does not become checked
- **AND** the bound model is unchanged
- **AND** the option remains visible in the list

### Requirement: Protected options cannot be removed

`[cannotRemoveOptionValues]` SHALL block removal of the listed values while allowing every other value to be removed normally.

#### Scenario: The protected value offers no removal affordance
- **WHEN** a value listed in `[cannotRemoveOptionValues]` is selected
- **THEN** its chip exposes no remove control
- **AND** attempting to deselect it from the dropdown leaves it in the bound model

#### Scenario: Unprotected values remain removable
- **WHEN** the user removes a selected value that is not in the protected list
- **THEN** it is removed from the model as usual

### Requirement: Deletion guards behave as configured

`[confirmDeletion]` (4 consumers) and `[logicalDeletion]` (1 consumer) SHALL alter how a selected value is removed.

#### Scenario: confirmDeletion requires confirmation before removing
- **WHEN** `[confirmDeletion]` is true and the user removes a selected value
- **THEN** the value is NOT removed until the confirmation is accepted
- **AND** dismissing the confirmation leaves the model unchanged

#### Scenario: logicalDeletion marks instead of dropping
- **WHEN** `[logicalDeletion]` is true and the user removes a selected value
- **THEN** the entry remains in the bound model flagged as deleted rather than being spliced out

### Requirement: Select-all covers exactly the selectable options

`[showSelectAll]` SHALL select every option the user is allowed to select.

#### Scenario: Select all checks all enabled options
- **WHEN** the user activates "Select all"
- **THEN** every enabled option is checked and present in the model
- **AND** options listed in `[disableOptions]` are NOT added

#### Scenario: Deselect all clears the removable selection
- **WHEN** every option is selected and the user deactivates "Select all"
- **THEN** the model retains only values protected by `[cannotRemoveOptionValues]`

### Requirement: Searching filters without losing selection

The in-dropdown search SHALL be a view filter only.

#### Scenario: Typing narrows the list and preserves the model
- **WHEN** the user has selections and types text matching a subset of options
- **THEN** only matching options are listed
- **AND** the bound model is unchanged
- **AND** clearing the search restores the full list with the original checkboxes still checked

#### Scenario: Selecting a filtered option keeps prior selections
- **WHEN** the user filters the list and selects a match
- **THEN** the new value is appended to the existing selection rather than replacing it

### Requirement: Read-only state hides interaction for every field

Every `custom-fields` component SHALL hide its interactive control when `RolesService.readOnly` is true or `[readOnly]` is set, while still displaying the current value. `RolesService.readOnly` defaults to `true`, so this is the default rendering path in the app.

#### Scenario: Read-only renders value without controls
- **WHEN** a field is mounted with `readOnly` true and a value present
- **THEN** the value is visible as text
- **AND** no editable control, dropdown trigger, or remove affordance is rendered

#### Scenario: Editable mounts expose the control
- **WHEN** the same field is mounted with `editable: true`
- **THEN** the interactive control is present and operable

### Requirement: Static rendering shows values without editing

`[isStatic]` (7 consumers) SHALL render the selected values as plain content while suppressing editing, independently of the role gate.

#### Scenario: Static field lists its values
- **WHEN** a field is mounted with `[isStatic]="true"` and two values selected
- **THEN** both values are displayed
- **AND** no dropdown opens on click

### Requirement: Required fields expose the mandatory-completeness DOM contract

Required fields SHALL emit the `.pr-field.mandatory` marker and toggle `.complete`, because `DataControlService.someMandatoryFieldIncompleteResultDetail()` scans this DOM to build the submission validation list. A field that renders correctly but omits these classes silently breaks submission validation.

#### Scenario: Empty required field is marked incomplete
- **WHEN** a field with `[required]="true"` holds no value
- **THEN** its root carries `.pr-field.mandatory` without `.complete`

#### Scenario: Filled required field is marked complete
- **WHEN** the same field receives a value
- **THEN** its root carries `.complete`

#### Scenario: Optional fields are not scanned
- **WHEN** a field is mounted with `[required]="false"`
- **THEN** its root does NOT carry the `mandatory` marker regardless of value

### Requirement: Labels, placeholders and counts render as configured

Fields SHALL render the `label`, `placeholder` and `selectedLabel` text supplied by the parent, and the placeholder SHALL be visible only while the field holds no value. These are set as static attributes by most consumers (`placeholder=` in 23 templates, `selectedLabel=` in 15).

#### Scenario: Placeholder shows only while empty
- **WHEN** a field with a `placeholder` holds no value
- **THEN** the placeholder text is visible
- **AND** it is replaced by the value representation once a selection exists

#### Scenario: Selected-count label reflects the selection
- **WHEN** `selectedLabel` is configured and two options are selected
- **THEN** the rendered summary reports two selections using that label

### Requirement: Single-value fields honour the same model contract

`app-pr-select`, `app-pr-input`, `app-pr-textarea`, `app-pr-checkbox`, `app-pr-radio-button`, `app-pr-yes-or-not` and `app-pr-range-level` SHALL implement `ControlValueAccessor` such that the bound model and the rendered control stay in agreement in both directions.

#### Scenario: User input propagates to the model
- **WHEN** the user sets a value through the control
- **THEN** the bound model holds that value
- **AND** the component's change event emits once

#### Scenario: Programmatic model change updates the control
- **WHEN** the parent assigns a new value to the bound model
- **THEN** the control displays that value without user interaction

#### Scenario: Clearing resets both sides
- **WHEN** the parent sets the bound model to `null`
- **THEN** the control renders empty and shows its placeholder

### Requirement: Behavioural differences from the production reference are reported

Where a component's observable behaviour on this branch differs from the same component on `master` along a path a real consumer depends on, the difference SHALL be recorded as a defect candidate with expected-vs-actual and its `master` evidence. Production code SHALL NOT be modified to make a contract test pass, and a contract test SHALL NOT be weakened to match current behaviour.

#### Scenario: A contract test fails
- **WHEN** a contract test derived from `master` or from real consumer usage fails on this branch
- **THEN** it is listed in the defect report with the reproduction and the reference evidence
- **AND** it is left failing pending the user's decision on whether it is a bug or an intentional redesign
