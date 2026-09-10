## ADDED Requirements

### Requirement: Selected KPI Type shown read-only
The P25 Contributors & Partners ToC detail SHALL display, in the Yes scenario on a 2026 result, a read-only "Indicator Tipology" field with the Type of the selected KPI as defined in the TOC, sourced from the indicator's `indicator_typology`.

#### Scenario: Typology shown for the selected KPI
- **WHEN** the ToC question is Yes on a 2026 P25 result (`isCP2026()`) and a KPI/indicator is selected
- **THEN** a read-only "Indicator Tipology" field appears after the KPI Statement/description dropdown and before the Contribution-to-indicator-target block
- **AND** its value is the selected indicator's `indicator_typology` (fallback `type_value`)

#### Scenario: Hidden when not applicable
- **WHEN** no indicator is selected, the ToC question is No, or the indicator has no Type
- **THEN** the Indicator Tipology field is not rendered

#### Scenario: Phase 2025 and reuse contexts unaffected
- **WHEN** the result is phase 2025, or the component is reused in IPSR / bilateral / share-request (`isCP2026()` false)
- **THEN** the field is not rendered and those views are unchanged

### Requirement: Indicator Typology info tooltip
The Indicator Tipology field SHALL expose an info tooltip (ⓘ) next to its label with the ToC-mapping help text (Excel row 14).

#### Scenario: Tooltip present
- **WHEN** the Indicator Tipology field is rendered on a 2026 result
- **THEN** an info icon (ⓘ) sits next to the label
- **AND** hovering it shows `"Maps to TOC: [Type]"`
