## ADDED Requirements

### Requirement: One geographic focus question for every result type

The Geographic location section SHALL ask `What is the geographic focus of the result?` for every result type and every reporting phase year. The wording MUST NOT vary by indicator category, result type or phase.

#### Scenario: A non-innovation result shows the unified question

- **WHEN** a user opens the Geographic location section of a result that is not an Innovation
- **THEN** the question reads `What is the geographic focus of the result?`
- **AND** the previous wording `What is the main geographic focus of the Output?` is not shown

#### Scenario: An Innovation result in a 2025 phase shows the unified question

- **WHEN** a user opens the Geographic location section of an Innovation use or Innovation development result reported in a 2025 phase
- **THEN** the question reads `What is the geographic focus of the result?`
- **AND** the previous wording `What is the current geographic focus of the innovation development, testing and/or use?` is not shown

#### Scenario: An Innovation result in a 2026+ phase shows the unified question

- **WHEN** a user opens the Geographic location section of an Innovation result reported in a phase from 2026 onwards
- **THEN** the question reads `What is the geographic focus of the result?`
- **AND** the 2026-only wording `What is the location of benefit for this result?` introduced by P2-3036 is no longer shown

#### Scenario: The question is identical wherever it is rendered

- **WHEN** the geographic question is rendered both as the section's field label and as the label passed to the geoscope management component
- **THEN** both read `What is the geographic focus of the result?`

### Requirement: The geographic guidance text is unchanged

Unifying the question SHALL NOT change the guidance description shown under it. The requester explicitly asked for that text to be left alone.

#### Scenario: The guidance line is untouched

- **WHEN** a user opens the Geographic location section
- **THEN** the guidance description renders exactly the text it rendered before this change, for each result type
- **AND** no new guidance wording is introduced

### Requirement: The follow-up geographic sub-questions are unchanged

The questions that appear after a geographic scope is selected SHALL keep their current wording and their current show/hide behaviour.

#### Scenario: Sub-questions behave as before

- **WHEN** a user selects a geographic scope that is neither Global nor "yet to be determined"
- **THEN** the question about other geographic areas where the innovation could be impactful appears exactly as it did before this change
- **AND** its own guidance and the follow-up scope question are unchanged
