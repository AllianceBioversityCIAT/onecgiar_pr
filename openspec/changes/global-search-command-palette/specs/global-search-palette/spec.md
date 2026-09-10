# global-search-palette

## ADDED Requirements

### Requirement: Opening and closing the palette
The application SHALL provide a single global command palette, opened from the topbar Search control
or by the `Cmd/Ctrl+K` shortcut, rendered as a centred modal overlay above a dimmed page.

#### Scenario: Opening from the topbar control
- **WHEN** the user clicks the topbar Search control
- **THEN** the palette opens as a centred modal overlay over a dimmed page
- **AND** the search input receives focus
- **AND** the search input is empty

#### Scenario: Opening with the keyboard shortcut
- **WHEN** the user presses `Cmd+K` (macOS) or `Ctrl+K` (Windows/Linux) anywhere in the application
- **THEN** the palette opens and the search input receives focus
- **AND** the browser's own default action for that key combination does not occur

#### Scenario: The shortcut is ignored while typing in a field
- **WHEN** the user presses `Cmd/Ctrl+K` while the focused element is an `input`, `textarea`,
  `select` or a contenteditable element
- **THEN** the palette does NOT open and the keystroke reaches the focused field unchanged

#### Scenario: Toggling closed with the same shortcut
- **WHEN** the palette is open and the user presses `Cmd/Ctrl+K` again
- **THEN** the palette closes

#### Scenario: Closing with Escape
- **WHEN** the palette is open and the user presses `Escape`
- **THEN** the palette closes
- **AND** focus returns to the topbar Search control that opened it

#### Scenario: Closing by clicking the dimmed backdrop
- **WHEN** the palette is open and the user clicks outside the panel
- **THEN** the palette closes and focus returns to the topbar Search control

#### Scenario: The shortcut does not collide with the sidebar toggle
- **WHEN** the user presses `Cmd/Ctrl+B`
- **THEN** the sidebar toggles as it does today and the palette does NOT open

#### Scenario: The topbar control no longer filters the results list
- **WHEN** the user types into the topbar area without opening the palette
- **THEN** no text is written to the Results Center list filter
- **AND** the topbar control is a button, not a text field

### Requirement: Results group
The palette SHALL search results by title across programmes using the existing results endpoint's
`title` filter, and SHALL render each match as the programme code chip, the result title, and the
result's status pill.

#### Scenario: Searching returns matching results
- **WHEN** the user types at least 2 characters into the search input
- **THEN** after a 250 ms pause a request is issued to the results endpoint with the typed text as
  the `title` filter and a limit of 5
- **AND** each returned row renders its programme code (for example `SP01`) as a monospace chip, its
  title, and its status as a pill
- **AND** the group is headed `RESULTS (n)` where `n` is the number of rows displayed

#### Scenario: A long result title is truncated
- **WHEN** a returned result's title is wider than the row
- **THEN** the title is truncated with a trailing ellipsis and the row does not wrap or grow

#### Scenario: The status pill uses the fixed token pair for its status
- **WHEN** a result's status is `Editing`
- **THEN** the pill's foreground and background come from the `--pr-status-in-progress-fg` /
  `--pr-status-in-progress-bg` pair
- **AND** no foreground is combined with a background from a different pair
- **AND** an unrecognised status falls back to the `not-started` pair rather than a new colour

#### Scenario: Query shorter than the minimum
- **WHEN** the search input contains fewer than 2 characters
- **THEN** no request is issued to the results endpoint
- **AND** the Results group shows the message `Type at least 2 characters to search results.`

#### Scenario: Empty query on open
- **WHEN** the palette has just opened and nothing has been typed
- **THEN** no request is issued to the results endpoint
- **AND** the results endpoint is never called with an empty `title`

#### Scenario: No matching results
- **WHEN** the query is at least 2 characters and nothing matches
- **THEN** the Results group shows `No matching results` and remains visible with its heading
- **AND** this holds even though the endpoint signals "nothing matched" with HTTP 404
  (`Results Not Found`) rather than a 200 with an empty list — a 404 from this endpoint MUST be
  treated as an empty result, never as a failure

