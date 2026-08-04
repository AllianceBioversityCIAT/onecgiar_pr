## ADDED Requirements

### Requirement: The result form explains the AI assistant for Titles and Descriptions

Section 1 SHALL render a note explaining the AI assistant for result titles and descriptions exactly once, positioned between the `Change result type` button and the `Title of Result` label so that it covers both the title and the description field.

#### Scenario: The note renders once, in position

- **WHEN** a user opens Section 1 of a result
- **THEN** the AI assistant note appears exactly one time
- **AND** it is rendered after the `Change result type` button and before the `Title of Result` label

#### Scenario: The note carries the approved text with the corrected enabling condition

- **WHEN** the AI assistant note is rendered
- **THEN** it reads `AI Assistant for result Titles and Descriptions: PRMS includes an AI assistant that generates suggested titles and descriptions for results based on the information entered by users. During the 2025 reporting cycle, its use contributed to a reduction in QA comments on result titles and descriptions, from 28% to 16%. Based on this positive experience and user feedback, we encourage Programs/Accelerators to use the AI assistant to improve the quality and consistency of reported results. To use the assistant, click AI Review once it becomes available. The button is automatically enabled once all sections are completed. All AI-generated text should be carefully reviewed, validated, and, where necessary, refined before submission.`
- **AND** the sentence describing when the button becomes enabled matches the implemented gate, not the original draft wording about "the required data fields that trigger the AI assistant"

### Requirement: The Impact Area scores section explains the AI-assisted notification

The `Impact Area scores` section SHALL render a note explaining the AI-assisted score notification exactly once, above the section heading, covering the whole section.

#### Scenario: The note renders once, above the heading

- **WHEN** a user opens the `Impact Area scores` section
- **THEN** the AI-assisted notification note appears exactly one time
- **AND** it is rendered above the `Impact Area scores` heading

#### Scenario: The note carries the approved text

- **WHEN** the AI-assisted notification note is rendered
- **THEN** it reads `AI-assisted Notification for Impact Area Scores: PRMS includes an AI assistant that reviews the result's metadata (and supporting evidence for scores of 2), it assesses whether the information provided is consistent with and adequately supports the selected score, and flags potential mismatches. The assistant does not select or recommend a score; responsibility for assigning the score remains with the user. To use the assistant, click AI Review once it becomes available. Any AI-generated notifications should be carefully reviewed and used to validate, and, where necessary, revise the selected Impact Area score and its supporting evidence before submission.`

### Requirement: Both AI notes are static blocks

Both AI notes SHALL render as static blocks. They MUST NOT be collapsible and MUST NOT carry a "How it works" link.

#### Scenario: No collapse control is offered

- **WHEN** either AI note is rendered
- **THEN** the note's full text is visible without any expand or collapse interaction
- **AND** no "How it works" link is present

### Requirement: Score-2 behaviour is unchanged

Adding the AI notes SHALL NOT alter the existing behaviour tied to a `(2) Principal` Impact Area score.

#### Scenario: Score-2 evidence warning and component question still appear only for score 2

- **WHEN** a user selects `(2) Principal` for an Impact Area
- **THEN** the evidence warning and the `Which component of the Impact Area is this result intended to impact?` question appear, as they did before this change
- **AND** when any other score is selected, neither appears
