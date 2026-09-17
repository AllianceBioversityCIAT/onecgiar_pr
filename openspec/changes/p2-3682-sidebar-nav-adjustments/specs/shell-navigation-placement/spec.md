## ADDED Requirements

### Requirement: Extras block holds only Release notes

The sidebar's Extras block SHALL contain exactly one entry, Release notes, linking to `/whats-new`.
Glossary, Tour, Notifications and Text size SHALL NOT be rendered in the sidebar.

#### Scenario: A reporter opens the expanded sidebar
- **WHEN** the sidebar is rendered expanded
- **THEN** the Extras block shows one menu item labelled "Release notes"
- **AND** no element in the sidebar carries the labels "Glossary", "Tour", "Notifications" or "Text size"

#### Scenario: The sidebar no longer navigates to notifications
- **WHEN** the sidebar component is inspected for a notifications entry point
- **THEN** it exposes no method that routes to `result/results-outlet/results-notifications/requests`
- **AND** it renders no unread-notification badge

### Requirement: Notifications is reachable only from the topbar

Notifications SHALL be reachable from the topbar bell and from nowhere else in the app shell. The
bell SHALL keep its unread badge and its "See all the notifications" link.

#### Scenario: A reporter with unread notifications loads any page
- **WHEN** the shell renders with unread notifications
- **THEN** the topbar bell shows the unread count
- **AND** choosing "See all the notifications" routes to the notifications requests page

### Requirement: Text size is reached through Settings in the user-profile menu

The topbar user menu SHALL offer a Settings entry. Choosing it SHALL close the user menu and open a
Settings panel containing the text-size control. The control SHALL keep the five sizes and the
"Reset to default" action, and SHALL keep writing through `FontScaleService`.

#### Scenario: A reporter changes the text size
- **WHEN** they open the user menu, choose Settings, and pick a size
- **THEN** `FontScaleService` receives that size
- **AND** the platform text scales as it did when the control lived in the sidebar

#### Scenario: Settings replaces the user menu rather than nesting inside it
- **WHEN** Settings is chosen from the user menu
- **THEN** the user menu closes
- **AND** the Settings panel opens anchored to the same avatar trigger

#### Scenario: Reset is offered only when a non-default size is active
- **WHEN** the active scale is the default one
- **THEN** the Settings panel shows no "Reset to default" action

### Requirement: Glossary and Tour live in the Support menu

The topbar Support menu SHALL offer Glossary, opening the CLARISA glossary in a new tab, and Tour,
starting the sidebar tour. Starting the tour from the topbar SHALL produce the same steps as before.

#### Scenario: A reporter looks for the glossary
- **WHEN** they open the Support menu
- **THEN** it offers "Glossary" pointing at the CLARISA glossary URL with `target="_blank"` and `rel="noopener noreferrer"`

#### Scenario: A reporter starts the tour from Support
- **WHEN** they choose "Tour" in the Support menu
- **THEN** `ReportingGuideService.startSidebarTour` is called with whether they have own programmes, other programmes and centres
- **AND** the tour highlights the sidebar as it did when the trigger lived there
