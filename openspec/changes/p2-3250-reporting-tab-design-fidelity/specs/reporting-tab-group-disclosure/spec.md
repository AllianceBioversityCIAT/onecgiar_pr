## ADDED Requirements

### Requirement: Card header contents
Each top-level card on the Reporting tab SHALL show, in order: a disclosure chevron, a chip, the
group name, an info control, the KPI count, then a right-aligned progress bar, the `done of total`
ratio and the percentage.

#### Scenario: Area of Work card
- **WHEN** the card represents an Area of Work
- **THEN** the chip shows the AoW code in the monospace face on the brand-soft background

#### Scenario: Intermediate outcomes card
- **WHEN** the card represents the Intermediate Outcomes bucket
- **THEN** the chip reads `Intermediate` and is rendered uppercase
- **AND** the chip does not repeat the group name shown beside it

#### Scenario: 2030 outcomes card
- **WHEN** the card represents the 2030 Outcomes bucket
- **THEN** the chip reads `2030` on the green bucket treatment

#### Scenario: Buckets are siblings of Areas of Work
- **WHEN** the card list is rendered
- **THEN** the Intermediate Outcomes and 2030 Outcomes cards appear as top-level cards alongside the
  Area-of-Work cards, never nested inside one

#### Scenario: KPI count is not affected by filters
- **WHEN** a filter or search term is active
- **THEN** the card's KPI count and its progress ratio are computed over the unfiltered indicator
  set, so a progress figure never moves as the user types

### Requirement: Chip colours come from tokens
Every colour on the Reporting tab SHALL be a project token. No hex literal may appear in the
template or the component stylesheet, and a bucket chip MUST NOT reuse a status token's value.

#### Scenario: Bucket chip tokens exist
- **WHEN** the Intermediate or 2030 chip is rendered
- **THEN** its background and foreground come from dedicated chip tokens declared in the colour
  stylesheet
- **AND** those tokens are distinct from the approved-status tokens

#### Scenario: No hex literals remain
- **WHEN** the Reporting tab's template and stylesheet are inspected
- **THEN** they contain no hex colour literal

### Requirement: Info control opens a popover
The card's info control SHALL be a button that opens a dismissible popover describing the group. It
MUST NOT be a hover-only affordance, and it MUST NOT restate text already visible on the card.

#### Scenario: Opening the popover
- **WHEN** the user activates the info control
- **THEN** a popover opens showing the group's title and a meta footer derived from the loaded data
- **AND** the popover has a close control

#### Scenario: Dismissal
- **WHEN** the popover is open
- **AND** the user presses `Escape`, activates the close control, or clicks outside it
- **THEN** the popover closes
- **AND** the card's expanded state is unchanged

#### Scenario: No description available
- **WHEN** the group has no description in the loaded data
- **THEN** the popover body states that no description is available yet and carries a `Coming soon`
  tag
- **AND** no placeholder text belonging to another programme or group is shown

### Requirement: Disclosure defaults
Top-level cards SHALL start collapsed and their sub-groups SHALL start expanded, so the page opens as
a scannable list of headers and one expansion reveals rows rather than a second wall of headers.

#### Scenario: First render
- **WHEN** the Reporting tab loads
- **THEN** every top-level card is collapsed
- **AND** expanding one reveals its band labels, sub-groups and indicator rows

#### Scenario: Changing programme
- **WHEN** the user opens a different Science Program
- **THEN** all disclosure overrides are discarded and every card is collapsed again

### Requirement: Empty states distinguish filtered from empty
The system SHALL treat "no rows because a filter excluded them" and "no rows because none are
planned" as different facts, and MUST determine which applies from all five toolbar controls —
search, Section, Type, Category and Status.

#### Scenario: Emptied by a filter the child cannot see
- **WHEN** a card has indicators but the Section, Type or Category filter excludes all of them
- **THEN** the card body reads that no indicators match the current filters
- **AND** it does NOT claim the area of work has no planned indicators

#### Scenario: Genuinely empty card
- **WHEN** no filter and no search term is active
- **AND** an Area of Work has no planned indicators
- **THEN** the card body states that the area of work has no planned indicators yet
- **AND** no `Clear filters` control is offered

#### Scenario: Clear filters recovery
- **WHEN** any filter or search term is active and nothing matches
- **THEN** a `Clear filters` control is offered
- **AND** activating it resets search, Section, Type, Category and Status together
- **AND** the full list is shown again

#### Scenario: Zero progress card
- **WHEN** a card's indicators have nothing reported against them
- **THEN** the header shows `0 of N` and `0%` with an empty progress bar
- **AND** the card remains expandable to reach its indicators

### Requirement: Card header metrics match the design's scale
The group name SHALL render at 16px bold, the KPI count and the ratio at their specified sizes, and
no metric cell may be pinned to a width that can clip its own maximum value.

#### Scenario: Percentage at one hundred
- **WHEN** a card's progress is 100%
- **THEN** the percentage renders in full without clipping or wrapping

#### Scenario: Row separators
- **WHEN** indicator rows are rendered inside an expanded group
- **THEN** each row is separated from the one above it by a top border, matching the design
