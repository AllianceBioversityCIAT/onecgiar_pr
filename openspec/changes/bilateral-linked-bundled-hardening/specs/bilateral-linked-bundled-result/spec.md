## MODIFIED Requirements

### Requirement: Selecting No after Yes clears the stored links
When the stored answer is Yes and the section saves No, the server SHALL deactivate every `linked_result` row of that result that carries a `linked_results_id`, whoever wrote it. Rows with a NULL `linked_results_id` (`legacy_link`) SHALL survive. A No on a result whose stored answer was not Yes SHALL leave `linked_result` untouched.

#### Scenario: Retraction clears (AC12)
- **WHEN** a result stores Yes with links and the section saves No
- **THEN** every `linked_result` row of that result with a `linked_results_id` is deactivated and the stored answer becomes No

#### Scenario: A No that was never a Yes touches nothing
- **WHEN** a result stores No or null and the section saves No
- **THEN** no `linked_result` row changes

#### Scenario: Legacy rows survive a retraction
- **WHEN** a result stores Yes and has `legacy_link` rows (NULL `linked_results_id`) next to id rows
- **THEN** after a No only the id rows are deactivated and the legacy rows stay active

### Requirement: The keys never travel before the stored block is on screen
The client SHALL send `has_innovation_link` / `linked_results` only from a change of the question itself (radio or picker), and only after the stored answer has been read back. Autosaves triggered by centres, projects or partners SHALL NOT carry the keys. The Yes/No radio SHALL be disabled until the stored answer is on screen.

#### Scenario: An early autosave cannot erase a stored answer
- **WHEN** the detail GET has not resolved and a centre changes
- **THEN** the PATCH carries neither key

#### Scenario: A centre change after hydration carries no linked keys
- **WHEN** the stored answer is on screen and the user adds a centre
- **THEN** the PATCH carries neither `has_innovation_link` nor `linked_results`

#### Scenario: Answering Yes sends the flag without a list
- **WHEN** the user clicks Yes
- **THEN** the PATCH carries `has_innovation_link: true` and no `linked_results` key, so existing rows are not replaced

#### Scenario: The radio cannot be clicked before hydration
- **WHEN** the detail GET has not resolved
- **THEN** the Yes/No radio is disabled

## ADDED Requirements

### Requirement: The picker never drops a stored link it cannot show
The section SHALL treat its own selection signal as the source of truth. When the picker emits a new selection, the section SHALL union it with every previously selected id that is absent from the results catalogue. In read-only mode a stored id absent from the catalogue SHALL still be rendered as a chip (`Result #<id>`).

#### Scenario: A stored link outside the catalogue survives a new pick
- **WHEN** the stored links are [A, B], B is not in the catalogue, and the user picks C
- **THEN** the PATCH carries `linked_results: [A, B, C]`

#### Scenario: A late catalogue does not empty the selection
- **WHEN** the catalogue arrives after the picker rendered with stored ids
- **THEN** the stored ids remain selected and the next pick sends all of them

#### Scenario: Read-only shows every stored link (AC14)
- **WHEN** a submitted result stores a link whose target is not in the catalogue
- **THEN** the read-only view still shows a chip for it

### Requirement: The hidden-fields note only counts what will be saved
`hiddenFieldsWithValues()` SHALL count the linked/bundled question only when the stored answer has been read back.

#### Scenario: A failed detail read does not promise a save
- **WHEN** the detail GET failed and the user answers the question
- **THEN** the collapsed block does not count it as a hidden field with values

### Requirement: The server normalises the keys strictly
`has_innovation_link` SHALL be honoured only when it is a JSON boolean; any other value is treated as absent. `linked_results` SHALL be honoured only when it is an array; its entries SHALL be reduced to positive integers, minus the result's own id and minus results that are not active. A non-array `linked_results` (including `null`) SHALL be treated as absent.

#### Scenario: A string flag is ignored
- **WHEN** the PATCH carries `has_innovation_link: "false"`
- **THEN** neither the stored answer nor `linked_result` changes

#### Scenario: A null list does not wipe
- **WHEN** the PATCH carries `has_innovation_link: true, linked_results: null`
- **THEN** the stored answer becomes Yes and `linked_result` is not touched

#### Scenario: Self and inactive ids are dropped
- **WHEN** the PATCH lists the result's own id and an id whose `result.is_active = 0`
- **THEN** neither is written and the remaining ids are
