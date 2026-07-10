## ADDED Requirements

### Requirement: Requests helper text
The Notifications → Requests description SHALL read the new collaboration-requests text.

#### Scenario: Requests sub-tab description
- **WHEN** the user is on the Notifications tab under the Requests sub-tab
- **THEN** the section description reads "This tab displays collaboration requests received from other Programs/Accelerators or W3/Bilateral projects. You can accept or decline each invitation — if you accept, you will be able to link the collaborative result to your own ToC indicators and targets, provided the result was also planned in your ToC. Note that requests can be accepted or declined even after the result has been submitted."

### Requirement: Default phase selection
On the Notifications tab, the "Phases" dropdown SHALL default to the current active reporting phase instead of the placeholder, and the dependent "Entity" dropdown SHALL update for that phase. An explicit phase in the query params takes precedence.

#### Scenario: Auto-select active phase
- **WHEN** the Notifications tab renders with no phase already chosen and no phase query param
- **THEN** the Phases dropdown shows the current active reporting phase and the Entity dropdown is enabled and populated for it

#### Scenario: Query param wins
- **WHEN** the tab is opened with a phase query param
- **THEN** that phase is selected instead of the active-phase default

### Requirement: Accept/Decline button labels
The contributor-request actions SHALL be labeled "Accept contribution" and "Decline contribution".

#### Scenario: Button labels
- **WHEN** a received contributor request is shown
- **THEN** the confirm button reads "Accept contribution" and the reject button reads "Decline contribution"

### Requirement: ToC-alignment-driven Accept enablement (notifications)
In the contributor-request modal (notifications flow), the Accept action SHALL react to the ToC alignment question: with "No" the Accept button is enabled and no ToC fields are required; with "Yes" the ToC selection fields are mandatory and Accept stays disabled until they are filled. The result-detail share flow is unchanged.

#### Scenario: No selected
- **WHEN** the ToC alignment question is "No" (or default) in the notifications contributor-request modal
- **THEN** the Accept button is enabled and no ToC mapping is required

#### Scenario: Yes selected
- **WHEN** the ToC alignment question is "Yes"
- **THEN** the ToC selection fields are shown and mandatory, and Accept is disabled until the required ToC info is selected
