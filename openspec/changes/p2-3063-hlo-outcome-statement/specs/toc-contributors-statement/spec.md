## ADDED Requirements

### Requirement: Selected TOC node statement shown read-only
The P25 Contributors & Partners ToC detail SHALL display, in the Yes scenario on a 2026 result, a read-only field with the statement of the selected TOC node, sourced from the control list's `outcome_statement`.

#### Scenario: Statement shown for the selected node
- **WHEN** the ToC question is Yes on a 2026 P25 result (`isCP2026()`), a Level is chosen, and a node is selected in the HLO/Outcome dropdown
- **THEN** a read-only field appears between the HLO/Outcome dropdown and the KPI Statement/description field
- **AND** its value is the `outcome_statement` of the selected node (matched by `toc_result_id` in the list for the chosen level)

#### Scenario: Hidden when not applicable
- **WHEN** the ToC question is No, or no node is selected, or the node has no statement
- **THEN** the read-only statement field is not rendered

#### Scenario: Phase 2025 and reuse contexts unaffected
- **WHEN** the result is phase 2025, or the component is reused in IPSR / bilateral / share-request (`isCP2026()` false)
- **THEN** the statement field is not rendered and those views are unchanged

### Requirement: Statement label is dynamic per level
The statement field label SHALL reflect the selected level: `High Level Output Statement`, `Intermediate Outcome Statement`, or `2030 Outcome Statement`.

#### Scenario: Label tracks the level
- **WHEN** the selected Level is High Level Output (`toc_level_id` 1), Intermediate Outcome (2), or 2030 Outcome (3)
- **THEN** the field label reads the matching level name followed by `" Statement"`

### Requirement: Statement field info tooltip
The statement field SHALL expose an info tooltip (ⓘ) next to its label with the ToC-mapping help text (Excel row 10).

#### Scenario: Tooltip present
- **WHEN** the statement field is rendered on a 2026 result
- **THEN** an info icon (ⓘ) sits next to the label
- **AND** hovering it shows `"Maps to TOC: Output or Outcome statement"`
