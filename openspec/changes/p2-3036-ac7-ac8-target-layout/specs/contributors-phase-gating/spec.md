## ADDED Requirements

### Requirement: 2026 indicator/target layout groups read-only TOC data
In the 2026 Yes scenario, the read-only "Unit of measurement" and "Target" values SHALL render directly below the "Indicator Tipology" field so all read-only TOC-derived data is visually grouped. In phase 2025 the position is unchanged.

#### Scenario: 2026 read-only grouping
- **WHEN** a P25 result whose `phase_year >= 2026` selects a KPI/indicator in the Contributors & Partners Yes scenario
- **THEN** "Unit of measurement" and "Target" appear immediately under "Indicator Tipology", above the "Contribution to indicator target" input

#### Scenario: 2025 layout unchanged
- **WHEN** a P25 result whose `phase_year < 2026` opens the same section
- **THEN** "Unit of measurement" and "Target" stay in their original position

### Requirement: 2026 contribution-to-target is mandatory with updated placeholder
In the 2026 Yes scenario, the "Contribution to indicator target" field SHALL be marked mandatory with a visible red asterisk, and its input placeholder SHALL read "Add here contribution to target". In phase 2025 the field stays optional with its original "Enter target" placeholder.

#### Scenario: 2026 mandatory contribution
- **WHEN** a P25 `phase_year >= 2026` result shows the contribution-to-target input
- **THEN** the field label shows a red asterisk and the input placeholder is "Add here contribution to target"

#### Scenario: 2025 contribution unchanged
- **WHEN** a P25 `phase_year < 2026` result shows the contribution-to-target input
- **THEN** no asterisk is added and the placeholder remains "Enter target"

### Requirement: 2026 hides the TOC-pathway explanation textarea
In the 2026 Yes scenario, the "Explanation of how the result aligns with/contributes to the Program's TOC pathway" textarea SHALL be hidden. In phase 2025 it stays visible.

#### Scenario: 2026 explanation hidden
- **WHEN** a P25 `phase_year >= 2026` result selects Yes in "Can this result be mapped to a planned TOC KPI or indicator?"
- **THEN** the "Explanation of how the result aligns with/contributes to the Program's TOC pathway" textarea is not rendered

#### Scenario: 2025 explanation shown
- **WHEN** a P25 `phase_year < 2026` result is in the same scenario
- **THEN** the explanation textarea renders as before
