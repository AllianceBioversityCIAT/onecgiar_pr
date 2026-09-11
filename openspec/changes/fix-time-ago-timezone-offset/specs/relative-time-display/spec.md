## ADDED Requirements

### Requirement: Timezone-independent relative time

The relative-time ("time ago") pipe SHALL compute elapsed time as the difference between the current instant and the event instant, using absolute UTC instants only. It MUST NOT apply the viewer's local timezone offset to the value, because elapsed time does not depend on the viewer's timezone.

#### Scenario: Fresh event shows as just now regardless of viewer timezone
- **WHEN** an event timestamp equal to the current UTC instant (ISO string with `Z`) is rendered
- **THEN** the pipe outputs a near-zero elapsed value (e.g. "0 seconds ago" / "1 minute ago")
- **AND** the output is identical whether the viewer's machine is set to UTC, UTC-5 (America/Bogota), or any other timezone

#### Scenario: Past event elapsed value is not shifted by the offset
- **WHEN** an event occurred exactly 10 minutes before now (UTC instant)
- **THEN** the pipe outputs "10 minutes ago"
- **AND** it never adds or subtracts the viewer's UTC offset (e.g. it does not render "5 hours 10 minutes ago" in UTC-5)

### Requirement: Absolute-date fallback for old events

For events older than one week, the pipe SHALL render an absolute calendar date, and that date MUST reflect the viewer's local calendar day derived from the UTC instant.

#### Scenario: Event older than one week renders a local calendar date
- **WHEN** an event occurred more than 7 days before now
- **THEN** the pipe outputs a formatted absolute date (e.g. "2026 Jun 12")
- **AND** the date corresponds to the viewer's local day for that UTC instant

### Requirement: Optional suffix and unchanged consumers

The pipe SHALL keep its existing public signature (value, optional server-timezone parameter, optional show-suffix flag) so all current template usages keep working without edits, and the trailing "ago" suffix SHALL still be toggleable.

#### Scenario: Suffix toggle preserved
- **WHEN** the pipe is invoked with the show-suffix flag set to false
- **THEN** the output omits the trailing "ago"

#### Scenario: Existing consumers require no template change
- **WHEN** notification-item, pop-up notification, update-notification, or result-framework recent-item render a timestamp through the pipe
- **THEN** they display the corrected value with no change to their own templates or bindings
