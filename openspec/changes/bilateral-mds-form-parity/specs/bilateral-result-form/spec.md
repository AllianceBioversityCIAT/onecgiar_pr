# Bilateral result form — status-driven editability and section parity

## ADDED Requirements

### Requirement: The bilateral result header identifies the result and its state

The header of a W3/Bilateral result SHALL display the result title, the result code, the result type,
a `W3/Bilateral` funding tag, and a status badge reading one of Editing, Pending Review, Approved or
Rejected.

#### Scenario: Header on a result being edited
- **WHEN** a user opens a bilateral result whose `status_id` corresponds to Editing
- **THEN** the header shows its code, its type, the `W3/Bilateral` tag and an `Editing` badge

### Requirement: Editability follows the result status

The bilateral result form SHALL be editable only while the result is in Editing. In Pending Review,
Approved and Rejected every field across all five sections SHALL be read-only.

The status is already carried by the bilateral contract (`status_id`, `status_name`); no backend
change is required.

#### Scenario: A submitted result cannot be edited
- **WHEN** a user opens a bilateral result in Pending Review
- **THEN** no field in Project Information, General Information, Contributors & Partners, Geographic
  Location or Evidence accepts input

#### Scenario: An approved result cannot be edited
- **WHEN** a user opens a bilateral result in Approved
- **THEN** the form is read-only and the badge reads `Approved`

### Requirement: Geographic Location behaves as it does in W1/W2

The bilateral Geographic Location section SHALL offer the same scope options and cascading rules as
the W1/W2 section: Global (1), Regional (2), Country (3), Sub-national (5) and
"This is yet to be determined" (50), with the conditional region and country selectors each scope
defines.

The extra-geographic-scope question SHALL be shown for every scope EXCEPT Global and
"This is yet to be determined".

#### Scenario: Global hides the extra scope question
- **WHEN** the user selects Global
- **THEN** the extra-geographic-scope question is not shown

#### Scenario: Country shows the extra scope question
- **WHEN** the user selects Country
- **THEN** the extra-geographic-scope question is shown

### Requirement: Evidence behaves as it does in W1/W2

The bilateral Evidence section SHALL enforce the same rules as W1/W2: a maximum of six evidences per
result; Link and Upload file as the two source types; a public/private choice on uploads; automatic
replacement of a CGSpace link with its permanent form; rejection of SharePoint, OneDrive, Google Drive
and Dropbox links; impact-area and result-type checkboxes per item; a description capped at 50 words;
a warning when an impact area scored Principal has no evidence tagged for it; and newest-first
ordering.

#### Scenario: The sixth evidence is the last one accepted
- **WHEN** a result already has six evidences
- **THEN** adding another is refused with the guidance the section already displays

#### Scenario: A cloud-storage link is rejected
- **WHEN** the user submits a link to SharePoint, OneDrive, Google Drive or Dropbox
- **THEN** the link is rejected and the reason is shown
