## ADDED Requirements

### Requirement: ToC alignment question label
The P25 Contributors & Partners section SHALL display the ToC-alignment question with the 2026 wording.

#### Scenario: Question label updated
- **WHEN** a user opens the Contributors & Partners section of a P25 result
- **THEN** the yes/no question reads `"Can this result be mapped to a planned TOC KPI or indicator?"`
- **AND** the previous text `"Does this result align with the Program's planned TOC indicators?"` no longer appears anywhere in the section

#### Scenario: Contributor row mirrors the new label
- **WHEN** the section builds the per-contributor question string (component TS)
- **THEN** it uses the new label `"Can this result be mapped to a planned TOC KPI or indicator?"` (prefixed by the contributor code/short name), not the old phrasing

### Requirement: ToC question info note text
The info note shown beneath the ToC-alignment question SHALL display the 2026 guidance text from the Excel (row 5).

#### Scenario: Info note shows 2026 wording
- **WHEN** the Contributors & Partners section renders the info note under the ToC question
- **THEN** it reads: `"If Yes, please select the relevant level, KPI and indicator, and indicate the result contribution to the indicator target. If No, please provide a short justification explaining why this result is being reported outside the 2026 TOC KPI/indicators. No-mapped results will be shared with the Program team for consideration as part of the adaptive management process, and may feed into updates to the Program's 2027 TOC."`
- **AND** no references to "2025 ToC" remain in this info note

### Requirement: Indicator field renamed to KPI Statement/description
The indicator selector in the ToC detail SHALL be labeled `"KPI Statement/description"`.

#### Scenario: Field label updated
- **WHEN** the ToC detail (multiple-wps content) renders the indicator selector
- **THEN** its label reads `"KPI Statement/description"` instead of `"Indicator"`

### Requirement: KPI Statement/description help text as tooltip
The `KPI Statement/description` field SHALL expose the ToC-mapping help text from the Excel (row 12) as a **tooltip on an info icon (ⓘ) next to the label**, following the project design line (`material-icons-round` + PrimeNG `pTooltip`), not as visible text below the field. (QA follow-up P2-3061 / updated 2026-06-24 mockup.)

#### Scenario: Help text shown as info-icon tooltip
- **WHEN** the indicator/KPI selector is rendered on a 2026 P25 result (`isCP2026()`)
- **THEN** an info icon (ⓘ) appears next to the `"KPI Statement/description"` label
- **AND** hovering it shows the tooltip `"Maps to TOC: [KPI Statement – deliverable short name and indicator description]"`
- **AND** that text does NOT appear as visible inline text below the field

#### Scenario: Phase 2025 and non-tooltip fields unaffected
- **WHEN** the field is rendered on phase 2025 (`isCP2026()` false), or any other field that passes no `tooltip` input
- **THEN** no info icon is rendered and the label markup is unchanged from before

### Requirement: Contribution to indicator target info note text
The info note for the Contribution-to-indicator-target field SHALL display the 2026 guidance from the Excel (row 18).

#### Scenario: Contribution Target info note shows 2026 wording
- **WHEN** a user has selected an indicator and the Contribution-to-indicator-target block is shown
- **THEN** the info note reads the 2026 text describing using the indicator's unit of measurement, the examples (farmers / USD / workshops), the Knowledge Product guidance (enter `1`, or `0` for complementary results), and the aggregation note toward "the planned 2026 KPIs and indicator targets"
- **AND** no references to a "2025 target" remain in this info note
