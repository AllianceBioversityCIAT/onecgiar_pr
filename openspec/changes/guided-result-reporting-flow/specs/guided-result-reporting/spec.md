## ADDED Requirements

### Requirement: Single guided entry to report a result
The Science Program overview SHALL present one primary action to report a result instead of two parallel, undifferentiated card columns. Activating it SHALL open a decision step that explains, in persistent plain-language text (not hover-only), the two reporting paths.

#### Scenario: User opens the reporting entry
- **WHEN** a user with reporting permission opens a Science Program overview and activates "Report a result"
- **THEN** a decision step SHALL appear offering two visually distinct choices — "Planned in ToC" and "Emerging" — each with a one-line description and a concrete example visible without hovering

#### Scenario: Reporting is not permitted
- **WHEN** the current phase is closed or the user is not a member of the program's initiative
- **THEN** the entry SHALL be shown in a disabled state with a short explanation of why reporting is unavailable, rather than being hidden with no reason

### Requirement: Planned-vs-emerging decision helper
The decision step SHALL let a user who is unsure determine the correct path via a short guided check, and SHALL route them to the corresponding path without losing their choice.

#### Scenario: User is unsure which path to use
- **WHEN** the user selects "Not sure?"
- **THEN** the system SHALL ask whether they can name the indicator/HLO the result contributes to, and SHALL recommend "Planned" when they can and "Emerging" when they cannot

#### Scenario: Choosing a path proceeds without re-asking
- **WHEN** the user confirms "Planned" or "Emerging"
- **THEN** the system SHALL continue into that path (indicator selection for Planned, the emerging stepper for Emerging) carrying the chosen context forward

### Requirement: Guided emerging-result stepper
The emerging-result creation SHALL be presented as a stepper with one primary decision per step — Level, Category, Search-before-create, Title — with a visible progress indicator and the ability to navigate back, reusing the existing result-creation and dedup logic internally.

#### Scenario: Progressing through the stepper
- **WHEN** the user creates an emerging result
- **THEN** each step SHALL show only its own decision, indicate current position and remaining steps, and allow returning to a previous step without losing entered data

#### Scenario: Subtle motion respects reduced-motion
- **WHEN** step transitions animate
- **THEN** the animation SHALL be subtle and SHALL be disabled when the user's system requests reduced motion

### Requirement: Pre-selected category is explicit and not silently editable
When a category is pre-selected because the user entered from a specific category, the stepper SHALL display it as a locked, labeled choice with an explicit affordance to change it, and SHALL never discard the chosen category without user-visible action.

#### Scenario: Category arrives pre-selected
- **WHEN** the user enters the stepper from a specific indicator category
- **THEN** the category step SHALL show "Reporting under: {category}" as a locked chip with an explicit "Change category" control, rather than an open radio that can be changed with no indication anything was pre-chosen

#### Scenario: Changing the level does not wipe the category silently
- **WHEN** the user changes the Output/Outcome level after a category was pre-selected
- **THEN** the system SHALL NOT clear the selected category without feedback; if the level change makes the category invalid, the system SHALL tell the user and require an explicit re-selection

### Requirement: Search before create prevents duplicates
Before creating a new result, the stepper SHALL surface existing similar results as a first-class step and offer explicit outcomes, using the existing similarity/dedup search, and SHALL never trap the user when a match is a false positive.

#### Scenario: Similar results exist
- **WHEN** the user's title/keywords match existing results
- **THEN** the step SHALL list the matching results (title, owner, status) with actions to open an existing result, contribute to it, or create a new one

#### Scenario: Exact-match false positive does not hard-block
- **WHEN** an exact-title match is detected but the user confirms their result is genuinely different
- **THEN** the system SHALL provide a "Use anyway" escape that allows creation to proceed instead of permanently disabling save

#### Scenario: No similar results
- **WHEN** the search returns no matches
- **THEN** the step SHALL show a clear empty state and allow the user to continue to create a new result

### Requirement: Guided creation opens full-screen from the reporting home
The reporting home SHALL offer a single `Guided creation` action, and activating it SHALL open a full-screen surface on a neutral background that presents one step at a time, sliding horizontally between steps. The home SHALL NOT offer a separate `Planned` create button, because that path is already available once an Area of Work is open.

#### Scenario: User starts a guided creation from the home
- **WHEN** a user activates `Guided creation` on the reporting home
- **THEN** a full-screen guided surface SHALL replace the page content, showing only the current step and a way to leave the flow

#### Scenario: Emerging entry stays close to its category
- **WHEN** the user is looking at the indicator-category list on the home
- **THEN** an `Emerging` action SHALL be available from that list so a result can be started under a known category, entering the same guided flow with that category pre-selected

#### Scenario: Motion respects reduced-motion
- **WHEN** the surface transitions between steps
- **THEN** the horizontal slide SHALL be disabled when the user's system requests reduced motion

### Requirement: The flow asks for Science Program and Area of Work
Because the flow can start with no program context, the stepper SHALL ask which Science Program and which Area of Work the result belongs to before asking for an indicator or category, and SHALL NOT silently assume either from ambient state.

#### Scenario: Program is asked, not assumed
- **WHEN** the user reaches the Science Program step
- **THEN** the system SHALL present the user's programs for explicit selection; a program already selected elsewhere in the interface MAY be highlighted as a suggestion but SHALL NOT be applied without the user confirming it

#### Scenario: Areas of work follow the chosen program
- **WHEN** the user has chosen a Science Program
- **THEN** the next step SHALL present the Areas of Work belonging to that program

### Requirement: Earlier answers remain revisable without restarting
Every step after the first SHALL display a compact summary of the answers already given, and the user SHALL be able to return to any of them and change it without losing the remaining answers or restarting the flow.

#### Scenario: User corrects the Science Program mid-flow
- **WHEN** the user notices at a later step that the wrong Science Program was chosen and activates that summary entry
- **THEN** the system SHALL return to the Science Program step with the other answers preserved

#### Scenario: An upstream change invalidates a later answer
- **WHEN** changing an earlier answer makes a later one invalid, such as an Area of Work that does not belong to the newly chosen Science Program
- **THEN** the system SHALL clear only the invalidated answers and SHALL tell the user what was cleared and why, rather than dropping them silently

### Requirement: The guided flow ends at creation and hands off
The guided flow SHALL conclude by creating the result and taking the user to the result's detail page to complete the remaining sections; it SHALL NOT re-implement the full result form.

#### Scenario: Result is created
- **WHEN** the user completes the final step of the guided flow
- **THEN** the system SHALL create the result and navigate to its detail page with the reporting phase preserved, so the user continues in the existing editing experience
