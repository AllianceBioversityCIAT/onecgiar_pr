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

### Requirement: Text size is one click away on the topbar

Text size SHALL have its own topbar button, next to the notifications bell, opening the text-size
panel directly. It SHALL NOT be placed behind a Settings entry in the account menu: it is an
accessibility control, and the person who needs it is the one least able to hunt for it. The control
SHALL keep the five sizes and the "Reset to default" action, and SHALL keep writing through
`FontScaleService`.

#### Scenario: A reporter changes the text size
- **WHEN** they click the text-size button on the topbar and pick a size
- **THEN** `FontScaleService` receives that size
- **AND** the platform text scales as it did when the control lived in the sidebar

#### Scenario: No Settings entry is introduced
- **WHEN** the account menu is opened
- **THEN** it shows no Settings entry
- **AND** the only preference the requirement named for it, text size, is reachable from the topbar

#### Scenario: Reset is offered only when a non-default size is active
- **WHEN** the active scale is the default one
- **THEN** the panel shows no "Reset to default" action

### Requirement: Glossary and Tour live in the Help menu

The topbar menu that holds the support chat SHALL be labelled **Help**, and SHALL group its entries
under two labels: *Get help* (support chat, feedback) and *Learn* (glossary, tour). It SHALL offer
Glossary, opening the CLARISA glossary in a new tab, and Tour, starting the sidebar tour. Starting
the tour from the topbar SHALL produce the same steps as before.

#### Scenario: The menu says what it holds
- **WHEN** the topbar is rendered
- **THEN** the button reads "Help", not "Support"
- **AND** its panel shows the *Get help* group before the *Learn* group

#### Scenario: A reporter looks for the glossary
- **WHEN** they open the Help menu
- **THEN** it offers "Glossary" pointing at the CLARISA glossary URL with `target="_blank"` and `rel="noopener noreferrer"`

#### Scenario: A reporter starts the tour from Help
- **WHEN** they choose "Tour" in the Help menu
- **THEN** `ReportingGuideService.startSidebarTour` is called with whether they have own programmes, other programmes and centres
- **AND** the tour highlights the sidebar as it did when the trigger lived there
