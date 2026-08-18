## ADDED Requirements

### Requirement: Contributing Science Program/Accelerator split by ToC reference
On a 2026 P25 result, the Contributing Science Program/Accelerator field SHALL show only the SP referenced by the selected ToC nodes (union of `contributing_synergy_program_initiative_ids`, crossed against `/clarisa/initiatives` by `id`), with an "Other(s)" dropdown for the rest. Visual layer only.

#### Scenario: SP from ToC shown
- **WHEN** the section renders on a 2026 P25 result whose selected ToC nodes carry synergy program ids
- **THEN** dropdown 1 lists only those Science Programs (preselected), with "Other(s) Science Program(s)" at the end of the list
- **AND** picking "Other(s)" reveals a second dropdown with the remaining (non-ToC) Science Programs

#### Scenario: No Science Programs in the ToC
- **WHEN** the selected ToC nodes carry no synergy programs
- **THEN** the field shows the note "No Science Programs related to the established HLO/Outcomes were found" and NO dropdown / Other option

#### Scenario: Phase 2025 and reuse contexts unchanged
- **WHEN** the result is phase 2025 (`isCP2026()` false)
- **THEN** the legacy contributing-initiatives dropdown (accepted/pending/new) is shown, unchanged

### Requirement: Save / pending deferred
This change SHALL NOT alter persistence; the selected SP do not yet create pending contribution requests.

#### Scenario: Existing save untouched
- **WHEN** the user saves the section
- **THEN** the PATCH payload and the existing contributing-initiatives handling are unchanged
