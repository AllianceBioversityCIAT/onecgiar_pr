## MODIFIED Requirements

### Requirement: Reporting-by-ToC entry-point and table labels use the agreed nomenclature

The Reporting-by-ToC entry-point cards and the indicator table headers SHALL use the nomenclature confirmed with the reporter, with the phase year shown dynamically where applicable.

#### Scenario: Entry-point cards

- **WHEN** a user views the Reporting-by-ToC entry point
- **THEN** the "Theory of Change" card is labeled "Results planned in your {active year} ToC" with a hover tooltip "Report results as planned theory of change", and the "Result Category" card is labeled "Report Emerging results" with a hover info note explaining results that emerged outside the {active year} Theory of Change

#### Scenario: Indicator table headers (outputs and outcomes)

- **WHEN** a user views the HLO / Intermediate Outcomes indicator table
- **THEN** the column headers read "KPI statement", "Indicator typology", "{active year} target" (dynamic), "Achieved value" and "Status"

#### Scenario: 2030 Outcomes table headers

- **WHEN** a user views the 2030 Outcomes indicator table
- **THEN** the target column reads **"2030 target"** (fixed, not the active reporting phase year), and the achieved column reads **"Achieved value"**
