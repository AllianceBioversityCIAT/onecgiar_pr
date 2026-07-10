## ADDED Requirements

### Requirement: pr-input renders without PrimeNG
`app-pr-input` SHALL render using native inputs + Spartan/Tailwind styling, with no PrimeNG component or module dependency.

#### Scenario: No PrimeNG in pr-input
- **WHEN** `pr-input.component.html` and `.ts` are inspected
- **THEN** they contain no `pInputText`, `p-inputNumber`, `p-message`, or `primeng/*` import

#### Scenario: Facade unchanged
- **WHEN** a template uses `<app-pr-input [type]="..." [required]="..." [(ngModel)]="m">`
- **THEN** the selector, inputs, and two-way binding work exactly as before — no consumer edit

### Requirement: All input types preserved
The component SHALL support text, email, number, currency, and link exactly as before.

#### Scenario: Text and link
- **WHEN** `type` is text or link
- **THEN** the value binds and displays as before (link read-only view uses `aTag`)

#### Scenario: Email validation
- **WHEN** `type` is email and the value is invalid
- **THEN** an error message renders (styled div, not p-message) with the same "required"/"valid email" text

#### Scenario: Number and currency
- **WHEN** `type` is number → a numeric input clamped at min 0; **WHEN** `type` is currency → the value displays USD-formatted (e.g. `$1,234.56`) on blur and stores a number
- **THEN** the CVA value stays numeric and 0/decimals/empty behave as before
