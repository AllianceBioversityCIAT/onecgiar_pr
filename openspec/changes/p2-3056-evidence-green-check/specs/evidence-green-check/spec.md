## ADDED Requirements

### Requirement: Evidence green check requires base evidence

The Evidence section's local completeness flag (green check) SHALL NOT be satisfied unless at least one piece of evidence has been uploaded, except for result types that are exempt from evidence (Capacity Sharing for Development, result type 5), which remain complete with no evidence.

#### Scenario: No evidence uploaded

- **WHEN** a result that is not exempt has zero pieces of evidence
- **THEN** the Evidence section green check is not satisfied (stays red)

#### Scenario: Exempt result type with no evidence

- **WHEN** the result type is Capacity Sharing for Development (type 5) and has zero pieces of evidence
- **THEN** the Evidence section green check is satisfied

### Requirement: Green check requires evidence for each Principal marker

When an Impact-Area marker is set to Principal (score 2, `tag_level` value 3) in General Information, the Evidence section green check SHALL NOT be satisfied until at least one piece of evidence is tagged to that Impact Area. This rule applies to all result types.

#### Scenario: Principal marker without tagged evidence

- **WHEN** an Impact Area (e.g. Poverty reduction, livelihoods and jobs) is set to Principal score 2 and no uploaded evidence is tagged to that Impact Area
- **THEN** the Evidence section green check is not satisfied (stays red)

#### Scenario: Principal marker with tagged evidence

- **WHEN** every Impact Area set to Principal score 2 has at least one piece of evidence tagged to it
- **THEN** that marker rule no longer blocks the green check

#### Scenario: Marker not at Principal level

- **WHEN** an Impact Area is set to a level other than Principal (none, or significant) 
- **THEN** that Impact Area does not require tagged evidence for the green check

### Requirement: Green check requires Innovation Readiness evidence when applicable

For Innovation Development results, when the readiness field ("How would you assess the current readiness of this innovation?") is set to a value between 1 and 9, the Evidence section green check SHALL NOT be satisfied until at least one piece of Innovation-Readiness-tagged evidence exists. When readiness is 0 (idea), no Innovation-Readiness evidence is required. This rule applies only to Innovation Development.

#### Scenario: Readiness 1-9 without readiness evidence

- **WHEN** an Innovation Development result has readiness level between 1 and 9 and no Innovation-Readiness-tagged evidence
- **THEN** the Evidence section green check is not satisfied (stays red)

#### Scenario: Readiness 0 exempts readiness evidence

- **WHEN** an Innovation Development result has readiness level 0
- **THEN** the Innovation-Readiness rule does not block the green check

#### Scenario: Non-Innovation-Development result

- **WHEN** the result is not an Innovation Development result
- **THEN** the Innovation-Readiness rule does not apply to its green check

### Requirement: Impact-Area checkbox labels use canonical names

The five Impact-Area checkboxes in the Evidence section SHALL display the canonical Impact-Area names, matching the wording already used in the Evidence alerts.

#### Scenario: Canonical labels shown

- **WHEN** the Evidence section renders the Impact-Area checkboxes
- **THEN** the labels read "Gender equality, youth and social inclusion", "Climate adaptation and mitigation", "Nutrition, health and food security", "Environmental health and biodiversity", and "Poverty reduction, livelihoods and jobs"

#### Scenario: Climate checkbox binding unchanged

- **WHEN** the user checks "Climate adaptation and mitigation"
- **THEN** the value is stored against the existing `youth_related` evidence field (binding unchanged; only the label text changed)
