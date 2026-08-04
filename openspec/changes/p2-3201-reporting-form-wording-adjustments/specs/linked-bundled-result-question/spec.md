## ADDED Requirements

### Requirement: One unified wording for the linked/bundled question

The question asking whether a result is linked to or bundled with another reported result SHALL use a single wording for every indicator category except `Policy change`.

#### Scenario: Non-policy result types share the unified wording

- **WHEN** a user opens Section 2 for a result whose indicator category is anything other than `Policy change`
- **THEN** the question reads `Is this result linked to, or (for innovations) bundled with, another reported result?`

#### Scenario: The previous innovation-specific wording is gone

- **WHEN** a user opens Section 2 for an Innovation use or Innovation development result
- **THEN** the question `Is this innovation linked or bundled with another CGIAR-reported result (such as another innovation or a different type of result)?` is no longer shown
- **AND** the unified wording is shown instead

### Requirement: Policy change has its own variant of the question

For results whose indicator category is `Policy change`, the question SHALL be rendered with a dedicated wording, conditionally by indicator category.

#### Scenario: Policy change shows its own question

- **WHEN** a user opens Section 2 for a `Policy change` result
- **THEN** the question reads `Have other reported results contributed to this policy change? Such as knowledge product, capacity sharing for development, innovation development, innovation use?`

#### Scenario: The policy variant does not leak to other categories

- **WHEN** a user opens Section 2 for a result of any category other than `Policy change`
- **THEN** the policy-change wording is not shown

### Requirement: The question exists in Section 2 only

The linked/bundled question SHALL be asked once, in Section 2. It MUST NOT be duplicated in Section 4.

#### Scenario: Section 4 does not ask the question

- **WHEN** a user opens Section 4 of a result
- **THEN** no linked/bundled question is rendered there
- **AND** the answer given in Section 2 is not overwritten on save
