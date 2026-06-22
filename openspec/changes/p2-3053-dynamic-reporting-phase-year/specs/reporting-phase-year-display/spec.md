## ADDED Requirements

### Requirement: Reporting-by-ToC views show the active phase year dynamically

The Reporting-by-ToC views (High-Level Outputs, Intermediate Outcomes, 2030 Outcomes) SHALL display the active reporting-phase year from the application's current-phase state, never a hardcoded year. This applies to the phase header and to the target column title.

#### Scenario: Active phase is 2026

- **WHEN** the active reporting phase is 2026 and a user opens a Reporting-by-ToC view
- **THEN** the phase header reads "Reporting Phase 2026" and the target column reads "Expected target 2026"

#### Scenario: Phase year changes with the active phase

- **WHEN** the active reporting phase advances to a later year
- **THEN** the header and target column reflect that year without a code change

#### Scenario: All three views stay consistent

- **WHEN** the active phase year is shown
- **THEN** High-Level Outputs, Intermediate Outcomes and 2030 Outcomes all display the same active year (the shared table drives the column)

#### Scenario: Phase year not yet loaded

- **WHEN** the active phase year is not yet available (before the current-phase request resolves)
- **THEN** the header does not render a stray "null" year (it degrades gracefully until the value is loaded)
