## ADDED Requirements

### Requirement: Field guidance is reachable through an info tooltip

Guidance content that this change moves out of an inline grey `Description:` box SHALL be reachable through an ⓘ info icon rendered beside the field label, with no loss of text or markup.

#### Scenario: Lead contact person guidance moves to its tooltip

- **WHEN** a user opens Section 1 of a result and looks at the `Lead contact person` field
- **THEN** no grey `Description:` box is rendered under the label
- **AND** an ⓘ info icon is rendered beside the `Lead contact person` label
- **AND** activating that icon reveals `For more precise results, we recommend searching by email or username.` followed by `Examples:` in bold and `j.smith@cgiar.org; jsmith; JSmith`

#### Scenario: Title and Description keep their guidance box without the header

- **WHEN** a user looks at `Title of Result` or `Description of Result`
- **THEN** the guidance bullets are still rendered inline
- **AND** the bold grey `Description:` header above those bullets is not rendered

#### Scenario: Impact Area scores guidance moves to the heading tooltip

- **WHEN** a user opens the `Impact Area scores` section
- **THEN** the 0/1/2 scoring definitions and their accompanying notes are not rendered inline
- **AND** an ⓘ info icon beside the `Impact Area scores` heading reveals that same content

#### Scenario: Each Impact Area's guidance moves to its own tooltip

- **WHEN** a user looks at any of the five Impact Area tag labels
- **THEN** the `Example topics` and `Collective global targets` content for that area is not rendered inline
- **AND** an ⓘ info icon beside that area's tag label reveals it

### Requirement: A pinnable tooltip opens on hover, pins on click and dismisses on outside click or Escape

A tooltip marked as pinnable SHALL open on pointer hover, become pinned when the trigger is clicked, and remain visible until the user clicks outside the tooltip or presses Escape.

#### Scenario: Hover opens and leaving closes an unpinned tooltip

- **WHEN** the pointer enters a pinnable tooltip's trigger and then leaves without clicking
- **THEN** the tooltip is shown on enter and removed on leave

#### Scenario: Click pins the tooltip open

- **WHEN** the user clicks a pinnable tooltip's trigger
- **AND** then moves the pointer away from the trigger
- **THEN** the tooltip remains visible

#### Scenario: Escape closes a pinned tooltip

- **WHEN** a tooltip is pinned
- **AND** the user presses the Escape key
- **THEN** the tooltip is removed

#### Scenario: Clicking outside closes a pinned tooltip

- **WHEN** a tooltip is pinned
- **AND** the user clicks anywhere outside the tooltip element
- **THEN** the tooltip is removed

#### Scenario: Clicking inside a pinned tooltip does not close it

- **WHEN** a tooltip is pinned and its content contains a link
- **AND** the user clicks that link
- **THEN** the tooltip is not removed and the link is followed

### Requirement: Existing tooltips keep their current dismiss-on-click behaviour

Tooltips that are not explicitly marked as pinnable SHALL keep the behaviour they have today, where a click on the trigger hides the tooltip.

#### Scenario: A non-pinnable tooltip still hides on click

- **WHEN** the user clicks the trigger of a tooltip that has not opted into pinning
- **THEN** the tooltip is removed, exactly as before this change