#### Scenario: A real server failure is distinguished from an empty result
- **WHEN** the results request fails with a status other than 404
- **THEN** the Results group shows its error line rather than `No matching results`

#### Scenario: The request fails
- **WHEN** the results request returns an error
- **THEN** the Results group shows a single static error line
- **AND** subsequent keystrokes still issue requests (the type-ahead is not left dead)

#### Scenario: Rows persist while the next request is in flight
- **WHEN** results are displayed and the user types another character
- **THEN** the currently displayed rows remain visible until the new rows arrive
- **AND** the list is marked busy while the request is in flight

#### Scenario: Superseded requests are cancelled
- **WHEN** the user types a further character while a results request is in flight
- **THEN** the in-flight request is cancelled and its response is never rendered
- **AND** only the response for the most recent query and scope is rendered

#### Scenario: Activating a result row
- **WHEN** the user activates a result row by click or by pressing `Enter` while it is the active row
- **THEN** the palette closes and the application navigates to that result

### Requirement: Programs group
The palette SHALL filter the science-programme list already held in memory, with no network request,
and SHALL render each match as a coloured dot, the monospace programme code, and the programme name.

#### Scenario: Filtering programmes as the user types
- **WHEN** the user types a single character
- **THEN** matching programmes appear immediately, with no debounce and no network request
- **AND** matching is case-insensitive against both the programme code and the programme name
- **AND** the group is headed `PROGRAMS (n)`

#### Scenario: Programme row rendering
- **WHEN** a programme row is rendered
- **THEN** it shows a coloured dot whose colour comes from the existing deterministic programme-dot
  palette for that programme code, the code in monospace, and the programme name
- **AND** a long programme name is truncated with a trailing ellipsis

#### Scenario: No matching programmes
- **WHEN** the query matches no programme
- **THEN** the Programs group and its heading are not rendered

#### Scenario: Activating a programme row
- **WHEN** the user activates a programme row
- **THEN** the palette closes and the application navigates to that programme's screen, addressed by
  its code

### Requirement: Indicators group ships disabled
The palette SHALL render the Indicators group in the position the design gives it, visibly disabled
and tagged `Coming soon`, because no endpoint accepts a text query for indicators and the dotted
indicator code the design displays is not a stored field.

#### Scenario: The disabled group is visible
- **WHEN** the palette is open with any query
- **THEN** an Indicators block is visible between the Results and Programs groups
- **AND** it is styled as disabled and carries a `Coming soon` tag
- **AND** it is neither silently omitted nor populated with invented data

#### Scenario: The disabled group is not keyboard-reachable as an option
- **WHEN** the user presses `↓` repeatedly through the whole list
- **THEN** the active row never lands on the Indicators block
- **AND** the Indicators block is not exposed to assistive technology as a selectable option

#### Scenario: The disabled group does not disappear when it has no rows
- **WHEN** the Indicators block contains no result rows (which is always)
- **THEN** it remains visible

### Requirement: Programme scope selector
The palette SHALL provide a scope selector, defaulting to `All programs`, that restricts the Results
group to one science programme via the endpoint's `submitter_id` filter.

#### Scenario: Default scope
- **WHEN** the palette opens
- **THEN** the selector reads `All programs`
- **AND** results requests omit the programme filter, searching across all programmes the user can see

#### Scenario: Scoping to one programme
- **WHEN** the user selects a single programme in the selector
- **THEN** subsequent results requests carry that programme's id as the `submitter_id` filter
- **AND** only results from that programme are returned

#### Scenario: Changing scope re-runs the current query
- **WHEN** results are displayed for a query and the user changes the scope
- **THEN** a new request is issued for the same query under the new scope, without the user retyping

#### Scenario: Changing scope mid-flight discards the wrong corpus
- **WHEN** the user changes the scope while a results request is in flight
- **THEN** the in-flight request is cancelled
- **AND** the previously displayed rows are cleared immediately rather than persisting

