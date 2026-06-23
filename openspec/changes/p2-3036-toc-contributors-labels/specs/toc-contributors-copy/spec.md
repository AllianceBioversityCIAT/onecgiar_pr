## ADDED Requirements

### Requirement: ToC alignment question label
The P25 Contributors & Partners section SHALL display the ToC-alignment question with the 2026 wording.

#### Scenario: Question label updated
- **WHEN** a user opens the Contributors & Partners section of a P25 result
- **THEN** the yes/no question reads `"Can this result be mapped to a planned TOC KPI or indicator?"`
- **AND** the previous text `"Does this result align with the Program's planned TOC indicators?"` no longer appears anywhere in the section

#### Scenario: Contributor row mirrors the new label
- **WHEN** the section builds the per-contributor question string (component TS)
- **THEN** it uses the new label `"Can this result be mapped to a planned TOC KPI or indicator?"` (prefixed by the contributor code/short name), not the old phrasing

### Requirement: ToC question info note text
The info note shown beneath the ToC-alignment question SHALL display the 2026 guidance text from the Excel (row 5).

#### Scenario: Info note shows 2026 wording
- **WHEN** the Contributors & Partners section renders the info note under the ToC question
- **THEN** it reads: `"If Yes, please select the relevant level, KPI and indicator, and indicate the result contribution to the indicator target. If No, please provide a short justification explaining why this result is being reported outside the 2026 TOC KPI/indicators. No-mapped results will be shared with the Program team for consideration as part of the adaptive management process, and may feed into updates to the Program's 2027 TOC."`
- **AND** no references to "2025 ToC" remain in this info note

### Requirement: Indicator field renamed to KPI Statement/description
The indicator selector in the ToC detail SHALL be labeled `"KPI Statement/description"`.

#### Scenario: Field label updated
- **WHEN** the ToC detail (multiple-wps content) renders the indicator selector
- **THEN** its label reads `"KPI Statement/description"` instead of `"Indicator"`

### Requirement: KPI Statement/description help text
The `KPI Statement/description` field SHALL show the ToC-mapping help text from the Excel (row 12).

#### Scenario: Help text present
- **WHEN** the indicator/KPI selector is rendered
- **THEN** inline help text reads `"Maps to TOC: [KPI Statement – deliverable short name and indicator description]"`

### Requirement: Contribution to indicator target info note text
The info note for the Contribution-to-indicator-target field SHALL display the 2026 guidance from the Excel (row 18).

#### Scenario: Contribution Target info note shows 2026 wording
- **WHEN** a user has selected an indicator and the Contribution-to-indicator-target block is shown
- **THEN** the info note reads the 2026 text describing using the indicator's unit of measurement, the examples (farmers / USD / workshops), the Knowledge Product guidance (enter `1`, or `0` for complementary results), and the aggregation note toward "the planned 2026 KPIs and indicator targets"
- **AND** no references to a "2025 target" remain in this info note
