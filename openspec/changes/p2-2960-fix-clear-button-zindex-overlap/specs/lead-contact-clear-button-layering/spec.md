## ADDED Requirements

### Requirement: Clear button never overlaps the feedback widget

The Lead Contact Person field's clear (`✕`) button SHALL NOT paint over the global fixed feedback ("alerts"/save) widget. The field's clear-button container MUST establish its own stacking context so the button's `z-index` cannot compete in the root stacking context against the fixed widget (`z-index: 5`).

#### Scenario: Clear button region overlaps the feedback widget on screen
- **WHEN** a P25 result's General Information is open with empty mandatory fields (so the floating "N alerts" widget is visible bottom-right), a valid Lead Contact Person is selected (so the clear `✕` button is shown), and the page is scrolled so the field's right edge aligns with the widget region
- **THEN** the feedback widget renders fully on top, and the clear `✕` button does not bleed over the widget's text or arrow
- **AND** `document.elementFromPoint()` at the center of the clear button returns an element belonging to the feedback widget, not the clear button

### Requirement: Clear button remains above its own input

The clear (`✕`) button SHALL remain visually above the Lead Contact Person input it overlays and SHALL stay fully clickable, so confining its stacking context does not regress its primary function.

#### Scenario: User clears the selected contact
- **WHEN** a Lead Contact Person is selected and the user clicks the clear `✕` button
- **THEN** the button is rendered above the input and receives the click
- **AND** the selected contact is cleared
