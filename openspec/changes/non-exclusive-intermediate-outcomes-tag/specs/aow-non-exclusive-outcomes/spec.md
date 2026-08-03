# Spec — aow-non-exclusive-outcomes

## ADDED Requirements

### Requirement: Separate section for Outcomes that are not exclusive to the AoW
On the AoW page Outcomes tab, the indicators view SHALL render two tables. The first SHALL list only the Outcomes flagged as belonging to the queried Area of Work (`is_aow` other than `false`). Below it, when at least one Outcome is flagged `is_aow: false`, a second section SHALL be rendered under the heading `Intermediate Outcomes not exclusive to this Area of Work`, preceded by an informational note explaining that those entries are not assigned to a specific Area of Work and therefore appear under every one of them. An Outcome arriving without the `is_aow` field SHALL be treated as exclusive.

#### Scenario: An AoW with both kinds of Outcomes
- **WHEN** a user opens the Outcomes tab of an AoW whose payload mixes `is_aow: true` and `is_aow: false` entries
- **THEN** the main table lists only the `is_aow: true` Outcomes, and a separate section below lists the `is_aow: false` ones

#### Scenario: An AoW with no shared Outcomes
- **WHEN** every Outcome of the AoW is flagged `is_aow: true`
- **THEN** only the main table is rendered and no additional section appears

#### Scenario: An AoW whose Outcomes are all shared
- **WHEN** every Outcome of the AoW is flagged `is_aow: false`
- **THEN** the main table is not rendered, and the separate section lists all of them — so the user never sees an empty table above a populated section

#### Scenario: Payload without the flag
- **WHEN** the response contains no `is_aow` field (older server build)
- **THEN** every Outcome is rendered in the main table and no additional section appears, matching the previous behaviour

### Requirement: Tag on each non-exclusive Outcome
Every group header inside the separate section SHALL display the tag `Not exclusive to this AoW`, carrying the tooltip `This Intermediate Outcome is not assigned to a single Area of Work, so it appears under all of them.` The tag SHALL NOT be rendered in the main Outcomes table, the High-Level Outputs tab, the 2030 Outcomes page, or the Intermediate Outcomes page.

#### Scenario: Tag visible only in the separate section
- **WHEN** the Outcomes tab renders both tables
- **THEN** each group of the second table shows the tag, and no group of the first table does

### Requirement: Shared controls render exactly once
The search input and the three overlays hosted by the indicators table (Report-Result modal, View-Results drawer, Target-Details drawer) are driven by shared state, so they SHALL be rendered by exactly one table instance per view. The single search input SHALL keep filtering both tables. Table and column-header ids SHALL remain unique across the two instances. Tab counters SHALL keep reporting the total number of Outcomes, unaffected by the split.

#### Scenario: Only one search input on the Outcomes tab
- **WHEN** both tables are rendered
- **THEN** exactly one `Find indicator...` input exists, and typing in it filters both tables

#### Scenario: Reporting a result from the separate section
- **WHEN** the user clicks `Report result` on a row of the non-exclusive section
- **THEN** exactly one Report-Result modal is rendered

#### Scenario: Overlays still reachable when the main table is hidden
- **WHEN** every Outcome is non-exclusive, so the main table is not rendered
- **THEN** the separate section hosts the overlays, and `Report result` still opens the modal

#### Scenario: Tab counter unchanged
- **WHEN** an AoW has 6 Outcomes of which 2 are non-exclusive
- **THEN** the tab still reads `Outcomes (6)`

### Requirement: Description on the Intermediate Outcomes page
The sidebar page `Intermediate Outcomes` (`/aow/unplanned`) SHALL display, above its table, a note stating that these are the Intermediate Outcomes of the Science Program/Accelerator that are not assigned to a specific Area of Work, and that they are displayed both there and within the Areas of Work to which they are mapped. Wording approved by the requesters on 2026-08-03.

#### Scenario: Note visible on the page
- **WHEN** a user opens the Intermediate Outcomes page from the sidebar
- **THEN** the explanatory note is rendered above the indicators table, and the table itself behaves exactly as before
