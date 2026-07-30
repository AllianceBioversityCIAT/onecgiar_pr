## ADDED Requirements

### Requirement: Single source for the innovation link question

The innovation link question — *"Is this innovation linked or bundled with another CGIAR-reported result (such as another innovation or a different type of result)?"* — and its dependent result selector SHALL be presented to P25 users in exactly one place: Section 2, Contributors and partners. No other section of the result form SHALL display that question.

#### Scenario: Question is absent from Innovation Use info

- **WHEN** a user opens Section 4 (Innovation Use info) of a P25 innovation use or innovation development result
- **THEN** the innovation link question is not displayed
- **AND** the dependent "Please select a result" selector is not displayed

#### Scenario: Question remains in Contributors and partners

- **WHEN** a user opens Section 2 (Contributors and partners) of a P25 innovation use or innovation development result
- **THEN** the innovation link question is displayed with its Yes/No options
- **AND** answering Yes reveals the "Please select a result" selector as it does today

#### Scenario: IPSR pathway is unaffected

- **WHEN** a user opens the IPSR innovation use pathway step that renders the shared innovation use form
- **THEN** the rendered form is identical to its behaviour before this change

#### Scenario: P22 is unaffected

- **WHEN** a user opens an innovation use result reported under P22
- **THEN** the innovation link question remains hidden, as it was before this change
- **AND** saving the section persists the same fields it persisted before this change

### Requirement: Saving Innovation Use info preserves the Contributors and partners answer

Saving Section 4 (Innovation Use info) SHALL NOT change the stored answer to the innovation link question, and SHALL NOT remove the results linked through Section 2. The values the client sends for that field MUST reflect the server state at the moment of saving, and MUST NOT be omitted, null or undefined, because the backend interprets an absent value as "no link" and deletes the linked results.

#### Scenario: Section 4 save keeps a Yes answer and its linked results

- **WHEN** a user answers Yes in Section 2 and selects one or more linked results, saves, and afterwards saves Section 4
- **THEN** returning to Section 2 shows the answer still set to Yes
- **AND** the previously selected linked results are still present

#### Scenario: Section 4 save keeps a No answer

- **WHEN** a user answers No in Section 2, saves, and afterwards saves Section 4
- **THEN** returning to Section 2 shows the answer still set to No

#### Scenario: Answer changed in Section 2 while Section 4 holds older state

- **WHEN** Section 4 was loaded before the user changed the answer in Section 2, and the user then saves Section 4 without reloading it
- **THEN** the value stored for the innovation link question is the one saved from Section 2, not the older value Section 4 had loaded

#### Scenario: Fresh read fails during save

- **WHEN** the client cannot read the current server value while saving Section 4
- **THEN** the save still sends a defined value for the innovation link question, falling back to the value the section already held
- **AND** the request never sends null or undefined for that field

### Requirement: No orphan definition of the innovation link question

The field catalogue SHALL NOT keep definitions of the innovation link question that no template renders, so the duplication cannot silently reappear.

#### Scenario: Orphan field key is gone

- **WHEN** the field definitions in `FieldsManagerService` are inspected
- **THEN** the unused key `[contributors-partners]-is-lead-by-partner`, whose label duplicates the innovation link question, is no longer defined
- **AND** the key still consumed by the Contributors and partners template continues to resolve to the same label as before
