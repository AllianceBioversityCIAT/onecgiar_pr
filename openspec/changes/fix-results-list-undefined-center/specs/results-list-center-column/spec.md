## ADDED Requirements

### Requirement: Center column empty state

The Center column of the results list SHALL display the result's lead center name when a lead center exists, and SHALL render an empty cell (no text) when the result has no lead center. The column MUST NOT render the literal text `"Undefined"`.

#### Scenario: Result has a lead center

- **WHEN** a result has a non-empty `lead_center` value
- **THEN** the Center column displays that `lead_center` value

#### Scenario: Result has no lead center (led by an external partner)

- **WHEN** a result's `lead_center` is null or empty
- **THEN** the Center column renders an empty cell
- **AND** the literal text `"Undefined"` is never shown

### Requirement: Documented future fallback to lead partner

The code SHALL carry a documented note (TODO referencing P2-3049) indicating that, in a future change, the Center column is expected to fall back to displaying the result's lead partner when no lead center exists.

#### Scenario: Developer reads the Center column binding

- **WHEN** a developer inspects the Center column template binding
- **THEN** a comment documents that the empty cell is intentional and that the future behavior is to display the lead partner instead
