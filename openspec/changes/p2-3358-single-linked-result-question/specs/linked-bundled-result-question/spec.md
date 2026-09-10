## ADDED Requirements

### Requirement: One single linked/bundled question for every result typology

Section 2 (Contributors and Partners) SHALL ask the linked/bundled question with exactly one wording for every result typology: _"Is this result linked or bundled with another CGIAR-reported result (such as innovation, KP, policy, etc.)?"_

No typology SHALL render a variant of this question. This applies to both rendering paths in the section — the field-manager driven path serving Innovation use and Innovation development, and the component-driven path serving every other typology.

#### Scenario: Innovation use and Innovation development read the single question
- **WHEN** a user opens Section 2 of an Innovation use or Innovation development result in the 2026 phase
- **THEN** the question reads "Is this result linked or bundled with another CGIAR-reported result (such as innovation, KP, policy, etc.)?"
- **AND** the word "innovation" no longer opens the sentence

#### Scenario: Policy change reads the same single question
- **WHEN** a user opens Section 2 of a Policy change result in the 2026 phase
- **THEN** the question reads exactly the same sentence as every other typology
- **AND** the previous Policy-change-specific wording "Have other reported results contributed to this policy change?…" is not rendered anywhere

#### Scenario: The remaining typologies read the same single question
- **WHEN** a user opens Section 2 of a Capacity change, Other outcome, Capacity sharing for development, Knowledge product, Other output or Impact contribution result in the 2026 phase
- **THEN** the question reads the same single sentence
- **AND** no typology is left on the previous wording

#### Scenario: Both funding streams render the same question
- **WHEN** the result belongs to the W1/W2 form or to the W3/Bilateral form
- **THEN** the question wording is identical in both

#### Scenario: Read-only view matches the edit form
- **WHEN** a result is consulted in a read-only state (Draft, Submitted, Accepted, Rejected)
- **THEN** the question is displayed with the same single wording as in the edit form

### Requirement: No header is rendered above the linked/bundled question

Section 2 SHALL NOT render any field header above the linked/bundled question, for any result typology and any portfolio. The question stands alone.

#### Scenario: No header for a 2026-portfolio result
- **WHEN** a user opens Section 2 of a 2026-portfolio result of any typology
- **THEN** no header reading "Is this result linked to, or (for innovations) bundled with, another reported result?" is rendered
- **AND** no empty space or orphaned separator remains where it used to be

#### Scenario: No header for Policy change either
- **WHEN** a user opens Section 2 of a Policy change result
- **THEN** the behaviour is the same: the question is rendered with no header above it

### Requirement: The stored answer contract is unchanged

Changing the question wording SHALL NOT change what the platform stores or how the answer behaves. The answer remains the `has_innovation_link` boolean plus the `linked_results` selection, and no stored value or conditional logic depends on the label text.

#### Scenario: Answering YES still opens the dropdown
- **WHEN** a user answers YES to the question
- **THEN** the linked/bundled result dropdown is shown and a result can be selected, exactly as before the change

#### Scenario: Previously stored answers are displayed unchanged
- **WHEN** a result that already had an answer and linked results is reopened after the change
- **THEN** the stored answer and the linked results are displayed exactly as they were

#### Scenario: The saved payload is identical
- **WHEN** the same user input is submitted before and after the change
- **THEN** the request payload is byte-identical

### Requirement: Previous phases are unaffected

The question SHALL remain 2026-onwards only, as it is today. The wording update SHALL NOT introduce the question into any surface where it was not previously displayed.

#### Scenario: A 2025 result shows no new question
- **WHEN** a user consults a result from the 2025 phase or earlier
- **THEN** Section 2 renders exactly as it did before the change
- **AND** the linked/bundled question is not introduced there
