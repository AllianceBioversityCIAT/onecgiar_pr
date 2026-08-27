## ADDED Requirements

### Requirement: Conditional sub-questions render inside a field card

Every question the user answers on the Capacity Sharing form SHALL render inside the shared field card container, including questions that appear conditionally in response to an earlier answer. A question SHALL NOT render as a bare control outside the container that frames its siblings.

The shared field wrapper decides card-versus-bare from the presence of a label or description. A conditional question therefore SHALL be given its own label so it is framed like every other question on the form.

#### Scenario: Long-term training reveals the degree sub-question

- **WHEN** the user selects a length of training that reveals the degree options (PhD / Master)
- **THEN** those options render inside a field card with a visible question label
- **AND** they are not drawn loose below or outside the card that holds the surrounding questions

#### Scenario: Sub-question hidden when not applicable

- **WHEN** the user selects a length of training for which the degree sub-question does not apply
- **THEN** neither the degree options nor an empty field card are rendered

### Requirement: Framing a control never changes whether it is required

Giving a control a label, a description, or a card container is a presentation change only. It SHALL NOT alter whether that control is required, and SHALL NOT alter which value the form persists for it.

The degree sub-question specifically SHALL remain optional: the value stored for the training term falls back to the parent length-of-training answer, so the server's completeness check is already satisfied without it. Making it required would prevent a section from being completed.

#### Scenario: Degree sub-question stays optional after being framed

- **WHEN** the degree sub-question is rendered inside its field card
- **THEN** it is not marked as required
- **AND** the user can complete and submit the section without choosing a degree

#### Scenario: Stored training term still falls back to the parent answer

- **WHEN** the user selects a length of training but leaves the degree sub-question empty
- **THEN** the value persisted for the training term is the length-of-training answer
- **AND** the section's completeness check passes

### Requirement: Enabled primary actions indicate they are clickable

A button that is enabled and will perform an action when clicked SHALL show the pointer cursor on hover. A button that is disabled SHALL show the not-allowed cursor.

#### Scenario: Hovering the enabled create action

- **WHEN** the user hovers the "Create and continue" button while the form can be submitted
- **THEN** the cursor changes to the pointer

#### Scenario: Hovering the disabled create action

- **WHEN** the user hovers the "Create and continue" button while required fields are still missing, or while a result is being created
- **THEN** the cursor shows not-allowed
- **AND** the pointer cursor is not shown
