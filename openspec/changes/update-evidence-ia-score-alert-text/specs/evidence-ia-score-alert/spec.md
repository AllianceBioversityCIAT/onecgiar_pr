## ADDED Requirements

### Requirement: Evidence-required alert wording for a recorded Impact Area score of 2

The Evidence section SHALL display a warning alert for each Impact Area that has a recorded principal contribution score of 2 (i.e. `*_tag_level === '3'`) and does not yet have a matching evidence checkbox marked. For each such Impact Area, the alert text MUST read exactly:

`A principal contribution score (2) has been recorded for {Impact Area name}. Please provide evidence to support this claim.`

The sentence MUST NOT be phrased conditionally and MUST NOT contain the word "if". The `{Impact Area name}` MUST be the official Impact Area name, not the short internal label.

#### Scenario: One Impact Area has a recorded score of 2 without matching evidence
- **WHEN** the Poverty Impact Area has `poverty_tag_level === '3'` and no evidence has `poverty_related` marked
- **THEN** the Evidence section shows the warning alert containing `A principal contribution score (2) has been recorded for Poverty reduction, livelihoods and jobs. Please provide evidence to support this claim.`
- **AND** the alert text does not contain the word "if"

#### Scenario: Multiple Impact Areas have a recorded score of 2 without matching evidence
- **WHEN** more than one Impact Area has a recorded score of 2 and lacks its matching evidence checkbox
- **THEN** the alert lists one sentence per affected Impact Area, each using that area's official name

#### Scenario: A recorded score of 2 already has matching evidence
- **WHEN** an Impact Area has a recorded score of 2 and at least one evidence has its matching `*_related` checkbox marked
- **THEN** no alert line is shown for that Impact Area

#### Scenario: No Impact Area has a recorded score of 2
- **WHEN** no Impact Area has `*_tag_level === '3'`
- **THEN** the warning alert is not displayed

### Requirement: Official Impact Area names used in the alert

The alert SHALL refer to Impact Areas by their official names.

#### Scenario: Each Impact Area maps to its official name
- **WHEN** the alert is built for an Impact Area
- **THEN** the name shown is one of: `Gender equality, youth and social inclusion`, `Climate adaptation and mitigation`, `Nutrition, health and food security`, `Environmental health and biodiversity`, `Poverty reduction, livelihoods and jobs`
