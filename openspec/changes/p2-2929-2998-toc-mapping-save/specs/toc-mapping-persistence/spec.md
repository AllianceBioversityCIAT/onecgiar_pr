## ADDED Requirements

### Requirement: ToC-origin flag on persisted centers and initiatives
The system SHALL persist whether a contributing center and a contributing initiative (Science Program) originated from the result's ToC, via an `from_toc` boolean (default `false`) on `results_center` and `results_by_inititiative`.

#### Scenario: ToC center stored as ToC mapping
- **WHEN** a 2026 P25 result is saved with a contributing center that was preselected from the ToC
- **THEN** its `results_center` row persists with `from_toc = true`

#### Scenario: Other center stored as non-ToC
- **WHEN** the same save includes a center picked from the "Other(s)" dropdown
- **THEN** its `results_center` row persists with `from_toc = false`

#### Scenario: Legacy rows default safely
- **WHEN** the column is added by migration to existing rows
- **THEN** every pre-existing row defaults to `from_toc = false`

### Requirement: Save contract carries the origin flag
The front SHALL send `from_toc` per item and SHALL strip the UI-only sentinels before saving.

#### Scenario: Centers payload
- **WHEN** the section is saved on a 2026 P25 result
- **THEN** `contributing_center[]` items carry `{ code, is_leading_result, from_toc }`
- **AND** the `__OTHER_CENTERS__` sentinel item is not present in the payload

#### Scenario: Science Programs payload
- **WHEN** the section is saved on a 2026 P25 result
- **THEN** the selected Science Programs (ToC and Other) are sent in `pending_contributing_initiatives[]` as `{ id, from_toc }`
- **AND** the `__OTHER_SCIENCE__` sentinel item is not present in the payload

### Requirement: Science Programs persist as contribution requests
Selected Science Programs SHALL follow the normal contribution-request (sharing) flow regardless of origin; `from_toc` differentiates origin only.

#### Scenario: ToC and Other SP both request
- **WHEN** a 2026 P25 result is saved with Science Programs from the ToC and from "Other(s)"
- **THEN** both create a pending contribution request via the existing sharing flow
- **AND** their `results_by_inititiative` rows differ only by `from_toc`

### Requirement: Read returns the origin flag for re-bucketing
`getContributorsPartnersByResultId` SHALL return `from_toc` per contributing center and per initiative, so the front rebuilds dropdown 1 (ToC) vs dropdown 2 (Other) by the persisted value.

#### Scenario: Reload rebuilds the split by persisted flag
- **WHEN** a saved 2026 P25 result is reopened
- **THEN** centers/SP with `from_toc = true` render in dropdown 1 (ToC) and the rest in dropdown 2 (Other)
- **AND** this holds even if the live ToC has since changed
