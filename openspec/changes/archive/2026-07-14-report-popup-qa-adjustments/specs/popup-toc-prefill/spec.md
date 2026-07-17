# Spec: popup-toc-prefill (delta — QA adjustments P2-3114 / P2-2998)

> Base requirements introduced by pending change `p2-3114-popup-toc-prefill-centers-sp` (not yet archived). This delta widens the Centers preselection source and adds the P2-2998 AC4 / parity notes to the popup.

## MODIFIED Requirements

### Requirement: Centers preselected from the indicator's ToC node in the Report-result popup
When the user opens the Report-result popup for an indicator whose ToC node maps CGIAR Centers, those centers SHALL be preselected in the main "Contributing CGIAR Centers" dropdown and tagged `from_toc: true`, without the user selecting them manually. The reference set SHALL be the deduplicated union of: (a) the CGIAR Centers among the node's HLO/Outcome-level ToC Partners (`toc_partner_institution_ids`, matched against CLARISA centers by `institutionId`), and (b) the centers mapped in the KPI Targets (`targets_by_center.centers`, matched by `acronym`). Partners that are not CGIAR Centers SHALL NOT be preselected or displayed as a separate list.

#### Scenario: node with mapped centers preselects them
- **WHEN** the user clicks "Report result" on an indicator whose `targets_by_center.centers` is non-empty
- **THEN** the popup SHALL preselect those centers in the Centers dropdown, each tagged `from_toc: true`

#### Scenario: HLO-level ToC Partners that are CGIAR Centers are preselected
- **WHEN** the selected node carries `toc_partner_institution_ids` matching CLARISA centers (e.g. SP01 Steer to Impact with Alliance, IFPRI, CIMMYT, IITA as partners)
- **THEN** those centers SHALL be preselected in the Centers dropdown tagged `from_toc: true`, unioned with the Targets-derived centers

#### Scenario: union is deduplicated
- **WHEN** a center appears both as an HLO-level partner and in `targets_by_center.centers`
- **THEN** it SHALL appear exactly once in the preselection

#### Scenario: payload without the partners field degrades gracefully
- **WHEN** the AoW payload does not include `toc_partner_institution_ids`
- **THEN** the preselection SHALL fall back to the Targets-derived centers only, with no error

#### Scenario: node without mapped centers preselects nothing
- **WHEN** the indicator's `targets_by_center.centers` is empty and the node has no partner-derived centers
- **THEN** no center SHALL be preselected and the user may add centers only via the "Other(s)" dropdown

## ADDED Requirements

### Requirement: Empty-state notes in the Report-result popup (P2-2998 AC4)
When the ToC yields no reference entries for a popup dropdown, the popup SHALL display the corresponding empty-state note: `No CGIAR Centers related to the established HLO/Outcomes were found` for Centers, and `No Science Programs related to the established HLO/Outcomes were found` for Science Programs — using the exact strings shown in the Contributors & Partners section. The corresponding "Other(s)" dropdown SHALL be visible and active in this state (existing behavior, preserved).

#### Scenario: no ToC Science Programs shows the orange note
- **WHEN** the popup opens for a node with no ToC-derived Science Programs
- **THEN** the note "No Science Programs related to the established HLO/Outcomes were found" SHALL be displayed under the "Contributing Science Programs/Accelerators" header, and the "Other(s) Science Program(s)/Accelerator(s)" dropdown SHALL be visible and active

#### Scenario: no ToC Centers shows the orange note
- **WHEN** the popup opens for a node with no ToC-derived CGIAR Centers (neither partners nor targets)
- **THEN** the note "No CGIAR Centers related to the established HLO/Outcomes were found" SHALL be displayed under the "Contributing CGIAR Centers" header, and the "Other(s) Contributing CGIAR Centers" dropdown SHALL be visible and active

### Requirement: ToC parity info notes in the Report-result popup
When ToC-derived options exist, the popup SHALL display the informational note above the corresponding dropdown. For Centers: "The CGIAR Centers listed below were identified in your 2026 ToC. To select a different Center, choose 'Other' from the drop-down menu and then make your selection from the options that appear." For Science Programs: "The Science Programs listed below were identified in your 2026 ToC. To select a different Science Program, choose 'Other' from the drop-down menu and then make your selection from the options that appear."

#### Scenario: ToC Centers exist shows the info note
- **WHEN** the popup opens for a node with ToC-derived Centers
- **THEN** the blue informational note SHALL be displayed above the "Contributing CGIAR Centers" dropdown

#### Scenario: ToC Science Programs exist shows the info note
- **WHEN** the popup opens for a node with ToC-derived Science Programs
- **THEN** the blue informational note SHALL be displayed above the "Contributing Science Programs/Accelerators" dropdown

### Requirement: Info note wording unified across popup and C&P section (QA 2026-07-14)
The Centers and Science Programs informational notes SHALL use identical wording in the Report-result popup and in the Contributors & Partners section. The C&P Science Programs note SHALL be updated from "The Programs/Accelerators listed below… contributing Program/Accelerator…" to the unified wording "The Science Programs listed below were identified in your 2026 ToC. To select a different Science Program, choose 'Other' from the drop-down menu and then make your selection from the options that appear." (The C&P Centers note already matches.)

#### Scenario: C&P Science Programs note uses the unified wording
- **WHEN** the C&P section renders the Science Programs info note (2026 phase, ToC-derived SPs exist)
- **THEN** the note SHALL read "The Science Programs listed below were identified in your 2026 ToC. To select a different Science Program, choose 'Other' from the drop-down menu and then make your selection from the options that appear."

### Requirement: Science Programs empty state renders as separated fields
In the Science Programs empty state, the "Contributing Science Programs/Accelerators" block and the "Other(s) Science Program(s)/Accelerator(s)" block SHALL be visually separated (the empty-state note and/or spacing between them); the two headers SHALL NOT render adjacent with no content between them.

#### Scenario: headers are not stuck together
- **WHEN** the popup opens for a node with no ToC-derived Science Programs
- **THEN** the "Contributing Science Programs/Accelerators" header SHALL be followed by its empty-state note before the "Other(s)" block begins
