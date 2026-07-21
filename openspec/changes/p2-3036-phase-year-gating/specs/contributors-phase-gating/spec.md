## ADDED Requirements

### Requirement: Reporting-phase-year threshold is centralized
The redesign threshold year SHALL be defined in a single enum so future thresholds are a one-line change.

#### Scenario: Threshold defined once
- **WHEN** the Contributors & Partners redesign needs a gating year
- **THEN** it reads `ReportingDesignYear.ContributorsPartnersRedesign` (2026) rather than a hard-coded literal in templates

### Requirement: 2026+ shows the redesigned section
When the open result's reporting phase year is 2026 or later, the Contributors & Partners section SHALL render the redesigned UI.

#### Scenario: 2026 result
- **WHEN** a P25 result whose `phase_year >= 2026` opens the Contributors & Partners section
- **THEN** the Submitter field is absent, the question reads "Can this result be mapped to a planned TOC KPI or indicator?", the indicator field is labeled "KPI Statement/description" with its help text, the info notes use the 2026/2027 wording, Level/HLO are hidden in the No scenario, and the justification limit is 50 words

### Requirement: 2025 keeps the legacy section
When the open result's reporting phase year is earlier than 2026, the section SHALL render exactly as before the redesign.

#### Scenario: 2025 result
- **WHEN** a P25 result whose `phase_year < 2026` opens the Contributors & Partners section
- **THEN** the Submitter field is present, the question reads "Does this result align with the Program's planned TOC indicators?", the indicator field is labeled "Indicator", the info notes use the original 2025 wording, Level/HLO are shown in the No scenario, and the justification limit is 30 words
