## ADDED Requirements

### Requirement: All indicators view is a table
When the Reporting tab's view mode is `All indicators`, the system SHALL render a single table with a
sticky column header, not the grouped card row.

#### Scenario: Switching to All indicators
- **WHEN** the user selects `All indicators` on the Grouped/All switch
- **THEN** every indicator surviving the active filters is listed in one table
- **AND** a column header row is shown and remains visible while the list scrolls vertically

#### Scenario: Switching back to Grouped
- **WHEN** the user selects `Grouped`
- **THEN** the Area-of-Work and programme-level bucket cards are rendered
- **AND** the table's sort state does not affect the order of rows inside any card

### Requirement: Table columns are payload-backed
The table SHALL render exactly these columns: `Indicator`, `AoW`, `Type`, `Center`, `Target`,
`Achieved`, `Status`, plus the row action and the overflow menu. No column may be rendered for a
field the API does not return, and no per-row placeholder cell may stand in for missing data.

#### Scenario: Indicator column
- **WHEN** a row is rendered
- **THEN** the `Indicator` column shows the indicator description clamped to two lines
- **AND** a `Show more` control is offered only when the text actually overflows

#### Scenario: AoW column with a code
- **WHEN** a row belongs to an Area of Work
- **THEN** the `AoW` column shows the AoW code as a monospace chip

#### Scenario: AoW column without a code
- **WHEN** a row belongs to a programme-level bucket and has no AoW code
- **THEN** the `AoW` column shows an em dash

#### Scenario: Center column
- **WHEN** a row carries a centre acronym
- **THEN** the `Center` column shows it, truncated with the full value available on hover

#### Scenario: Parent column is absent
- **WHEN** the table is rendered
- **THEN** no `Parent` column is shown, because the API returns no parent field
- **AND** no placeholder or disabled `Parent` cell is rendered on any row

### Requirement: Sortable columns
Each column header SHALL be a control that sorts the table by that column, cycling ascending then
descending, with the active column and direction indicated.

#### Scenario: Sorting by a text column
- **WHEN** the user activates the `Indicator` header
- **THEN** rows are ordered by indicator description ascending
- **AND** activating it again reverses the order

#### Scenario: Sorting by a numeric column
- **WHEN** the user sorts by `Target` or `Achieved`
- **THEN** rows are ordered numerically, not lexicographically
- **AND** rows with no reported figure sort together at one end rather than as zero

#### Scenario: Only one column sorts at a time
- **WHEN** the user activates a second column header
- **THEN** the previous column's sort indicator is cleared

### Requirement: Horizontal scroll with pinned edges
The table SHALL scroll horizontally within its own container, keeping the status mark and the
indicator title pinned to the left edge and the row action and overflow menu pinned to the right.

#### Scenario: Narrow viewport
- **WHEN** the table is wider than its container
- **THEN** the container scrolls horizontally
- **AND** the page body does not scroll horizontally

#### Scenario: Scrolled state
- **WHEN** the table is scrolled horizontally
- **THEN** the indicator title stays readable at the left edge
- **AND** the row action stays reachable at the right edge

### Requirement: Figures keep tabular alignment
Numeric cells SHALL use the monospace figure face with tabular numerals and be right-aligned, and a
value that was never reported SHALL render as an em dash rather than a zero.

#### Scenario: Reported zero versus nothing reported
- **WHEN** an indicator's achieved value is a literal `0`
- **THEN** the `Achieved` cell shows `0`
- **WHEN** the achieved value is absent
- **THEN** the `Achieved` cell shows an em dash in the muted colour
- **AND** a tooltip states that nothing has been reported yet for that indicator

### Requirement: Shared derivations are unchanged
The table SHALL derive status, progress and displayed figures with the existing helpers, so the
Reporting tab, the legacy AoW table and the Overview tab never disagree.

#### Scenario: Status thresholds
- **WHEN** a row's status is derived
- **THEN** progress above 100 is `overachieved`, exactly 100 is `achieved`, 1 to 99 is
  `in-progress`, and anything else is `not-started`
- **AND** the same thresholds are used by the legacy AoW table
