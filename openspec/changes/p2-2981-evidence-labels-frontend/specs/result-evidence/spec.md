## ADDED Requirements

### Requirement: Public-file question label
The Evidence upload flow SHALL present the public-visibility question with the wording "Can this evidence be shared publicly?" in every place the question appears (the standard evidence item and the innovation-development evidence component).

#### Scenario: User selects "Upload file"
- **WHEN** a user chooses "Upload file" as the source of an evidence
- **THEN** the system SHALL display the question "Can this evidence be shared publicly?" with the Yes/No options

### Requirement: Non-public info note content
When the user marks an uploaded file as NOT public, the Evidence section SHALL display an info note whose SECOND bullet reads "Evidence marked 'Yes' to this question will be displayed in the Results Dashboard and included in technical reporting products.", for a total of four bullets.

#### Scenario: User marks the file as not public
- **WHEN** the user selects "No" to the public-visibility question
- **THEN** the info note SHALL list, as its second bullet, "Evidence marked 'Yes' to this question will be displayed in the Results Dashboard and included in technical reporting products."

### Requirement: Dynamic checkbox-group title by result typology
The checkbox-group title in the Evidence section SHALL read "Indicate whether this evidence is related to an Impact Area score of 2 and/or to the {typology} metadata", where {typology} is derived from the current result type (Innovation Use, Policy Change, Capacity Sharing for Development, Knowledge Product, Other Output, Other Outcome, Innovation Development).

#### Scenario: Innovation development result
- **WHEN** the open result is of type Innovation development
- **THEN** the title SHALL read "...and/or to the innovation development metadata"

#### Scenario: Knowledge product result
- **WHEN** the open result is of type Knowledge product
- **THEN** the title SHALL read "...and/or to the Knowledge Product metadata"

### Requirement: Updated intro/guidance notes
The Evidence section intro notes SHALL be updated: the first bullet SHALL describe the 6-piece limit and legacy-result handling ("Submit a maximum of 6 pieces of evidence per result. If you are updating a legacy result..."), the bullet "Please list evidence from most to least important." SHALL be removed, and the "Provide evidence/documentation in support of the current innovation readiness level" bullet SHALL be removed.

#### Scenario: User opens the Evidence section
- **WHEN** a user opens the Evidence section of any pooled-funding result
- **THEN** the intro notes SHALL show the new first bullet and SHALL NOT show "Please list evidence from most to least important." nor the innovation-readiness-level evidence bullet

### Requirement: Type checkbox remains informational
The per-typology type checkbox SHALL be informational and SHALL NOT introduce new mandatory-evidence validation. Existing validations (Impact Area score-of-2 requirement, and the Innovation Readiness mandatory-evidence rule for Innovation development) SHALL remain unchanged. Type checkboxes for typologies that lack a stored field SHALL be deferred until the backend provides the column.

#### Scenario: New-typology checkbox without backing column
- **WHEN** the open result is of a typology that has no stored `*_related` column yet
- **THEN** the frontend SHALL NOT add a new validation rule and SHALL NOT block saving on account of the type checkbox

#### Scenario: Existing validations preserved
- **WHEN** an Impact Area tag has a score of 2, or the result is Innovation development with readiness level not 0
- **THEN** the existing evidence validations SHALL continue to apply exactly as before this change
