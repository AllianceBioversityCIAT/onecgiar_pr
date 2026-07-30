## ADDED Requirements

### Requirement: Only one alert is displayed at a time

The shared front-end alert service SHALL display at most one centered alert at a time. Opening a new alert MUST remove any alert currently on screen (including one still playing its closing animation), so a previous alert never overlaps a newly opened one.

#### Scenario: A new alert replaces the one closing
- **WHEN** an alert is closing (playing its exit animation) and a new alert is opened
- **THEN** the closing alert is removed immediately
- **AND** only the new alert is visible

#### Scenario: Confirm-then-save does not overlap
- **WHEN** the user confirms an action in a confirmation popup and the resulting save shows a "saved successfully" alert
- **THEN** the confirmation popup is no longer visible once the success alert appears
- **AND** the two messages are never shown on top of each other

#### Scenario: Back-to-back alerts do not stack
- **WHEN** two alerts are shown within a short interval
- **THEN** at most one `.custom_modal_container` is present in the DOM at any time
