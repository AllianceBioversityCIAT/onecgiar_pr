// @akili-spec changes/replicated-innovation-reminders (RIR-T-6, RIR-R-5)

/** Offset (`Date#getTimezoneOffset` semantics: minutes to ADD to local time to reach UTC; UTC-5 -> 300) in force AT a given instant. */
export type OffsetAt = (at: Date) => number;

/**
 * Converts an `<input type="datetime-local">` value (`YYYY-MM-DDTHH:mm`, wall-clock in the admin's zone)
 * to a UTC ISO-8601 instant with a `Z` suffix. `offsetAt` resolves the zone offset for an instant, so a date on the
 * other side of a DST change gets its own offset. Omitted: the platform zone (DST aware). Null for an unparseable value.
 */
export function localInputToUtcIso(local: string, offsetAt?: OffsetAt): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(local ?? '');
  if (!m) return null;
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  let instant: Date;
  if (!offsetAt) {
    instant = new Date(y, mo - 1, d, h, mi);
  } else {
    const wall = Date.UTC(y, mo - 1, d, h, mi);
    const first = offsetAt(new Date(wall));
    const guess = wall + first * 60_000;
    const second = offsetAt(new Date(guess));
    instant = new Date(second === first ? guess : wall + second * 60_000);
  }
  return Number.isNaN(instant.getTime()) ? null : instant.toISOString();
}

/** Inverse of `localInputToUtcIso`: a UTC ISO instant to the `datetime-local` value in the admin's zone at that instant. */
export function utcIsoToLocalInput(iso: string, offsetAt?: OffsetAt): string {
  const utc = new Date(iso);
  if (Number.isNaN(utc.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  if (!offsetAt) {
    return `${utc.getFullYear()}-${pad(utc.getMonth() + 1)}-${pad(utc.getDate())}T${pad(utc.getHours())}:${pad(utc.getMinutes())}`;
  }
  const shifted = new Date(utc.getTime() - offsetAt(utc) * 60_000);
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}T${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}`;
}

/** `UTC-05:00` style label from a `getTimezoneOffset` value. */
export function offsetLabel(offsetMinutes: number): string {
  const sign = offsetMinutes <= 0 ? '+' : '-';
  const abs = Math.abs(offsetMinutes);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `UTC${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}
