## ADDED Requirements

### Requirement: Submitter field removed
The Contributors & Partners (P25) section SHALL NOT display the "Submitter" field.

#### Scenario: Submitter not shown
- **WHEN** a user opens the Contributors & Partners section of a P25 result
- **THEN** there is no "Submitter" selector and no "…not possible to change the submitter" note
- **AND** saving the section still works (the primary initiative value is preserved)

### Requirement: Level hidden in the No scenario
The "Level" dropdown SHALL be hidden when the ToC alignment answer is "No".

#### Scenario: No answer hides Level
- **WHEN** the ToC question is answered "No" (`isUnplanned`)
- **THEN** the "Level" dropdown is not rendered

#### Scenario: Yes answer still shows Level
- **WHEN** the ToC question is answered "Yes"
- **THEN** the "Level" dropdown is rendered as before

### Requirement: HLO/Outcome hidden in the No scenario
The "High Level Output/Intermediate Outcome/2030 Outcome" dropdown SHALL be hidden when the ToC alignment answer is "No".

#### Scenario: No answer hides HLO/Outcome
- **WHEN** the ToC question is answered "No" (`isUnplanned`)
- **THEN** the High Level Output/Intermediate Outcome/2030 Outcome (Title) dropdown is not rendered

#### Scenario: Yes answer still shows HLO/Outcome
- **WHEN** the ToC question is answered "Yes" and a Level is selected
- **THEN** the HLO/Outcome dropdown is rendered as before

### Requirement: Justification word limit raised to 50
The "Why is the result being reported?" field SHALL allow up to 50 words.

#### Scenario: Limit is 50
- **WHEN** the user types in "Why is the result being reported?" (shown in the No scenario)
- **THEN** the field permits up to 50 words instead of 30

### Requirement: Lead center position unchanged
The "Lead center" field SHALL remain in its current position (it is NOT moved in this level).

#### Scenario: Lead center not moved
- **WHEN** the Contributors & Partners section renders in either scenario
- **THEN** the Lead center field stays in its existing position and behavior
