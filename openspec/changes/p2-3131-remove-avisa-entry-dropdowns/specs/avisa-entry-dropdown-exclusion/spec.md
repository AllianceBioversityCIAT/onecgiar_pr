# avisa-entry-dropdown-exclusion

## Purpose

Exclude AVISA (SGP-02 / initiativeId 41) from Science Program entry dropdowns while preserving Result Center visibility and making existing AVISA results read-only.

## Requirements

### Requirement: AVISA identification
The system SHALL treat an initiative as AVISA when `official_code` or `initiativeCode` is `SGP-02` or `SGP02` (case-insensitive), or when `id`, `initiative_id`, or `initiativeId` equals `41`.

### Requirement: Contributing program dropdown exclusion
When loading options for **Contributing Science Program / Accelerator** dropdowns during result creation or contributor editing, the system SHALL omit AVISA from the selectable list.

#### Scenario: Result detail contributors dropdown
- **WHEN** a user opens Partners & Contributors or Theory of Change contributing-program selector
- **THEN** AVISA is not present in the dropdown options

#### Scenario: IPSR contributors dropdown
- **WHEN** a user opens IPSR contributor science-program selectors
- **THEN** AVISA is not present in the dropdown options

#### Scenario: Bilateral review drawer
- **WHEN** a reviewer opens the contributing initiatives multiselect in the bilateral result review drawer
- **THEN** AVISA is not present in the dropdown options

### Requirement: Primary science program exclusion on create
When a user selects the **primary** Science Program / Accelerator during result creation (admin or non-admin), the system SHALL omit AVISA from the selectable list.

#### Scenario: Result creator primary dropdown
- **WHEN** a user opens Report New Result and the Science Program selector
- **THEN** AVISA is not selectable

### Requirement: User management entity exclusion
The User Management entity filter and role-assignment entity dropdowns SHALL omit AVISA from selectable entities.

#### Scenario: User management entity filter
- **WHEN** an admin filters users by entity or assigns a role entity
- **THEN** AVISA is not in the entity list

### Requirement: Result Center preservation
The Result Center submitter / initiative filters SHALL continue to include AVISA so users can find historical AVISA results.

#### Scenario: Result Center filter list
- **WHEN** a user opens Result Center filters
- **THEN** AVISA remains available as a filter option if present in the user's initiative list

### Requirement: Read-only AVISA results
When a user opens an existing result whose primary initiative is AVISA, the system SHALL set the result detail to read-only (no field edits).

#### Scenario: Open AVISA result
- **WHEN** a user navigates to an AVISA result detail page
- **THEN** `rolesSE.readOnly` is true for that session regardless of admin status
