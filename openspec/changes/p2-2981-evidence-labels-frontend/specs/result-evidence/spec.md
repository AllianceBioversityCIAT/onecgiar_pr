## ADDED Requirements

### Requirement: Public-file question label
The Evidence upload flow SHALL present the public-visibility question with the wording "Can this evidence be shared publicly?" in every place the question appears (the standard evidence item and the innovation-development evidence component).

#### Scenario: User selects "Upload file"
- **WHEN** a user chooses "Upload file" as the source of an evidence
- **THEN** the system SHALL display the question "Can this evidence be shared publicly?" with the Yes/No options

### Requirement: Public info-note content
When the user marks an uploaded file as public, the Evidence section info note SHALL include the bullet "Evidence marked 'Yes' to this question will be displayed in the Results Dashboard and included in technical reporting products.", replacing the former "You agree to the link to the file being displayed in the CGIAR Results Dashboard." bullet. The "NOT public" note SHALL remain unchanged.

#### Scenario: User marks the file as public
- **WHEN** the user selects "Yes" to the public-visibility question
- **THEN** the info note SHALL contain "Evidence marked 'Yes' to this question will be displayed in the Results Dashboard and included in technical reporting products." and SHALL NOT contain "You agree to the link to the file being displayed in the CGIAR Results Dashboard."

#### Scenario: User marks the file as not public
- **WHEN** the user selects "No" to the public-visibility question
- **THEN** the "NOT public" info note SHALL remain as before (unchanged by this change)

### Requirement: Dynamic checkbox-group title by result typology
The checkbox-group title in the Evidence section SHALL read "Indicate whether this evidence is related to an Impact Area score of 2 and/or to the {typology} metadata", where {typology} is derived from the current result type. The displayed typology label SHALL follow the client wording (Innovation Use, Policy Change, Capacity Sharing for Development, KP, Other Output, Other Outcome, Innovation Development).

#### Scenario: Innovation development result
- **WHEN** the open result is of type Innovation development
- **THEN** the title SHALL read "...and/or to the Innovation Development metadata"

#### Scenario: Knowledge product result
- **WHEN** the open result is of type Knowledge product
- **THEN** the title SHALL read "...and/or to the KP metadata"

### Requirement: Per-typology informational checkbox
The Evidence section SHALL display, alongside the Impact Area checkboxes, a type checkbox named after the current result typology, for all typologies. The checkbox SHALL be informational: it is bound to a `*_related` field and sent in the save payload, but introduces NO new mandatory-evidence validation. Existing validations (Impact Area score-of-2 requirement; Innovation Readiness mandatory rule for Innovation development) SHALL remain unchanged.

#### Scenario: Typology with a backing field
- **WHEN** the open result is Innovation use, Innovation development, or Knowledge product
- **THEN** the type checkbox SHALL bind to the corresponding existing field and persist on save

#### Scenario: Typology pending the backend column
- **WHEN** the open result is Policy change, Capacity sharing, Other output, or Other outcome
- **THEN** the type checkbox SHALL render and be included in the save payload, and SHALL NOT block saving nor add a new validation (server persistence activates once the column exists)

### Requirement: Updated intro/guidance notes
The Evidence section intro notes (non-knowledge-product results) SHALL be updated: the first bullet SHALL describe the 6-piece limit and legacy-result handling, the bullet "Please list evidence from most to least important." SHALL be removed, and the "Provide evidence/documentation in support of the current innovation readiness level" bullet SHALL be removed. The existing knowledge-product intro note SHALL be preserved unchanged.

#### Scenario: Non-knowledge-product result
- **WHEN** a user opens the Evidence section of a non-knowledge-product result
- **THEN** the intro notes SHALL show the new first bullet and SHALL NOT show "Please list evidence from most to least important." nor the innovation-readiness-level evidence bullet

#### Scenario: Knowledge product result
- **WHEN** a user opens the Evidence section of a knowledge-product result
- **THEN** the existing knowledge-product intro note SHALL be shown unchanged

### Requirement: Innovation-dev evidence component parity
The innovation-development evidence component (`user-evidence`) SHALL show the same dynamic title and typology/Impact-Area checkboxes as the standard evidence item, in addition to the updated public-file label and info note.

#### Scenario: Editing evidence inside Innovation Dev info
- **WHEN** a user edits an evidence in the Innovation Dev info section
- **THEN** the component SHALL display the dynamic checkbox-group title and the Impact-Area + typology checkboxes, consistent with the standard Evidence tab
