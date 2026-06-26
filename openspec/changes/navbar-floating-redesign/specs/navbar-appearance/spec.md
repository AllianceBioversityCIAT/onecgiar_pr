## ADDED Requirements

### Requirement: Navigation bar is a floating fixed bar

The top navigation bar SHALL render as a fixed, inset floating bar with rounded corners, and page content SHALL NOT slide underneath it.

#### Scenario: Bar floats and content is offset

- **WHEN** an authenticated page renders the header
- **THEN** the bar is `position: fixed` with an inset margin on all sides and rounded corners, and a spacer reserves the equivalent vertical space so the page content starts below the bar

#### Scenario: QA full-screen reserves no space

- **WHEN** `show_qa_full_screen` is active
- **THEN** neither the bar nor its spacer render, leaving no empty gap at the top

### Requirement: Bar hides on scroll down and reveals on scroll up

The bar SHALL slide out of view when the user scrolls the window down past a small reveal zone, and slide back when scrolling up.

#### Scenario: Hide on scroll down

- **WHEN** the window is scrolled down beyond the reveal zone
- **THEN** the bar animates out of view (translated upward)

#### Scenario: Reveal on scroll up / near top

- **WHEN** the user scrolls up, or is within the reveal zone near the top
- **THEN** the bar is shown

#### Scenario: Known limitation — internal scroll containers

- **WHEN** the active route scrolls inside its own `overflow-y:auto` container instead of the window
- **THEN** the bar remains visible (it does not auto-hide), which is the safe default

### Requirement: Active section is indicated by a recessed box

The currently active nav section SHALL be marked by a darker recessed box behind its label (same bar color family, darker, with shadow), not by an underline.

#### Scenario: Active section styling

- **WHEN** a nav route is active
- **THEN** its item shows white bold text over a darker rounded box with an inset shadow; other items are lighter and brighten on hover

### Requirement: User and logo are presented as chips

The logo SHALL appear in a circular chip and the user trigger SHALL appear as a rounded pill, both legible against the dark bar.

#### Scenario: Logo and user chips

- **WHEN** the bar renders for an authenticated user
- **THEN** the logo is a white circular chip and the user trigger is a white rounded pill (avatar + name + email + chevron) with dark text, and the user popover opens aligned to the bar's right edge without overflowing

### Requirement: Test-environment ribbon does not cover the bar

The TEST/STAGING ribbon SHALL NOT overlap the floating bar.

#### Scenario: Ribbon below the bar

- **WHEN** running in a non-production environment that shows the ribbon
- **THEN** the ribbon is positioned below the floating bar and does not cover the logo chip
