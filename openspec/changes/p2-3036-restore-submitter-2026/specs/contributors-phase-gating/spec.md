## MODIFIED Requirements

### Requirement: 2026+ shows the redesigned section
When the open result's reporting phase year is 2026 or later, the Contributors & Partners section SHALL render the redesigned UI. The **Submitter** field is the only legacy element exempt from the redesign: per business decision (P2-3036, confirmed by Nicoleta and Santi) it SHALL remain present in every reporting phase, so it is NOT gated by `isCP2026()`.

#### Scenario: 2026 result
- **WHEN** a P25 result whose `phase_year >= 2026` opens the Contributors & Partners section
- **THEN** the Submitter field is present, the question reads "Can this result be mapped to a planned TOC KPI or indicator?", the indicator field is labeled "KPI Statement/description" with its help text, the info notes use the 2026/2027 wording, Level/HLO are hidden in the No scenario, and the justification limit is 50 words

#### Scenario: Submitter not phase-gated
- **WHEN** the Submitter field is rendered for any reporting phase year
- **THEN** its visibility depends only on `this.rdPartnersSE.getConsumed()` and the existing single-initiative disable rule, never on `isCP2026()`
