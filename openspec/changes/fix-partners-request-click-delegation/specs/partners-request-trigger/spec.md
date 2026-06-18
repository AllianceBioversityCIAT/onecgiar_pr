## ADDED Requirements

### Requirement: Open partners-request modal from embedded links via global delegation

The system SHALL open the shared partners-request modal when the user clicks any embedded "request" trigger link (`.pSelectP`, `.alert-event`, `.alert-event-2`, `.alert-event-3`), regardless of the current page, using a single global click-delegation listener registered at the app shell. The system SHALL NOT poll the DOM to attach per-element listeners.

#### Scenario: Click a partner-request link inside a field description
- **WHEN** the user clicks the `<a class="...pSelectP">request</a>` link embedded in a partner select field description
- **THEN** the partners-request modal becomes visible
- **AND** the link's default navigation is prevented

#### Scenario: Click target is a child node of the trigger anchor
- **WHEN** the user clicks an inner element nested inside a trigger anchor (so `event.target` is the child)
- **THEN** the system resolves the trigger via `closest()` and still opens the modal

#### Scenario: Click an IPSR alert trigger
- **WHEN** the user clicks an `.alert-event`, `.alert-event-2`, or `.alert-event-3` link in an IPSR section
- **THEN** the partners-request modal becomes visible

### Requirement: No console error on pages without a trigger link

The system SHALL NOT throw or log any `TypeError` related to `addEventListener` on pages where no trigger link is present.

#### Scenario: Navigate to the results list (no partner dropdown)
- **WHEN** the user navigates to `/result/results-outlet/results-list`
- **THEN** no `TypeError: Cannot read properties of null (reading 'addEventListener')` is logged to the console
- **AND** no DOM-polling timer is started for trigger links

### Requirement: Signal-backed modal visibility

The partners-request modal visibility flag SHALL be exposed as a writable signal, read in templates via the signal getter and updated via `.set(...)`.

#### Scenario: Closing the modal
- **WHEN** the user closes the partners-request modal (close button or dialog dismiss)
- **THEN** the visibility signal is set to `false`
- **AND** the modal is hidden

#### Scenario: Opening the modal updates the signal
- **WHEN** a trigger link is clicked
- **THEN** the visibility signal is set to `true` inside the Angular zone so change detection updates the modal

### Requirement: Global click listener does not degrade performance

The global click listener SHALL be registered outside the Angular zone and SHALL re-enter the zone only when a trigger is matched, and SHALL be removed when the shell component is destroyed.

#### Scenario: Clicking a non-trigger element
- **WHEN** the user clicks anywhere that is not a trigger link
- **THEN** no Angular change-detection cycle is forced by the listener
