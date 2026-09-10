## ADDED Requirements

### Requirement: Reporting section title reflects ToC-linked language

The reporting entity-details view SHALL display the results card header as "Report Results Linked to Program's {year} ToC", where `{year}` is the active reporting-phase year resolved dynamically (not hardcoded).

#### Scenario: Header shows the ToC-linked wording with the dynamic year
- **WHEN** a user opens the reporting entity-details view during the 2026 reporting phase
- **THEN** the results card header reads "Report Results Linked to Program's 2026 ToC"
- **AND** the year segment is produced by the reporting-phase-year source, so a future phase renders that phase's year without a code change

### Requirement: Report-result pop-up omits the TOC-pathway explanation field

The "Report result" pop-up SHALL NOT display the "Explanation of how the result aligns with/contributes to the Program's TOC pathway" field (its label, info helper, and textarea). Removing it from view SHALL NOT change the create-result payload contract.

#### Scenario: Field is absent from the pop-up
- **WHEN** a user opens the "Report result" pop-up for any indicator category
- **THEN** the "Explanation of how the result aligns with/contributes to the Program's TOC pathway" label, info helper, and textarea are not rendered
- **AND** no orphaned separator/divider remains where the block used to be

#### Scenario: Saving still succeeds
- **WHEN** the user completes and saves a result from the pop-up
- **THEN** the request succeeds and the TOC-narrative property is sent as an empty string (the field is optional)

### Requirement: ToC info note omits the redundant plural "indicators"

The Contributors & Partners ToC question info note (2026 phase) SHALL NOT contain the redundant plural word "indicators" that duplicates the meaning of "KPI". Singular "indicator" references in the same note remain.

#### Scenario: 2026 info note no longer says "KPI/indicators"
- **WHEN** the 2026 ToC question info note is displayed in Contributors & Partners
- **THEN** the phrase reads "…being reported outside the 2026 TOC KPI." (the "/indicators" fragment removed)
- **AND** the "KPI and indicator" and "indicator target" singular references are unchanged

#### Scenario: 2025 note is untouched
- **WHEN** the legacy (2025) info note is displayed
- **THEN** its wording is unchanged by this requirement

### Requirement: Tab completion status requires contribution-to-target when it is mandatory

When the "contribution to target" field is shown and mandatory (2026 phase with a KPI indicator selected on the tab), the tab completeness status SHALL NOT be marked complete (green) while that field is empty. Where the field is not shown (other reuse contexts), the existing completion behavior SHALL be preserved.

#### Scenario: Empty contribution keeps the tab not-green
- **WHEN** a 2026 result tab has a KPI indicator selected but the "contribution to target" field is empty
- **THEN** the tab's completion icon renders as not-complete (not green)

#### Scenario: Filled contribution allows the tab to be green
- **WHEN** the same tab has a non-empty "contribution to target" value and the other completion conditions are met
- **THEN** the tab's completion icon renders as complete (green)

#### Scenario: Reuse contexts without the field are not regressed
- **WHEN** the completeness validator runs in a context where the contribution-to-target field is not shown (IPSR, bilateral, 2025, share-request, or no indicator selected)
- **THEN** the tab's completion status is determined by the pre-existing rules and does not become permanently not-green

### Requirement: ToC question uses KPI-centric wording without changing branching logic

In the Contributors & Partners section (2026 phase), the ToC mapping question SHALL read "Can this result be mapped to a ToC KPI?". This is a copy change only: the Yes/No planned/unplanned branching and all dependent fields and data fetches SHALL remain unchanged.

#### Scenario: 2026 question shows the new wording
- **WHEN** the 2026 Contributors & Partners ToC question is displayed
- **THEN** its label reads "Can this result be mapped to a ToC KPI?"

#### Scenario: Branching behavior is unchanged
- **WHEN** the user selects Yes or No on that question
- **THEN** the existing behavior (planned/unplanned fields, financial-resources radio, justification, ToC-levels fetch) works exactly as before the copy change

### Requirement: External Partners area shows a ToC-inheritance info banner

In the Contributors & Partners External Partners area (2026 phase), an info alert SHALL be displayed reading "Partner information is inherited/sourced from the HLO/Outcome level in the ToC." It SHALL appear only in the P25 Contributors & Partners view, not in shared reuse contexts (e.g. IPSR).

#### Scenario: Banner is shown in P25 2026
- **WHEN** a user views the External Partners area in Contributors & Partners during the 2026 phase
- **THEN** an info alert with the text "Partner information is inherited/sourced from the HLO/Outcome level in the ToC." is displayed

#### Scenario: Banner is not shown outside P25 2026
- **WHEN** the shared partner selector is rendered in another context (IPSR) or in the 2025 phase
- **THEN** the ToC-inheritance banner is not displayed there
