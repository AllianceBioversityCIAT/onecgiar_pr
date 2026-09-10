# program-overview-breakdowns

Requirements for the Science Program **Overview** tab (`entity-details/:entityId/overview`,
rendered by `ProgramOverviewComponent`).

## ADDED Requirements

### Requirement: Overview card order

The Overview tab SHALL render exactly six cards, in this order, at these grid spans:
`About this program` (12), `Results by indicator category` (6), `Bilateral results by indicator
category` (6), `Reporting status` (12), `Bilateral contributions` (6), `Progress by area of work`
(6). No other card SHALL be present.

#### Scenario: Card order matches the approved design
- **WHEN** a user opens the Overview tab for any Science Program
- **THEN** the six `h2` headings appear in exactly the order above
- **AND** `Results by indicator category` appears immediately after `About this program`, per P2-3303

#### Scenario: Reporting status fills the row left by Reporting pace
- **WHEN** the Overview tab renders
- **THEN** `Reporting status` spans all 12 columns
- **AND** no empty grid cell is left where `Reporting pace` used to sit

### Requirement: Results by indicator category is a horizontal proportional bar list

The `Results by indicator category` card SHALL render one row per result category that has a
non-zero count, sorted by count descending. Each row SHALL show the category name, a proportional
horizontal bar, and the count. The bar fill width SHALL be the row count divided by the largest
count in the series, expressed as a percentage. Counts SHALL be rendered in the monospace
tabular-nums figure style, right-aligned.

#### Scenario: Largest category fills the track
- **WHEN** the series is `[{Innovation development, 15}, {Other output, 10}]`
- **THEN** the `Innovation development` fill width is 100%
- **AND** the `Other output` fill width is `10/15 * 100`%

#### Scenario: No category cap
- **WHEN** a program reports results in eight categories
- **THEN** all eight rows render
- **AND** none is hidden by a fixed cap

#### Scenario: Empty series
- **WHEN** the program has no reported results
- **THEN** the card shows a single line of empty-state copy no taller than 160px
- **AND** no bar row renders
- **AND** no division-by-zero error occurs

#### Scenario: Long category name is truncated, not wrapped
- **WHEN** a category name is wider than the label column
- **THEN** the name is truncated with an ellipsis
- **AND** the full name is available as a tooltip

### Requirement: Bilateral results by indicator category

The `Bilateral results by indicator category` card SHALL render the same horizontal proportional
bar rows, counting only W3/Bilateral results in which this Science Program is the **primary**
contributor, grouped by result category. Its bar fill SHALL use the muted bilateral chart token,
visually distinct from the own-results card.

#### Scenario: Only primary-role results are counted
- **WHEN** the program is tagged on 142 bilateral results, 134 of them as primary
- **THEN** the category counts in this card sum to 134

#### Scenario: Role id is compared as a string
- **WHEN** the API returns `initiative_role_id` as the string `"1"`
- **THEN** the result is counted as primary
- **AND** a strict numeric comparison is not used

#### Scenario: No bilateral results
- **WHEN** the program has no bilateral results linked to it
- **THEN** the card shows the empty-state line "No bilateral results are linked to this program yet."
- **AND** no bar row renders

### Requirement: Bilateral contributions counts

The `Bilateral contributions` card SHALL show the count of W3/Bilateral results where this Science
Program is tagged in any role, where it is the primary contributor, and where it is a contributor.
Counts SHALL be rendered in the monospace tabular-nums figure style. Row labels SHALL derive from
the role name returned by the API rather than being hardcoded per role id.

#### Scenario: Counts are consistent
- **WHEN** the API returns 142 tagged results, 134 primary and 8 contributor
- **THEN** the card shows tagged 142, primary 134, contributor 8
- **AND** primary plus contributor equals tagged

#### Scenario: Zero bilateral results
- **WHEN** the program has no bilateral results
- **THEN** all three counts render as 0 rather than blank

### Requirement: Controls without authorising scope ship disabled and labelled

The system SHALL render any control that the approved design shows but for which no Jira ticket authorises the underlying work in the position the design specifies, in a disabled state, and with a visible `Coming soon` label. Such a control SHALL NOT be silently omitted, and its behaviour SHALL NOT be invented.

#### Scenario: Category rows are not yet navigable
- **WHEN** the Overview tab renders and no destination view with a category filter exists
- **THEN** each category row renders with the design's visuals but is disabled
- **AND** the card carries a visible `Coming soon` label
- **AND** clicking a row performs no navigation

#### Scenario: Primary-subset status breakdown is not yet authorised
- **WHEN** the `Bilateral contributions` card renders
- **THEN** the "Of those where this program is primary" sub-block is present but disabled
- **AND** it carries a visible `Coming soon` label

### Requirement: Proportional bars are decorative to assistive technology

Every proportional bar track and fill SHALL be hidden from assistive technology. The row's
accessible name SHALL convey the category and its count. A focusable row SHALL have a focus
indicator that includes a solid outline, not a translucent halo alone.

#### Scenario: Screen reader reads the row, not the bar
- **WHEN** a screen reader reaches a category row
- **THEN** it announces the category name and count
- **AND** it does not announce the bar track or fill as separate elements

#### Scenario: Bar colour meets non-text contrast
- **WHEN** a bar fill renders against its track
- **THEN** the contrast ratio is at least 3:1

### Requirement: Colours come from tokens

No component template or stylesheet touched by this capability SHALL contain a raw hex colour.
Bar fills, tracks, text and borders SHALL reference `--pr-*` custom properties.

#### Scenario: Bilateral fill uses a token
- **WHEN** the bilateral bar fill is styled
- **THEN** it references a `--pr-chart-*` custom property
- **AND** no literal hex value appears in the template

## REMOVED Requirements

### Requirement: Reporting pace card

**Reason**: P2-3298 — end user (Nicoleta) asked for the graph to be removed. The card projected a
completion date from a sparkline that was not a real time series: the progress endpoint returns
only current status counts, so the line was a straight ramp from zero to today's total.

**Migration**: None. The card derived everything per-render and persisted nothing. Reporting
progress remains visible in `Reporting status` and `Progress by area of work`.

#### Scenario: Reporting pace is gone
- **WHEN** a user opens the Overview tab
- **THEN** no `Reporting pace` heading, sparkline or pace copy renders

### Requirement: Needs attention card

**Reason**: P2-3300 — end user asked for its removal. Its three derived rows restated data already
shown by two neighbouring cards: stale-draft and not-started counts are in the `Reporting status`
meter, and empty areas of work already read `0/N` in `Progress by area of work`.

**Migration**: None. No alert signal is lost.

#### Scenario: Needs attention is gone
- **WHEN** a user opens the Overview tab
- **THEN** no `Needs attention` heading, alert row or alert icon renders

### Requirement: Impact so far card

**Reason**: P2-3299 — end user asked for its removal. Its `Countries reached` half was never wired
(the parent never bound the input, so it always rendered its empty state), and its
`Results by indicator category` half is promoted to its own card by P2-3303.

**Migration**: The category breakdown moves to the new `Results by indicator category` card with
the same data source and no cap. Country reach was never functional and is not replaced.

#### Scenario: Impact so far is gone
- **WHEN** a user opens the Overview tab
- **THEN** no `Impact so far` heading, `Countries reached` figure or vertical column chart renders
