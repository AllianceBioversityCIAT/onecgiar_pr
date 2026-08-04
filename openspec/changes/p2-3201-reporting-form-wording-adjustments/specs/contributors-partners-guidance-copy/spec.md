## ADDED Requirements

### Requirement: The ToC note describes the 2026 reporting cycle

The Contributors and Partners ToC note SHALL describe the current (2026) reporting cycle. The note that shipped before this change referred to the 2025 and 2026 ToC and is a cycle behind.

#### Scenario: The note carries the approved 2026 text

- **WHEN** a user opens the Contributors and Partners section
- **THEN** the ToC note reads `If Yes, please select the relevant level, KPI and indicate the result contribution to the indicator target. If No, please indicate if the P/A invested funding in this result during 2026 even though it was not included in the approved 2026 PoRB/ToC and provide a brief justification explaining why the result is reported. These justifications should be used by the P/A team to inform Reflect & Adapt discussions and support decision-making (i.e. result may be considered when updating the P/A's 2027 ToC).`
- **AND** no text referring to the 2025 ToC remains in the section

### Requirement: The section defines what a contributor is

The Contributors and Partners section SHALL state the CLARISA-based definition of a contributor before the `Contributing CGIAR Centers` field, linking to the CLARISA Glossary.

#### Scenario: The definition renders before Contributing CGIAR Centers

- **WHEN** a user opens the Contributors and Partners section
- **THEN** the text `As defined in the CGIAR CLARISA Glossary, a contributor is a partner — internal or external to CGIAR — that has made a significant contribution to the achievement of a result. Contributions may take many forms and the threshold for attribution is that the result would not have been achieved, or reported in its current form, without that partner's contribution.` is rendered above the `Contributing CGIAR Centers` field

#### Scenario: The glossary reference is a working link

- **WHEN** the contributor definition is rendered
- **THEN** the words referring to the CGIAR CLARISA Glossary link to `https://clarisa.cgiar.org/clarisa-panel/documentation/One_CGIAR_Control_List/General_Control_List/Glossary`
- **AND** the link is reachable and clickable by the user

### Requirement: The W3/Bilateral projects field is named and explained correctly

The field previously labelled `Contributing W3 and/or bilateral projects` SHALL be labelled `Contributing W3/Bilateral projects` and SHALL explain which projects its dropdown contains.

#### Scenario: The label drops the "and/or" phrasing

- **WHEN** a user opens the Contributors and Partners section
- **THEN** the field is labelled `Contributing W3/Bilateral projects`
- **AND** the label `Contributing W3 and/or bilateral projects` no longer appears in this section

#### Scenario: The mapping note explains the dropdown contents

- **WHEN** the `Contributing W3/Bilateral projects` field is rendered
- **THEN** the note `The dropdown list includes only the W3/Bilateral projects that were mapped to and agreed by the P/A during the 2026 mapping exercise.` is shown with it

### Requirement: The Science Programs/Accelerators field is plural and explains self-registration

The contributing Science Program/Accelerator field SHALL use the plural label and SHALL explain that the submitting P/A is recorded automatically. Its previous note referring to the 2026 ToC was flagged as inaccurate and SHALL be removed.

#### Scenario: The label is plural

- **WHEN** a user opens the Contributors and Partners section
- **THEN** the field is labelled `Contributing Science Programs/Accelerators`

#### Scenario: The self-registration note replaces the ToC note

- **WHEN** the contributing Science Programs/Accelerators field is rendered
- **THEN** the note `The P/A submitting the result is automatically recorded as a contributor. You do not need to add your own P/A to the list of contributors.` is shown
- **AND** no note connecting this field to the ToC is shown

### Requirement: The pending-confirmation banner ends at the confirmation sentence

The banner shown while a contributor has not confirmed its contribution SHALL end after `...has not confirmed its contribution to this result.` The trailing clause about ToC mapping being unavailable SHALL be removed.

#### Scenario: The banner is truncated

- **WHEN** a contributor has not yet confirmed its contribution and the banner is displayed
- **THEN** the banner text ends at `has not confirmed its contribution to this result.`
- **AND** no trailing sentence about ToC mapping being unavailable is shown
