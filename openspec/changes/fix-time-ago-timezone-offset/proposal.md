## Why

The shared "time ago" pipe (`format-time-ago.pipe.ts`) shows every relative timestamp shifted by the viewer's local timezone offset. A contribution request created "just now" is displayed as **"5 hours ago"** in Colombia (UTC-5). The pipe subtracts the viewer's UTC offset from a value that already arrives as a correct UTC instant (ISO string with `Z`), so the elapsed time is always wrong by the offset. This is highly visible on freshly created items (Notifications → Requests received) and misleads users on an **international platform** where viewers span many timezones.

**Scope:** frontend-only. No backend change required — the API already returns correct UTC timestamps (verified: `requested_date` = `2026-07-…Z`).

**Jira:** to be created (P2-XXXX). Surfaced during live QA of P2-3085 (Notifications). Not part of P2-3085's scope — it is a defect in a shared pipe.

## What Changes

- Remove the local-timezone-offset subtraction (`subHours(date, localTimezoneOffset)`) in `format-time-ago.pipe.ts`. Relative/elapsed time is timezone-agnostic (`now − eventInstant`); no offset adjustment is valid for it.
- Compare the parsed UTC instant directly with `formatDistanceToNowStrict(...)`.
- The `> 1 week` fallback that prints an absolute date (`format(...)`) uses the raw `Date` so it renders in the **viewer's local date** natively.
- Leave the unused `serverTimezone` parameter path as-is (no caller passes it; a no-op at `0`).
- No template, API, or interface changes. Behavior corrected everywhere the pipe is consumed: notification-item, pop-up notification, update-notification, and result-framework recent items.

## Capabilities

### New Capabilities
- `relative-time-display`: how PRMS renders elapsed ("time ago") timestamps consistently and correctly across timezones for an international user base.

### Modified Capabilities
<!-- None — no existing spec under openspec/specs/ governs this pipe. -->

## Impact

- **Code:** `onecgiar-pr-client/src/app/shared/pipes/format-time-ago/format-time-ago.pipe.ts` (+ its `.spec.ts`).
- **Surfaces (display-only, no logic change on their side):** notification-item, pop-up-notification-item, update-notification, result-framework-reporting-recent-item.
- **APIs / backend:** none.
- **Risk:** low — isolated pure pipe; covered by unit tests asserting a known UTC instant renders the same "ago" value regardless of the machine timezone.
