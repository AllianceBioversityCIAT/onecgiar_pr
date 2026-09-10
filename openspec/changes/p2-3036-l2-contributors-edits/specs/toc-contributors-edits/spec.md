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

### Requirement: HLO tab header hidden in the No scenario
The HLO tab header — the contribution tabs/chips (e.g. "HLO N~1") and the "+" add-tab button — SHALL be hidden when the ToC alignment answer is "No". This complements the dropdown removals so the whole HLO selection UI disappears, leaving only the "Why is the result being reported?" justification.

#### Scenario: No answer hides the HLO tab header
- **WHEN** the ToC question is answered "No" (`isUnplanned`) on a 2026 P25 Contributors & Partners section
- **THEN** no HLO contribution chip and no "+" add-tab button are rendered
- **AND** only the "Why is the result being reported?" justification remains

#### Scenario: Yes answer still shows the HLO tab header
- **WHEN** the ToC question is answered "Yes"
- **THEN** the HLO contribution chips and the "+" add-tab button render as before

#### Scenario: Phase 2025 and other reuse contexts unaffected
- **WHEN** the section is phase 2025, or the component is reused in IPSR / bilateral / share-request (`isCP2026()` is false)
- **THEN** the HLO tab header renders exactly as before regardless of the No/Yes answer

### Requirement: Empty ToC container hidden in the No scenario
The whole ToC contribution block (tab header + the `multiple-wps-container` content area) SHALL be hidden when the ToC alignment answer is "No" on a 2026 P25 Contributors & Partners section, so no empty padded container remains above the justification.

#### Scenario: No answer leaves no empty container
- **WHEN** the ToC question is answered "No" (`isUnplanned`) on a 2026 P25 Contributors & Partners section
- **THEN** neither the HLO tab header nor the inner ToC content container is rendered
- **AND** only the "Why is the result being reported?" justification remains, with no empty box above it

#### Scenario: Yes answer still shows the ToC block
- **WHEN** the ToC question is answered "Yes"
- **THEN** the full ToC block (tab header + content) renders as before

#### Scenario: Phase 2025 and other reuse contexts unaffected
- **WHEN** the section is phase 2025, or the component is reused in IPSR / bilateral / share-request (`isCP2026()` is false)
- **THEN** the ToC block renders exactly as before regardless of the No/Yes answer

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
