## ADDED Requirements

### Requirement: Contributing CGIAR Centers split by TOC reference
On a 2026 P25 result in the Yes scenario, the Contributing CGIAR Centers field SHALL be split into a first dropdown showing only the centers referenced by the selected TOC node, and a second "Other(s)" dropdown for the remaining centers.

#### Scenario: First dropdown shows only TOC-referenced centers
- **WHEN** the section renders on a 2026 P25 result with a TOC node selected
- **THEN** the "Contributing CGIAR Centers" dropdown lists only the CLARISA centers whose `institutionId` is in the union of the node's `toc_partners` and the selected indicator's `toc_target_center_ids`
- **AND** an info note explains the centers come from the 2026 ToC and that "Other" reveals the rest

#### Scenario: Other(s) reveals the remaining centers
- **WHEN** the user enables the "Other(s) CGIAR Centers" option
- **THEN** a second dropdown appears listing the centers NOT referenced by the TOC, for free selection

#### Scenario: Phase 2025 and reuse contexts unchanged
- **WHEN** the result is phase 2025, or the component is reused in IPSR / bilateral / share-request (`isCP2026()` false)
- **THEN** the original single Contributing CGIAR Centers dropdown is shown, unchanged

### Requirement: Save deferred (not implemented yet)
This change SHALL NOT alter how centers are persisted; the split's persistence is deferred.

#### Scenario: Existing save untouched
- **WHEN** the user saves the section
- **THEN** the PATCH payload and the existing `contributing_center` handling are unchanged
- **AND** the TOC-vs-Other distinction is not persisted yet (tracked for a follow-up designed with the backend)
