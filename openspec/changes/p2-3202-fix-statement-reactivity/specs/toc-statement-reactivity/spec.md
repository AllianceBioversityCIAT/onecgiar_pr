## ADDED Requirements

### Requirement: Statement follows the selected node without saving
The read-only `<Level> Statement` field in the P25 Contributors & Partners ToC detail SHALL display the statement of the **currently selected** ToC node at all times, updating as soon as the reporter changes the node dropdown, with no save and no page reload required.

#### Scenario: Changing the node updates the statement immediately
- **WHEN** the ToC question is Yes on a 2026 P25 result (`isCP2026()`), a Level is selected, a node is selected and its statement is displayed
- **AND** the reporter picks a **different** node in the HLO / Intermediate Outcome / 2030 Outcome dropdown
- **THEN** the statement field shows the `outcome_statement` of the newly selected node before any save occurs
- **AND** it never keeps showing the previously selected node's statement

#### Scenario: Statement stays correct after saving
- **WHEN** the reporter changes the node and then saves the section
- **THEN** the statement field still shows the selected node's statement, unchanged by the save round-trip

#### Scenario: Repeated changes each take effect
- **WHEN** the reporter changes the node several times in a row without saving
- **THEN** the statement field tracks every change, always matching the node currently selected in the dropdown

### Requirement: Existing statement-field behaviour preserved
The reactivity fix SHALL NOT alter the field's visibility rules, label, tooltip or data source as defined by change `p2-3063-hlo-outcome-statement`.

#### Scenario: Label still tracks the level
- **WHEN** the selected Level is High Level Output (`toc_level_id` 1), Intermediate Outcome (2), or 2030 Outcome (3)
- **THEN** the field label still reads the matching level name followed by `" Statement"`
- **AND** the info tooltip still reads `"Maps to TOC: Output or Outcome statement"`

#### Scenario: Still hidden when not applicable
- **WHEN** the ToC question is No, or no node is selected, or the selected node has no statement
- **THEN** the read-only statement field is not rendered

#### Scenario: Level change with a stale node id hides the field
- **WHEN** the reporter changes the Level while a node from the previous level is still selected
- **THEN** the selected node cannot be resolved in the new level's list
- **AND** the statement field is hidden rather than showing the previous level's statement

#### Scenario: 2025 and reuse contexts unaffected
- **WHEN** the result is phase 2025, or the component is reused in IPSR / bilateral / share-request (`isCP2026()` false)
- **THEN** the statement field is not rendered and those views behave exactly as before this change

### Requirement: Sibling read-only fields unaffected
The change SHALL leave the `Indicator Tipology` field and the ToC-driven centers / science-programs reference sets behaving as they do today.

#### Scenario: Indicator Tipology still tracks the selected KPI
- **WHEN** the reporter changes the KPI Statement/description dropdown
- **THEN** the `Indicator Tipology` field updates to the newly selected KPI's type, as it already does

#### Scenario: Centers reference set still recomputes on node selection
- **WHEN** the reporter changes the selected ToC node
- **THEN** the centers / science-programs reference sets fed to the parent still recompute for the newly selected node
