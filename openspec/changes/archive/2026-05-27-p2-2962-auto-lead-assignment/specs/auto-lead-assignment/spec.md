## ADDED Requirements

### Requirement: Auto-assign Lead Center when one contributing center and center-led

When the result is **not** led by an external partner (`is_lead_by_partner` is false), and exactly one Contributing CGIAR Center exists in `possibleLeadCenters`, the system SHALL set `leadCenterCode` to that center’s `code` without additional user interaction, unless a valid lead center is already selected.

#### Scenario: Single center added, center-led

- **WHEN** the user has selected exactly one Contributing CGIAR Center
- **AND** `is_lead_by_partner` is false
- **AND** `leadCenterCode` is empty
- **THEN** `leadCenterCode` is set to that center’s code
- **AND** the Lead Center dropdown displays the assigned center

#### Scenario: User switches to center-led with one center

- **WHEN** the user changes “led by external partner?” to **No**
- **AND** exactly one center exists in `possibleLeadCenters`
- **AND** `leadCenterCode` is empty (partner lead was cleared)
- **THEN** `leadCenterCode` is auto-assigned to that center

#### Scenario: Two or more contributing centers

- **WHEN** `possibleLeadCenters.length` is greater than 1
- **THEN** the system MUST NOT change `leadCenterCode` automatically

#### Scenario: Valid lead already selected

- **WHEN** `leadCenterCode` matches an entry in `possibleLeadCenters`
- **THEN** the system MUST NOT overwrite `leadCenterCode`

### Requirement: Auto-assign Lead Partner when one external partner and partner-led

When the result **is** led by an external partner (`is_lead_by_partner` is true), and exactly one partner exists in `possibleLeadPartners`, the system SHALL set `leadPartnerId` to that partner’s `institutions_id` without additional user interaction, unless a valid lead partner is already selected.

#### Scenario: Single partner added, partner-led

- **WHEN** the user has added exactly one external partner to the section
- **AND** `is_lead_by_partner` is true
- **AND** `leadPartnerId` is empty
- **THEN** `leadPartnerId` is set to that partner’s `institutions_id`

#### Scenario: User switches to partner-led with one partner

- **WHEN** the user changes “led by external partner?” to **Yes**
- **AND** exactly one partner exists in `possibleLeadPartners`
- **AND** `leadPartnerId` is empty
- **THEN** `leadPartnerId` is auto-assigned to that partner

#### Scenario: Two or more partners

- **WHEN** `possibleLeadPartners.length` is greater than 1
- **THEN** the system MUST NOT change `leadPartnerId` automatically

### Requirement: Stale lead cleared when entity removed

When the lead selection no longer exists in the possible list (e.g. lead center deleted from contributing centers), and exactly one possible option remains, the system SHALL auto-assign that remaining option per the center-led or partner-led rules above.

#### Scenario: Lead center removed from contributing list

- **WHEN** the user removes the contributing center that was the lead
- **AND** exactly one contributing center remains
- **AND** `is_lead_by_partner` is false
- **THEN** `leadCenterCode` is auto-assigned to the remaining center

### Requirement: Existing validation and save behavior unchanged

Auto-assignment SHALL NOT change API contracts, save payload structure, or mandatory validation rules introduced by P2-2960. The user MUST still save the section for `is_leading_result` to persist and for backend green-checks to update.

#### Scenario: Save still maps UI to is_leading_result

- **WHEN** the user saves Contributors & Partners after auto-assign
- **THEN** `onSaveSection` sets `is_leading_result` on the entity matching `leadCenterCode` or `leadPartnerId` as today
- **AND** `PATCH_ContributorsPartners` is called with the same shape as before

#### Scenario: P2-2960 validation still applies

- **WHEN** auto-assign has not run (zero or multiple possible leads)
- **THEN** missing lead fields still show mandatory / incomplete feedback per P2-2960
