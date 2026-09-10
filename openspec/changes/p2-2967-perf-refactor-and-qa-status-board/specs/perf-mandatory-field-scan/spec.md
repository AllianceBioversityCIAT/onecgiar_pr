## ADDED Requirements

### Requirement: Mandatory-field scan does not run on every change-detection cycle

The mandatory-field feedback scan (the source of the "X alerts" indicator) SHALL NOT run synchronously on every change-detection cycle. It MUST be throttled (at most once per 150 ms), coalesced (at most one pending scan), and scheduled via `requestAnimationFrame` running outside the Angular zone, so that an idle screen performs zero DOM scans per second.

#### Scenario: Idle screen performs no scans
- **WHEN** a Result Detail, Result Creator, or IPSR screen is open and the user is idle
- **THEN** the mandatory-field DOM scan does not run (idle scan count is 0/sec)
- **AND** the main thread is not blocked by a self-sustaining scan loop

#### Scenario: Rapid activity is throttled and coalesced
- **WHEN** the user interacts rapidly (typing, switching tabs) causing many change-detection cycles
- **THEN** the scan runs at most once per 150 ms with at most one pending `requestAnimationFrame`
- **AND** the scan executes outside the Angular zone and re-enters the zone only to update the feedback signal

### Requirement: Feedback list is signal-backed and updates only on real change

`fieldFeedbackList` SHALL be an Angular signal. The scan MUST update it only when the computed result actually changes (reference-change check), triggering a single change-detection tick rather than a cascade.

#### Scenario: Reactive count update
- **WHEN** the user completes one of the mandatory fields in a section showing "7 alerts"
- **THEN** the count updates reactively to "6 alerts" within ~600 ms intra-section
- **AND** only a single change-detection tick is triggered for the update

#### Scenario: Trailing-edge captures the final state
- **WHEN** the user stops interacting and change detection goes idle
- **THEN** a trailing-edge scan runs once to capture the final state
- **AND** the "X alerts" box reflects the true final field state

### Requirement: Behavior of the "X alerts" box is preserved

The throttled scan MUST NOT change the user-visible behavior of the mandatory-field feedback box. It SHALL show the same exact count and the same visual state as before the refactor, across Result Detail, Result Creator + ReportResultForm, and IPSR Detail/Creator.

#### Scenario: Same feedback across affected screens
- **WHEN** any of the five affected screens is opened with incomplete mandatory fields
- **THEN** the "X alerts" box shows the correct count for that screen/section
- **AND** marking a field complete decrements the count without visual jank or lost focus/scroll position

### Requirement: Panel-menu green-checks indicator is memoized, not stringified per cycle

The panel-menu green-checks indicator SHALL NOT call `JSON.stringify(green_checks)` on every change-detection cycle. `green_checks` MUST be signal-backed (with a transparent getter/setter for backward compatibility), and the stringified value MUST be exposed as a memoized `computed()` that recomputes only when `green_checks` actually changes.

#### Scenario: Stringify runs only on real change
- **WHEN** a screen with the panel-menu is open and `green_checks` has not changed
- **THEN** the green-checks string is not recomputed on each change-detection cycle
- **AND** it recomputes only when `green_checks` changes (e.g. a section's completeness changes)

#### Scenario: Checkmarks render identically
- **WHEN** the panel-menu renders section completeness
- **THEN** completed sections show the green checkmark and incomplete sections show gray/empty
- **AND** the checkmarks follow section completeness when switching tabs, with no flicker or missing checks
