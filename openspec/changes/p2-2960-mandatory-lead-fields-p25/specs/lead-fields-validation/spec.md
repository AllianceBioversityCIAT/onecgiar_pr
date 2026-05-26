## ADDED Requirements

### Requirement: Lead Contact Person is mandatory (P25)

In the P25 General Information section, the system SHALL treat `Lead Contact Person` as a mandatory field. The section MUST surface the standard incomplete state (red/gray validation feedback) until a valid contact is selected, and MUST show the complete state once one is selected.

#### Scenario: Lead Contact Person empty
- **WHEN** a P25 result is opened in General Information with no `lead_contact_person` selected
- **THEN** the field shows the mandatory/incomplete validation feedback
- **AND** the field does not show the complete (green) indicator

#### Scenario: Lead Contact Person selected
- **WHEN** the user selects a valid contact (`hasValidContact` is true and `lead_contact_person` is set)
- **THEN** the mandatory validation feedback clears
- **AND** the field shows the complete indicator

### Requirement: Lead Center is mandatory when not led by an external partner (P25)

In the P25 Partners section (`rd-contributors-and-partners`), when the result is NOT led by an external partner (`is_lead_by_partner = false`), the system SHALL require `Lead Center`. This mirrors the existing P22 behavior.

#### Scenario: Not led by partner, Lead Center empty
- **WHEN** `is_lead_by_partner` is false and no `leadCenterCode` is selected
- **THEN** the Lead Center field is marked required and shows the validation feedback

#### Scenario: Not led by partner, Lead Center selected
- **WHEN** `is_lead_by_partner` is false and a `leadCenterCode` is selected
- **THEN** the Lead Center validation feedback clears

### Requirement: Lead External Partner is mandatory when led by an external partner (P25)

In the P25 Partners section, when the result IS led by an external partner (`is_lead_by_partner = true`), the system SHALL require `Lead Partner` (`leadPartnerId`). This behavior already exists and MUST be preserved without regression.

#### Scenario: Led by partner, Lead Partner empty
- **WHEN** `is_lead_by_partner` is true and no `leadPartnerId` is selected
- **THEN** the Lead Partner field is marked required and shows the validation feedback

### Requirement: Validation preserves existing PRMS UX patterns

The mandatory validation for these fields SHALL reuse the existing PRMS validation primitives (`appFeedbackValidation` directive, `app-pr-field-header` / `app-pr-select` `[required]`) and MUST NOT introduce a new validation pattern.

#### Scenario: Uses existing primitives
- **WHEN** the validation feedback is rendered for any of the three lead fields
- **THEN** it uses the same directive/markers already used by other mandatory fields in the same sections
