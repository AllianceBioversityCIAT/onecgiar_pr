# Spec — bilateral-knowledge-product-metadata

## ADDED Requirements

### Requirement: Section alerts
The bilateral Knowledge Product section SHALL render, above every editable field, one alert per
entry of the response `warnings[]` array, followed by two fixed informational alerts naming the
repository the metadata came from (the response `source`, e.g. `CGSpace`): one telling the user to
contact their Center library staff to correct metadata at the source, and one explaining that part
of the information is collected automatically from external sources using the DOI. When
`warnings[]` is empty or absent, only the two fixed alerts SHALL be rendered.

#### Scenario: Warnings present
- **WHEN** the response carries three warnings
- **THEN** three warning alerts are rendered above the fixed pair, in the order received

#### Scenario: No warnings
- **WHEN** `warnings` is absent or empty
- **THEN** exactly the two fixed informational alerts are rendered

### Requirement: MELIA block
The section SHALL always show the question `Is this knowledge product a MELIA Product?` as a
Yes/No control. When it is answered **Yes**, a second Yes/No question SHALL appear. When that
second question is answered **No**, a required `Select MELIA type` dropdown SHALL appear, its
options loaded from the CLARISA MELIA study types and displayed by name with the id as value. When
it is answered **Yes**, a required MELIA study dropdown SHALL appear. Answering the first question
**No** SHALL hide every dependent field and clear its value before saving.

#### Scenario: MELIA product answered No
- **WHEN** the user selects No on the first question
- **THEN** no dependent field is rendered, and the previously entered MELIA type and study values are cleared from the payload

#### Scenario: MELIA type branch
- **WHEN** the first question is Yes and the second is No
- **THEN** the `Select MELIA type` dropdown is rendered and required, and no study dropdown is rendered

#### Scenario: MELIA study branch
- **WHEN** both questions are Yes
- **THEN** a MELIA study dropdown is rendered and required, and the MELIA type dropdown is not

#### Scenario: Switching the parent answer back and forth
- **WHEN** the user answers Yes, selects a MELIA type, then switches the first question to No and back to Yes
- **THEN** the dependent fields reappear empty rather than carrying the discarded selection

### Requirement: MELIA study source depends on the portfolio
For a result in the 2025-2030 portfolio the second question SHALL be labelled
`Do you have a MELIA study planned in your TOC?` and the study dropdown SHALL be labelled
`Select the MELIA study from the drop-down (this drop-down is synced with your TOC)`, listing the
studies of the result's science program Theory of Change by title with `melia_id` as value. For a
result outside that portfolio the question SHALL be labelled
`Was it planned in your Initiative proposal?` and the dropdown SHALL list the OST studies of the
result by `melia_study_title` with `melia_id` as value.

#### Scenario: 2025-2030 portfolio
- **WHEN** both questions are Yes on a result whose reporting year belongs to the 2025-2030 portfolio
- **THEN** the TOC-synced dropdown is rendered and the Theory of Change studies of the result's program are requested

#### Scenario: Earlier portfolio
- **WHEN** both questions are Yes on a result from an earlier portfolio
- **THEN** the OST dropdown is rendered and the OST studies of the result are requested

### Requirement: Auto-populated metadata is read-only
The section SHALL display the metadata that arrives already populated — handle, dates, authors,
knowledge product type, peer review, Web of Science Core Collection status, DOI, accessibility,
license, keywords, AGROVOC keywords, commodity, investors, Altmetric attention score and
references — and none of it SHALL be editable or included in the save payload. The Web of Science
variants of issue date, peer review and ISI status SHALL be rendered only when the response
carries that data, and the Unpaywall accessibility only when present. The Altmetric score SHALL
render as a link carrying its badge image, or the text `Not Available` when the response has no
Altmetric data.

#### Scenario: Journal Article with Web of Science data
- **WHEN** the response is a Journal Article carrying WoS metadata
- **THEN** the WoS issue date, peer review and ISI rows are rendered alongside their repository counterparts

#### Scenario: Result without WoS data
- **WHEN** the response carries no WoS metadata
- **THEN** none of the WoS rows are rendered

#### Scenario: No Altmetric data
- **WHEN** the response has no Altmetric detail url
- **THEN** `Not Available` is rendered in place of the badge

### Requirement: Inline guidance for incomplete Journal Article metadata
When the result is a Journal Article and its repository ISI status is missing or `Not provided`, an
informational message SHALL be rendered under the ISI row telling the user to update the ISI Status
field at the source before the Quality Assurance process. The same SHALL apply under the
accessibility row when the repository accessibility is missing or `Not provided`. Neither message
SHALL appear for results that are not Journal Articles.

#### Scenario: Journal Article missing ISI status
- **WHEN** a Journal Article arrives with no ISI status
- **THEN** the informational message is rendered under the ISI row

#### Scenario: Non-Journal Article missing the same field
- **WHEN** a result that is not a Journal Article arrives with no ISI status
- **THEN** no informational message is rendered

### Requirement: FAIR score
The section SHALL render the FAIR score as one radial indicator per FAIR dimension, excluding the
total score, each labelled with its dimension key and coloured on a red-to-green scale by its own
score, and each listing its sub-indicators marked as met or unmet.

#### Scenario: Four dimensions
- **WHEN** the response carries the four FAIR dimensions and a total score
- **THEN** four radials are rendered and the total score is not rendered as a fifth

### Requirement: Sync with the repository
The section SHALL offer a Sync action for results that are not Journal Articles, and for Journal
Articles only to administrators. Activating it SHALL ask for confirmation, warning that unsaved
changes in the section will be lost. Confirming SHALL re-fetch the metadata and reload the section;
dismissing SHALL leave the current data untouched.

#### Scenario: Confirmed sync
- **WHEN** the user activates Sync and confirms
- **THEN** the resync request is sent and the section reloads

#### Scenario: Dismissed sync
- **WHEN** the user activates Sync and dismisses the confirmation
- **THEN** no request is sent

#### Scenario: Journal Article and a non-admin user
- **WHEN** the result is a Journal Article and the user is not an administrator
- **THEN** the Sync action is not rendered

### Requirement: Completion follows the MELIA answers
The section's completion checklist SHALL consist only of the MELIA fields required for the answered
branch: the first question always; the second question when the first is Yes; the MELIA type when
the second is No; the MELIA study when the second is Yes. The auto-populated metadata SHALL NOT
affect completion, and the handle SHALL NOT be a checklist item. The checklist SHALL be published
on every load outcome, including a failed fetch, so the section never reports `0/0` fields.

#### Scenario: MELIA product answered No
- **WHEN** the first question is answered No
- **THEN** the checklist holds one satisfied item and the section counts as complete

#### Scenario: Yes with no further answer
- **WHEN** the first question is Yes and the second is unanswered
- **THEN** the checklist holds two items, one unsatisfied, and the section does not count as complete

#### Scenario: Failed load
- **WHEN** the section fetch fails
- **THEN** the checklist still holds its first item, unsatisfied, rather than an empty list

### Requirement: Save carries only the MELIA fields
Saving the section SHALL send only the MELIA answers — whether it is a MELIA product, whether a
study was planned, and whichever of the MELIA type, OST study or Theory of Change study applies.
No auto-populated metadata field SHALL appear in the payload.

#### Scenario: Save after answering the TOC branch
- **WHEN** the user answers Yes/Yes, picks a Theory of Change study and saves
- **THEN** the payload carries the two answers and the study id, and no metadata field
