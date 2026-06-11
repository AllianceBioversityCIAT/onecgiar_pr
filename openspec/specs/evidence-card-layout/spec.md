# evidence-card-layout Specification

## Purpose
TBD - created by archiving change p2-2981-evidence-card-stacked-body. Update Purpose after archive.
## Requirements
### Requirement: Evidence card body stacks items vertically
The evidence card body SHALL display its items (link/file, impact-area tags, description) stacked vertically, each on its own line, with the description occupying the full card width.

#### Scenario: Link sits on its own line above tags and description
- **WHEN** an evidence card with a link, tags and a description is rendered
- **THEN** the link/file appears on the first body line, the tags on a line below it, and the description on its own full-width line below the tags

#### Scenario: Long description uses the full card width
- **WHEN** an evidence has a long description
- **THEN** the description text wraps across the full width of the card (not a narrow right-hand column)

#### Scenario: Card without a description omits the description line
- **WHEN** an evidence has no description
- **THEN** no empty description line is shown

