## ADDED Requirements

### Requirement: Conditional sub-options are visually subordinate to the option that reveals them

When a radio option reveals a list of conditional sub-options, the platform SHALL render that list as a visually contained group, indented past the start of the parent option's own label and marked with a vertical rule, so that a user can tell at a glance that the sub-options derive from the selected option.

#### Scenario: The six diversity types read as sub-options of "Yes"
- **WHEN** a user opens the Innovation team diversity question on an Innovation Development result and selects "Yes, concrete actions have been taken to ensure:"
- **THEN** the six diversity types are displayed indented past the text of the "Yes" option
- **AND** a vertical rule runs alongside them marking where the group starts and ends
- **AND** no diversity type is rendered at the same alignment as a top-level option

#### Scenario: The "Multiple answers can be selected." note belongs to the group
- **WHEN** the sub-options are visible
- **THEN** the note "Multiple answers can be selected." is rendered inside the same group, with the secondary text style
- **AND** it is not rendered at the alignment of the top-level options

#### Scenario: The same grouping applies to the other two questions built on the same control
- **WHEN** a user opens the GESI actions question or the negative-consequences question on the same form and selects an option that has sub-options
- **THEN** those sub-options are grouped in the same way

### Requirement: The three top-level answers stay mutually exclusive and conditional

The Innovation team diversity question SHALL offer exactly three mutually exclusive top-level answers, and SHALL show the six diversity types only while the affirmative answer is the selected one.

#### Scenario: Only one top-level answer can be held at a time
- **WHEN** a user selects "No concrete actions to diversify the innovation team composition" while "Yes" was selected
- **THEN** "Yes" is no longer selected
- **AND** the six diversity types are no longer displayed

#### Scenario: Selecting "This does not apply" hides the diversity types
- **WHEN** a user selects "This does not apply to this innovation"
- **THEN** no diversity type is displayed and no further input is requested

#### Scenario: Neither dismissal option offers sub-options
- **WHEN** either dismissal answer is selected
- **THEN** no sub-option list and no "Multiple answers can be selected." note is rendered for it

### Requirement: The stored contract is unchanged

This presentation change SHALL NOT alter the questionnaire, the set of options, which values are stored, or when the question counts as answered.

#### Scenario: The saved payload is identical
- **WHEN** the same user input is submitted before and after the change
- **THEN** the request payload is byte-identical

#### Scenario: A previously answered question is displayed unchanged
- **WHEN** a result that already had "Yes" with diversity types ticked is reopened
- **THEN** the same answer and the same ticked types are displayed, now inside the group

#### Scenario: The question remains required
- **WHEN** the question is left unanswered
- **THEN** it is reported as missing exactly as it was before the change

#### Scenario: Switching away from "Yes" clears the sub-answers, as it already did
- **WHEN** a user who had ticked diversity types selects a dismissal answer
- **THEN** those diversity types are cleared, exactly as they were before this change
- **AND** no hidden ticked value survives to be saved

### Requirement: Radio groups without sub-options are unaffected

A radio group that renders no conditional sub-options SHALL be laid out exactly as before.

#### Scenario: An ordinary radio group is untouched
- **WHEN** a user opens any radio question with no sub-options, such as the Impact Area scores
- **THEN** its options render with the same spacing and alignment as before the change
