## ADDED Requirements

### Requirement: Subtle conceptual group under RFR

The Results Framework Reporting sidebar entry SHALL, when expanded, show a non-interactive group label “Results framework and reporting” above the section action links. The label MUST NOT be a collapsible control and MUST use lighter/muted type at the same indent level as other nested group labels.

#### Scenario: Expanded RFR shows the label

- **WHEN** the user expands Results Framework Reporting in the sidebar (desktop, not icon-collapsed)
- **THEN** they see the muted label “Results framework and reporting” before the section action links

### Requirement: Four section action links

Under that label the sidebar SHALL list four links at the nested menu level: Dashboard; Results planned in your 2026 ToC; Report Emerging results; My CGIAR Centers.

#### Scenario: Navigate to Dashboard

- **WHEN** the user activates Dashboard
- **THEN** the app shows the full current RFR home/dashboard layout (hero, charts, Planned, Emerging, Centers together)

#### Scenario: Navigate to a single section

- **WHEN** the user activates Results planned in your 2026 ToC, Report Emerging results, or My CGIAR Centers
- **THEN** the app shows only that section’s content (same actions/data as in the combined dashboard)

### Requirement: Preserve Science Program selection

Section navigation SHALL preserve the selected Science Program (`sp` query param). Science Program links SHALL continue to appear below the section group and update `sp` without losing the current section view when possible.

#### Scenario: Switch program while on Emerging

- **WHEN** the user is on the Emerging section view and selects another Science Program
- **THEN** they remain on the Emerging section for the newly selected program

### Requirement: Icon-rail access

When the sidebar is collapsed to the icon rail, the RFR hover flyout SHALL expose the four section action links so they remain reachable.

#### Scenario: Collapsed flyout lists sections

- **WHEN** the sidebar is icon-collapsed and the user opens the RFR flyout
- **THEN** the flyout includes the four section links
