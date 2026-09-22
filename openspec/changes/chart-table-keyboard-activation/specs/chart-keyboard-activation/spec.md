## ADDED Requirements

### Requirement: Chart data table exposes activatable controls
The shared chart component SHALL render a cell of its visually-hidden data table as a
`button` element when, and only when, the chart's table model supplies an action for that cell.
A chart whose table model supplies no actions SHALL render the same DOM it renders without this
capability, with no focusable descendants added.

#### Scenario: Chart supplies actions
- **WHEN** a chart is rendered with a table model whose `actions` grid holds an action at row 1,
  column 2
- **THEN** the cell at row 1, column 2 of the hidden table contains a `button` element carrying the
  action's label as its accessible name, and the cell still displays its value

#### Scenario: Chart supplies no actions
- **WHEN** a chart is rendered with a table model that has no `actions` grid
- **THEN** the hidden table contains no `button` element and the chart wrapper has no focusable
  descendant

#### Scenario: Cell has no destination
- **WHEN** a chart's table model supplies a `null` action for a cell
- **THEN** that cell renders as plain text with no control

### Requirement: Keyboard activation emits the mouse click payload
Activating a data-table control SHALL emit the chart component's `chartClick` output with the
payload the action carries, which SHALL be the payload an equivalent mouse click on the chart
produces. The component SHALL NOT expose a second navigation output for keyboard use.

#### Scenario: Activating a control
- **WHEN** a user activates a data-table control with the keyboard
- **THEN** the component emits `chartClick` once with that action's event payload

#### Scenario: Parity with the mouse path
- **WHEN** a consumer resolves the emitted payload with the resolver it already uses for mouse
  clicks
- **THEN** it resolves to the same destination the mouse click on that segment resolves to

### Requirement: Focus inside the hidden table is visible
While focus is inside the chart's visually-hidden data table, the table SHALL be visible on screen.
It SHALL return to visually hidden when focus leaves it, and SHALL NOT become visible through
pointer interaction.

#### Scenario: Keyboard focus enters the table
- **WHEN** focus moves to a control inside the hidden data table
- **THEN** the table is rendered visibly, positioned over the chart, without reflowing the page

#### Scenario: Focus leaves the table
- **WHEN** focus moves out of the data table
- **THEN** the table returns to being visually hidden while staying available to assistive technology

### Requirement: Science Program Overview category charts are keyboard operable
The Science Program Overview's "W1/W2 results by category and status" and "W3/Bilateral results by
indicator category" cards SHALL supply table actions for every segment that has a destination, in
every view mode those cards offer.

#### Scenario: W1/W2 category and status card
- **WHEN** the card holds a cell with a count and a destination
- **THEN** the hidden table's control for that cell resolves to that destination both while the card
  is in heatmap view and while it is in either bar view

#### Scenario: W3/Bilateral indicator category card
- **WHEN** the card holds a category row with a destination
- **THEN** the hidden table's control for that row resolves to that destination
