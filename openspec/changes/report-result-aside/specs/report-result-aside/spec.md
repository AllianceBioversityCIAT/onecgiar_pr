## ADDED Requirements

### Requirement: Reporting a result opens a side panel
Activating `Report` on an indicator row of the Reporting table SHALL open a side panel (aside) for creating the result, instead of the legacy centered modal. The panel SHALL carry the reporting context of the row without the user re-entering it.

#### Scenario: Report opens the aside
- **WHEN** a user with reporting permission activates `Report` on an indicator row
- **THEN** the side panel SHALL open showing the science program, area of work, ToC node title, indicator name, indicator type, unit of measurement and target of that row

#### Scenario: Reporting is not permitted
- **WHEN** the user has no reporting permission for the program, or the phase is closed
- **THEN** the panel SHALL NOT offer any affordance to create the result

#### Scenario: Closing with unsaved input
- **WHEN** the user has entered data and closes the panel with Escape or the close control
- **THEN** a confirmation SHALL be required before discarding, and choosing to keep editing SHALL preserve everything entered

#### Scenario: Other entry points are unchanged
- **WHEN** a user reaches result creation from any entry point other than the Reporting table `Report` button
- **THEN** the legacy modal SHALL continue to be used, with unchanged behaviour

### Requirement: Knowledge product results are reported from a repository link
When the indicator's category is Knowledge product, the panel SHALL require a repository link and SHALL take the title from the repository rather than from free text.

#### Scenario: Successful retrieval
- **WHEN** the user enters a valid repository link and requests synchronisation
- **THEN** the title SHALL be filled from the repository, SHALL become non-editable, and the result SHALL become creatable

#### Scenario: Creation blocked before retrieval
- **WHEN** the category is Knowledge product and no successful retrieval has happened
- **THEN** the result SHALL NOT be creatable, even if a title is present

#### Scenario: Link outside the supported repositories
- **WHEN** the entered link is malformed or points to a repository that is not supported
- **THEN** a message SHALL state which case applies, and any previously retrieved title SHALL be cleared

### Requirement: Non-knowledge-product results need only a title
For every indicator category other than Knowledge product, the panel SHALL require nothing beyond a result title.

#### Scenario: Simplest creation path
- **WHEN** the indicator's category is Innovation development, Capacity sharing for development, Innovation use, Policy change, Other outcome or Other output
- **THEN** the title SHALL be freely editable, no repository link SHALL be requested, and entering a title SHALL be sufficient to create the result

### Requirement: Indicators without a category ask the user for one
When the indicator does not carry a category, the panel SHALL ask the user to choose one from the categories valid for that indicator's level, and SHALL NOT allow creation until one is chosen.

#### Scenario: Category chooser is always offered
- **WHEN** the indicator carries no category
- **THEN** the category chooser SHALL be presented — including when the panel is opened before the category catalogue has finished loading, and when the page has been loaded directly into Reporting

#### Scenario: Choosing Knowledge product transforms the form
- **WHEN** the user chooses Knowledge product in that chooser
- **THEN** the repository link and its synchronisation SHALL appear, and the title SHALL become repository-driven, without reopening the panel

#### Scenario: Moving away from Knowledge product
- **WHEN** the user has retrieved knowledge-product metadata and then changes the category to another one
- **THEN** the retrieved metadata SHALL be discarded so it is not submitted with a result of a different category

#### Scenario: Category cannot be determined
- **WHEN** no category list can be resolved for the indicator's level
- **THEN** the panel SHALL state that the category cannot be determined instead of presenting an empty or read-only category

### Requirement: Contributing centers and science programs are preserved exactly
The panel SHALL pre-select the centers and science programs derived from the Theory of Change, SHALL allow adding others, and SHALL submit each with its origin preserved.

#### Scenario: Adding to a pre-selected list
- **WHEN** the panel has pre-selected entries and the user selects an additional one
- **THEN** the previously selected entries SHALL remain selected and the new one SHALL be added

#### Scenario: Selection is visible
- **WHEN** the user has selected one or more centers or science programs
- **THEN** what has been selected SHALL be discernible without reopening the list

#### Scenario: Adding entries outside the Theory of Change
- **WHEN** the user chooses to contribute centers or science programs beyond those in the Theory of Change
- **THEN** that additional selection SHALL be reachable regardless of whether the Theory of Change already pre-selected entries

#### Scenario: Submitted data matches the legacy modal
- **WHEN** the result is created from the panel
- **THEN** the submitted data SHALL be equivalent to what the legacy modal submits for the same indicator and the same user input — including the origin flag distinguishing Theory-of-Change entries from added ones, and excluding the internal placeholder entries used to reveal the additional selectors and the presentation-only fields of the table row

### Requirement: Results already reported against the indicator are visible
The panel SHALL show the results already reported against the indicator while the user is filling the form, so duplicates can be recognised before creating one.

#### Scenario: Indicator with existing results
- **WHEN** the indicator already has reported results
- **THEN** they SHALL be listed in the panel

#### Scenario: Indicator with no existing results
- **WHEN** the indicator has none
- **THEN** an explicit empty state SHALL be shown rather than an error or a blank area

### Requirement: Browsing repositories is presented but unavailable
The panel SHALL present the two entry modes shown in the design — browsing connected repositories and manual entry — with browsing disabled while no repository search capability exists.

#### Scenario: Browsing is visible and disabled
- **WHEN** the user opens the panel for a Knowledge product indicator
- **THEN** the browse option SHALL be shown in its place, visibly disabled and marked as not yet available, and manual entry SHALL be the active mode

#### Scenario: Manual entry remains fully functional
- **WHEN** browsing is unavailable
- **THEN** the user SHALL still be able to report the knowledge product by entering its repository link
