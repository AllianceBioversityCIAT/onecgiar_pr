## ADDED Requirements

### Requirement: Alert for empty "Current core innovation use" (Innovation Use)

The Innovation Use form SHALL surface a client-side required-field alert in the section validation counter when the "Current core innovation use in number of users…" field is empty. The field is considered complete when the user has selected "This is yet to be determined" OR has provided at least one actor, organization, or other quantitative measure. This mirrors the completeness rule already used by the equivalent Innovation Development component (`anticipated-innovation-user.checkAlert()`).

#### Scenario: Nothing provided
- **WHEN** the user opens the Innovation Use section and has not selected "This is yet to be determined" and has added no actor, organization, or measure
- **THEN** the save-button alert counter includes an entry for the "Current core innovation use…" field ("… is missing")

#### Scenario: Marked as to be determined
- **WHEN** the user selects "This is yet to be determined"
- **THEN** the alert for this field is cleared

#### Scenario: At least one user entry provided
- **WHEN** the user has added at least one actor, organization, or other quantitative measure
- **THEN** the alert for this field is cleared

### Requirement: Alert for empty "Innovation team diversity" (Innovation Development)

The Innovation Development form SHALL surface a client-side required-field alert when the "Innovation team diversity – Have concrete actions been taken to promote diversity…" question has no option selected.

#### Scenario: No option selected
- **WHEN** the user opens the Innovation Development section and no option is selected in the team-diversity question
- **THEN** the save-button alert counter includes an entry for the team-diversity field ("… is missing")

#### Scenario: An option is selected
- **WHEN** the user selects any option in the team-diversity question
- **THEN** the alert for this field is cleared

### Requirement: Alert for "Evidence of user need/user demand" (Innovation Development) — PENDING QA CONFIRMATION

This requirement is **held pending confirmation from QA (Santi)**. The "Evidence of user need/user demand" section is currently optional and its content does not drive the backend green check; the green check validates the readiness evidence in the general "Evidence" section instead. The expected behavior — whether a required-field alert should be added to this section, and under which condition — MUST be confirmed before implementation.

#### Scenario: Behavior confirmed by QA (placeholder)
- **WHEN** QA confirms the intended required condition for "Evidence of user need/user demand"
- **THEN** this requirement is finalized with a concrete completeness rule and the alert is wired following the same `appFeedbackValidation` pattern
