# Spec: popup-toc-prefill

## ADDED Requirements

### Requirement: Centers preselected from the indicator's ToC node in the Report-result popup
When the user opens the Report-result popup for an indicator whose ToC node maps CGIAR Centers, those centers SHALL be preselected in the main "Contributing CGIAR Centers" dropdown and tagged `from_toc: true`, without the user selecting them manually.

#### Scenario: node with mapped centers preselects them
- **WHEN** the user clicks "Report result" on an indicator whose `targets_by_center.centers` is non-empty
- **THEN** the popup SHALL preselect those centers in the Centers dropdown, each tagged `from_toc: true`

#### Scenario: node without mapped centers preselects nothing
- **WHEN** the indicator's `targets_by_center.centers` is empty
- **THEN** no center SHALL be preselected and the user may add centers only via the "Other(s)" dropdown

### Requirement: "Other(s)" dropdowns for non-ToC Centers and Science Programs
The popup SHALL expose an "Other(s) Contributing CGIAR Centers" dropdown and an "Other(s) Science Program(s)" dropdown, enabled when the user chooses the "Other" option in the main dropdown, offering the entries not derived from the ToC node. Items chosen there SHALL be tagged `from_toc: false`.

#### Scenario: adding a non-ToC center
- **WHEN** the user selects "Other" in the Centers dropdown and picks a center not mapped by the ToC node
- **THEN** that center SHALL be added tagged `from_toc: false`, alongside the ToC-preselected ones

#### Scenario: Other option is not itself persisted
- **WHEN** the create payload is built
- **THEN** the "Other" sentinel option SHALL NOT be sent as a contributing center/SP; only real selections are sent

### Requirement: from_toc tags carried into the create payload for form consistency
When the result is created, the `contributing_center` (and the Science Program contribution list) SHALL include the `from_toc` flag per item, so that on redirect to the Contributors & Partners form the same items appear in the ToC bucket vs the Other bucket with no re-derivation drift.

#### Scenario: preselection persists into the C&P form
- **WHEN** the user creates the result from the popup with ToC-preselected centers and is redirected to the C&P form
- **THEN** those centers SHALL appear in the ToC (preselected) bucket, not re-bucketed as Other

### Requirement: Centers multiselect chip shows a valid count
The Centers multiselect summary chip SHALL display the actual number of selected centers, never the literal text "undefined".

#### Scenario: chip label with selections
- **WHEN** two centers are selected in the popup
- **THEN** the chip summary SHALL read a valid count (e.g. "2 Center(s) selected"), not "Center(s) selected (undefined)"
