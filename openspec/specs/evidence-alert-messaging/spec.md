# evidence-alert-messaging Specification

## Purpose
TBD - created by archiving change p2-3022-evidence-alert-tag-word. Update Purpose after archive.
## Requirements
### Requirement: Score-2 evidence alert names the Impact Area tag
When an Impact Area has a principal contribution score of 2 and no related evidence is yet attached, the Evidence section SHALL display an alert that names the Impact Area followed by the word "tag", requesting supporting evidence.

#### Scenario: Alert text includes the word "tag"
- **WHEN** an Impact Area (e.g. Nutrition, health and food security) has a score of 2 with no evidence attached
- **THEN** the Evidence section shows `A principal contribution score (2) has been recorded for Nutrition, health and food security tag. Please provide evidence to support this claim.`

#### Scenario: Alert text contains no "if" wording
- **WHEN** the score-2 evidence alert is rendered for any Impact Area
- **THEN** the sentence does not contain the word "if"

