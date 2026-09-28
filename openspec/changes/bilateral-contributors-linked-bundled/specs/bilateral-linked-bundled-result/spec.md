## ADDED Requirements

### Requirement: The linked/bundled answer is stored and returned
The bilateral Contributors & Partners section SHALL persist the answer to *"Is this result linked or
bundled with another CGIAR-reported result (such as innovation, KP, policy, etc.)?"* on
`result.has_innovation_link`, and the selected results as `linked_result` rows for the same
`origin_result_id`. The bilateral detail response SHALL return both so the section rehydrates.

#### Scenario: Answering Yes with a selection survives a reload
- **WHEN** a reporter opens the full metadata block, answers Yes, picks one or more results and the section saves
- **THEN** `result.has_innovation_link` is `1`, one active `linked_result` row exists per selected result
- **AND** reopening the result shows Yes with the same results selected

#### Scenario: The question may be left unanswered (AC10)
- **WHEN** the reporter leaves Yes/No untouched and the section saves
- **THEN** the save succeeds with no error and no `linked_result` row is created or deactivated

#### Scenario: Read-only view shows the stored answer (AC14)
- **WHEN** a user without edit rights opens a submitted result that has linked results
- **THEN** the answer and the selected results are visible and no control is editable

### Requirement: Selecting No after Yes clears the stored links
Changing the answer from Yes to No SHALL collapse the results dropdown, clear the selection on screen
and deactivate the `linked_result` rows this section owns.

#### Scenario: Retraction clears (AC12)
- **WHEN** the stored answer is Yes with two linked results and the reporter answers No and saves
- **THEN** the dropdown collapses, the selection is emptied and both rows are deactivated

#### Scenario: A No that was never a Yes touches nothing
- **WHEN** the stored answer is not Yes and a save carries `has_innovation_link: false`
- **THEN** no `linked_result` row of that result is deactivated

#### Scenario: Rows of other sections survive a retraction
- **WHEN** the result also has `linked_result` rows with a `legacy_link` written by the P22 "Links to results" section, and the reporter retracts a stored Yes
- **THEN** the legacy rows remain active

### Requirement: The keys never travel before the stored block is on screen
The client SHALL omit `has_innovation_link` and `linked_results` from the contributors payload until
the stored values have been read back from the detail endpoint, and the server SHALL treat an omitted
key as "leave untouched".

#### Scenario: An early autosave cannot erase a stored answer
- **WHEN** the reporter changes a contributing centre before the detail response has arrived
- **THEN** the PATCH carries neither key and the stored answer and links are unchanged

### Requirement: Results dropdown and hidden-fields note
Answering Yes SHALL reveal a searchable multi-select of CGIAR results showing code and title, and a
saved answer SHALL be counted by the hidden-fields note when the full metadata block is collapsed.

#### Scenario: Yes reveals the searchable list (AC11)
- **WHEN** the reporter answers Yes
- **THEN** a searchable multi-select of results across result types appears, each option showing result code and title

#### Scenario: Collapsed block announces the saved value (AC13)
- **WHEN** the reporter has a saved linked/bundled answer and collapses the full metadata block
- **THEN** the note "1 hidden field has values and will be saved." is displayed

### Requirement: Innovation Use and Innovation Development are out of this section
For result types Innovation Use (2) and Innovation Development (7) the question SHALL NOT be rendered
in the bilateral Contributors & Partners section, and the server SHALL ignore both keys for those
types, because the same stored answer has another owner: the Innovation Use type-specific section for
type 2, and the `results_innovations_dev` mirror maintained by the classic writer for type 7.

#### Scenario: Innovation Use asks the question once
- **WHEN** a reporter opens the full metadata block of a bilateral Innovation Use result
- **THEN** the linked/bundled question is absent from Contributors & Partners and remains available in the Innovation Use section

#### Scenario: The server refuses to write for an excluded type
- **WHEN** a save for an Innovation Use or Innovation Development result carries `has_innovation_link` and `linked_results`
- **THEN** neither `result.has_innovation_link` nor any `linked_result` row is written for that result

### Requirement: No "Coming soon" marker for a field that persists
Once the answer is stored the section SHALL NOT render the `Coming soon` tag or the disabled styling
for this question, and the results multi-select SHALL be static only while the section is editable.

#### Scenario: The marker is gone for a type in scope
- **WHEN** a reporter opens the full metadata block of a bilateral Capacity sharing result in Editing
- **THEN** the Yes/No radio and the results dropdown are enabled and no `Coming soon` tag is shown
