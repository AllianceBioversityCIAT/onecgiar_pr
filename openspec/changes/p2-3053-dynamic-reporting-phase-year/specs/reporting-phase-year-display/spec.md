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

### Requirement: Reporting-by-ToC entry-point and table labels use the agreed nomenclature

The Reporting-by-ToC entry-point cards and the indicator table headers SHALL use the nomenclature confirmed with the reporter, with the phase year shown dynamically where applicable.

#### Scenario: Entry-point cards

- **WHEN** a user views the Reporting-by-ToC entry point
- **THEN** the "Theory of Change" card is labeled "Results planned in your {active year} ToC" with a hover tooltip "Report results as planned theory of change", and the "Result Category" card is labeled "Report Emerging results" with a hover info note explaining results that emerged outside the {active year} Theory of Change

#### Scenario: Indicator table headers

- **WHEN** a user views the HLO / Intermediate Outcomes / 2030 Outcomes indicator table
- **THEN** the column headers read "KPI statement", "Indicator typology", "{active year} target" (dynamic), "Achieved target" and "Status"
