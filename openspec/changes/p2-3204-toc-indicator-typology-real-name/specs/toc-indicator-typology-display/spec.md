## ADDED Requirements

### Requirement: Indicator typology resolves to the ToC type name

Wherever PRMS displays the ToC indicator typology of a selected KPI, the system SHALL render both the internal sentinel (`type_value`) and the ToC's descriptive type name (`type_name`), sentinel first, separated by an em dash surrounded by spaces.

Resolution SHALL be, after trimming both values:
1. when both are non-empty and different, `<sentinel> — <name>`
2. when both are non-empty and equal, that value once
3. when only one is non-empty, that one alone
4. when neither is non-empty, the capability's empty-value placeholder

The system SHALL NOT alter, trim prefixes from, or otherwise sanitise either value beyond whitespace trimming.

#### Scenario: Custom KPI shows the sentinel and its real name

- **WHEN** the selected KPI arrives with `type_value` = `"custom"` and `type_name` = `"# partners supporting changes to more gender-equitable norms"`
- **THEN** the indicator typology field displays `custom — # partners supporting changes to more gender-equitable norms`

#### Scenario: Identical values are not repeated

- **WHEN** the selected KPI arrives with `type_value` = `"Innovation Use"` and `type_name` = `"Innovation Use"`
- **THEN** the indicator typology field displays `Innovation Use`
- **AND** it does not display `Innovation Use — Innovation Use`

#### Scenario: Empty sentinel leaves the type name alone

- **WHEN** the selected KPI arrives with `type_value` = `""` and `type_name` = `"Number of food producers using CGIAR innovations."`
- **THEN** the indicator typology field displays `Number of food producers using CGIAR innovations.`
- **AND** no separator is displayed

#### Scenario: Missing type name falls back to the sentinel

- **WHEN** the selected KPI arrives with `type_name` absent, null, or blank, and `type_value` = `"Innovation Use"`
- **THEN** the indicator typology field displays `Innovation Use`

#### Scenario: A dirty sentinel is shown as delivered, not sanitised

- **WHEN** the selected KPI arrives with `type_value` = `"_n_Realized genetic gains in farmer-relevant conditions."` and `type_name` = `"Realized genetic gains in farmer-relevant conditions."`
- **THEN** the indicator typology field displays both values joined, because they differ
- **AND** the `_n_` prefix is preserved exactly as the ToC delivered it

### Requirement: The indicator typology field remains visible when no type is available

In the Contributors & Partners ToC mapping block, the visibility of the indicator typology field SHALL NOT depend on the resolved value being non-empty. When a KPI is selected in the 2026 reporting phase, the field SHALL be rendered, displaying `Not specified` when no typology text can be resolved.

#### Scenario: No typology data at all

- **WHEN** the selected KPI arrives with both `type_value` and `type_name` empty or null
- **THEN** the indicator typology field is still rendered
- **AND** it displays `Not specified`

#### Scenario: Placeholder matches sibling read-only fields

- **WHEN** the indicator typology field displays its empty-value placeholder
- **THEN** the placeholder text matches the one already used by the adjacent read-only "Unit of measurement" and "Target" fields in the same block

#### Scenario: Field is not rendered outside the 2026 phase

- **WHEN** the reporting phase is not 2026
- **THEN** the indicator typology field is not rendered, regardless of the KPI data

#### Scenario: Field is not rendered before a KPI is chosen

- **WHEN** the 2026 phase is active but no KPI has been selected in the tab
- **THEN** the indicator typology field is not rendered

### Requirement: The indicator typology label is spelled consistently

Every screen that displays the ToC indicator typology SHALL label it `Indicator Typology`.

#### Scenario: Contributors & Partners label

- **WHEN** the indicator typology field is rendered in the Contributors & Partners ToC mapping block
- **THEN** its label reads `Indicator Typology`
- **AND** the misspelling `Indicator Tipology` no longer appears in the application

### Requirement: The ToC contribution review panel shows the same typology text

The ToC contribution review panel in notifications SHALL display the same resolved typology text as the Contributors & Partners block, applying the same rule to the ToC type name delivered as `statement` and the `indicator_typology` sentinel.

#### Scenario: Custom KPI in the review panel

- **WHEN** a contribution review entry arrives with `indicator_typology` = `"custom"` and `statement` = `"# partners supporting changes to more gender-equitable norms"`
- **THEN** the panel's "Indicator Typology" row displays `custom — # partners supporting changes to more gender-equitable norms`

#### Scenario: Review panel does not repeat identical values

- **WHEN** a contribution review entry arrives with `indicator_typology` and `statement` both equal to `"Innovation Use"`
- **THEN** the panel's "Indicator Typology" row displays `Innovation Use` once

#### Scenario: Review panel keeps its own empty placeholder

- **WHEN** a contribution review entry arrives with neither `statement` nor `indicator_typology` populated
- **THEN** the panel's "Indicator Typology" row displays the em dash placeholder already used by every other row of that panel

#### Scenario: Review panel tolerates a missing statement field

- **WHEN** a contribution review entry arrives without the `statement` field and with `indicator_typology` = `"Innovation Use"`
- **THEN** the panel's "Indicator Typology" row displays `Innovation Use`

### Requirement: Functional use of the typology sentinel is preserved

Logic that consumes `type_value` as a functional sentinel rather than for display SHALL keep reading `type_value` unchanged.

#### Scenario: ToC target indicator alert is unaffected

- **WHEN** the ToC target indicator component evaluates whether to raise its alert
- **THEN** it continues to compare `type_value` against `"custom"`
- **AND** its alert behaviour is identical to before this change
