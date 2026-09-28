import { Pipe, PipeTransform } from '@angular/core';

export interface TGroupedNotificationsByRecency<T> {
  today: T[];
  thisWeek: T[];
  earlier: T[];
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const THIS_WEEK_WINDOW_DAYS = 7;

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Sorts a bucket desc by `dateKey`, on a copy (never mutates `bucket`). Rows with a missing/
 * unparseable date sort last, since they cannot be ordered against a real date.
 */
function sortByDateDesc<T extends Record<string, unknown>>(bucket: T[], dateKey: string): T[] {
  const timeOf = (item: T): number => {
    const rawDate = item?.[dateKey] as string | undefined;
    const parsedTime = rawDate ? Date.parse(rawDate) : NaN;
    return Number.isNaN(parsedTime) ? -Infinity : parsedTime;
  };

  return [...bucket].sort((a, b) => timeOf(b) - timeOf(a));
}

@Pipe({
    name: 'groupNotificationsByRecency',
    standalone: false
})
export class GroupNotificationsByRecencyPipe implements PipeTransform {
  /**
   * Buckets a list into Today / This week / Earlier using local-midnight boundaries, then sorts
   * each output bucket desc by `dateKey` as a final step (pure — sorts copies, never mutates the
   * input array or its items). This makes the pipe robust to a caller passing an unsorted or only
   * piecewise-sorted list (e.g. a `.concat()` of two independently-sorted arrays) — the pipe no
   * longer assumes the input arrives already fully desc-sorted.
   *
   * - `today`: local calendar day of `now`.
   * - `thisWeek`: the 7 local days immediately before today (inclusive lower bound).
   * - `earlier`: everything older, and any row whose date is missing/unparseable
   *   (per NOTIF-P-1's "if false" fallback — logged as a data-quality gap upstream, not silently dropped).
   */
  transform<T extends Record<string, unknown>>(
    list: T[],
    dateKey: string = 'requested_date'
  ): TGroupedNotificationsByRecency<T> {
    const today: T[] = [];
    const thisWeek: T[] = [];
    const earlier: T[] = [];

    if (!list?.length) return { today, thisWeek, earlier };

    const now = new Date(Date.now());
    const startOfToday = startOfLocalDay(now);
    const startOfWeek = new Date(startOfToday.getTime() - THIS_WEEK_WINDOW_DAYS * MS_PER_DAY);

    for (const item of list) {
      const rawDate = item?.[dateKey] as string | undefined;
      const parsedTime = rawDate ? Date.parse(rawDate) : NaN;

      if (Number.isNaN(parsedTime)) {
        earlier.push(item);
        continue;
      }

      if (parsedTime >= startOfToday.getTime()) {
        today.push(item);
      } else if (parsedTime >= startOfWeek.getTime()) {
        thisWeek.push(item);
      } else {
        earlier.push(item);
      }
    }

    return {
      today: sortByDateDesc(today, dateKey),
      thisWeek: sortByDateDesc(thisWeek, dateKey),
      earlier: sortByDateDesc(earlier, dateKey)
    };
  }
}
