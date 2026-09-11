## ADDED Requirements

### Requirement: pr-select renders without PrimeNG
`app-pr-select` SHALL render with no PrimeNG component or module dependency; its search box uses a native input + Spartan/Tailwind styling.

#### Scenario: No PrimeNG in pr-select
- **WHEN** `pr-select.component.html` is inspected
- **THEN** it contains no `p-iconfield`, `p-inputicon`, `pInputText`, or `primeng/*` reference

#### Scenario: Custom dropdown preserved
- **WHEN** the dropdown is opened
- **THEN** the CDK virtual-scroll option list, grouping, disabled options, and selection behave exactly as before

### Requirement: Search filtering preserved
The in-dropdown search SHALL filter options as before.

#### Scenario: Typing filters options
- **WHEN** the user types in the search box
- **THEN** the option list filters via the existing `listFilterByTextAndAttr` pipe, identical to before

#### Scenario: Facade unchanged
- **WHEN** a template uses `<app-pr-select [options]="..." [optionLabel]="..." [(ngModel)]="m">`
- **THEN** selector, inputs, and two-way binding work exactly as before — no consumer edit
