## ADDED Requirements

### Requirement: Evidence creation and editing via modal
The Evidence section SHALL use a single modal for both creating and editing an evidence, containing the full form (source Link/Upload, public-visibility question, dynamic info note, file drag-and-drop or link input, Impact-Area and per-typology checkboxes, and the 50-word description). Triggering "Add evidence" SHALL open the modal in create mode titled "Add New Evidence" with an "Add evidence" confirm action. Triggering the per-item edit (pencil) SHALL open the modal in edit mode titled "Edit Evidence" with a "Save changes" confirm action, pre-filled with a clone of the selected evidence so that Cancel discards any change. Confirming the modal SHALL apply the draft to the in-memory list (prepend when creating, replace in place when editing) and THEN immediately persist the section (same flow as the section-level Save).

#### Scenario: Opening the create modal
- **WHEN** a user clicks "Add evidence" on a non-knowledge-product result with fewer than 6 evidences
- **THEN** the system SHALL open the modal in create mode ("Add New Evidence", confirm "Add evidence") with an empty form

#### Scenario: Opening the edit modal
- **WHEN** a user clicks the edit (pencil) action on a saved evidence
- **THEN** the system SHALL open the modal in edit mode ("Edit Evidence", confirm "Save changes") pre-filled with a clone of that evidence

#### Scenario: Confirming the modal persists immediately
- **WHEN** the user confirms the modal (create or edit) with a valid draft
- **THEN** the draft SHALL be applied to the list (prepended when creating, replaced in place when editing) and the section SHALL be persisted right away via the existing upload-then-`POST_evidences` flow

#### Scenario: Cancelling the modal
- **WHEN** the user clicks "Cancel" (or closes) the modal
- **THEN** the modal SHALL close, the draft SHALL be discarded, and the existing list SHALL remain unchanged

### Requirement: Flat (non-collapsible) evidence card
Each saved evidence SHALL render as a flat card with all of its information visible at once — there SHALL be no expand/collapse accordion. The card top SHALL show an index number, the type label ("Link Evidence" or "File Evidence"), the upload date as "Added: {date}" (and "| Updated: {date}" when updated), and — for file evidence only — the public/private padlock. The card body SHALL show, flowing horizontally and wrapping to use the card width, the link/filename (clickable when a link is present), the selected Impact Areas as badge tags, and the description details when present. The card SHALL use a single surface with a subtle border (no hard full-width divider and no second background block).

#### Scenario: Viewing a saved evidence
- **WHEN** a user opens the Evidence section with at least one saved evidence
- **THEN** each evidence SHALL appear as a flat card showing the type label, the Added/Updated date, the link/filename, the selected Impact Areas as tags, and the description when present — with no collapse control

#### Scenario: Card uses horizontal width
- **WHEN** an evidence has a link, tags and/or details
- **THEN** those items SHALL flow horizontally across the card body and wrap only when they do not fit, rather than always stacking vertically

### Requirement: Public/private padlock for file evidence
For file evidence, the card top SHALL display a padlock icon reflecting `is_public_file` — open/green for public, closed/grey for private — with a hover tooltip reading "Public" or "Private". Link evidence SHALL NOT display a padlock.

#### Scenario: Public file evidence
- **WHEN** a file evidence is marked public
- **THEN** the card top SHALL show the open/green padlock with a "Public" tooltip on hover

#### Scenario: Private file evidence
- **WHEN** a file evidence is marked not public
- **THEN** the card top SHALL show the closed/grey padlock with a "Private" tooltip on hover

#### Scenario: Link evidence
- **WHEN** the evidence source is a link
- **THEN** the card SHALL NOT display a padlock

### Requirement: Newest-first stable ordering
The evidence list SHALL be ordered most-recent first by `last_updated_date`, falling back to `creation_date` and then `id`. Newly added evidence SHALL appear at the top. The order SHALL be stable during an editing session: the list is sorted on initial load and after a successful save, and SHALL NOT be re-sorted while the user is editing items.

#### Scenario: New evidence appears on top
- **WHEN** the user adds a new evidence via the modal
- **THEN** it SHALL be placed at the top of the list

#### Scenario: Missing dates fallback
- **WHEN** an evidence has no `last_updated_date` or `creation_date`
- **THEN** ordering SHALL fall back to `id` descending and the card top SHALL omit the date without error

### Requirement: Evidence date fields in the model
The client evidence model (`EvidencesCreateInterface`) SHALL include optional `creation_date` and `last_updated_date` fields, populated from the evidence GET response, used to render the card dates and to order the list.

#### Scenario: Dates present in the response
- **WHEN** the evidence GET response includes `creation_date` and/or `last_updated_date`
- **THEN** the model SHALL carry them and the card top SHALL display the formatted "Added"/"Updated" dates

## MODIFIED Requirements

### Requirement: Per-evidence actions
Each evidence card SHALL expose two actions in its top strip: an edit (pencil) action and a delete action. The edit action SHALL open the shared modal in edit mode (see "Evidence creation and editing via modal"). The delete action SHALL prompt a confirmation popup (reusing the existing alert confirmation) before removing the evidence from the in-memory list. Both actions SHALL remain hidden for read-only roles, for submitted results, and for the knowledge-product branch.

#### Scenario: Editing an evidence
- **WHEN** the user clicks the edit (pencil) action on an evidence (editable result, non-read-only role)
- **THEN** the system SHALL open the edit modal pre-filled with that evidence

#### Scenario: Deleting an evidence
- **WHEN** the user clicks the delete action on an evidence (editable result, non-read-only role)
- **THEN** the system SHALL show a confirmation popup, and on confirm SHALL remove the evidence from the list and re-run the section validations

#### Scenario: Knowledge product result
- **WHEN** the open result is a knowledge product
- **THEN** evidences SHALL render read-only as flat cards with no Add button and no edit/delete actions

### Requirement: Section-level save
The Evidence section SHALL persist evidence changes through the existing save flow (file upload session loop followed by `POST_evidences`, then reload and re-sort). Confirming the create/edit modal SHALL trigger this same save flow immediately. The section-level "Save" button SHALL remain available to persist changes made outside the modal (e.g. a delete, or the section-level Impact-Area tag checkboxes), and the `validateButtonDisabled` gating on that button SHALL remain unchanged.

#### Scenario: Saving from the modal
- **WHEN** the user confirms the create or edit modal with a valid draft
- **THEN** the system SHALL upload any pending file and `POST_evidences`, then reload and re-sort the list

#### Scenario: Saving section-level changes
- **WHEN** the user clicks the section-level Save after a delete or a tag-checkbox change, with a valid form
- **THEN** the system SHALL upload any pending files and `POST_evidences`, then reload and re-sort the list
