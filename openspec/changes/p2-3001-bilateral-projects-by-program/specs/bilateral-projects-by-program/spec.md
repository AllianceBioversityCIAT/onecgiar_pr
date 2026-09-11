# Spec: bilateral-projects-by-program

## ADDED Requirements

### Requirement: SP-level option sourcing for 2026+ C&P section
For results in a 2026+ reporting phase (`isContributorsPartners2026()`), the Contributors & Partners "Contributing W3 and/or bilateral projects" dropdown SHALL source its options from `GET bilateral-projects/by-program?programId=<SP official code>` — the complete bilateral list of the submitter's Science Program — instead of the per-ToC-indicator endpoint.

#### Scenario: 2026 result loads the full SP bilateral list
- **WHEN** a 2026-phase result's C&P section loads and the primary initiative official code (e.g. `SP01`) is resolvable
- **THEN** the dropdown options SHALL be the complete bilateral list of that SP (single by-program call, `fullName` set from `project_name`), regardless of which ToC nodes/indicators are mapped

#### Scenario: 2025 result keeps legacy behavior
- **WHEN** a pre-2026-phase result's C&P section loads
- **THEN** the options SHALL be loaded exactly as today: one `bilateral-projects?tocResultId=` call per mapped `toc_result_id`, merged and deduplicated by `project_id`

#### Scenario: programId unresolvable
- **WHEN** a 2026-phase result has no resolvable initiative official code
- **THEN** the options list SHALL remain empty without throwing, and an error SHALL be logged to console

### Requirement: ToC decoupling of the 2026 dropdown
In 2026+ phases the bilateral dropdown SHALL NOT depend on ToC node selection: it SHALL be enabled without a mapped ToC result, and changing the ToC node SHALL NOT clear the user's bilateral selection nor reload the options.

#### Scenario: no ToC node mapped yet
- **WHEN** a 2026-phase result has no ToC result mapped
- **THEN** the dropdown SHALL still load and display the SP bilateral list (no "Please select a TOC result" blocking overlay)

#### Scenario: user changes the ToC node
- **WHEN** the user changes the HLO/Outcome in a 2026-phase result after selecting bilateral projects
- **THEN** the selected bilateral projects SHALL remain selected and the options list SHALL NOT be refetched

### Requirement: SP-level option sourcing for the Report Result popup
The Report Result popup (entity-aow flow) SHALL source the bilateral dropdown options from the by-program endpoint using the route entity code (`entityId()`, e.g. `SP01`) as `programId`, instead of the selected indicator's `toc_result_id`.

#### Scenario: popup opens for an SP indicator
- **WHEN** the user opens the Report Result popup from an AoW indicator of program `SP01`
- **THEN** the dropdown options SHALL be the complete bilateral list of `SP01` and no option SHALL be pre-selected

### Requirement: selection and save contract unchanged
The change SHALL NOT alter the save payloads: the C&P section keeps `bilateral_projects` (array of `project_id`-bearing objects) in the contributors-partners PATCH, and the popup keeps `bilateral_project` in the create POST. User-persisted selections SHALL continue to pre-display on edit in the C&P section.

#### Scenario: previously saved bilaterals on a 2026 result
- **WHEN** a 2026-phase result with saved bilateral projects re-opens the C&P section
- **THEN** the saved projects SHALL show as selected while the options list comes from the by-program endpoint
