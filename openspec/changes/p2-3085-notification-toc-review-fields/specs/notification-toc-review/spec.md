# Spec: notification-toc-review

## ADDED Requirements

### Requirement: ToC review fields shown in the Contribution Request notification
When a user opens a Contribution Request notification with `is_map_to_toc: true` that carries a non-empty `toc_contribution_review`, the review interface SHALL display, for each contribution, the ToC metadata fields read-only in this exact order: Level, HLO/IO/2030 Outcome, HLO/IO/2030 Outcome Statement, Indicator Typology, Unit of measurement, Target, Contribution Target.

#### Scenario: ToC request shows the metadata block
- **WHEN** a `is_map_to_toc: true` request with a `toc_contribution_review` entry is rendered
- **THEN** the seven fields SHALL appear, in the specified order, between the request sentence and the Accept/Decline actions

#### Scenario: multiple contributions render one block each
- **WHEN** `toc_contribution_review` has more than one entry
- **THEN** each entry SHALL render its own metadata block

### Requirement: block is hidden when there is no ToC review data
The metadata block SHALL NOT render when the request is not ToC-mapped or when `toc_contribution_review` is absent or empty.

#### Scenario: non-ToC request shows no block
- **WHEN** a request has `is_map_to_toc: false` (or no `toc_contribution_review`)
- **THEN** no ToC metadata block SHALL be shown and the existing sentence + actions render unchanged

### Requirement: missing individual fields degrade gracefully
A missing individual field value SHALL render a neutral placeholder, never the literal text "undefined" or "null".

#### Scenario: absent field value
- **WHEN** an entry lacks one of the fields (e.g. no `target`)
- **THEN** that field SHALL show a neutral placeholder (e.g. "—") instead of "undefined"

### Requirement: Accept/Decline behavior unchanged
Rendering the ToC review block SHALL NOT alter the Accept/Decline actions or their validation (P2-3106).

#### Scenario: actions still work with the block present
- **WHEN** the ToC block is shown
- **THEN** the Accept contribution / Decline contribution buttons SHALL behave exactly as before
