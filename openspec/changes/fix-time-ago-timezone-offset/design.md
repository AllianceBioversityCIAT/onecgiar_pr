## Context

`FormatTimeAgoPipe` (`src/app/shared/pipes/format-time-ago/format-time-ago.pipe.ts`) renders elapsed time with `date-fns`. Current body:

```ts
if (serverTimezone !== 0) date = subHours(date, serverTimezone);      // dead path — no caller passes serverTimezone
const localTimezoneOffset = new Date().getTimezoneOffset() / 60;      // 5 in America/Bogota
const localDate = subHours(date, localTimezoneOffset);                // ❌ shifts a correct UTC instant
// ...uses localDate for both the >1w absolute fallback and formatDistanceToNowStrict
```

The API returns `requested_date` as a correct UTC ISO string (`…Z`), which `parseISO` turns into the correct absolute instant. `formatDistanceToNowStrict(instant)` and `new Date()` are both absolute, so their difference is already timezone-correct. The manual `subHours(localTimezoneOffset)` therefore introduces the exact offset error (5h in UTC-5).

## Goals / Non-Goals

**Goals:**
- Elapsed time is correct for every viewer regardless of timezone.
- The >1-week absolute-date fallback shows the viewer's local calendar day.
- No changes to any template, binding, interface, or backend.

**Non-Goals:**
- Localizing/translating the "ago" text or the date format (English `enUS` stays).
- Adding a live-ticking/auto-refresh of the relative time.
- Reworking the unused `serverTimezone` parameter (kept for signature compatibility).

## Decisions

- **Remove** the `localTimezoneOffset` computation and the `localDate = subHours(date, localTimezoneOffset)` line. Use the parsed `date` directly in both branches.
- **Keep** the `parseISO` / `Date` / numeric-input normalization and the `serverTimezone` guard untouched (no-op at default `0`) to avoid touching call sites.
- The `format(date, 'yyyy MMM dd')` fallback with a native JS `Date` renders in the runtime's local timezone by design — satisfies the local-calendar-day requirement with no extra code.
- **Tests:** update the co-located `.spec.ts` to assert a known UTC instant yields the same output under different `TZ` settings (mock `Date`/timezone or use fixed-offset instants), covering: fresh → "0 seconds/1 minute ago", 10 min → "10 minutes ago", >1 week → absolute date, and suffix toggle off.

## Risks / Trade-offs

- **Very low risk:** isolated pure pipe; the change removes logic rather than adding it.
- Old items previously shown 5h "too old" will now shift to the correct value — a visible but intended correction; no data or stored value changes.
- Client coverage gate (50/60/60/60) — the pipe's spec keeps/raises coverage; no other files affected.
