## ADDED Requirements

### Requirement: Static repeated-indicator banner on the AoW page

The TOC Area of Work (AoW) page SHALL display a fixed, always-visible informational banner that explains why an indicator may appear repeated, positioned directly below the High-Level Outputs / Outcomes tabs and above the indicators content card. The banner SHALL be shown regardless of the active tab and regardless of whether any indicator is actually repeated.

#### Scenario: Banner is visible on the High-Level Outputs tab

- **WHEN** a user opens the AoW page with the "High-Level Outputs" tab active
- **THEN** the banner is rendered immediately below the two tab buttons and above the "High-Level Outputs Indicators" content card

#### Scenario: Banner is visible on the Outcomes tab

- **WHEN** the user switches to the "Outcomes" tab
- **THEN** the same banner remains visible in the same position (it is not tied to a specific tab)

#### Scenario: Banner is always shown

- **WHEN** the AoW page loads, even if no indicator name is repeated
- **THEN** the banner is still displayed (it is static, not conditional on the indicators data)

### Requirement: Banner message content

The banner SHALL display the exact message text agreed with the reporter:
"When the same indicator is repeated twice in a HLO/Outcome, this is because the P/A planned the indicator with two separate targets to facilitate granular planning. Reporting reflects data originally recorded without aggregating them."

#### Scenario: Message wording

- **WHEN** the banner is rendered
- **THEN** it contains the full message including the phrase "in a HLO/Outcome" after "repeated twice"

### Requirement: Banner visual style

The banner SHALL use the project's yellow design tokens (soft-yellow warning style) with a warning icon, consistent with the approved design. It SHALL NOT introduce new hex color literals in feature SCSS.

#### Scenario: Styling uses project tokens

- **WHEN** the banner is styled
- **THEN** its background, border, icon and text colors derive from `--pr-color-yellow-*` tokens defined in `src/styles/colors.scss`
