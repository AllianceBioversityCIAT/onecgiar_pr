## ADDED Requirements

### Requirement: Consistent empty-state note styling

In the P25 Contributors & Partners section, every "no items related to the established HLO/Outcomes were found" empty-state note (CGIAR Centers, Science Programs/Accelerators, and External Partners) SHALL render with the same visual treatment: the shared message box with an info icon, peach background, rounded corners, and consistent padding/spacing.

#### Scenario: External Partners empty-state matches its siblings
- **WHEN** the ToC returns no External Partners and the empty-state note is shown
- **THEN** the note renders inside the peach `.pr-message` box with the info icon aligned, identical to the Centers and Science Programs empty-state notes
- **AND** it is not shown as a bare icon with unstyled text