#### Scenario: Scope does not affect the Programs group
- **WHEN** the user scopes to a single programme
- **THEN** the Programs group continues to match across all programmes

#### Scenario: Enter in the selector does not activate a row
- **WHEN** the scope selector has focus and the user presses `Enter`
- **THEN** the selection is applied and the palette does NOT navigate to the active result row

### Requirement: Keyboard navigation
The palette SHALL be fully operable from the keyboard, keeping DOM focus on the search input while an
active row is tracked, with focus trapped inside the overlay and restored on close.

#### Scenario: Arrow keys move the active row
- **WHEN** the palette shows rows and the user presses `↓` or `↑`
- **THEN** the active row moves down or up across group boundaries
- **AND** DOM focus remains on the search input, so continued typing still reaches it
- **AND** the active row scrolls into view when it is outside the visible area

#### Scenario: The first row is active on arrival
- **WHEN** rows are first rendered for a query
- **THEN** the first row is the active row

#### Scenario: Enter activates the active row
- **WHEN** a row is active and the user presses `Enter`
- **THEN** that row is activated and the palette closes

#### Scenario: Hidden rows are never activated
- **WHEN** the user navigates with `↑`/`↓`
- **THEN** the active row is always a row visible on screen, and never a row excluded by the current
  query

#### Scenario: Tab order inside the palette
- **WHEN** the palette is open and the user presses `Tab` repeatedly
- **THEN** focus moves between the search input and the scope selector and cycles within the overlay
- **AND** focus never reaches the page behind the overlay
- **AND** `Tab` does not step through the individual rows

#### Scenario: Focus is restored on close
- **WHEN** the palette closes by any means
- **THEN** focus returns to the topbar control that opened it

### Requirement: Screen reader support
The palette SHALL expose a combobox-and-listbox structure with correctly named options and groups, and
SHALL announce state changes without narrating every keystroke.

#### Scenario: Combobox wiring on the input
- **WHEN** the palette is open
- **THEN** the search input carries `role="combobox"`, `aria-autocomplete="list"`,
  `aria-expanded="true"`, `aria-controls` referencing the list, and `aria-activedescendant`
  referencing the active row's id

#### Scenario: A result row's accessible name
- **WHEN** a screen reader reaches an active result row
- **THEN** the announced name is the result title first, then the programme code, then the status
- **AND** the decorative code chip and status pill spans are hidden from assistive technology so they
  are not announced twice

#### Scenario: Group naming
- **WHEN** a group is rendered
- **THEN** the group is named by its visible eyebrow heading, including the count
- **AND** the count is not separately announced by a live region on each keystroke

#### Scenario: Busy state while loading
- **WHEN** a results request is in flight
- **THEN** the list is marked busy for assistive technology
- **AND** no live-region message fires on each keystroke

#### Scenario: The Escape hint is decorative
- **WHEN** the palette renders the `Esc` key hint
- **THEN** it is marked up as a keyboard key, hidden from assistive technology, and not focusable

### Requirement: Visual conformance to the approved design
The palette SHALL match the approved Claude Design, using design-token colours and pixel-valued
Tailwind utilities.

#### Scenario: No raw colour values
- **WHEN** any part of the palette is styled
- **THEN** every colour resolves from a `src/styles/colors.scss` token
- **AND** no raw hex value appears in the component's template or styles

#### Scenario: Pixel-valued sizing
- **WHEN** the palette sets a size, spacing or font size
- **THEN** it uses an explicit pixel value rather than a rem-based utility

#### Scenario: Trigger control matches the design
- **WHEN** the topbar renders the palette trigger
- **THEN** it is a 480x36 px bordered control with a magnifier icon and the placeholder label
  `Search`, using a text cursor

#### Scenario: Group headings
- **WHEN** a group heading is rendered
- **THEN** it is uppercase, monospace-cased small text with letter spacing, in the subtle text token,
  and carries the count in parentheses

#### Scenario: The panel scrolls, the page does not
- **WHEN** more rows are present than fit the panel
- **THEN** the panel scrolls internally and the page behind the overlay does not scroll
