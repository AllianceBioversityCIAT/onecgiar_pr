## ADDED Requirements

### Requirement: Centers preload reactively on HLO/Outcome selection

In the 2026 Contributors & Partners section, the Contributing CGIAR Centers reference set (`tocReferenceCenterInstitutionIds`) SHALL recompute immediately when the user selects or changes the HLO/Outcome node in the current ToC tab, without requiring a tab switch.

#### Scenario: Selecting an HLO/Outcome node preloads its centers
- **WHEN** the user selects an HLO/Outcome node (level dropdown) in the active ToC tab and that node carries `toc_partners`
- **THEN** the Contributing CGIAR Centers dropdown preloads the centers derived from that node's `toc_partners` right away, without the user needing to switch tabs

#### Scenario: Changing the selected node updates the centers
- **WHEN** the user changes the selected HLO/Outcome node to a different one within the same tab
- **THEN** the Contributing CGIAR Centers reference set recomputes to reflect the newly selected node

### Requirement: Centers preload reactively on KPI Statement selection

The Contributing CGIAR Centers reference set SHALL recompute immediately when the user selects or changes the KPI Statement/indicator for the selected node, without requiring a tab switch.

#### Scenario: Selecting a KPI Statement adds the indicator's centers
- **WHEN** the user selects a KPI Statement/indicator whose `toc_target_center_ids` is non-empty
- **THEN** the centers referenced by that indicator are unioned into the Contributing CGIAR Centers reference set immediately

### Requirement: Multi-tab union is preserved

Reactive recomputation SHALL preserve the existing union/dedupe contract across all selected ToC nodes and indicators (all tabs), applying no precedence logic on the frontend.

#### Scenario: Second HLO/KPI with centers contributes to the union
- **WHEN** the user has more than one ToC tab with selected nodes/indicators that carry centers, and updates any selection
- **THEN** the Contributing CGIAR Centers reference set reflects the deduplicated union of centers from every selected node and indicator across all tabs, matching the behavior previously only produced by a tab switch
