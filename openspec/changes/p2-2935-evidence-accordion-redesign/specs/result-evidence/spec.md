## ADDED Requirements

### Requirement: Evidence creation via modal
The Evidence section SHALL open an "Add New Evidence" modal when the user triggers "Add evidence", containing the full creation form (source Link/Upload, public-visibility question, dynamic info note, file drag-and-drop or link input, Impact-Area and per-typology checkboxes, and the 50-word description). The modal SHALL NOT persist anything by itself; confirming adds the evidence to the in-memory list, and Cancel discards it. Files chosen in the modal SHALL be uploaded only by the section-level Save (no upload on modal confirm).

#### Scenario: Opening the creation modal
- **WHEN** a user clicks "Add evidence" on a non-knowledge-product result with fewer than 6 evidences
- **THEN** the system SHALL open the "Add New Evidence" modal with the creation form and Cancel / Add evidence actions

#### Scenario: Confirming a new evidence
- **WHEN** the user completes the modal and clicks "Add evidence"
- **THEN** the new evidence SHALL be added to the top of the evidence list, the section SHALL be marked dirty, and nothing SHALL be persisted until the section-level Save

#### Scenario: Cancelling the modal
- **WHEN** the user clicks "Cancel" in the modal
- **THEN** the modal SHALL close and no evidence SHALL be added

### Requirement: Collapsible accordion list
Each saved evidence SHALL render as a collapsed accordion. The collapsed header SHALL show an index number, the type label ("Link Evidence" or "File Evidence"), the upload date as "Added: {date} at {time}" (and "| Updated: {date} at {time}" when the evidence has been updated), and a line containing the link or filename together with the selected Impact Areas shown as badge tags. Expanding the accordion SHALL reveal the editable evidence form.

#### Scenario: Viewing a saved evidence
- **WHEN** a user opens the Evidence section with at least one saved evidence
- **THEN** each evidence SHALL appear as a collapsed accordion whose header shows the type label, the "Added" (and "Updated" if applicable) date/time, the link/filename, and the selected Impact Areas as tags

#### Scenario: Expanding to edit
- **WHEN** the user clicks the chevron or header of an accordion item
- **THEN** the item SHALL expand to show the editable form with the same fields as the creation modal

### Requirement: Public/private padlock for file evidence
For file evidence, the accordion header SHALL display a padlock icon reflecting `is_public_file` — open/green for public, closed/grey for private — with a hover tooltip reading "Public" or "Private". Link evidence SHALL NOT display a padlock.

#### Scenario: Public file evidence
- **WHEN** a file evidence is marked public
- **THEN** the header SHALL show the open/green padlock with a "Public" tooltip on hover

#### Scenario: Private file evidence
- **WHEN** a file evidence is marked not public
- **THEN** the header SHALL show the closed/grey padlock with a "Private" tooltip on hover

#### Scenario: Link evidence
- **WHEN** the evidence source is a link
- **THEN** the header SHALL NOT display a padlock

### Requirement: Newest-first stable ordering
The evidence list SHALL be ordered most-recent first by `last_updated_date`, falling back to `creation_date` and then `id`. Newly added evidence SHALL appear at the top. The order SHALL be stable during an editing session: the list is sorted on initial load and after a successful save, and SHALL NOT be re-sorted while the user is editing items.

#### Scenario: New evidence appears on top
- **WHEN** the user adds a new evidence via the modal
- **THEN** it SHALL be placed at the top of the list

#### Scenario: Stable order while editing
- **WHEN** the user expands and edits an existing evidence
- **THEN** the items SHALL NOT reorder until the section is saved and reloaded

#### Scenario: Missing dates fallback
- **WHEN** an evidence has no `last_updated_date` or `creation_date`
- **THEN** ordering SHALL fall back to `id` descending and the header SHALL omit the date line (or show "Date not available") without error

### Requirement: Evidence date fields in the model
The client evidence model (`EvidencesCreateInterface`) SHALL include optional `creation_date` and `last_updated_date` fields, populated from the evidence GET response, used to render the header dates and to order the list.

#### Scenario: Dates present in the response
- **WHEN** the evidence GET response includes `creation_date` and/or `last_updated_date`
- **THEN** the model SHALL carry them and the accordion header SHALL display the formatted "Added"/"Updated" date-time

## MODIFIED Requirements

### Requirement: Per-evidence actions
Each evidence SHALL expose only two actions in its accordion header: a delete action and an expand/collapse chevron. The per-evidence edit (pencil) button SHALL be removed. Deleting an evidence SHALL prompt a confirmation popup (reusing the existing alert confirmation) before removal, and removal SHALL update the in-memory list without persisting until the section-level Save. Delete SHALL remain hidden for read-only roles, for submitted results, and for the knowledge-product branch.

#### Scenario: Deleting an evidence
- **WHEN** the user clicks the delete action on an evidence (editable result, non-read-only role)
- **THEN** the system SHALL show a confirmation popup, and on confirm SHALL remove the evidence from the list, re-running the section validations, with persistence deferred to the section Save

#### Scenario: Delete does not toggle the accordion
- **WHEN** the user clicks the delete action in the collapsed header
- **THEN** the accordion SHALL NOT expand or collapse as a side effect of the delete click

#### Scenario: Knowledge product result
- **WHEN** the open result is a knowledge product
- **THEN** evidences SHALL render read-only as accordions with no Add button and no delete/edit actions

### Requirement: Section-level save without autosave
The Evidence section SHALL persist all evidence changes (adds, edits, deletes) only through the section-level "Save" button. There SHALL be no autosave on accordion collapse and no Save/Cancel controls inside the accordion body. The existing save flow (file upload session loop followed by `POST_evidences`) and the `validateButtonDisabled` gating SHALL remain unchanged.

#### Scenario: Editing without saving
- **WHEN** the user edits or deletes evidences and collapses accordions without clicking the section Save
- **THEN** the changes SHALL remain in memory and SHALL NOT be persisted

#### Scenario: Saving the section
- **WHEN** the user clicks the section-level Save with a valid form
- **THEN** the system SHALL upload any pending files and `POST_evidences`, then reload and re-sort the list
