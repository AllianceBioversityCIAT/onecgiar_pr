## ADDED Requirements

### Requirement: The 2026 Innovation Development form drops two blocks

From the 2026 reporting phase on, the Innovation Development form SHALL NOT render the "Demand of anticipated innovation user" section or the Megatrends question.

#### Scenario: Neither block appears on a 2026 result
- **WHEN** a user opens the Innovation Dev info section of an Innovation Development result in the 2026 phase
- **THEN** the "Demand of anticipated innovation user" section is not rendered
- **AND** the question "To which of the below Megatrend(s) is this innovation expected to contribute?" is not rendered
- **AND** neither heading appears anywhere on the page

#### Scenario: The rest of the form is untouched
- **WHEN** the two blocks are dropped
- **THEN** Innovation team diversity, the responsible-innovation questions and Intellectual property rights render exactly as before

### Requirement: Earlier phases keep both blocks

A result reported in the 2025 phase or earlier SHALL render both blocks exactly as it did before this change, showing whatever was answered.

#### Scenario: A 2025 result still shows both
- **WHEN** a user opens the Innovation Dev info section of an Innovation Development result in the 2025 phase
- **THEN** the "Demand of anticipated innovation user" section is rendered
- **AND** the Megatrends question is rendered with its options and stored answers

#### Scenario: A 2025-phase result inside the 2026 portfolio still shows both
- **WHEN** the result's reporting phase year is 2025 but its portfolio is P25
- **THEN** both blocks are still rendered
- **AND** the decision follows the phase year, never the portfolio

### Requirement: No stored data is removed

Hiding the two blocks SHALL NOT delete, deactivate or migrate any stored value.

#### Scenario: Answers survive the change
- **WHEN** a result had answered the Megatrends question or filled the anticipated-user fields before this change
- **THEN** those values remain stored
- **AND** they are displayed again whenever the result is consulted in a phase that renders the blocks

### Requirement: The completion check is out of scope for the client

The green check SHALL continue to be computed by the platform's completion routine. This change SHALL NOT reimplement or override that calculation in the client.

#### Scenario: The client does not compute completeness
- **WHEN** the two blocks stop rendering
- **THEN** the section's green check is still whatever the completion routine reports
- **AND** excluding the removed items from that routine is tracked as backend work, not silently approximated in the screen
