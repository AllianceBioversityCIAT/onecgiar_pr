# p25-lead-contact-mandatory Specification

## Purpose
TBD - created by archiving change p2-2979-fix-lead-contact-mandatory-p25. Update Purpose after archive.
## Requirements
### Requirement: P25 Lead contact person is visibly required

In the General information section, when the current result portfolio is **P25**, the Lead contact person field SHALL display the standard required field indicator (asterisk on the field label) consistent with other mandatory PRMS fields.

#### Scenario: P25 result shows required marker

- **WHEN** the user opens General information for a result with portfolio P25
- **THEN** the Lead contact person label SHALL show as required

#### Scenario: P22 result does not show required marker

- **WHEN** the user opens General information for a result with portfolio P22
- **THEN** the Lead contact person label SHALL NOT show as required

### Requirement: P25 Lead contact person blocks section validation when invalid

When portfolio is **P25**, the system SHALL treat Lead contact person as mandatory for the Result Detail section validation alert. A valid value is a contact selected from the directory (both `lead_contact_person` and `lead_contact_person_data` populated by the lead-contact field component).

#### Scenario: Empty lead contact on Save

- **WHEN** the user is on General information for a P25 result with no selected Lead contact person
- **AND** the user clicks Save
- **THEN** the standard required-information validation alert SHALL include **Lead contact person**
- **AND** the section completion indicator SHALL NOT show as fully complete for that validation pass (frontend alert layer)

#### Scenario: Partial search text without selection

- **WHEN** the user types text in the Lead contact person search but has not selected a user from the results
- **AND** the user clicks Save
- **THEN** the validation alert SHALL still include **Lead contact person**

#### Scenario: Valid selected contact

- **WHEN** the user has selected a valid Lead contact person from search
- **AND** the user clicks Save
- **THEN** **Lead contact person** SHALL NOT appear in the missing-fields validation alert for that field

#### Scenario: Cleared contact after selection

- **WHEN** the user clears a previously selected Lead contact person on a P25 result
- **AND** the user clicks Save
- **THEN** the validation alert SHALL include **Lead contact person** again

