# aow-indicator-search

Search/filter behavior for indicators in the AoW-level tables of the Results Framework Reporting module. Introduced by change `p2-3141-aow-kpi-search-bar` ([P2-3141](https://cgiarmel.atlassian.net/browse/P2-3141)).

### Requirement: Search input at the AoW indicators view
The AoW indicators table (`AowHloTableComponent`) SHALL display a search input above the table in all its usages: the High-Level Outputs tab, the Outcomes tab, and the 2030 Outcomes page. The input SHALL use the global `.search_input` style (pill with `material-icons-round` search icon) and the placeholder `Find indicator...`.

#### Scenario: Search bar visible on the Outputs tab
- **WHEN** a user opens an AoW page (`/result-framework-reporting/entity-details/:entityId/aow/:aowId`) on the High-Level Outputs tab
- **THEN** a search input with placeholder `Find indicator...` is rendered above the indicators table

#### Scenario: Search bar visible on Outcomes and 2030 Outcomes
- **WHEN** the user switches to the Outcomes tab, or opens the 2030 Outcomes view
- **THEN** the same search input is rendered above the corresponding indicators table

### Requirement: Filter indicators by KPI statement, indicator typology, or group title
As the user types, the table SHALL filter case-insensitively: an indicator row remains visible when its KPI statement (`indicator_description`) or its Indicator typology (`type_name`) contains the query, and a whole group (HLO/Outcome) remains visible with all its indicators when the group title (`result_title`) contains the query. Groups with no visible indicators SHALL be hidden, except groups whose title matches (they keep their existing "no associated indicators" row). Remaining groups SHALL stay expanded. The filtering SHALL NOT mutate the underlying data held in `EntityAowService` signals, and tab counts SHALL keep reflecting the unfiltered totals.

#### Scenario: Match by indicator statement
- **WHEN** the user types text contained in the KPI statement of some indicators
- **THEN** only the matching indicator rows remain visible, inside their (expanded) groups, and groups without matches disappear

#### Scenario: Match by indicator typology
- **WHEN** the user types text contained in the Indicator typology of some indicators (e.g. "knowledge products")
- **THEN** the indicator rows with a matching typology remain visible, even if their KPI statement does not contain the query

#### Scenario: Match by group title
- **WHEN** the user types text contained in an HLO/Outcome title but not in its indicators' statements
- **THEN** that whole group remains visible with all of its indicators

#### Scenario: Case-insensitive matching
- **WHEN** the user types a query differing from the data only in letter case
- **THEN** matches are found as if the case were identical

#### Scenario: Actions still work on filtered rows
- **WHEN** the table is filtered and the user clicks "Report result", "View results" or "Target details" on a visible indicator
- **THEN** the modal/drawer opens for that exact indicator, exactly as without filtering

### Requirement: No-match empty state
WHEN a non-empty query matches no group and no indicator, the table SHALL show the message `No indicators match your search.` instead of the generic empty message.

#### Scenario: Query with no matches
- **WHEN** the user types a query that matches nothing
- **THEN** the table body shows `No indicators match your search.`

### Requirement: Clearing and resetting the search
Clearing the input SHALL restore the full, unfiltered table immediately. The query SHALL persist when switching between the High-Level Outputs and Outcomes tabs of the same AoW, and SHALL reset to empty when the user navigates to a different AoW or enters/leaves the AoW page or the 2030 Outcomes page.

#### Scenario: Clear restores the table
- **WHEN** the user deletes the query (input becomes empty)
- **THEN** all groups and indicators are shown again, with the default expanded state

#### Scenario: Query persists across tabs
- **WHEN** the user types a query on the High-Level Outputs tab and switches to the Outcomes tab
- **THEN** the same query is shown in the input and applied to the Outcomes table

#### Scenario: Query resets on navigation
- **WHEN** the user navigates to another AoW or to another page and comes back
- **THEN** the search input is empty and the table is unfiltered
