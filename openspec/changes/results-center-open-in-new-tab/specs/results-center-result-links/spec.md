## ADDED Requirements

### Requirement: Result rows in the Results Center are real links

The Results Center table SHALL render each result's clickable content as an anchor with a resolved `href` pointing at that result's destination, so the browser can offer its native link affordances.

#### Scenario: Anchor exposes a real href
- **WHEN** the Results Center table renders a result row
- **THEN** the anchor wrapping the row content has an `href` attribute whose value is the same URL a plain left click would navigate to

#### Scenario: Middle click opens a new tab
- **WHEN** the user middle-clicks (mouse wheel) a result in the Results Center
- **THEN** the browser opens that result in a new background tab
- **AND** the current tab stays on the Results Center, unchanged

#### Scenario: Right click offers the native context menu
- **WHEN** the user right-clicks a result in the Results Center
- **THEN** the browser context menu offers "Open link in new tab" and "Open link in new window"
- **AND** choosing "Open link in new tab" loads that result in a new tab

#### Scenario: Modified click opens a new tab
- **WHEN** the user clicks a result while holding Ctrl (Windows/Linux) or ⌘ (macOS)
- **THEN** the browser opens that result in a new tab
- **AND** the application does NOT perform an in-app navigation in the current tab

#### Scenario: Plain left click keeps in-app navigation
- **WHEN** the user left-clicks a result without modifier keys
- **THEN** the application navigates in the same tab through the Angular router
- **AND** the page does NOT perform a full browser reload

### Requirement: Standard results link to their result detail page

For results that are not W3/Bilaterals pending review — standard results, approved results, and approved W3/Bilaterals AVISA results — the link SHALL target the result detail page for that result and reporting phase.

#### Scenario: Link target for a standard result
- **WHEN** the Results Center renders a standard or approved result
- **THEN** the anchor's `href` resolves to `/result/result-detail/{result_code}/general-information` with the query param `phase={version_id}`

#### Scenario: New tab lands on the result detail
- **WHEN** the user opens a standard result in a new tab from the Results Center
- **THEN** the new tab loads the result detail page for that result and phase, with no extra clicks

### Requirement: W3/Bilaterals results pending review are deep-linkable

For results whose source is W3/Bilaterals and that are pending review, the link SHALL target the entity's results-review screen and SHALL carry the result identity as a query parameter, so the review drawer can be opened from the URL alone.

#### Scenario: Link target carries the result identity
- **WHEN** the Results Center renders a W3/Bilaterals result pending review
- **THEN** the anchor's `href` resolves to `/result-framework-reporting/entity-details/{submitter}/results-review` including both the result code and the result id as query parameters

#### Scenario: Result absent from the review list still opens
- **WHEN** the deep-linked result is not part of the entity's review list, such as a draft in `Editing` status
- **THEN** the review drawer opens using the result id carried in the URL
- **AND** the drawer renders the same content it would render from a plain click in the current tab

#### Scenario: New tab opens the review drawer
- **WHEN** the user opens a W3/Bilaterals result pending review in a new tab
- **AND** the results-review screen has finished loading its results
- **THEN** the review drawer opens automatically showing that result

#### Scenario: Same-tab click still opens the drawer
- **WHEN** the user left-clicks a W3/Bilaterals result pending review in the Results Center
- **THEN** the application navigates to the results-review screen in the same tab
- **AND** the review drawer opens showing that result, exactly as before this change

#### Scenario: Query parameter is cleared once used
- **WHEN** the review drawer has been opened from the query parameter
- **THEN** the parameter is removed from the URL without adding a history entry
- **AND** closing the drawer and reloading the page does NOT reopen it

#### Scenario: Unknown or unavailable result degrades safely
- **WHEN** a results-review URL carries a result code that is not present in the loaded results and no result id
- **THEN** the results-review screen renders its list normally with no drawer open
- **AND** no error is thrown and no blank screen is shown

### Requirement: Opening a result in a new tab must not alter the current tab

Clicks that the browser handles as "open in a new tab" SHALL NOT mutate the state of the tab the user clicked from.

#### Scenario: Modified click leaves the current tab untouched
- **WHEN** the user opens a W3/Bilaterals result in a new tab with ctrl/⌘/shift+click or the middle button
- **THEN** the review drawer state of the originating tab is left unchanged
- **AND** the originating tab stays on the Results Center

### Requirement: Programmatic navigation uses the same destinations

Navigation triggered by the application itself — such as after creating or updating a result — SHALL resolve destinations through the same URL construction used by the row links, so links and programmatic navigation cannot drift apart.

#### Scenario: Navigation after creating a result
- **WHEN** the application navigates to a result programmatically after it is created or updated
- **THEN** the destination URL is identical to the `href` the Results Center row link would expose for that same result
