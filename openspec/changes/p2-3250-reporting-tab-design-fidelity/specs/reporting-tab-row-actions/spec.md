## ADDED Requirements

### Requirement: No inert row control
Every interactive control rendered on an indicator row of the Reporting tab MUST be bound to a
handler that produces an observable effect. A control whose `output()` is not bound by the host
template MUST NOT be rendered.

#### Scenario: Overflow menu button is bound
- **WHEN** `ReportingAowTableComponent` renders the row overflow (`⋯`) button
- **THEN** the host template binds `(openRowMenu)` to a handler
- **AND** pressing the button opens the row menu

#### Scenario: An unbound output fails review
- **WHEN** a component declares an `output()` that the host template does not bind
- **AND** a control in the template emits that output
- **THEN** the control MUST be either bound or removed before merge

### Requirement: Row overflow menu contents
The row overflow menu SHALL contain exactly the three actions the design specifies, in order:
`View reported results`, `Target details`, `Copy indicator code`.

#### Scenario: View reported results
- **WHEN** the user chooses `View reported results`
- **THEN** the system opens the shared `indicator-drawer` on its `report` tab for that row
- **AND** it reuses the same handler as clicking the row's `Achieved` figure, opening no second surface

#### Scenario: Target details
- **WHEN** the user chooses `Target details`
- **THEN** the system opens the shared `indicator-drawer` on its `info` tab for that row
- **AND** it reuses the same handler as clicking the row's `Target` figure

#### Scenario: Copy indicator code succeeds
- **WHEN** the user chooses `Copy indicator code`
- **THEN** the indicator's code is written to the clipboard
- **AND** a confirmation toast is shown

#### Scenario: Copy indicator code without clipboard access
- **WHEN** the user chooses `Copy indicator code`
- **AND** the clipboard API is unavailable or rejects
- **THEN** the system MUST surface the code to the user in a toast instead of failing silently

#### Scenario: Menu dismissal
- **WHEN** the row menu is open
- **AND** the user presses `Escape` or clicks outside it
- **THEN** the menu closes
- **AND** the row is not opened by that click

### Requirement: Row action button reflects state
The row's primary action button SHALL be `Report` when nothing is reported, `Continue` while in
progress, and absent once the indicator is achieved or overachieved.

#### Scenario: Not started
- **WHEN** an indicator's derived status is `not-started`
- **THEN** the row shows a `Report` button

#### Scenario: In progress
- **WHEN** an indicator's derived status is `in-progress`
- **THEN** the row shows a `Continue` button

#### Scenario: Achieved
- **WHEN** an indicator's derived status is `achieved` or `overachieved`
- **THEN** the row shows no action button

#### Scenario: User may not report
- **WHEN** the user is not permitted to report on this programme
- **THEN** the row shows no action button regardless of status
