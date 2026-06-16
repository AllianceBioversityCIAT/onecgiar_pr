# evidence-deletion-persistence Specification

## Purpose
TBD - created by archiving change p2-3030-auto-save-evidence-deletion. Update Purpose after archive.
## Requirements
### Requirement: Confirmed evidence deletion persists immediately

When the user confirms the deletion of an evidence item, the evidence section SHALL persist the change immediately through the existing section save flow, so the user does not need to click **Save** separately and the deleted evidence does not reappear after navigating away and returning.

#### Scenario: Delete shows the confirmation popup
- **WHEN** the user clicks **Delete** on an evidence item
- **THEN** the system displays the confirmation popup with a **Yes, delete** action

#### Scenario: Confirming the deletion auto-saves
- **WHEN** the user clicks **Yes, delete** in the confirmation popup
- **THEN** the evidence is removed from the list
- **AND** the section save flow runs automatically (the same persistence used when creating or editing an evidence), without requiring a separate **Save** click

#### Scenario: Deleted evidence does not reappear after navigation
- **WHEN** the user has confirmed an evidence deletion
- **AND** navigates to another section and returns to the Evidence section
- **THEN** the deleted evidence is not displayed again

#### Scenario: Canceling the popup makes no change
- **WHEN** the user dismisses or cancels the confirmation popup without confirming
- **THEN** the evidence remains in the list
- **AND** no save is triggered

