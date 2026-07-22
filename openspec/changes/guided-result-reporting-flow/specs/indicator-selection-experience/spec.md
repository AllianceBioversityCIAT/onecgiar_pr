## ADDED Requirements

### Requirement: Findable indicator list
The indicator table for a planned path SHALL be optimized to find the right indicator quickly rather than rendered as one long, fully-expanded list. HLO groups SHALL be collapsible with per-group indicator counts, and search SHALL remain accessible while scrolling.

#### Scenario: Table opens without a wall of rows
- **WHEN** a user opens the indicator table for an Area of Work
- **THEN** HLO groups SHALL be collapsed by default, each showing how many indicators it contains, and the user SHALL be able to expand only the group(s) they need (with an expand/collapse-all control)

#### Scenario: Search and filters stay in reach
- **WHEN** the user scrolls a long indicator list
- **THEN** the search box and filter controls (and the table header) SHALL remain visible/sticky, and an active-filter result count ("Showing X of Y") with a clear-filters control SHALL be shown

### Requirement: Filter and sort by indicator attributes
The table SHALL let users narrow and order indicators by attributes already available in the data, in addition to the existing free-text search and status filter.

#### Scenario: Filter by typology
- **WHEN** the user selects an indicator typology from a filter
- **THEN** only indicators of that typology SHALL be listed, combinable with the text search and status filter

#### Scenario: Sort by numeric columns
- **WHEN** the user sorts by target, achieved, or progress
- **THEN** the rows SHALL reorder by that column

### Requirement: Plain-language typology help
Indicator typology SHALL be explained in plain language at the point of use, not shown only as a bare label.

#### Scenario: User inspects a typology
- **WHEN** the user focuses or hovers a typology on an indicator (via a keyboard-accessible affordance)
- **THEN** a short explanation of what the typology means and how it is counted SHALL be available, using backend-provided text when present and a maintained front-side description otherwise

### Requirement: Repeated-indicator notice only when relevant
The "same indicator appears twice" notice SHALL be shown only when a duplicate indicator actually exists in the loaded data.

#### Scenario: No duplicates present
- **WHEN** the loaded indicators contain no repeated indicator id
- **THEN** the repeated-indicator banner SHALL NOT be displayed

#### Scenario: Duplicates present
- **WHEN** at least one indicator id appears more than once
- **THEN** the banner SHALL be displayed explaining why
