## ADDED Requirements

### Requirement: ToC decoupling trigger (alignment = NO, 2026 only)
The Contributors & Partners section SHALL apply ToC-decoupled behavior only when the reporting phase is 2026 (P25) and the submitter's ToC alignment answer is **No** (`result_toc_result.planned_result === false`).

#### Scenario: Emerging result with alignment No
- **WHEN** the user is on a 2026 Contributors & Partners section and `planned_result` is `false`
- **THEN** the system treats Centers, Science Programs, and External Partners as decoupled from ToC logic

#### Scenario: Alignment not yet answered
- **WHEN** `planned_result` is `null`
- **THEN** the planned ToC split behavior remains until the user selects No

#### Scenario: Planned alignment Yes
- **WHEN** `planned_result` is `true`
- **THEN** the existing ToC split, notes, and prefill behavior applies unchanged

### Requirement: No ToC notes or prefill when decoupled
When decoupled, the system MUST NOT show ToC informational notes, MUST NOT pre-fill selections from ToC reference data, and MUST NOT filter dropdown options to ToC-derived subsets.

#### Scenario: Centers info note hidden
- **WHEN** decoupled mode is active
- **THEN** the note "The CGIAR Centers listed below were identified in your 2026 ToC…" is not displayed

#### Scenario: Science Programs info note hidden
- **WHEN** decoupled mode is active
- **THEN** the note "The Programs/Accelerators listed below were identified in your 2026 ToC…" is not displayed

#### Scenario: No ToC prefill on load
- **WHEN** decoupled mode is active and the section loads
- **THEN** Centers, Science Programs, and External Partners are not auto-populated from ToC reference sets

### Requirement: Full-list single dropdowns for Centers and Science Programs
When decoupled, Contributing CGIAR Centers and Contributing Science Program/Accelerator MUST each render as one multiselect containing the complete available catalog, without an "Other(s)" option or secondary dropdown.

#### Scenario: Centers full catalog
- **WHEN** decoupled mode is active
- **THEN** the Centers multiselect lists all CLARISA CGIAR Centers and does not include "Other(s) Contributing CGIAR Centers"

#### Scenario: Science Programs full catalog
- **WHEN** decoupled mode is active
- **THEN** the Science Programs multiselect lists all available Science Programs (excluding owner) and does not include "Other(s) Science Program(s)"

### Requirement: Standard External Partners behavior when decoupled
When decoupled, External Partners MUST use the original single full-list partner dropdown without ToC split or "Other(s) External Partners" secondary field.

#### Scenario: External Partners full list
- **WHEN** decoupled mode is active and the result is not a Knowledge Product
- **THEN** the External Partners field shows the complete partner institution list in one dropdown

### Requirement: Save tags all selections from_toc false when decoupled
When the user saves Contributors & Partners in decoupled mode, every contributed Center, Science Program, and External Partner in the payload MUST be sent with `from_toc: false`.

#### Scenario: Save emerging unplanned result
- **WHEN** the user saves the section in decoupled mode with selected Centers, SP, and Partners
- **THEN** the PATCH payload contains those entities tagged `from_toc: false` and does not include ToC Other-bucket merges
